import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export const useDividends = (stockId: string) => {
    return useQuery({
        queryKey: ['dividends', stockId],
        queryFn: async () => {
            const response = await api.getDividendHistory(stockId);
            return response.data || [];
        },
        enabled: !!stockId,
        staleTime: 1000 * 60 * 60 * 24, // 24 hours, dividends rarely change
    });
};
