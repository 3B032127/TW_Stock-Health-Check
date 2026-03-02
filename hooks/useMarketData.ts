import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '../services/api';
import { loadMonitorLightData, getLatestMonitorData } from '../monitorLightData';
import { getRefetchInterval, getStaleTime, getIndicatorRefetchInterval } from '../utils/tradingHours';
import { Stock } from '../types';

// ─── Interfaces (from Dashboard.tsx) ───────────────────────────

export interface TaixDataPoint {
    date: string;
    close: number;
    volume: number;
}

export interface TaixCurrentData {
    price: number;
    change: number;
    changePercent: number;
    date: string;
    volume: number;
    turnover?: number;
    high: number;
    low: number;
    open: number;
}

export interface TaixData {
    current: TaixCurrentData;
    history: TaixDataPoint[];
    period: string;
}

export interface Indicator {
    id?: string;
    name: string;
    value: string;
    change: string;
    isUp: boolean;
    description?: string;
    note?: string;
    text?: string;
    isPositiveForMarket?: boolean;
}

// ─── useTaixData ─────────────────────────────────────────────────────

export function useTaixData(period: string) {
    const query = useQuery({
        queryKey: ['taiex', period],
        queryFn: async () => {
            const response = await fetch(`http://localhost:8000/api/v1/market/taiex?period=${period}`);
            const result = await response.json();

            if (result.status === 'success' && result.data) {
                const taixData: TaixData = result.data;
                const indexData = taixData.history.map((item: TaixDataPoint) => ({
                    date: item.date,
                    value: item.close,
                }));
                return { taixData, indexData };
            }
            return { taixData: null as TaixData | null, indexData: [] as { date: string; value: number }[] };
        },
        staleTime: getStaleTime(),
        refetchInterval: getRefetchInterval(),
        placeholderData: keepPreviousData,
    });

    return {
        taixData: query.data?.taixData ?? null,
        indexData: query.data?.indexData ?? [],
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        dataUpdatedAt: query.dataUpdatedAt,
        error: query.error as Error | null,
    };
}

// ─── useIndicators ───────────────────────────────────────────────────

export function useIndicators() {
    const query = useQuery({
        queryKey: ['indicators'],
        queryFn: async (): Promise<Indicator[]> => {
            const response = await fetch('http://localhost:8000/api/v1/market/indicators');
            const result = await response.json();

            let apiIndicators: Indicator[] = [];
            if (result.status === 'success' && result.data && result.data.indicators) {
                apiIndicators = result.data.indicators;
            }

            // Load monitor light from CSV
            const monitorData = await loadMonitorLightData();
            const latestMonitor = getLatestMonitorData(monitorData);

            if (latestMonitor) {
                const monitorIndicator: Indicator = {
                    id: 'monitor_light',
                    name: '景氣對策信號',
                    value: `${latestMonitor.score.toFixed(0)}分`,
                    change: `${latestMonitor.signal}燈`,
                    isUp: latestMonitor.score >= 23,
                    description: latestMonitor.score >= 32
                        ? '景氣轉熱'
                        : latestMonitor.score >= 23
                            ? '景氣穩定'
                            : '景氣轉冷',
                };

                const filteredApi = apiIndicators.filter((ind) => ind.id !== 'monitor_light');
                return [...filteredApi, monitorIndicator];
            }

            return apiIndicators;
        },
        staleTime: getStaleTime(),
        refetchInterval: getIndicatorRefetchInterval(), // Separate logic for indicators (24/7)
    });

    return {
        indicators: query.data ?? [],
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        dataUpdatedAt: query.dataUpdatedAt,
        error: query.error as Error | null,
    };
}

// ─── useIndicatorHistory ─────────────────────────────────────────────

export interface IndicatorHistoryPoint {
    date: string;
    value: number;
}

export interface IndicatorHistoryData {
    indicator_id: string;
    period: string;
    history: IndicatorHistoryPoint[];
    error?: string;
}

export function useIndicatorHistory(indicatorId: string, period: string) {
    const query = useQuery({
        queryKey: ['indicatorHistory', indicatorId, period],
        queryFn: async (): Promise<IndicatorHistoryData> => {
            // API call to the new endpoint
            const response = await fetch(`http://localhost:8000/api/v1/market/indicators/${indicatorId}/history?period=${period}`);
            const result = await response.json();

            if (result.status === 'success' && result.data) {
                return result.data;
            }
            return { indicator_id: indicatorId, period, history: [] };
        },
        staleTime: getStaleTime(),
        refetchInterval: getRefetchInterval(),
        enabled: !!indicatorId && indicatorId !== 'monitor_light', // Don't fetch for monitor_light or empty id
    });

    return {
        history: query.data?.history ?? [],
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        error: query.error as Error | null,
    };
}









// ─── useSectorData ───────────────────────────────────────────────────

export interface SectorData {
    name: string;
    value: number;
    change: number;
    isUp: boolean;
}

export function useSectorData() {
    const query = useQuery({
        queryKey: ['market', 'sectors'],
        queryFn: async (): Promise<SectorData[]> => {
            const response = await fetch('http://localhost:8000/api/market/heatmap');
            const result = await response.json();
            // FinMind wrapper returns {status: "success", data: [...]}
            // Adjust based on the actual response structure from main.py
            if (result.status === 'success' && result.data) {
                return result.data;
            }
            return [];
        },
        staleTime: getStaleTime(),
        refetchInterval: getRefetchInterval(),
    });

    return {
        sectors: query.data ?? [],
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        dataUpdatedAt: query.dataUpdatedAt,
        error: query.error as Error | null,
    };
}

// ─── useMarketRankings ───────────────────────────────────────────────

interface RankingsData {
    gainers: Stock[];
    losers: Stock[];
}

export function useMarketRankings() {
    const query = useQuery({
        queryKey: ['rankings'],
        queryFn: async (): Promise<RankingsData> => {
            const [gainersResult, losersResult] = await Promise.all([
                api.getTopGainers(10),
                api.getTopLosers(10),
            ]);

            const gainers =
                gainersResult.status === 'success' && gainersResult.data.rankings
                    ? gainersResult.data.rankings
                    : [];

            const losers =
                losersResult.status === 'success' && losersResult.data.rankings
                    ? losersResult.data.rankings
                    : [];

            return { gainers, losers };
        },
        staleTime: getStaleTime(),
        refetchInterval: getRefetchInterval(),
    });

    return {
        gainers: query.data?.gainers ?? [],
        losers: query.data?.losers ?? [],
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        dataUpdatedAt: query.dataUpdatedAt,
        error: query.error as Error | null,
    };
}
