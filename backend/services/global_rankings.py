"""
Global Stock Rankings & Taiwan ADR Premium Monitor Service.

Provides:
  * get_adr_monitor(db) -> TSM, ASX, UMC, CHT ADR prices, converted TWD & premium/discount %
  * get_global_rankings(category, limit, db) -> tw_core | tw_all | us | jp | semi
    with market flags, industry pills, currency symbols, and genuine intraday/recent sparklines.
"""
import math
import threading
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
import yfinance as yf
from sqlalchemy import desc
from sqlalchemy.orm import Session

from .. import models
from . import cache_service
from .global_indices import _yf_lock

_tw_pool_mem: Dict[str, Tuple[float, List[Dict[str, Any]]]] = {}
_tw_pool_lock = threading.Lock()


ADR_SPECS: List[Dict[str, Any]] = [
    {"id": "TSM", "name": "台積電 ADR", "twId": "2330", "twName": "台積電", "ratio": 5.0, "ratioLabel": "1:5"},
    {"id": "ASX", "name": "日月光 ADR", "twId": "3711", "twName": "日月光投控", "ratio": 2.0, "ratioLabel": "1:2"},
    {"id": "UMC", "name": "聯電 ADR", "twId": "2303", "twName": "聯電", "ratio": 5.0, "ratioLabel": "1:5"},
    {"id": "CHT", "name": "中華電信 ADR", "twId": "2412", "twName": "中華電", "ratio": 10.0, "ratioLabel": "1:10"},
]

US_POOL: List[Dict[str, str]] = [
    {"symbol": "NVDA", "name": "輝達 NVIDIA", "industry": "AI 晶片"},
    {"symbol": "AVGO", "name": "博通 Broadcom", "industry": "網通與客製晶片"},
    {"symbol": "AMD", "name": "超微 AMD", "industry": "AI / CPU"},
    {"symbol": "ASML", "name": "艾司摩爾 ASML", "industry": "EUV 微影設備"},
    {"symbol": "TSM", "name": "台積電 ADR", "industry": "晶圓代工"},
    {"symbol": "AAPL", "name": "蘋果 Apple", "industry": "消費電子"},
    {"symbol": "MSFT", "name": "微軟 Microsoft", "industry": "雲端與 AI"},
    {"symbol": "GOOGL", "name": "Alphabet (Google)", "industry": "搜尋與雲端"},
    {"symbol": "AMZN", "name": "亞馬遜 Amazon", "industry": "電商與雲端"},
    {"symbol": "META", "name": "Meta Platforms", "industry": "社群與 AI"},
    {"symbol": "TSLA", "name": "特斯拉 Tesla", "industry": "電動車與自駕"},
    {"symbol": "QCOM", "name": "高通 Qualcomm", "industry": "行動處理器"},
    {"symbol": "TXN", "name": "德州儀器 TI", "industry": "類比 IC"},
    {"symbol": "MU", "name": "美光 Micron", "industry": "HBM 記憶體"},
    {"symbol": "AMAT", "name": "應用材料 AMAT", "industry": "晶圓設備"},
    {"symbol": "LRCX", "name": "科林研發 Lam", "industry": "蝕刻設備"},
    {"symbol": "KLAC", "name": "科磊 KLA", "industry": "量測檢測設備"},
    {"symbol": "INTC", "name": "英特爾 Intel", "industry": "IDM / 晶圓"},
    {"symbol": "ARM", "name": "安謀 Arm", "industry": "架構授權"},
    {"symbol": "MRVL", "name": "邁威爾 Marvell", "industry": "高速傳輸晶片"},
]

JP_POOL: List[Dict[str, str]] = [
    {"symbol": "8035.T", "name": "東京威力科創 TEL", "industry": "日本設備"},
    {"symbol": "6857.T", "name": "愛德萬測試 Advantest", "industry": "AI 測試設備"},
    {"symbol": "6146.T", "name": "迪思科 DISCO", "industry": "晶圓切割研磨"},
    {"symbol": "6920.T", "name": "Lasertec 雷泰光電", "industry": "EUV 光罩檢測"},
    {"symbol": "7735.T", "name": "SCREEN 控股", "industry": "晶圓清洗設備"},
    {"symbol": "4063.T", "name": "信越化學工業", "industry": "矽晶圓 / 光阻"},
    {"symbol": "9984.T", "name": "軟銀集團 SoftBank", "industry": "科技投資"},
    {"symbol": "7203.T", "name": "豐田汽車 Toyota", "industry": "汽車製造"},
    {"symbol": "6758.T", "name": "索尼集團 Sony", "industry": "感測器與娛樂"},
    {"symbol": "6501.T", "name": "日立製作所 Hitachi", "industry": "重電與數位"},
    {"symbol": "8058.T", "name": "三菱商事", "industry": "綜合商社"},
    {"symbol": "8031.T", "name": "三井物產", "industry": "綜合商社"},
    {"symbol": "8001.T", "name": "伊藤忠商事", "industry": "綜合商社"},
    {"symbol": "8306.T", "name": "三菱 UFJ 金融", "industry": "大型銀行"},
    {"symbol": "7974.T", "name": "任天堂 Nintendo", "industry": "遊戲娛樂"},
    {"symbol": "9983.T", "name": "迅銷 Fast Retailing", "industry": "零售服飾"},
]

