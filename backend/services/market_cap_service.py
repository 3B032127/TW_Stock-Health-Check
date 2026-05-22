import time
import re
import asyncio
import requests
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text
from .. import models

# 全域同步進度字典，供前端 API 輪詢
sync_progress = {
    "is_running": False,
    "current_step": 0,
    "total_steps": 100,
    "percentage": 0,
    "status_text": "尚未開始",
    "error_message": None,
    "start_time": 0,
    "end_time": 0
}

def parse_roc_date(roc_date_str: str) -> str:
    """將民國日期 (如 '1150521' 或 '115/05/21') 轉換為 'YYYY-MM-DD'"""
    try:
        cleaned = re.sub(r'\D', '', roc_date_str)
        if len(cleaned) >= 7:
            year = int(cleaned[:-4]) + 1911
            month = cleaned[-4:-2]
            day = cleaned[-2:]
            return f"{year}-{month}-{day}"
    except Exception:
        pass
    return datetime.now().strftime("%Y-%m-%d")

def safe_float(val: str, default: float = 0.0) -> float:
    """安全轉換字串為 Float，並去除逗號與特殊符號"""
    if not val:
        return default
    try:
        cleaned = str(val).replace(",", "").strip()
        if cleaned in ("", "-", "--", "nil"):
            return default
        return float(cleaned)
    except ValueError:
        return default

def safe_int(val: str, default: int = 0) -> int:
    """安全轉換字串為 Int，並去除逗號"""
    if not val:
        return default
    try:
        cleaned = str(val).replace(",", "").strip()
        if cleaned in ("", "-", "--", "nil"):
            return default
        return int(cleaned)
    except ValueError:
        return default

async def fetch_twse_data():
    """從證交所 OpenAPI 獲取全體上市股票當日行情"""
    url = "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL"
    try:
        loop = asyncio.get_event_loop()
        res = await loop.run_in_executor(None, lambda: requests.get(url, timeout=15))
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        print(f"Failed to fetch TWSE: {e}")
    return []

async def fetch_tpex_data():
    """從櫃買中心 OpenAPI 獲取全體上櫃股票當日收盤行情"""
    url = "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes"
    try:
        loop = asyncio.get_event_loop()
        res = await loop.run_in_executor(None, lambda: requests.get(url, timeout=15))
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        print(f"Failed to fetch TPEX: {e}")
    return []

async def fetch_yfinance_shares(stock_id: str) -> float:
    """透過 yfinance 獲取單一股票的發行股數 (Shares Outstanding)"""
    import yfinance as yf
    for suffix in ("TW", "TWO"):
        try:
            ticker = yf.Ticker(f"{stock_id}.{suffix}")
            info = await asyncio.wait_for(
                asyncio.to_thread(lambda: ticker.info),
                timeout=5.0
            )
            shares = info.get('sharesOutstanding')
            if shares and shares > 0:
                return float(shares)
        except Exception:
            pass
    return 0.0

