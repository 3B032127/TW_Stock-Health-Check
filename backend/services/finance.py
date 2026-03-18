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
        t = d.get('type', '')
        n = d.get('origin_name', '')
        v = d.get('value')
        
        if t == 'Revenue' or '營業收入' in n: item.revenue = v
        elif t == 'GrossProfit' or '營業毛利' in n: item.gross_profit = v
        elif t == 'OperatingIncome' or '營業利益' in n: item.operating_income = v
        elif t in ['PreTaxIncome', 'IncomeBeforeTax'] or '稅前淨利' in n: item.pre_tax_income = v
        elif t == 'IncomeAfterTaxes' or '本期淨利' in n: item.net_income = v
        elif t == 'EPS' or '每股盈餘' in n: item.eps = v
        
    return item

def map_balance_sheet(stock_id, year, quarter, data_list):
    item = models.BalanceSheet(stock_id=stock_id, year=year, quarter=quarter)
    target_date_suffix = {1: "03-31", 2: "06-30", 3: "09-30", 4: "12-31"}
    target_date = f"{year}-{target_date_suffix[quarter]}"
    
    related_data = [d for d in data_list if d['date'] == target_date]
    if not related_data: return None

    for d in related_data:
        t = d.get('type', '')
        if t.endswith('_per'): continue
        n = d.get('origin_name', '')
        v = d.get('value')
        
        if t == 'CashAndCashEquivalents' or '現金及約當現金' in n: item.cash_equivalents = v
        elif t == 'AccountsReceivableNet' or '應收帳款' in n: item.accounts_receivable = v
        elif t == 'Inventories' or '存貨' in n: item.inventories = v
        elif t == 'CurrentAssets' or '流動資產' in n: item.current_assets = v
        elif t == 'PropertyPlantAndEquipment' or '不動產、廠房及設備' in n: item.fixed_assets = v
        elif t == 'TotalAssets' or '資產總計' in n or '資產總額' in n: item.total_assets = v
        elif t == 'CurrentLiabilities' or '流動負債' in n: item.current_liabilities = v
        elif t == 'NoncurrentLiabilities' or '非流動負債' in n: item.long_term_liabilities = v
        elif t == 'Liabilities' or '負債總' in n: item.total_liabilities = v
        elif t == 'EquityAttributableToOwnersOfParent' or '歸屬於母公司' in n: item.shareholders_equity = v
        elif t == 'Equity' or '權益總' in n: item.net_assets = v
        
    return item

def map_cash_flow(stock_id, year, quarter, data_list):
    item = models.CashFlowStatement(stock_id=stock_id, year=year, quarter=quarter)
    target_date_suffix = {1: "03-31", 2: "06-30", 3: "09-30", 4: "12-31"}
    target_date = f"{year}-{target_date_suffix[quarter]}"
    
    related_data = [d for d in data_list if d['date'] == target_date]
    if not related_data: return None

    for d in related_data:
        t = d.get('type', '')
        if t.endswith('_per'): continue
        n = d.get('origin_name', '')
        v = d.get('value')
        
        if 'OperatingActivities' in t or '營業活動之淨現金' in n: item.operating_cash_flow = v
        elif 'InvestingActivities' in t or '投資活動之淨現金' in n: item.investing_cash_flow = v
        elif 'FinancingActivities' in t or '籌資活動之淨現金' in n: item.financing_cash_flow = v
        elif t == 'PropertyAndPlantAndEquipment' or '取得不動產' in n: item.capex = v
        elif t == 'CashBalancesEndOfPeriod' or '期末現金' in n: item.ending_cash_balance = v

    if item.operating_cash_flow is not None and item.capex is not None:
        item.free_cash_flow = item.operating_cash_flow + item.capex
    
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


