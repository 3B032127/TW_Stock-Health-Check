/**
 * 跨國股市交易時段判斷與前端每日智慧快取工具 (TW / US / JP)
 */

export type MarketRegion = 'TW' | 'US' | 'JP';

const MARKET_SCHEDULES: Record<
  MarketRegion,
  { timeZone: string; openMin: number; closeMin: number }
> = {
  TW: { timeZone: 'Asia/Taipei', openMin: 9 * 60, closeMin: 13 * 60 + 40 },
  JP: { timeZone: 'Asia/Tokyo', openMin: 9 * 60, closeMin: 15 * 60 + 40 },
  US: { timeZone: 'America/New_York', openMin: 9 * 60 + 30, closeMin: 16 * 60 + 10 },
};

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getMarketClockParts(market: MarketRegion): {
  year: number;
  month: number;
  day: number;
  weekday: number;
  minutes: number;
} {
  const { timeZone } = MARKET_SCHEDULES[market];
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const hour = Number(get('hour')) % 24;
  const minute = Number(get('minute'));

  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    weekday: WEEKDAY_MAP[get('weekday')] ?? 1,
    minutes: hour * 60 + minute,
  };
}

/** 判斷指定市場 (TW / US / JP) 目前是否處於開盤交易或盤後結算緩衝時段 */
export function isMarketOpen(market: MarketRegion): boolean {
  const { weekday, minutes } = getMarketClockParts(market);
  if (weekday === 0 || weekday === 6) return false;
  const { openMin, closeMin } = MARKET_SCHEDULES[market];
  return minutes >= openMin && minutes <= closeMin;
}

/** 判斷指定市場集合中是否有任一市場正在開盤 */
export function isAnyMarketOpen(markets: MarketRegion[] = ['TW', 'US', 'JP']): boolean {
  return markets.some((m) => isMarketOpen(m));
}

/** 取得單一市場目前的交易日快取桶標籤，例如 TW:2026-11-19:closed */
export function getMarketSessionBucket(market: MarketRegion): string {
  const { openMin } = MARKET_SCHEDULES[market];
  const { year, month, day, minutes } = getMarketClockParts(market);
  const d = new Date(Date.UTC(year, month - 1, day));

  if (minutes < openMin) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  const dow = d.getUTCDay();
  if (dow === 6) d.setUTCDate(d.getUTCDate() - 1);
  else if (dow === 0) d.setUTCDate(d.getUTCDate() - 2);

  const dateStr = d.toISOString().slice(0, 10);
  const status = isMarketOpen(market) ? 'open' : 'closed';
  return `${market}:${dateStr}:${status}`;
}

/** 組合多市場快取桶標籤 */
export function getMultiMarketSessionBucket(markets: MarketRegion[] = ['TW', 'US', 'JP']): string {
  return markets.map((m) => getMarketSessionBucket(m)).join('|');
}

/** 依市場是否開盤決定資料新鮮期 (開盤使用短 TTL；全面休市則維持當日長效快取 12 小時) */
export function getMarketStaleTime(
  markets: MarketRegion[] = ['TW', 'US', 'JP'],
  liveMs = 15_000
): number {
  return isAnyMarketOpen(markets) ? liveMs : 12 * 60 * 60 * 1000;
}

/** 依市場是否開盤決定是否背景輪詢 */
export function getMarketRefetchInterval(
  markets: MarketRegion[] = ['TW', 'US', 'JP'],
  liveMs = 30_000
): number | false {
  return isAnyMarketOpen(markets) ? liveMs : false;
}

// ─── LocalStorage 當日持久化快取 ──────────────────────────────────────

const CACHE_PREFIX = 'tw_stock_hc_v2:';

interface DailyCacheEnvelope<T> {
  bucket: string;
  updatedAt: number;
  data: T;
}

export function readDailyCache<T>(
  key: string,
  bucket: string,
  maxLiveAgeMs = 45_000
): { data: T; updatedAt: number } | undefined {
  if (typeof window === 'undefined' || !window.localStorage) return undefined;
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as DailyCacheEnvelope<T>;
    if (!parsed || parsed.bucket !== bucket || parsed.data === undefined) {
      return undefined;
    }
    const hasOpenMarket = bucket.includes(':open');
    if (!hasOpenMarket) {
      return { data: parsed.data, updatedAt: parsed.updatedAt };
    }
    if (Date.now() - parsed.updatedAt <= maxLiveAgeMs) {
      return { data: parsed.data, updatedAt: parsed.updatedAt };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function writeDailyCache<T>(key: string, bucket: string, data: T): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const payload: DailyCacheEnvelope<T> = {
    bucket,
    updatedAt: Date.now(),
    data,
  };
  const serialized = JSON.stringify(payload);
  try {
    window.localStorage.setItem(CACHE_PREFIX + key, serialized);
  } catch {
    try {
      // 清除舊版本或過期快取以釋放 localStorage 空間
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(CACHE_PREFIX) && k !== CACHE_PREFIX + key) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => window.localStorage.removeItem(k));
      window.localStorage.setItem(CACHE_PREFIX + key, serialized);
    } catch {
      // 忽略瀏覽器空間限制錯誤
    }
  }
}

export function removeDailyCache(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(CACHE_PREFIX + key);
  } catch {
    // 忽略瀏覽器存取限制錯誤
  }
}

// ─── 相容既有台股單市場工具函式 ──────────────────────────────────────

/** 台股交易時段判斷（週一～週五 09:00 ~ 13:30 UTC+8） */
export function isTradingHours(): boolean {
  const { weekday, minutes } = getMarketClockParts('TW');
  if (weekday === 0 || weekday === 6) return false;
  return minutes >= 9 * 60 && minutes <= 13 * 60 + 30;
}

export function getRefetchInterval(): number | false {
  return isTradingHours() ? 10_000 : false;
}

export function getIndicatorRefetchInterval(): number | false {
  return getMarketRefetchInterval(['TW', 'US', 'JP'], 30_000);
}

export function getStaleTime(): number {
  return isTradingHours() ? 5_000 : 12 * 60 * 60 * 1000;
}
