import json
import math
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

import gs_quant
import numpy as np
import pandas as pd
from gs_quant.timeseries import (
    Window,
    beta,
    bollinger_bands,
    correlation,
    max_drawdown,
    moving_average,
    percentiles,
    relative_strength_index,
    returns,
    volatility,
    zscores,
)
from gs_quant.timeseries.econometrics import excess_returns, get_ratio_pure
from sqlalchemy.orm import Session

from ... import models


def _safe_float(val: Any, default: float = 0.0, decimals: int = 4) -> float:
    """Safely convert numeric values (including numpy/pandas scalars) to finite JSON floats."""
    if val is None:
        return default
    try:
        f = float(val)
        if not math.isfinite(f):
            return default
        return round(f, decimals)
    except (TypeError, ValueError):
        return default


def _clip(val: float, low: float, high: float) -> float:
    return max(low, min(high, val))


def _zscore_to_percentile(z: float) -> float:
    """Convert standard normal Z-score to approximate 0-100 percentile via error function."""
    cdf = 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))
    return round(_clip(cdf * 100.0, 0.0, 100.0), 1)


def _zscore_to_score(z: float) -> int:
    """Map Z-score [-3, +3] into a 0-100 score (0 -> 50)."""
    return int(round(_clip(50.0 + z * (50.0 / 2.5), 5.0, 99.0)))


def _signal_label(z: float) -> str:
    if z >= 0.5:
        return "偏多 (Overweight)"
    if z <= -0.5:
        return "偏空 (Underweight)"
    return "中性 (Neutral)"


def _try_marquee_session() -> bool:
    """Initialize GS Marquee session only if institutional credentials are configured."""
    client_id = os.getenv("GS_CLIENT_ID")
    client_secret = os.getenv("GS_CLIENT_SECRET")
    if not client_id or not client_secret:
        return False
    try:
        from gs_quant.session import GsSession

        if not GsSession.current:
            GsSession.use(client_id=client_id, client_secret=client_secret)
        return True
    except Exception:
        return False


def _load_taiex_series(db: Session, start_date: str, end_date: str) -> Optional[pd.Series]:
    """Load TAIEX benchmark close prices from ResponseCache or yfinance (and cache cleanly)."""
    cache_rows = (
        db.query(models.ResponseCache)
        .filter(models.ResponseCache.cache_key.like("market:taiex_%"))
        .order_by(models.ResponseCache.created_at.desc())
        .all()
    )

    best_history: List[Dict[str, Any]] = []
    for row in cache_rows:
        try:
            payload = json.loads(row.response_data)
            hist = payload.get("data", {}).get("history", [])
            if len(hist) > len(best_history) and any("close" in h and "date" in h for h in hist):
                best_history = hist
        except Exception:
            continue

    if len(best_history) < 60:
        try:
            import yfinance as yf

            hist_df = yf.Ticker("^TWII").history(period="2y", interval="1d")
            if not hist_df.empty:
                fetched = []
                for idx, r in hist_df.iterrows():
                    close_val = _safe_float(r.get("Close"), default=0.0)
                    if close_val > 0:
                        fetched.append({"date": idx.strftime("%Y-%m-%d"), "close": close_val})
                if len(fetched) > len(best_history):
                    best_history = fetched
                    # Persist lightweight benchmark cache in ResponseCache (7 days)
                    import time

                    cache_key = "market:taiex_gs_bench:latest"
                    db.query(models.ResponseCache).filter_by(cache_key=cache_key).delete()
                    db.add(
                        models.ResponseCache(
                            cache_key=cache_key,
                            response_data=json.dumps({"data": {"history": best_history}}),
                            created_at=int(time.time()),
                            expires_at=int(time.time()) + 86400 * 7,
                        )
                    )
                    db.commit()
        except Exception:
            pass

    if not best_history:
        return None

    dates = []
    closes = []
    for item in best_history:
        d = str(item.get("date", ""))[:10]
        c = _safe_float(item.get("close"), default=0.0)
        if len(d) == 10 and c > 0 and d <= end_date:
            dates.append(d)
            closes.append(c)

    if len(dates) < 10:
        return None

    bench = pd.Series(closes, index=pd.to_datetime(dates), dtype=float)
    bench = bench[~bench.index.duplicated(keep="last")].sort_index()
    return bench[bench.index >= pd.to_datetime(start_date)]


