#!/usr/bin/env python3
"""
台股全市場雙模型融合股價預測與歷史回測離線批次腳本 (Kronos + TimesFM 2.5 Ensemble)

使用範例：
  1. 初次建置歷史回填模式 (預設回溯 35 個交易日，嚴格無未來函數洩漏)：
     ./venv/bin/python scripts/run_tw_predictions.py --mode backfill --days 35

  2. 日常盤後排程模式 (回填實際價 -> 重算近 30 日 KPI -> 推論未來 5 日)：
     ./venv/bin/python scripts/run_tw_predictions.py --mode daily

  3. 指定個股快速驗證：
     ./venv/bin/python scripts/run_tw_predictions.py --mode backfill --days 35 --symbols 2330,2317,2454
"""

import argparse
import os
import sys
import time
from typing import List, Optional

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend import database, models  # noqa: E402
from backend.services.prediction_service import (  # noqa: E402
    detect_compute_device,
    get_stock_prediction,
    run_daily_predictions,
    run_historical_backfill,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="台股雙模型融合預測與歷史回測離線批次作業 (Kronos + TimesFM 2.5)"
    )
    parser.add_argument(
        "--mode",
        choices=["daily", "backfill"],
        required=True,
        help="執行模式：daily (日常盤後排程) 或 backfill (初次建置歷史回填)",
    )
    parser.add_argument(
        "--days",
        type=int,
        default=35,
        help="歷史回填模擬交易日天數 (僅 --mode backfill 適用，預設 35)",
    )
    parser.add_argument(
        "--symbols",
        type=str,
        default=None,
        help="選填：以逗號分隔指定股票代碼 (例如 2330,2317,2454)，未指定則跑全市場",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=32,
        help="批次大小 (預設 32)",
    )
    parser.add_argument(
        "--duckdb-path",
        type=str,
        default=None,
        help="選填：指定本地 DuckDB 資料庫路徑 (若未指定則讀取 DUCKDB_PATH 或本地 financial_data.db)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    symbols: Optional[List[str]] = None
    if args.symbols:
        symbols = [s.strip() for s in args.symbols.split(",") if s.strip()]

    # Ensure tables exist before execution
    models.Base.metadata.create_all(bind=database.engine)

    device = detect_compute_device()
    print("=" * 72)
    print("台股全市場雙模型融合股價預測引擎 (Kronos + TimesFM 2.5)")
    print(f" • 運算裝置 (Device): {device}")
    print(f" • 執行模式 (Mode)  : {args.mode}" + (f" (回溯 {args.days} 交易日)" if args.mode == "backfill" else ""))
    print(f" • 標的範圍 (Scope) : {', '.join(symbols) if symbols else '全市場所有具備 >= 60 日 K 線個股'}")
    print(f" • 批次大小 (Batch) : {args.batch_size}")
    print("=" * 72)

    t0 = time.perf_counter()
    db = database.SessionLocal()
    try:
        if args.mode == "backfill":
            stats = run_historical_backfill(
                db,
                days=args.days,
                symbols=symbols,
                batch_size=args.batch_size,
                duckdb_path=args.duckdb_path,
            )
        else:
            stats = run_daily_predictions(
                db,
                symbols=symbols,
                batch_size=args.batch_size,
                duckdb_path=args.duckdb_path,
            )

        elapsed = time.perf_counter() - t0
        print("\n[執行結果摘要]")
        for k, v in stats.items():
            print(f" • {k}: {v}")
        print(f" • elapsed_seconds: {elapsed:.2f}s")

        # Print sample verification for 2330 (or first requested symbol)
        preview_sym = symbols[0] if symbols else "2330"
        sample = get_stock_prediction(db, preview_sym)
        if sample:
            kpis = sample["kpis"]
            print(f"\n[範例驗證: {sample['symbol']} {sample['name']} | 基準日 {sample['last_updated']}]")
            print(
                f" • 近 {kpis['sample_count']} 日 KPI: 方向勝率={kpis['directional_accuracy']}%, "
                f"MAPE={kpis['mape']}%, 80%覆蓋率={kpis['interval_coverage']}%"
            )
            print(f" • 動態權重: {kpis['model_weights']}")
            if sample["future_forecast"]:
                t5 = sample["future_forecast"][-1]
                print(
                    f" • T+{t5['horizon']} ({t5['target_date']}) 預測: "
                    f"P10={t5['pred_p10']}, P50={t5['pred_p50']}, P90={t5['pred_p90']} "
                    f"({t5['expected_return_pct']:+.2f}%)"
                )
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
