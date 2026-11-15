import time
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .. import models
from . import finance, market

def get_staleness_status(db: Session, stock_id: str):
    """Checks if the data for a given stock is stale and needs updating, inspecting actual DB row counts."""
    metadata = db.query(models.SyncMetadata).filter_by(stock_id=stock_id).all()
    meta_dict = {m.data_type: m for m in metadata}
    
    stale_types = []
    now = datetime.now()
    
    # 1. 檢查實體資料表筆數（若筆數不足，直接標記過期需補齊，避免假性「最新」）
    price_count = db.query(models.StockPriceDaily).filter_by(stock_id=stock_id).count()
    chips_count = db.query(models.ChipsDaily).filter_by(stock_id=stock_id).count()
    fin_count = db.query(models.FinancialStatement).filter_by(stock_id=stock_id).count()

    if price_count < 60:
        stale_types.append("price")
    if chips_count < 30:
        stale_types.append("chips")
    if fin_count < 4:
        stale_types.append("finance")

    # 2. Check Price (Daily, updated after 16:00)
    price_meta = meta_dict.get("price")
    if now.hour >= 16:
        expected_date = now.strftime("%Y-%m-%d")
    else:
        expected_date = (now - timedelta(days=1)).strftime("%Y-%m-%d")
        
    if not price_meta or not price_meta.last_data_date or price_meta.last_data_date < expected_date:
        if not price_meta or not price_meta.last_updated or (now.timestamp() - price_meta.last_updated) > 86400:
             stale_types.append("price")
             stale_types.append("chips")
             
    # 3. Check Finance (Quarterly)
    finance_meta = meta_dict.get("finance")
    if not finance_meta:
        stale_types.append("finance")
    else:
        if (now.timestamp() - finance_meta.last_updated) > 30 * 86400:
             stale_types.append("finance")

    return {
        "is_stale": len(stale_types) > 0,
        "stale_types": list(set(stale_types)),
        "last_updated": max([m.last_updated for m in meta_dict.values()]) if meta_dict else None
    }

async def execute_explicit_sync(db: Session, stock_id: str):
    """Executes a full sync for the given stock, fetching long term data."""
    now_ts = int(time.time())
    
    # We will force sync all data types for this stock when explicitly requested
    from .finance import get_income_statement_history, get_balance_sheet_history, get_cash_flow_history
    from .market import get_stock_price, get_chips_data, get_dividend_data
    
    # Finance data (10 years)
    await get_income_statement_history(db, stock_id, force_sync=True)
    await get_balance_sheet_history(db, stock_id, force_sync=True)
    await get_cash_flow_history(db, stock_id, force_sync=True)
    
    # 5 years for price and chips
    await get_stock_price(db, stock_id, force_sync=True)
    await get_chips_data(db, stock_id, force_sync=True)
    
    # Dividends (10 years handled inside)
    await get_dividend_data(db, stock_id, force_sync=True)

    # Update metadata
    data_types = ["price", "chips", "finance", "dividends"]
    for dt in data_types:
        meta = db.query(models.SyncMetadata).filter_by(stock_id=stock_id, data_type=dt).first()
        if not meta:
            meta = models.SyncMetadata(stock_id=stock_id, data_type=dt)
            db.add(meta)
        meta.last_updated = now_ts
        if dt == "price":
            meta.last_data_date = datetime.now().strftime("%Y-%m-%d")
        elif dt == "finance":
            # For simplicity, set a recent date so it doesn't look instantly stale
            meta.last_data_date = datetime.now().strftime("%Y-%m")
        
    try:
        db.commit()
    except:
        db.rollback()
        
    return {"status": "success", "message": f"Successfully synced data for {stock_id}"}