def _safe_sharpe(price_series: pd.Series, window_len: int, rf: float = 0.015) -> float:
    """Compute Sharpe ratio using gs_quant excess_returns + get_ratio_pure, with holiday-safe fallback."""
    if len(price_series) < 5:
        return 0.0
    w_eff = min(window_len, len(price_series) - 1)
    try:
        er = excess_returns(price_series, rf)
        if (er <= 0).any():
            raise ValueError("Non-positive excess return series")
        sr_series = get_ratio_pure(er, Window(w_eff, 0)).dropna()
        if not sr_series.empty:
            val = _safe_float(sr_series.iloc[-1], default=0.0, decimals=3)
            return round(_clip(val, -10.0, 10.0), 3)
    except Exception:
        pass

    # Fallback preserving gs_quant volatility(annualization_factor=252)
    try:
        sub = price_series.iloc[-w_eff:]
        total_ret = float(sub.iloc[-1] / sub.iloc[0]) - 1.0
        ann_ret = (1.0 + total_ret) ** (252.0 / max(1, w_eff - 1)) - 1.0
        vol_pct = volatility(price_series, Window(w_eff, 0), annualization_factor=252).dropna()
        ann_vol = float(vol_pct.iloc[-1]) / 100.0 if not vol_pct.empty else 0.0
        if ann_vol > 1e-6:
            return round(_clip((ann_ret - rf) / ann_vol, -10.0, 10.0), 3)
    except Exception:
        pass
    return 0.0


