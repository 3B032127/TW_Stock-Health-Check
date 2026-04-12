from sqlalchemy import Column, Integer, String, BigInteger, Float, UniqueConstraint
from .database import Base

class FinancialStatement(Base):
    __tablename__ = "financial_reports"

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(String, index=True)
    year = Column(Integer)
    quarter = Column(Integer)
    
    revenue = Column(BigInteger)           # 營業收入
    gross_profit = Column(BigInteger)      # 營業毛利
    operating_income = Column(BigInteger)  # 營業利益
    pre_tax_income = Column(BigInteger)    # 稅前淨利
    net_income = Column(BigInteger)        # 本期淨利
    eps = Column(Float)                    # EPS

    __table_args__ = (UniqueConstraint('stock_id', 'year', 'quarter', name='uix_financial_reports_stock_iq_y_q'),)


class BalanceSheet(Base):
    __tablename__ = "balance_sheets"

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(String, index=True)
    year = Column(Integer)
    quarter = Column(Integer)

    cash_equivalents = Column(BigInteger)       # 現金及約當現金
    accounts_receivable = Column(BigInteger)    # 應收帳款淨額
    inventories = Column(BigInteger)            # 存貨
    current_assets = Column(BigInteger)         # 流動資產合計
    fixed_assets = Column(BigInteger)           # 固定資產 (PP&E)
    total_assets = Column(BigInteger)           # 資產總額
    current_liabilities = Column(BigInteger)    # 流動負債合計
    long_term_liabilities = Column(BigInteger)  # 長期負債
    total_liabilities = Column(BigInteger)      # 負債總額
    shareholders_equity = Column(BigInteger)    # 母公司權益
    net_assets = Column(BigInteger)             # 權益總額

    __table_args__ = (UniqueConstraint('stock_id', 'year', 'quarter', name='uix_balance_sheets_stock_iq_y_q'),)


class CashFlowStatement(Base):
    __tablename__ = "cash_flow_statements"

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(String, index=True)
    year = Column(Integer)
    quarter = Column(Integer)

    operating_cash_flow = Column(BigInteger)  # 營業現金流
    investing_cash_flow = Column(BigInteger)  # 投資現金流
    financing_cash_flow = Column(BigInteger)  # 籌資現金流
    capex = Column(BigInteger)                # 資本支出
    free_cash_flow = Column(BigInteger)       # 自由現金流 (Calculated)
    ending_cash_balance = Column(BigInteger)  # 期末現金

    __table_args__ = (UniqueConstraint('stock_id', 'year', 'quarter', name='uix_cash_flow_statements_stock_iq_y_q'),)

class ChipsDaily(Base):
    __tablename__ = "chips_daily"
    
    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(String, index=True)
    date = Column(String, index=True)
    
    # 單位: 股 (FinMind 預設) -> 轉換為張數需 / 1000
    foreign_buy = Column(BigInteger)   # 外資買進
    foreign_sell = Column(BigInteger)  # 外資賣出
    foreign_net = Column(BigInteger)   # 外資買賣超 (buy - sell)
    
    trust_buy = Column(BigInteger)     # 投信買進
    trust_sell = Column(BigInteger)    # 投信賣出
    trust_net = Column(BigInteger)     # 投信買賣超
    
    dealer_buy = Column(BigInteger)    # 自營商買進
    dealer_sell = Column(BigInteger)   # 自營商賣出
    dealer_net = Column(BigInteger)    # 自營商買賣超

    __table_args__ = (UniqueConstraint('stock_id', 'date', name='uix_chips_daily_stock_date'),)

class StockPriceDaily(Base):
    __tablename__ = "stock_prices_daily"

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(String, index=True)
    date = Column(String, index=True)
    
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(BigInteger) # 成交股數



    __table_args__ = (UniqueConstraint('stock_id', 'date', name='uix_stock_prices_daily_stock_date'),)


class Dividend(Base):
    __tablename__ = "dividends"
    
    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(String, index=True)
    date = Column(String, index=True) # 除息日
    year = Column(Integer) # 發放年度 (e.g. 2023)
    
    cash = Column(Float)   # 現金股利
    stock = Column(Float)  # 股票股利
    total = Column(Float)  # 合計

    __table_args__ = (UniqueConstraint('stock_id', 'date', 'year', name='uix_dividends_stock_date_year'),)


    __table_args__ = (UniqueConstraint('stock_id', 'date', 'year', name='uix_dividends_stock_date_year'),)


class EconomicIndicator(Base):
    __tablename__ = "economic_indicators"
    
    id = Column(Integer, primary_key=True, index=True)
    indicator = Column(String, index=True) # e.g. GDP, CPI
    date = Column(String, index=True)
    value = Column(Float)
    
    __table_args__ = (UniqueConstraint('indicator', 'date', name='uix_economic_indicators_indicator_date'),)

class SyncMetadata(Base):
    __tablename__ = "sync_metadata"
    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(String, index=True)
    data_type = Column(String, index=True) # price, finance, chips, dividends
    last_updated = Column(BigInteger) # timestamp
    last_data_date = Column(String) # the max date or quarter available in DB
    __table_args__ = (UniqueConstraint('stock_id', 'data_type', name='uix_sync_metadata_stock_type'),)

class MarketCapCache(Base):
    __tablename__ = "market_cap_cache"
    stock_id = Column(String, primary_key=True, index=True)
    market_cap = Column(Float)
    last_updated = Column(BigInteger)