TW_SEMI_IDS: List[str] = ["2330", "2454", "3711", "2303", "3034", "2379", "3661", "3443", "2382", "2317"]
US_SEMI_SYMBOLS: set = {"NVDA", "AVGO", "AMD", "ASML", "QCOM", "MU", "AMAT", "LRCX", "KLAC", "ARM", "MRVL", "INTC"}
JP_SEMI_SYMBOLS: set = {"8035.T", "6857.T", "6146.T", "6920.T", "7735.T", "4063.T"}


def _extract_ticker_closes(df: pd.DataFrame, symbol: str, multi: bool) -> List[float]:
    if df is None or df.empty:
        return []
    try:
        if multi:
            if symbol not in df.columns.get_level_values(0):
                return []
            sub = df[symbol]["Close"].dropna()
        else:
            if "Close" not in df.columns:
                return []
            sub = df["Close"].dropna()
        return [round(float(v), 2) for v in sub.tolist() if v is not None and not math.isnan(float(v))]
    except Exception:
        return []


def _extract_last_day_intraday(df: pd.DataFrame, symbol: str, multi: bool) -> List[float]:
    if df is None or df.empty:
        return []
    try:
        if multi:
            if symbol not in df.columns.get_level_values(0):
                return []
            s = df[symbol]["Close"].dropna()
        else:
            if "Close" not in df.columns:
                return []
            s = df["Close"].dropna()
        if s.empty:
            return []
        last_date = s.index[-1].date()
        day_vals = s[[d == last_date for d in s.index.date]]
        return [round(float(v), 2) for v in day_vals.tolist() if v is not None and not math.isnan(float(v))]
    except Exception:
        return []


def _batch_download_quotes(symbols: List[str]) -> Dict[str, Dict[str, Any]]:
    """Fetch 5d daily & 5d 15m intraday closes cleanly in one serialized batch."""
    if not symbols:
        return {}
    multi = len(symbols) > 1
    with _yf_lock:
        try:
            daily_df = yf.download(
                symbols, period="5d", interval="1d", group_by="ticker",
                threads=False, progress=False, auto_adjust=False
            )
            daily_df = daily_df.copy() if daily_df is not None else pd.DataFrame()
        except Exception as e:
            print(f"global_rankings: daily download failed: {e}")
            daily_df = pd.DataFrame()

        try:
            intra_df = yf.download(
                symbols, period="5d", interval="15m", group_by="ticker",
                threads=False, progress=False, auto_adjust=False
            )
            intra_df = intra_df.copy() if intra_df is not None else pd.DataFrame()
        except Exception as e:
            print(f"global_rankings: intraday download failed: {e}")
            intra_df = pd.DataFrame()

    out: Dict[str, Dict[str, Any]] = {}
    for sym in symbols:
        closes = _extract_ticker_closes(daily_df, sym, multi)
        intra = _extract_last_day_intraday(intra_df, sym, multi)
        if len(closes) >= 2:
            curr, prev = closes[-1], closes[-2]
        elif len(closes) == 1:
            curr = closes[-1]
            prev = intra[0] if intra else curr
        elif len(intra) >= 2:
            curr, prev = intra[-1], intra[0]
        else:
            continue
        change = round(curr - prev, 2)
        pct = round((change / prev) * 100.0, 2) if prev > 0 else 0.0
        sparkline = intra if len(intra) >= 2 else closes
        out[sym] = {
            "price": round(curr, 2),
            "prevClose": round(prev, 2),
            "change": change,
            "changePercent": pct,
            "sparkline": sparkline,
        }
    return out


def _get_tw_spot_prices(db: Session, stock_ids: List[str]) -> Dict[str, float]:
    """Get latest TW spot close prices from local SQLite StockPriceDaily."""
    if not stock_ids:
        return {}
    latest_date_row = db.query(models.StockPriceDaily.date).order_by(desc(models.StockPriceDaily.date)).first()
    if not latest_date_row:
        return {}
    # Find latest close per requested stock_id
    out: Dict[str, float] = {}
    for sid in stock_ids:
        row = (
            db.query(models.StockPriceDaily.close)
            .filter(models.StockPriceDaily.stock_id == sid)
            .order_by(desc(models.StockPriceDaily.date))
            .first()
        )
        if row and row[0]:
            out[sid] = float(row[0])
    return out


