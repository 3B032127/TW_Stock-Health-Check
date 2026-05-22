export interface Stock {
  id: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  marketCap?: string;
  isLimitUp?: boolean;
  isLimitDown?: boolean;
}

export interface Indicator {
  name: string;
  value: string;
  change: string;
  changePercent: string;
  isUp: boolean;
}

export interface FinancialMetric {
  label: string;
  value: string;
  target: string;
  status: 'pass' | 'fail' | 'neutral';
  sparkline?: number[];
}

export interface HealthCheckCategory {
  score: number;
  items: FinancialMetric[];
}

export interface ProsCons {
  pros: string[];
  cons: string[];
}

export interface MoatItem {
  label: string;
  status: 'pass' | 'fail';
}

export interface DupontData {
  roe: number;
  netMargin: number;
  assetTurnover: number;
  equityMultiplier: number;
}

export interface AdvancedHealthData {
  prosCons: ProsCons & { aiSummary?: string };
  moat: MoatItem[];
  moatScore: number;
  dupont: DupontData;
  cashConversion?: number;
  pePercentile: number;
  peBand: { p0: number, p25: number, p50: number, p75: number, p100: number, current: number };
  mos?: { fairPrice: number; cheapPrice: number, discount: number };
  peg?: number;
  fcfTrend?: { quarter: string; value: number }[];
  dividendHistory?: { year: number; amount: number; payoutRatio: number }[];
  forwardYield?: number;
  decisionQuadrant?: 'Quality Undervalued' | 'Growth Premium' | 'Value Trap' | 'Fairly Valued';
  peerAvgs?: {
    total: number;
    profitability: number;
    solvency: number;
    growth: number;
    valuation: number;
    rawGrossMargin?: number | null;
    rawNetMargin?: number | null;
  };
  beta?: number;
  volatilityClass?: '防禦型 (低波動)' | '穩健型 (中波動)' | '攻擊型 (高波動)';
  nextEvent?: { name: string; date: string; daysLeft: number };
  sentiment?: { retail: number; institutional: number; status: '過熱' | '溫和' | '冷清' };
  moatRadar?: { subject: string; score: number; fullMark: number }[];
  moatKeywords?: string[];
  profitStabilityZScore?: number;
}

export interface HealthCheckData {
  totalScore: number;
  profitability: HealthCheckCategory;
  solvency: HealthCheckCategory;
  growth: HealthCheckCategory;
  valuation: HealthCheckCategory;
  advanced?: AdvancedHealthData;
}

// --- New Interfaces for Profile Data Blocks ---
export interface ValuationData {
  price: number;
  peRatio: number;
  pbRatio: number;
  dividendYield: number;
  sparklineData: { time: string; value: number }[];
  peSparkline?: { time: string; value: number }[];
  pbSparkline?: { time: string; value: number }[];
  yieldSparkline?: { time: string; value: number }[];
}

export interface FinancialHighlightsData {
  monthlyRevenue: { value: string; yoy: number };
  eps: string;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
}

export interface PeerComparisonData {
  id: string;
  name: string;
  price: number;
  peRatio: number | null;
  pbRatio: number;
  dividendYield: number;
  marketCap: number;
  psRatio?: number;

  // 營建業專屬
  contractLiabilitiesYoY?: number;
  debtRatio?: number;
  netMargin?: number;
  projectGrossMargin?: number;
  inventoryToAssetsRatio?: number;

  // 通用/科技業專屬
  grossMargin?: number;
  inventoryTurnoverDays?: number;
  rdExpenseRatio?: number;
  operatingMargin?: number;
  revenueYoY?: number;
  epsYoY?: number;
  currentRatio?: number;
  institutionalOwnership?: number;

  // 金融保險業專屬
  roa?: number;
  nplRatio?: number;
  roe?: number;
  netIncomeYoY?: number;
  capitalAdequacyRatio?: number;
}

