import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '../services/api';

export interface SyncStatus {
    is_stale: boolean;
    stale_types: string[];
    last_updated: number | null;
}

export function useStockSync(stockId: string) {
    const queryClient = useQueryClient();

    // Query to check status
    const { data, isLoading, refetch } = useQuery<SyncStatus>({
        queryKey: ['stockSyncStatus', stockId],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/stock/${stockId}/sync-status`);
            if (!res.ok) throw new Error('Network response was not ok');
            return res.json();
        },
        refetchInterval: 60000, // Check every minute
    });

    // Mutation to trigger sync
    const syncMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`${API_BASE_URL}/stock/${stockId}/sync`, { method: 'POST' });
            if (!res.ok) throw new Error('Network response was not ok');
            return res.json();
        },
        onSuccess: () => {
            // Invalidate all queries related to this stock to trigger a refetch
            queryClient.invalidateQueries({ queryKey: ['companyProfile', stockId] });
            queryClient.invalidateQueries({ queryKey: ['financials', stockId] });
            queryClient.invalidateQueries({ queryKey: ['healthCheck', stockId] });
            queryClient.invalidateQueries({ queryKey: ['stockSyncStatus', stockId] });
            queryClient.invalidateQueries({ queryKey: ['valuationMetrics', stockId] });
            queryClient.invalidateQueries({ queryKey: ['peerComparison', stockId] });
            queryClient.invalidateQueries({ queryKey: ['dividends', stockId] });
        }
    });

    return {
        syncStatus: data,
        isCheckingStatus: isLoading,
        isSyncing: syncMutation.isPending,
        triggerSync: () => syncMutation.mutate(),
    };
}
