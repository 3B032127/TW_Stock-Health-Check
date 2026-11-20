import asyncio
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, schemas, database
from .services import finance, market, cache_service
from .api import gs_quant_routes
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

# Auto-migration for shares_outstanding column & V3.4 five-mode prediction tables
def upgrade_db_schema():
    from sqlalchemy import text
    from .services.prediction_service import ensure_prediction_schema

    ensure_prediction_schema(database.engine)
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
async def read_stock_list(db: Session = Depends(get_db)):
    """獲取台股所有股票代碼與名稱清單（優先使用本地資料庫，確保秒開且不消耗 API 額度）"""
    global stock_list_cache
    if stock_list_cache is not None and len(stock_list_cache) > 0 and "type" in stock_list_cache[0]:
        return {
            "status": "success",
            "source": "finmind_cache",
            "data": stock_list_cache
        }

    # 1. 優先從本地資料庫 stocks 表讀取，立即可用且不卡頓
    from . import models
    db_stocks = db.query(models.Stock).all()
    if db_stocks:
        stock_list_cache = [
            {
                "stock_id": s.stock_id,
                "stock_name": s.name,
                "industry_category": s.industry,
                "type": s.market_type,
                "market": s.market_type
            }
            for s in db_stocks
        ]
        return {
            "status": "success",
            "source": "database",
            "data": stock_list_cache
        }
        
    # 2. 資料庫若空，回退透過 FinMind API 獲取
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
    """獲取個別公司的詳細資料（以本地資料庫優先計算市值排名，避免任何 API 阻塞）"""
    from .services.yahoo_crawler import YahooStockCrawler
    from . import models
    
    crawler = YahooStockCrawler()
    try:
        # 1. 嘗試獲取公司基本資訊
        profile = await crawler.get_company_profile(stock_id)
        if not profile:
            # 若爬蟲暫態失敗，直接由本地資料庫 fallback 生成基本 profile
            target_stock = db.query(models.Stock).filter_by(stock_id=stock_id).first()
            if target_stock:
                profile = {
                    'id': stock_id,
                    'name': target_stock.name,
                    'industry': target_stock.industry or '其他',
                    'sector': target_stock.industry or '其他',
                    'description': f"{target_stock.name} ({stock_id})，主要營運領域為{target_stock.industry or '其他'}。",
                    'chairman': 'N/A',
                    'ceo': 'N/A',
                    'foundedDate': 'N/A',
                    'listingDate': 'N/A',
                    'capital': 'N/A',
                    'website': 'N/A',
                    'marketCap': 'N/A',
                    'fullTimeEmployees': 'N/A',
                    'financialHighlights': {
                        'monthlyRevenue': {'value': 'N/A', 'yoy': 0},
                        'eps': 'N/A',
                        'grossMargin': 0,
                        'operatingMargin': 0,
                        'netMargin': 0
                    }
                }
            else:
                raise HTTPException(status_code=404, detail="Company profile not found")
            
        # 2. 產業地位與市值排名：100% 透過本地 SQLite 資料庫高速計算，零外部 API 依賴
        target_stock = db.query(models.Stock).filter_by(stock_id=stock_id).first()
        target_industry = target_stock.industry if (target_stock and target_stock.industry) else profile.get("industry", "其他")
        profile["industry"] = target_industry
        
        # 產業名稱標準化與模糊匹配（解決 Yahoo「半導體」與資料庫「半導體業」之字尾差異）
        base_ind = target_industry.replace("業", "") if target_industry.endswith("業") else target_industry
        industry_rankings = db.query(
            models.Stock.stock_id,
            models.MarketCapCache.market_cap
        ).outerjoin(
            models.MarketCapCache, models.Stock.stock_id == models.MarketCapCache.stock_id
        ).filter(
            models.Stock.industry.like(f"%{base_ind}%")
        ).order_by(
            models.MarketCapCache.market_cap.desc().nullslast()
        ).all()

        total = len(industry_rankings)
        rank = 0
        if total > 0:
            try:
                rank = next(i for i, r in enumerate(industry_rankings) if r[0] == stock_id) + 1
            except StopIteration:
                rank = 0
                
        ranking_info = {
            "rank": rank,
            "total": total,
            "industry": target_industry
        }
        profile["ranking"] = ranking_info

        # 3. 補強 financialHighlights：若爬蟲缺少數據，優先由本地資料庫財報補齊，保證完整顯示
        fh = profile.get("financialHighlights", {})
        latest_reports = db.query(models.FinancialStatement).filter_by(stock_id=stock_id)\
                           .order_by(models.FinancialStatement.year.desc(), models.FinancialStatement.quarter.desc()).limit(5).all()
        if latest_reports:
            latest_is = latest_reports[0]
            if fh.get("monthlyRevenue", {}).get("value") == 'N/A' and latest_is.revenue and latest_is.revenue > 0:
                rev_in_hundred_million = latest_is.revenue / 100000000
                yoy = 0.0
                prev_is = next((r for r in latest_reports if r.year == latest_is.year - 1 and r.quarter == latest_is.quarter), None)
                if prev_is and prev_is.revenue and prev_is.revenue > 0:
                    yoy = round(((latest_is.revenue - prev_is.revenue) / prev_is.revenue) * 100, 2)
                fh["monthlyRevenue"] = {
                    "value": f"{rev_in_hundred_million:,.2f}",
                    "yoy": yoy
                }
            if fh.get("eps") in ('N/A', None, 0, '0', '0.00'):
                valid_eps = [r.eps for r in latest_reports[:4] if r.eps is not None]
                ttm_eps = sum(valid_eps) if len(valid_eps) == 4 else (sum(valid_eps) * (4 / len(valid_eps)) if valid_eps else None)
                if ttm_eps is not None:
                    fh["eps"] = f"{ttm_eps:.2f}"
            if fh.get("grossMargin", 0) == 0 and latest_is.gross_profit and latest_is.revenue:
                fh["grossMargin"] = round((latest_is.gross_profit / latest_is.revenue) * 100, 2)
            if fh.get("operatingMargin", 0) == 0 and latest_is.operating_income and latest_is.revenue:
                fh["operatingMargin"] = round((latest_is.operating_income / latest_is.revenue) * 100, 2)
            if fh.get("netMargin", 0) == 0 and latest_is.net_income and latest_is.revenue:
                fh["netMargin"] = round((latest_is.net_income / latest_is.revenue) * 100, 2)
        profile["financialHighlights"] = fh

        return {
            "status": "success",
            "source": "database+profile",
            "data": profile
        }
    except Exception as e:
        print(f"Critical error in read_stock_profile: {e}")
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
    """獲取個股核心估值指標 (PE, PB, Yield) 與股價走勢（優先自本地 SQLite 快速計算，零外部 API 依賴）"""
    from . import models
    from datetime import datetime, timedelta

    # 1. 優先從本地資料庫讀取股價歷史與財務紀錄
    prices = db.query(models.StockPriceDaily).filter_by(stock_id=stock_id)\
               .order_by(models.StockPriceDaily.date.asc()).all()

    if not prices or len(prices) == 0:
        # 本地若無股價，呼叫 market.get_stock_price（具備 yfinance 自動備援入庫，不耗費 FinMind 額度）
        try:
            await market.get_stock_price(db, stock_id, days=365, force_sync=False)
            prices = db.query(models.StockPriceDaily).filter_by(stock_id=stock_id)\
                       .order_by(models.StockPriceDaily.date.asc()).all()
        except Exception as e:
            print(f"Error auto-fetching prices for {stock_id}: {e}")

    if prices and len(prices) > 0:
        latest_price = float(prices[-1].close or 0)
        recent_prices = prices[-250:] if len(prices) > 250 else prices
        sparkline_data = [{"time": p.date, "value": float(p.close or 0)} for p in recent_prices]

        # 計算近四季 EPS (TTM EPS)
        recent_reports = db.query(models.FinancialStatement).filter_by(stock_id=stock_id)\
                           .order_by(models.FinancialStatement.year.desc(), models.FinancialStatement.quarter.desc()).limit(4).all()
        valid_eps = [r.eps for r in recent_reports if r.eps is not None]
        ttm_eps = sum(valid_eps) if len(valid_eps) == 4 else (sum(valid_eps) * (4 / len(valid_eps)) if valid_eps else None)
        pe_ratio = round(latest_price / ttm_eps, 2) if (ttm_eps and ttm_eps > 0) else 0.0

        pe_sparkline = [
            {"time": p.date, "value": round(float(p.close) / ttm_eps, 2)}
            for p in recent_prices
        ] if (ttm_eps and ttm_eps > 0) else []

        # 計算每股淨值 (BVPS) 與股價淨值比 (P/B)
        latest_bs = db.query(models.BalanceSheet).filter_by(stock_id=stock_id)\
                      .order_by(models.BalanceSheet.year.desc(), models.BalanceSheet.quarter.desc()).first()
        mc_cache = db.query(models.MarketCapCache).filter_by(stock_id=stock_id).first()

        pb_ratio = 0.0
        pb_sparkline = []
        if latest_bs and latest_bs.shareholders_equity and mc_cache and mc_cache.market_cap and latest_price > 0:
            total_shares = (mc_cache.market_cap * 100_000_000) / latest_price
            bvps = latest_bs.shareholders_equity / total_shares if total_shares > 0 else 0
            if bvps > 0:
                pb_ratio = round(latest_price / bvps, 2)
                pb_sparkline = [{"time": p.date, "value": round(float(p.close) / bvps, 2)} for p in recent_prices]

        # 計算現金殖利率 (近四季或近一年配息加總)
        recent_divs = db.query(models.Dividend).filter_by(stock_id=stock_id)\
                        .order_by(models.Dividend.date.desc()).limit(4).all()
        total_cash_div = sum(d.cash for d in recent_divs if d.cash is not None)
        dividend_yield = round((total_cash_div / latest_price) * 100, 2) if (total_cash_div > 0 and latest_price > 0) else 0.0

        yield_sparkline = [
            {"time": p.date, "value": round((total_cash_div / float(p.close)) * 100, 2)}
            for p in recent_prices
        ] if (total_cash_div > 0) else []

        valuation = {
            "price": latest_price,
            "peRatio": pe_ratio,
            "pbRatio": pb_ratio,
            "dividendYield": dividend_yield,
            "sparklineData": sparkline_data,
            "peSparkline": pe_sparkline,
            "pbSparkline": pb_sparkline,
            "yieldSparkline": yield_sparkline
        }

        return {
            "status": "success",
            "source": "database",
            "data": valuation
        }

    # 2. 本地若無股價資料，回退請求 FinMind API
    from .services.finmind import FinMindClient
    client = FinMindClient()
    try:
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
        per_data = await client.fetch_per(stock_id, start_date, end_date)
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
        return {
            "status": "success",
            "source": "fallback_empty",
            "data": {
                "price": 0, "peRatio": 0, "pbRatio": 0, "dividendYield": 0,
                "sparklineData": [], "peSparkline": [], "pbSparkline": [], "yieldSparkline": []
            }
        }
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
    from .services.indicators import get_indicators_service
    import os

    bucket, _, ttl = cache_service.get_multi_market_cache_bucket(["TW", "US", "JP"], live_ttl=60, closed_ttl=86400)

    def _compute():
        gemini_key = os.getenv("GEMINI_API_KEY", "AIzaSyBBlB4xBOS4LcCwVQr6VbW6Hdofa3JruWA")
        service = get_indicators_service(gemini_key)
        data = service.get_all_indicators()
        return {
            "status": "success",
            "source": "yfinance+gemini",
            "data": data
        }

    def _valid(res: dict) -> bool:
        inds = res.get("data", {}).get("indicators", []) if isinstance(res, dict) else []
        ids = {i.get("id") for i in inds}
        return (
            {"vix", "jp_rate", "us_nfp"}.issubset(ids)
            and any(i.get("id") in ("taiex", "usdtwd") and i.get("value") not in ("N/A", "", None) for i in inds)
        )

    res = cache_service.get_or_set_cache(
        f"market:indicators:{bucket}",
        ttl,
        _compute,
        db=db,
        validator_fn=_valid,
    )
    return res or {"status": "success", "source": "yfinance+gemini", "data": {"updated_at": "", "indicators": []}}