export interface OwnershipData {
  directors: number;
  foreign: number;
  investmentTrust: number;
  totalShares?: number;
  foreignLimit?: number;
  directorPledgeRatio?: number;
  retailRatio?: number;
  majorShareholdersCount?: number;
  ownershipTrend?: { 
    date: string; 
    foreign: number; 
    investmentTrust: number; 
  }[];
}

// --- New Interfaces for Radar Engine ---
export interface RadarMetricMetadata {
  label: string; // The original field name in Chinese (e.g. '毛利率')
  valueData: string; // Formatted value (e.g. '30.5%', 'NT$ 15.2')
}

export interface RadarChartScore {
  subject: string; // '獲利能力', '成長動能', '財務安全', '估值水準', '籌碼與股息'
  score: number; // 0-100 normalized score
  metadata: RadarMetricMetadata[]; // Bottom-layer metrics contributing to this score
}

// Comprehensive raw data interface for the engine
export interface RawStockData extends PeerComparisonData {
  // 通用/科技業特有額外欄位
  operatingMargin?: number; // 營益率
  revenueYoY?: number; // 營收 YoY
  epsYoY?: number; // EPS YoY
  currentRatio?: number; // 流動比率
  institutionalOwnership?: number; // 法人持股比例

  // 營建業特有額外欄位
  netMargin?: number; // 淨利率
  projectGrossMargin?: number; // 建案毛利率
  inventoryToAssetsRatio?: number; // 存貨佔總資產比例 (越低越安全)

  // 金融業特有額外欄位
  roe?: number; // ROE
  netIncomeYoY?: number; // 淨收益 YoY
  capitalAdequacyRatio?: number; // 資本適足率 (BIS)
}
// ----------------------------------------------

export interface NavItem {
  id: string;
  label: string;
  icon: string;
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  TAIWAN_MARKET = 'TAIWAN_MARKET',
  STOCK_DETAIL = 'STOCK_DETAIL',
  ECONOMIC_INDICATORS = 'ECONOMIC_INDICATORS',
  API_TESTING = 'API_TESTING',
  DATABASE_MANAGER = 'DATABASE_MANAGER'
}

export interface DbSummary {
  fileSizeMb: number;
  totalStocks: number;
  totalRecords: number;
  tableCounts: {
    financials: number;
    prices: number;
    chips: number;
    dividends: number;
  };
}

export interface DbStockStats {
  id: string;
  name: string;
  stock_name?: string;
  lastSyncTime: number;
  price?: number;
  marketCap?: number;
  health_score?: number;
  dataTypes: Record<string, { lastUpdated: number; lastDataDate: string }>;
  records: {
    financials: number;
    prices: number;
    chips: number;
    dividends: number;
  };
}

export enum ApiTestingTab {
  MARKET_INDICATORS = 'MARKET_INDICATORS',
  RANKINGS = 'RANKINGS',
  STOCK_FINANCIALS = 'STOCK_FINANCIALS'
}

export enum StockTab {
  PROFILE = 'PROFILE',
  QUOTE = 'QUOTE',
  CHIPS = 'CHIPS',
  HEALTH_CHECK = 'HEALTH_CHECK',
  FINANCIALS = 'FINANCIALS'
}

export enum FinancialSubTab {
  INCOME = 'INCOME',
  BALANCE = 'BALANCE',
  CASH_FLOW = 'CASH_FLOW'
}

// --- Technical Analysis Types ---
export interface OHLCV {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorValue {
  time: string;
  value: number;
}

export interface MACDValue {
  time: string;
  macd: number;
  signal: number;
  histogram: number;
}

export interface StochasticValue {
  time: string;
  k: number;
  d: number;
}

export interface TechnicalIndicators {
  sma5: IndicatorValue[];
  sma20: IndicatorValue[];
  sma60: IndicatorValue[];
  ema50: IndicatorValue[];
  ema200: IndicatorValue[];
  macd: MACDValue[];
  kd: StochasticValue[];
  rsi: IndicatorValue[];
  atr: IndicatorValue[];
  obv: IndicatorValue[];
  upperBand: IndicatorValue[];
  lowerBand: IndicatorValue[];
}