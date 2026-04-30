import React, { useEffect, useRef, useMemo } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CrosshairMode, LineStyle } from 'lightweight-charts';
import { OHLCV, TechnicalIndicators } from '../../../types';

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
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const sma5SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const sma20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const sma60SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbUpperSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbLowerSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  // Format data for lightweight-charts
  const chartData = useMemo(() => {
    return ohlcv.map(d => ({
      time: d.time as any, // lightweight-charts expects string format 'YYYY-MM-DD'
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
  }, [ohlcv]);

  const [internalError, setInternalError] = useState<string | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || chartData.length === 0) return;
    
    setInternalError(null);
    const container = chartContainerRef.current;
    
    try {
      const chart = createChart(container, {
        width: container.clientWidth || 800,
        height: 400,
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
        rightPriceScale: {
          borderColor: 'rgba(51, 65, 85, 0.8)',
          autoScale: true,
        },
        timeScale: {
          borderColor: 'rgba(51, 65, 85, 0.8)',
          timeVisible: true,
          rightOffset: 10,
          barSpacing: 6,
          fixLeftEdge: true,
        },
      });

      chartRef.current = chart;

      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#ef4444',
        downColor: '#22c55e',
        borderVisible: false,
        wickUpColor: '#ef4444',
        wickDownColor: '#22c55e',
      });
      
      candlestickSeries.setData(chartData);
      candlestickSeriesRef.current = candlestickSeries;

      const sma5Series = chart.addLineSeries({ color: '#f59e0b', lineWidth: 2, title: 'MA5' });
      const sma20Series = chart.addLineSeries({ color: '#3b82f6', lineWidth: 2, title: 'MA20' });
      const sma60Series = chart.addLineSeries({ color: '#d946ef', lineWidth: 2, title: 'MA60' });
      
      sma5SeriesRef.current = sma5Series;
      sma20SeriesRef.current = sma20Series;
      sma60SeriesRef.current = sma60Series;

      const bbUpperSeries = chart.addLineSeries({ color: 'rgba(148, 163, 184, 0.5)', lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'BB Upper' });
      const bbLowerSeries = chart.addLineSeries({ color: 'rgba(148, 163, 184, 0.5)', lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'BB Lower' });

      bbUpperSeriesRef.current = bbUpperSeries;
      bbLowerSeriesRef.current = bbLowerSeries;

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
  }, [chartData]);

  // Update indicators dynamically
  useEffect(() => {
    if (!chartRef.current) return;

    if (showMA && indicators.sma5.length > 0) {
      sma5SeriesRef.current?.setData(indicators.sma5 as any);
      sma20SeriesRef.current?.setData(indicators.sma20 as any);
      sma60SeriesRef.current?.setData(indicators.sma60 as any);
    } else {
      sma5SeriesRef.current?.setData([]);
      sma20SeriesRef.current?.setData([]);
      sma60SeriesRef.current?.setData([]);
    }

    if (showBB && indicators.upperBand.length > 0) {
      bbUpperSeriesRef.current?.setData(indicators.upperBand as any);
      bbLowerSeriesRef.current?.setData(indicators.lowerBand as any);
    } else {
      bbUpperSeriesRef.current?.setData([]);
      bbLowerSeriesRef.current?.setData([]);
    }

  }, [showMA, showBB, indicators]);

  return (
    <div className="w-full h-[400px] relative rounded-xl border border-surfaceLight bg-surface overflow-hidden group">
      {/* Legend Tooltip */}
      <div className="absolute top-2 left-4 z-10 flex gap-4 text-xs font-medium">
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
      {/* Chart Container */}
      <div ref={chartContainerRef} className="w-full h-full pt-8">
        {internalError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/10 text-red-400 p-4 text-center">
            <Icon name="error" className="text-3xl mb-2" />
            <p className="font-bold">圖表初始化失敗</p>
            <p className="text-xs mt-1">{internalError}</p>
          </div>
        )}
      </div>
    </div>
  );
};