@app.get("/api/v1/market/global-indices")
def read_global_indices():
    """Bundle of TW/US/JP core indices (summary list + preloaded 1D chart details)"""
    from .services.global_indices import list_indices_bundle
    return {"status": "success", "source": "yfinance", "data": list_indices_bundle()}


@app.get("/api/v1/market/global-indices/{index_id}")
def read_global_index(index_id: str, period: str = Query(default="1d", pattern="^(1d|1w|1m|1y)$")):
    """Detail + chart data of a single global index (1d returns trading-session x offsets)"""
    from .services.global_indices import get_index, INDEX_CONFIG
    if index_id not in INDEX_CONFIG:
        raise HTTPException(status_code=404, detail="Unknown index")
    data = get_index(index_id, period)
    if not data:
        raise HTTPException(status_code=502, detail="Index data unavailable")
    return {"status": "success", "source": "yfinance", "data": data}


@app.get("/api/v1/market/adr")
def read_adr_monitor(db: Session = Depends(get_db)):
    """Taiwan ADR international premium/discount monitor (TSM, ASX, UMC, CHT)"""
    from .services.global_rankings import get_adr_monitor
    data = get_adr_monitor(db)
    return {"status": "success", "source": "yfinance+sqlite", "data": data}


@app.get("/api/v1/market/global-rankings")
def read_global_rankings(
    category: str = Query(default="all", pattern="^(all|tw_core|tw_all|us|jp|semi)$"),
    limit: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db),
):
    """Multi-market Top Gainers & Losers rankings (or all 5 categories preloaded)"""
    from .services.global_rankings import get_global_rankings, get_all_global_rankings
    if category == "all":
        data = get_all_global_rankings(limit=limit, db=db)
    else:
        data = get_global_rankings(category=category, limit=limit, db=db)
    return {"status": "success", "source": "yfinance+sqlite", "data": data}


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
async def read_stock_quote(stock_id: str, db: Session = Depends(get_db)):
    from .services.shioaji_service import shioaji_client
    from . import models
    import asyncio
    
    # 1. 嘗試 Shioaji 即時報價
    try:
        quote = await asyncio.to_thread(lambda: shioaji_client.get_quote(stock_id))
        if quote and quote.get("close", 0) > 0:
            return {"status": "success", "source": "shioaji", "data": quote}
    except Exception:
        pass
        
    # 2. 嘗試 yfinance 報價
    import yfinance as yf
    try:
        ticker = yf.Ticker(f"{stock_id}.TW")
        info = await asyncio.to_thread(lambda: ticker.info)
        if "previousClose" not in info:
            ticker = yf.Ticker(f"{stock_id}.TWO")
            info = await asyncio.to_thread(lambda: ticker.info)
            
        close_price = info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose", 0)
        if close_price and close_price > 0:
            prev_close = info.get("previousClose", close_price)
            change = close_price - prev_close
            change_pct = (change / prev_close * 100) if prev_close else 0
            
            quote_data = {
                "stock_id": stock_id,
                "name": info.get("shortName", stock_id),
                "open": info.get("regularMarketOpen", close_price),
                "high": info.get("dayHigh", close_price),
                "low": info.get("dayLow", close_price),
                "close": close_price,
                "volume": info.get("regularMarketVolume", 0),
                "amount": info.get("regularMarketVolume", 0) * close_price,
                "yesterday_close": prev_close,
                "change": round(change, 2),
                "change_percent": round(change_pct, 2)
            }
            return {"status": "success", "source": "yfinance_fallback", "data": quote_data}
    except Exception:
        pass

    # 3. 兜底回退：從本地資料庫 stock_prices_daily 取得最新真實收盤價
    recent_prices = db.query(models.StockPriceDaily).filter_by(stock_id=stock_id)\
                      .order_by(models.StockPriceDaily.date.desc()).limit(2).all()
    if recent_prices:
        latest_p = recent_prices[0]
        prev_p = recent_prices[1] if len(recent_prices) > 1 else recent_prices[0]
        change = (latest_p.close - prev_p.close) if (latest_p.close and prev_p.close) else 0.0
        change_pct = ((change / prev_p.close) * 100) if (prev_p.close and prev_p.close > 0) else 0.0
        
        target_stock = db.query(models.Stock).filter_by(stock_id=stock_id).first()
        name = target_stock.name if target_stock else stock_id
        
        quote_data = {
            "stock_id": stock_id,
            "name": name,
            "open": latest_p.open or latest_p.close,
            "high": latest_p.high or latest_p.close,
            "low": latest_p.low or latest_p.close,
            "close": latest_p.close,
            "volume": latest_p.volume or 0,
            "amount": (latest_p.volume or 0) * (latest_p.close or 0),
            "yesterday_close": prev_p.close,
            "change": round(change, 2),
            "change_percent": round(change_pct, 2)
        }
        return {"status": "success", "source": "database_fallback", "data": quote_data}

    return {"status": "error", "message": "No quote data available", "data": None}

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