def _build_fundamental_factors(
    db: Session,
    ticker: str,
    close_series: pd.Series,
    ma_60: pd.Series,
) -> Dict[str, Any]:
    """Derive Value and Quality factor Z-scores from SQLite financial & valuation tables."""
    latest_stmt = (
        db.query(models.FinancialStatement)
        .filter_by(stock_id=ticker)
        .order_by(models.FinancialStatement.year.desc(), models.FinancialStatement.quarter.desc())
        .first()
    )
    all_stmts = (
        db.query(models.FinancialStatement)
        .filter_by(stock_id=ticker)
        .order_by(models.FinancialStatement.year.asc(), models.FinancialStatement.quarter.asc())
        .all()
    )
    latest_bal = (
        db.query(models.BalanceSheet)
        .filter_by(stock_id=ticker)
        .order_by(models.BalanceSheet.year.desc(), models.BalanceSheet.quarter.desc())
        .first()
    )
    latest_cf = (
        db.query(models.CashFlowStatement)
        .filter_by(stock_id=ticker)
        .order_by(models.CashFlowStatement.year.desc(), models.CashFlowStatement.quarter.desc())
        .first()
    )
    mc_row = db.query(models.MarketCapCache).filter_by(stock_id=ticker).first()
    # Sum cash dividends for the latest dividend year (handles quarterly payers like 2330 accurately)
    latest_div_year_row = (
        db.query(models.Dividend.year)
        .filter_by(stock_id=ticker)
        .order_by(models.Dividend.year.desc())
        .first()
    )
    annual_cash_div = 0.0
    if latest_div_year_row:
        yr = latest_div_year_row[0]
        yr_divs = db.query(models.Dividend).filter_by(stock_id=ticker, year=yr).all()
        annual_cash_div = sum(float(d.cash or 0.0) for d in yr_divs)
        # If the newest year only has 1 payout so far for a quarterly dividend payer, use prior full year
        if len(yr_divs) <= 2:
            prev_divs = db.query(models.Dividend).filter_by(stock_id=ticker, year=yr - 1).all()
            if len(prev_divs) >= 3:
                annual_cash_div = sum(float(d.cash or 0.0) for d in prev_divs)

    latest_close = float(close_series.iloc[-1])
    ma60_val = _safe_float(ma_60.dropna().iloc[-1], default=latest_close) if not ma_60.dropna().empty else latest_close

    # 1. Quality Z-score: ROE, Gross Margin, Operating Margin, FCF ratio, EPS stability
    quality_components: List[float] = []
    quality_notes: List[str] = []

    if latest_stmt and latest_stmt.revenue and latest_stmt.revenue > 0:
        if latest_stmt.gross_profit is not None:
            gm = latest_stmt.gross_profit / latest_stmt.revenue * 100.0
            quality_components.append((gm - 28.0) / 15.0)
            quality_notes.append(f"毛利率 {gm:.1f}%")
        if latest_stmt.operating_income is not None:
            om = latest_stmt.operating_income / latest_stmt.revenue * 100.0
            quality_components.append((om - 15.0) / 12.0)
        if latest_bal and latest_bal.shareholders_equity and latest_bal.shareholders_equity > 0 and latest_stmt.net_income:
            roe = (latest_stmt.net_income * 4.0) / latest_bal.shareholders_equity * 100.0
            quality_components.append((roe - 12.0) / 10.0)
            quality_notes.append(f"年化ROE {roe:.1f}%")

    if latest_cf and latest_cf.operating_cash_flow and latest_stmt and latest_stmt.net_income and latest_stmt.net_income > 0:
        cash_conv = latest_cf.operating_cash_flow / latest_stmt.net_income
        quality_components.append((cash_conv - 0.9) / 0.5)

    eps_vals = [float(s.eps) for s in all_stmts[-12:] if s.eps is not None]
    if len(eps_vals) >= 4:
        eps_mean = float(np.mean(eps_vals))
        eps_std = float(np.std(eps_vals))
        if eps_std > 1e-6:
            stab = (eps_mean / eps_std) - 1.5
            quality_components.append(_clip(stab * 0.5, -2.0, 2.0))

    quality_z = _clip(float(np.mean(quality_components)) if quality_components else 0.0, -3.0, 3.0)

    # 2. Value Z-score: PE / PB / Dividend Yield / Mean Reversion vs 60D MA
    value_components: List[float] = []
    value_notes: List[str] = []

    if mc_row and mc_row.market_cap and mc_row.market_cap > 0 and latest_stmt and latest_stmt.net_income and latest_stmt.net_income > 0:
        ann_ni_yi = (latest_stmt.net_income * 4.0) / 1e8
        if ann_ni_yi > 0:
            pe = mc_row.market_cap / ann_ni_yi
            value_components.append((20.0 - pe) / 10.0)
            value_notes.append(f"預估本益比 {pe:.1f}x")
    if mc_row and mc_row.market_cap and mc_row.market_cap > 0 and latest_bal and latest_bal.shareholders_equity and latest_bal.shareholders_equity > 0:
        pb = (mc_row.market_cap * 1e8) / latest_bal.shareholders_equity
        value_components.append((2.2 - pb) / 1.5)
        value_notes.append(f"股價淨值比 {pb:.2f}x")
    if annual_cash_div > 0 and latest_close > 0:
        dy = (annual_cash_div / latest_close) * 100.0
        value_components.append((dy - 3.0) / 2.0)
        value_notes.append(f"現金殖利率 {dy:.2f}%")

    # Price relative to 60-day moving average (mean reversion valuation component)
    if ma60_val > 0:
        ma_discount = (ma60_val - latest_close) / ma60_val
        value_components.append(_clip(ma_discount * 10.0, -2.0, 2.0))

    value_z = _clip(float(np.mean(value_components)) if value_components else 0.0, -3.0, 3.0)

    return {
        "quality_z": round(quality_z, 3),
        "quality_notes": "、".join(quality_notes) if quality_notes else "基於財報盈餘品質與現金流轉換指標",
        "value_z": round(value_z, 3),
        "value_notes": "、".join(value_notes) if value_notes else "基於 PE/PB 估值折溢價與 60 日均線均值回歸",
    }


def _classify_quadrant(quality_z: float, momentum_z: float, value_z: float) -> str:
    if quality_z >= 0.4 and momentum_z >= 0.3:
        return "高品質・強動能核心資產"
    if quality_z >= 0.4 and value_z >= 0.2:
        return "高品質・價值低估潛力股"
    if momentum_z >= 0.4 and value_z < -0.3:
        return "動能領漲・高估值成長型"
    if momentum_z <= -0.5 and value_z >= 0.3:
        return "均值回歸觀察・防禦價值型"
    if quality_z < 0 and momentum_z < 0:
        return "體質趨弱・動能保守警戒"
    return "均衡配置・多空因子中性"


