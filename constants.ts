import { Indicator, Stock, FinancialMetric, ValuationData, FinancialHighlightsData, PeerComparisonData, OwnershipData } from './types';

export const MARKET_INDEX_DATA = [
  { time: '09:00', value: 17580 },
  { time: '09:30', value: 17600 },
  { time: '10:00', value: 17620 },
  { time: '10:30', value: 17610 },
  { time: '11:00', value: 17640 },
  { time: '11:30', value: 17635 },
  { time: '12:00', value: 17660 },
  { time: '12:30', value: 17655 },
  { time: '13:00', value: 17650 },
  { time: '13:30', value: 17650.32 },
];

export const STOCK_INTRADAY_DATA = [
  { time: '09:00', value: 580 },
  { time: '09:15', value: 582 },
  { time: '09:30', value: 585 },
  { time: '09:45', value: 583 },
  { time: '10:00', value: 586 },
  { time: '10:30', value: 588 },
  { time: '11:00', value: 587 },
  { time: '11:30', value: 589 },
  { time: '12:00', value: 588 },
  { time: '12:30', value: 588.5 },
  { time: '13:00', value: 587 },
  { time: '13:30', value: 588 },
];

export const ORDER_BOOK_DATA = {
  asks: [
    { price: 588.5, volume: 152 },
    { price: 588.4, volume: 89 },
    { price: 588.3, volume: 245 },
    { price: 588.2, volume: 120 },
    { price: 588.1, volume: 56 },
  ],
  bids: [
    { price: 588.0, volume: 412 },
    { price: 587.9, volume: 320 },
    { price: 587.8, volume: 150 },
    { price: 587.7, volume: 98 },
    { price: 587.6, volume: 210 },
  ]
};

export const REVENUE_DATA = [
  { quarter: '22Q2', revenue: 534, netIncome: 237 },
  { quarter: '22Q3', revenue: 613, netIncome: 280 },
  { quarter: '22Q4', revenue: 625, netIncome: 295 },
  { quarter: '23Q1', revenue: 508, netIncome: 206 },
  { quarter: '23Q2', revenue: 480, netIncome: 181 },
  { quarter: '23Q3', revenue: 546, netIncome: 211 },
  { quarter: '23Q4', revenue: 625, netIncome: 238 },
  { quarter: '24Q1', revenue: 592, netIncome: 225 },
];

export const REVENUE_MIX_DATA = [
  { name: 'HPC 高效能運算', value: 44, color: '#135bec' },
  { name: 'Smartphone 智慧型手機', value: 33, color: '#06b6d4' },
  { name: 'IoT 物聯網', value: 10, color: '#10b981' },
  { name: 'Automotive 車用電子', value: 6, color: '#f59e0b' },
  { name: 'DCE 消費性電子', value: 2, color: '#ef4444' },
  { name: 'Others 其他', value: 5, color: '#64748b' },
];

export const DIVIDEND_HISTORY = [
  { year: '2023', cash: 11.25, stock: 0, date: '2023/12/14' },
  { year: '2022', cash: 11.00, stock: 0, date: '2022/12/15' },
  { year: '2021', cash: 10.50, stock: 0, date: '2021/12/16' },
  { year: '2020', cash: 10.00, stock: 0, date: '2020/12/17' },
  { year: '2019', cash: 9.50, stock: 0, date: '2019/12/19' },
];

export const CHIPS_TREND_DATA = [
  { date: '05/13', foreign: 2500, trust: -500, dealer: 120 },
  { date: '05/14', foreign: 1800, trust: 200, dealer: -50 },
  { date: '05/15', foreign: -3200, trust: 150, dealer: -100 },
  { date: '05/16', foreign: 4500, trust: 800, dealer: 300 },
  { date: '05/17', foreign: 5600, trust: 600, dealer: 250 },
  { date: '05/20', foreign: 3100, trust: -100, dealer: 150 },
];

export const BALANCE_SHEET_CHART_DATA = [
  { quarter: '22Q2', assets: 4500, liabilities: 1800, equity: 2700 },
  { quarter: '22Q3', assets: 4700, liabilities: 1900, equity: 2800 },
  { quarter: '22Q4', assets: 4950, liabilities: 2000, equity: 2950 },
  { quarter: '23Q1', assets: 4800, liabilities: 1950, equity: 2850 },
  { quarter: '23Q2', assets: 5100, liabilities: 2100, equity: 3000 },
  { quarter: '23Q3', assets: 5300, liabilities: 2150, equity: 3150 },
  { quarter: '23Q4', assets: 5600, liabilities: 2300, equity: 3300 },
  { quarter: '24Q1', assets: 5800, liabilities: 2400, equity: 3400 },
];

export const CASH_FLOW_CHART_DATA = [
  { quarter: '22Q2', operating: 350, investing: -200, financing: -50 },
  { quarter: '22Q3', operating: 380, investing: -220, financing: -60 },
  { quarter: '22Q4', operating: 420, investing: -250, financing: -80 },
  { quarter: '23Q1', operating: 300, investing: -180, financing: -40 },
  { quarter: '23Q2', operating: 280, investing: -150, financing: -30 },
  { quarter: '23Q3', operating: 360, investing: -210, financing: -50 },
  { quarter: '23Q4', operating: 450, investing: -280, financing: -100 },
  { quarter: '24Q1', operating: 410, investing: -240, financing: -80 },
];

