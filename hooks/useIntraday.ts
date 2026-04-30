import { useQuery } from '@tanstack/react-query';
import { api, ApiResponse } from '../services/api';

export interface IntradayPoint {
  time: string;
  value: number;
  volume: number;
}

export const useIntraday = (stockId: string) => {
    return useQuery({
        queryKey: ['intraday', stockId],
        queryFn: async () => {
            if (!stockId) return [];
            const response = await api.getIntraday(stockId) as ApiResponse<IntradayPoint[]>;
            return response.data;
        },
        enabled: !!stockId,
        refetchInterval: 60 * 1000, // Refetch every minute
        staleTime: 30 * 1000,
    });
};
