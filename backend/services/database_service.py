import os
from sqlalchemy.orm import Session
from sqlalchemy import func
from .. import models

def get_database_file_size() -> float:
    """Returns the size of the SQLite database in MB."""
    db_path = "./financial_data.db"
    try:
        if os.path.exists(db_path):
            size_bytes = os.path.getsize(db_path)
            # Convert to MB
            return round(size_bytes / (1024 * 1024), 2)
    except Exception as e:
        print(f"Error getting DB size: {e}")
    return 0.0

def get_db_summary(db: Session) -> dict:
    f_stocks = db.query(models.FinancialStatement.stock_id).distinct().all()
    p_stocks = db.query(models.StockPriceDaily.stock_id).distinct().all()
    c_stocks = db.query(models.ChipsDaily.stock_id).distinct().all()
    d_stocks = db.query(models.Dividend.stock_id).distinct().all()
    s_stocks = db.query(models.SyncMetadata.stock_id).distinct().all()
    
    unique_stocks = set([x[0] for x in f_stocks + p_stocks + c_stocks + d_stocks + s_stocks])
    total_stocks = len(unique_stocks)
    
    # Total rows in key tables
    financial_rows = db.query(func.count(models.FinancialStatement.id)).scalar() or 0
    price_rows = db.query(func.count(models.StockPriceDaily.id)).scalar() or 0
    chips_rows = db.query(func.count(models.ChipsDaily.id)).scalar() or 0
    dividend_rows = db.query(func.count(models.Dividend.id)).scalar() or 0
    
    total_records = financial_rows + price_rows + chips_rows + dividend_rows

    return {
        "fileSizeMb": get_database_file_size(),
        "totalStocks": total_stocks,
        "totalRecords": total_records,
        "tableCounts": {
            "financials": financial_rows,
            "prices": price_rows,
            "chips": chips_rows,
            "dividends": dividend_rows
        }
    }

