from pydantic import BaseModel, ConfigDict
from typing import Optional

class FinancialBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    stock_id: str
    year: int
    quarter: int

class IncomeStatement(FinancialBase):
    revenue: Optional[int]
    gross_profit: Optional[int]
    operating_income: Optional[int]
    pre_tax_income: Optional[int]
    net_income: Optional[int]
    eps: Optional[float]

class BalanceSheet(FinancialBase):
    cash_equivalents: Optional[int]
    accounts_receivable: Optional[int]
    inventories: Optional[int]
    current_assets: Optional[int]
    fixed_assets: Optional[int]
    total_assets: Optional[int]
    current_liabilities: Optional[int]
    long_term_liabilities: Optional[int]
    total_liabilities: Optional[int]
    shareholders_equity: Optional[int]
    net_assets: Optional[int]

class CashFlowStatement(FinancialBase):
    operating_cash_flow: Optional[int]
    investing_cash_flow: Optional[int]
    financing_cash_flow: Optional[int]
    capex: Optional[int]
    free_cash_flow: Optional[int]
    ending_cash_balance: Optional[int]

class MarketIndicator(BaseModel):
    """Individual market indicator"""
    id: str
    name: str
    value: str
    change: str
    changePercent: str
    isUp: bool
    description: Optional[str] = None
    note: Optional[str] = None
    text: Optional[str] = None
    isPositiveForMarket: Optional[bool] = None

class MarketIndicatorsResponse(BaseModel):
    """Response for market indicators endpoint"""
    updated_at: str
    indicators: list[MarketIndicator]

class TaixCurrentData(BaseModel):
    """Current TAIEX data"""
    price: float
    change: float
    changePercent: float
    date: str
    volume: float
    high: float
    low: float
    open: float

class TaixHistoryItem(BaseModel):
    """Historical TAIEX data point"""
    date: str
    close: float
    volume: float

class TaixDataResponse(BaseModel):
    """Response for TAIEX data endpoint"""
    current: TaixCurrentData
    history: list[TaixHistoryItem]
    period: str

class ApiResponse(BaseModel):
    status: str
    source: str
    data: Optional[dict] = None
