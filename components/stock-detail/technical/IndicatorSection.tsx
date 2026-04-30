import React, { useEffect, useRef, useMemo } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, LineStyle, CrosshairMode } from 'lightweight-charts';
import { OHLCV, TechnicalIndicators } from '../../../types';

export type IndicatorType = 'VOLUME' | 'MACD' | 'RSI';

interface IndicatorSectionProps {
  ohlcv: OHLCV[];
  indicators: TechnicalIndicators;
  type: IndicatorType;
}

export const IndicatorSection: React.FC<IndicatorSectionProps> = ({ ohlcv, indicators, type }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const chartData = useMemo(() => {
    return ohlcv.map(d => ({
      time: d.time as any,
      value: d.volume,
      color: d.close >= d.open ? '#22c55e' : '#ef4444', // Green for up, Red for down
    }));
  }, [ohlcv]);

  useEffect(() => {
    if (!chartContainerRef.current || chartData.length === 0) return;

    const container = chartContainerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth || 800,
      height: 200,
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
      },
      rightPriceScale: {
        borderColor: 'rgba(51, 65, 85, 0.8)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: 'rgba(51, 65, 85, 0.8)',
        timeVisible: true,
        rightOffset: 10,
        fixLeftEdge: true,
      },
    });

    chartRef.current = chart;

    let series1: ISeriesApi<any> | null = null;
    let series2: ISeriesApi<any> | null = null;
    let series3: ISeriesApi<any> | null = null;

    if (type === 'VOLUME') {
      series1 = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: { type: 'volume' },
      });
      series1.setData(chartData);

      // Add OBV line
      if (indicators.obv.length > 0) {
        series2 = chart.addLineSeries({
            color: '#f59e0b',
            lineWidth: 2,
            priceScaleId: 'obv',
        });
        
        // Disable grid lines for OBV to not clutter Volume
        chart.priceScale('obv').applyOptions({
            visible: false,
            autoScale: true,
        });
        
        series2.setData(indicators.obv as any);
      }
    } else if (type === 'MACD') {
      series1 = chart.addHistogramSeries({
        color: '#26a69a',
      });
      const macdHist = indicators.macd.map(d => ({
        time: d.time as any,
        value: d.histogram,
        color: d.histogram >= 0 ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'
      }));
      series1.setData(macdHist);

      series2 = chart.addLineSeries({ color: '#3b82f6', lineWidth: 2 }); // MACD Line
      series2.setData(indicators.macd.map(d => ({ time: d.time as any, value: d.macd })));

      series3 = chart.addLineSeries({ color: '#f59e0b', lineWidth: 2 }); // Signal Line
      series3.setData(indicators.macd.map(d => ({ time: d.time as any, value: d.signal })));
      
    } else if (type === 'RSI') {
      series1 = chart.addLineSeries({ color: '#d946ef', lineWidth: 2 });
      series1.setData(indicators.rsi as any);

      // Add Overbought/Oversold lines
      const overboughtLine = chart.addLineSeries({ color: 'rgba(239, 68, 68, 0.5)', lineWidth: 1, lineStyle: LineStyle.Dashed, lastValueVisible: false, priceLineVisible: false });
      const oversoldLine = chart.addLineSeries({ color: 'rgba(34, 197, 94, 0.5)', lineWidth: 1, lineStyle: LineStyle.Dashed, lastValueVisible: false, priceLineVisible: false });
      
      if (indicators.rsi.length > 0) {
        overboughtLine.setData(indicators.rsi.map(d => ({ time: d.time as any, value: 70 })));
        oversoldLine.setData(indicators.rsi.map(d => ({ time: d.time as any, value: 30 })));
      }
      
      chart.priceScale('right').applyOptions({
         autoScale: false,
         scaleMargins: { top: 0.1, bottom: 0.1 },
      });
      series1.applyOptions({ autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }) });
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);
    
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [chartData, indicators, type]);

  return (
    <div className="w-full h-[200px] relative rounded-xl border border-surfaceLight bg-surface overflow-hidden group">
      <div className="absolute top-2 left-4 z-10 flex gap-4 text-xs font-medium">
        <span className="text-textMuted uppercase">{type}</span>
        {type === 'VOLUME' && <span style={{ color: '#f59e0b' }}>OBV</span>}
        {type === 'MACD' && (
          <>
             <span style={{ color: '#3b82f6' }}>MACD(12,26)</span>
             <span style={{ color: '#f59e0b' }}>Signal(9)</span>
          </>
        )}
        {type === 'RSI' && <span style={{ color: '#d946ef' }}>RSI(14)</span>}
      </div>
      <div ref={chartContainerRef} className="w-full h-full pt-8" />
    </div>
  );
};