async def execute_sync_background(db_session_factory):
    """背景執行一鍵全體市值與股價同步"""
    global sync_progress
    sync_progress["is_running"] = True
    sync_progress["current_step"] = 5
    sync_progress["percentage"] = 5
    sync_progress["status_text"] = "正在啟動背景同步..."
    sync_progress["error_message"] = None
    sync_progress["start_time"] = int(time.time())
    
    db = db_session_factory()
    try:
        # 1. 抓取 TWSE 與 TPEX 行情 (進度 10% - 30%)
        sync_progress["status_text"] = "正在下載臺灣證券交易所 (TWSE) 當日行情..."
        sync_progress["current_step"] = 10
        sync_progress["percentage"] = 10
        twse_list = await fetch_twse_data()
        
        sync_progress["status_text"] = "正在下載證券櫃檯買賣中心 (TPEX) 當日行情..."
        sync_progress["current_step"] = 25
        sync_progress["percentage"] = 25
        tpex_list = await fetch_tpex_data()
        
        if not twse_list and not tpex_list:
            raise Exception("無法從證交所或櫃買中心取得任何行情數據，同步失敗。")
            
        sync_progress["status_text"] = "資料下載完成，正在讀取本地資料庫..."
        sync_progress["current_step"] = 40
        sync_progress["percentage"] = 40
        
        # 讀取目前本地已有追蹤的 Stock 清單
        tracked_stocks = {s.stock_id: s for s in db.query(models.Stock).all()}
        
        # 2. 處理上櫃 (TPEX) 資料 (進度 45% - 60%)
        sync_progress["status_text"] = "正在解析上櫃股票並計算市值與股價..."
        sync_progress["current_step"] = 45
        sync_progress["percentage"] = 45
        
        now_ts = int(time.time())
        tpex_count = 0
        
        for item in tpex_list:
            sid = item.get("SecuritiesCompanyCode")
            # 只同步我們在庫的普通股 (一般為 4 碼)
            if not sid or len(sid) != 4 or sid not in tracked_stocks:
                continue
                
            close = safe_float(item.get("Close"))
            capitals = safe_float(item.get("Capitals")) # 上櫃 API 直接回傳發行股數
            date_str = parse_roc_date(item.get("Date"))
            
            if close <= 0:
                continue
                
            # 市值 = 收盤價 * 發行股數 / 10^8 (單位：億元)
            mc_value = round((close * capitals) / 100000000.0, 2) if capitals > 0 else 0.0
            
            # 更新或建立 MarketCapCache
            mc_cache = db.query(models.MarketCapCache).filter_by(stock_id=sid).first()
            if not mc_cache:
                mc_cache = models.MarketCapCache(stock_id=sid)
                db.add(mc_cache)
            mc_cache.market_cap = mc_value
            if capitals > 0:
                mc_cache.shares_outstanding = capitals
            mc_cache.last_updated = now_ts
            
            # 寫入日股價 StockPriceDaily
            daily_price = db.query(models.StockPriceDaily).filter_by(stock_id=sid, date=date_str).first()
            if not daily_price:
                daily_price = models.StockPriceDaily(stock_id=sid, date=date_str)
                db.add(daily_price)
            daily_price.open = safe_float(item.get("Open"))
            daily_price.high = safe_float(item.get("High"))
            daily_price.low = safe_float(item.get("Low"))
            # 更新或建立 SyncMetadata 中的 price
            meta = db.query(models.SyncMetadata).filter_by(stock_id=sid, data_type="price").first()
            if not meta:
                meta = models.SyncMetadata(stock_id=sid, data_type="price")
                db.add(meta)
            meta.last_updated = now_ts
            meta.last_data_date = date_str

            tpex_count += 1
            
        db.commit()
        
        # 3. 處理上市 (TWSE) 資料 (進度 65% - 80%)
        sync_progress["status_text"] = "正在解析上市股票並計算市值與股價..."
        sync_progress["current_step"] = 65
        sync_progress["percentage"] = 65
        
        twse_count = 0
        missing_shares_sids = []
        
        for item in twse_list:
            sid = item.get("Code")
            if not sid or len(sid) != 4 or sid not in tracked_stocks:
                continue
                
            close = safe_float(item.get("ClosingPrice"))
            date_str = parse_roc_date(item.get("Date"))
            
            if close <= 0:
                continue
                
            # 獲取或建立 MarketCapCache
            mc_cache = db.query(models.MarketCapCache).filter_by(stock_id=sid).first()
            shares = mc_cache.shares_outstanding if mc_cache else None
            
            if not shares or shares <= 0:
                # 缺失發行股數，待會補抓
                missing_shares_sids.append(sid)
                mc_value = mc_cache.market_cap if mc_cache else 0.0
            else:
                mc_value = round((close * shares) / 100000000.0, 2)
                
            if not mc_cache:
                mc_cache = models.MarketCapCache(stock_id=sid)
                db.add(mc_cache)
            mc_cache.market_cap = mc_value
            mc_cache.last_updated = now_ts
            
            # 寫入日股價 StockPriceDaily
            daily_price = db.query(models.StockPriceDaily).filter_by(stock_id=sid, date=date_str).first()
            if not daily_price:
                daily_price = models.StockPriceDaily(stock_id=sid, date=date_str)
                db.add(daily_price)
            daily_price.open = safe_float(item.get("OpeningPrice"))
            daily_price.high = safe_float(item.get("HighestPrice"))
            daily_price.low = safe_float(item.get("LowestPrice"))
            daily_price.close = close
            daily_price.volume = safe_int(item.get("TradeVolume"))
            
            # 更新或建立 SyncMetadata 中的 price
            meta = db.query(models.SyncMetadata).filter_by(stock_id=sid, data_type="price").first()
            if not meta:
                meta = models.SyncMetadata(stock_id=sid, data_type="price")
                db.add(meta)
            meta.last_updated = now_ts
            meta.last_data_date = date_str

            twse_count += 1
            
        db.commit()
        
        # 4. 補抓缺失發行股數 (進度 80% - 95%)
        if missing_shares_sids:
            total_missing = len(missing_shares_sids)
            sync_progress["status_text"] = f"正在透過 yfinance 補抓 {total_missing} 檔上市股票的發行股數..."
            
            for idx, sid in enumerate(missing_shares_sids):
                sync_progress["current_step"] = 80 + int((idx / total_missing) * 15)
                sync_progress["percentage"] = sync_progress["current_step"]
                sync_progress["status_text"] = f"正在補抓 {sid} 的發行股數... ({idx + 1}/{total_missing})"
                
                shares = await fetch_yfinance_shares(sid)
                if shares > 0:
                    # 重新計算市值並儲存
                    mc_cache = db.query(models.MarketCapCache).filter_by(stock_id=sid).first()
                    if mc_cache:
                        mc_cache.shares_outstanding = shares
                        # 找出剛存入的最新股價
                        latest_price = db.query(models.StockPriceDaily).filter_by(stock_id=sid).order_by(models.StockPriceDaily.date.desc()).first()
                        if latest_price and latest_price.close:
                            mc_cache.market_cap = round((latest_price.close * shares) / 100000000.0, 2)
                        db.commit()
                # 稍微間隔，避免打爆 API
                await asyncio.sleep(0.5)
                
        sync_progress["status_text"] = f"同步成功！共更新 {twse_count} 檔上市、{tpex_count} 檔上櫃股票的市值與收盤股價。"
        sync_progress["current_step"] = 100
        sync_progress["percentage"] = 100
        sync_progress["end_time"] = int(time.time())
        
    except Exception as ex:
        db.rollback()
        sync_progress["error_message"] = str(ex)
        sync_progress["status_text"] = f"同步發生錯誤：{ex}"
        print(f"Error in sync background: {ex}")
    finally:
        db.close()
        sync_progress["is_running"] = False