def get_adr_monitor(db: Session) -> Dict[str, Any]:
    """Compute Taiwan ADR prices, TWD-converted price, and premium/discount % vs TW spot."""
    def _build():
        adr_syms = [s["id"] for s in ADR_SPECS]
        quotes = _batch_download_quotes(["TWD=X"] + adr_syms)
        usd_twd = quotes.get("TWD=X", {}).get("price") or 32.5

        tw_spots = _get_tw_spot_prices(db, [s["twId"] for s in ADR_SPECS])
        missing_tw = [f"{s['twId']}.TW" for s in ADR_SPECS if s["twId"] not in tw_spots]
        if missing_tw:
            tw_quotes = _batch_download_quotes(missing_tw)
            for s in ADR_SPECS:
                if s["twId"] not in tw_spots and f"{s['twId']}.TW" in tw_quotes:
                    tw_spots[s["twId"]] = tw_quotes[f"{s['twId']}.TW"]["price"]

        items: List[Dict[str, Any]] = []
        for s in ADR_SPECS:
            q = quotes.get(s["id"])
            if not q:
                continue
            adr_price = q["price"]
            converted_twd = round((adr_price * usd_twd) / s["ratio"], 2)
            tw_spot = round(tw_spots.get(s["twId"], 0.0), 2)
            premium_pct = round(((converted_twd - tw_spot) / tw_spot) * 100.0, 2) if tw_spot > 0 else 0.0
            items.append({
                "id": s["id"],
                "name": s["name"],
                "twId": s["twId"],
                "twName": s["twName"],
                "ratioLabel": s["ratioLabel"],
                "adrPrice": adr_price,
                "change": q["change"],
                "changePercent": q["changePercent"],
                "convertedTwd": converted_twd,
                "twSpotPrice": tw_spot,
                "premiumPercent": premium_pct,
                "sparkline": q["sparkline"],
            })

        return {
            "usdTwd": round(usd_twd, 2),
            "updatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "items": items,
        }

    bucket, _, ttl = cache_service.get_multi_market_cache_bucket(["TW", "US"], live_ttl=30, closed_ttl=86400)
    res = cache_service.get_or_set_cache(
        f"adr_monitor:{bucket}",
        ttl,
        _build,
        db=db,
        validator_fn=lambda d: bool(d and d.get("items")),
    )
    return res or {"usdTwd": 32.5, "updatedAt": "", "items": []}


