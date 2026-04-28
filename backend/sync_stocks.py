import sys
import os
import asyncio

# 加入專案路徑
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal, engine
from backend import models
from backend.services.stock_service import sync_stocks_info

# 確保資料表已建立
models.Base.metadata.create_all(bind=engine)

async def main():
    print("開始同步台股產業分類資訊...")
    db = SessionLocal()
    try:
        count = await sync_stocks_info(db)
        print(f"同步完成！共處理 {count} 檔股票分類。")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
