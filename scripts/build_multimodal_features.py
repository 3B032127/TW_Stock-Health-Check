#!/usr/bin/env python3
"""
台股全市場多模態特徵寬表離線建置腳本 (Point-in-Time 對齊)

用法：
  ./venv/bin/python scripts/build_multimodal_features.py --days 300
  ./venv/bin/python scripts/build_multimodal_features.py --days 60 --symbols 2330,2890
"""

import argparse
import os
import sys
from typing import List, Optional

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend import database, models  # noqa: E402
from backend.services.multimodal_features import (  # noqa: E402
    build_and_save_multimodal_features,
    load_latest_feature_map,
)


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description="組裝並寫入多模態特徵寬表 (stock_multimodal_features)")
    ap.add_argument("--days", type=int, default=300, help="建置近 N 個交易日特徵 (預設 300 日)")
    ap.add_argument("--symbols", type=str, default=None, help="逗號分隔個股代號，預設為全市場")
    return ap.parse_args()


def main() -> int:
    args = parse_args()
    symbols: Optional[List[str]] = None
    if args.symbols:
        symbols = [s.strip() for s in args.symbols.split(",") if s.strip()]

    models.Base.metadata.create_all(bind=database.engine)
    db = database.SessionLocal()
    try:
        stats = build_and_save_multimodal_features(db, days=args.days, symbols=symbols)
        print(
            f"多模態特徵寬表建置完成：涵蓋 {stats['symbols']} 檔個股、近 {stats['days']} 交易日、"
            f"共寫入 {stats['rows_written']} 筆 (耗時 {stats['elapsed_seconds']}s)"
        )
        preview = symbols or ["2330", "2890", "2603"]
        fmap = load_latest_feature_map(db, symbols=preview)
        print("\n[代表個股最新特徵摘要]")
        for sym in preview:
            f = fmap.get(sym)
            if f:
                print(
                    f"  {sym} ({f['date']}) | 外資5D={f['foreign_net_vol_ratio_5d']:+.3f} "
                    f"投信5D={f['trust_net_vol_ratio_5d']:+.3f} 法人連買={f['inst_streak_days']}日 | "
                    f"營收YoY={f['rev_yoy']:+.1f}% 健檢={f['health_score']}分 PE分位={f['pe_percentile_3y']}% | "
                    f"大盤5D={f['taiex_ret_5d']:+.2f}% ATR14={f['atr_14_pct']:.2f}% 年化波動={f['ann_vol_20d']:.1f}%"
                )
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
