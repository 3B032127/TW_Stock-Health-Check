export const API_BASE_URL = "http://localhost:8000/api/v1";

export interface ApiResponse<T> {
    status: string;
    source: string;
    data: T;
}

export const api = {
    // Financial Statements
    getIncomeStatement: async (stockId: string, year: number, quarter: number) => {
        const response = await fetch(`${API_BASE_URL}/finance/income_statement?stock_id=${stockId}&year=${year}&quarter=${quarter}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    },

    getBalanceSheet: async (stockId: string, year: number, quarter: number) => {
        const response = await fetch(`${API_BASE_URL}/finance/balance_sheet?stock_id=${stockId}&year=${year}&quarter=${quarter}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    },

    getCashFlow: async (stockId: string, year: number, quarter: number) => {
        const response = await fetch(`${API_BASE_URL}/finance/cash_flow?stock_id=${stockId}&year=${year}&quarter=${quarter}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    },

    // Market Data
    getChips: async (stockId: string, days: number = 30) => {
        const response = await fetch(`${API_BASE_URL}/stock/chips?stock_id=${stockId}&days=${days}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    },

    getStockPrice: async (stockId: string, days: number = 180) => {
        const response = await fetch(`${API_BASE_URL}/stock/price?stock_id=${stockId}&days=${days}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    },

    getDividend: async (stockId: string) => {
        const response = await fetch(`${API_BASE_URL}/stock/dividend?stock_id=${stockId}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    },

    // Economics
    getEconomicIndicators: async () => {
        const response = await fetch(`${API_BASE_URL}/market/economics`);
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    },

    // Market Indicators (Real-time)
    getMarketIndicators: async () => {
        const response = await fetch(`${API_BASE_URL}/market/indicators`);
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    },

    // Financial History
    getIncomeStatementHistory: async (stockId: string, limit: number = 8) => {
        const response = await fetch(`${API_BASE_URL}/finance/income_statement/history?stock_id=${stockId}&limit=${limit}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    },
    getBalanceSheetHistory: async (stockId: string, limit: number = 8) => {
        const response = await fetch(`${API_BASE_URL}/finance/balance_sheet/history?stock_id=${stockId}&limit=${limit}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    },
    getCashFlowHistory: async (stockId: string, limit: number = 8) => {
        const response = await fetch(`${API_BASE_URL}/finance/cash_flow/history?stock_id=${stockId}&limit=${limit}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    },

    // TAIEX Data
    getTaixData: async (period: '1d' | '1w' | '1m' | '1y' = '1m') => {
        const response = await fetch(`${API_BASE_URL}/market/taiex?period=${period}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    },

    // Stock List
    getStockList: async () => {
        const response = await fetch(`${API_BASE_URL}/stock/list`);
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    },

    // Stock Rankings
    getTopGainers: async (limit: number = 10) => {
        const response = await fetch(`${API_BASE_URL}/market/rankings/gainers?limit=${limit}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    },

    getTopLosers: async (limit: number = 10) => {
        const response = await fetch(`${API_BASE_URL}/market/rankings/losers?limit=${limit}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    }
};