def calculate_db_health_score(db: Session, stock_id: str) -> int:
    """Calculates a quick fundamental-based health score from database tables."""
    # Fetch historical financial data
    is_history = db.query(models.FinancialStatement).filter_by(stock_id=stock_id)\
                   .order_by(models.FinancialStatement.year.desc(), models.FinancialStatement.quarter.desc()).all()
    bs_history = db.query(models.BalanceSheet).filter_by(stock_id=stock_id)\
                   .order_by(models.BalanceSheet.year.desc(), models.BalanceSheet.quarter.desc()).all()
    cf_history = db.query(models.CashFlowStatement).filter_by(stock_id=stock_id)\
                   .order_by(models.CashFlowStatement.year.desc(), models.CashFlowStatement.quarter.desc()).all()
                   
    if not is_history or not bs_history or not cf_history:
        return None
        
    latest_is = is_history[0]
    latest_bs = bs_history[0]
    latest_cf = cf_history[0]
    
    # --- Profitability ---
    gross_margin = (latest_is.gross_profit / latest_is.revenue * 100) if latest_is.gross_profit is not None and latest_is.revenue and latest_is.revenue > 0 else 0.0
    net_margin = (latest_is.net_income / latest_is.revenue * 100) if latest_is.net_income is not None and latest_is.revenue and latest_is.revenue > 0 else 0.0
    roe = (latest_is.net_income * 4 / latest_bs.shareholders_equity * 100) if latest_is.net_income is not None and latest_bs.shareholders_equity and latest_bs.shareholders_equity > 0 else 0.0
    
    profit_items = [
        {"status": "pass" if gross_margin > 30 else "neutral" if gross_margin > 15 else "fail"},
        {"status": "pass" if roe > 10 else "neutral" if roe > 5 else "fail"},
        {"status": "pass" if net_margin > 15 else "neutral" if net_margin > 5 else "fail"}
    ]
    profit_score = sum([100 if i["status"] == "pass" else 60 if i["status"] == "neutral" else 20 for i in profit_items]) // 3
    
    # --- Solvency ---
    curr_ratio = (latest_bs.current_assets / latest_bs.current_liabilities) if latest_bs.current_assets is not None and latest_bs.current_liabilities and latest_bs.current_liabilities > 0 else 1.0
    debt_eq_ratio = (latest_bs.total_liabilities / latest_bs.shareholders_equity) if latest_bs.total_liabilities is not None and latest_bs.shareholders_equity and latest_bs.shareholders_equity > 0 else 1.0
    quick_assets = (latest_bs.current_assets - (latest_bs.inventories or 0)) if latest_bs.current_assets is not None else 0.0
    quick_ratio = (quick_assets / latest_bs.current_liabilities) if latest_bs.current_liabilities and latest_bs.current_liabilities > 0 else 1.0
    
    solv_items = [
        {"status": "pass" if curr_ratio > 1.5 else "neutral" if curr_ratio > 1 else "fail"},
        {"status": "pass" if debt_eq_ratio < 1.0 else "neutral" if debt_eq_ratio < 1.5 else "fail"},
        {"status": "pass" if quick_ratio > 1.0 else "neutral" if quick_ratio > 0.8 else "fail"}
    ]
    solv_score = sum([100 if i["status"] == "pass" else 60 if i["status"] == "neutral" else 20 for i in solv_items]) // 3
    
    # --- Growth ---
    prev_is = next((i for i in is_history if i.year == latest_is.year - 1 and i.quarter == latest_is.quarter), None)
    if not prev_is and len(is_history) > 1:
        prev_is = is_history[-1]
        
    rev_yoy = ((latest_is.revenue - prev_is.revenue) / prev_is.revenue * 100) if prev_is and prev_is.revenue and prev_is.revenue > 0 and latest_is.revenue is not None else 0.0
    eps_yoy = ((latest_is.eps - prev_is.eps) / prev_is.eps * 100) if prev_is and prev_is.eps and prev_is.eps > 0 and latest_is.eps is not None else 0.0
    fcf = latest_cf.free_cash_flow if latest_cf.free_cash_flow is not None else 0.0
    
    growth_items = [
        {"status": "pass" if rev_yoy > 0 else "neutral" if rev_yoy > -5 else "fail"},
        {"status": "pass" if eps_yoy > 0 else "neutral" if eps_yoy > -5 else "fail"},
        {"status": "pass" if fcf > 0 else "fail"}
    ]
    growth_score = sum([100 if i["status"] == "pass" else 60 if i["status"] == "neutral" else 20 for i in growth_items]) // 3
    
    health_score = (profit_score + solv_score + growth_score) // 3
    return health_score

