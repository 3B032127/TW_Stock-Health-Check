import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { HealthCheckData } from '../types';

export const useHealthCheck = (stockId: string) => {
    return useQuery<HealthCheckData, Error>({
        queryKey: ['healthCheck', stockId],
        queryFn: async () => {
            const response = await api.getHealthCheck(stockId);
            const data = response.data as HealthCheckData;

            // Inject advanced mock data for the new UI until backend is updated for Phase 3/4
            // Inject advanced mock data for the new UI until backend is updated for Phase 5
            if (!data.advanced) {
                // @ts-ignore - temporary fallback if backend hasn't deployed
                data.advanced = {};
            }
            // Sparklines are now dynamically generated in the backend
            return data;
        },
        enabled: !!stockId,
        staleTime: 1000 * 60 * 60, // 1 hour
    });
};
