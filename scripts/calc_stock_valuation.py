#!/usr/bin/env python3
"""
台股自適應估值河流圖離線計算腳本 (PE Band / PB Band / 穩定高股息混合法)

用法：
  ./venv/bin/python scripts/calc_stock_valuation.py
  ./venv/bin/python scripts/calc_stock_valuation.py --symbols 2330,2890,2603,2409,3008
  ./venv/bin/python scripts/calc_stock_valuation.py --as-of 2026-11-19
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
from backend.services.valuation_service import compute_and_save_valuations  # noqa: E402


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description="計算並更新台股全市場自適應估值表 (stock_valuations)")
    ap.add_argument("--symbols", type=str, default=None, help="逗號分隔個股代號，預設為全市場")
    ap.add_argument("--as-of", type=str, default=None, help="指定截止基準日 (YYYY-MM-DD)")
    return ap.parse_args()


def main() -> int:
    args = parse_args()
    symbols: Optional[List[str]] = None
    if args.symbols:
        symbols = [s.strip() for s in args.symbols.split(",") if s.strip()]

    models.Base.metadata.create_all(bind=database.engine)
    db = database.SessionLocal()
    try:
        t0 = time.perf_counter()
        stats = compute_and_save_valuations(db, symbols=symbols, as_of_date=args.as_of)
        elapsed = time.perf_counter() - t0
        print(f"估值計算完成：處理 {stats['processed']} 檔、寫入 {stats['written']} 檔 (耗時 {elapsed:.2f}s)")
        print(f"估值模式分布：{stats['methods']}")

        sample_syms = symbols or ["2330", "2890", "2603", "2409", "3008"]
        print("\n[代表個股估值檢核]")
        for sym in sample_syms:
            row = db.query(models.StockValuation).filter_by(symbol=sym).first()
            if row:
                print(
                    f"  {sym} ({row.as_of_date}) | {row.method} | 現價={row.current_close} | "
                    f"便宜={row.cheap_price} 合理={row.fair_price} 昂貴={row.expensive_price} | "
                    f"位階={row.zone_label} ({row.distance_to_fair_pct:+.2f}%)"
                )
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
