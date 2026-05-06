import { useQuery } from '@tanstack/react-query';
import { api, ApiResponse } from '../services/api';

export interface QuoteData {
  stock_id: string;
  name: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number;
  yesterday_close: number;
  change: number;
  change_percent: number;
}

export const useQuote = (stockId: string) => {
    return useQuery({
        queryKey: ['quote', stockId],
        queryFn: async () => {
            if (!stockId) return null;
            // Add a new method getQuote in services/api.ts or just fetch here
            const response = await fetch(`http://localhost:8000/api/v1/stock/${stockId}/quote`);
            const data = await response.json() as ApiResponse<QuoteData>;
            return data.data;
        },
        enabled: !!stockId,
        refetchInterval: 5 * 1000, // Refetch every 5 seconds for real-time feel
        staleTime: 2 * 1000,
    });
};
