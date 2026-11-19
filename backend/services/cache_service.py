import json
import threading
import time
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

import pytz
from sqlalchemy.orm import Session

from .. import database, models

# 台灣時區 (保留給既有同步快取函式使用)
TW_TZ = pytz.timezone("Asia/Taipei")

# 各市場當地交易時段設定 (分鐘數：從當地午夜 00:00 起算；settle 包含盤後結算緩衝)
MARKET_SCHEDULES: Dict[str, Dict[str, Any]] = {
    "TW": {"tz": "Asia/Taipei", "open": 9 * 60, "close": 13 * 60 + 30, "settle": 13 * 60 + 40},
    "JP": {"tz": "Asia/Tokyo", "open": 9 * 60, "close": 15 * 60 + 30, "settle": 15 * 60 + 40},
    "US": {"tz": "America/New_York", "open": 9 * 60 + 30, "close": 16 * 60, "settle": 16 * 60 + 10},
}

# Tier 1 記憶體快取：cache_key -> (expires_at_epoch, value)
_mem_cache: Dict[str, Tuple[float, Any]] = {}
_mem_lock = threading.Lock()
_db_write_lock = threading.Lock()


def is_market_open(market: str) -> bool:
    """判斷指定市場 (TW / JP / US) 目前是否處於開盤交易或盤後結算緩衝時段。"""
    cfg = MARKET_SCHEDULES.get(market)
    if not cfg:
        return False
    now = datetime.now(ZoneInfo(cfg["tz"]))
    if now.weekday() >= 5:
        return False
    current_minutes = now.hour * 60 + now.minute
    return cfg["open"] <= current_minutes <= cfg["settle"]


def is_any_market_open(markets: Optional[List[str]] = None) -> bool:
    """判斷指定市場清單（預設 TW/JP/US）中是否有任一市場正在開盤。"""
    targets = markets or ["TW", "JP", "US"]
    return any(is_market_open(m) for m in targets)


def get_market_session_date(market: str) -> str:
    """
    取得指定市場目前對應的交易日標籤 (YYYY-MM-DD)。
    若當地時間尚未到開盤時間或落在週末，自動往前回溯至最近一個週一～週五交易日。
    """
    cfg = MARKET_SCHEDULES.get(market)
    if not cfg:
        return datetime.now(TW_TZ).strftime("%Y-%m-%d")

    now = datetime.now(ZoneInfo(cfg["tz"]))
    target_date = now.date()
    current_minutes = now.hour * 60 + now.minute

    if current_minutes < cfg["open"]:
        target_date = target_date - timedelta(days=1)

    if target_date.weekday() == 5:  # Saturday -> Friday
        target_date = target_date - timedelta(days=1)
    elif target_date.weekday() == 6:  # Sunday -> Friday
        target_date = target_date - timedelta(days=2)

    return target_date.strftime("%Y-%m-%d")


def get_market_cache_bucket(
    market: str, live_ttl: int = 30, closed_ttl: int = 86400
) -> Tuple[str, bool, int]:
    """回傳 (快取桶鍵, 是否開盤中, 對應 TTL 秒數)。"""
    open_now = is_market_open(market)
    session_date = get_market_session_date(market)
    status_tag = "open" if open_now else "closed"
    bucket = f"{market}:{session_date}:{status_tag}"
    ttl = live_ttl if open_now else closed_ttl
    return bucket, open_now, ttl


def get_multi_market_cache_bucket(
    markets: List[str], live_ttl: int = 30, closed_ttl: int = 86400
) -> Tuple[str, bool, int]:
    """組合多市場的交易日快取桶；只要其中任一市場開盤中，即套用 live_ttl。"""
    parts: List[str] = []
    any_open = False
    for m in markets:
        b, is_open, _ = get_market_cache_bucket(m, live_ttl=live_ttl, closed_ttl=closed_ttl)
        parts.append(b)
        if is_open:
            any_open = True
    combined_bucket = "|".join(parts)
    ttl = live_ttl if any_open else closed_ttl
    return combined_bucket, any_open, ttl


def _read_sqlite_cache(
    db: Optional[Session], cache_key: str, ignore_expiry: bool = False
) -> Optional[Tuple[int, Any]]:
    """從 SQLite ResponseCache 讀取指定 key；回傳 (expires_at, data) 或 None。"""
    own_session = db is None
    session = database.SessionLocal() if own_session else db
    try:
        item = session.query(models.ResponseCache).filter_by(cache_key=cache_key).first()
        if not item:
            return None
        if not ignore_expiry and item.expires_at <= int(time.time()):
            return None
        return int(item.expires_at), json.loads(item.response_data)
    except Exception as e:
        print(f"SQLite cache read error ({cache_key}): {e}")
        return None
    finally:
        if own_session:
            session.close()


