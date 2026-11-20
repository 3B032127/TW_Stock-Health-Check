"""
台股全市場自適應估值計算引擎 (PE Band / PB Band / 穩定高股息混合校準)

規則：
  1. 法定財報公告日對齊 (zero look-ahead bias):
     Q1 -> YYYY-05-15, Q2 -> YYYY-08-14, Q3 -> YYYY-11-14, Q4 -> (YYYY+1)-03-31
  2. 產業與獲利狀態路由：
     - 金融保險、景氣循環股（航運/鋼鐵/面板/塑膠/水泥/造紙/油電燃氣）或 TTM EPS <= 0 -> PB Band (750D 20%/50%/80%)
     - 一般獲利股 (TTM EPS > 0) -> PE Band (剔除 PE <= 0 或 PE > 100, 750D 20%/50%/80%)
  3. 穩定高股息混合校準（50%/50%）：
     - 連續 5 年配發現金股利且近 3 年平均現金殖利率 >= 4% -> 混合現金殖利率法 (6.0%/4.5%/3.5%)
"""

from __future__ import annotations

from bisect import bisect_right
from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from .. import models

PB_INDUSTRIES = {
    "金融保險",
    "航運業",
    "鋼鐵工業",
    "塑膠工業",
    "油電燃氣業",
    "水泥工業",
    "造紙工業",
}

PANEL_SYMBOLS = {"2409", "3481", "6116", "8105", "3049", "5234", "4960", "6176"}

ZONE_LABELS = {
    "cheap": "便宜價區（低估）",
    "fair_low": "合理偏低區",
    "fair_high": "合理偏高區",
    "expensive": "昂貴價區（高股價）",
}


def quarter_announcement_date(year: int, quarter: int) -> str:
    """依台股法定財報公告死線換算最早可視日期 (YYYY-MM-DD)。"""
    if quarter == 1:
        return f"{year}-05-15"
    if quarter == 2:
        return f"{year}-08-14"
    if quarter == 3:
        return f"{year}-11-14"
    return f"{year + 1}-03-31"


def classify_zone(current_close: float, cheap: float, fair: float, expensive: float) -> Tuple[str, str]:
    if current_close < cheap:
        zone = "cheap"
    elif current_close < fair:
        zone = "fair_low"
    elif current_close < expensive:
        zone = "fair_high"
    else:
        zone = "expensive"
    return zone, ZONE_LABELS[zone]


def _is_pb_routed(stock_meta: Optional[models.Stock], latest_ttm_eps: Optional[float]) -> bool:
    if latest_ttm_eps is None or latest_ttm_eps <= 0:
        return True
    if stock_meta is None:
        return False
    if stock_meta.symbol if hasattr(stock_meta, "symbol") else False:
        pass
    sid = getattr(stock_meta, "stock_id", "")
    if sid in PANEL_SYMBOLS:
        return True
    ind = (stock_meta.industry or "").strip()
    sub = (stock_meta.sub_industry or "").strip()
    name = (stock_meta.name or "").strip()
    if ind in PB_INDUSTRIES:
        return True
    if "面板" in sub or "面板" in name:
        return True
    return False


def _enforce_monotonic_bands(
    cheap: float, fair: float, expensive: float, fallback_close: float
) -> Tuple[float, float, float]:
    ref = max(float(fallback_close), 1.0)
    c = float(cheap) if np.isfinite(cheap) and cheap > 0 else ref * 0.85
    f = float(fair) if np.isfinite(fair) and fair > 0 else ref
    e = float(expensive) if np.isfinite(expensive) and expensive > 0 else ref * 1.15

    if f <= c:
        f = max(c * 1.05, c + 0.05)
    if e <= f:
        e = max(f * 1.05, f + 0.05)
    return round(c, 2), round(f, 2), round(e, 2)


