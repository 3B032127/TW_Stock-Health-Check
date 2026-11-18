"""
Global index board service (TW / US / JP).

Provides:
  * list_indices()  -> summary + 1D intraday sparkline + currency + market status for the 7 core indices
  * get_index(id, period) -> hero chart payload. For the 1d period every point carries a
    market-local trading-minute offset `x` so the frontend can draw a fixed trading-session
    X axis (lunch break collapsed for Japan).
"""
import csv
import io
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

import httpx
import yfinance as yf

MARKET_CURRENCY: Dict[str, Dict[str, str]] = {
    "TW": {"currency": "TWD", "mini": "台幣 TWD", "badge": "台幣 (TWD)"},
    "US": {"currency": "USD", "mini": "美元 USD", "badge": "美元 (USD)"},
    "JP": {"currency": "JPY", "mini": "日幣 JPY", "badge": "日幣 (JPY)"},
}

# open/close/lunch are minutes since local midnight
INDEX_CONFIG: Dict[str, Dict[str, Any]] = {
    "taiex": {
        "symbols": ["^TWII"], "name": "台股加權指數", "short": "加權指數", "market": "TW",
        "subtitle": "臺灣證券交易所發行量加權股價指數",
        "tz": "Asia/Taipei", "tz_label": "台北時間 (UTC+8)",
        "open": 9 * 60, "close": 13 * 60 + 30, "lunch": None,
    },
    "sox": {
        "symbols": ["^SOX"], "name": "費城半導體指數", "short": "費半 SOX", "market": "US",
        "subtitle": "台股科技與半導體族群最核心的先行指標",
        "tz": "America/New_York", "tz_label": "美東時間 (ET)",
        "open": 9 * 60 + 30, "close": 16 * 60, "lunch": None,
    },
    "nasdaq": {
        "symbols": ["^IXIC"], "name": "那斯達克指數", "short": "那斯達克", "market": "US",
        "subtitle": "反映美國科技股與 AI 產業整體情緒",
        "tz": "America/New_York", "tz_label": "美東時間 (ET)",
        "open": 9 * 60 + 30, "close": 16 * 60, "lunch": None,
    },
    "sp500": {
        "symbols": ["^GSPC"], "name": "標普 500 指數", "short": "標普 500", "market": "US",
        "subtitle": "反映美國大型企業與全球機構法人風險偏好",
        "tz": "America/New_York", "tz_label": "美東時間 (ET)",
        "open": 9 * 60 + 30, "close": 16 * 60, "lunch": None,
    },
    "dow": {
        "symbols": ["^DJI"], "name": "道瓊工業指數", "short": "道瓊工業", "market": "US",
        "subtitle": "反映美國傳統大型藍籌股與實體經濟景氣",
        "tz": "America/New_York", "tz_label": "美東時間 (ET)",
        "open": 9 * 60 + 30, "close": 16 * 60, "lunch": None,
    },
    "nikkei": {
        "symbols": ["^N225"], "name": "日經 225 指數", "short": "日經 225", "market": "JP",
        "subtitle": "涵蓋日本半導體設備大廠與出口巨頭，反映亞洲科技資金流向",
        "tz": "Asia/Tokyo", "tz_label": "東京時間 (UTC+9)",
        "open": 9 * 60, "close": 15 * 60 + 30, "lunch": (11 * 60 + 30, 12 * 60 + 30),
    },
    "topix": {
        "symbols": ["1306.T"], "proxy": None,
        "name": "東證股價指數 (TOPIX)", "short": "TOPIX", "market": "JP",
        "subtitle": "涵蓋東證 Prime 市場整體市值，反映日本內需、商社與金融整體動能",
        "tz": "Asia/Tokyo", "tz_label": "東京時間 (UTC+9)",
        "open": 9 * 60, "close": 15 * 60 + 30, "lunch": (11 * 60 + 30, 12 * 60 + 30),
    },
}
INDEX_ORDER = ["taiex", "sox", "nasdaq", "sp500", "dow", "nikkei", "topix"]

