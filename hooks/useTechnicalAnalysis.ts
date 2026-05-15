import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { OHLCV, TechnicalIndicators, IndicatorValue, MACDValue } from '../types';
import {
  SMA,
  EMA,
  BollingerBands,
  MACD,
  RSI,
  ATR,
  OBV,
  Stochastic
} from 'technicalindicators';

interface TechnicalData {
  ohlcv: OHLCV[];
  indicators: TechnicalIndicators;
}

export function useTechnicalAnalysis(stockId: string, days: number = 365) {
  const [data, setData] = useState<TechnicalData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      if (!stockId) return;
      setIsLoading(true);
      setError(null);

      try {
        console.log(`[TechnicalAnalysis] Calling API for ${stockId}...`);
        const json = await api.getStockPrice(stockId, days);
        
        if (!json) throw new Error('API returned null/undefined');
        if (json.status !== 'success') throw new Error(`API Error: ${json.message || 'Status failure'}`);
        if (!json.data?.history) throw new Error('API Error: data.history is missing');

        const rawHistory = json.data.history;
        console.log(`[TechnicalAnalysis] Received ${rawHistory.length} raw history records`);
        
        if (rawHistory.length === 0) {
           if (isMounted) {
             console.log('[TechnicalAnalysis] Raw history is empty, setting empty data');
             setData({ ohlcv: [], indicators: getEmptyIndicators() });
             setIsLoading(false);
           }
           return;
        }

        // Deduplicate by date and sort
        const seenDates = new Set();
        const ohlcv: OHLCV[] = rawHistory
          .filter((d: any) => {
            if (!d.date) return false;
            // Ensure date is in YYYY-MM-DD format
            const dateStr = d.date.split('T')[0];
            if (seenDates.has(dateStr)) return false;
            seenDates.add(dateStr);
            return true;
          })
          .map((d: any) => ({
            time: d.date.split('T')[0], // Strictly YYYY-MM-DD
            open: parseFloat(d.open),
            high: parseFloat(d.high),
            low: parseFloat(d.low),
            close: parseFloat(d.close),
            volume: parseFloat(d.volume),
          }))
          .filter((d: OHLCV) => 
            !isNaN(new Date(d.time).getTime()) && 
            !isNaN(d.open) && !isNaN(d.high) && !isNaN(d.low) && !isNaN(d.close)
          )
          .sort((a: OHLCV, b: OHLCV) => a.time.localeCompare(b.time));

        if (ohlcv.length === 0) {
           if (isMounted) {
             setData({ ohlcv: [], indicators: getEmptyIndicators() });
             setIsLoading(false);
           }
           return;
        }

        // Prepare data for indicators
        const closes = ohlcv.map(d => d.close);
        const highs = ohlcv.map(d => d.high);
        const lows = ohlcv.map(d => d.low);
        const volumes = ohlcv.map(d => d.volume);

        // Calculate Indicators
        // Function to map values to times
        const mapIndicator = (values: number[], offset: number = 0): IndicatorValue[] => {
          return values.map((val, i) => {
             const index = i + offset;
             return {
                time: ohlcv[index] ? ohlcv[index].time : ohlcv[ohlcv.length - 1].time,
                value: val,
             };
          });
        };

        const sma5 = SMA.calculate({ period: 5, values: closes });
        const sma20 = SMA.calculate({ period: 20, values: closes });
        const sma60 = SMA.calculate({ period: 60, values: closes });
        const ema50 = EMA.calculate({ period: 50, values: closes });
        const ema200 = EMA.calculate({ period: 200, values: closes });
        
        const bb = BollingerBands.calculate({ period: 20, stdDev: 2, values: closes });
        
        const macdRes = MACD.calculate({
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
            SimpleMAOscillator: false,
            SimpleMASignal: false,
            values: closes
        });

        const rsi = RSI.calculate({ period: 14, values: closes });
        const atr = ATR.calculate({ period: 14, high: highs, low: lows, close: closes });
        const obv = OBV.calculate({ close: closes, volume: volumes });

        const kdRes = Stochastic.calculate({
            high: highs,
            low: lows,
            close: closes,
            period: 9,
            signalPeriod: 3
        });

        const indicators: TechnicalIndicators = {
          sma5: sma5.length > 0 ? mapIndicator(sma5, closes.length - sma5.length) : [],
          sma20: sma20.length > 0 ? mapIndicator(sma20, closes.length - sma20.length) : [],
          sma60: sma60.length > 0 ? mapIndicator(sma60, closes.length - sma60.length) : [],
          ema50: ema50.length > 0 ? mapIndicator(ema50, closes.length - ema50.length) : [],
          ema200: ema200.length > 0 ? mapIndicator(ema200, closes.length - ema200.length) : [],
          upperBand: bb.length > 0 ? bb.map((val, i) => {
             const idx = i + closes.length - bb.length;
             return { time: ohlcv[idx]?.time || ohlcv[ohlcv.length-1].time, value: val.upper };
          }) : [],
          lowerBand: bb.length > 0 ? bb.map((val, i) => {
             const idx = i + closes.length - bb.length;
             return { time: ohlcv[idx]?.time || ohlcv[ohlcv.length-1].time, value: val.lower };
          }) : [],
          macd: macdRes.length > 0 ? macdRes.map((val, i) => {
             const idx = i + closes.length - macdRes.length;
             return {
              time: ohlcv[idx]?.time || ohlcv[ohlcv.length-1].time,
              macd: val.MACD || 0,
              signal: val.signal || 0,
              histogram: val.histogram || 0
             };
          }) : [],
          kd: kdRes.length > 0 ? kdRes.map((val, i) => {
             const idx = i + closes.length - kdRes.length;
             return {
              time: ohlcv[idx]?.time || ohlcv[ohlcv.length-1].time,
              k: val.k || 0,
              d: val.d || 0
             };
          }) : [],
          rsi: rsi.length > 0 ? mapIndicator(rsi, closes.length - rsi.length) : [],
          atr: atr.length > 0 ? mapIndicator(atr, closes.length - atr.length) : [],
          obv: obv.length > 0 ? mapIndicator(obv, closes.length - obv.length) : [],
        };

        if (isMounted) {
          console.log(`[TechnicalAnalysis] Final data prepared: ${ohlcv.length} candles, SMA5: ${indicators.sma5.length}`);
          setData({ ohlcv, indicators });
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error(`[TechnicalAnalysis] ERROR:`, err);
        if (isMounted) {
          setError(err.message || 'Unknown technical error');
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [stockId, days]);

  return { data, isLoading, error };
}

function getEmptyIndicators(): TechnicalIndicators {
    return {
        sma5: [], sma20: [], sma60: [], ema50: [], ema200: [],
        macd: [], kd: [], rsi: [], atr: [], obv: [], upperBand: [], lowerBand: []
    }
}
