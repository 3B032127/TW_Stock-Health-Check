import React, { useEffect, useRef, useMemo, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CrosshairMode, LineStyle } from 'lightweight-charts';
import { OHLCV, TechnicalIndicators } from '../../../types';
import { Icon } from '../../../App';

interface KLineChartProps {
  ohlcv: OHLCV[];
  indicators: TechnicalIndicators;
  showMA?: boolean;
  showBB?: boolean;
}

export const KLineChart: React.FC<KLineChartProps> = ({ 
  ohlcv, 
  indicators,
  showMA = true,
  showBB = false
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // References to series
  const seriesRefs = useRef<Record<string, ISeriesApi<any> | null>>({});

  // Format data for lightweight-charts
  const candleData = useMemo(() => {
    return ohlcv.map(d => ({
      time: d.time as any,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
  }, [ohlcv]);

  const volumeData = useMemo(() => {
    return ohlcv.map(d => ({
      time: d.time as any,
      value: d.volume,
      color: d.close >= d.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
    }));
  }, [ohlcv]);

  const [internalError, setInternalError] = useState<string | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || candleData.length === 0) return;
    
    setInternalError(null);
    const container = chartContainerRef.current;
    
    try {
      const chart = createChart(container, {
        width: container.clientWidth || 800,
        height: 800, // Increased height to fit all panes
        layout: {
          background: { type: ColorType.Solid, color: '#0f172a' },
          textColor: '#94a3b8',
        },
        grid: {
          vertLines: { color: 'rgba(51, 65, 85, 0.4)' },
          horzLines: { color: 'rgba(51, 65, 85, 0.4)' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            width: 1,
            color: 'rgba(226, 232, 240, 0.4)',
            style: LineStyle.Dotted,
            labelBackgroundColor: '#1e293b',
          },
          horzLine: {
            width: 1,
            color: 'rgba(226, 232, 240, 0.4)',
            style: LineStyle.Dotted,
            labelBackgroundColor: '#1e293b',
          },
        },
        timeScale: {
          borderColor: 'rgba(51, 65, 85, 0.8)',
          timeVisible: true,
          rightOffset: 10,
          barSpacing: 6,
          fixLeftEdge: true,
        },
      });

      // Price Scales Definition for Multi-Pane
      // Main Chart: 0% to 50%
      chart.priceScale('right').applyOptions({
        scaleMargins: { top: 0.05, bottom: 0.55 },
        borderColor: 'rgba(51, 65, 85, 0.8)',
        autoScale: true,
      });

      // Volume: 55% to 70%
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.50, bottom: 0.35 },
        visible: true,
        borderColor: 'rgba(51, 65, 85, 0.8)',
      });

      // MACD: 70% to 85%
      chart.priceScale('macd').applyOptions({
        scaleMargins: { top: 0.65, bottom: 0.15 },
        visible: true,
        borderColor: 'rgba(51, 65, 85, 0.8)',
      });

      // RSI: 85% to 100%
      chart.priceScale('rsi').applyOptions({
        scaleMargins: { top: 0.85, bottom: 0.05 },
        visible: true,
        borderColor: 'rgba(51, 65, 85, 0.8)',
      });


      chartRef.current = chart;

      // === 1. Candlestick Series ===
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#ef4444',
        downColor: '#22c55e',
        borderVisible: false,
        wickUpColor: '#ef4444',
        wickDownColor: '#22c55e',
        priceScaleId: 'right',
      });
      candlestickSeries.setData(candleData);
      seriesRefs.current.candlestick = candlestickSeries;

      const sma5Series = chart.addLineSeries({ color: '#f59e0b', lineWidth: 2, title: 'MA5', priceScaleId: 'right' });
      const sma20Series = chart.addLineSeries({ color: '#3b82f6', lineWidth: 2, title: 'MA20', priceScaleId: 'right' });
      const sma60Series = chart.addLineSeries({ color: '#d946ef', lineWidth: 2, title: 'MA60', priceScaleId: 'right' });
      seriesRefs.current.sma5 = sma5Series;
      seriesRefs.current.sma20 = sma20Series;
      seriesRefs.current.sma60 = sma60Series;

      const bbUpperSeries = chart.addLineSeries({ color: 'rgba(148, 163, 184, 0.5)', lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'BB Upper', priceScaleId: 'right' });
      const bbLowerSeries = chart.addLineSeries({ color: 'rgba(148, 163, 184, 0.5)', lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'BB Lower', priceScaleId: 'right' });
      seriesRefs.current.bbUpper = bbUpperSeries;
      seriesRefs.current.bbLower = bbLowerSeries;

      // === 2. Volume Series ===
      const volumeSeries = chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      volumeSeries.setData(volumeData);
      seriesRefs.current.volume = volumeSeries;

      // === 3. MACD Series ===
      const macdHistSeries = chart.addHistogramSeries({ priceScaleId: 'macd' });
      const macdHistData = indicators.macd.map(d => ({
        time: d.time as any,
        value: d.histogram,
        color: d.histogram >= 0 ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'
      }));
      macdHistSeries.setData(macdHistData);
      seriesRefs.current.macdHist = macdHistSeries;

      const macdLineSeries = chart.addLineSeries({ color: '#3b82f6', lineWidth: 2, priceScaleId: 'macd' });
      macdLineSeries.setData(indicators.macd.map(d => ({ time: d.time as any, value: d.macd })));
      seriesRefs.current.macdLine = macdLineSeries;

      const macdSignalSeries = chart.addLineSeries({ color: '#f59e0b', lineWidth: 2, priceScaleId: 'macd' });
      macdSignalSeries.setData(indicators.macd.map(d => ({ time: d.time as any, value: d.signal })));
      seriesRefs.current.macdSignal = macdSignalSeries;

      // === 4. RSI Series ===
      const rsiSeries = chart.addLineSeries({ color: '#d946ef', lineWidth: 2, priceScaleId: 'rsi' });
      rsiSeries.setData(indicators.rsi as any);
      seriesRefs.current.rsi = rsiSeries;

      // RSI Overbought/Oversold lines
      const overboughtLine = chart.addLineSeries({ color: 'rgba(239, 68, 68, 0.5)', lineWidth: 1, lineStyle: LineStyle.Dashed, lastValueVisible: false, priceLineVisible: false, priceScaleId: 'rsi' });
      const oversoldLine = chart.addLineSeries({ color: 'rgba(34, 197, 94, 0.5)', lineWidth: 1, lineStyle: LineStyle.Dashed, lastValueVisible: false, priceLineVisible: false, priceScaleId: 'rsi' });
      
      if (indicators.rsi.length > 0) {
        overboughtLine.setData(indicators.rsi.map(d => ({ time: d.time as any, value: 70 })));
        oversoldLine.setData(indicators.rsi.map(d => ({ time: d.time as any, value: 30 })));
      }

      chart.timeScale().fitContent();

      const handleResize = () => {
        if (container) {
          chart.applyOptions({ width: container.clientWidth });
        }
      };

      window.addEventListener('resize', handleResize);
      const resizeObserver = new ResizeObserver(() => handleResize());
      resizeObserver.observe(container);
      setTimeout(handleResize, 100);

      return () => {
        window.removeEventListener('resize', handleResize);
        resizeObserver.disconnect();
        chart.remove();
      };
    } catch (err: any) {
      console.error("Chart Creation Error:", err);
      setInternalError(err.message || "Failed to initialize chart");
    }
  }, [candleData, volumeData, indicators]);

  // Update indicators dynamically
  useEffect(() => {
    if (!chartRef.current) return;

    if (showMA && indicators.sma5.length > 0) {
      seriesRefs.current.sma5?.setData(indicators.sma5 as any);
      seriesRefs.current.sma20?.setData(indicators.sma20 as any);
      seriesRefs.current.sma60?.setData(indicators.sma60 as any);
    } else {
      seriesRefs.current.sma5?.setData([]);
      seriesRefs.current.sma20?.setData([]);
      seriesRefs.current.sma60?.setData([]);
    }

    if (showBB && indicators.upperBand.length > 0) {
      seriesRefs.current.bbUpper?.setData(indicators.upperBand as any);
      seriesRefs.current.bbLower?.setData(indicators.lowerBand as any);
    } else {
      seriesRefs.current.bbUpper?.setData([]);
      seriesRefs.current.bbLower?.setData([]);
    }

  }, [showMA, showBB, indicators]);

  return (
    <div className="w-full relative rounded-xl border border-surfaceLight bg-surface overflow-hidden group">
      {/* Legend Tooltips */}
      <div className="absolute top-2 left-4 z-10 flex flex-col gap-1 pointer-events-none">
        {/* Main Chart Legend */}
        <div className="flex gap-4 text-xs font-medium bg-surface/50 p-1 rounded">
          <span className="text-textMuted">K線圖</span>
          {showMA && (
            <>
              <span style={{ color: '#f59e0b' }}>MA5</span>
              <span style={{ color: '#3b82f6' }}>MA20</span>
              <span style={{ color: '#d946ef' }}>MA60</span>
            </>
          )}
          {showBB && <span style={{ color: '#94a3b8' }}>Bollinger Bands (20,2)</span>}
        </div>
      </div>
      
      {/* Pane Labels (Absolutely positioned to match scaleMargins) */}
      <div className="absolute left-4 top-[48%] z-10 text-xs font-medium text-textMuted pointer-events-none bg-surface/50 p-1 rounded">
        VOLUME
      </div>
      <div className="absolute left-4 top-[66%] z-10 text-xs font-medium text-textMuted pointer-events-none bg-surface/50 p-1 rounded flex gap-2">
        <span>MACD(12,26,9)</span>
        <span style={{ color: '#3b82f6' }}>MACD</span>
        <span style={{ color: '#f59e0b' }}>Signal</span>
      </div>
      <div className="absolute left-4 top-[86%] z-10 text-xs font-medium text-textMuted pointer-events-none bg-surface/50 p-1 rounded">
        RSI(14)
      </div>

      {/* Chart Container */}
      <div ref={chartContainerRef} className="w-full h-[800px]" />
      
      {internalError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/10 text-red-400 p-4 text-center">
          <Icon name="error" className="text-3xl mb-2" />
          <p className="font-bold">圖表初始化失敗</p>
          <p className="text-xs mt-1">{internalError}</p>
        </div>
      )}
    </div>
  );
};
