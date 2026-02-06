from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from .. import models
from .finmind import FinMindClient

async def get_chips_data(db: Session, stock_id: str, days: int = 30):
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    # 1. Check DB
    db_items = db.query(models.ChipsDaily).filter(
        models.ChipsDaily.stock_id == stock_id,
        models.ChipsDaily.date >= start_date
    ).order_by(models.ChipsDaily.date.asc()).all()

    if len(db_items) >= int(days * 0.6): 
        return "db", db_items

    # 2. Fetch from API
    client = FinMindClient()
    data_list = await client.fetch_chips(stock_id, start_date, end_date)
    await client.close()

    if not data_list:
        return "api", db_items 

    # 3. Insert/Update
    grouped_by_date = {}
    for d in data_list:
        dt = d['date']
        if dt not in grouped_by_date:
            grouped_by_date[dt] = {'foreign':0, 'trust':0, 'dealer':0}
        
        net = d['buy'] - d['sell']
        name = d['name']
        if name == 'Foreign_Investor': grouped_by_date[dt]['foreign'] += net
        elif name == 'Investment_Trust': grouped_by_date[dt]['trust'] += net
        elif name in ['Dealer_Self', 'Dealer_Hedging', 'Dealer']: grouped_by_date[dt]['dealer'] += net

    for dt, v in grouped_by_date.items():
        existing = db.query(models.ChipsDaily).filter_by(stock_id=stock_id, date=dt).first()
        if not existing:
            item = models.ChipsDaily(
                stock_id=stock_id, 
                date=dt,
                foreign_net=v['foreign'],
                trust_net=v['trust'],
                dealer_net=v['dealer']
            )
            db.add(item)
    
    try:
        db.commit()
    except:
        db.rollback()
        
    final_items = db.query(models.ChipsDaily).filter(
        models.ChipsDaily.stock_id == stock_id,
        models.ChipsDaily.date >= start_date
    ).order_by(models.ChipsDaily.date.asc()).all()
    
    return "api", final_items

async def get_stock_price(db: Session, stock_id: str, days: int = 180):
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    db_items = db.query(models.StockPriceDaily).filter(
        models.StockPriceDaily.stock_id == stock_id,
        models.StockPriceDaily.date >= start_date
    ).order_by(models.StockPriceDaily.date.asc()).all()
    
    if len(db_items) >= int(days * 0.6):
        return "db", db_items
        
    client = FinMindClient()
    data_list = await client.fetch_price(stock_id, start_date, end_date)
    await client.close()
    
    if not data_list: return "api", db_items
    
    for d in data_list:
        existing = db.query(models.StockPriceDaily).filter_by(stock_id=stock_id, date=d['date']).first()
        if not existing:
            item = models.StockPriceDaily(
                stock_id=stock_id,
                date=d['date'],
                open=d['open'],
                high=d['max'],
                low=d['min'],
                close=d['close'],
                volume=d['Trading_Volume']
            )
            db.add(item)
            
    try:
        db.commit()
    except:
        db.rollback()
        
    final_items = db.query(models.StockPriceDaily).filter(
        models.StockPriceDaily.stock_id == stock_id,
        models.StockPriceDaily.date >= start_date
    ).order_by(models.StockPriceDaily.date.asc()).all()
    
    return "api", final_items

async def get_dividend_data(db: Session, stock_id: str):
    db_items = db.query(models.Dividend).filter_by(stock_id=stock_id).order_by(models.Dividend.year.desc()).all()
    
    if len(db_items) > 0:
        return "db", db_items
        
    client = FinMindClient()
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=365*10)).strftime("%Y-%m-%d")
    
    data_list = await client.fetch_dividend(stock_id, start_date, end_date)
    await client.close()
    
    if not data_list: return "api", db_items
    
    for d in data_list:
        if not d.get('year'): continue
        # FinMind 'year' might be string or float
        y_val = d.get('year')
        try:
            year_int = int(float(y_val))
        except:
            continue
            
        existing = db.query(models.Dividend).filter_by(stock_id=stock_id, year=year_int).first()
        if not existing:
            cash = float(d.get('CashEarningsDistribution', 0) or 0)
            stock = float(d.get('StockEarningsDistribution', 0) or 0)
            item = models.Dividend(
                stock_id=stock_id,
                date=d['date'],
                year=year_int,
                cash=cash,
                stock=stock,
                total=cash + stock
            )
            db.add(item)
            
    try:
        db.commit()
    except:
        db.rollback()
        
    final_items = db.query(models.Dividend).filter_by(stock_id=stock_id).order_by(models.Dividend.year.desc()).all()
    return "api", final_items

async def get_economic_data(db: Session):
    results = {}
    client = FinMindClient()
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=365*2)).strftime("%Y-%m-%d")
    
    indicators = ['Consumer Price Index', 'Unemployment Rate'] 
    
    for ind in indicators:
        db_items = db.query(models.EconomicIndicator).filter_by(indicator=ind).order_by(models.EconomicIndicator.date.desc()).all()
        
        if len(db_items) > 5: 
             results[ind] = db_items
             continue
             
        data_list = await client.fetch_economics(ind, start_date, end_date)
        if data_list:
            for d in data_list:
                existing = db.query(models.EconomicIndicator).filter_by(indicator=ind, date=d['date']).first()
                if not existing:
                    item = models.EconomicIndicator(
                        indicator=ind,
                        date=d['date'],
                        value=float(d['value'])
                    )
                    db.add(item)
            try:
                db.commit()
            except:
                db.rollback()
            results[ind] = db.query(models.EconomicIndicator).filter_by(indicator=ind).order_by(models.EconomicIndicator.date.desc()).all()
        else:
            results[ind] = db_items
    
    await client.close()
    return "mixed", results
