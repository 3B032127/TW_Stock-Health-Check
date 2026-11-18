#!/usr/bin/env python3
"""
台股資料庫重塑與純淨化腳本 (Database Purge & Optimization)
- 嚴格限定只收錄「目前正常上市交易的台灣股票」(Active TWSE Operating Common Stocks)
- 徹底清除：
  1. 所有 ETF (0050、0056、00878 等)
  2. 所有 ETN (02 開頭)
  3. 所有已下市公司、被併購消滅公司 (如 2833 台壽保、1107 建台、1606 歌林、1704 榮化等)
  4. 興櫃與未上市標的
- 遍歷並清理所有相關資料表，執行 VACUUM 壓縮釋放磁碟空間。
"""

import os
import sys
import sqlite3
import time

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DB_PATH = os.path.join(PROJECT_ROOT, "financial_data.db")

def run_purge():
    if not os.path.exists(DB_PATH):
        print(f"Error: {DB_PATH} not found.")
        return

    size_before = os.path.getsize(DB_PATH) / (1024 * 1024)
    print(f"=== 開始執行資料庫純淨化作業 ===")
    print(f"當前資料庫大小: {size_before:.2f} MB")

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # 1. 取得真正正常上市交易中的 1,005 檔普通股個股代碼
    q_active = """
    SELECT s.stock_id, s.name
    FROM stocks s
    JOIN stock_prices_daily p ON s.stock_id = p.stock_id
    WHERE s.market_type = 'twse'
      AND length(s.stock_id) = 4
      AND s.stock_id GLOB '[0-9][0-9][0-9][0-9]'
      AND s.industry NOT IN ('ETF', 'ETN', 'Index', '大盤', '存託憑證', '受益證券')
      AND s.stock_id NOT LIKE '00%'
      AND s.stock_id NOT LIKE '02%'
    GROUP BY s.stock_id
    HAVING MAX(p.date) >= '2025-01-01'
    ORDER BY s.stock_id
    """
    c.execute(q_active)
    active_rows = c.fetchall()
    active_ids = set(r[0] for r in active_rows)
    print(f"篩選出合格「目前正在上市」的台灣股票共: {len(active_ids)} 檔")

    if len(active_ids) < 900:
        print("警告: 篩選出的有效上市股票過少，中止清理以防誤刪！")
        return

    # 2. 清理各資料表
    tables_to_clean = [
        ("stocks", "stock_id"),
        ("financial_reports", "stock_id"),
        ("balance_sheets", "stock_id"),
        ("cash_flow_statements", "stock_id"),
        ("chips_daily", "stock_id"),
        ("stock_prices_daily", "stock_id"),
        ("dividends", "stock_id"),
        ("sync_metadata", "stock_id"),
        ("market_cap_cache", "stock_id"),
        ("gs_factor", "ticker")
    ]

    # Create temporary table for fast join / filter
    c.execute("CREATE TEMPORARY TABLE valid_stock_ids (stock_id TEXT PRIMARY KEY)")
    c.executemany("INSERT INTO valid_stock_ids VALUES (?)", [(sid,) for sid in active_ids])

    print("\n--- 正在清理非在市上市公司之無用數據 ---")
    for tbl, col in tables_to_clean:
        try:
            c.execute(f"SELECT COUNT(*) FROM {tbl}")
            count_before = c.fetchone()[0]
            
            del_sql = f"DELETE FROM {tbl} WHERE {col} NOT IN (SELECT stock_id FROM valid_stock_ids)"
            c.execute(del_sql)
            deleted_rows = c.rowcount
            
            c.execute(f"SELECT COUNT(*) FROM {tbl}")
            count_after = c.fetchone()[0]
            print(f" • {tbl:22s}: 原有 {count_before:8d} 筆 | 刪除 {deleted_rows:8d} 筆 | 保留 {count_after:8d} 筆")
        except Exception as e:
            print(f"清理 {tbl} 時出錯: {e}")

    conn.commit()

    print("\n--- 正在執行 SQLite VACUUM 磁碟空間重組與壓縮 ---")
    t0 = time.time()
    conn.execute("VACUUM")
    conn.close()
    t1 = time.time()

    size_after = os.path.getsize(DB_PATH) / (1024 * 1024)
    print(f"VACUUM 完成 (耗時 {t1 - t0:.2f} 秒)")
    print(f"清理後資料庫大小: {size_after:.2f} MB (節省 {(size_before - size_after):.2f} MB)")
    print(f"=== 資料庫純淨化作業順利完成！ ===")

if __name__ == "__main__":
    run_purge()
