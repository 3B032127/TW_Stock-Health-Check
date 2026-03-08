import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export interface OwnershipData {
    directors: number;
    foreign: number;
    investmentTrust: number;
}

interface OwnershipResponse {
    status: string;
    source: string;
    data: OwnershipData;
}

export const useOwnershipData = (stockId: string) => {
    return useQuery({
        queryKey: ['ownership', stockId],
        queryFn: async () => {
            const response = await api.getOwnershipData(stockId);
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 2,
    });
};
