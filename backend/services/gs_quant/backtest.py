import math
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import gs_quant
import numpy as np
import pandas as pd
from gs_quant.timeseries import (
    Window,
    bollinger_bands,
    macd,
    max_drawdown,
    moving_average,
    prices as ts_prices,
    relative_strength_index,
    returns,
    volatility,
    zscores,
)
from sqlalchemy.orm import Session

from ... import models
from .factor import _clip, _safe_float


STRATEGY_METADATA = {
    "multi_factor": {
        "name": "GS 多因子量化權重策略",
        "description": "結合 gs-quant MA20 趨勢、RSI(14) 動能、20D 波動率風控及三大法人籌碼濾網動態調倉（含 0.5x 半倉與 1.0x 滿倉分級）。",
    },
    "ma_cross": {
        "name": "GS 雙均線趨勢策略 (MA5 / MA20)",
        "description": "採用 gs_quant.timeseries.moving_average 計算短中期均線，黃金交叉全倉做多、死亡交叉退回現金避險。",
    },
    "rsi_mean_reversion": {
        "name": "GS RSI 與布林均值回歸策略",
        "description": "採用 gs_quant.timeseries.relative_strength_index 與 bollinger_bands，於超賣或觸及下軌時買進、超買或觸及上軌時獲利了結。",
    },
    "macd_momentum": {
        "name": "GS MACD 動能突破策略",
        "description": "採用 gs_quant.timeseries.macd(12, 26, 9) 搭配 MA60 多頭濾網，捕捉中波段主升段動能。",
    },
}


