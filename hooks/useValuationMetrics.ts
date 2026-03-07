import { useQuery } from '@tanstack/react-query';
import { api, ApiResponse } from '../services/api';
import { ValuationData } from '../types';

export const useValuationMetrics = (stockId: string) => {
    return useQuery({
        queryKey: ['valuationMetrics', stockId],
        queryFn: async () => {
            if (!stockId) return null;
            const response = await api.getValuationMetrics(stockId) as ApiResponse<ValuationData>;
            return response.data;
        },
        enabled: !!stockId,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
        retry: 1,
    });
};
