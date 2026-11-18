import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { API_BASE_URL } from '../services/api';

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
    price: number; change: number; changePercent: number;
    prevClose: number; open: number; high: number; low: number;
    volume: number; turnover: number; date: string;
  };
  history: GlobalIndexPoint[];
}

export function useGlobalIndexList() {
  const q = useQuery({
    queryKey: ['global-indices'],
    queryFn: async (): Promise<GlobalIndexSummary[]> => {
      const r = await fetch(`${API_BASE_URL}/market/global-indices`);
      const j = await r.json();
      return j?.data?.indices ?? [];
    },
    refetchInterval: 20_000,
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });
  return { indices: q.data ?? [], isLoading: q.isLoading, dataUpdatedAt: q.dataUpdatedAt, isFetching: q.isFetching };
}

export function useGlobalIndexDetail(id: string, period: string, isLive: boolean) {
  const q = useQuery({
    queryKey: ['global-index', id, period],
    queryFn: async (): Promise<GlobalIndexDetail | null> => {
      const r = await fetch(`${API_BASE_URL}/market/global-indices/${id}?period=${period}`);
      if (!r.ok) return null;
      const j = await r.json();
      return j?.data ?? null;
    },
    // only poll fast while this market is trading and the 1d view is shown
    refetchInterval: isLive && period === '1d' ? 10_000 : 60_000,
    staleTime: 5_000,
    enabled: !!id,
  });
  return { detail: q.data ?? null, isLoading: q.isLoading, isFetching: q.isFetching, dataUpdatedAt: q.dataUpdatedAt };
}
