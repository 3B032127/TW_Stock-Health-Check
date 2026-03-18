import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export interface TableRow {
    item: string;
    values: string[];
    highlight?: boolean;
}

export interface FinancialDataParsed {
    chartData: any[];
    tableData: {
        headers: string[];
        rows: TableRow[];
    };
}

export interface FinancialsHookResult {
    income: FinancialDataParsed | null;
    balance: FinancialDataParsed | null;
    cashFlow: FinancialDataParsed | null;
}

const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '-';
    // e.g. 592644 (in millions maybe? actually FinMind returns in thousands or ones. 
    // Usually TWD stock data is in thousands. Let's just output locale string)
    // Actually the mock data uses "592,644" 
    // And for EPS it uses "8.70". We'll just differentiate if it's < 1000
    if (Math.abs(num) < 1000 && !Number.isInteger(num)) {
        return num.toFixed(2);
    }
    return Math.round(num / 1000000).toLocaleString(); // Convert to millions, like mock data
}

export const useFinancials = (stockId: string) => {
    return useQuery<FinancialsHookResult, Error>({
        queryKey: ['financials', stockId],
        queryFn: async () => {
            const [incomeRes, balanceRes, cashFlowRes] = await Promise.all([
                api.getIncomeStatementHistory(stockId, 8),
                api.getBalanceSheetHistory(stockId, 8),
                api.getCashFlowHistory(stockId, 8)
            ]);

            const incomeItems = incomeRes.data?.history || [];
            const balanceItems = balanceRes.data?.history || [];
            const cashFlowItems = cashFlowRes.data?.history || [];

            // Sort ascending for chart (old to new)
            const incomeAsc = [...incomeItems].reverse();
            const balanceAsc = [...balanceItems].reverse();
            const cashFlowAsc = [...cashFlowItems].reverse();

            // Chart Data
            const incomeChartData = incomeAsc.map((item: any) => ({
                quarter: `${item.year % 100}Q${item.quarter}`,
                revenue: (item.revenue || 0) / 100000000, // Show in hundred million for chart to fit nicely
                netIncome: (item.net_income || 0) / 100000000
            }));

            const balanceChartData = balanceAsc.map((item: any) => ({
                quarter: `${item.year % 100}Q${item.quarter}`,
                assets: (item.total_assets || 0) / 100000000,
                liabilities: (item.total_liabilities || 0) / 100000000,
                equity: ((item.total_assets || 0) - (item.total_liabilities || 0)) / 100000000
            }));

            const cashFlowChartData = cashFlowAsc.map((item: any) => ({
                quarter: `${item.year % 100}Q${item.quarter}`,
                operating: (item.operating_cash_flow || 0) / 100000000,
                investing: (item.investing_cash_flow || 0) / 100000000,
                financing: (item.financing_cash_flow || 0) / 100000000
            }));

            // Table headers (descending - new to old)
            // Show only first 5 items for table to match design
            const incTop5 = incomeItems.slice(0, 5);
            const balTop5 = balanceItems.slice(0, 5);
            const cfTop5 = cashFlowItems.slice(0, 5);

            const getHeaders = (items: any[]) => items.map(item => `${item.year} Q${item.quarter}`);

            // Income Table Data
            const incomeRows: TableRow[] = [
                { item: '營業收入', values: incTop5.map(i => formatNumber(i.revenue)) },
                { item: '營業毛利', values: incTop5.map(i => formatNumber(i.gross_profit)) },
                { item: '營業利益', values: incTop5.map(i => formatNumber(i.operating_income)) },
                { item: '稅前淨利', values: incTop5.map(i => formatNumber(i.pre_tax_income)) },
                { item: '本期淨利', values: incTop5.map(i => formatNumber(i.net_income)), highlight: true },
                { item: '基本 EPS (元)', values: incTop5.map(i => formatNumber(i.eps)) },
            ];

            // Balance Table Data
            const balanceRows: TableRow[] = [
                { item: '現金及約當現金', values: balTop5.map(i => formatNumber(i.cash_equivalents)) },
                { item: '應收帳款', values: balTop5.map(i => formatNumber(i.accounts_receivable)) },
                { item: '存貨', values: balTop5.map(i => formatNumber(i.inventories)) },
                { item: '流動資產合計', values: balTop5.map(i => formatNumber(i.current_assets)), highlight: true },
                { item: '不動產廠房設備', values: balTop5.map(i => formatNumber(i.fixed_assets)) },
                { item: '資產總計', values: balTop5.map(i => formatNumber(i.total_assets)), highlight: true },
                { item: '流動負債', values: balTop5.map(i => formatNumber(i.current_liabilities)) },
                { item: '長期負債', values: balTop5.map(i => formatNumber(i.long_term_liabilities)) },
                { item: '負債總計', values: balTop5.map(i => formatNumber(i.total_liabilities)), highlight: true },
                { item: '股東權益總計', values: balTop5.map(i => formatNumber(i.shareholders_equity)), highlight: true },
            ];

            // Cash Flow Table Data
            const cashFlowRows: TableRow[] = [
                { item: '營業活動現金流', values: cfTop5.map(i => formatNumber(i.operating_cash_flow)), highlight: true },
                { item: '投資活動現金流', values: cfTop5.map(i => formatNumber(i.investing_cash_flow)), highlight: true },
                { item: '籌資活動現金流', values: cfTop5.map(i => formatNumber(i.financing_cash_flow)), highlight: true },
                { item: '資本支出', values: cfTop5.map(i => formatNumber(i.capex)) },
                { item: '自由現金流量', values: cfTop5.map(i => formatNumber(i.free_cash_flow)), highlight: true },
                { item: '期末現金餘額', values: cfTop5.map(i => formatNumber(i.ending_cash_balance)) },
            ];

            return {
                income: { chartData: incomeChartData, tableData: { headers: getHeaders(incTop5), rows: incomeRows } },
                balance: { chartData: balanceChartData, tableData: { headers: getHeaders(balTop5), rows: balanceRows } },
                cashFlow: { chartData: cashFlowChartData, tableData: { headers: getHeaders(cfTop5), rows: cashFlowRows } }
            };
        },
        enabled: !!stockId,
        staleTime: 1000 * 60 * 60, // 1 hour 
    });
};
