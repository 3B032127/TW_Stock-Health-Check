import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { GSFactorData } from '../types';

export const useGSFactor = (stockId: string, date?: string) => {
  return useQuery<GSFactorData, Error>({
    queryKey: ['gsFactor', stockId, date || 'latest'],
    queryFn: async () => {
      const response = await api.getGSFactor(stockId, date);
      return response.data as GSFactorData;
    },
    enabled: !!stockId,
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
  });
};
