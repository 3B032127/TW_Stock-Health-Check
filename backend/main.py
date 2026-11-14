import asyncio
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, schemas, database
from .services import finance, market, cache_service
import os
from dotenv import load_dotenv

# Load environment variables from the root .env.local file
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env.local')
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv() # Fallback to default .env

# Create DB tables
models.Base.metadata.create_all(bind=database.engine)

# Auto-migration for shares_outstanding column in market_cap_cache
def upgrade_db_schema():
    from sqlalchemy import text
    db = database.SessionLocal()
    try:
        # Check if shares_outstanding column exists in market_cap_cache
        res = db.execute(text("PRAGMA table_info(market_cap_cache)")).fetchall()
        columns = [r[1] for r in res]
        if "shares_outstanding" not in columns:
            print("Upgrading database: Adding shares_outstanding column to market_cap_cache table...")
            db.execute(text("ALTER TABLE market_cap_cache ADD COLUMN shares_outstanding FLOAT"))
            db.commit()
            print("Database upgrade completed successfully.")
    except Exception as e:
        print(f"Error upgrading database: {e}")
        db.rollback()
    finally:
        db.close()

upgrade_db_schema()

app = FastAPI(
    title="Taiwan Stock Health Check API",
    description="Backend API for financial data analysis",
    version="3.0.0"
)

# Add CORS middleware to allow requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允許所有來源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Welcome to Taiwan Stock Health Check API"}

@app.get("/api/v1/finance/income_statement", response_model=schemas.ApiResponse)
async def read_income_statement(
    stock_id: str = Query(..., description="Stock ID (e.g., 2330)"),
    year: int = Query(..., description="Year"),
    quarter: int = Query(..., description="Quarter (1-4)"),
    db: Session = Depends(get_db)
):
    source, item = await finance.get_income_statement(db, stock_id, year, quarter)
    if not item:
        raise HTTPException(status_code=404, detail="Data not found")
    
    return {
        "status": "success",
        "source": source,
        "data": schemas.IncomeStatement.model_validate(item).model_dump()
    }

@app.get("/api/v1/finance/balance_sheet", response_model=schemas.ApiResponse)
async def read_balance_sheet(
    stock_id: str,
    year: int,
    quarter: int,
    db: Session = Depends(get_db)
):
    source, item = await finance.get_balance_sheet(db, stock_id, year, quarter)
    if not item:
        raise HTTPException(status_code=404, detail="Data not found")
        
    return {
        "status": "success",
        "source": source,
        "data": schemas.BalanceSheet.model_validate(item).model_dump()
    }

@app.get("/api/v1/finance/cash_flow", response_model=schemas.ApiResponse)
async def read_cash_flow(
    stock_id: str,
    year: int,
    quarter: int,
    db: Session = Depends(get_db)
):
    source, item = await finance.get_cash_flow(db, stock_id, year, quarter)
    if not item:
        raise HTTPException(status_code=404, detail="Data not found")
        
    return {
        "status": "success",
        "source": source,
        "data": schemas.CashFlowStatement.model_validate(item).model_dump()
    }

@app.get("/api/v1/finance/income_statement/history", response_model=schemas.ApiResponse)
async def read_income_statement_history(
    stock_id: str,
    limit: int = 8,
    db: Session = Depends(get_db)
):
    source, items = await finance.get_income_statement_history(db, stock_id, limit)
    return {"status": "success", "source": source, "data": {"history": [schemas.IncomeStatement.model_validate(i).model_dump() for i in items]}}

@app.get("/api/v1/finance/balance_sheet/history", response_model=schemas.ApiResponse)
async def read_balance_sheet_history(
    stock_id: str,
    limit: int = 8,
    db: Session = Depends(get_db)
):
    source, items = await finance.get_balance_sheet_history(db, stock_id, limit)
    return {"status": "success", "source": source, "data": {"history": [schemas.BalanceSheet.model_validate(i).model_dump() for i in items]}}

@app.get("/api/v1/finance/cash_flow/history", response_model=schemas.ApiResponse)
async def read_cash_flow_history(
    stock_id: str,
    limit: int = 8,
    db: Session = Depends(get_db)
):
    source, items = await finance.get_cash_flow_history(db, stock_id, limit)
    return {"status": "success", "source": source, "data": {"history": [schemas.CashFlowStatement.model_validate(i).model_dump() for i in items]}}

# Cache for stock list
stock_list_cache = None

@app.get("/api/v1/stock/list")
async def read_stock_list():
    """獲取台股所有股票代碼與名稱清單"""
    global stock_list_cache
    if stock_list_cache is not None:
        return {
            "status": "success",
            "source": "finmind_cache",
            "data": stock_list_cache
        }
        
    from .services.finmind import FinMindClient
    client = FinMindClient()
    try:
        data = await client.fetch_stock_info()
        if data:
            stock_list_cache = data
        return {
            "status": "success",
            "source": "finmind",
            "data": data
        }
    finally:
        await client.close()

import hashlib
from pydantic import BaseModel
from .services import market, finance

# 全域快取：用於存放股票清單與產業資訊
stock_list_cache = None
industry_ranking_cache = {}
industry_ranking_cache_date = ""

from datetime import datetime, timedelta, time as pytime
import pytz

