#!/usr/bin/env python3
"""
台股日 K 線增量更新腳本（排程順序第 1 步，建議每日 14:35 執行）

- 以 yfinance 批次抓取 stocks 表內所有上市櫃個股最近 N 日 OHLCV，upsert 進 stock_prices_daily。
- 完成後驗證資料庫最新日期是否已更新至「最新交易日」；未達標以 exit code 2 結束，
  讓 run_daily_pipeline.sh 不會在資料未就緒時就觸發預測。

用法：
  ./venv/bin/python scripts/update_tw_daily_prices.py [--days 10] [--symbols 2330,2317] [--expect-date 2026-11-19]
"""
import argparse
import os
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import pandas as pd  # noqa: E402
import logging
import yfinance as yf  # noqa: E402
logging.getLogger("yfinance").setLevel(logging.CRITICAL)
from sqlalchemy import func  # noqa: E402
from sqlalchemy.dialects.sqlite import insert as sqlite_insert  # noqa: E402

from backend import database, models  # noqa: E402
from backend.services.prediction_service import get_next_trading_days  # noqa: E402


def expected_latest_trading_day() -> str:
    """依台北時間與 XTAI 日曆推算「應已收盤」的最新交易日（14:30 後視為當日已收盤）。"""
    now = datetime.now(ZoneInfo("Asia/Taipei"))
    ref = now.date()
    # 往前找最近一個交易日 (含今日，若今日為交易日且已過 14:30)
    cand = get_next_trading_days((ref - pd.Timedelta(days=10)).isoformat(), 12)
    closed = [d for d in cand if d < ref.isoformat() or (d == ref.isoformat() and (now.hour, now.minute) >= (14, 30))]
    return closed[-1]


def fetch_chunk(tickers, days):
    df = yf.download(
        tickers, period=f"{days}d", interval="1d", group_by="ticker",
        threads=True, progress=False, auto_adjust=False,
    )
    return df


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=10)
    ap.add_argument("--symbols", type=str, default=None)
    ap.add_argument("--expect-date", type=str, default=None)
    ap.add_argument("--chunk", type=int, default=100)
    args = ap.parse_args()

    models.Base.metadata.create_all(bind=database.engine)
    db = database.SessionLocal()
    try:
        q = db.query(models.Stock.stock_id, models.Stock.market_type)
        if args.symbols:
            wanted = [s.strip() for s in args.symbols.split(",") if s.strip()]
            q = q.filter(models.Stock.stock_id.in_(wanted))
        stocks = q.all()
        ticker_map = {}
        for sid, mt in stocks:
            suffix = "TWO" if (mt or "").lower() in ("tpex", "otc") else "TW"
            ticker_map[f"{sid}.{suffix}"] = sid

        tickers = list(ticker_map)
        print(f"更新 {len(tickers)} 檔個股，回抓最近 {args.days} 日 K 線 ...")
        written = 0
        for i in range(0, len(tickers), args.chunk):
            chunk = tickers[i : i + args.chunk]
            try:
                df = fetch_chunk(chunk, args.days)
            except Exception as e:
                print(f"  chunk {i} 失敗: {e}")
                continue
            if df is None or df.empty:
                continue
            rows = []
            for tk in chunk:
                try:
                    sub = df[tk] if len(chunk) > 1 else df
                    sub = sub.dropna(subset=["Close"])
                except Exception:
                    continue
                for idx, r in sub.iterrows():
                    rows.append({
                        "stock_id": ticker_map[tk],
                        "date": idx.strftime("%Y-%m-%d"),
                        "open": float(r["Open"]) if pd.notna(r["Open"]) else None,
                        "high": float(r["High"]) if pd.notna(r["High"]) else None,
                        "low": float(r["Low"]) if pd.notna(r["Low"]) else None,
                        "close": float(r["Close"]),
                        "volume": int(r["Volume"]) if pd.notna(r["Volume"]) else 0,
                    })
            for j in range(0, len(rows), 100):
                part = rows[j : j + 100]
                stmt = sqlite_insert(models.StockPriceDaily).values(part)
                stmt = stmt.on_conflict_do_update(
                    index_elements=["stock_id", "date"],
                    set_={c: getattr(stmt.excluded, c) for c in ("open", "high", "low", "close", "volume")},
                )
                db.execute(stmt)
            db.commit()
            written += len(rows)
            print(f"  已處理 {min(i + args.chunk, len(tickers))}/{len(tickers)}，累計 upsert {written} 筆")

        expect = args.expect_date or expected_latest_trading_day()
        total_stocks = db.query(func.count(models.Stock.stock_id)).scalar() or 1
        n_expect = (
            db.query(func.count(models.StockPriceDaily.id))
            .filter(models.StockPriceDaily.date == expect)
            .scalar()
            or 0
        )
        latest = db.query(func.max(models.StockPriceDaily.date)).filter(
            models.StockPriceDaily.date <= expect
        ).scalar()
        # 覆蓋率需達 85% 才算資料就緒，避免少數個股先有資料造成誤判
        need = int(total_stocks * 0.85) if not args.symbols else 1
        print(f"預期最新交易日 {expect}: 已有 {n_expect}/{total_stocks} 檔 (門檻 {need}) | 庫內最新日 {latest}")
        if n_expect < need:
            print("資料尚未更新至最新交易日（覆蓋率不足），中止後續預測。")
            return 2
        print("K 線資料已就緒 ✅")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