async def fetch_and_sync_financial_history(db: Session, stock_id: str, limit: int, model_class, map_func, dataset: str):
    db_items = db.query(model_class).filter_by(stock_id=stock_id)\
                 .order_by(model_class.year.desc(), model_class.quarter.desc()).limit(limit).all()
    
    # If we have enough history in DB, just return
    if len(db_items) >= limit:
        return "db", db_items
    
    end_date = datetime.now().strftime("%Y-%m-%d")
    # Fetch past 4 years to ensure covering up to 12-16 quarters
    start_date = (datetime.now() - timedelta(days=365*4)).strftime("%Y-%m-%d")
    
    client = FinMindClient()
    data_list = await client.fetch_data(dataset, stock_id, start_date, end_date)
    await client.close()
    
    if not data_list:
        return "api", db_items

    # Identify all (year, quarter) present in data_list
    found_dates = set(d['date'] for d in data_list)
    for date_str in sorted(list(found_dates), reverse=True):
        try:
            year = int(date_str[0:4])
            month = date_str[5:7]
            if month == "03": quarter = 1
            elif month == "06": quarter = 2
            elif month == "09": quarter = 3
            elif month == "12": quarter = 4
            else: continue
            
            # Check if this quarter exists in DB
            existing = db.query(model_class).filter_by(stock_id=stock_id, year=year, quarter=quarter).first()
            if not existing:
                new_item = map_func(stock_id, year, quarter, data_list)
                if new_item:
                    db.add(new_item)
        except Exception:
            continue
            
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error saving financial history: {e}")
        
    final_items = db.query(model_class).filter_by(stock_id=stock_id)\
                    .order_by(model_class.year.desc(), model_class.quarter.desc()).limit(limit).all()
    
    source = "api" if len(final_items) > len(db_items) else "db"
    return source, final_items


async def get_income_statement_history(db: Session, stock_id: str, limit: int = 8):
    return await fetch_and_sync_financial_history(db, stock_id, limit, models.FinancialStatement, map_income_statement, "TaiwanStockFinancialStatements")

async def get_balance_sheet_history(db: Session, stock_id: str, limit: int = 8):
    return await fetch_and_sync_financial_history(db, stock_id, limit, models.BalanceSheet, map_balance_sheet, "TaiwanStockBalanceSheet")

async def get_cash_flow_history(db: Session, stock_id: str, limit: int = 8):
    return await fetch_and_sync_financial_history(db, stock_id, limit, models.CashFlowStatement, map_cash_flow, "TaiwanStockCashFlowsStatement")