_cache: Dict[str, Tuple[float, Any]] = {}
_cache_lock = threading.Lock()
_yf_lock = threading.Lock()


def _cached(key: str, ttl: float, fn):
    now = time.time()
    with _cache_lock:
        hit = _cache.get(key)
        if hit and now - hit[0] < ttl:
            return hit[1]
    value = fn()
    # never cache failures/empties so the next request retries
    if value:
        with _cache_lock:
            _cache[key] = (now, value)
    return value


def _history(cfg: Dict[str, Any], **kwargs):
    """Try each candidate yahoo symbol until one returns data. Serialized via _yf_lock to prevent yfinance state leaks."""
    for sym in cfg["symbols"]:
        try:
            with _yf_lock:
                h = yf.Ticker(sym).history(**kwargs)
                if h is not None and not h.empty:
                    h = h.dropna(subset=["Close"]).copy()
                else:
                    h = None
            if h is not None and not h.empty:
                return h
        except Exception as e:  # pragma: no cover - network
            print(f"global_indices: {sym} {kwargs} failed: {e}")
    return None


def _fetch_topix_official() -> Optional[Dict[str, float]]:
    """
    Fetch official TOPIX index level from Stooq (^tpx) or Google Finance (TOPIX:IND)
    with a 3s timeout and 300s cache. Returns dict with 'close' (and optional 'prev_close') or None.
    """
    def _fetch():
        headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
        # 1. Try Stooq daily CSV
        try:
            with httpx.Client(timeout=3.0, follow_redirects=True, headers=headers) as client:
                r = client.get("https://stooq.com/q/d/l/?s=^tpx&i=d")
                if r.status_code == 200 and "Close" in r.text:
                    rows = list(csv.DictReader(io.StringIO(r.text)))
                    valid = [row for row in rows if row.get("Close")]
                    if valid:
                        latest_close = float(valid[-1]["Close"])
                        if 1500.0 < latest_close < 10000.0:
                            res: Dict[str, float] = {"close": latest_close}
                            if len(valid) >= 2:
                                prev_c = float(valid[-2]["Close"])
                                if 1500.0 < prev_c < 10000.0:
                                    res["prev_close"] = prev_c
                            return res
        except Exception as e:
            print(f"global_indices: Stooq TOPIX fetch failed: {e}")

        # 2. Try Google Finance (TOPIX:IND)
        try:
            with httpx.Client(timeout=3.0, follow_redirects=True, headers=headers) as client:
                r = client.get("https://www.google.com/finance/quote/TOPIX:IND")
                if r.status_code == 200:
                    m = re.search(r'data-last-price="([0-9]+(?:\.[0-9]+)?)"', r.text)
                    if m:
                        price = float(m.group(1))
                        if 1500.0 < price < 10000.0:
                            return {"close": price}
        except Exception as e:
            print(f"global_indices: Google Finance TOPIX fetch failed: {e}")

        return None

    return _cached("topix_official", 300, _fetch)


def _local_now(cfg) -> datetime:
    return datetime.now(ZoneInfo(cfg["tz"]))


def _session_minutes(cfg) -> int:
    total = cfg["close"] - cfg["open"]
    if cfg["lunch"]:
        total -= cfg["lunch"][1] - cfg["lunch"][0]
    return total


def market_status(cfg, last_bar_date: Optional[str] = None) -> str:
    """'open' | 'lunch' | 'closed'. Holidays are detected through stale last-bar date."""
    now = _local_now(cfg)
    if now.weekday() >= 5:
        return "closed"
    if last_bar_date and last_bar_date != now.strftime("%Y-%m-%d"):
        return "closed"
    m = now.hour * 60 + now.minute
    if m < cfg["open"] or m >= cfg["close"]:
        return "closed"
    if cfg["lunch"] and cfg["lunch"][0] <= m < cfg["lunch"][1]:
        return "lunch"
    return "open"