def get_factor_exposures(
    db: Session,
    ticker: str,
    date: Optional[str] = None,
    persist: bool = True,
) -> Dict[str, Any]:
    """
    Compute Goldman Sachs gs-quant multi-factor exposures, econometric risk metrics,
    and rolling time-series analytics for a Taiwan stock ticker.
    """
    marquee_connected = _try_marquee_session()

    price_q = db.query(models.StockPriceDaily).filter(models.StockPriceDaily.stock_id == ticker)
    if date and isinstance(date, str):
        price_q = price_q.filter(models.StockPriceDaily.date <= date)
    price_rows = price_q.order_by(models.StockPriceDaily.date.asc()).all()

    if len(price_rows) < 5:
        raise ValueError(f"股票 {ticker} 歷史價格資料不足（目前僅 {len(price_rows)} 筆），請先同步日線行情。")

    dates = [r.date for r in price_rows if r.close is not None and float(r.close) > 0]
    closes = [float(r.close) for r in price_rows if r.close is not None and float(r.close) > 0]
    close_series = pd.Series(closes, index=pd.to_datetime(dates), dtype=float)
    close_series = close_series[~close_series.index.duplicated(keep="last")].sort_index()

    n_obs = len(close_series)
    as_of_date = close_series.index[-1].strftime("%Y-%m-%d")

    # Effective windows so short histories never crash gs_quant functions
    w20 = min(20, max(2, n_obs - 1))
    w60 = min(60, max(2, n_obs - 1))
    w252 = min(252, max(2, n_obs - 1))
    w14 = min(14, max(2, n_obs - 1))

    # --- Real gs_quant.timeseries calculations ---
    ret_1d = returns(close_series, obs=1)
    ret_20d = returns(close_series, obs=min(20, max(1, n_obs - 1)))
    ret_60d = returns(close_series, obs=min(60, max(1, n_obs - 1)))

    vol_20_s = volatility(close_series, Window(w20, 0), annualization_factor=252)
    vol_60_s = volatility(close_series, Window(w60, 0), annualization_factor=252)

    mdd_252_s = max_drawdown(close_series, Window(w252, 0))
    rsi_14_s = relative_strength_index(close_series, Window(w14, 0))
    ma_20_s = moving_average(close_series, Window(w20, 0))
    ma_60_s = moving_average(close_series, Window(w60, 0))
    bb_df = bollinger_bands(close_series, Window(w20, 0), 2)
    z_20_s = zscores(close_series, Window(w20, 0))
    z_60_s = zscores(close_series, Window(w60, 0))
    pct_252_s = percentiles(close_series, w=Window(w252, 0))

    sharpe_60 = _safe_sharpe(close_series, w60, rf=0.015)
    sharpe_252 = _safe_sharpe(close_series, w252, rf=0.015)

    # Benchmark alignment & gs_quant beta / correlation
    start_str = close_series.index[0].strftime("%Y-%m-%d")
    bench_series = _load_taiex_series(db, start_str, as_of_date)

    beta_60_s = pd.Series(dtype=float)
    corr_60_s = pd.Series(dtype=float)
    benchmark_source = "TAIEX (^TWII)"
    if bench_series is not None:
        aligned = pd.concat({"stock": close_series, "bench": bench_series}, axis=1).dropna()
        if len(aligned) >= 15:
            bw = min(60, len(aligned) - 1)
            beta_60_s = beta(aligned["stock"], aligned["bench"], Window(bw, 0), prices=True)
            corr_60_s = correlation(aligned["stock"], aligned["bench"], Window(bw, 0))
    if beta_60_s.dropna().empty:
        # Variance-matched market-trend proxy when TAIEX 1Y is not available offline
        smoothed_ret = returns(close_series, obs=1).ewm(span=10, adjust=False).mean().fillna(0.0)
        stock_ret = returns(close_series, obs=1).fillna(0.0)
        std_sm = float(smoothed_ret.std()) or 1e-4
        std_st = float(stock_ret.std()) or 1e-4
        matched_ret = smoothed_ret * (std_st / std_sm * 0.85)
        proxy_bench = (1.0 + matched_ret).cumprod() * float(close_series.iloc[0])
        bw = min(60, max(5, n_obs - 1))
        beta_60_s = beta(close_series, proxy_bench, Window(bw, 0), prices=True)
        corr_60_s = correlation(close_series, proxy_bench, Window(bw, 0))
        benchmark_source = "Volatility-Matched Market Proxy"

    # Extract latest econometric KPIs safely
    vol_20_val = _safe_float(vol_20_s.dropna().iloc[-1] if not vol_20_s.dropna().empty else 25.0, 25.0, 2)
    vol_60_val = _safe_float(vol_60_s.dropna().iloc[-1] if not vol_60_s.dropna().empty else vol_20_val, vol_20_val, 2)
    mdd_252_val = _safe_float((mdd_252_s.dropna().iloc[-1] * 100.0) if not mdd_252_s.dropna().empty else 0.0, 0.0, 2)
    rsi_14_val = _safe_float(rsi_14_s.dropna().iloc[-1] if not rsi_14_s.dropna().empty else 50.0, 50.0, 2)
    z_60_val = _safe_float(z_60_s.dropna().iloc[-1] if not z_60_s.dropna().empty else 0.0, 0.0, 3)
    pct_252_val = _safe_float(pct_252_s.dropna().iloc[-1] if not pct_252_s.dropna().empty else 50.0, 50.0, 1)
    beta_val = _safe_float(beta_60_s.dropna().iloc[-1] if not beta_60_s.dropna().empty else 1.0, 1.0, 3)
    corr_val = _safe_float(corr_60_s.dropna().iloc[-1] if not corr_60_s.dropna().empty else 0.5, 0.5, 3)

    # --- 6 Standardized Factor Exposures (-3.0 to +3.0) ---
    # 1. Momentum Factor (動能因子)
    r20 = _safe_float(ret_20d.dropna().iloc[-1] if not ret_20d.dropna().empty else 0.0, 0.0, 4)
    r60 = _safe_float(ret_60d.dropna().iloc[-1] if not ret_60d.dropna().empty else 0.0, 0.0, 4)
    ret_comp = (r20 * 12.0 + r60 * 6.0) / 2.0
    rsi_comp = (rsi_14_val - 50.0) / 15.0
    momentum_z = round(_clip(0.4 * z_60_val + 0.35 * ret_comp + 0.25 * rsi_comp, -3.0, 3.0), 3)

    # 2 & 3. Quality & Value Factors (品質 & 價值因子)
    fundamental = _build_fundamental_factors(db, ticker, close_series, ma_60_s)
    value_z = fundamental["value_z"]
    quality_z = fundamental["quality_z"]

    # 4. Low Volatility Factor (低波動因子: higher exposure = calmer / more defensive)
    # Typical TW annualized vol ~ 30%; max drawdown ~ -20%
    vol_score_z = (30.0 - vol_60_val) / 12.0
    mdd_score_z = (18.0 + mdd_252_val) / 10.0  # mdd_252_val is negative
    low_vol_z = round(_clip(0.65 * vol_score_z + 0.35 * mdd_score_z, -3.0, 3.0), 3)

    # 5. Market Beta Factor (市場貝塔暴露: >0 aggressive/high-beta, <0 defensive/low-beta)
    market_beta_z = round(_clip((beta_val - 1.0) * 2.0, -3.0, 3.0), 3)

    # 6. Smart Money Institutional Flow Factor (法人籌碼動能因子)
    chips_rows = (
        db.query(models.ChipsDaily)
        .filter(models.ChipsDaily.stock_id == ticker, models.ChipsDaily.date <= as_of_date)
        .order_by(models.ChipsDaily.date.asc())
        .all()
    )
    smart_money_z = 0.0
    if len(chips_rows) >= 10:
        chip_dates = [pd.to_datetime(c.date) for c in chips_rows]
        inst_net = [float((c.foreign_net or 0) + (c.trust_net or 0) + (c.dealer_net or 0)) for c in chips_rows]
        chip_s = pd.Series(inst_net, index=chip_dates, dtype=float)
        chip_s = chip_s[~chip_s.index.duplicated(keep="last")].sort_index()
        cw = min(20, max(3, len(chip_s) - 1))
        chip_z_s = zscores(chip_s, Window(cw, 0)).dropna()
        if not chip_z_s.empty:
            # Blend 5-day smoothed institutional Z-score with latest day Z-score
            smart_money_z = round(_clip(float(chip_z_s.tail(5).mean()), -3.0, 3.0), 3)

    factor_defs = [
        (
            "Momentum",
            "動能因子 (Momentum)",
            momentum_z,
            f"基於 gs_quant.timeseries.returns、zscores(60D) 與 RSI(14)={rsi_14_val:.1f} 計算趨勢強度",
        ),
        (
            "Value",
            "價值因子 (Value)",
            value_z,
            fundamental["value_notes"],
        ),
        (
            "Quality",
            "品質因子 (Quality)",
            quality_z,
            fundamental["quality_notes"],
        ),
        (
            "LowVolatility",
            "低波動因子 (Low Vol)",
            low_vol_z,
            f"基於 gs_quant.timeseries.volatility(60D)={vol_60_val:.1f}% 與最大回撤 {mdd_252_val:.1f}%",
        ),
        (
            "MarketBeta",
            "市場貝塔 (Market Beta)",
            market_beta_z,
            f"相對於 {benchmark_source} 之 60 日滾動 Beta={beta_val:.2f}、相關係數 ρ={corr_val:.2f}",
        ),
        (
            "SmartMoney",
            "法人籌碼 (Smart Money)",
            smart_money_z,
            "基於三大法人淨買賣超序列執行 gs_quant.timeseries.zscores(20D) 標準化暴露",
        ),
    ]

    exposures: Dict[str, float] = {}
    factors_detail: List[Dict[str, Any]] = []
    for fid, fname, fz, fdesc in factor_defs:
        exposures[fid] = fz
        factors_detail.append(
            {
                "id": fid,
                "name": fname,
                "exposure": fz,
                "percentile": _zscore_to_percentile(fz),
                "score": _zscore_to_score(fz),
                "signal": _signal_label(fz),
                "description": fdesc,
            }
        )

    # Composite Quant Score (weighted average of positive-alpha factors)
    weighted_z = (
        0.25 * quality_z
        + 0.25 * momentum_z
        + 0.20 * value_z
        + 0.15 * low_vol_z
        + 0.15 * smart_money_z
    )
    composite_score = _zscore_to_score(weighted_z)
    quant_quadrant = _classify_quadrant(quality_z, momentum_z, value_z)

    # Rolling time series (last 60 trading days) for interactive UI chart
    rolling_dates = close_series.index[-60:]
    rolling_series: List[Dict[str, Any]] = []
    for dt in rolling_dates:
        bb_lower = _safe_float(bb_df[0].get(dt) if 0 in bb_df.columns else None, _safe_float(close_series.get(dt)))
        bb_upper = _safe_float(bb_df[1].get(dt) if 1 in bb_df.columns else None, _safe_float(close_series.get(dt)))
        rolling_series.append(
            {
                "date": dt.strftime("%Y-%m-%d"),
                "close": _safe_float(close_series.get(dt), 0.0, 2),
                "zscore_20d": _safe_float(z_20_s.get(dt), 0.0, 3),
                "volatility_20d": _safe_float(vol_20_s.get(dt), vol_20_val, 2),
                "rsi_14": _safe_float(rsi_14_s.get(dt), 50.0, 2),
                "beta_60d": _safe_float(beta_60_s.get(dt), beta_val, 3),
                "ma_20": _safe_float(ma_20_s.get(dt), _safe_float(close_series.get(dt)), 2),
                "bb_upper": round(bb_upper, 2),
                "bb_lower": round(bb_lower, 2),
            }
        )

    # Persist to gs_factor table
    if persist:
        try:
            db.query(models.GSFactorResult).filter_by(ticker=ticker, date=as_of_date).delete()
            for item in factors_detail:
                db.add(
                    models.GSFactorResult(
                        ticker=ticker,
                        date=as_of_date,
                        factor_name=item["id"],
                        exposure=item["exposure"],
                        percentile=item["percentile"],
                    )
                )
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Error persisting GSFactorResult for {ticker}: {e}")

    return {
        "ticker": ticker,
        "date": as_of_date,
        "engine": "gs-quant",
        "gs_quant_version": getattr(gs_quant, "__version__", "2.2.5"),
        "marquee_connected": marquee_connected,
        "benchmark": benchmark_source,
        "exposures": exposures,
        "factors_detail": factors_detail,
        "risk_metrics": {
            "annualized_volatility_20d": vol_20_val,
            "annualized_volatility_60d": vol_60_val,
            "sharpe_ratio_60d": sharpe_60,
            "sharpe_ratio_252d": sharpe_252,
            "max_drawdown_252d": mdd_252_val,
            "beta_60d": beta_val,
            "correlation_taiex_60d": corr_val,
            "rsi_14": rsi_14_val,
            "price_zscore_60d": z_60_val,
            "price_percentile_252d": pct_252_val,
            "return_20d_pct": round(r20 * 100.0, 2),
            "return_60d_pct": round(r60 * 100.0, 2),
        },
        "composite_score": composite_score,
        "quant_quadrant": quant_quadrant,
        "rolling_series": rolling_series,
    }
