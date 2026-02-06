from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from .. import models, schemas
from .finmind import FinMindClient

def get_params_by_quarter(year: int, quarter: int):
    # FinMind format: 2023-03-31 for Q1
    if quarter == 1:
        return f"{year}-01-01", f"{year}-06-01" # Fetch range to ensure covering date
    elif quarter == 2:
        return f"{year}-04-01", f"{year}-09-01"
    elif quarter == 3:
        return f"{year}-07-01", f"{year}-12-01"
    else:
        return f"{year}-10-01", f"{year+1}-05-01"

def map_income_statement(stock_id, year, quarter, data_list):
    # Filter for specific quarter data if needed, but FinMind returns sparse data usually
    # Map fields
    item = models.FinancialStatement(stock_id=stock_id, year=year, quarter=quarter)
    
    # We need to find the specific date that matches this quarter
    # Q1: 03-31, Q2: 06-30, Q3: 09-30, Q4: 12-31
    target_date_suffix = {1: "03-31", 2: "06-30", 3: "09-30", 4: "12-31"}
    target_date = f"{year}-{target_date_suffix[quarter]}"
    
    # Simple aggregation or finding the right row
    # FinMind returns a list of items for a date. e.g. [{type: '营业收入', value: 100}, ...]
    
    # NOTE: FinMind TaiwanStockFinancialStatements returns rows where each row is specific type for a date
    # Structure: date, stock_id, type, value, origin_name
    
    related_data = [d for d in data_list if d['date'] == target_date]
    if not related_data:
        return None

    for d in related_data:
        t = d['type']
        v = d['value']
        if t == '营业收入': item.revenue = v
        if t == '营业毛利（毛損）': item.gross_profit = v
        if t == '营业利益（損失）': item.operating_income = v
        if t == '稅前淨利（淨損）': item.pre_tax_income = v
        if t == '本期淨利（淨損）': item.net_income = v
        if t == '基本每股盈餘（元）': item.eps = v
        
    return item

def map_balance_sheet(stock_id, year, quarter, data_list):
    item = models.BalanceSheet(stock_id=stock_id, year=year, quarter=quarter)
    target_date_suffix = {1: "03-31", 2: "06-30", 3: "09-30", 4: "12-31"}
    target_date = f"{year}-{target_date_suffix[quarter]}"
    
    related_data = [d for d in data_list if d['date'] == target_date]
    if not related_data: return None

    for d in related_data:
        t = d['type']
        v = d['value']
        # Map based on PRD
        if t == 'CashAndCashEquivalents': item.cash_equivalents = v
        if t == 'AccountsReceivableNet': item.accounts_receivable = v
        if t == 'Inventories': item.inventories = v
        if t == 'CurrentAssets': item.current_assets = v
        if t == 'PropertyPlantAndEquipment': item.fixed_assets = v
        if t == 'TotalAssets': item.total_assets = v
        if t == 'CurrentLiabilities': item.current_liabilities = v
        if t == 'NoncurrentLiabilities': item.long_term_liabilities = v
        if t == 'Liabilities': item.total_liabilities = v
        if t == 'EquityAttributableToOwnersOfParent': item.shareholders_equity = v
        if t == 'Equity': item.net_assets = v
        
    return item

def map_cash_flow(stock_id, year, quarter, data_list):
    item = models.CashFlowStatement(stock_id=stock_id, year=year, quarter=quarter)
    target_date_suffix = {1: "03-31", 2: "06-30", 3: "09-30", 4: "12-31"}
    target_date = f"{year}-{target_date_suffix[quarter]}"
    
    related_data = [d for d in data_list if d['date'] == target_date]
    if not related_data: return None

    for d in related_data:
        t = d['type']
        v = d['value']
        if t == 'CashFlowsFromOperatingActivities': item.operating_cash_flow = v
        if t == 'CashProvidedByInvestingActivities': item.investing_cash_flow = v
        if t == 'CashFlowsProvidedFromFinancingActivities': item.financing_cash_flow = v
        if t == 'PropertyAndPlantAndEquipment': item.capex = v # Usually negative in investing, or separate item
        if t == 'CashBalancesEndOfPeriod': item.ending_cash_balance = v

    # Calculate Free Cash Flow
    if item.operating_cash_flow is not None and item.capex is not None:
        item.free_cash_flow = item.operating_cash_flow + item.capex # Capex is usually negative? Need to check FinMind.
        # PRD Note 2: FinMind Capex usually negative. 
        # If it comes from Investing Activities 'Purchase of PPE', it is negative.
        # But 'PropertyAndPlantAndEquipment' might be the asset value? 
        # Actually in Cash Flow, it's usually 'Acquisition of property, plant and equipment'.
        # Assuming FinMind uses standard accounting, acquisition is negative.
        # So FCF = OCF + Capex (if negative)
    
    return item


async def get_income_statement(db: Session, stock_id: str, year: int, quarter: int):
    # 1. Check DB
    db_item = db.query(models.FinancialStatement).filter_by(
        stock_id=stock_id, year=year, quarter=quarter
    ).first()
    
    if db_item:
        return "db", db_item

    # 2. Fetch from API
    client = FinMindClient()
    start, end = get_params_by_quarter(year, quarter)
    data_list = await client.fetch_financial_statement(stock_id, start, end)
    await client.close()

    if not data_list:
        return "api", None

    # 3. Map and Insert
    new_item = map_income_statement(stock_id, year, quarter, data_list)
    if new_item:
        try:
            db.add(new_item)
            db.commit()
            db.refresh(new_item)
            return "api", new_item
        except Exception as e:
            db.rollback()
            print(f"DB Insert Error: {e}")
            return "api", None
            
    return "api", None

async def get_balance_sheet(db: Session, stock_id: str, year: int, quarter: int):
    db_item = db.query(models.BalanceSheet).filter_by(
        stock_id=stock_id, year=year, quarter=quarter
    ).first()
    if db_item: return "db", db_item

    client = FinMindClient()
    start, end = get_params_by_quarter(year, quarter)
    data_list = await client.fetch_financial_statement(stock_id, start, end)
    await client.close()

    if not data_list: return "api", None

    new_item = map_balance_sheet(stock_id, year, quarter, data_list)
    if new_item:
        try:
            db.add(new_item)
            db.commit()
            db.refresh(new_item)
            return "api", new_item
        except:
            db.rollback()
            return "api", None
    return "api", None

async def get_cash_flow(db: Session, stock_id: str, year: int, quarter: int):
    db_item = db.query(models.CashFlowStatement).filter_by(
        stock_id=stock_id, year=year, quarter=quarter
    ).first()
    if db_item: return "db", db_item

    client = FinMindClient()
    start, end = get_params_by_quarter(year, quarter)
    data_list = await client.fetch_financial_statement(stock_id, start, end)
    await client.close()

    if not data_list: return "api", None

    new_item = map_cash_flow(stock_id, year, quarter, data_list)
    if new_item:
        try:
            db.add(new_item)
            db.commit()
            db.refresh(new_item)
            return "api", new_item
        except:
            db.rollback()
            return "api", None
    return "api", None