def _compute_valuation_for_symbol(
    symbol: str,
    stock_meta: Optional[models.Stock],
    prices: List[Tuple[str, float]],
    fin_rows: List[Tuple[int, int, Optional[float], Optional[float]]],
    bs_rows: List[Tuple[int, int, Optional[float], Optional[float], Optional[float]]],
    shares_outstanding: Optional[float],
    div_rows: List[Tuple[str, float]],
    as_of_date: str,
) -> Optional[Dict[str, Any]]:
    """
    針對單一標的計算截至 as_of_date (嚴格無未來函數) 的自適應估值結果。
    prices: sorted list of (date, close)
    fin_rows: list of (year, quarter, eps, net_income)
    bs_rows: list of (year, quarter, shareholders_equity, total_assets, total_liabilities)
    div_rows: list of (ex_date, cash)
    """
    filtered_prices = [(d, float(c)) for d, c in prices if d <= as_of_date and c is not None and c > 0]
    if not filtered_prices:
        return None

    cur_date, cur_close = filtered_prices[-1]
    win_prices = filtered_prices[-750:]

    # 1. 建立嚴格按公告日排序的 TTM EPS 時間序列
    fin_events: List[Tuple[str, int, int, Optional[float], Optional[float]]] = []
    for y, q, eps, ni in fin_rows:
        ann = quarter_announcement_date(int(y), int(q))
        fin_events.append((ann, int(y), int(q), eps, ni))
    fin_events.sort(key=lambda x: (x[0], x[1], x[2]))

    ttm_timeline_dates: List[str] = []
    ttm_timeline_vals: List[Optional[float]] = []
    q_eps_map: Dict[Tuple[int, int], float] = {}
    est_shares_candidates: List[float] = []

    for ann, y, q, eps, ni in fin_events:
        if eps is not None:
            q_eps_map[(y, q)] = float(eps)
            if ni is not None and abs(float(eps)) > 1e-4 and abs(float(ni)) > 1e5:
                ratio = abs(float(ni) / float(eps))
                if 1e5 < ratio < 1e12:
                    est_shares_candidates.append(ratio)

        # 取得截至此公告日最新的連續 4 季累積 EPS
        # 往回檢查過去 4 個季度 (y, q) -> ...
        curr_y, curr_q = y, q
        last_4 = []
        for _ in range(4):
            val = q_eps_map.get((curr_y, curr_q))
            if val is not None:
                last_4.append(val)
            curr_q -= 1
            if curr_q == 0:
                curr_q = 4
                curr_y -= 1
        ttm_val = sum(last_4) if len(last_4) == 4 else None
        if ttm_timeline_dates and ttm_timeline_dates[-1] == ann:
            ttm_timeline_vals[-1] = ttm_val
        else:
            ttm_timeline_dates.append(ann)
            ttm_timeline_vals.append(ttm_val)

    # 2. 取得發行股數與嚴格按公告日排序的 BVPS 時間序列
    shares = float(shares_outstanding) if shares_outstanding and shares_outstanding > 0 else None
    if shares is None and est_shares_candidates:
        shares = float(np.median(est_shares_candidates))

    bs_events: List[Tuple[str, int, int, float]] = []
    for y, q, eq, tot_a, tot_l in bs_rows:
        equity = None
        if eq is not None and float(eq) > 0:
            equity = float(eq)
        elif tot_a is not None and tot_l is not None and (float(tot_a) - float(tot_l)) > 0:
            equity = float(tot_a) - float(tot_l)
        if equity is not None:
            ann = quarter_announcement_date(int(y), int(q))
            bs_events.append((ann, int(y), int(q), equity))
    bs_events.sort(key=lambda x: (x[0], x[1], x[2]))

    bvps_timeline_dates: List[str] = []
    bvps_timeline_vals: List[float] = []
    if shares and shares > 0:
        for ann, _y, _q, equity in bs_events:
            bvps_val = equity / shares
            if bvps_val > 0:
                if bvps_timeline_dates and bvps_timeline_dates[-1] == ann:
                    bvps_timeline_vals[-1] = bvps_val
                else:
                    bvps_timeline_dates.append(ann)
                    bvps_timeline_vals.append(bvps_val)

    def _lookup_ttm(d: str) -> Optional[float]:
        idx = bisect_right(ttm_timeline_dates, d) - 1
        return ttm_timeline_vals[idx] if idx >= 0 else None

    def _lookup_bvps(d: str) -> Optional[float]:
        idx = bisect_right(bvps_timeline_dates, d) - 1
        return bvps_timeline_vals[idx] if idx >= 0 else None

    latest_ttm_eps = _lookup_ttm(cur_date)
    latest_bvps = _lookup_bvps(cur_date)

    # 計算 PE 與 PB 歷史序列
    pe_series: List[float] = []
    pb_series: List[float] = []
    for d, c in win_prices:
        te = _lookup_ttm(d)
        if te is not None and te > 0:
            pe = c / te
            if 0.0 < pe <= 100.0:
                pe_series.append(pe)
        bv = _lookup_bvps(d)
        if bv is not None and bv > 0:
            pb = c / bv
            if 0.05 < pb < 30.0:
                pb_series.append(pb)

    use_pb = _is_pb_routed(stock_meta, latest_ttm_eps)
    pe_percentile_3y: Optional[float] = None
    if latest_ttm_eps and latest_ttm_eps > 0 and len(pe_series) >= 30:
        curr_pe = cur_close / latest_ttm_eps
        pe_percentile_3y = round(float(np.mean(np.asarray(pe_series) <= curr_pe) * 100.0), 1)

    base_mode = ""
    cheap = fair = expensive = 0.0

    if not use_pb and latest_ttm_eps and latest_ttm_eps > 0 and len(pe_series) >= 30:
        arr = np.asarray(pe_series, dtype=np.float64)
        cheap = latest_ttm_eps * float(np.quantile(arr, 0.20))
        fair = latest_ttm_eps * float(np.quantile(arr, 0.50))
        expensive = latest_ttm_eps * float(np.quantile(arr, 0.80))
        base_mode = "PE"
        method_label = "歷史本益比河流法 (PE Band)"
    elif latest_bvps and latest_bvps > 0 and len(pb_series) >= 30:
        arr = np.asarray(pb_series, dtype=np.float64)
        cheap = latest_bvps * float(np.quantile(arr, 0.20))
        fair = latest_bvps * float(np.quantile(arr, 0.50))
        expensive = latest_bvps * float(np.quantile(arr, 0.80))
        base_mode = "PB"
        method_label = "歷史股價淨值比河流法 (PB Band)"
    else:
        closes_arr = np.asarray([c for _d, c in win_prices], dtype=np.float64)
        cheap = float(np.quantile(closes_arr, 0.20))
        fair = float(np.quantile(closes_arr, 0.50))
        expensive = float(np.quantile(closes_arr, 0.80))
        base_mode = "PRICE"
        method_label = "歷史股價分位帶 (3Y Price Band)"

    # 3. 穩定高股息混合校準 (50% / 50%)
    annual_cash: Dict[int, float] = defaultdict(float)
    for ex_date, cash_val in div_rows:
        if ex_date and ex_date <= cur_date and cash_val is not None and cash_val > 0:
            try:
                ex_year = int(ex_date[:4])
                annual_cash[ex_year] += float(cash_val)
            except ValueError:
                continue

    avg_div_yield_3y: Optional[float] = None
    cur_year = int(cur_date[:4])
    # 計算每年均價，以便準確計算過去 3 年平均現金殖利率
    year_prices: Dict[int, List[float]] = defaultdict(list)
    for d, c in filtered_prices:
        try:
            year_prices[int(d[:4])].append(c)
        except ValueError:
            continue

    # 決定評選高股息的 5 個年度窗口：若當年尚未配足前一年一半（例如季配息未配完或尚未除息），以去年度起算前 5 年
    prev_cash = annual_cash.get(cur_year - 1, 0.0)
    end_div_year = (
        cur_year
        if (annual_cash.get(cur_year, 0.0) > 0 and (prev_cash <= 0 or annual_cash[cur_year] >= 0.5 * prev_cash))
        else cur_year - 1
    )
    five_years = [end_div_year - i for i in range(4, -1, -1)]
    five_cash = [annual_cash.get(y, 0.0) for y in five_years]

    if all(v > 0 for v in five_cash):
        recent_3_years = five_years[-3:]
        yields_3y = []
        for y in recent_3_years:
            denom = float(np.mean(year_prices[y])) if year_prices.get(y) else cur_close
            if denom > 0:
                yields_3y.append((annual_cash[y] / denom) * 100.0)
        if yields_3y:
            avg_div_yield_3y = round(float(np.mean(yields_3y)), 2)

        if avg_div_yield_3y is not None and avg_div_yield_3y >= 4.0:
            avg_5y_cash = float(np.mean(five_cash))
            div_cheap = avg_5y_cash / 0.060
            div_fair = avg_5y_cash / 0.045
            div_expensive = avg_5y_cash / 0.035

            cheap = 0.5 * cheap + 0.5 * div_cheap
            fair = 0.5 * fair + 0.5 * div_fair
            expensive = 0.5 * expensive + 0.5 * div_expensive
            if base_mode == "PE":
                method_label = "PE+股利混合法"
            elif base_mode == "PB":
                method_label = "PB+股利混合法"
            else:
                method_label = "股利殖利率混合法"

    cheap, fair, expensive = _enforce_monotonic_bands(cheap, fair, expensive, cur_close)
    zone, zone_label = classify_zone(cur_close, cheap, fair, expensive)
    dist_pct = round(((cur_close - fair) / fair) * 100.0, 2) if fair > 0 else 0.0
    span = max(expensive - cheap, 1e-6)
    val_pct = round(float(np.clip((cur_close - cheap) / span * 100.0, 0.0, 100.0)), 1)

    return {
        "symbol": symbol,
        "as_of_date": cur_date,
        "method": method_label,
        "cheap_price": cheap,
        "fair_price": fair,
        "expensive_price": expensive,
        "current_close": round(cur_close, 2),
        "current_zone": zone,
        "zone_label": zone_label,
        "distance_to_fair_pct": dist_pct,
        "pe_percentile_3y": pe_percentile_3y,
        "valuation_percentile": val_pct,
        "ttm_eps": round(latest_ttm_eps, 2) if latest_ttm_eps is not None else None,
        "bvps": round(latest_bvps, 2) if latest_bvps is not None else None,
        "avg_div_yield_3y": avg_div_yield_3y,
    }


