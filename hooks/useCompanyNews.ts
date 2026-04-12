import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export const useCompanyNews = (stockId: string) => {
    return useQuery({
        queryKey: ['companyNews', stockId],
        queryFn: async () => {
            const response = await api.getCompanyNews(stockId);
            return response.data || [];
        },
        enabled: !!stockId,
        staleTime: 1000 * 60 * 30, // 30 minutes cache for news
    });
};