async def calculate_health_check(db: Session, stock_id: str):
    source_is, is_history = await get_income_statement_history(db, stock_id, limit=5)
    source_bs, bs_history = await get_balance_sheet_history(db, stock_id, limit=5)
    source_cf, cf_history = await get_cash_flow_history(db, stock_id, limit=5)

    if not is_history or not bs_history or not cf_history:
        return "not enough data", None

    latest_is = is_history[0]
    latest_bs = bs_history[0]
    latest_cf = cf_history[0]
    
    # Try to get YoY by finding same quarter last year
    prev_is = next((i for i in is_history if i.year == latest_is.year - 1 and i.quarter == latest_is.quarter), None)
    if not prev_is and len(is_history) > 1:
        prev_is = is_history[-1] # fallback to oldest available if exact YoY not found
        
    # Get valuation
    from .finmind import FinMindClient
    from datetime import datetime, timedelta
    client = FinMindClient()
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=60)).strftime("%Y-%m-%d")
    per_data = await client.fetch_per(stock_id, start_date, end_date)
    await client.close()
    
    pe_ratio = 0.0
    pb_ratio = 0.0
    dividend_yield = 0.0
    if per_data:
        latest_per = per_data[-1]
        pe_ratio = latest_per.get("PER", 0)
        pb_ratio = latest_per.get("PBR", 0)
        dividend_yield = latest_per.get("dividend_yield", 0)

    # Helper formatters
    def fmt_pct(val): return f"{val:.1f}%" if val is not None else "N/A"
    def fmt_x(val): return f"{val:.1f}x" if val is not None else "N/A"
    
    # --- Profitability ---
    gross_margin = (latest_is.gross_profit / latest_is.revenue * 100) if latest_is.revenue and latest_is.revenue > 0 else 0
    net_margin = (latest_is.net_income / latest_is.revenue * 100) if latest_is.revenue and latest_is.revenue > 0 else 0
    roe = (latest_is.net_income * 4 / latest_bs.shareholders_equity * 100) if latest_bs.shareholders_equity and latest_bs.shareholders_equity > 0 else 0
    
    profit_items = [
        {"label": "毛利率", "value": fmt_pct(gross_margin), "target": ">30%", "status": "pass" if gross_margin > 30 else "neutral" if gross_margin > 15 else "fail"},
        {"label": "股東權益報酬率", "value": fmt_pct(roe), "target": ">10%", "status": "pass" if roe > 10 else "neutral" if roe > 5 else "fail"},
        {"label": "淨利率", "value": fmt_pct(net_margin), "target": ">15%", "status": "pass" if net_margin > 15 else "neutral" if net_margin > 5 else "fail"}
    ]
    profit_score = sum([100 if i["status"] == "pass" else 60 if i["status"] == "neutral" else 20 for i in profit_items]) // 3

    # --- Solvency ---
    curr_ratio = (latest_bs.current_assets / latest_bs.current_liabilities) if latest_bs.current_liabilities and latest_bs.current_liabilities > 0 else 1
    debt_eq_ratio = (latest_bs.total_liabilities / latest_bs.shareholders_equity) if latest_bs.shareholders_equity and latest_bs.shareholders_equity > 0 else 1
    quick_assets = (latest_bs.current_assets - (latest_bs.inventories or 0)) if latest_bs.current_assets else 0
    quick_ratio = (quick_assets / latest_bs.current_liabilities) if latest_bs.current_liabilities and latest_bs.current_liabilities > 0 else 1

    solv_items = [
        {"label": "流動比率", "value": fmt_x(curr_ratio), "target": ">1.5x", "status": "pass" if curr_ratio > 1.5 else "neutral" if curr_ratio > 1 else "fail"},
        {"label": "負債權益比", "value": f"{debt_eq_ratio:.2f}", "target": "<1.0", "status": "pass" if debt_eq_ratio < 1.0 else "neutral" if debt_eq_ratio < 1.5 else "fail"},
        {"label": "速動比率", "value": fmt_x(quick_ratio), "target": ">1.0x", "status": "pass" if quick_ratio > 1.0 else "neutral" if quick_ratio > 0.8 else "fail"}
    ]
    solv_score = sum([100 if i["status"] == "pass" else 60 if i["status"] == "neutral" else 20 for i in solv_items]) // 3

    # --- Growth ---
    rev_yoy = ((latest_is.revenue - prev_is.revenue) / prev_is.revenue * 100) if prev_is and prev_is.revenue and prev_is.revenue > 0 and latest_is.revenue is not None else 0
    eps_yoy = ((latest_is.eps - prev_is.eps) / prev_is.eps * 100) if prev_is and prev_is.eps and prev_is.eps > 0 and latest_is.eps is not None else 0
    fcf = (latest_cf.free_cash_flow / 100000000) if latest_cf.free_cash_flow else 0 # 億元
    
    growth_items = [
        {"label": "營收年增率", "value": fmt_pct(rev_yoy), "target": ">0%", "status": "pass" if rev_yoy > 0 else "neutral" if rev_yoy > -5 else "fail"},
        {"label": "EPS 成長率", "value": fmt_pct(eps_yoy), "target": ">0%", "status": "pass" if eps_yoy > 0 else "neutral" if eps_yoy > -5 else "fail"},
        {"label": "自由現金流", "value": f"+{fcf:.1f}億" if fcf > 0 else f"{fcf:.1f}億", "target": ">0", "status": "pass" if fcf > 0 else "fail"}
    ]
    growth_score = sum([100 if i["status"] == "pass" else 60 if i["status"] == "neutral" else 20 for i in growth_items]) // 3

    # --- Valuation ---
    val_items = [
        {"label": "本益比", "value": fmt_x(pe_ratio) if pe_ratio > 0 else "虧損中", "target": "<15x", "status": "pass" if pe_ratio > 0 and pe_ratio < 15 else "neutral" if pe_ratio >= 15 and pe_ratio < 25 else "fail"},
        {"label": "股價淨值比", "value": fmt_x(pb_ratio) if pb_ratio > 0 else "N/A", "target": "<2.0x", "status": "pass" if pb_ratio > 0 and pb_ratio < 2.0 else "neutral" if pb_ratio >= 2.0 and pb_ratio < 4.0 else "fail"},
        {"label": "殖利率", "value": fmt_pct(dividend_yield), "target": ">4.0%", "status": "pass" if dividend_yield > 4.0 else "neutral" if dividend_yield > 2.0 else "fail"}
    ]
    val_score = sum([100 if i["status"] == "pass" else 60 if i["status"] == "neutral" else 20 for i in val_items]) // 3

    total_score = (profit_score + solv_score + growth_score + val_score) // 4

    return "api/db calculation", {
        "totalScore": int(total_score),
        "profitability": {"score": int(profit_score), "items": profit_items},
        "solvency": {"score": int(solv_score), "items": solv_items},
        "growth": {"score": int(growth_score), "items": growth_items},
        "valuation": {"score": int(val_score), "items": val_items}
    }