export const US_YIELD_DATA = [
  { date: '2020', value: 0.9 },
  { date: '2021', value: 1.5 },
  { date: '2022', value: 3.8 },
  { date: '2023', value: 3.9 },
  { date: '2024', value: 4.25 },
];

export const INDICATORS: Indicator[] = [
  { name: '美國10年期公債殖利率', value: '4.15%', change: '+0.05%', changePercent: '', isUp: true },
  { name: '台灣消費者物價指數 (CPI)', value: '2.95%', change: '+0.12%', changePercent: '', isUp: true },
  { name: '美元/台幣匯率', value: '31.25', change: '-0.08%', changePercent: '', isUp: false },
  { name: 'VIX 恐慌指數', value: '13.45', change: '-2.10%', changePercent: '', isUp: false },
];

export const TOP_GAINERS: Stock[] = [
  { id: '2330', name: '台積電', price: 588.00, change: 8.00, changePercent: 1.38, volume: '3.2萬張' },
  { id: '2454', name: '聯發科', price: 925.00, change: 19.00, changePercent: 2.15, volume: '4,500張' },
  { id: '3231', name: '緯創', price: 98.50, change: 4.00, changePercent: 4.20, volume: '12萬張' },
  { id: '2382', name: '廣達', price: 215.50, change: 6.50, changePercent: 3.10, volume: '2.8萬張' },
];

export const TOP_LOSERS: Stock[] = [
  { id: '2603', name: '長榮', price: 155.00, change: -4.00, changePercent: -2.50, volume: '1.5萬張' },
  { id: '2609', name: '陽明', price: 52.30, change: -1.00, changePercent: -1.85, volume: '8,200張' },
  { id: '2002', name: '中鋼', price: 26.10, change: -0.25, changePercent: -0.90, volume: '1.1萬張' },
  { id: '2615', name: '萬海', price: 55.60, change: -1.80, changePercent: -3.15, volume: '5,600張' },
];

export const FINANCIAL_METRICS: Record<string, FinancialMetric[]> = {
  profitability: [
    { label: '毛利率', value: '54.3%', target: '>50%', status: 'pass' },
    { label: '股東權益報酬率', value: '28.1%', target: '>15%', status: 'pass' },
    { label: '淨利率', value: '38.8%', target: '>20%', status: 'pass' },
  ],
  solvency: [
    { label: '流動比率', value: '2.4x', target: '>1.5x', status: 'pass' },
    { label: '負債權益比', value: '0.32', target: '<0.5', status: 'pass' },
    { label: '利息保障倍數', value: '45.2x', target: '>5.0x', status: 'pass' },
  ],
  growth: [
    { label: '營收年增率', value: '-4.5%', target: '>0%', status: 'fail' },
    { label: 'EPS 成長率', value: '-2.1%', target: '>0%', status: 'neutral' },
    { label: '自由現金流', value: '+12.8%', target: '>5%', status: 'pass' },
  ],
  valuation: [
    { label: '本益比', value: '16.4x', target: '<15x', status: 'neutral' },
    { label: '股價淨值比', value: '4.8x', target: '<3.0x', status: 'fail' },
    { label: '殖利率', value: '2.1%', target: '>3.0%', status: 'neutral' },
  ]
};

export const FINANCIAL_TABLE_DATA = [
  { item: '營業收入', q1: '592,644', q4: '625,529', q3: '546,732', q2: '480,841', q1_prev: '508,633' },
  { item: '營業毛利', q1: '314,502', q4: '331,772', q3: '296,478', q2: '260,195', q1_prev: '286,511' },
  { item: '毛利率 (%)', q1: '53.07', q4: '53.04', q3: '54.23', q2: '54.11', q1_prev: '56.33', highlight: true },
  { item: '營業費用', q1: '(65,301)', q4: '(66,892)', q3: '(62,544)', q2: '(58,511)', q1_prev: '(54,588)' },
  { item: '營業利益', q1: '249,021', q4: '264,880', q3: '233,934', q2: '201,684', q1_prev: '231,923' },
  { item: '營業利益率 (%)', q1: '42.02', q4: '42.34', q3: '42.79', q2: '41.94', q1_prev: '45.60', highlight: true },
  { item: '稅後淨利', q1: '225,485', q4: '238,712', q3: '211,000', q2: '181,799', q1_prev: '206,986' },
  { item: '基本 EPS (元)', q1: '8.70', q4: '9.21', q3: '8.14', q2: '7.01', q1_prev: '7.98' },
];