def _fetch_tw_pool_from_db(db: Session, stock_ids: Optional[List[str]] = None, top_cap_limit: Optional[int] = None) -> List[Dict[str, Any]]:
    """Build TW stock daily gain/loss pool from local SQLite StockPriceDaily (latest 2 trading days)."""
    bucket, is_open, ttl = cache_service.get_market_cache_bucket("TW", live_ttl=30, closed_ttl=86400)
    if stock_ids is not None:
        scope_key = f"ids:{','.join(sorted(stock_ids))}"
    elif top_cap_limit is not None:
        scope_key = f"cap:{top_cap_limit}"
    else:
        scope_key = "all"
    mem_key = f"{bucket}:{scope_key}"
    now = time.time()
    with _tw_pool_lock:
        hit = _tw_pool_mem.get(mem_key)
        if hit and now < hit[0]:
            return [dict(item) for item in hit[1]]

    dates_rows = (
        db.query(models.StockPriceDaily.date)
        .distinct()
        .order_by(desc(models.StockPriceDaily.date))
        .limit(5)
        .all()
    )
    valid_dates = []
    for (d,) in dates_rows:
        cnt = db.query(models.StockPriceDaily).filter(models.StockPriceDaily.date == d).count()
        if cnt >= 100:
            valid_dates.append(d)
        if len(valid_dates) >= 2:
            break

    if len(valid_dates) < 2:
        return []

    latest_date, prev_date = valid_dates[0], valid_dates[1]

    if stock_ids is not None:
        target_ids = stock_ids
    elif top_cap_limit is not None:
        mc_rows = (
            db.query(models.MarketCapCache.stock_id)
            .filter(models.MarketCapCache.market_cap > 0)
            .order_by(desc(models.MarketCapCache.market_cap))
            .limit(top_cap_limit)
            .all()
        )
        target_ids = [r[0] for r in mc_rows]
    else:
        target_ids = [r[0] for r in db.query(models.Stock.stock_id).all()]

    if not target_ids:
        return []

    stocks_meta = {
        s.stock_id: s
        for s in db.query(models.Stock).filter(models.Stock.stock_id.in_(target_ids)).all()
    }
    latest_rows = {
        r.stock_id: r
        for r in db.query(models.StockPriceDaily)
        .filter(models.StockPriceDaily.date == latest_date, models.StockPriceDaily.stock_id.in_(target_ids))
        .all()
    }
    prev_rows = {
        r.stock_id: r
        for r in db.query(models.StockPriceDaily)
        .filter(models.StockPriceDaily.date == prev_date, models.StockPriceDaily.stock_id.in_(target_ids))
        .all()
    }

    items: List[Dict[str, Any]] = []
    for sid in target_ids:
        cur_r = latest_rows.get(sid)
        prv_r = prev_rows.get(sid)
        meta = stocks_meta.get(sid)
        if not cur_r or not prv_r or not cur_r.close or not prv_r.close or prv_r.close <= 0:
            continue
        curr_px = float(cur_r.close)
        prev_px = float(prv_r.close)
        change = round(curr_px - prev_px, 2)
        pct = round((change / prev_px) * 100.0, 2)
        items.append({
            "id": sid,
            "symbol": sid,
            "name": meta.name if meta and meta.name else sid,
            "market": "TW",
            "currencySymbol": "NT$",
            "industry": (meta.industry or "上市股票") if meta else "上市股票",
            "price": round(curr_px, 2),
            "change": change,
            "changePercent": pct,
            "volume": str(int(cur_r.volume or 0)),
            "isLimitUp": pct >= 9.8,
            "isLimitDown": pct <= -9.8,
            "sparkline": [],
        })
    if items:
        with _tw_pool_lock:
            _tw_pool_mem[mem_key] = (time.time() + (30 if is_open else 86400), items)
    return [dict(item) for item in items]


def _attach_tw_sparklines(db: Session, items: List[Dict[str, Any]]) -> None:
    """Attach genuine 15m intraday sparklines (cached per TW bucket, falling back to recent 15d SQLite closes)."""
    if not items:
        return
    bucket, _, ttl = cache_service.get_market_cache_bucket("TW", live_ttl=30, closed_ttl=86400)

    missing_items: List[Dict[str, Any]] = []
    seen_missing = set()
    for it in items:
        sid = it["id"]
        cached_spark = cache_service.get_cache_entry(f"tw_spark:{sid}:{bucket}", db=db)
        if isinstance(cached_spark, list) and len(cached_spark) >= 2:
            it["sparkline"] = list(cached_spark)
        else:
            missing_items.append(it)
            seen_missing.add(sid)

    if not missing_items:
        return

    yf_syms = [f"{sid}.TW" for sid in seen_missing]
    quotes = _batch_download_quotes(yf_syms)
    resolved_sparks: Dict[str, List[float]] = {}
    for sid in seen_missing:
        q = quotes.get(f"{sid}.TW")
        if q and len(q.get("sparkline", [])) >= 2:
            spark = q["sparkline"]
        else:
            rows = (
                db.query(models.StockPriceDaily.close)
                .filter(models.StockPriceDaily.stock_id == sid)
                .order_by(desc(models.StockPriceDaily.date))
                .limit(15)
                .all()
            )
            spark = [round(float(r[0]), 2) for r in reversed(rows) if r[0]]
        resolved_sparks[sid] = spark
        if len(spark) >= 2:
            cache_service.set_cache_entry(f"tw_spark:{sid}:{bucket}", spark, ttl, db=db)

    for it in missing_items:
        it["sparkline"] = list(resolved_sparks.get(it["id"], []))


def _build_foreign_pool(pool_specs: List[Dict[str, str]], market: str, currency_sym: str) -> List[Dict[str, Any]]:
    # Download full market symbol pool once so subsets (e.g. 'semi') share the same warm cache cleanly
    full_specs = US_POOL if market == "US" else JP_POOL if market == "JP" else pool_specs
    full_symbols = [p["symbol"] for p in full_specs]
    for p in pool_specs:
        if p["symbol"] not in full_symbols:
            full_symbols.append(p["symbol"])

    bucket, _, ttl = cache_service.get_market_cache_bucket(market, live_ttl=30, closed_ttl=86400)
    quotes = cache_service.get_or_set_cache(
        f"yf_pool:{market}:{bucket}",
        ttl,
        lambda: _batch_download_quotes(full_symbols),
        db=None,
        validator_fn=lambda q: bool(q and len(q) > 0),
    ) or {}

    items: List[Dict[str, Any]] = []
    for p in pool_specs:
        q = quotes.get(p["symbol"])
        if not q:
            continue
        items.append({
            "id": p["symbol"],
            "symbol": p["symbol"],
            "name": p["name"],
            "market": market,
            "currencySymbol": currency_sym,
            "industry": p["industry"],
            "price": q["price"],
            "change": q["change"],
            "changePercent": q["changePercent"],
            "volume": "—",
            "isLimitUp": False,
            "isLimitDown": False,
            "sparkline": q["sparkline"],
        })
    return items


