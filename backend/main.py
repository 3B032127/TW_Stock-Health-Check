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


@app.get("/api/v1/stock/{stock_id}/peers")
async def read_stock_peers(stock_id: str):
    """獲取同業比較資料"""
    global stock_list_cache
    from .services.finmind import FinMindClient
    import asyncio
    from datetime import datetime, timedelta
    
    # 1. 確保有 stock_list
    if stock_list_cache is None:
        client = FinMindClient()
        try:
            data = await client.fetch_stock_info()
            if data:
                stock_list_cache = data
        except Exception as e:
            print(f"Error fetching stock info list: {e}")
        finally:
            await client.close()
            
    if not stock_list_cache:
        return {"status": "error", "message": "股票清單獲取失敗", "data": {"industry": "未知", "peers": []}}
        
    # 2. 找到目標股票的產業
    target_industry = None
    target_info = None
    for stock in stock_list_cache:
        if stock.get("stock_id") == stock_id:
            target_industry = stock.get("industry_category")
            target_info = stock
            break
            
    if not target_industry:
        return {"status": "success", "source": "finmind", "data": {"industry": "未知 (或查無此股)", "peers": []}}
        
    # 3. 找出同產業的股票
    same_industry_peers = [s for s in stock_list_cache if s.get("industry_category") == target_industry and len(s.get("stock_id", "")) == 4 and s.get("type") in ("twse", "tpex")]
    
    candidate_peers = []
    
    for p in same_industry_peers:
        if p.get("stock_id") != stock_id and p not in candidate_peers:
            candidate_peers.append(p)
        # 抽取 25 檔同業，因為其中可能包含下市股票 (如 5854, 6012 等零報價標的)
        if len(candidate_peers) >= 25:
            break
            
    # 4. 針對這些股票抓取股價與 PE
    client = FinMindClient()
    try:
        end_date = datetime.now().strftime("%Y-%m-%d")
        # 將追溯期從 30 天延長至 60 天，以便涵蓋流動性極低的冷門股
        start_date = (datetime.now() - timedelta(days=60)).strftime("%Y-%m-%d")
        
        async def fetch_stock_data(peer_id):
            per_data = await client.fetch_per(peer_id, start_date, end_date)
            price_data = await client.fetch_price(peer_id, start_date, end_date)
            
            latest_price = price_data[-1].get("close", 0) if price_data else 0
            
            # 若為 0 代表該股可能已下市或完全無流動性，拋出異常以便後續過濾
            if latest_price <= 0:
                raise ValueError(f"Stock {peer_id} has no valid price.")
            
            # 尋找最近一筆有效的 PER, PBR, Yield
            latest_per = 0
            latest_pbr = 0
            latest_yield = 0
            
            if per_data:
                # 由後往前找，有時候可能單天沒資料
                for d in reversed(per_data):
                    if d.get("PER", 0) > 0 and latest_per == 0:
                        latest_per = d.get("PER", 0)
                    if d.get("PBR", 0) > 0 and latest_pbr == 0:
                        latest_pbr = d.get("PBR", 0)
                    if d.get("dividend_yield", 0) > 0 and latest_yield == 0:
                        latest_yield = d.get("dividend_yield", 0)
                    
                    if latest_per and latest_pbr and latest_yield:
                        break
                        
                # 如果仍為 0，直接取最後一筆的數值 (可能本身就是0)
                if latest_per == 0 and per_data:
                    latest_per = per_data[-1].get("PER", 0)
                if latest_pbr == 0 and per_data:
                    latest_pbr = per_data[-1].get("PBR", 0)
                if latest_yield == 0 and per_data:
                    latest_yield = per_data[-1].get("dividend_yield", 0)
            
            import random
            market_cap = round(random.uniform(100.0, 5000.0), 1)
            ps_ratio = round(random.uniform(0.5, 10.0), 2)
            
            return {
                "id": peer_id,
                "price": latest_price,
                "peRatio": latest_per if latest_per > 0 else None,
                "pbRatio": latest_pbr,
                "dividendYield": latest_yield,
                "marketCap": market_cap,
                "psRatio": ps_ratio
            }
            
        # 把 target 獨立算進第一位，再加入候選名單
        tasks = [fetch_stock_data(stock_id)]
        tasks.extend([fetch_stock_data(p["stock_id"]) for p in candidate_peers])
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        peer_data_list = []
        
        for i, res in enumerate(results):
            import random
            
            current_peer_info = target_info if i == 0 else candidate_peers[i - 1]
            
            if isinstance(res, Exception):
                print(f"Skipping peer {current_peer_info.get('stock_id')} due to error/no price: {res}")
                # 如果是目標自己的查詢報出了異常，保留帶 0 的紀錄避免徹底炸裂
                if i == 0:
                    peer_data = {
                        "id": current_peer_info.get("stock_id"),
                        "name": current_peer_info.get("stock_name", "未知"),
                        "price": 0,
                        "peRatio": None,
                        "pbRatio": 0,
                        "dividendYield": 0,
                        "marketCap": 0,
                        "psRatio": 0
                    }
                else:
                    # 如果不是主股票又沒有價格，直接拋棄這個同業名單
                    continue
            else:
                peer_data = {
                    "id": res["id"],
                    "name": current_peer_info.get("stock_name", "未知"),
                    "price": res.get("price", 0),
                    "peRatio": res.get("peRatio"),
                    "pbRatio": res.get("pbRatio", 0),
                    "dividendYield": res.get("dividendYield", 0),
                    "marketCap": res.get("marketCap", 0),
                    "psRatio": res.get("psRatio", 0)
                }
                
            # Appending Industry Mock Data
            if target_industry == '營建業':
                peer_data["contractLiabilitiesYoY"] = round(random.uniform(-10.0, 30.0), 2)
                peer_data["debtRatio"] = round(random.uniform(40.0, 80.0), 2)
                peer_data['netMargin'] = round(random.uniform(10.0, 30.0), 2)
                peer_data['projectGrossMargin'] = round(random.uniform(20.0, 45.0), 2)
                peer_data['inventoryToAssetsRatio'] = round(random.uniform(30.0, 70.0), 2)
            elif target_industry == '半導體業':
                peer_data["grossMargin"] = round(random.uniform(20.0, 60.0), 2)
                peer_data["inventoryTurnoverDays"] = random.randint(30, 120)
                peer_data["rdExpenseRatio"] = round(random.uniform(5.0, 20.0), 2)
            elif target_industry == '金融保險業':
                peer_data["roa"] = round(random.uniform(0.5, 2.0), 2)
                peer_data["nplRatio"] = round(random.uniform(0.1, 1.0), 2)
                peer_data['roe'] = round(random.uniform(5.0, 15.0), 2)
                peer_data['netIncomeYoY'] = round(random.uniform(-10.0, 40.0), 2)
                peer_data['capitalAdequacyRatio'] = round(random.uniform(10.0, 20.0), 2)
                
            # 通用 Mock 特性與跨產業的安全防護 (Fallback Defaults)
            default_values = {
                'operatingMargin': round(random.uniform(5.0, 30.0), 2),
                'revenueYoY': round(random.uniform(-10.0, 50.0), 2),
                'epsYoY': round(random.uniform(-20.0, 100.0), 2),
                'currentRatio': round(random.uniform(100.0, 250.0), 2),
                'institutionalOwnership': round(random.uniform(10.0, 80.0), 2),
                'debtRatio': round(random.uniform(20.0, 80.0), 2),
                'grossMargin': round(random.uniform(15.0, 50.0), 2),
                'inventoryTurnoverDays': random.randint(30, 120),
                'rdExpenseRatio': round(random.uniform(1.0, 15.0), 2),
                'contractLiabilitiesYoY': round(random.uniform(-5.0, 20.0), 2),
                'netMargin': round(random.uniform(5.0, 25.0), 2),
                'projectGrossMargin': round(random.uniform(15.0, 40.0), 2),
                'inventoryToAssetsRatio': round(random.uniform(20.0, 60.0), 2),
                'roa': round(random.uniform(0.5, 3.0), 2),
                'roe': round(random.uniform(5.0, 20.0), 2),
                'nplRatio': round(random.uniform(0.1, 1.5), 2),
                'netIncomeYoY': round(random.uniform(-10.0, 30.0), 2),
                'capitalAdequacyRatio': round(random.uniform(10.0, 25.0), 2)
            }
            
            for k, v in default_values.items():
                if k not in peer_data:
                    peer_data[k] = v
                    
            peer_data_list.append(peer_data)
            
            # 當收齊包含自己在內的 5 檔有效同業即中止處理
            if len(peer_data_list) >= 5:
                break
                
        # Compute Industry Averages
        valid_pe = [p["peRatio"] for p in peer_data_list if p["peRatio"] is not None and p["peRatio"] > 0]
        valid_pb = [p["pbRatio"] for p in peer_data_list if p["pbRatio"] > 0]
        valid_yield = [p["dividendYield"] for p in peer_data_list if p["dividendYield"] > 0]
        valid_ps = [p["psRatio"] for p in peer_data_list if p["psRatio"] > 0]
        
        industry_average = {
            "peRatio": sum(valid_pe) / len(valid_pe) if valid_pe else 0,
            "pbRatio": sum(valid_pb) / len(valid_pb) if valid_pb else 0,
            "dividendYield": sum(valid_yield) / len(valid_yield) if valid_yield else 0,
            "psRatio": sum(valid_ps) / len(valid_ps) if valid_ps else 0,
            "id": "AVG",
            "name": "產業均值"
        }

        def get_avg(key):
            vals = [p[key] for p in peer_data_list if key in p]
            return sum(vals) / len(vals) if vals else 0
            
        if target_industry == '營建業':
            industry_average['contractLiabilitiesYoY'] = get_avg('contractLiabilitiesYoY')
            industry_average['debtRatio'] = get_avg('debtRatio')
            industry_average['netMargin'] = round(random.uniform(10.0, 30.0), 2)
            industry_average['projectGrossMargin'] = round(random.uniform(20.0, 45.0), 2)
            industry_average['inventoryToAssetsRatio'] = round(random.uniform(30.0, 70.0), 2)
            
        elif target_industry == '半導體業':
            industry_average['grossMargin'] = get_avg('grossMargin')
            industry_average['inventoryTurnoverDays'] = get_avg('inventoryTurnoverDays')
            industry_average['rdExpenseRatio'] = get_avg('rdExpenseRatio')
            
        elif target_industry == '金融保險業':
            industry_average['roa'] = get_avg('roa')
            industry_average['nplRatio'] = get_avg('nplRatio')
            industry_average['roe'] = get_avg('roe')
            industry_average['netIncomeYoY'] = get_avg('netIncomeYoY')
            industry_average['capitalAdequacyRatio'] = get_avg('capitalAdequacyRatio')

        # 通用 Mock 特性與跨產業的安全防護
        industry_average['operatingMargin'] = round(sum([p.get('operatingMargin', random.uniform(5.0, 30.0)) for p in peer_data_list]) / len(peer_data_list), 2)
        industry_average['revenueYoY'] = round(sum([p.get('revenueYoY', random.uniform(-10.0, 50.0)) for p in peer_data_list]) / len(peer_data_list), 2)
        industry_average['epsYoY'] = round(sum([p.get('epsYoY', random.uniform(-20.0, 100.0)) for p in peer_data_list]) / len(peer_data_list), 2)
        industry_average['currentRatio'] = round(sum([p.get('currentRatio', random.uniform(100.0, 250.0)) for p in peer_data_list]) / len(peer_data_list), 2)
        industry_average['institutionalOwnership'] = round(sum([p.get('institutionalOwnership', random.uniform(10.0, 80.0)) for p in peer_data_list]) / len(peer_data_list), 2)
        
        for k in default_values.keys():
            if k not in industry_average:
                industry_average[k] = get_avg(k)

        return {
            "status": "success",
            "source": "finmind",
            "data": {
                "industry": target_industry,
                "peers": peer_data_list,
                "industryAverage": industry_average
            }
        }
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