def run_backtest(
    db: Session,
    ticker: str,
    strategy: str = "multi_factor",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    initial_capital: float = 1000000.0,
    persist: bool = True,
) -> Dict[str, Any]:
    """
    Run a vectorized historical strategy backtest powered by gs_quant.timeseries
    with realistic Taiwan equity transaction costs (0.1425% fee + 0.3% sell tax)
    and strict t-1 signal execution (zero look-ahead bias).
    """
    if strategy not in STRATEGY_METADATA:
        strategy = "multi_factor"

    all_prices = (
        db.query(models.StockPriceDaily)
        .filter(models.StockPriceDaily.stock_id == ticker)
        .order_by(models.StockPriceDaily.date.asc())
        .all()
    )
    if len(all_prices) < 10:
        raise ValueError(f"股票 {ticker} 歷史價格資料不足（僅 {len(all_prices)} 筆），無法執行量化回測。")

    dates = [r.date for r in all_prices if r.close is not None and float(r.close) > 0]
    closes = [float(r.close) for r in all_prices if r.close is not None and float(r.close) > 0]
    full_close = pd.Series(closes, index=pd.to_datetime(dates), dtype=float)
    full_close = full_close[~full_close.index.duplicated(keep="last")].sort_index()

    max_dt_str = full_close.index[-1].strftime("%Y-%m-%d")
    min_dt_str = full_close.index[0].strftime("%Y-%m-%d")

    effective_end = end_date if (end_date and end_date <= max_dt_str) else max_dt_str
    if start_date:
        effective_start = max(start_date, min_dt_str)
    else:
        default_start_dt = full_close.index[-1] - timedelta(days=365)
        effective_start = max(default_start_dt.strftime("%Y-%m-%d"), min_dt_str)

    # Keep all history up to effective_end so rolling windows (MA60, BB, RSI) are warmed up before effective_start
    work_close = full_close[full_close.index <= pd.to_datetime(effective_end)]
    if len(work_close) < 10:
        raise ValueError("選定期間內可用交易日資料過少，請調整回測區間。")

    n_work = len(work_close)
    w5 = min(5, max(2, n_work - 1))
    w14 = min(14, max(2, n_work - 1))
    w20 = min(20, max(2, n_work - 1))
    w60 = min(60, max(2, n_work - 1))

    # --- Compute indicators with gs_quant.timeseries ---
    daily_ret = returns(work_close, obs=1).fillna(0.0)
    ma5 = moving_average(work_close, Window(w5, 0))
    ma20 = moving_average(work_close, Window(w20, 0))
    ma60 = moving_average(work_close, Window(w60, 0))
    rsi14 = relative_strength_index(work_close, Window(w14, 0)).reindex(work_close.index).ffill().fillna(50.0)
    bb_df = bollinger_bands(work_close, Window(w20, 0), 2)
    bb_lower = bb_df[0].reindex(work_close.index).bfill()
    bb_upper = bb_df[1].reindex(work_close.index).bfill()
    z20 = zscores(work_close, Window(w20, 0)).fillna(0.0)
    vol20 = volatility(work_close, Window(w20, 0), annualization_factor=252).fillna(25.0)
    macd_dif = macd(work_close, 12, 26, 1)
    macd_dea = macd(work_close, 12, 26, 9)

    # Institutional flow series aligned to trading dates
    chips_rows = (
        db.query(models.ChipsDaily)
        .filter(models.ChipsDaily.stock_id == ticker, models.ChipsDaily.date <= effective_end)
        .order_by(models.ChipsDaily.date.asc())
        .all()
    )
    inst_ma5 = pd.Series(0.0, index=work_close.index)
    if chips_rows:
        c_dates = [pd.to_datetime(c.date) for c in chips_rows]
        c_vals = [float((c.foreign_net or 0) + (c.trust_net or 0) + (c.dealer_net or 0)) for c in chips_rows]
        c_series = pd.Series(c_vals, index=c_dates, dtype=float)
        c_series = c_series[~c_series.index.duplicated(keep="last")].sort_index()
        inst_ma5 = c_series.rolling(5, min_periods=1).mean().reindex(work_close.index).ffill().fillna(0.0)

    # --- Build Target Signal Position series & Reason notes ---
    target_pos = pd.Series(0.0, index=work_close.index)
    signal_reasons: Dict[pd.Timestamp, str] = {}

    if strategy == "ma_cross":
        cond_long = ma5 > ma20
        target_pos = cond_long.astype(float)
        for dt in work_close.index:
            signal_reasons[dt] = "MA5 上穿 MA20 黃金交叉多頭" if cond_long.loc[dt] else "MA5 跌破 MA20 死亡交叉空手"

    elif strategy == "rsi_mean_reversion":
        in_pos = 0.0
        for dt in work_close.index:
            px = float(work_close.loc[dt])
            r_val = float(rsi14.loc[dt])
            low_b = float(bb_lower.loc[dt]) if not pd.isna(bb_lower.loc[dt]) else px * 0.95
            up_b = float(bb_upper.loc[dt]) if not pd.isna(bb_upper.loc[dt]) else px * 1.05
            if in_pos == 0.0 and (r_val <= 38.0 or px <= low_b):
                in_pos = 1.0
                signal_reasons[dt] = f"RSI={r_val:.1f} / 觸及布林下軌買進"
            elif in_pos > 0.0 and (r_val >= 68.0 or px >= up_b):
                in_pos = 0.0
                signal_reasons[dt] = f"RSI={r_val:.1f} / 觸及布林上軌獲利了結"
            else:
                signal_reasons[dt] = "均值回歸持倉觀望" if in_pos > 0 else "等待超賣回歸訊號"
            target_pos.loc[dt] = in_pos

    elif strategy == "macd_momentum":
        cond_long = (macd_dif > macd_dea) & (work_close >= ma60.fillna(work_close))
        target_pos = cond_long.astype(float)
        for dt in work_close.index:
            signal_reasons[dt] = (
                "MACD 多頭金叉且站穩季線"
                if cond_long.loc[dt]
                else "MACD 轉弱或跌破季線退場"
            )

    else:
        # multi_factor (default)
        vol_cap = float(vol20.quantile(0.90)) if len(vol20) > 10 else 60.0
        has_chips_data = len(chips_rows) > 0
        for dt in work_close.index:
            px = float(work_close.loc[dt])
            m20 = float(ma20.loc[dt]) if not pd.isna(ma20.loc[dt]) else px
            r_val = float(rsi14.loc[dt])
            z_val = float(z20.loc[dt])
            v_val = float(vol20.loc[dt])
            chip_val = float(inst_ma5.loc[dt])

            score = 0
            if px >= m20:
                score += 1
            if r_val >= 45.0 and z_val >= -0.6:
                score += 1
            if v_val <= max(vol_cap, 35.0):
                score += 1
            if not has_chips_data or chip_val >= 0:
                score += 1

            if score >= 3:
                w = 1.0
                signal_reasons[dt] = f"多因子共振 ({score}/4 達標：趨勢+動能+風控)"
            elif score == 2:
                w = 0.5
                signal_reasons[dt] = f"因子中性 ({score}/4 達標：半倉防禦)"
            else:
                w = 0.0
                signal_reasons[dt] = f"風險警示 ({score}/4 達標：空手保留現金)"
            target_pos.loc[dt] = w

    # Strictly apply T-1 signal execution for T-day return to eliminate look-ahead bias
    exec_pos = target_pos.shift(1).fillna(0.0)

    # Filter down to requested backtest window [effective_start, effective_end]
    eval_mask = (work_close.index >= pd.to_datetime(effective_start)) & (
        work_close.index <= pd.to_datetime(effective_end)
    )
    eval_dates = work_close.index[eval_mask]
    if len(eval_dates) < 2:
        eval_dates = work_close.index[-min(len(work_close), 30) :]

    eval_close = work_close.loc[eval_dates]
    eval_ret = daily_ret.loc[eval_dates].copy()
    eval_ret.iloc[0] = 0.0
    eval_pos = exec_pos.loc[eval_dates]

    # Realistic Taiwan equity transaction fees: 0.1425% buy/sell commission + 0.3% sell tax
    pos_diff = eval_pos.diff().fillna(eval_pos.iloc[0])
    tx_cost = pd.Series(0.0, index=eval_dates)
    for dt in eval_dates:
        delta = float(pos_diff.loc[dt])
        if delta > 0:
            tx_cost.loc[dt] = delta * 0.001425
        elif delta < 0:
            tx_cost.loc[dt] = abs(delta) * (0.001425 + 0.003)

    strat_daily_ret = eval_pos * eval_ret - tx_cost
    bench_daily_ret = eval_ret.copy()

    # Use gs_quant.timeseries.prices to compound return stream to equity NAV curve
    strat_nav = ts_prices(strat_daily_ret, initial=initial_capital)
    bench_nav = ts_prices(bench_daily_ret, initial=initial_capital)
    # Normalize day 0 exactly to initial_capital
    strat_nav.iloc[0] = initial_capital
    bench_nav.iloc[0] = initial_capital

    # Running peak drawdown using gs_quant max_drawdown rolling window
    rolling_peak = strat_nav.cummax()
    underwater_dd = (strat_nav / rolling_peak - 1.0) * 100.0
    gs_mdd_series = max_drawdown(strat_nav, Window(len(strat_nav), 0))
    max_dd_pct = _safe_float(gs_mdd_series.dropna().iloc[-1] * 100.0 if not gs_mdd_series.dropna().empty else underwater_dd.min(), 0.0, 2)

    # Extract Trade Log on actual execution days (eval_pos changes)
    trade_log: List[Dict[str, Any]] = []
    open_entry_price: Optional[float] = None
    round_trip_returns: List[float] = []
    prev_pos = 0.0

    for idx_i, dt in enumerate(eval_dates):
        curr_pos = float(eval_pos.loc[dt])
        px = float(eval_close.loc[dt])
        if abs(curr_pos - prev_pos) > 1e-6:
            # Signal originated at T-1
            sig_dt = eval_dates[idx_i - 1] if idx_i > 0 else dt
            reason_str = signal_reasons.get(sig_dt, STRATEGY_METADATA[strategy]["name"])
            if curr_pos > prev_pos:
                action = "BUY" if prev_pos == 0.0 else "ADD"
                if open_entry_price is None:
                    open_entry_price = px
                trade_log.append(
                    {
                        "date": dt.strftime("%Y-%m-%d"),
                        "action": action,
                        "price": round(px, 2),
                        "weight": round(curr_pos * 100, 0),
                        "trade_return_pct": None,
                        "reason": reason_str,
                    }
                )
            else:
                action = "SELL" if curr_pos == 0.0 else "TRIM"
                tr_pct = None
                if open_entry_price and open_entry_price > 0:
                    raw_r = (px / open_entry_price - 1.0 - 0.00585) * 100.0
                    tr_pct = round(raw_r, 2)
                    round_trip_returns.append(raw_r)
                    if curr_pos == 0.0:
                        open_entry_price = None
                trade_log.append(
                    {
                        "date": dt.strftime("%Y-%m-%d"),
                        "action": action,
                        "price": round(px, 2),
                        "weight": round(curr_pos * 100, 0),
                        "trade_return_pct": tr_pct,
                        "reason": reason_str,
                    }
                )
        prev_pos = curr_pos

    # Close open mark-to-market return for win-rate calculation if position still held at end
    if open_entry_price and prev_pos > 0:
        mtm_r = (float(eval_close.iloc[-1]) / open_entry_price - 1.0) * 100.0
        round_trip_returns.append(mtm_r)

    # --- Performance KPIs ---
    cum_ret_pct = (float(strat_nav.iloc[-1]) / initial_capital - 1.0) * 100.0
    bench_ret_pct = (float(bench_nav.iloc[-1]) / initial_capital - 1.0) * 100.0
    excess_ret_pct = cum_ret_pct - bench_ret_pct

    trading_days = max(1, len(eval_dates) - 1)
    ann_ret_pct = ((1.0 + cum_ret_pct / 100.0) ** (252.0 / trading_days) - 1.0) * 100.0

    strat_vol_series = volatility(strat_nav, Window(len(strat_nav), 0), annualization_factor=252).dropna()
    ann_vol_pct = _safe_float(strat_vol_series.iloc[-1] if not strat_vol_series.empty else 0.0, 0.0, 2)

    rf_pct = 1.5
    sharpe = ((ann_ret_pct - rf_pct) / ann_vol_pct) if ann_vol_pct > 1e-4 else 0.0

    downside = strat_daily_ret[strat_daily_ret < 0]
    downside_vol_pct = float(downside.std(ddof=1) * math.sqrt(252.0) * 100.0) if len(downside) > 1 else 0.0
    sortino = ((ann_ret_pct - rf_pct) / downside_vol_pct) if downside_vol_pct > 1e-4 else sharpe

    calmar = (ann_ret_pct / abs(max_dd_pct)) if abs(max_dd_pct) > 1e-4 else 0.0

    if round_trip_returns:
        wins = [r for r in round_trip_returns if r > 0]
        losses = [abs(r) for r in round_trip_returns if r < 0]
        win_rate = (len(wins) / len(round_trip_returns)) * 100.0
        profit_factor = (sum(wins) / sum(losses)) if sum(losses) > 1e-6 else (3.0 if wins else 0.0)
    else:
        pos_days = strat_daily_ret[eval_pos > 0]
        win_rate = float((pos_days > 0).mean() * 100.0) if len(pos_days) > 0 else 0.0
        profit_factor = 1.0

    metrics = {
        "cumulative_return": round(cum_ret_pct, 2),
        "benchmark_return": round(bench_ret_pct, 2),
        "excess_return": round(excess_ret_pct, 2),
        "annualized_return": round(ann_ret_pct, 2),
        "annualized_volatility": round(ann_vol_pct, 2),
        "sharpe_ratio": round(_clip(sharpe, -10.0, 10.0), 2),
        "sortino_ratio": round(_clip(sortino, -10.0, 10.0), 2),
        "max_drawdown": round(max_dd_pct, 2),
        "calmar_ratio": round(_clip(calmar, -10.0, 10.0), 2),
        "win_rate": round(win_rate, 1),
        "profit_factor": round(_clip(profit_factor, 0.0, 20.0), 2),
        "total_trades": len(trade_log),
        "final_equity": round(float(strat_nav.iloc[-1]), 0),
        "initial_capital": round(initial_capital, 0),
    }

    equity_curve: List[Dict[str, Any]] = []
    for dt in eval_dates:
        s_nav = float(strat_nav.loc[dt])
        b_nav = float(bench_nav.loc[dt])
        equity_curve.append(
            {
                "date": dt.strftime("%Y-%m-%d"),
                "strategy_nav": round(s_nav, 0),
                "benchmark_nav": round(b_nav, 0),
                "strategy_return_pct": round((s_nav / initial_capital - 1.0) * 100.0, 2),
                "benchmark_return_pct": round((b_nav / initial_capital - 1.0) * 100.0, 2),
                "drawdown_pct": _safe_float(underwater_dd.loc[dt], 0.0, 2),
                "position": round(float(eval_pos.loc[dt]) * 100.0, 0),
            }
        )

    actual_start = eval_dates[0].strftime("%Y-%m-%d")
    actual_end = eval_dates[-1].strftime("%Y-%m-%d")

    # Persist KPI summary into gs_backtest table
    if persist:
        try:
            db.query(models.GSBacktestResult).filter_by(
                portfolio_id=ticker,
                strategy=strategy,
                start_date=actual_start,
                end_date=actual_end,
            ).delete()
            metric_mapping = {
                "CumulativeReturn": metrics["cumulative_return"],
                "BenchmarkReturn": metrics["benchmark_return"],
                "Alpha": metrics["excess_return"],
                "AnnualizedReturn": metrics["annualized_return"],
                "AnnualizedVolatility": metrics["annualized_volatility"],
                "Sharpe": metrics["sharpe_ratio"],
                "Sortino": metrics["sortino_ratio"],
                "MaxDrawdown": metrics["max_drawdown"],
                "Calmar": metrics["calmar_ratio"],
                "WinRate": metrics["win_rate"],
                "ProfitFactor": metrics["profit_factor"],
                "TotalTrades": float(metrics["total_trades"]),
                "FinalEquity": metrics["final_equity"],
            }
            for m_key, m_val in metric_mapping.items():
                db.add(
                    models.GSBacktestResult(
                        portfolio_id=ticker,
                        strategy=strategy,
                        start_date=actual_start,
                        end_date=actual_end,
                        metric=m_key,
                        value=float(m_val),
                    )
                )
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Error persisting GSBacktestResult for {ticker}: {e}")

    return {
        "ticker": ticker,
        "strategy": strategy,
        "strategy_name": STRATEGY_METADATA[strategy]["name"],
        "strategy_description": STRATEGY_METADATA[strategy]["description"],
        "available_strategies": [
            {"id": k, "name": v["name"], "description": v["description"]}
            for k, v in STRATEGY_METADATA.items()
        ],
        "start_date": actual_start,
        "end_date": actual_end,
        "trading_days": len(eval_dates),
        "engine": "gs-quant",
        "gs_quant_version": getattr(gs_quant, "__version__", "2.2.5"),
        "metrics": metrics,
        "equity_curve": equity_curve,
        "trade_log": list(reversed(trade_log))[:50],  # Most recent 50 trades first
    }