def get_global_rankings(category: str = "tw_core", limit: int = 5, db: Optional[Session] = None) -> Dict[str, Any]:
    """
    Build multi-market Top Gainers & Top Losers rankings with real sparklines:
      * tw_core : Top 100 market-cap TWSE stocks
      * tw_all  : All active TWSE stocks
      * us      : Core US Tech & SOX components
      * jp      : Core Nikkei 225 & JP Semi/Trading giants
      * semi    : Cross-border Global Semiconductor Supply Chain (TW + US + JP)
    """
    def _compute():
        if category in ("tw_core", "tw_all"):
            if db is None:
                return {"category": category, "gainers": [], "losers": []}
            pool = _fetch_tw_pool_from_db(db, top_cap_limit=100 if category == "tw_core" else None)
            gainers = sorted(pool, key=lambda x: x["changePercent"], reverse=True)[:limit]
            losers = sorted(pool, key=lambda x: x["changePercent"])[:limit]
            _attach_tw_sparklines(db, gainers + losers)
            return {"category": category, "gainers": gainers, "losers": losers}

        if category == "us":
            pool = _build_foreign_pool(US_POOL, "US", "$")
            gainers = sorted(pool, key=lambda x: x["changePercent"], reverse=True)[:limit]
            losers = sorted(pool, key=lambda x: x["changePercent"])[:limit]
            return {"category": category, "gainers": gainers, "losers": losers}

        if category == "jp":
            pool = _build_foreign_pool(JP_POOL, "JP", "¥")
            gainers = sorted(pool, key=lambda x: x["changePercent"], reverse=True)[:limit]
            losers = sorted(pool, key=lambda x: x["changePercent"])[:limit]
            return {"category": category, "gainers": gainers, "losers": losers}

        if category == "semi":
            tw_semi = _fetch_tw_pool_from_db(db, stock_ids=TW_SEMI_IDS) if db is not None else []
            us_semi_pool = [p for p in US_POOL if p["symbol"] in US_SEMI_SYMBOLS]
            jp_semi_pool = [p for p in JP_POOL if p["symbol"] in JP_SEMI_SYMBOLS]
            us_semi = _build_foreign_pool(us_semi_pool, "US", "$")
            jp_semi = _build_foreign_pool(jp_semi_pool, "JP", "¥")
            combined = tw_semi + us_semi + jp_semi
            gainers = sorted(combined, key=lambda x: x["changePercent"], reverse=True)[:limit]
            losers = sorted(combined, key=lambda x: x["changePercent"])[:limit]
            if db is not None:
                tw_winners = [x for x in (gainers + losers) if x["market"] == "TW"]
                _attach_tw_sparklines(db, tw_winners)
            return {"category": category, "gainers": gainers, "losers": losers}

        return {"category": category, "gainers": [], "losers": []}

    category_markets = {
        "tw_core": ["TW"],
        "tw_all": ["TW"],
        "us": ["US"],
        "jp": ["JP"],
        "semi": ["TW", "US", "JP"],
    }
    markets = category_markets.get(category, ["TW", "US", "JP"])
    bucket, _, ttl = cache_service.get_multi_market_cache_bucket(markets, live_ttl=30, closed_ttl=86400)
    res = cache_service.get_or_set_cache(
        f"rankings:{category}:{limit}:{bucket}",
        ttl,
        _compute,
        db=db,
        validator_fn=lambda d: bool(d and (d.get("gainers") or d.get("losers"))),
    )
    return res or {"category": category, "gainers": [], "losers": []}


def get_all_global_rankings(limit: int = 5, db: Optional[Session] = None) -> Dict[str, Any]:
    """Preload and return all 5 multi-market ranking categories in a single payload."""
    categories = {
        "tw_core": get_global_rankings("tw_core", limit, db),
        "tw_all": get_global_rankings("tw_all", limit, db),
        "us": get_global_rankings("us", limit, db),
        "jp": get_global_rankings("jp", limit, db),
        "semi": get_global_rankings("semi", limit, db),
    }
    return {
        "categories": categories,
        "updatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }
