"""
Batch pre-computation script for Goldman Sachs gs-quant factor exposures and backtests.
Usage:
    python -m backend.scripts.compute_factors --tickers 2330
    python -m backend.scripts.compute_factors
"""

import argparse
from typing import List

from .. import database, models
from ..services.gs_quant.backtest import run_backtest
from ..services.gs_quant.factor import get_factor_exposures


def main() -> None:
    parser = argparse.ArgumentParser(description="Pre-compute gs-quant factor exposures & backtest metrics.")
    parser.add_argument(
        "--tickers",
        type=str,
        default="",
        help="Comma-separated ticker list (e.g. 2330,2317). Defaults to all tickers in stock_prices_daily.",
    )
    parser.add_argument(
        "--strategies",
        type=str,
        default="multi_factor,ma_cross,rsi_mean_reversion,macd_momentum",
        help="Comma-separated backtest strategy IDs.",
    )
    args = parser.parse_args()

    models.Base.metadata.create_all(bind=database.engine)
    db = database.SessionLocal()
    try:
        if args.tickers.strip():
            tickers: List[str] = [t.strip() for t in args.tickers.split(",") if t.strip()]
        else:
            rows = db.query(models.StockPriceDaily.stock_id).distinct().all()
            tickers = [r[0] for r in rows] or ["2330"]

        strategies = [s.strip() for s in args.strategies.split(",") if s.strip()]

        for ticker in tickers:
            print(f"[gs-quant] Computing factors for {ticker}...")
            try:
                factor_res = get_factor_exposures(db, ticker=ticker, persist=True)
                print(
                    f"  -> date={factor_res['date']} composite_score={factor_res['composite_score']} "
                    f"quadrant={factor_res['quant_quadrant']} exposures={factor_res['exposures']}"
                )
            except Exception as exc:
                print(f"  -> factor failed for {ticker}: {exc}")

            for strat in strategies:
                print(f"[gs-quant] Running backtest {strat} for {ticker}...")
                try:
                    bt_res = run_backtest(db, ticker=ticker, strategy=strat, persist=True)
                    m = bt_res["metrics"]
                    print(
                        f"  -> {strat}: cum_ret={m['cumulative_return']}%, sharpe={m['sharpe_ratio']}, "
                        f"mdd={m['max_drawdown']}%, trades={m['total_trades']}"
                    )
                except Exception as exc:
                    print(f"  -> backtest {strat} failed for {ticker}: {exc}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
