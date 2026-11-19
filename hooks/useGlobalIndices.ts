import { useEffect } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { API_BASE_URL } from '../services/api';
import {
  getMarketRefetchInterval,
  getMarketSessionBucket,
  getMarketStaleTime,
  getMultiMarketSessionBucket,
  isAnyMarketOpen,
  readDailyCache,
  writeDailyCache,
} from '../utils/tradingHours';

export type MarketCode = 'TW' | 'US' | 'JP';
export type MarketStatus = 'open' | 'lunch' | 'closed';

export interface GlobalIndexSummary {
  id: string;
  name: string;
  short: string;
  market: MarketCode;
  currency?: string;
  currencyMini?: string;
  currencyBadge?: string;
  subtitle: string;
  proxyNote?: string | null;
  price: number;
  change: number;
  changePercent: number;
  status: MarketStatus;
  date: string;
  sparkline: number[];
}

export interface GlobalIndexPoint {
  date: string;
  close: number;
  x?: number; // trading-minute offset (1d only)
}

export interface GlobalIndexDetail {
  id: string;
  name: string;
  subtitle: string;
  proxyNote?: string | null;
  market: MarketCode;
  currency?: string;
  currencyMini?: string;
  currencyBadge?: string;
  timezone: string;
  timezoneLabel: string;
  sessionLabel: string;
  session: { total: number; ticks: { x: number; label: string }[] };
  period: string;
  status: MarketStatus;
  current: {
    price: number;
    change: number;
    changePercent: number;
    prevClose: number;
    open: number;
    high: number;
    low: number;
    volume: number;
    turnover: number;
    date: string;
  };
  history: GlobalIndexPoint[];
}

export interface GlobalIndexBundle {
  indices: GlobalIndexSummary[];
  details: Record<string, GlobalIndexDetail>;
}

const ALL_MARKETS: MarketCode[] = ['TW', 'US', 'JP'];
const INDEX_BUNDLE_CACHE_KEY = 'global_indices_bundle';

export function useGlobalIndexList() {
  const queryClient = useQueryClient();
  const bucket = getMultiMarketSessionBucket(ALL_MARKETS);
  const cached = readDailyCache<GlobalIndexBundle>(INDEX_BUNDLE_CACHE_KEY, bucket, 20_000);

  const q = useQuery({
    queryKey: ['global-indices'],
    queryFn: async (): Promise<GlobalIndexBundle> => {
      const r = await fetch(`${API_BASE_URL}/market/global-indices`);
      const j = await r.json();
      const bundle: GlobalIndexBundle = {
        indices: j?.data?.indices ?? [],
        details: j?.data?.details ?? {},
      };
      if (bundle.indices.length > 0) {
        writeDailyCache(INDEX_BUNDLE_CACHE_KEY, getMultiMarketSessionBucket(ALL_MARKETS), bundle);
        Object.entries(bundle.details).forEach(([idxId, detail]) => {
          if (detail) {
            queryClient.setQueryData(['global-index', idxId, '1d'], detail);
            writeDailyCache(
              `gidx:${idxId}:1d`,
              getMarketSessionBucket(detail.market),
              detail
            );
          }
        });
      }
      return bundle;
    },
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.updatedAt,
    staleTime: getMarketStaleTime(ALL_MARKETS, 15_000),
    refetchInterval: (query) => {
      const hasLiveIndex = query.state.data?.indices?.some((i) => i.status !== 'closed') ?? false;
      return isAnyMarketOpen(ALL_MARKETS) || hasLiveIndex ? 15_000 : false;
    },
    placeholderData: keepPreviousData,
  });

  // Sync hydrated localStorage details into per-index 1D React Query slots on initial load
  useEffect(() => {
    const details = q.data?.details;
    if (!details) return;
    Object.entries(details).forEach(([idxId, detail]) => {
      if (detail && !queryClient.getQueryData(['global-index', idxId, '1d'])) {
        queryClient.setQueryData(['global-index', idxId, '1d'], detail);
      }
    });
  }, [q.data?.details, queryClient]);

  return {
    indices: q.data?.indices ?? [],
    detailsById: q.data?.details ?? {},
    isLoading: q.isLoading,
    dataUpdatedAt: q.dataUpdatedAt,
    isFetching: q.isFetching,
  };
}

export function useGlobalIndexDetail(
  id: string,
  period: string,
  isLive: boolean,
  market: MarketCode = 'TW'
) {
  const bucket = getMarketSessionBucket(market);
  const cacheKey = `gidx:${id}:${period}`;
  const liveAge = period === '1d' ? 15_000 : 300_000;
  const cached = id ? readDailyCache<GlobalIndexDetail>(cacheKey, bucket, liveAge) : undefined;

  const q = useQuery({
    queryKey: ['global-index', id, period],
    queryFn: async (): Promise<GlobalIndexDetail | null> => {
      const r = await fetch(`${API_BASE_URL}/market/global-indices/${id}?period=${period}`);
      if (!r.ok) return null;
      const j = await r.json();
      const data: GlobalIndexDetail | null = j?.data ?? null;
      if (data) {
        writeDailyCache(`gidx:${id}:${period}`, getMarketSessionBucket(data.market), data);
      }
      return data;
    },
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.updatedAt,
    staleTime: isLive && period === '1d' ? 10_000 : 12 * 60 * 60 * 1000,
    refetchInterval:
      isLive && period === '1d' ? getMarketRefetchInterval([market], 10_000) || 10_000 : false,
    placeholderData: keepPreviousData,
    enabled: !!id,
  });

  return {
    detail: q.data ?? null,
    isLoading: q.isLoading,
    isFetching: q.isFetching,
    dataUpdatedAt: q.dataUpdatedAt,
  };
}

export function usePrefetchGlobalIndexPeriods(selectedId: string, market: MarketCode) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!selectedId) return;
    const periods = ['1w', '1m', '1y'] as const;
    const bucket = getMarketSessionBucket(market);

    periods.forEach((p) => {
      const existing = queryClient.getQueryData<GlobalIndexDetail>(['global-index', selectedId, p]);
      if (existing) return;

      const cacheKey = `gidx:${selectedId}:${p}`;
      const cached = readDailyCache<GlobalIndexDetail>(cacheKey, bucket, 300_000);
      if (cached?.data) {
        queryClient.setQueryData(['global-index', selectedId, p], cached.data);
        return;
      }

      queryClient.prefetchQuery({
        queryKey: ['global-index', selectedId, p],
        staleTime: 12 * 60 * 60 * 1000,
        queryFn: async (): Promise<GlobalIndexDetail | null> => {
          const r = await fetch(`${API_BASE_URL}/market/global-indices/${selectedId}?period=${p}`);
          if (!r.ok) return null;
          const j = await r.json();
          const data: GlobalIndexDetail | null = j?.data ?? null;
          if (data) {
            writeDailyCache(cacheKey, getMarketSessionBucket(data.market), data);
          }
          return data;
        },
      });
    });
  }, [selectedId, market, queryClient]);
}
