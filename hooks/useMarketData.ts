import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api, API_BASE_URL } from '../services/api';
import {
  getMarketRefetchInterval,
  getMarketStaleTime,
  getMultiMarketSessionBucket,
  getRefetchInterval,
  getStaleTime,
  readDailyCache,
  writeDailyCache,
} from '../utils/tradingHours';
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
  changePercent?: string;
  isUp: boolean;
  description?: string;
  note?: string;
  text?: string;
  isPositiveForMarket?: boolean;
  sparkline?: number[];
}

// ─── useTaixData ─────────────────────────────────────────────────────

export function useTaixData(period: string) {
  const query = useQuery({
    queryKey: ['taiex', period],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/market/taiex?period=${period}`);
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
  const bucket = getMultiMarketSessionBucket(['TW', 'US', 'JP']);
  const cached = readDailyCache<Indicator[]>('indicators', bucket, 30_000);

  const query = useQuery({
    queryKey: ['indicators'],
    queryFn: async (): Promise<Indicator[]> => {
      const response = await fetch(`${API_BASE_URL}/market/indicators`);
      const result = await response.json();

      if (result.status === 'success' && result.data && Array.isArray(result.data.indicators)) {
        const list: Indicator[] = result.data.indicators;
        if (list.length > 0) {
          writeDailyCache('indicators', getMultiMarketSessionBucket(['TW', 'US', 'JP']), list);
        }
        return list;
      }
      return [];
    },
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.updatedAt,
    staleTime: getMarketStaleTime(['TW', 'US', 'JP'], 30_000),
    refetchInterval: getMarketRefetchInterval(['TW', 'US', 'JP'], 30_000),
    placeholderData: keepPreviousData,
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
  const enabled = !!indicatorId && indicatorId !== 'monitor_light';
  const bucket = getMultiMarketSessionBucket(['TW', 'US', 'JP']);
  const cacheKey = `ind_hist:${indicatorId}:${period}`;
  const cached = enabled ? readDailyCache<IndicatorHistoryData>(cacheKey, bucket, 60_000) : undefined;

  const query = useQuery({
    queryKey: ['indicatorHistory', indicatorId, period],
    queryFn: async (): Promise<IndicatorHistoryData> => {
      const response = await fetch(`${API_BASE_URL}/market/indicators/${indicatorId}/history?period=${period}`);
      const result = await response.json();

      if (result.status === 'success' && result.data) {
        const data: IndicatorHistoryData = result.data;
        if (data.history && data.history.length > 0) {
          writeDailyCache(cacheKey, getMultiMarketSessionBucket(['TW', 'US', 'JP']), data);
        }
        return data;
      }
      return { indicator_id: indicatorId, period, history: [] };
    },
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.updatedAt,
    staleTime: getMarketStaleTime(['TW', 'US', 'JP'], 60_000),
    refetchInterval: getMarketRefetchInterval(['TW', 'US', 'JP'], 60_000),
    placeholderData: keepPreviousData,
    enabled,
  });

  return {
    history: query.data?.history ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
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

// ─── useADRMonitor ───────────────────────────────────────────────────

export interface ADRQuote {
  id: string;
  name: string;
  twId: string;
  twName: string;
  ratioLabel: string;
  adrPrice: number;
  change: number;
  changePercent: number;
  convertedTwd: number;
  twSpotPrice: number;
  premiumPercent: number;
  sparkline: number[];
}

export interface ADRMonitorData {
  usdTwd: number;
  updatedAt: string;
  items: ADRQuote[];
}

export function useADRMonitor() {
  const bucket = getMultiMarketSessionBucket(['TW', 'US']);
  const cached = readDailyCache<ADRMonitorData>('adr_monitor', bucket, 30_000);

  const query = useQuery({
    queryKey: ['adrMonitor'],
    queryFn: async (): Promise<ADRMonitorData> => {
      const response = await fetch(`${API_BASE_URL}/market/adr`);
      const result = await response.json();
      if (result.status === 'success' && result.data) {
        const data: ADRMonitorData = result.data;
        if (data.items && data.items.length > 0) {
          writeDailyCache('adr_monitor', getMultiMarketSessionBucket(['TW', 'US']), data);
        }
        return data;
      }
      return { usdTwd: 32.5, updatedAt: '', items: [] };
    },
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.updatedAt,
    staleTime: getMarketStaleTime(['TW', 'US'], 30_000),
    refetchInterval: getMarketRefetchInterval(['TW', 'US'], 30_000),
    placeholderData: keepPreviousData,
  });

  return {
    adrData: query.data ?? { usdTwd: 32.5, updatedAt: '', items: [] },
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    dataUpdatedAt: query.dataUpdatedAt,
  };
}

// ─── useAllGlobalRankings & useGlobalRankings ────────────────────────

export type RankingCategory = 'tw_core' | 'tw_all' | 'us' | 'jp' | 'semi';

export interface RankingStock {
  id: string;
  symbol: string;
  name: string;
  market: 'TW' | 'US' | 'JP';
  currencySymbol: string;
  industry: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: string;
  isLimitUp?: boolean;
  isLimitDown?: boolean;
  sparkline: number[];
}

export interface RankingCategoryPayload {
  category: RankingCategory;
  gainers: RankingStock[];
  losers: RankingStock[];
}

export type AllGlobalRankingsMap = Partial<Record<RankingCategory, RankingCategoryPayload>>;

export function useAllGlobalRankings(limit = 5) {
  const bucket = getMultiMarketSessionBucket(['TW', 'US', 'JP']);
  const cacheKey = `rankings_all:${limit}`;
  const cached = readDailyCache<AllGlobalRankingsMap>(cacheKey, bucket, 30_000);

  const query = useQuery({
    queryKey: ['globalRankingsAll', limit],
    queryFn: async (): Promise<AllGlobalRankingsMap> => {
      const response = await fetch(`${API_BASE_URL}/market/global-rankings?category=all&limit=${limit}`);
      const result = await response.json();
      if (result.status === 'success' && result.data && result.data.categories) {
        const categories: AllGlobalRankingsMap = result.data.categories;
        if (Object.keys(categories).length > 0) {
          writeDailyCache(cacheKey, getMultiMarketSessionBucket(['TW', 'US', 'JP']), categories);
        }
        return categories;
      }
      return {};
    },
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.updatedAt,
    staleTime: getMarketStaleTime(['TW', 'US', 'JP'], 30_000),
    refetchInterval: getMarketRefetchInterval(['TW', 'US', 'JP'], 30_000),
    placeholderData: keepPreviousData,
  });

  return {
    categories: query.data ?? {},
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    dataUpdatedAt: query.dataUpdatedAt,
  };
}

export function useGlobalRankings(category: RankingCategory, limit = 5) {
  const { categories, isLoading, isFetching, dataUpdatedAt } = useAllGlobalRankings(limit);
  const catData = categories[category];

  return {
    gainers: catData?.gainers ?? [],
    losers: catData?.losers ?? [],
    isLoading,
    isFetching,
    dataUpdatedAt,
  };
}