def get_all_stocks_stats(db: Session) -> list:
    """Gets sync statistics and record counts per stock."""
    # First get all unique stocks that have metadata
    meta_records = db.query(models.SyncMetadata).all()
    
    # Group by stock_id
    stocks_meta = {}
    for meta in meta_records:
        stock_id = meta.stock_id
        if stock_id not in stocks_meta:
            stocks_meta[stock_id] = {
                "id": stock_id,
                "name": f"股票 {stock_id}", # Target for next feature: cache Chinese Names in DB
                "lastSyncTime": 0,
                "dataTypes": {}
            }
        
        # Keep track of the most recent sync time overall
        if meta.last_updated and meta.last_updated > stocks_meta[stock_id]["lastSyncTime"]:
            stocks_meta[stock_id]["lastSyncTime"] = meta.last_updated
            
        stocks_meta[stock_id]["dataTypes"][meta.data_type] = {
            "lastUpdated": meta.last_updated,
            "lastDataDate": meta.last_data_date
        }

    # Now get counts per stock
    # For efficiency we could use Group By
    
    financial_counts = dict(db.query(models.FinancialStatement.stock_id, func.count(models.FinancialStatement.id)).group_by(models.FinancialStatement.stock_id).all())
    price_counts = dict(db.query(models.StockPriceDaily.stock_id, func.count(models.StockPriceDaily.id)).group_by(models.StockPriceDaily.stock_id).all())
    chips_counts = dict(db.query(models.ChipsDaily.stock_id, func.count(models.ChipsDaily.id)).group_by(models.ChipsDaily.stock_id).all())
    dividend_counts = dict(db.query(models.Dividend.stock_id, func.count(models.Dividend.id)).group_by(models.Dividend.stock_id).all())
    # Get all unique stock_ids across all dictionaries
    all_stock_ids = set()
    all_stock_ids.update(stocks_meta.keys())
    all_stock_ids.update(financial_counts.keys())
    all_stock_ids.update(price_counts.keys())
    all_stock_ids.update(chips_counts.keys())
    all_stock_ids.update(dividend_counts.keys())
    
    # Batch fetch market caps and latest prices to prevent N+1 query overhead
    mc_caches = db.query(models.MarketCapCache).all()
    mc_map = {m.stock_id: m.market_cap for m in mc_caches}
    mc_update_map = {m.stock_id: m.last_updated for m in mc_caches}
    
    # Get the latest daily price for each stock
    latest_price_sub = db.query(
        models.StockPriceDaily.stock_id,
        func.max(models.StockPriceDaily.date).label('max_date')
    ).group_by(models.StockPriceDaily.stock_id).subquery()
    
    latest_prices = db.query(models.StockPriceDaily).join(
        latest_price_sub,
        (models.StockPriceDaily.stock_id == latest_price_sub.c.stock_id) &
        (models.StockPriceDaily.date == latest_price_sub.c.max_date)
    ).all()
    
    price_map = {p.stock_id: p.close for p in latest_prices}

    results = []
    for stock_id in all_stock_ids:
        if stock_id not in stocks_meta:
            data = {
                "id": stock_id,
                "name": f"股票 {stock_id}",
                "lastSyncTime": 0,
                "dataTypes": {}
            }
        else:
            data = stocks_meta[stock_id]
            
        data["records"] = {
            "financials": financial_counts.get(stock_id, 0),
            "prices": price_counts.get(stock_id, 0),
            "chips": chips_counts.get(stock_id, 0),
            "dividends": dividend_counts.get(stock_id, 0)
        }
        
        # Inject price and marketCap details
        data["price"] = price_map.get(stock_id, 0.0)
        data["marketCap"] = mc_map.get(stock_id, 0.0)
        
        # Inject health score and stock_name
        data["health_score"] = calculate_db_health_score(db, stock_id)
        data["stock_name"] = data.get("name")
        
        # Fallback mechanism: if market cap is updated, use its timestamp for "price" datatype
        mc_last_updated = mc_update_map.get(stock_id)
        if mc_last_updated:
            if "dataTypes" not in data:
                data["dataTypes"] = {}
            existing_price = data["dataTypes"].get("price", {}).get("lastUpdated", 0)
            if mc_last_updated > existing_price:
                from datetime import datetime
                data["dataTypes"]["price"] = {
                    "lastUpdated": mc_last_updated,
                    "lastDataDate": datetime.fromtimestamp(mc_last_updated).strftime("%Y-%m-%d")
                }
        
        # 只顯示真正有存入本地資料的股票
        total_rec = sum(data["records"].values())
        if total_rec > 0:
            results.append(data)
        
    return results

def delete_stock_data(db: Session, stock_id: str):
    """Deletes all data for a specific stock."""
    try:
        db.query(models.FinancialStatement).filter_by(stock_id=stock_id).delete()
        db.query(models.BalanceSheet).filter_by(stock_id=stock_id).delete()
        db.query(models.CashFlowStatement).filter_by(stock_id=stock_id).delete()
        db.query(models.ChipsDaily).filter_by(stock_id=stock_id).delete()
        db.query(models.StockPriceDaily).filter_by(stock_id=stock_id).delete()
        db.query(models.Dividend).filter_by(stock_id=stock_id).delete()
        db.query(models.SyncMetadata).filter_by(stock_id=stock_id).delete()
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"Failed to delete {stock_id}: {e}")
        return False
