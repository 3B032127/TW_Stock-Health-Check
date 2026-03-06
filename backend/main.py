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