def start_sync_market_caps(db_session_factory) -> dict:
    """前端觸發一鍵同步，回傳目前狀態並開啟背景任務"""
    global sync_progress
    if sync_progress["is_running"]:
        return {"status": "running", "progress": sync_progress}
        
    # 重設進度
    sync_progress = {
        "is_running": True,
        "current_step": 0,
        "total_steps": 100,
        "percentage": 0,
        "status_text": "正在下載與計算最新股價與市值...",
        "error_message": None,
        "start_time": int(time.time()),
        "end_time": 0
    }
    
    # 啟動非同步背景任務
    asyncio.create_task(execute_sync_background(db_session_factory))
    return {"status": "started", "progress": sync_progress}

async def sync_single_market_cap(db: Session, stock_id: str) -> dict:
    """個別同步一檔股票的最新股價與市值"""
    now_ts = int(time.time())
    # 嘗試用 yfinance 獲取最新資料
    import yfinance as yf
    
    # 先尋找此股是否存在
    stock = db.query(models.Stock).filter_by(stock_id=stock_id).first()
    if not stock:
        return {"status": "error", "message": "請先至個股健檢頁面同步該股票的基本資料"}
        
    try:
        shares = 0.0
        price = 0.0
        for suffix in ("TW", "TWO"):
            ticker = yf.Ticker(f"{stock_id}.{suffix}")
            info = await asyncio.to_thread(lambda: ticker.info)
            if 'previousClose' in info or 'currentPrice' in info:
                price = info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose', 0.0)
                shares = info.get('sharesOutstanding', 0.0)
                break
                
        if price <= 0:
            return {"status": "error", "message": f"無法透過 yfinance 取得股票 {stock_id} 的報價"}
            
        mc_value = round((price * shares) / 100000000.0, 2) if shares > 0 else 0.0
        
        # 寫入市值快取
        mc_cache = db.query(models.MarketCapCache).filter_by(stock_id=stock_id).first()
        if not mc_cache:
            mc_cache = models.MarketCapCache(stock_id=stock_id)
            db.add(mc_cache)
        mc_cache.market_cap = mc_value
        if shares > 0:
            mc_cache.shares_outstanding = shares
        mc_cache.last_updated = now_ts
        
        # 寫入最新價格
        date_str = datetime.now().strftime("%Y-%m-%d")
        daily_price = db.query(models.StockPriceDaily).filter_by(stock_id=stock_id, date=date_str).first()
        if not daily_price:
            daily_price = models.StockPriceDaily(stock_id=stock_id, date=date_str)
            db.add(daily_price)
        daily_price.close = price
        daily_price.open = price
        daily_price.high = price
        daily_price.low = price
        daily_price.volume = 0 # 缺失成交量，以預設 0 代替
        
        # 更新或建立 SyncMetadata 中的 price
        meta = db.query(models.SyncMetadata).filter_by(stock_id=stock_id, data_type="price").first()
        if not meta:
            meta = models.SyncMetadata(stock_id=stock_id, data_type="price")
            db.add(meta)
        meta.last_updated = now_ts
        meta.last_data_date = date_str
        
        db.commit()
        return {
            "status": "success", 
            "data": {
                "stock_id": stock_id,
                "price": price,
                "market_cap": mc_value,
                "shares_outstanding": shares
            }
        }
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}