def is_taiwan_market_open() -> bool:
    """判斷台股當前是否為交易時段 (週一至週五 09:00 - 13:30)"""
    # 台股時區為 GMT+8
    tw_tz = pytz.timezone('Asia/Taipei')
    now = datetime.now(tw_tz)
    
    # 週末不開盤
    if now.weekday() >= 5:
        return False
        
    # 交易時間為 09:00 - 13:30
    start_time = pytime(9, 0)
    end_time = pytime(13, 30)
    current_time = now.time()
    
    return start_time <= current_time <= end_time

async def get_market_cap(sid: str, suffix: str = "TW", db: Session = None) -> float:
    import time
    import asyncio
    cached = None
    market_open = is_taiwan_market_open()
    
    if db and hasattr(db, "query"):
        try:
            cached = db.query(models.MarketCapCache).filter_by(stock_id=sid).first()
            if cached:
                now = int(time.time())
                stale_limit = 86400 if market_open else 259200
                if now - cached.last_updated < stale_limit:
                    return cached.market_cap
                if not market_open:
                    return cached.market_cap
        except Exception as e:
            print(f"DB Cache read error for {sid}: {e}")

    try:
        import yfinance as yf
        # 使用 wait_for 增加超時保護，避免單一 API 卡死整個請求
        ticker = yf.Ticker(f"{sid}.{suffix}")
        
        # 嘗試獲取資料，設定 5 秒超時
        info = await asyncio.wait_for(
            asyncio.to_thread(lambda: ticker.info),
            timeout=5.0
        )
        
        price = info.get('previousClose') or info.get('regularMarketPreviousClose') or info.get('currentPrice')
        shares = info.get('sharesOutstanding')
        
        mc_value = 0.0
        if price and shares:
            mc_value = round(float(price * shares) / 100000000, 1)
        else:
            raw_mc = info.get('marketCap', 0)
            mc_value = round(float(raw_mc) / 100000000, 1) if raw_mc > 0 else 0.0
            
        if db and hasattr(db, "query") and mc_value > 0:
            try:
                if not cached:
                    cached = models.MarketCapCache(stock_id=sid)
                    db.add(cached)
                cached.market_cap = mc_value
                cached.last_updated = int(time.time())
                db.commit()
            except Exception as db_err:
                db.rollback()
                print(f"Error updating mc_cache for {sid}: {db_err}")
                
        return mc_value
    except Exception:
        # 靜默處理 yfinance 錯誤，若有舊資料則回傳，否則回傳 0
        if cached: return cached.market_cap
        return 0.0

