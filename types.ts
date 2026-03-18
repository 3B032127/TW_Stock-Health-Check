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
}

export interface HealthCheckCategory {
  score: number;
  items: FinancialMetric[];
}

export interface HealthCheckData {
  totalScore: number;
  profitability: HealthCheckCategory;
  solvency: HealthCheckCategory;
  growth: HealthCheckCategory;
  valuation: HealthCheckCategory;
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
  STOCK_DETAIL = 'STOCK_DETAIL',
  ECONOMIC_INDICATORS = 'ECONOMIC_INDICATORS',
  API_TESTING = 'API_TESTING'
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