@app.get("/api/v1/stocks/{symbol}/prediction")
@app.get("/api/v1/stock/{symbol}/prediction")
def read_stock_prediction(symbol: str, db: Session = Depends(get_db)):
    """零延遲讀取個股雙模型融合預測與近30日滾動回測結果 (Kronos + TimesFM 2.5)"""
    from .services import prediction_service

    data = prediction_service.get_stock_prediction(db, symbol)
    if not data:
        raise HTTPException(
            status_code=404,
            detail=f"尚無股票 {symbol} 足夠的歷史 K 線資料以產生雙模型預測",
        )
    return {"status": "success", **data}


# Mount Goldman Sachs gs-quant routes
app.include_router(gs_quant_routes.router, prefix="/api/v1/gs_quant")
app.include_router(gs_quant_routes.router, prefix="/api/gs_quant")
app.include_router(gs_quant_routes.router, prefix="/gs_quant")


@app.on_event("startup")
def start_dashboard_cache_warmer():
    """背景預熱首頁四大區塊快取（若 SQLite 尚未有當日快取則非同步預先建置）"""
    import threading

    def _warm():
        from .services.global_indices import list_indices_bundle
        from .services.global_rankings import get_adr_monitor, get_all_global_rankings

        db = database.SessionLocal()
        try:
            for name, task in [
                ("indicators", lambda: read_market_indicators(db)),
                ("global_indices", lambda: list_indices_bundle()),
                ("adr_monitor", lambda: get_adr_monitor(db)),
                ("global_rankings", lambda: get_all_global_rankings(limit=5, db=db)),
            ]:
                try:
                    task()
                except Exception as exc:
                    print(f"Dashboard cache warmer ({name}) warning: {exc}")
        finally:
            db.close()

    threading.Thread(target=_warm, daemon=True, name="dashboard-cache-warmer").start()


