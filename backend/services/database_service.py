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
