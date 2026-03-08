from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, schemas, database
from .services import finance

# Create DB tables
models.Base.metadata.create_all(bind=database.engine)

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

from .services import market, finance

@app.get("/api/v1/stock/{stock_id}/profile")
async def read_stock_profile(stock_id: str):
    """獲取個別公司的詳細資料"""
    from .services.yahoo_crawler import YahooStockCrawler
    
    crawler = YahooStockCrawler()
    try:
        profile = await crawler.get_company_profile(stock_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Company profile not found")
            
        return {
            "status": "success",
            "source": "yahoo+yfinance",
            "data": profile
        }
    finally:
        await crawler.close()

@app.get("/api/v1/stock/{stock_id}/dividends")
async def read_stock_dividends(stock_id: str):
    """獲取個股歷史股利政策"""
    from .services.yahoo_crawler import YahooStockCrawler
    
    crawler = YahooStockCrawler()
    try:
        dividends = await crawler.get_dividend_history(stock_id)
        return {
            "status": "success",
            "source": "yahoo",
            "data": dividends
        }
    finally:
        await crawler.close()

@app.get("/api/v1/stock/{stock_id}/news")
async def read_stock_news(stock_id: str):
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
async def read_stock_valuation(stock_id: str):
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
            # 如果 FinMind 沒有資料，回傳基本格式防止前端崩潰
            return {
                "status": "success",
                "source": "empty",
                "data": {
                    "price": 0,
                    "peRatio": 0,
                    "pbRatio": 0,
                    "dividendYield": 0,
                    "sparklineData": []
                }
            }
            
        latest_per = per_data[-1]
        latest_price = price_data[-1]
        
        # 組合走勢圖資料 (取近 1 年/250 筆 以展現具意義的估值河流圖趨勢)
        recent_prices = price_data[-250:] if len(price_data) > 250 else price_data
        recent_per = per_data[-250:] if len(per_data) > 250 else per_data

        sparkline_data = [
            {"time": d.get("date", ""), "value": d.get("close", 0)}
            for d in recent_prices
        ]
        
        pe_sparkline = [
            {"time": d.get("date", ""), "value": d.get("PER", 0)}
            for d in recent_per if "PER" in d
        ]
        
        pb_sparkline = [
            {"time": d.get("date", ""), "value": d.get("PBR", 0)}
            for d in recent_per if "PBR" in d
        ]
        
        yield_sparkline = [
            {"time": d.get("date", ""), "value": d.get("dividend_yield", 0)}
            for d in recent_per if "dividend_yield" in d
        ]
        
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


@app.get("/api/v1/stock/{stock_id}/revenue-mix")
async def read_stock_revenue_mix(stock_id: str):
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
    return {
        "status": "success",
        "source": source,
        "data": {"history": items} # Simplified response structure
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
    return {
        "status": "success",
        "source": source,
        "data": {"history": items}
    }

@app.get("/api/v1/stock/dividend", response_model=schemas.ApiResponse)
async def read_dividend(
    stock_id: str,
    db: Session = Depends(get_db)
):
    source, items = await market.get_dividend_data(db, stock_id)
    return {
        "status": "success",
        "source": source,
        "data": {"history": items}
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
def read_market_indicators():
    """Get real-time market indicators that influence Taiwan stock market"""
    from .services.indicators import get_indicators_service
    import os
    
    # Get Gemini API key from environment
    gemini_key = os.getenv("GEMINI_API_KEY", "AIzaSyBBlB4xBOS4LcCwVQr6VbW6Hdofa3JruWA")
    
    service = get_indicators_service(gemini_key)
    data = service.get_all_indicators()
    
    return {
        "status": "success",
        "source": "yfinance+gemini",
        "data": data
    }


@app.get("/api/v1/market/taiex")
def read_taiex_data(period: str = Query(default="1m", pattern="^(1d|1w|1m|1y)$")):
    """
    Get detailed TAIEX (Taiwan Weighted Index) data
    
    Args:
        period: Time period - 1d, 1w, 1m, or 1y (default: 1m)
    
    Returns:
        Current TAIEX data and historical data for charting
    """
    from .services.indicators import get_indicators_service
    
    service = get_indicators_service()
    data = service.fetch_taiex_data(period)
    
    return {
        "status": "success",
        "source": "yfinance",
        "data": data
    }


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
async def get_sector_performance():
    from .services.sector_scraper import sector_scraper
    return sector_scraper.get_sector_performance()


@app.get("/api/market/heatmap")
async def get_real_sector_heatmap():
    from .services.sector_service import sector_service
    # await the async method directly
    data = await sector_service.get_sector_heatmap_async()
    return {
        "status": "success",
        "source": "finmind",
        "data": data
    }


@app.get("/api/v1/market/rankings/gainers")
async def read_top_gainers(limit: int = Query(default=10, ge=1, le=50)):
    """
    獲取上市漲幅排行榜
    
    Args:
        limit: 要返回的股票數量（預設10，最多50）
    
    Returns:
        漲幅排行榜股票列表
    """
    from .services.yahoo_crawler import YahooStockCrawler
    
    crawler = YahooStockCrawler()
    try:
        rankings = await crawler.get_top_gainers(limit)
        return {
            "status": "success",
            "source": "yahoo+finmind",
            "data": {
                "rankings": rankings
            }
        }
    finally:
        await crawler.close()


@app.get("/api/v1/market/rankings/losers")
async def read_top_losers(limit: int = Query(default=10, ge=1, le=50)):
    """
    獲取上市跌幅排行榜
    
    Args:
        limit: 要返回的股票數量（預設10，最多50）
    
    Returns:
        跌幅排行榜股票列表
    """
    from .services.yahoo_crawler import YahooStockCrawler
    
    crawler = YahooStockCrawler()
    try:
        rankings = await crawler.get_top_losers(limit)
        return {
            "status": "success",
            "source": "yahoo+finmind",
            "data": {
                "rankings": rankings
            }
        }
    finally:
        await crawler.close()
