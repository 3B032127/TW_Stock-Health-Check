#!/usr/bin/env python3
"""
台股全市場三引擎多模態股價預測與歷史回測離線批次腳本 (Kronos + TimesFM 2.5 + LightGBM)

使用範例：
  1. 初次建置歷史回填模式 (預設回溯 35 個交易日，嚴格無未來函數洩漏)：
     ./venv/bin/python scripts/run_tw_predictions.py --mode backfill --days 35

  2. 日常盤後排程模式 (回填實際價 -> 重算近 30 日 KPI -> 更新估值/特徵 -> 三引擎推論未來 5 日)：
     ./venv/bin/python scripts/run_tw_predictions.py --mode daily

  3. 週度 LightGBM 財報籌碼殘差修正器滾動再訓練：
     ./venv/bin/python scripts/run_tw_predictions.py --mode train-lgbm

  4. 指定個股快速驗證：
     ./venv/bin/python scripts/run_tw_predictions.py --mode backfill --days 35 --symbols 2330,2890,2603,2409,3008
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
from backend.services.lgbm_corrector import DEFAULT_MODEL_PATH, train_alpha_corrector  # noqa: E402
from backend.services.prediction_service import (  # noqa: E402
    detect_compute_device,
    ensure_prediction_schema,
    get_stock_prediction,
    run_daily_predictions,
    run_historical_backfill,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="台股三引擎多模態股價預測與歷史回測離線批次作業 (Kronos + TimesFM 2.5 + LightGBM)"
    )
    parser.add_argument(
        "--mode",
        choices=["daily", "backfill", "train-lgbm"],
        required=True,
        help="執行模式：daily (日常盤後排程)、backfill (歷史 35 日無洩漏回填) 或 train-lgbm (重訓殘差模型)",
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
        help="選填：以逗號分隔指定股票代碼 (例如 2330,2890,2603)，未指定則跑全市場",
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
    parser.add_argument(
        "--retrain-lgbm",
        action="store_true",
        help="於 daily 模式下強制重新訓練 LightGBM 殘差修正模型",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    symbols: Optional[List[str]] = None
    if args.symbols:
        symbols = [s.strip() for s in args.symbols.split(",") if s.strip()]

    models.Base.metadata.create_all(bind=database.engine)
    ensure_prediction_schema(database.engine)

    device = detect_compute_device()
    print("=" * 76)
    print("台股全市場三引擎多模態股價預測 (Kronos × TimesFM 2.5 + LightGBM)")
    print(f" • 運算裝置 (Device): {device}")
    print(f" • 執行模式 (Mode)  : {args.mode}" + (f" (回溯 {args.days} 交易日)" if args.mode == "backfill" else ""))
    print(f" • 標的範圍 (Scope) : {', '.join(symbols) if symbols else '全市場所有具備 >= 60 日 K 線個股'}")
    print(f" • 批次大小 (Batch) : {args.batch_size}")
    print("=" * 76)

    t0 = time.perf_counter()
    db = database.SessionLocal()
    try:
        if args.mode == "train-lgbm":
            bundle = train_alpha_corrector(
                db, lookback_days=260, model_path=DEFAULT_MODEL_PATH, save_to_disk=True
            )
            elapsed = time.perf_counter() - t0
            if bundle is None:
                print("❌ 無法訓練 LightGBM 修正模型：請先執行 scripts/build_multimodal_features.py")
                return 2
            print("\n[LightGBM 殘差修正器訓練摘要]")
            print(f" • backend: {bundle.backend}")
            print(f" • train_samples: {bundle.train_samples}")
            print(f" • cutoff_date: {bundle.cutoff_date}")
            print(f" • val_metrics: {bundle.val_metrics}")
            print(f" • model_path: {DEFAULT_MODEL_PATH}")
            print(f" • elapsed_seconds: {elapsed:.2f}s")
            return 0

        if args.mode == "backfill":
            stats = run_historical_backfill(
                db,
                days=args.days,
                symbols=symbols,
                batch_size=args.batch_size,
                duckdb_path=args.duckdb_path,
                retrain_lgbm=(symbols is None or args.retrain_lgbm),
            )
        else:
            stats = run_daily_predictions(
                db,
                symbols=symbols,
                batch_size=args.batch_size,
                duckdb_path=args.duckdb_path,
                retrain_lgbm=args.retrain_lgbm,
            )

        elapsed = time.perf_counter() - t0
        print("\n[執行結果摘要]")
        for k, v in stats.items():
            print(f" • {k}: {v}")
        print(f" • elapsed_seconds: {elapsed:.2f}s")

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
            if sample.get("valuation"):
                v = sample["valuation"]
                print(
                    f" • 自適應估值 ({v['method']}): 便宜={v['cheap_price']}, 合理={v['fair_price']}, "
                    f"昂貴={v['expensive_price']} -> {v['zone_label']} ({v['distance_to_fair_pct']:+.2f}%)"
                )
            if sample.get("driver_factors"):
                print(" • AI 歸因標籤:", " | ".join(d["label"] for d in sample["driver_factors"]))
            if sample.get("risk_alert", {}).get("is_high_volatility"):
                print(" • 波動風險提示:", sample["risk_alert"]["message"])
            if sample["future_forecast"]:
                t5 = sample["future_forecast"][-1]
                print(
                    f" • T+{t5['horizon']} ({t5['target_date']}) 預測: "
                    f"P10={t5['pred_p10']}, P50={t5['pred_p50']}, P90={t5['pred_p90']} "
                    f"({t5['expected_return_pct']:+.2f}%)"
                )
            if sample.get("modes"):
                print(" • 五模式 T+5 摘要:")
                for m_key, m_obj in sample["modes"].items():
                    m_t5 = m_obj["future_forecast"][-1] if m_obj.get("future_forecast") else None
                    m_kpi = m_obj.get("kpis", {})
                    if m_t5:
                        print(
                            f"   - {m_key:15s}: P50={m_t5['pred_p50']} ({m_t5['expected_return_pct']:+.2f}%) | "
                            f"勝率={m_kpi.get('directional_accuracy')}% MAPE={m_kpi.get('mape')}%"
                        )
            c_t5 = sample.get("consensus", {}).get("t5", {})
            if c_t5.get("label"):
                print(f" • 共識度徽章 (T+5): {c_t5['label']}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
