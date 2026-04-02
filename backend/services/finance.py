from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import google.generativeai as genai
import os
import asyncio
import json
import re
from .. import models, schemas
from .finmind import FinMindClient

def parse_taiwan_year(year_str: str) -> int:
    """Parses a year string which could be Gregorian (2025) or ROC (114)."""
    if not year_str: return datetime.now().year
    match = re.search(r'(\d+)', str(year_str))
    if not match:
        return datetime.now().year
    val = int(match.group(1))
    if val < 1911: # Likely ROC year
        return val + 1911
    return val

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
        
        # Mapping for Income Statement
        if t in ['Revenue', 'NetInterestIncome', 'NetNonInterestIncome'] or '營業收入' in n or '收益' in n:
            if item.revenue is None: item.revenue = 0
            item.revenue += v
        elif t == 'GrossProfit' or '營業毛利' in n: 
            item.gross_profit = v
        elif t == 'OperatingIncome' or '營業利益' in n: 
            item.operating_income = v
        elif t in ['PreTaxIncome', 'IncomeBeforeTax'] or '稅前淨利' in n: 
            item.pre_tax_income = v
        elif t == 'IncomeAfterTaxes' or '本期淨利' in n or '本期淨利（淨損）' in n: 
            item.net_income = v
        elif t == 'EPS' or '每股盈餘' in n: 
            item.eps = v
        
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
            # Identify year and month/quarter
            if '-' in date_str:
                year = int(date_str[0:4])
                month = date_str[5:7]
            else:
                year = parse_taiwan_year(date_str)
                # If ROC format like '114年第3季', we might need to find quarter from '第n季'
                q_match = re.search(r'第(\d)季', date_str)
                month = "03" # default
                if q_match:
                    q = int(q_match.group(1))
                    month = ["03", "06", "09", "12"][q-1]
                else:
                    month = "03"

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
    # Fetch quarters for metrics & charting
    source_is, is_history = await get_income_statement_history(db, stock_id, limit=20)
    source_bs, bs_history = await get_balance_sheet_history(db, stock_id, limit=12)
    source_cf, cf_history = await get_cash_flow_history(db, stock_id, limit=12)

    if not is_history or not bs_history or not cf_history:
        return "not enough data", None

    latest_is = is_history[0]
    latest_bs = bs_history[0]
    latest_cf = cf_history[0]
    
    # Try to get YoY by finding same quarter last year
    prev_is = next((i for i in is_history if i.year == latest_is.year - 1 and i.quarter == latest_is.quarter), None)
    if not prev_is and len(is_history) > 1:
        prev_is = is_history[-1] # fallback to oldest available if exact YoY not found

    # Helper formatters
    def fmt_pct(val): return f"{val:.1f}%" if val is not None else "N/A"
    def fmt_x(val): return f"{val:.1f}x" if val is not None else "N/A"
    
    # --- Profitability ---
    gross_margin = (latest_is.gross_profit / latest_is.revenue * 100) if latest_is.gross_profit is not None and latest_is.revenue and latest_is.revenue > 0 else 0
    net_margin = (latest_is.net_income / latest_is.revenue * 100) if latest_is.net_income is not None and latest_is.revenue and latest_is.revenue > 0 else 0
    roe = (latest_is.net_income * 4 / latest_bs.shareholders_equity * 100) if latest_is.net_income is not None and latest_bs.shareholders_equity and latest_bs.shareholders_equity > 0 else 0
    
    gm_history = [round((i.gross_profit / i.revenue * 100),1) if i.gross_profit and i.revenue else 0 for i in is_history[:8][::-1]]
    nm_history = [round((i.net_income / i.revenue * 100),1) if i.net_income and i.revenue else 0 for i in is_history[:8][::-1]]
    roe_history = [round((is_item.net_income * 4 / bs.shareholders_equity * 100),1) if is_item.net_income and bs and bs.shareholders_equity else 0 for is_item, bs in zip(is_history[:8][::-1], bs_history[:8][::-1])]
    
    profit_items = [
        {"label": "毛利率", "value": fmt_pct(gross_margin), "target": ">30%", "status": "pass" if gross_margin > 30 else "neutral" if gross_margin > 15 else "fail", "sparkline": gm_history},
        {"label": "股東權益報酬率", "value": fmt_pct(roe), "target": ">10%", "status": "pass" if roe > 10 else "neutral" if roe > 5 else "fail", "sparkline": roe_history},
        {"label": "淨利率", "value": fmt_pct(net_margin), "target": ">15%", "status": "pass" if net_margin > 15 else "neutral" if net_margin > 5 else "fail", "sparkline": nm_history}
    ]
    profit_score = sum([100 if i["status"] == "pass" else 60 if i["status"] == "neutral" else 20 for i in profit_items]) // 3

    # --- Solvency ---
    curr_ratio = (latest_bs.current_assets / latest_bs.current_liabilities) if latest_bs.current_assets is not None and latest_bs.current_liabilities and latest_bs.current_liabilities > 0 else 1
    debt_eq_ratio = (latest_bs.total_liabilities / latest_bs.shareholders_equity) if latest_bs.total_liabilities is not None and latest_bs.shareholders_equity and latest_bs.shareholders_equity > 0 else 1
    quick_assets = (latest_bs.current_assets - (latest_bs.inventories or 0)) if latest_bs.current_assets is not None else 0
    quick_ratio = (quick_assets / latest_bs.current_liabilities) if latest_bs.current_liabilities and latest_bs.current_liabilities > 0 else 1

    cr_hist = [round(b.current_assets / b.current_liabilities,2) if b.current_assets and b.current_liabilities else 1 for b in bs_history[:8][::-1]]
    der_hist = [round(b.total_liabilities / b.shareholders_equity,2) if b.total_liabilities and b.shareholders_equity else 1 for b in bs_history[:8][::-1]]
    qr_hist = [round((b.current_assets - (b.inventories or 0))/b.current_liabilities,2) if b.current_assets and b.current_liabilities else 1 for b in bs_history[:8][::-1]]

    solv_items = [
        {"label": "流動比率", "value": fmt_x(curr_ratio), "target": ">1.5x", "status": "pass" if curr_ratio > 1.5 else "neutral" if curr_ratio > 1 else "fail", "sparkline": cr_hist},
        {"label": "負債權益比", "value": f"{debt_eq_ratio:.2f}", "target": "<1.0", "status": "pass" if debt_eq_ratio < 1.0 else "neutral" if debt_eq_ratio < 1.5 else "fail", "sparkline": der_hist},
        {"label": "速動比率", "value": fmt_x(quick_ratio), "target": ">1.0x", "status": "pass" if quick_ratio > 1.0 else "neutral" if quick_ratio > 0.8 else "fail", "sparkline": qr_hist}
    ]
    solv_score = sum([100 if i["status"] == "pass" else 60 if i["status"] == "neutral" else 20 for i in solv_items]) // 3

    # --- Growth ---
    rev_yoy = ((latest_is.revenue - prev_is.revenue) / prev_is.revenue * 100) if prev_is and prev_is.revenue and prev_is.revenue > 0 and latest_is.revenue is not None else 0
    eps_yoy = ((latest_is.eps - prev_is.eps) / prev_is.eps * 100) if prev_is and prev_is.eps and prev_is.eps > 0 and latest_is.eps is not None else 0
    fcf = (latest_cf.free_cash_flow / 100000000) if latest_cf.free_cash_flow is not None else 0 # 億元
    capex = (latest_cf.capex / 100000000) if latest_cf.capex is not None else 0 # 億元
    
    # Advanced 12-quarter historical trends
    fcf_hist = [round((c.free_cash_flow / 100000000),1) if c.free_cash_flow else 0 for c in cf_history[:12][::-1]]
    capex_hist = [round((c.capex / 100000000),1) if c.capex else 0 for c in cf_history[:12][::-1]]
    
    # Calculate YoY history arrays
    rev_yoy_hist = []
    eps_yoy_hist = []
    for i in range(8):
        try:
            cur = is_history[i]
            prv = next((x for x in is_history if x.year == cur.year-1 and x.quarter == cur.quarter), None)
            r_yoy = ((cur.revenue - prv.revenue)/prv.revenue*100) if prv and prv.revenue and prv.revenue>0 else 0
            e_yoy = ((cur.eps - prv.eps)/prv.eps*100) if prv and prv.eps and prv.eps>0 else 0
            rev_yoy_hist.append(round(r_yoy, 1))
            eps_yoy_hist.append(round(e_yoy, 1))
        except:
            rev_yoy_hist.append(0)
            eps_yoy_hist.append(0)
    rev_yoy_hist.reverse()
    eps_yoy_hist.reverse()
    
    growth_items = [
        {"label": "營收年增率", "value": fmt_pct(rev_yoy), "target": ">0%", "status": "pass" if rev_yoy > 0 else "neutral" if rev_yoy > -5 else "fail", "sparkline": rev_yoy_hist},
        {"label": "EPS 成長率", "value": fmt_pct(eps_yoy), "target": ">0%", "status": "pass" if eps_yoy > 0 else "neutral" if eps_yoy > -5 else "fail", "sparkline": eps_yoy_hist},
        {"label": "資本支出 (CapEx)", "value": f"{capex:.1f}億", "target": "穩定投資", "status": "neutral", "sparkline": capex_hist},
        {"label": "自由現金流", "value": f"+{fcf:.1f}億" if fcf > 0 else f"{fcf:.1f}億", "target": ">0", "status": "pass" if fcf > 0 else "fail", "sparkline": fcf_hist}
    ]
    growth_score = sum([100 if i["status"] == "pass" else 60 if i["status"] == "neutral" else 20 for i in growth_items if i["status"] != "neutral" or i["label"] != "資本支出 (CapEx)"]) // 3
        
    # Get valuation (fetch up to 5 years for PE band calculation)
    client = FinMindClient()
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date_5y = (datetime.now() - timedelta(days=5*365)).strftime("%Y-%m-%d")
    per_data_5y = await client.fetch_per(stock_id, start_date_5y, end_date)
    
    pe_ratio = 0.0
    pb_ratio = 0.0
    dividend_yield = 0.0
    pe_band = {"p0": 0, "p25": 0, "p50": 0, "p75": 0, "p100": 0, "current": 0}
    pe_percentile = 0
    mos = {"fairPrice": 0, "cheapPrice": 0, "discount": 0}
    peg = 0.0

    if per_data_5y:
        latest_per = per_data_5y[-1]
        pe_ratio = latest_per.get("PER", 0)
        pb_ratio = latest_per.get("PBR", 0)
        dividend_yield = latest_per.get("dividend_yield", 0)

        # Calculate peBand and pePercentile
        pe_values = [d.get("PER", 0) for d in per_data_5y if d.get("PER", 0) > 0]
        if pe_values:
            import numpy as np
            pe_values.sort()
            
            p0 = np.percentile(pe_values, 5) # Extreme undervalue
            p25 = np.percentile(pe_values, 25) # Undervalue
            p50 = np.percentile(pe_values, 50) # Fair
            p75 = np.percentile(pe_values, 75) # Overvalue
            p100 = np.percentile(pe_values, 95) # Extreme overvalue
            
            pe_band = {
                "p0": round(p0, 1),
                "p25": round(p25, 1),
                "p50": round(p50, 1),
                "p75": round(p75, 1),
                "p100": round(p100, 1),
                "current": round(pe_ratio, 1)
            }
            
            count_below = sum(1 for p in pe_values if p <= pe_ratio)
            pe_percentile = int((count_below / len(pe_values)) * 100)
            
            # Margin of safety (MOS)
            ttm_eps = sum([i.eps or 0 for i in is_history[:4]]) if is_history else 0
            if ttm_eps > 0 and p50 > 0:
                fair_price = p50 * ttm_eps
                cheap_price = fair_price * 0.8 # 20% discount
                current_price = pe_ratio * ttm_eps
                discount = ((fair_price - current_price) / fair_price) * 100 if fair_price > 0 else 0
                mos = {
                    "fairPrice": round(fair_price, 1),
                    "cheapPrice": round(cheap_price, 1),
                    "discount": round(discount, 1)
                }

    # PEG Ratio
    if eps_yoy > 0 and pe_ratio > 0:
        peg = round(pe_ratio / eps_yoy, 2)
        
    # Fetch dividend data for moat check
    start_date_10y = (datetime.now() - timedelta(days=10*365)).strftime("%Y-%m-%d")
    dividend_data = await client.fetch_dividend(stock_id, start_date_10y, end_date)
    await client.close()

    # --- Phase 3: Moat & Stability Calculation ---
    moat_items = []
    moat_score = 100
    
    # 1. Continuous Profit (5 years ~ 20 quarters)
    profit_quarters = sum(1 for ish in is_history if ish.net_income and ish.net_income > 0)
    has_continuous_profit = profit_quarters >= 16
    moat_items.append({
        "label": f"近 5 年穩定獲利 ({profit_quarters}/20 季)", 
        "status": "pass" if has_continuous_profit else "fail"
    })
    if not has_continuous_profit:
        moat_score -= 25

    # 2. Continuous Dividend
    # Extract unique years of cash dividends
    dividend_years = set(d['date'][:4] for d in dividend_data if d.get('CashEarningsDistribution', 0) > 0 or d.get('CashStatutorySurplus', 0) > 0)
    has_continuous_dividend = len(dividend_years) >= 4 
    moat_items.append({
        "label": f"連續配息達標 ({len(dividend_years)}/5 年)",
        "status": "pass" if has_continuous_dividend else "fail"
    })
    if not has_continuous_dividend:
        moat_score -= 25

    # 3. Margin Stability
    gross_margins = []
    for ish in is_history:
        if ish.gross_profit is not None and ish.revenue is not None and ish.revenue > 0:
            gross_margins.append(ish.gross_profit / ish.revenue * 100)
    
    if len(gross_margins) > 4:
        import statistics
        gm_std = statistics.stdev(gross_margins[:12])
        is_margin_stable = gm_std < 5.0
        moat_items.append({
            "label": f"毛利率變動幅度 (<5%)",
            "status": "pass" if is_margin_stable else "fail"
        })
        if not is_margin_stable:
             moat_score -= 25
    else:
        moat_items.append({
            "label": f"毛利率變動幅度 (<5%)",
            "status": "fail"
        })
        moat_score -= 25

    # 4. Cash Quality (Free Cash Flow positive)
    has_fcf = latest_cf.free_cash_flow and latest_cf.free_cash_flow > 0
    moat_items.append({
        "label": "當期自由現金流為正",
        "status": "pass" if has_fcf else "fail"
    })
    if not has_fcf:
        moat_score -= 25

    val_items = [
        {"label": "本益比", "value": fmt_x(pe_ratio) if pe_ratio > 0 else "虧損中", "target": "<15x", "status": "pass" if pe_ratio > 0 and pe_ratio < 15 else "neutral" if pe_ratio >= 15 and pe_ratio < 25 else "fail"},
        {"label": "股價淨值比", "value": fmt_x(pb_ratio) if pb_ratio > 0 else "N/A", "target": "<2.0x", "status": "pass" if pb_ratio > 0 and pb_ratio < 2.0 else "neutral" if pb_ratio >= 2.0 and pb_ratio < 4.0 else "fail"},
        {"label": "殖利率", "value": fmt_pct(dividend_yield), "target": ">4.0%", "status": "pass" if dividend_yield > 4.0 else "neutral" if dividend_yield > 2.0 else "fail"}
    ]
    val_score = sum([100 if i["status"] == "pass" else 60 if i["status"] == "neutral" else 20 for i in val_items]) // 3

    total_score = (profit_score + solv_score + growth_score + val_score) // 4

    asset_turnover = (latest_is.revenue / latest_bs.total_assets) if latest_is.revenue is not None and latest_bs.total_assets and latest_bs.total_assets > 0 else 0
    equity_multiplier = (latest_bs.total_assets / latest_bs.shareholders_equity) if latest_bs.total_assets is not None and latest_bs.shareholders_equity and latest_bs.shareholders_equity > 0 else 0
    cash_conversion_rate = (latest_cf.operating_cash_flow / latest_is.net_income * 100) if latest_cf.operating_cash_flow is not None and latest_is.net_income and latest_is.net_income > 0 else 0

    # --- Dividend History Aggregation (10 Years) ---
    yearly_dividends = {}
    for d in dividend_data:
        try:
            y = d.get('year') or d['date'][:4]
            y_int = parse_taiwan_year(str(y))
            if y_int not in yearly_dividends:
                yearly_dividends[y_int] = 0.0
            
            c1 = float(d.get('CashEarningsDistribution') or 0)
            c2 = float(d.get('CashStatutorySurplus') or 0)
            s1 = float(d.get('StockEarningsDistribution') or 0)
            s2 = float(d.get('StockStatutorySurplus') or 0)
            yearly_dividends[y_int] += c1 + c2 + s1 + s2
        except Exception:
            continue
    
    dividend_history = [{"year": y, "amount": round(amt, 2), "payoutRatio": 0} for y, amt in sorted(yearly_dividends.items(), key=lambda x: x[0], reverse=True)[:10]]

    # --- Decision Quadrant Logic ---
    total_score = (profit_score + solv_score + growth_score + val_score) // 4
    health_score = (profit_score + solv_score + growth_score) // 3 # Pure fundamentals
    
    decision_quadrant = "Fairly Valued"
    if health_score > 80 and pe_percentile < 40:
        decision_quadrant = "Quality Undervalued"
    elif health_score > 80 and pe_percentile > 70 and peg > 0 and peg < 1.0:
        decision_quadrant = "Growth Premium"
    elif health_score < 50 and pe_percentile < 30:
        decision_quadrant = "Value Trap"

    advanced_data = {
        "dupont": {
            "roe": round(roe, 1),
            "netMargin": round(net_margin, 1),
            "assetTurnover": round(asset_turnover, 2),
            "equityMultiplier": round(equity_multiplier, 2)
        },
        "cashConversion": round(cash_conversion_rate, 1),
        "pePercentile": pe_percentile,
        "peBand": pe_band,
        "mos": mos,
        "peg": peg,
        "fcfTrend": [{"quarter": f"Q{i}", "value": v} for i, v in enumerate(fcf_hist[::-1])][-12:], # fake quarter label for now, frontend uses idx
        "dividendHistory": dividend_history,
        "decisionQuadrant": decision_quadrant,
        "moat": moat_items,
        "moatScore": max(0, moat_score)
    }

    advanced_data["prosCons"] = await generate_pros_cons_with_gemini(stock_id, {
        "dupont": advanced_data["dupont"],
        "profitability": {"items": profit_items},
        "growth": {"items": growth_items},
        "pePercentile": pe_percentile,
        "peg": peg,
        "mos": mos,
        "moatScore": max(0, moat_score),
        "cashConversion": cash_conversion_rate,
        "decisionQuadrant": decision_quadrant
    })

    return "api/db calculation", {
        "totalScore": int(total_score),
        "profitability": {"score": int(profit_score), "items": profit_items},
        "solvency": {"score": int(solv_score), "items": solv_items},
        "growth": {"score": int(growth_score), "items": growth_items},
        "valuation": {"score": int(val_score), "items": val_items},
        "advanced": advanced_data
    }

