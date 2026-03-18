from pydantic import BaseModel, ConfigDict
from typing import Optional

class FinancialBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    stock_id: str
    year: int
    quarter: int

class IncomeStatement(FinancialBase):
    revenue: Optional[float]
    gross_profit: Optional[float]
    operating_income: Optional[float]
    pre_tax_income: Optional[float]
    net_income: Optional[float]
    eps: Optional[float]

class BalanceSheet(FinancialBase):
    cash_equivalents: Optional[float]
    accounts_receivable: Optional[float]
    inventories: Optional[float]
    current_assets: Optional[float]
    fixed_assets: Optional[float]
    total_assets: Optional[float]
    current_liabilities: Optional[float]
    long_term_liabilities: Optional[float]
    total_liabilities: Optional[float]
    shareholders_equity: Optional[float]
    net_assets: Optional[float]

class CashFlowStatement(FinancialBase):
    operating_cash_flow: Optional[float]
    investing_cash_flow: Optional[float]
    financing_cash_flow: Optional[float]
    capex: Optional[float]
    free_cash_flow: Optional[float]
    ending_cash_balance: Optional[float]

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

class HealthCheckMetric(BaseModel):
    label: str
    value: str
    target: str
    status: str

class HealthCheckCategory(BaseModel):
    score: int
    items: list[HealthCheckMetric]

class HealthCheckData(BaseModel):
    totalScore: int
    profitability: HealthCheckCategory
    solvency: HealthCheckCategory
    growth: HealthCheckCategory
    valuation: HealthCheckCategory
