import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { API_BASE_URL } from '../services/api';
import { StockPredictionData } from '../types';
import {
  getMarketSessionBucket,
  getMarketStaleTime,
  readDailyCache,
  writeDailyCache,
} from '../utils/tradingHours';

export const getPredictionCacheKey = (stockId: string) => `stock_prediction_v5:${stockId}`;

function hasDuplicateDates(items?: Array<{ date: string }>): boolean {
  if (!items || items.length <= 1) return false;
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.date)) return true;
    seen.add(item.date);
  }
  return false;
}

export const useStockPrediction = (stockId: string) => {
  const bucket = getMarketSessionBucket('TW');
  const cacheKey = getPredictionCacheKey(stockId);
  const cached = stockId
    ? readDailyCache<StockPredictionData>(cacheKey, bucket, 60_000)
    : undefined;

  return useQuery<StockPredictionData, Error>({
    queryKey: ['stockPrediction', stockId],
    queryFn: async () => {
      // 請求時加上時間戳記防 HTTP 靜態快取
      const response = await fetch(`${API_BASE_URL}/stocks/${stockId}/prediction?_t=${Date.now()}`);
      const json = await response.json().catch(() => null);
      if (!response.ok || !json || json.detail) {
        throw new Error(json?.detail || `無法讀取 ${stockId} 的 AI 預測與回測資料`);
      }
      const payload: StockPredictionData = json.data ?? json;
      if (payload && payload.symbol) {
        writeDailyCache(cacheKey, getMarketSessionBucket('TW'), payload);
      }
      return payload;
    },
    // 若快取中的基準日已經比目前交易日時段舊、缺 V3.4 五模式資料或含重複日期，則向後端重新拉取
    initialData: () => {
      if (!cached?.data || !cached.data.modes) return undefined;
      const cachedDate = cached.data.last_updated;
      const bucketDateMatch = bucket.match(/TW:(\d{4}-\d{2}-\d{2})/);
      if (bucketDateMatch && cachedDate && cachedDate < bucketDateMatch[1]) {
        return undefined;
      }
      if (
        hasDuplicateDates(cached.data.historical_backtest) ||
        hasDuplicateDates(cached.data.historical_backtest_t1)
      ) {
        return undefined;
      }
      return cached.data;
    },
    initialDataUpdatedAt: cached?.updatedAt,
    enabled: !!stockId,
    staleTime: getMarketStaleTime(['TW'], 60_000),
    placeholderData: keepPreviousData,
    retry: 1,
  });
};
