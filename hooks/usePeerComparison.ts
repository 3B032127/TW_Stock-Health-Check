import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

import { PeerComparisonData, RawStockData } from '../types';

export interface PeerComparisonResponse {
    industry: string;
    peers: RawStockData[];
    industryAverage: RawStockData;
    industryRange: Record<string, { min: number, max: number, median: number }>;
}

export const usePeerComparison = (stockId: string) => {
    return useQuery<PeerComparisonResponse, Error>({
        queryKey: ['peerComparison', stockId],
        queryFn: async () => {
            const response = await api.getPeerComparison(stockId);
            return response.data as PeerComparisonResponse;
        },
        enabled: !!stockId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};