async def generate_pros_cons_with_gemini(stock_id: str, data: dict):
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        return _generate_rule_based_pros_cons(data)
    
    try:
        genai.configure(api_key=gemini_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        roe = data['dupont']['roe']
        moat = data['moatScore']
        pe = data['pePercentile']
        cash = data['cashConversion']
        quadrant = data.get('decisionQuadrant', 'Fairly Valued')
        peg = data.get('peg', 0)
        
        prompt = f'''
        請根據以下台股股票的最新真實財務健檢數據，生成 3 點「優勢 (pros)」與 3 點「風險與弱勢 (cons)」，並在最上方提供一段總結 (aiSummary)。
        返回格式必須為純 JSON (無 Markdown)，包含 "aiSummary" (string), "pros" (list of strings) 與 "cons" (list of strings)。
        
        【重要結論邏輯】
        1. 結論先行：aiSummary 請提供約 30 字的快速判斷，例如「目前基本面極強，但估值位於歷史高位，建議分批佈局」。
        2. 避免邏輯矛盾：如果「決策象限」為 {quadrant}，或者 P/E 分位數為 {pe}% (偏高代表昂貴)，請在 Cons 中點出估值風險，並且 Pros 絕對不可以說「估值具備吸引力」。

        資料：
        - 決策象限：{quadrant} (Quality Undervalued=優質低估, Growth Premium=成長溢價, Value Trap=價值陷阱, Fairly Valued=合理評價)
        - 杜邦分析 ROE: {roe}%
        - P/E 處於近五年分位數: {pe}% (越低代表越便宜)
        - PEG 估值: {peg}
        - 獲利穩定護城河分數: {moat} 分 (滿分100)
        - 現金轉向率: {cash}%
        - 毛利率現況: {data['profitability']['items'][0]['value']}
        - 自由現金流: {data['growth']['items'][2]['value']}
        '''
        response = await asyncio.to_thread(model.generate_content, prompt)
        text = response.text
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1]
            
        result = json.loads(text.strip())
        fallback = _generate_rule_based_pros_cons(data)
        return {
            "aiSummary": result.get("aiSummary", fallback.get("aiSummary", "基本面表現平穩，請參閱詳細指標。")),
            "pros": result.get("pros", [])[:3] or fallback["pros"],
            "cons": result.get("cons", [])[:3] or fallback["cons"]
        }
    except Exception as e:
        print(f"Gemini Pros/Cons error: {e}")
        return _generate_rule_based_pros_cons(data)

