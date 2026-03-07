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
  peRatio: number;
}

export interface OwnershipData {
  directors: number;
  foreign: number;
  investmentTrust: number;
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