def _write_sqlite_cache(db: Optional[Session], cache_key: str, value: Any, ttl: int) -> None:
    """將快取資料序列化並安全寫入 SQLite ResponseCache。"""
    try:
        payload_str = json.dumps(value, ensure_ascii=False)
    except Exception as e:
        print(f"Cache JSON serialize error ({cache_key}): {e}")
        return

    now_ts = int(time.time())
    expires_ts = now_ts + int(ttl)

    with _db_write_lock:
        # 一律以獨立短交易執行寫入，避免多執行緒共用外部 Session 或 SQLite 鎖死
        session = database.SessionLocal()
        try:
            existing = session.query(models.ResponseCache).filter_by(cache_key=cache_key).first()
            if existing:
                existing.response_data = payload_str
                existing.created_at = now_ts
                existing.expires_at = expires_ts
            else:
                session.add(
                    models.ResponseCache(
                        cache_key=cache_key,
                        response_data=payload_str,
                        created_at=now_ts,
                        expires_at=expires_ts,
                    )
                )
            session.commit()
        except Exception as e:
            session.rollback()
            print(f"SQLite cache write error ({cache_key}): {e}")
        finally:
            session.close()


def get_cache_entry(cache_key: str, db: Optional[Session] = None) -> Optional[Any]:
    """純讀取兩層快取 (Memory -> SQLite)，未命中或已過期則回傳 None。"""
    now = time.time()
    with _mem_lock:
        hit = _mem_cache.get(cache_key)
        if hit and now < hit[0]:
            return hit[1]

    db_hit = _read_sqlite_cache(db, cache_key, ignore_expiry=False)
    if db_hit is not None:
        exp_ts, db_val = db_hit
        with _mem_lock:
            _mem_cache[cache_key] = (float(exp_ts), db_val)
        return db_val
    return None


def set_cache_entry(cache_key: str, value: Any, ttl: int, db: Optional[Session] = None) -> None:
    """同時將有效快取寫入 Memory 與 SQLite ResponseCache。"""
    fresh_exp = time.time() + ttl
    with _mem_lock:
        _mem_cache[cache_key] = (fresh_exp, value)
    _write_sqlite_cache(db, cache_key, value, ttl)


def get_or_set_cache(
    cache_key: str,
    ttl: int,
    compute_fn: Callable[[], Any],
    db: Optional[Session] = None,
    validator_fn: Optional[Callable[[Any], bool]] = None,
) -> Any:
    """
    兩層智慧快取 (Tier 1 Memory -> Tier 2 SQLite ResponseCache)：
      1. 優先檢查記憶體中未過期快取。
      2. 若未命中，查詢 SQLite ResponseCache，命中則回寫記憶體並立刻返回。
      3. 若皆未命中或已過期，執行 compute_fn()；驗證合法後同時寫入記憶體與 SQLite。
      4. 若 compute_fn() 失敗或回傳無效值，回退讀取任何可用的舊快取資料。
    """
    now = time.time()
    stale_mem_value = None

    # Tier 1: Memory
    with _mem_lock:
        hit = _mem_cache.get(cache_key)
        if hit:
            exp, val = hit
            if now < exp:
                return val
            stale_mem_value = val

    # Tier 2: SQLite
    db_hit = _read_sqlite_cache(db, cache_key, ignore_expiry=False)
    if db_hit is not None:
        exp_ts, db_val = db_hit
        with _mem_lock:
            _mem_cache[cache_key] = (float(exp_ts), db_val)
        return db_val

    # Compute fresh value
    value = None
    try:
        value = compute_fn()
    except Exception as e:
        print(f"Cache compute_fn error ({cache_key}): {e}")
        value = None

    is_valid = bool(validator_fn(value)) if validator_fn is not None else bool(value)
    if is_valid:
        fresh_exp = time.time() + ttl
        with _mem_lock:
            _mem_cache[cache_key] = (fresh_exp, value)
        _write_sqlite_cache(db, cache_key, value, ttl)
        return value

    # Fallback: use stale memory or stale SQLite entry if compute failed
    if stale_mem_value is not None:
        return stale_mem_value
    stale_db = _read_sqlite_cache(db, cache_key, ignore_expiry=True)
    if stale_db is not None:
        return stale_db[1]

    return value


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
    weekday = now.weekday()  # 0 = Monday, 6 = Sunday
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
            except Exception:
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
        expires_at=int(time.time()) + expire_seconds,
    )

    try:
        db.add(new_cache)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Cache save error: {e}")
