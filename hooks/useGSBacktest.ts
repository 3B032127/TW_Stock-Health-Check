import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { GSBacktestData } from '../types';

export const useGSBacktest = (
  stockId: string,
  strategy: string = 'multi_factor',
  startDate?: string,
  endDate?: string,
  initialCapital: number = 1000000
) => {
  return useQuery<GSBacktestData, Error>({
    queryKey: ['gsBacktest', stockId, strategy, startDate || '1y', endDate || 'latest', initialCapital],
    queryFn: async () => {
      const response = await api.getGSBacktest(stockId, strategy, startDate, endDate, initialCapital);
      return response.data as GSBacktestData;
    },
    enabled: !!stockId,
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
  });
};
