import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export const useRevenueMix = (stockId: string) => {
    return useQuery({
        queryKey: ['revenueMix', stockId],
        queryFn: async () => {
            const response = await api.getRevenueMix(stockId);
            return response.data || [];
        },
        enabled: !!stockId,
        staleTime: 1000 * 60 * 60 * 24, // 24 hours
    });
};
