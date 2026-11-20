"""
台股多模態特徵工程管線 (Point-in-Time 對齊，嚴格零未來函數洩漏)

每日盤後抽取並組裝 12+3 維特徵寫入 `stock_multimodal_features`:
  高頻籌碼: foreign_net_vol_ratio_5d, trust_net_vol_ratio_5d, margin_balance_chg_5d,
           inst_streak_days (+ trust_streak_days, foreign_streak_days)
  低頻基本面 (按法定財報公告日向後填充):
           rev_yoy, rev_mom, rev_momentum_3m_12m, gross_margin_qoq,
           pe_percentile_3y, health_score, valuation_percentile
  大盤與波動率:
           taiex_ret_5d, atr_14_pct (+ ann_vol_20d)
"""

from __future__ import annotations

import json
import math
import time
from bisect import bisect_right
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from .. import models
from .valuation_service import PB_INDUSTRIES, PANEL_SYMBOLS, quarter_announcement_date


def _streak_series(values: np.ndarray) -> np.ndarray:
    """依序計算每日連買(>0 累計正數)或連賣(<0 累計負數)天數。"""
    n = len(values)
    out = np.zeros(n, dtype=np.int32)
    streak = 0
    for i in range(n):
        v = values[i]
        if v > 0:
            streak = streak + 1 if streak > 0 else 1
        elif v < 0:
            streak = streak - 1 if streak < 0 else -1
        else:
            streak = 0
        out[i] = streak
    return out