export const BALANCE_SHEET_TABLE_DATA = [
  { item: '現金及約當現金', q1: '1,245,600', q4: '1,150,300', q3: '1,080,400', q2: '980,500', q1_prev: '1,100,200' },
  { item: '應收帳款', q1: '210,500', q4: '205,400', q3: '198,300', q2: '185,200', q1_prev: '190,100' },
  { item: '存貨', q1: '185,300', q4: '190,200', q3: '205,100', q2: '210,500', q1_prev: '200,800' },
  { item: '流動資產合計', q1: '1,850,000', q4: '1,760,000', q3: '1,690,000', q2: '1,580,000', q1_prev: '1,650,000', highlight: true },
  { item: '不動產廠房設備', q1: '3,200,500', q4: '3,100,200', q3: '2,950,800', q2: '2,800,400', q1_prev: '2,700,100' },
  { item: '資產總計', q1: '5,800,000', q4: '5,600,000', q3: '5,300,000', q2: '5,100,000', q1_prev: '4,800,000', highlight: true },
  { item: '流動負債', q1: '850,000', q4: '820,000', q3: '780,000', q2: '750,000', q1_prev: '720,000' },
  { item: '長期負債', q1: '1,550,000', q4: '1,480,000', q3: '1,370,000', q2: '1,350,000', q1_prev: '1,230,000' },
  { item: '負債總計', q1: '2,400,000', q4: '2,300,000', q3: '2,150,000', q2: '2,100,000', q1_prev: '1,950,000', highlight: true },
  { item: '股東權益總計', q1: '3,400,000', q4: '3,300,000', q3: '3,150,000', q2: '3,000,000', q1_prev: '2,850,000', highlight: true },
];

export const CASH_FLOW_TABLE_DATA = [
  { item: '稅前淨利', q1: '280,500', q4: '295,400', q3: '260,300', q2: '225,200', q1_prev: '255,100' },
  { item: '折舊與攤提', q1: '120,000', q4: '115,000', q3: '110,000', q2: '105,000', q1_prev: '100,000' },
  { item: '營業活動現金流', q1: '410,000', q4: '450,000', q3: '360,000', q2: '280,000', q1_prev: '300,000', highlight: true },
  { item: '資本支出', q1: '(240,000)', q4: '(280,000)', q3: '(210,000)', q2: '(150,000)', q1_prev: '(180,000)' },
  { item: '投資活動現金流', q1: '(240,000)', q4: '(280,000)', q3: '(210,000)', q2: '(150,000)', q1_prev: '(180,000)', highlight: true },
  { item: '籌資活動現金流', q1: '(80,000)', q4: '(100,000)', q3: '(50,000)', q2: '(30,000)', q1_prev: '(40,000)', highlight: true },
  { item: '自由現金流量', q1: '170,000', q4: '170,000', q3: '150,000', q2: '130,000', q1_prev: '120,000', highlight: true },
  { item: '期末現金餘額', q1: '1,245,600', q4: '1,150,300', q3: '1,080,400', q2: '980,500', q1_prev: '1,100,200' },
];

// --- Mock Data for New Company Profile Components (Construction Sector 5521) ---

export const MOCK_VALUATION_DATA: ValuationData = {
  price: 18.25,
  peRatio: 15.2,
  pbRatio: 1.2,
  dividendYield: 4.5,
  sparklineData: [
    { time: '1', value: 17.5 }, { time: '2', value: 17.6 }, { time: '3', value: 17.8 },
    { time: '4', value: 17.7 }, { time: '5', value: 17.9 }, { time: '6', value: 18.1 },
    { time: '7', value: 18.0 }, { time: '8', value: 18.2 }, { time: '9', value: 18.4 },
    { time: '10', value: 18.3 }, { time: '11', value: 18.35 }, { time: '12', value: 18.5 },
    { time: '13', value: 18.4 }, { time: '14', value: 18.6 }, { time: '15', value: 18.5 },
    { time: '16', value: 18.2 }, { time: '17', value: 18.1 }, { time: '18', value: 17.9 },
    { time: '19', value: 17.8 }, { time: '20', value: 18.0 }, { time: '21', value: 18.1 },
    { time: '22', value: 18.2 }, { time: '23', value: 18.3 }, { time: '24', value: 18.4 },
    { time: '25', value: 18.5 }, { time: '26', value: 18.6 }, { time: '27', value: 18.5 },
    { time: '28', value: 18.4 }, { time: '29', value: 18.3 }, { time: '30', value: 18.25 },
  ]
};

export const MOCK_FINANCIAL_HIGHLIGHTS: FinancialHighlightsData = {
  monthlyRevenue: { value: '4.2', yoy: 12.5 }, // in hundred millions
  eps: '1.20',
  grossMargin: 8.5,
  operatingMargin: 4.2,
  netMargin: 3.8
};

export const MOCK_PEER_COMPARISON: PeerComparisonData[] = [
  { id: '5521', name: '工信', price: 18.25, peRatio: 15.2 },
  { id: '5522', name: '遠雄', price: 78.50, peRatio: 12.5 },
  { id: '2597', name: '潤弘', price: 165.00, peRatio: 16.8 },
];

export const MOCK_OWNERSHIP_DATA: OwnershipData = {
  directors: 15.2,
  foreign: 4.5,
  investmentTrust: 1.2
};