def _generate_rule_based_pros_cons(data: dict):
    pros = []
    cons = []
    
    roe = data.get('dupont', {}).get('roe', 0)
    if roe > 15:
        pros.append(f"具備高水平的股東權益報酬率 (ROE {roe}%)")
    elif roe < 5:
        cons.append(f"股東權益報酬率偏低 (ROE {roe}%)")
        
    pe_percentile = data.get('pePercentile', 50)
    if pe_percentile < 30:
        pros.append("估值具備一定吸引力，處於歷史低位區間")
    elif pe_percentile > 80:
        cons.append("目前市場估值偏高，具備追高風險")
        
    cash = data.get('cashConversion', 0)
    if cash > 100:
        pros.append("獲利轉現金效率極高 (現金轉向率>100%)")
    elif cash < 50:
        cons.append("營業現金流入能力偏弱")
        
    moat = data.get('moatScore', 0)
    if moat >= 80:
        pros.append("具備強大穩定性與配息護城河")
    elif moat <= 40:
        cons.append("長期獲利穩定性與配息能力不足")

    if not pros: pros.append("各項核心指標表現平穩，符合產業均值")
    if not cons: cons.append("財務結構穩健，暫無顯著異常風險訊號")
    
    quadrant = data.get('decisionQuadrant', 'Fairly Valued')
    summary = "基本面表現平穩，請參閱詳細指標。"
    if quadrant == "Quality Undervalued": summary = "體質優良且估值偏低，具備中長線投資價值。"
    elif quadrant == "Growth Premium": summary = "增長強勁但估值偏高，建議關注成長動能是否延續。"
    elif quadrant == "Value Trap": summary = "估值雖低但體質孱弱，請留意是否為價值陷阱。"
    
    return {"aiSummary": summary, "pros": pros[:3], "cons": cons[:3]}
