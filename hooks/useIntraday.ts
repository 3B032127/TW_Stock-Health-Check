import { useQuery } from '@tanstack/react-query';
import { api, ApiResponse } from '../services/api';

export interface IntradayPoint {
  time: string;
  value: number;
  volume: number;
}

export const useIntraday = (stockId: string, range: string = '1D') => {
    return useQuery({
        queryKey: ['intraday', stockId, range],
        queryFn: async () => {
            if (!stockId) return [];
            // Direct fetch to handle query parameter since api.ts might not have it yet
            const response = await fetch(`http://localhost:8000/api/v1/stock/${stockId}/intraday?range=${range}`);
            const data = await response.json() as ApiResponse<IntradayPoint[]>;
            return data.data || [];
        },
        enabled: !!stockId,
        refetchInterval: range === '1D' ? 30 * 1000 : false, // Only refetch if it's today
        staleTime: range === '1D' ? 30 * 1000 : Infinity,
    });
};

