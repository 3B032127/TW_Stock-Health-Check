import time
import json
from datetime import datetime, timedelta
import pytz
from sqlalchemy.orm import Session
from .. import models

# 台灣時區
TW_TZ = pytz.timezone('Asia/Taipei')

def is_market_stable():
    """
    判斷目前是否為台股休盤且資料已穩定的期間。
    台股交易時間：09:00 - 13:30
    資料更新通常在 14:30 之後完成。
    休盤穩定期間定義：
    1. 週一至週五：14:30 ~ 隔日 09:00
    2. 週六、週日：全天
    """
    now = datetime.now(TW_TZ)
    weekday = now.weekday() # 0 = Monday, 6 = Sunday
    hour = now.hour
    minute = now.minute
    
    # 週末全天視為穩定
    if weekday >= 5:
        return True
    
    # 平日
    current_time_val = hour * 100 + minute
    # 14:30 之後到隔日 09:00 之前
    if current_time_val >= 1430 or current_time_val < 900:
        return True
    
    return False

def get_market_date_key():
    """
    取得目前的資料日期標籤，用於快取鍵。
    如果在 09:00 之前，標籤應為前一天的交易日（簡化為前一天）。
    """
    now = datetime.now(TW_TZ)
    if now.hour < 9:
        # 早上 9 點前視為昨天的資料
        target_date = now - timedelta(days=1)
    else:
        target_date = now
    return target_date.strftime("%Y-%m-%d")

def get_cached_response(db: Session, category: str, stock_id: str):
    """
    嘗試從資料庫讀取快取。
    """
    if not is_market_stable():
        return None
        
    date_key = get_market_date_key()
    cache_key = f"{category}:{stock_id}:{date_key}"
    
    cached_item = db.query(models.ResponseCache).filter_by(cache_key=cache_key).first()
    if cached_item:
        # 檢查是否過期 (雖然 date_key 已經有過濾作用，但加上 expires_at 更安全)
        if cached_item.expires_at > int(time.time()):
            try:
                return json.loads(cached_item.response_data)
            except:
                return None
    return None

def set_cached_response(db: Session, category: str, stock_id: str, data: dict, expire_seconds: int = 3600 * 12):
    """
    存儲快取到資料庫。
    """
    if not is_market_stable():
        return
        
    date_key = get_market_date_key()
    cache_key = f"{category}:{stock_id}:{date_key}"
    
    # 刪除舊的 (如果存在)
    db.query(models.ResponseCache).filter_by(cache_key=cache_key).delete()
    
    new_cache = models.ResponseCache(
        cache_key=cache_key,
        response_data=json.dumps(data, ensure_ascii=False),
        created_at=int(time.time()),
        expires_at=int(time.time()) + expire_seconds
    )
    
    try:
        db.add(new_cache)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Cache save error: {e}")
