import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { HealthCheckData } from '../types';

export const useHealthCheck = (stockId: string) => {
    return useQuery<HealthCheckData, Error>({
        queryKey: ['healthCheck', stockId],
        queryFn: async () => {
            const response = await api.getHealthCheck(stockId);
            return response.data as HealthCheckData;
        },
        enabled: !!stockId,
        staleTime: 1000 * 60 * 60, // 1 hour
    });
};