def _trade_x(cfg, minute_of_day: float) -> float:
    x = minute_of_day - cfg["open"]
    if cfg["lunch"]:
        ls, le = cfg["lunch"]
        if minute_of_day >= le:
            x -= le - ls
        elif minute_of_day > ls:
            x = ls - cfg["open"]
    return max(0.0, min(float(_session_minutes(cfg)), x))


def _ticks(cfg) -> List[Dict[str, Any]]:
    ticks = [{"x": 0, "label": f"{cfg['open'] // 60:02d}:{cfg['open'] % 60:02d}"}]
    total = _session_minutes(cfg)
    first_hour = (cfg["open"] // 60 + 1) * 60
    t = first_hour
    while t < cfg["close"]:
        in_lunch = cfg["lunch"] and cfg["lunch"][0] < t < cfg["lunch"][1]
        x = _trade_x(cfg, t)
        if not in_lunch and 20 < x < total - 20:
            ticks.append({"x": x, "label": f"{t // 60:02d}:00"})
        t += 60
    ticks.append({"x": total, "label": f"{cfg['close'] // 60:02d}:{cfg['close'] % 60:02d}"})
    return ticks


def _summary(index_id: str) -> Optional[Dict[str, Any]]:
    cfg = INDEX_CONFIG[index_id]
    detail = get_index(index_id, "1d")
    if not detail or not detail.get("history"):
        return None
    cur = detail["current"]
    cur_meta = MARKET_CURRENCY[cfg["market"]]
    return {
        "id": index_id,
        "name": cfg["name"],
        "short": cfg["short"],
        "market": cfg["market"],
        "currency": cur_meta["currency"],
        "currencyMini": cur_meta["mini"],
        "currencyBadge": cur_meta["badge"],
        "subtitle": cfg["subtitle"],
        "proxyNote": cfg.get("proxy"),
        "price": cur["price"],
        "change": cur["change"],
        "changePercent": cur["changePercent"],
        "status": detail["status"],
        "date": cur["date"],
        "sparkline": [p["close"] for p in detail["history"]],
    }


def list_indices() -> List[Dict[str, Any]]:
    def build():
        with ThreadPoolExecutor(max_workers=7) as ex:
            results = list(ex.map(_summary, INDEX_ORDER))
        out = [r for r in results if r]
        return out if len(out) else None

    items = _cached("list", 20, build) or []
    # status depends on wall clock -> recompute on every call
    for it in items:
        cfg = INDEX_CONFIG[it["id"]]
        it["status"] = market_status(cfg, it["date"])
    return items


def get_index(index_id: str, period: str = "1d") -> Optional[Dict[str, Any]]:
    cfg = INDEX_CONFIG.get(index_id)
    if not cfg:
        return None
    ttl = 10 if period == "1d" else 60
    data = _cached(f"idx:{index_id}:{period}", ttl, lambda: _build_index(index_id, cfg, period))
    if not data:
        return None
    data = dict(data)
    data["status"] = market_status(cfg, data["current"]["date"][:10])
    return data


def _build_index(index_id: str, cfg: Dict[str, Any], period: str) -> Optional[Dict[str, Any]]:
    daily = _history(cfg, period="5d", interval="1d")
    if daily is None or len(daily) < 1:
        return None
    last = daily.iloc[-1]
    price = float(last["Close"])
    prev_close = float(daily["Close"].iloc[-2]) if len(daily) > 1 else float(last["Open"])
    change = price - prev_close

    current = {
        "price": round(price, 2),
        "change": round(change, 2),
        "changePercent": round(change / prev_close * 100, 2) if prev_close else 0.0,
        "prevClose": round(prev_close, 2),
        "open": round(float(last["Open"]), 2),
        "high": round(float(last["High"]), 2),
        "low": round(float(last["Low"]), 2),
        "volume": float(last["Volume"]) if "Volume" in last else 0.0,
        "turnover": 0.0,
        "date": daily.index[-1].strftime("%Y-%m-%d"),
    }

    if index_id == "taiex":  # keep real turnover for TAIEX when scraping works
        try:
            from .indicators import get_indicators_service
            y = get_indicators_service()._fetch_yahoo_taiex_data() or {}
            current["turnover"] = float(y.get("turnover") or 0)
            if y.get("volume"):
                current["volume"] = float(y["volume"])
        except Exception as e:  # pragma: no cover
            print(f"global_indices: taiex turnover scrape failed: {e}")

    history: List[Dict[str, Any]] = []
    if period == "1d":
        h = _history(cfg, period="5d", interval="5m")
        if h is not None:
            h.index = h.index.tz_convert(cfg["tz"]) if h.index.tz is not None else h.index.tz_localize(cfg["tz"])
            last_day = h.index[-1].date()
            h = h[[d == last_day for d in h.index.date]]
            for idx, row in h.iterrows():
                mod = idx.hour * 60 + idx.minute
                if mod < cfg["open"] or mod > cfg["close"]:
                    continue
                history.append({
                    "date": idx.strftime("%Y-%m-%d %H:%M"),
                    "close": round(float(row["Close"]), 2),
                    "x": _trade_x(cfg, mod),
                })
            if history:
                # intraday day-range is more accurate than the daily bar during the session
                closes = [p["close"] for p in history]
                current["high"] = max(current["high"], max(closes)) if current["high"] else max(closes)
                current["low"] = min(current["low"], min(closes)) if current["low"] else min(closes)
                current["date"] = history[-1]["date"][:10]
    else:
        kw = {"1w": dict(period="5d", interval="30m"),
              "1m": dict(period="1mo", interval="1d"),
              "1y": dict(period="1y", interval="1d")}[period]
        h = _history(cfg, **kw)
        if h is not None:
            fmt = "%Y-%m-%d %H:%M" if period == "1w" else "%Y-%m-%d"
            for idx, row in h.iterrows():
                history.append({"date": idx.strftime(fmt), "close": round(float(row["Close"]), 2)})

    if not history:
        return None

    # TOPIX alignment: dual-source (Method A: official close / 1306.T) with Method B (10x split restore) fallback
    if index_id == "topix" and price > 0:
        official = _fetch_topix_official()
        scale = (official["close"] / price) if official and official.get("close") else 10.0

        for k in ("price", "prevClose", "open", "high", "low"):
            current[k] = round(current[k] * scale, 2)
        if official and official.get("prev_close") and official.get("close"):
            # Use official daily close/prev_close if available for exact alignment
            current["price"] = round(official["close"], 2)
            # Adjust prevClose using same daily change ratio if close is latest
            current["change"] = round(current["price"] - current["prevClose"], 2)
            current["changePercent"] = round(current["change"] / current["prevClose"] * 100, 2) if current["prevClose"] else 0.0
        else:
            current["change"] = round(current["price"] - current["prevClose"], 2)
            current["changePercent"] = round(current["change"] / current["prevClose"] * 100, 2) if current["prevClose"] else 0.0

        for pt in history:
            pt["close"] = round(pt["close"] * scale, 2)

        if period == "1d" and history:
            scaled_closes = [p["close"] for p in history]
            current["high"] = round(max(current["high"], max(scaled_closes)), 2)
            current["low"] = round(min(current["low"], min(scaled_closes)), 2)

    cur_meta = MARKET_CURRENCY[cfg["market"]]
    return {
        "id": index_id,
        "name": cfg["name"],
        "subtitle": cfg["subtitle"],
        "proxyNote": cfg.get("proxy"),
        "market": cfg["market"],
        "currency": cur_meta["currency"],
        "currencyMini": cur_meta["mini"],
        "currencyBadge": cur_meta["badge"],
        "timezone": cfg["tz"],
        "timezoneLabel": cfg["tz_label"],
        "sessionLabel": f"{cfg['open'] // 60:02d}:{cfg['open'] % 60:02d}–{cfg['close'] // 60:02d}:{cfg['close'] % 60:02d}"
                        + ("（午休 11:30–12:30）" if cfg["lunch"] else ""),
        "session": {"total": _session_minutes(cfg), "ticks": _ticks(cfg)},
        "period": period,
        "current": current,
        "history": history,
    }