def compute_and_save_valuations(
    db: Session,
    symbols: Optional[List[str]] = None,
    as_of_date: Optional[str] = None,
) -> Dict[str, Any]:
    """批次計算並寫入 stock_valuations 資料表（可指定 symbols 或全市場執行）。"""
    q_stock = db.query(models.Stock)
    if symbols:
        q_stock = q_stock.filter(models.Stock.stock_id.in_(symbols))
    stock_rows = q_stock.all()
    stock_map = {s.stock_id: s for s in stock_rows}
    target_syms = symbols if symbols else sorted(stock_map.keys())
    if not target_syms:
        return {"processed": 0, "written": 0, "methods": {}}

    effective_date = as_of_date or "9999-12-31"

    # 批次載入 750+ 交易日（多抓 4 年日曆約 1500 天以防缺失）
    p_q = db.query(
        models.StockPriceDaily.stock_id,
        models.StockPriceDaily.date,
        models.StockPriceDaily.close,
    ).filter(
        models.StockPriceDaily.stock_id.in_(target_syms),
        models.StockPriceDaily.close.isnot(None),
        models.StockPriceDaily.close > 0,
        models.StockPriceDaily.date <= effective_date,
    ).order_by(models.StockPriceDaily.stock_id.asc(), models.StockPriceDaily.date.asc())
    price_map: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
    for sid, dt, cl in p_q.all():
        price_map[sid].append((dt, float(cl)))

    fin_q = db.query(
        models.FinancialStatement.stock_id,
        models.FinancialStatement.year,
        models.FinancialStatement.quarter,
        models.FinancialStatement.eps,
        models.FinancialStatement.net_income,
    ).filter(models.FinancialStatement.stock_id.in_(target_syms))
    fin_map: Dict[str, List[Tuple[int, int, Optional[float], Optional[float]]]] = defaultdict(list)
    for sid, y, q, eps, ni in fin_q.all():
        fin_map[sid].append((y, q, eps, ni))

    bs_q = db.query(
        models.BalanceSheet.stock_id,
        models.BalanceSheet.year,
        models.BalanceSheet.quarter,
        models.BalanceSheet.shareholders_equity,
        models.BalanceSheet.total_assets,
        models.BalanceSheet.total_liabilities,
    ).filter(models.BalanceSheet.stock_id.in_(target_syms))
    bs_map: Dict[str, List[Tuple[int, int, Optional[float], Optional[float], Optional[float]]]] = defaultdict(list)
    for sid, y, q, eq, ta, tl in bs_q.all():
        bs_map[sid].append((y, q, eq, ta, tl))

    mcap_q = db.query(
        models.MarketCapCache.stock_id,
        models.MarketCapCache.shares_outstanding,
    ).filter(models.MarketCapCache.stock_id.in_(target_syms))
    shares_map = {sid: sh for sid, sh in mcap_q.all()}

    div_q = db.query(
        models.Dividend.stock_id,
        models.Dividend.date,
        models.Dividend.cash,
    ).filter(
        models.Dividend.stock_id.in_(target_syms),
        models.Dividend.cash > 0,
    )
    div_map: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
    for sid, dt, cash in div_q.all():
        div_map[sid].append((dt, float(cash)))

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    rows_to_upsert: List[Dict[str, Any]] = []
    method_counts: Dict[str, int] = defaultdict(int)

    for sym in target_syms:
        res = _compute_valuation_for_symbol(
            symbol=sym,
            stock_meta=stock_map.get(sym),
            prices=price_map.get(sym, []),
            fin_rows=fin_map.get(sym, []),
            bs_rows=bs_map.get(sym, []),
            shares_outstanding=shares_map.get(sym),
            div_rows=div_map.get(sym, []),
            as_of_date=effective_date,
        )
        if res:
            method_counts[res["method"]] += 1
            rows_to_upsert.append({**res, "updated_at": now_str})

    if rows_to_upsert:
        chunk_size = 50  # 16 cols * 50 = 800 bind params < 999
        for i in range(0, len(rows_to_upsert), chunk_size):
            chunk = rows_to_upsert[i : i + chunk_size]
            stmt = sqlite_insert(models.StockValuation).values(chunk)
            stmt = stmt.on_conflict_do_update(
                index_elements=["symbol"],
                set_={
                    "as_of_date": stmt.excluded.as_of_date,
                    "method": stmt.excluded.method,
                    "cheap_price": stmt.excluded.cheap_price,
                    "fair_price": stmt.excluded.fair_price,
                    "expensive_price": stmt.excluded.expensive_price,
                    "current_close": stmt.excluded.current_close,
                    "current_zone": stmt.excluded.current_zone,
                    "zone_label": stmt.excluded.zone_label,
                    "distance_to_fair_pct": stmt.excluded.distance_to_fair_pct,
                    "pe_percentile_3y": stmt.excluded.pe_percentile_3y,
                    "valuation_percentile": stmt.excluded.valuation_percentile,
                    "ttm_eps": stmt.excluded.ttm_eps,
                    "bvps": stmt.excluded.bvps,
                    "avg_div_yield_3y": stmt.excluded.avg_div_yield_3y,
                    "updated_at": stmt.excluded.updated_at,
                },
            )
            db.execute(stmt)
        db.commit()

    return {
        "processed": len(target_syms),
        "written": len(rows_to_upsert),
        "methods": dict(method_counts),
    }


def format_valuation_payload(row: models.StockValuation) -> Dict[str, Any]:
    return {
        "method": row.method,
        "cheap_price": round(float(row.cheap_price), 2),
        "fair_price": round(float(row.fair_price), 2),
        "expensive_price": round(float(row.expensive_price), 2),
        "current_zone": row.current_zone,
        "zone_label": row.zone_label,
        "distance_to_fair_pct": round(float(row.distance_to_fair_pct), 2),
    }


def get_or_compute_valuation(db: Session, symbol: str) -> Optional[Dict[str, Any]]:
    row = db.query(models.StockValuation).filter_by(symbol=symbol).first()
    if row is None:
        compute_and_save_valuations(db, symbols=[symbol])
        row = db.query(models.StockValuation).filter_by(symbol=symbol).first()
    return format_valuation_payload(row) if row is not None else None