def _compute_health_score_snapshot(
    fin_list: List[Tuple[int, int, float, float, float, float]],
    bs_list: List[Tuple[int, int, float, float, float, float, float]],
    cf_list: List[Tuple[int, int, float]],
) -> float:
    """
    沿用 database_service.py 三構面財報健檢總分 (0~100)，僅使用截至該公告日之歷史財報。
    fin_list sorted ascending by (y, q): (y, q, revenue, gross_profit, net_income, eps)
    bs_list sorted ascending by (y, q): (y, q, current_assets, current_liab, total_liab, equity, inventories)
    cf_list sorted ascending by (y, q): (y, q, free_cash_flow)
    """
    if not fin_list or not bs_list:
        return 50.0

    _, _, rev, gp, ni, eps = fin_list[-1]
    _, _, ca, cl, tl, eq, inv = bs_list[-1]
    fcf = cf_list[-1][2] if cf_list else 0.0

    gm = (gp / rev * 100.0) if (rev > 0 and gp is not None) else 0.0
    nm = (ni / rev * 100.0) if (rev > 0 and ni is not None) else 0.0
    roe = (ni * 4.0 / eq * 100.0) if (eq > 0 and ni is not None) else 0.0

    p_items = [
        100 if gm > 30 else 60 if gm > 15 else 20,
        100 if roe > 10 else 60 if roe > 5 else 20,
        100 if nm > 15 else 60 if nm > 5 else 20,
    ]
    profit_score = sum(p_items) // 3

    curr_ratio = (ca / cl) if cl > 0 else 1.0
    debt_eq = (tl / eq) if eq > 0 else 1.0
    quick_ratio = ((ca - inv) / cl) if cl > 0 else 1.0
    s_items = [
        100 if curr_ratio > 1.5 else 60 if curr_ratio > 1.0 else 20,
        100 if debt_eq < 1.0 else 60 if debt_eq < 1.5 else 20,
        100 if quick_ratio > 1.0 else 60 if quick_ratio > 0.8 else 20,
    ]
    solv_score = sum(s_items) // 3

    ly, lq = fin_list[-1][0], fin_list[-1][1]
    prev_y = next((x for x in fin_list[:-1] if x[0] == ly - 1 and x[1] == lq), None)
    if prev_y is None and len(fin_list) > 1:
        prev_y = fin_list[0]

    rev_yoy = ((rev - prev_y[2]) / abs(prev_y[2]) * 100.0) if (prev_y and prev_y[2] > 0) else 0.0
    eps_yoy = ((eps - prev_y[5]) / abs(prev_y[5]) * 100.0) if (prev_y and prev_y[5] > 0) else 0.0

    g_items = [
        100 if rev_yoy > 0 else 60 if rev_yoy > -5 else 20,
        100 if eps_yoy > 0 else 60 if eps_yoy > -5 else 20,
        100 if fcf > 0 else 20,
    ]
    growth_score = sum(g_items) // 3
    return float((profit_score + solv_score + growth_score) // 3)


def _load_taiex_ret_5d_map(db: Session, all_dates: List[str], market_eq_ret: Dict[str, float]) -> Dict[str, float]:
    """分段計算加權指數 5 日報酬率 (%), 確保跨快取來源無點位基準跳動。"""
    ret_map: Dict[str, float] = {}

    def _fill_from_series(series: List[Tuple[str, float]], overwrite: bool = False) -> None:
        if len(series) < 6:
            return
        series_sorted = sorted(series, key=lambda x: x[0])
        for i in range(5, len(series_sorted)):
            dt, cl = series_sorted[i]
            _, prev_cl = series_sorted[i - 5]
            if prev_cl > 0 and (overwrite or dt not in ret_map):
                ret_map[dt] = round(((cl - prev_cl) / prev_cl) * 100.0, 4)

    # 1. Benchmark (486d ~ 2026-11-13)
    bench_row = db.query(models.ResponseCache).filter_by(cache_key="market:taiex_gs_bench:latest").first()
    if bench_row:
        try:
            hist = json.loads(bench_row.response_data).get("data", {}).get("history", [])
            _fill_from_series([(h["date"], float(h["close"])) for h in hist if h.get("close")], overwrite=False)
        except Exception:
            pass

    # 2. GIDX 1Y (latest ~ 2026-11-19)
    gidx_rows = (
        db.query(models.ResponseCache)
        .filter(models.ResponseCache.cache_key.like("gidx:taiex:1y%"))
        .order_by(models.ResponseCache.created_at.desc())
        .all()
    )
    for gr in gidx_rows:
        try:
            hist = json.loads(gr.response_data).get("history", [])
            if hist:
                _fill_from_series([(h["date"], float(h["close"])) for h in hist if h.get("close")], overwrite=True)
                break
        except Exception:
            continue

    # 3. Fallback for dates not covered by cached TAIEX
    for d in all_dates:
        if d not in ret_map:
            ret_map[d] = round(market_eq_ret.get(d, 0.0), 4)
    return ret_map


def build_and_save_multimodal_features(
    db: Session,
    days: int = 300,
    symbols: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    從本地 SQLite 抽取並組裝過去 `days` 個交易日的多模態特徵，寫入 `stock_multimodal_features`。
    嚴格以 `announcement_date` 實作 Point-in-Time 對齊。
    """
    t0 = time.perf_counter()
    raw_conn = db.connection().connection
    cur = raw_conn.cursor()

    q_stocks = db.query(models.Stock)
    if symbols:
        q_stocks = q_stocks.filter(models.Stock.stock_id.in_(symbols))
    stock_rows = q_stocks.all()
    stock_meta = {s.stock_id: s for s in stock_rows}
    target_syms = symbols if symbols else sorted(stock_meta.keys())
    if not target_syms:
        return {"symbols": 0, "rows_written": 0, "elapsed_seconds": 0.0}

    sym_set = set(target_syms)

    # 1. 載入全市場日 K (需要近 days + 760 日以計算 3Y 滾動 PE/估值百分位)
    price_sql = (
        "SELECT stock_id, date, open, high, low, close, volume FROM stock_prices_daily "
        "WHERE close IS NOT NULL AND close > 0 ORDER BY stock_id, date"
    )
    price_by_sym: Dict[str, List[Tuple[str, float, float, float, float, float]]] = defaultdict(list)
    date_close_ret_acc: Dict[str, List[float]] = defaultdict(list)

    # 先按個股讀入
    cur.execute(price_sql)
    for sid, dt, op, hi, lo, cl, vol in cur:
        if sid not in sym_set and len(sym_set) < 1005:
            pass
        if sid in sym_set or len(sym_set) >= 1000:
            c_val = float(cl)
            o_val = float(op) if op is not None else c_val
            h_val = float(hi) if hi is not None else max(o_val, c_val)
            l_val = float(lo) if lo is not None else min(o_val, c_val)
            v_val = float(vol) if vol is not None else 0.0
            price_by_sym[sid].append((dt, o_val, h_val, l_val, c_val, max(0.0, v_val)))

    # 建立全市場等權 5 日報酬作為早於 2024-11 的 fallback
    all_dates_set = set()
    for sid, plist in price_by_sym.items():
        for i in range(5, len(plist)):
            dt, _, _, _, cl, _ = plist[i]
            prev_cl = plist[i - 5][4]
            if prev_cl > 0:
                date_close_ret_acc[dt].append(((cl - prev_cl) / prev_cl) * 100.0)
                all_dates_set.add(dt)
    market_eq_ret = {d: float(np.median(vals)) for d, vals in date_close_ret_acc.items() if vals}
    taiex_ret_map = _load_taiex_ret_5d_map(db, sorted(all_dates_set), market_eq_ret)

    # 2. 載入籌碼日頻資料
    chips_by_sym: Dict[str, Dict[str, Tuple[float, float, float]]] = defaultdict(dict)
    cur.execute("SELECT stock_id, date, foreign_net, trust_net, dealer_net FROM chips_daily ORDER BY stock_id, date")
    for sid, dt, fn, tn, dn in cur:
        if sid in sym_set:
            chips_by_sym[sid][dt] = (
                float(fn) if fn is not None else 0.0,
                float(tn) if tn is not None else 0.0,
                float(dn) if dn is not None else 0.0,
            )

    # 3. 載入選用表：月營收 & 融資融券
    mrev_by_sym: Dict[str, List[Tuple[str, float, Optional[float], Optional[float]]]] = defaultdict(list)
    try:
        cur.execute(
            "SELECT stock_id, announcement_date, revenue, rev_yoy, rev_mom FROM monthly_revenues ORDER BY stock_id, announcement_date"
        )
        for sid, ann, rev, ry, rm in cur:
            if sid in sym_set:
                mrev_by_sym[sid].append((ann, float(rev), ry, rm))
    except Exception:
        pass

    margin_by_sym: Dict[str, Dict[str, float]] = defaultdict(dict)
    try:
        cur.execute("SELECT stock_id, date, margin_balance FROM margin_trading_daily ORDER BY stock_id, date")
        for sid, dt, mb in cur:
            if sid in sym_set and mb is not None:
                margin_by_sym[sid][dt] = float(mb)
    except Exception:
        pass

    # 4. 載入財報三表與股數
    fin_by_sym: Dict[str, List[Tuple[int, int, float, float, float, float]]] = defaultdict(list)
    cur.execute(
        "SELECT stock_id, year, quarter, revenue, gross_profit, net_income, eps FROM financial_reports ORDER BY stock_id, year, quarter"
    )
    for sid, y, q, rev, gp, ni, eps in cur:
        if sid in sym_set:
            fin_by_sym[sid].append((
                int(y),
                int(q),
                float(rev) if rev is not None else 0.0,
                float(gp) if gp is not None else 0.0,
                float(ni) if ni is not None else 0.0,
                float(eps) if eps is not None else 0.0,
            ))

    bs_by_sym: Dict[str, List[Tuple[int, int, float, float, float, float, float]]] = defaultdict(list)
    cur.execute(
        "SELECT stock_id, year, quarter, current_assets, current_liabilities, total_liabilities, shareholders_equity, total_assets, inventories "
        "FROM balance_sheets ORDER BY stock_id, year, quarter"
    )
    for sid, y, q, ca, cl, tl, eq, ta, inv in cur:
        if sid in sym_set:
            eff_eq = float(eq) if (eq is not None and eq > 0) else (
                (float(ta) - float(tl)) if (ta is not None and tl is not None and ta > tl) else 0.0
            )
            bs_by_sym[sid].append((
                int(y),
                int(q),
                float(ca) if ca is not None else 0.0,
                float(cl) if cl is not None else 0.0,
                float(tl) if tl is not None else 0.0,
                eff_eq,
                float(inv) if inv is not None else 0.0,
            ))

    cf_by_sym: Dict[str, List[Tuple[int, int, float]]] = defaultdict(list)
    cur.execute(
        "SELECT stock_id, year, quarter, free_cash_flow FROM cash_flow_statements ORDER BY stock_id, year, quarter"
    )
    for sid, y, q, fcf in cur:
        if sid in sym_set:
            cf_by_sym[sid].append((int(y), int(q), float(fcf) if fcf is not None else 0.0))

    cur.execute("SELECT stock_id, shares_outstanding FROM market_cap_cache")
    shares_map = {sid: float(sh) for sid, sh in cur if sh is not None and sh > 0}

    # 讀取現有估值上下限備援（或即時用歷史資料計算）
    val_band_map: Dict[str, Tuple[float, float]] = {}
    cur.execute("SELECT symbol, cheap_price, expensive_price FROM stock_valuations")
    for sid, cp, ep in cur:
        if cp and ep and ep > cp:
            val_band_map[sid] = (float(cp), float(ep))

    # 5. 逐檔組裝 Point-in-Time 特徵寬表
    rows_tuples: List[Tuple[Any, ...]] = []
    processed_syms = 0

    for sym in target_syms:
        plist = price_by_sym.get(sym, [])
        if len(plist) < 20:
            continue
        processed_syms += 1

        # 取最近 (days + 760) 天計算滾動分位，最終僅輸出最近 days 天
        keep_n = min(len(plist), days + 760)
        plist = plist[-keep_n:]
        n_total = len(plist)
        out_start = max(0, n_total - days)

        dates = [p[0] for p in plist]
        highs = np.array([p[2] for p in plist], dtype=np.float64)
        lows = np.array([p[3] for p in plist], dtype=np.float64)
        closes = np.array([p[4] for p in plist], dtype=np.float64)
        vols = np.array([p[5] for p in plist], dtype=np.float64)

        # ATR14 / Close (%) & 20D 年化波動度
        prev_closes = np.roll(closes, 1)
        prev_closes[0] = closes[0]
        tr = np.maximum.reduce([
            highs - lows,
            np.abs(highs - prev_closes),
            np.abs(lows - prev_closes),
        ])
        atr14 = pd.Series(tr).rolling(14, min_periods=5).mean().to_numpy()
        atr14_pct = np.where(closes > 0, (atr14 / closes) * 100.0, 2.0)

        log_ret = np.diff(np.log(np.maximum(closes, 1e-6)), prepend=math.log(max(closes[0], 1e-6)))
        ann_vol_20 = (pd.Series(log_ret).rolling(20, min_periods=5).std().fillna(0.02).to_numpy()) * math.sqrt(252.0) * 100.0

        # 高頻籌碼序列
        sym_chips = chips_by_sym.get(sym, {})
        f_net = np.array([sym_chips.get(d, (0.0, 0.0, 0.0))[0] for d in dates], dtype=np.float64)
        t_net = np.array([sym_chips.get(d, (0.0, 0.0, 0.0))[1] for d in dates], dtype=np.float64)
        d_net = np.array([sym_chips.get(d, (0.0, 0.0, 0.0))[2] for d in dates], dtype=np.float64)
        tot_net = f_net + t_net + d_net

        vol_5d = pd.Series(vols).rolling(5, min_periods=1).sum().to_numpy()
        f_5d = pd.Series(f_net).rolling(5, min_periods=1).sum().to_numpy()
        t_5d = pd.Series(t_net).rolling(5, min_periods=1).sum().to_numpy()
        tot_5d = pd.Series(tot_net).rolling(5, min_periods=1).sum().to_numpy()

        f_ratio_5d = np.where(vol_5d > 0, np.clip(f_5d / np.maximum(vol_5d, 1.0), -1.0, 1.0), 0.0)
        t_ratio_5d = np.where(vol_5d > 0, np.clip(t_5d / np.maximum(vol_5d, 1.0), -1.0, 1.0), 0.0)

        sym_margin = margin_by_sym.get(sym, {})
        if sym_margin:
            m_arr = pd.Series([sym_margin.get(d, np.nan) for d in dates]).ffill().to_numpy()
            m_prev5 = np.roll(m_arr, 5)
            m_prev5[:5] = m_arr[:5]
            m_chg_5d = np.where(
                (m_prev5 > 0) & np.isfinite(m_arr),
                np.clip(((m_arr - m_prev5) / m_prev5) * 100.0, -30.0, 30.0),
                0.0,
            )
        else:
            # 散戶與法人對作籌碼變化代理值 (%)
            m_chg_5d = np.where(
                vol_5d > 0,
                np.clip((-tot_5d / np.maximum(vol_5d, 1.0)) * 100.0, -30.0, 30.0),
                0.0,
            )

        inst_streak = _streak_series(tot_net)
        trust_streak = _streak_series(t_net)
        foreign_streak = _streak_series(f_net)

        # 低頻基本面（Point-in-Time 按 announcement_date 建立時間軸）
        s_fin = sorted(fin_by_sym.get(sym, []), key=lambda x: (x[0], x[1]))
        s_bs = sorted(bs_by_sym.get(sym, []), key=lambda x: (x[0], x[1]))
        s_cf = sorted(cf_by_sym.get(sym, []), key=lambda x: (x[0], x[1]))

        shares = shares_map.get(sym)
        if not shares:
            est = [abs(ni / eps) for _, _, _, _, ni, eps in s_fin if abs(eps) > 1e-4 and abs(ni) > 1e5]
            shares = float(np.median(est)) if est else None

        bs_ann = [(quarter_announcement_date(x[0], x[1]), x) for x in s_bs]
        cf_ann = [(quarter_announcement_date(x[0], x[1]), x) for x in s_cf]
        fin_ann = [(quarter_announcement_date(x[0], x[1]), x) for x in s_fin]
        fin_ann.sort(key=lambda x: x[0])

        q_rev_map = {(x[0], x[1]): x[2] for _, x in fin_ann}
        q_eps_map = {(x[0], x[1]): x[5] for _, x in fin_ann}

        fund_dates: List[str] = []
        fund_vals: List[Tuple[Optional[float], Optional[float], float, float, float, float, float]] = []
        # tuple: (ttm_eps, bvps, rev_yoy, rev_mom, rev_3_12, gm_qoq, health_score)
        for idx_f, (ann, fitem) in enumerate(fin_ann):
            y, q, rev, gp, _ni, _eps = fitem
            # TTM EPS
            cy, cq = y, q
            eps4, rev4 = [], []
            for _ in range(4):
                if (cy, cq) in q_eps_map:
                    eps4.append(q_eps_map[(cy, cq)])
                if (cy, cq) in q_rev_map and q_rev_map[(cy, cq)] > 0:
                    rev4.append(q_rev_map[(cy, cq)])
                cq -= 1
                if cq == 0:
                    cq = 4
                    cy -= 1
            ttm_eps = sum(eps4) if len(eps4) == 4 else None

            # 營收 YoY / QoQ / 動能
            prev_y_rev = q_rev_map.get((y - 1, q), 0.0)
            r_yoy = float(np.clip(((rev - prev_y_rev) / abs(prev_y_rev)) * 100.0, -90.0, 300.0)) if prev_y_rev > 0 else 0.0

            pq = q - 1 if q > 1 else 4
            py = y if q > 1 else y - 1
            prev_q_rev = q_rev_map.get((py, pq), 0.0)
            r_mom = float(np.clip(((rev - prev_q_rev) / abs(prev_q_rev)) * 100.0, -90.0, 300.0)) if prev_q_rev > 0 else 0.0

            avg12_q = float(np.mean(rev4)) if rev4 else rev
            r_3_12 = float(np.clip(rev / max(avg12_q, 1.0), 0.1, 5.0)) if rev > 0 else 1.0

            # 毛利率 QoQ 變化 (百分點)
            cur_gm = (gp / rev * 100.0) if (rev > 0 and gp) else 0.0
            prev_fin = fin_ann[idx_f - 1][1] if idx_f > 0 else None
            prev_gm = (prev_fin[3] / prev_fin[2] * 100.0) if (prev_fin and prev_fin[2] > 0 and prev_fin[3]) else cur_gm
            gm_qoq = float(np.clip(cur_gm - prev_gm, -50.0, 50.0)) if gp else 0.0

            # 截至該公告日可用的 BS & CF
            avail_fin = [x for a, x in fin_ann if a <= ann]
            avail_bs = [x for a, x in bs_ann if a <= ann]
            avail_cf = [x for a, x in cf_ann if a <= ann]
            hs = _compute_health_score_snapshot(avail_fin, avail_bs, avail_cf)

            bvps = (avail_bs[-1][5] / shares) if (avail_bs and avail_bs[-1][5] > 0 and shares and shares > 0) else None
            item_tuple = (ttm_eps, bvps, r_yoy, r_mom, r_3_12, gm_qoq, hs)
            if fund_dates and fund_dates[-1] == ann:
                fund_vals[-1] = item_tuple
            else:
                fund_dates.append(ann)
                fund_vals.append(item_tuple)

        # 若有更細的月營收表，準備其公告日時間軸
        s_mrev = mrev_by_sym.get(sym, [])
        mrev_dates = [x[0] for x in s_mrev]

        # 逐日計算每日 PE (0 < PE <= 100) 與滾動分位數
        daily_pe = np.full(n_total, np.nan, dtype=np.float64)
        daily_pb = np.full(n_total, np.nan, dtype=np.float64)
        daily_fund_idx = np.full(n_total, -1, dtype=np.int32)
        for i, dt in enumerate(dates):
            fidx = bisect_right(fund_dates, dt) - 1
            daily_fund_idx[i] = fidx
            if fidx >= 0:
                te, bv = fund_vals[fidx][0], fund_vals[fidx][1]
                if te is not None and te > 0:
                    pe = closes[i] / te
                    if 0.0 < pe <= 100.0:
                        daily_pe[i] = pe
                if bv is not None and bv > 0:
                    pb = closes[i] / bv
                    if 0.05 < pb < 30.0:
                        daily_pb[i] = pb

        smeta = stock_meta.get(sym)
        is_pb_ind = (sym in PANEL_SYMBOLS) or (smeta is not None and (smeta.industry or "").strip() in PB_INDUSTRIES)

        for i in range(out_start, n_total):
            dt = dates[i]
            fidx = int(daily_fund_idx[i])
            if fidx >= 0:
                te, bv, r_yoy, r_mom, r_3_12, gm_qoq, hs = fund_vals[fidx]
            else:
                te, bv, r_yoy, r_mom, r_3_12, gm_qoq, hs = None, None, 0.0, 0.0, 1.0, 0.0, 50.0

            # 若有月營收資料則覆寫 rev_yoy / rev_mom / rev_3_12
            if mrev_dates:
                midx = bisect_right(mrev_dates, dt) - 1
                if midx >= 0:
                    _, _mrev, m_yoy, m_mom = s_mrev[midx]
                    if m_yoy is not None:
                        r_yoy = float(np.clip(m_yoy, -90.0, 300.0))
                    if m_mom is not None:
                        r_mom = float(np.clip(m_mom, -90.0, 300.0))
                    if midx >= 11:
                        avg3 = float(np.mean([s_mrev[k][1] for k in range(midx - 2, midx + 1)]))
                        avg12 = float(np.mean([s_mrev[k][1] for k in range(midx - 11, midx + 1)]))
                        if avg12 > 0:
                            r_3_12 = float(np.clip(avg3 / avg12, 0.1, 5.0))

            win_start = max(0, i - 749)
            pe_win = daily_pe[win_start : i + 1]
            pe_valid = pe_win[np.isfinite(pe_win)]

            pb_win = daily_pb[win_start : i + 1]
            pb_valid = pb_win[np.isfinite(pb_win)]

            if np.isfinite(daily_pe[i]) and len(pe_valid) >= 20:
                pe_pct = float(np.mean(pe_valid <= daily_pe[i]) * 100.0)
            elif np.isfinite(daily_pb[i]) and len(pb_valid) >= 20:
                pe_pct = float(np.mean(pb_valid <= daily_pb[i]) * 100.0)
            else:
                c_win = closes[win_start : i + 1]
                pe_pct = float(np.mean(c_win <= closes[i]) * 100.0)

            # 嚴格僅用截至 dt 當日的歷史計算相對估值百分位
            if (not is_pb_ind) and te is not None and te > 0 and len(pe_valid) >= 20:
                c_band = te * float(np.quantile(pe_valid, 0.20))
                e_band = te * float(np.quantile(pe_valid, 0.80))
                val_pct = float(np.clip((closes[i] - c_band) / max(e_band - c_band, 1e-6) * 100.0, 0.0, 100.0))
            elif bv is not None and bv > 0 and len(pb_valid) >= 20:
                c_band = bv * float(np.quantile(pb_valid, 0.20))
                e_band = bv * float(np.quantile(pb_valid, 0.80))
                val_pct = float(np.clip((closes[i] - c_band) / max(e_band - c_band, 1e-6) * 100.0, 0.0, 100.0))
            else:
                c_win = closes[win_start : i + 1]
                c_band = float(np.quantile(c_win, 0.20))
                e_band = float(np.quantile(c_win, 0.80))
                val_pct = float(np.clip((closes[i] - c_band) / max(e_band - c_band, 1e-6) * 100.0, 0.0, 100.0))

            rows_tuples.append((
                sym,
                dt,
                round(float(f_ratio_5d[i]), 5),
                round(float(t_ratio_5d[i]), 5),
                round(float(m_chg_5d[i]), 3),
                int(inst_streak[i]),
                int(trust_streak[i]),
                int(foreign_streak[i]),
                round(r_yoy, 2),
                round(r_mom, 2),
                round(r_3_12, 3),
                round(gm_qoq, 2),
                round(pe_pct, 1),
                round(hs, 1),
                round(val_pct, 1),
                round(float(taiex_ret_map.get(dt, 0.0)), 3),
                round(float(atr14_pct[i]), 3),
                round(float(ann_vol_20[i]), 2),
            ))

    if rows_tuples:
        upsert_sql = """
            INSERT INTO stock_multimodal_features (
                symbol, date,
                foreign_net_vol_ratio_5d, trust_net_vol_ratio_5d, margin_balance_chg_5d,
                inst_streak_days, trust_streak_days, foreign_streak_days,
                rev_yoy, rev_mom, rev_momentum_3m_12m, gross_margin_qoq,
                pe_percentile_3y, health_score, valuation_percentile,
                taiex_ret_5d, atr_14_pct, ann_vol_20d
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(symbol, date) DO UPDATE SET
                foreign_net_vol_ratio_5d = excluded.foreign_net_vol_ratio_5d,
                trust_net_vol_ratio_5d = excluded.trust_net_vol_ratio_5d,
                margin_balance_chg_5d = excluded.margin_balance_chg_5d,
                inst_streak_days = excluded.inst_streak_days,
                trust_streak_days = excluded.trust_streak_days,
                foreign_streak_days = excluded.foreign_streak_days,
                rev_yoy = excluded.rev_yoy,
                rev_mom = excluded.rev_mom,
                rev_momentum_3m_12m = excluded.rev_momentum_3m_12m,
                gross_margin_qoq = excluded.gross_margin_qoq,
                pe_percentile_3y = excluded.pe_percentile_3y,
                health_score = excluded.health_score,
                valuation_percentile = excluded.valuation_percentile,
                taiex_ret_5d = excluded.taiex_ret_5d,
                atr_14_pct = excluded.atr_14_pct,
                ann_vol_20d = excluded.ann_vol_20d
        """
        batch_sz = 10000
        for b in range(0, len(rows_tuples), batch_sz):
            cur.executemany(upsert_sql, rows_tuples[b : b + batch_sz])
        raw_conn.commit()

    return {
        "symbols": processed_syms,
        "rows_written": len(rows_tuples),
        "days": days,
        "elapsed_seconds": round(time.perf_counter() - t0, 2),
    }


def load_latest_feature_map(db: Session, symbols: Optional[List[str]] = None) -> Dict[str, Dict[str, Any]]:
    """一次讀取每檔個股最新一日的多模態特徵紀錄。"""
    raw_conn = db.connection().connection
    cur = raw_conn.cursor()
    sql = """
        SELECT f.symbol, f.date,
               f.foreign_net_vol_ratio_5d, f.trust_net_vol_ratio_5d, f.margin_balance_chg_5d,
               f.inst_streak_days, f.trust_streak_days, f.foreign_streak_days,
               f.rev_yoy, f.rev_mom, f.rev_momentum_3m_12m, f.gross_margin_qoq,
               f.pe_percentile_3y, f.health_score, f.valuation_percentile,
               f.taiex_ret_5d, f.atr_14_pct, f.ann_vol_20d
        FROM stock_multimodal_features f
        INNER JOIN (
            SELECT symbol, MAX(date) AS max_dt FROM stock_multimodal_features GROUP BY symbol
        ) latest ON f.symbol = latest.symbol AND f.date = latest.max_dt
    """
    params: Tuple[Any, ...] = ()
    if symbols:
        placeholders = ",".join(["?"] * len(symbols))
        sql = f"""
            SELECT f.symbol, f.date,
                   f.foreign_net_vol_ratio_5d, f.trust_net_vol_ratio_5d, f.margin_balance_chg_5d,
                   f.inst_streak_days, f.trust_streak_days, f.foreign_streak_days,
                   f.rev_yoy, f.rev_mom, f.rev_momentum_3m_12m, f.gross_margin_qoq,
                   f.pe_percentile_3y, f.health_score, f.valuation_percentile,
                   f.taiex_ret_5d, f.atr_14_pct, f.ann_vol_20d
            FROM stock_multimodal_features f
            INNER JOIN (
                SELECT symbol, MAX(date) AS max_dt
                FROM stock_multimodal_features
                WHERE symbol IN ({placeholders})
                GROUP BY symbol
            ) latest ON f.symbol = latest.symbol AND f.date = latest.max_dt
        """
        params = tuple(symbols)

    cur.execute(sql, params)
    out: Dict[str, Dict[str, Any]] = {}
    for row in cur:
        out[row[0]] = {
            "date": row[1],
            "foreign_net_vol_ratio_5d": row[2],
            "trust_net_vol_ratio_5d": row[3],
            "margin_balance_chg_5d": row[4],
            "inst_streak_days": row[5],
            "trust_streak_days": row[6],
            "foreign_streak_days": row[7],
            "rev_yoy": row[8],
            "rev_mom": row[9],
            "rev_momentum_3m_12m": row[10],
            "gross_margin_qoq": row[11],
            "pe_percentile_3y": row[12],
            "health_score": row[13],
            "valuation_percentile": row[14],
            "taiex_ret_5d": row[15],
            "atr_14_pct": row[16],
            "ann_vol_20d": row[17],
        }
    return out


def load_feature_history_map(
    db: Session,
    symbols: Optional[List[str]] = None,
    min_date: Optional[str] = None,
) -> Dict[Tuple[str, str], Dict[str, Any]]:
    """載入 (symbol, date) -> feature dict 查找表供回測/訓練高速存取。"""
    raw_conn = db.connection().connection
    cur = raw_conn.cursor()
    clauses = []
    params: List[Any] = []
    if symbols:
        placeholders = ",".join(["?"] * len(symbols))
        clauses.append(f"symbol IN ({placeholders})")
        params.extend(symbols)
    if min_date:
        clauses.append("date >= ?")
        params.append(min_date)
    where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    sql = f"""
        SELECT symbol, date,
               foreign_net_vol_ratio_5d, trust_net_vol_ratio_5d, margin_balance_chg_5d,
               inst_streak_days, trust_streak_days, foreign_streak_days,
               rev_yoy, rev_mom, rev_momentum_3m_12m, gross_margin_qoq,
               pe_percentile_3y, health_score, valuation_percentile,
               taiex_ret_5d, atr_14_pct, ann_vol_20d
        FROM stock_multimodal_features {where_sql}
    """
    cur.execute(sql, params)
    out: Dict[Tuple[str, str], Dict[str, Any]] = {}
    for row in cur:
        out[(row[0], row[1])] = {
            "foreign_net_vol_ratio_5d": row[2],
            "trust_net_vol_ratio_5d": row[3],
            "margin_balance_chg_5d": row[4],
            "inst_streak_days": row[5],
            "trust_streak_days": row[6],
            "foreign_streak_days": row[7],
            "rev_yoy": row[8],
            "rev_mom": row[9],
            "rev_momentum_3m_12m": row[10],
            "gross_margin_qoq": row[11],
            "pe_percentile_3y": row[12],
            "health_score": row[13],
            "valuation_percentile": row[14],
            "taiex_ret_5d": row[15],
            "atr_14_pct": row[16],
            "ann_vol_20d": row[17],
        }
    return out
