import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export interface StockInfo {
    industry_category: string;
    stock_id: string;
    stock_name: string;
    type: string;
    date: string;
}

export function useStockList() {
    const query = useQuery({
        queryKey: ['stockList'],
        queryFn: async (): Promise<StockInfo[]> => {
            const result = await api.getStockList();
            if (result.status === 'success' && Array.isArray(result.data)) {
                return result.data.filter((s: any) => {
                    const t = (s.type || s.market || '').toLowerCase();
                    return !t || t === 'twse' || t === 'tpex' || t === 'emerging';
                });
            }
            return [];
        },
        staleTime: Infinity, // Cache forever for the session
        gcTime: Infinity,
    });

    return {
        stocks: query.data ?? [],
        isLoading: query.isLoading,
        error: query.error as Error | null,
    };
}