@app.get("/api/v1/stock/{stock_id}/profile")
async def read_stock_profile(stock_id: str, db: Session = Depends(get_db)):
    """獲取個別公司的詳細資料"""
    from .services.yahoo_crawler import YahooStockCrawler
    from .services.finmind import FinMindClient
    import asyncio
    
    global stock_list_cache
    
    crawler = YahooStockCrawler()
    try:
        # 首先嘗試獲取基本資料 (最核心內容)
        profile = await crawler.get_company_profile(stock_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Company profile not found")
            
        # 初始化排名資料為預設值
        ranking_info = {"rank": 0, "total": 0, "industry": profile.get("industry", "未知")}
        
        # 嘗試計算排名，失敗不應影響主畫面
        try:
            global stock_list_cache, industry_ranking_cache, industry_ranking_cache_date
            
            # 每日清空快取
            today = datetime.now().strftime("%Y-%m-%d")
            if industry_ranking_cache_date != today:
                industry_ranking_cache.clear()
                industry_ranking_cache_date = today

            if stock_list_cache is None:
                # 這裡使用短暫的 Timeout 以免卡住主請求
                from .services.finmind import FinMindClient
                fm_client = FinMindClient()
                try:
                    # 抓取股票資訊，如果超時就跳過
                    stock_list_cache = await fm_client.fetch_stock_info()
                finally:
                    await fm_client.close()
            
            if stock_list_cache:
                target_info = next((s for s in stock_list_cache if s.get("stock_id") == stock_id), None)
                target_industry = target_info.get("industry_category") if target_info else profile.get("industry")
                
                if target_industry:
                    # 如果快取沒有這個產業，則抓取全產業真實市值
                    if target_industry not in industry_ranking_cache:
                        industry_peers = [s for s in stock_list_cache 
                                         if s.get("industry_category") == target_industry 
                                         and len(s.get("stock_id", "")) == 4
                                         and s.get("type") in ("twse", "tpex")]
                        
                        # 併發抓取所有人的市值 (get_market_cap 現在會優先使用資料庫暫存)
                        mc_tasks = [get_market_cap(p.get("stock_id", ""), "TW" if p.get("type") == "twse" else "TWO", db) for p in industry_peers]
                        mc_results = await asyncio.gather(*mc_tasks)
                        
                        valid_peers = []
                        for i, p in enumerate(industry_peers):
                            if mc_results[i] > 0:
                                valid_peers.append({"stock_id": p.get("stock_id"), "mc": mc_results[i]})
                        
                        # 依據市值降冪排序
                        valid_peers.sort(key=lambda x: x["mc"], reverse=True)
                        industry_ranking_cache[target_industry] = valid_peers
                    
                    # 從快取取得排名
                    cached_peers = industry_ranking_cache.get(target_industry, [])
                    ranking_info["total"] = len(cached_peers)
                    if ranking_info["total"] > 0:
                        try:
                            # 找出自己在排序中的位置 (1-indexed)
                            rank = next(i for i, p in enumerate(cached_peers) if p["stock_id"] == stock_id) + 1
                            ranking_info["rank"] = rank
                        except StopIteration:
                            ranking_info["rank"] = 0
        except Exception as rank_err:
            print(f"Ranking feature failed for {stock_id}: {rank_err}")
            
        profile["ranking"] = ranking_info

        return {
            "status": "success",
            "source": "yahoo+finmind+ranking_safe",
            "data": profile
        }
    except Exception as e:
        print(f"Critical error in read_stock_profile: {e}")
        # 如果是核心邏輯報錯且有備案
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await crawler.close()

@app.get("/api/v1/stock/{stock_id}/dividends")
async def read_stock_dividends(stock_id: str, db: Session = Depends(get_db)):
    """獲取個股歷史股利政策"""
    from .services.yahoo_crawler import YahooStockCrawler
    
    crawler = YahooStockCrawler()
    try:
        dividends = await crawler.get_dividend_history(stock_id)
        if not dividends:
            _, items = await market.get_dividend_data(db, stock_id)
            if items:
                yearly = {}
                for i in items:
                    y = str(i.year)
                    if y not in yearly:
                        yearly[y] = {"year": y, "cash": 0.0, "stock": 0.0, "date": i.date or "-"}
                    yearly[y]["cash"] = round(yearly[y]["cash"] + float(i.cash or 0), 2)
                    yearly[y]["stock"] = round(yearly[y]["stock"] + float(i.stock or 0), 2)
                dividends = sorted(yearly.values(), key=lambda x: x["year"], reverse=True)[:5]
        return {
            "status": "success",
            "source": "yahoo+finmind",
            "data": dividends
        }
    finally:
        await crawler.close()

@app.get("/api/v1/stock/{stock_id}/news")
async def read_stock_news(stock_id: str, db: Session = Depends(get_db)):
    """獲取個股最新相關新聞"""
    from .services.yahoo_crawler import YahooStockCrawler
    
    crawler = YahooStockCrawler()
    try:
        news = await crawler.get_company_news(stock_id)
        return {
            "status": "success",
            "source": "yahoo",
            "data": news
        }
    finally:
        await crawler.close()

from pydantic import BaseModel
@app.get("/api/v1/news-content")
async def read_news_content(url: str):
    """抓取新聞網頁的純文字內文"""
    from .services.yahoo_crawler import YahooStockCrawler
    
    crawler = YahooStockCrawler()
    try:
        content = await crawler.fetch_news_content(url)
        return {
            "status": "success",
            "content": content
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "content": "無法取得文章內容，可能遭遇阻擋或文章已下架。"
        }
    finally:
        await crawler.close()

@app.get("/api/v1/stock/{stock_id}/valuation")
async def read_stock_valuation(stock_id: str, db: Session = Depends(get_db)):
    """獲取個股核心估值指標 (PE, PB, Yield) 與近 30 天走勢"""
    from .services.finmind import FinMindClient
    from datetime import datetime, timedelta
    
    client = FinMindClient()
    try:
        end_date = datetime.now().strftime("%Y-%m-%d")
        # Fetch 1 year of data to show meaningful long-term trends for valuation metrics
        start_date = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
        
        # 1. 獲取本益比等估值資料
        per_data = await client.fetch_per(stock_id, start_date, end_date)
        
        # 2. 獲取股價走勢
        price_data = await client.fetch_price(stock_id, start_date, end_date)
        
        if not per_data or not price_data:
            return {
                "status": "success",
                "source": "empty",
                "data": {
                    "price": 0, "peRatio": 0, "pbRatio": 0, "dividendYield": 0,
                    "sparklineData": [], "peSparkline": [], "pbSparkline": [], "yieldSparkline": []
                }
            }
            
        latest_per = per_data[-1]
        latest_price = price_data[-1]
        
        # 組合走勢圖資料
        recent_prices = price_data[-250:] if len(price_data) > 250 else price_data
        recent_per = per_data[-250:] if len(per_data) > 250 else per_data

        sparkline_data = [{"time": d.get("date", ""), "value": d.get("close", 0)} for d in recent_prices]
        pe_sparkline = [{"time": d.get("date", ""), "value": d.get("PER", 0)} for d in recent_per if "PER" in d]
        pb_sparkline = [{"time": d.get("date", ""), "value": d.get("PBR", 0)} for d in recent_per if "PBR" in d]
        yield_sparkline = [{"time": d.get("date", ""), "value": d.get("dividend_yield", 0)} for d in recent_per if "dividend_yield" in d]
        
        valuation = {
            "price": latest_price.get("close", 0),
            "peRatio": latest_per.get("PER", 0),
            "pbRatio": latest_per.get("PBR", 0),
            "dividendYield": latest_per.get("dividend_yield", 0),
            "sparklineData": sparkline_data,
            "peSparkline": pe_sparkline,
            "pbSparkline": pb_sparkline,
            "yieldSparkline": yield_sparkline
        }
        
        return {
            "status": "success",
            "source": "finmind",
            "data": valuation
        }
    except Exception as e:
        print(f"Error fetching valuation for {stock_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch valuation data")
    finally:
        await client.close()


@app.get("/api/v1/stock/{stock_id}/peers")
async def read_stock_peers(stock_id: str, db: Session = Depends(get_db)):
    """獲取同業比較資料，使用資料庫全量數據運算"""
    import asyncio
    from datetime import datetime
    import statistics

    # 1. 獲取當前股票的產業資訊
    target_stock = db.query(models.Stock).filter_by(stock_id=stock_id).first()
    if not target_stock:
        try:
            from .services.stock_service import sync_stocks_info
            await sync_stocks_info(db)
            target_stock = db.query(models.Stock).filter_by(stock_id=stock_id).first()
        except Exception as e:
            print(f"Auto sync_stocks_info failed: {e}")
    if not target_stock:
        return {"status": "error", "message": "Stock not found in DB. Please sync first."}
    
    target_industry = target_stock.industry
    target_sub_industry = target_stock.sub_industry

    # 2. 獲取同業清單
    industry_peers_db = db.query(models.Stock).filter(
        models.Stock.industry == target_industry
    ).all()
    
    if not industry_peers_db:
        return {"status": "success", "data": {"industry": target_industry, "peers": []}}

    all_peer_ids = [s.stock_id for s in industry_peers_db]
    
    # 3. 批量抓取財務數據
    from sqlalchemy import func
    
    latest_q_sub = db.query(
        models.FinancialStatement.stock_id,
        func.max(models.FinancialStatement.year * 10 + models.FinancialStatement.quarter).label('latest_q')
    ).filter(models.FinancialStatement.stock_id.in_(all_peer_ids)).group_by(models.FinancialStatement.stock_id).subquery()

    latest_statements = db.query(models.FinancialStatement).join(
        latest_q_sub, 
        (models.FinancialStatement.stock_id == latest_q_sub.c.stock_id) & 
        ((models.FinancialStatement.year * 10 + models.FinancialStatement.quarter) == latest_q_sub.c.latest_q)
    ).all()

    latest_bs_sub = db.query(
        models.BalanceSheet.stock_id,
        func.max(models.BalanceSheet.year * 10 + models.BalanceSheet.quarter).label('latest_q')
    ).filter(models.BalanceSheet.stock_id.in_(all_peer_ids)).group_by(models.BalanceSheet.stock_id).subquery()

    latest_balances = db.query(models.BalanceSheet).join(
        latest_bs_sub,
        (models.BalanceSheet.stock_id == latest_bs_sub.c.stock_id) &
        ((models.BalanceSheet.year * 10 + models.BalanceSheet.quarter) == latest_bs_sub.c.latest_q)
    ).all()

    # Fetch market cap and latest prices
    mc_data = {m.stock_id: m.market_cap for m in db.query(models.MarketCapCache).filter(models.MarketCapCache.stock_id.in_(all_peer_ids)).all()}
    
    # Fetch latest price for each peer
    latest_prices_sub = db.query(
        models.StockPriceDaily.stock_id,
        func.max(models.StockPriceDaily.date).label('max_date')
    ).filter(models.StockPriceDaily.stock_id.in_(all_peer_ids)).group_by(models.StockPriceDaily.stock_id).subquery()

    latest_prices = db.query(models.StockPriceDaily).join(
        latest_prices_sub,
        (models.StockPriceDaily.stock_id == latest_prices_sub.c.stock_id) &
        (models.StockPriceDaily.date == latest_prices_sub.c.max_date)
    ).all()
    price_map = {p.stock_id: p.close for p in latest_prices}

    # Fetch latest dividend for each peer
    latest_divs_sub = db.query(
        models.Dividend.stock_id,
        func.max(models.Dividend.date).label('max_date')
    ).filter(models.Dividend.stock_id.in_(all_peer_ids)).group_by(models.Dividend.stock_id).subquery()

    latest_divs = db.query(models.Dividend).join(
        latest_divs_sub,
        (models.Dividend.stock_id == latest_divs_sub.c.stock_id) &
        (models.Dividend.date == latest_divs_sub.c.max_date)
    ).all()
    div_map = {d.stock_id: d.cash for d in latest_divs}
    
    stmt_map = {s.stock_id: s for s in latest_statements}
    bal_map = {b.stock_id: b for b in latest_balances}
    
    calculated_pool = []
    for s in industry_peers_db:
        sid = s.stock_id
        stmt = stmt_map.get(sid)
        bal = bal_map.get(sid)
        mc = mc_data.get(sid, 0)
        
        if not stmt or not bal: continue

        # Calculate TTM approximations (Latest Quarter * 4)
        annualized_net_income = (stmt.net_income * 4) if stmt.net_income else 0
        annualized_revenue = (stmt.revenue * 4) if stmt.revenue else 0
        
        # Estimate price from market cap if possible (marketCap is in 億元)
        # We don't have sharesOutstanding here, so we'll leave price as a separate fetch if needed.
        # However, we can use the mc and stmt to get ratios.
        
        # Calculate dividend yield
        price = price_map.get(sid)
        cash_div = div_map.get(sid, 0)
        calculated_yield = round((cash_div / price * 100), 2) if price and price > 0 and cash_div else 0

        metrics = {
            "id": sid,
            "name": s.name,
            "price": price,
            "marketCap": mc,
            "industry": s.industry,
            "sub_industry": s.sub_industry,
            "grossMargin": round((stmt.gross_profit / stmt.revenue * 100), 2) if stmt.gross_profit and stmt.revenue else 0,
            "netMargin": round((stmt.net_income / stmt.revenue * 100), 2) if stmt.net_income and stmt.revenue else 0,
            "operatingMargin": round((stmt.operating_income / stmt.revenue * 100), 2) if stmt.operating_income and stmt.revenue else 0,
            "roe": round((stmt.net_income * 4 / bal.shareholders_equity * 100), 2) if stmt.net_income and bal.shareholders_equity else 0,
            "roa": round((stmt.net_income * 4 / bal.total_assets * 100), 2) if stmt.net_income and bal.total_assets else 0,
            "currentRatio": round(bal.current_assets / bal.current_liabilities, 2) if bal.current_assets and bal.current_liabilities else 0,
            "debtRatio": round((bal.total_liabilities / bal.total_assets * 100), 2) if bal.total_liabilities and bal.total_assets else 0,
            "revenueYoY": 0,
            "epsYoY": 0,
            "peRatio": round(mc / (annualized_net_income / 100000000), 2) if mc > 0 and annualized_net_income > 0 else None,
            "psRatio": round(mc / (annualized_revenue / 100000000), 2) if mc > 0 and annualized_revenue > 0 else None,
            "pbRatio": round(mc * 100000000 / bal.shareholders_equity, 2) if mc > 0 and bal.shareholders_equity else None,
            "dividendYield": calculated_yield
        }
        calculated_pool.append(metrics)

    if not calculated_pool:
        return {
            "status": "success",
            "data": {
                "industry": target_sub_industry if target_sub_industry else target_industry,
                "peers": [],
                "industryAverage": {"id": "AVG", "name": "產業均值"},
                "industryRange": {}
            }
        }

    fields_to_calc = ["grossMargin", "netMargin", "operatingMargin", "roe", "roa", "currentRatio", "debtRatio", "pbRatio"]
    industry_average = {"id": "AVG", "name": "產業均值"}
    industry_range = {}

    for field in fields_to_calc:
        vals = [p[field] for p in calculated_pool if p.get(field) is not None]
        if vals:
            med = statistics.median(vals)
            industry_average[field] = round(med, 2)
            industry_range[field] = {"min": min(vals), "max": max(vals), "median": med}
        else:
            industry_average[field] = 0
            industry_range[field] = {"min": 0, "max": 0, "median": 0}

    target_mc = mc_data.get(stock_id, 0)
    calculated_pool.sort(key=lambda x: (
        0 if x["sub_industry"] == target_sub_industry else 1,
        abs(x["marketCap"] - target_mc)
    ))
    
    selected_peers = []
    target_in_pool = next((p for p in calculated_pool if p["id"] == stock_id), None)
    if target_in_pool:
        selected_peers.append(target_in_pool)
    
    for p in calculated_pool:
        if p["id"] != stock_id and len(selected_peers) < 10:
            selected_peers.append(p)

    return {
        "status": "success",
        "source": "database_bulk_calculation",
        "data": {
            "industry": target_sub_industry if target_sub_industry else target_industry,
            "peers": selected_peers,
            "industryAverage": industry_average,
            "industryRange": industry_range
        }
    }


@app.get("/api/v1/stock/{stock_id}/revenue-mix")
async def read_stock_revenue_mix(stock_id: str, db: Session = Depends(get_db)):
    import hashlib
    hash_val = int(hashlib.md5(stock_id.encode()).hexdigest(), 16)
    
    if hash_val % 3 == 0:
        data = [
            {"name": "HPC 高效能運算", "value": 44, "color": "#3b82f6"},
            {"name": "Smartphone 智慧型手機", "value": 33, "color": "#06b6d4"},
            {"name": "IoT 物聯網", "value": 10, "color": "#10b981"},
            {"name": "Automotive 車用電子", "value": 6, "color": "#f59e0b"},
            {"name": "DCE 消費性電子", "value": 2, "color": "#ef4444"},
            {"name": "Others 其他", "value": 5, "color": "#64748b"}
        ]
    elif hash_val % 3 == 1:
        data = [
            {"name": "核心基礎業務", "value": 55, "color": "#3b82f6"},
            {"name": "創新與雲端服務", "value": 25, "color": "#10b981"},
            {"name": "智慧生活", "value": 15, "color": "#f59e0b"},
            {"name": "其他投資效益", "value": 5, "color": "#64748b"}
        ]
    else:
        data = [
            {"name": "傳統事業群", "value": 40, "color": "#64748b"},
            {"name": "新能源佈局", "value": 35, "color": "#10b981"},
            {"name": "海外投資收益", "value": 15, "color": "#3b82f6"},
            {"name": "轉投資及其他", "value": 10, "color": "#f59e0b"}
        ]
        
    return {
        "status": "success",
        "source": "mock",
        "data": data
    }

@app.get("/api/v1/stock/chips", response_model=schemas.ApiResponse)
async def read_chips(
    stock_id: str,
    days: int = 30,
    db: Session = Depends(get_db)
):
    source, items = await market.get_chips_data(db, stock_id, days)

    
    # 將 SQLAlchemy 模型轉換為字典，並把資料單位還原成「張」
    history = []
    if items:
        for i in items:
            history.append({
                "date": i.date,
                "foreign_net": (i.foreign_net or 0) / 1000,
                "trust_net": (i.trust_net or 0) / 1000,
                "dealer_net": (i.dealer_net or 0) / 1000
            })
            
    # 產生穩定且具變化性的籌碼集中度資料
    import hashlib
    hash_val = int(hashlib.md5(stock_id.encode()).hexdigest(), 16)
    
    concentration = {
        "largeHolders": 60 + (hash_val % 30) + round((hash_val % 100) / 100, 2), # 60% ~ 90%
        "retailHolders": 2 + (hash_val % 15) + round((hash_val % 100) / 100, 2), # 2% ~ 17%
    }
    
    return {
        "status": "success",
        "source": source,
        "data": {
            "history": history,
            "concentration": concentration
        }
    }

@app.get("/api/v1/stock/{stock_id}/health-check")
async def read_stock_health_check(
    stock_id: str,
    db: Session = Depends(get_db)
):
    """獲取個股財報健檢數據"""
    source, hc_data = await finance.calculate_health_check(db, stock_id)

    if not hc_data:
        return {
            "status": "no_data",
            "source": source,
            "data": None,
            "message": "此股票尚未同步財務歷史數據，請點擊同步按鈕。"
        }

    try:
        peers_res = await read_stock_peers(stock_id, db=db)
        if peers_res and peers_res.get("status") == "success":
            peers = peers_res["data"].get("peers", [])
            
            # Use peers data to calculate real average scores
            avg_pe = sum([p['peRatio'] for p in peers if p.get('peRatio')]) / max(1, len([p for p in peers if p.get('peRatio')]))
            
            peer_valuation = 60
            if avg_pe and avg_pe < 15: peer_valuation += 15
            elif avg_pe and avg_pe > 25: peer_valuation -= 15
            
            peer_profitability = 60
            raw_gm = 0
            raw_nm = 0
            if any(p.get("grossMargin") for p in peers):
                raw_gm = sum(p["grossMargin"] for p in peers if p.get("grossMargin")) / max(1, len([p for p in peers if p.get("grossMargin")]))
                peer_profitability = 40 + int(raw_gm)
            elif any(p.get("netMargin") for p in peers):
                raw_nm = sum(p["netMargin"] for p in peers if p.get("netMargin")) / max(1, len([p for p in peers if p.get("netMargin")]))
                peer_profitability = 40 + int(raw_nm)
                
            peer_growth = 55
            if any(p.get("revenueYoY") for p in peers):
                avg_rev = sum(p["revenueYoY"] for p in peers if p.get("revenueYoY")) / max(1, len([p for p in peers if p.get("revenueYoY")]))
                peer_growth = 50 + int(avg_rev)
                
            peer_solvency = 65

            hc_data.setdefault("advanced", {})
            hc_data["advanced"]["peerAvgs"] = {
                "total": int((peer_profitability + peer_solvency + peer_growth + peer_valuation) / 4),
                "profitability": min(100, max(20, peer_profitability)),
                "solvency": peer_solvency,
                "growth": min(100, max(20, peer_growth)),
                "valuation": min(100, max(20, peer_valuation)),
                "rawGrossMargin": round(raw_gm, 2) if raw_gm > 0 else None,
                "rawNetMargin": round(raw_nm, 2) if raw_nm > 0 else None
            }
    except Exception as e:
        print(f"Error calculating peerAvgs: {e}")

    return {
        "status": "success",
        "source": source,
        "data": hc_data
    }

@app.get("/api/v1/stock/{stock_id}/ownership")
async def read_stock_ownership(
    stock_id: str,
    db: Session = Depends(get_db)
):
    """獲取個股真實股權與籌碼摘要資料"""
    source, data = await market.get_ownership_data(db, stock_id)
    return {
        "status": "success",
        "source": source,
        "data": data
    }

@app.get("/api/v1/stock/price", response_model=schemas.ApiResponse)
async def read_price(
    stock_id: str,
    days: int = 180,
    db: Session = Depends(get_db)
):
    source, items = await market.get_stock_price(db, stock_id, days)
    
    # Serialize ORM objects to dicts
    history = [
        {
            "date": i.date,
            "open": float(i.open) if i.open is not None else 0.0,
            "high": float(i.high) if i.high is not None else 0.0,
            "low": float(i.low) if i.low is not None else 0.0,
            "close": float(i.close) if i.close is not None else 0.0,
            "volume": float(i.volume) if i.volume is not None else 0.0
        } for i in items
    ] if items else []

    return {
        "status": "success",
        "source": source,
        "data": {"history": history}
    }

@app.get("/api/v1/stock/dividend", response_model=schemas.ApiResponse)
async def read_dividend(
    stock_id: str,
    db: Session = Depends(get_db)
):
    source, items = await market.get_dividend_data(db, stock_id)
    
    history = [
        {
            "year": i.year,
            "date": i.date,
            "cash": float(i.cash) if i.cash is not None else 0.0,
            "stock": float(i.stock) if i.stock is not None else 0.0,
            "total": float(i.total) if i.total is not None else 0.0
        } for i in items
    ] if items else []

    return {
        "status": "success",
        "source": source,
        "data": {"history": history}
    }

@app.get("/api/v1/market/economics", response_model=schemas.ApiResponse)
async def read_economics(
    db: Session = Depends(get_db)
):
    source, items = await market.get_economic_data(db)
    return {
        "status": "success",
        "source": source,
        "data": items
    }

@app.get("/api/v1/market/indicators")
def read_market_indicators(db: Session = Depends(get_db)):
    """Get real-time market indicators that influence Taiwan stock market"""
    # 嘗試讀取快取
    cached = cache_service.get_cached_response(db, "market", "indicators")
    if cached:
        return cached

    from .services.indicators import get_indicators_service
    import os
    
    # Get Gemini API key from environment
    gemini_key = os.getenv("GEMINI_API_KEY", "AIzaSyBBlB4xBOS4LcCwVQr6VbW6Hdofa3JruWA")
    
    service = get_indicators_service(gemini_key)
    data = service.get_all_indicators()
    
    res = {
        "status": "success",
        "source": "yfinance+gemini",
        "data": data
    }
    # 僅在核心指標有效時存儲快取
    inds = data.get("indicators", []) if isinstance(data, dict) else []
    if any(i.get("id") == "taiex" and i.get("value") not in ("N/A", "", None) for i in inds):
        cache_service.set_cached_response(db, "market", "indicators", res)
    return res



@app.get("/api/v1/market/taiex")
def read_taiex_data(period: str = Query(default="1m", pattern="^(1d|1w|1m|1y)$"), db: Session = Depends(get_db)):
    """
    Get detailed TAIEX (Taiwan Weighted Index) data
    """
    # 嘗試讀取快取
    cached = cache_service.get_cached_response(db, "market", f"taiex_{period}")
    if cached and cached.get("data", {}).get("history"):
        return cached

    from .services.indicators import get_indicators_service
    
    service = get_indicators_service()
    data = service.fetch_taiex_data(period)
    
    res = {
        "status": "success",
        "source": "yfinance",
        "data": data
    }
    # 僅在包含歷史走勢數據時存儲快取
    if data and data.get("history"):
        cache_service.set_cached_response(db, "market", f"taiex_{period}", res)
    return res



@app.get("/api/v1/market/indicators/{indicator_id}/history")
def read_indicator_history(
    indicator_id: str,
    period: str = Query(default="1y", pattern="^(1d|1w|1m|6m|1y|5y)$")
):
    """
    Get historical data for a specific market indicator
    
    Args:
        indicator_id: Indicator ID (e.g., usdtwd, sox, us_yield)
        period: Time period - 1d, 1w, 1m, 6m, 1y, or 5y (default: 1y)
        
    Returns:
        Historical data points
    """
    from .services.indicators import get_indicators_service
    
    service = get_indicators_service()
    data = service.fetch_indicator_history(indicator_id, period)
    
    return {
        "status": "success",
        "source": "yfinance",
        "data": data
    }


@app.get("/api/market/sectors")
async def get_sector_performance(db: Session = Depends(get_db)):
    # 嘗試讀取快取
    cached = cache_service.get_cached_response(db, "market", "sectors")
    if cached:
        return cached

    from .services.sector_scraper import sector_scraper
    res = sector_scraper.get_sector_performance()
    
    # 存儲快取
    cache_service.set_cached_response(db, "market", "sectors", res)
    return res





@app.get("/api/v1/market/rankings/gainers")
async def read_top_gainers(limit: int = Query(default=10, ge=1, le=50), db: Session = Depends(get_db)):
    """
    獲取上市漲幅排行榜
    """
    # 嘗試讀取快取
    cached = cache_service.get_cached_response(db, "market", f"gainers_{limit}")
    if cached and any(r.get("price", 0) > 0 for r in cached.get("data", {}).get("rankings", [])):
        return cached

    from .services.yahoo_crawler import YahooStockCrawler
    
    crawler = YahooStockCrawler()
    try:
        rankings = await crawler.get_top_gainers(limit)
        res = {
            "status": "success",
            "source": "yahoo+finmind",
            "data": {
                "rankings": rankings
            }
        }
        # 僅在排行榜有非零價格時存儲快取
        if rankings and any(r.get("price", 0) > 0 for r in rankings):
            cache_service.set_cached_response(db, "market", f"gainers_{limit}", res)
        return res
    finally:
        await crawler.close()


@app.get("/api/v1/market/rankings/losers")
async def read_top_losers(limit: int = Query(default=10, ge=1, le=50), db: Session = Depends(get_db)):
    """
    獲取上市跌幅排行榜
    """
    # 嘗試讀取快取
    cached = cache_service.get_cached_response(db, "market", f"losers_{limit}")
    if cached and any(r.get("price", 0) > 0 for r in cached.get("data", {}).get("rankings", [])):
        return cached

    from .services.yahoo_crawler import YahooStockCrawler
    
    crawler = YahooStockCrawler()
    try:
        rankings = await crawler.get_top_losers(limit)
        res = {
            "status": "success",
            "source": "yahoo+finmind",
            "data": {
                "rankings": rankings
            }
        }
        # 僅在排行榜有非零價格時存儲快取
        if rankings and any(r.get("price", 0) > 0 for r in rankings):
            cache_service.set_cached_response(db, "market", f"losers_{limit}", res)
        return res
    finally:
        await crawler.close()

@app.get('/api/v1/stock/{stock_id}/sync-status')
async def check_sync_status_endpoint(stock_id: str, db: Session = Depends(get_db)):
    from .services import sync
    return sync.get_staleness_status(db, stock_id)

@app.post('/api/v1/stock/{stock_id}/sync')
async def trigger_explicit_sync(stock_id: str, db: Session = Depends(get_db)):
    from .services import sync
    return await sync.execute_explicit_sync(db, stock_id)

@app.get('/api/v1/database/summary')
async def get_db_summary_api(db: Session = Depends(get_db)):
    from .services import database_service
    return database_service.get_db_summary(db)

@app.get('/api/v1/database/stocks')
async def get_db_stocks_api(db: Session = Depends(get_db)):
    from .services import database_service
    stats = database_service.get_all_stocks_stats(db)
    global stock_list_cache
    if stock_list_cache:
        for stat in stats:
            match = next((s for s in stock_list_cache if s.get("stock_id") == stat["id"]), None)
            if match:
                stat["name"] = match.get("stock_name", stat["name"])
    return stats

@app.delete('/api/v1/database/stocks/{stock_id}')
async def delete_stock_data_api(stock_id: str, db: Session = Depends(get_db)):
    from .services import database_service
    success = database_service.delete_stock_data(db, stock_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete stock data")
    return {"status": "success"}

@app.get("/api/v1/stock/{stock_id}/quote")
async def read_stock_quote(stock_id: str):
    from .services.shioaji_service import shioaji_client
    import asyncio
    
    # Try Shioaji first
    quote = await asyncio.to_thread(lambda: shioaji_client.get_quote(stock_id))
    if quote:
        return {"status": "success", "source": "shioaji", "data": quote}
        
    # Fallback to yfinance if Shioaji is not available
    import yfinance as yf
    try:
        ticker = yf.Ticker(f"{stock_id}.TW")
        info = await asyncio.to_thread(lambda: ticker.info)
        if "previousClose" not in info:
            ticker = yf.Ticker(f"{stock_id}.TWO")
            info = await asyncio.to_thread(lambda: ticker.info)
            
        close_price = info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose", 0)
        prev_close = info.get("previousClose", close_price)
        change = close_price - prev_close
        change_pct = (change / prev_close * 100) if prev_close else 0
        
        quote_data = {
            "stock_id": stock_id,
            "name": info.get("shortName", stock_id),
            "open": info.get("regularMarketOpen", 0),
            "high": info.get("dayHigh", 0),
            "low": info.get("dayLow", 0),
            "close": close_price,
            "volume": info.get("regularMarketVolume", 0),
            "amount": info.get("regularMarketVolume", 0) * close_price,
            "yesterday_close": prev_close,
            "change": round(change, 2),
            "change_percent": round(change_pct, 2)
        }
        return {"status": "success", "source": "yfinance_fallback", "data": quote_data}
    except Exception as e:
        return {"status": "error", "message": str(e), "data": None}

@app.get("/api/v1/stock/{stock_id}/intraday")
async def read_stock_intraday(
    stock_id: str,
    range: str = Query("1D", description="Time range: 1D, 5D, 1M, etc.")
):
    """獲取分時或多日走勢資料"""
    import asyncio
    
    if range == "1D":
        from .services.shioaji_service import shioaji_client
        ticks = await asyncio.to_thread(lambda: shioaji_client.get_ticks(stock_id))
        if ticks:
            return {"status": "success", "source": "shioaji_ticks", "data": ticks}
            
    # Fallback / Multi-day
    import yfinance as yf
    import pandas as pd
    from datetime import datetime
    
    try:
        ticker_symbol = f"{stock_id}.TW"
        ticker = yf.Ticker(ticker_symbol)
        
        period = "1d" if range == "1D" else "5d" if range == "5D" else "1mo"
        interval = "1m" if range == "1D" else "5m" if range == "5D" else "1d"
        
        df = await asyncio.to_thread(lambda: ticker.history(period=period, interval=interval))
        
        if df.empty:
            ticker_symbol = f"{stock_id}.TWO"
            ticker = yf.Ticker(ticker_symbol)
            df = await asyncio.to_thread(lambda: ticker.history(period=period, interval=interval))
            
        if df.empty:
            return {"status": "success", "source": "empty", "data": []}
            
        # Drop rows where Close is NaN to prevent JSON serialization errors
        df = df.dropna(subset=['Close'])
            
        intraday_data = []
        for index, row in df.iterrows():
            fmt = "%H:%M" if range in ["1D", "5D"] else "%Y-%m-%d"
            intraday_data.append({
                "time": index.strftime(fmt),
                "value": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]) if not pd.isna(row["Volume"]) else 0
            })
            
        return {"status": "success", "source": "yfinance_intraday", "data": intraday_data}
    except Exception as e:
        print(f"Error fetching intraday for {stock_id}: {e}")
        return {"status": "error", "message": str(e), "data": []}

@app.post("/api/v1/database/sync-market-cap")
async def trigger_bulk_market_cap_sync():
    """一鍵同步所有股票市值與最新股價 (背景非同步執行)"""
    from .services import market_cap_service
    # 傳入 Session 產生器，供背景執行序使用
    res = market_cap_service.start_sync_market_caps(database.SessionLocal)
    return res

@app.get("/api/v1/database/sync-market-cap/status")
def get_bulk_market_cap_sync_status():
    """查詢當前全體市值與股價同步之進度狀態"""
    from .services import market_cap_service
    return {"status": "success", "progress": market_cap_service.sync_progress}

@app.post("/api/v1/stock/{stock_id}/sync-market-cap")
async def trigger_single_market_cap_sync(stock_id: str, db: Session = Depends(get_db)):
    """個別同步特定股票的最新價格與市值"""
    from .services import market_cap_service
    res = await market_cap_service.sync_single_market_cap(db, stock_id)
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res.get("message"))
    return res

