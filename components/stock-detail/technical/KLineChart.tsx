import React, { useEffect, useRef, useMemo, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CrosshairMode, LineStyle, MouseEventParams } from 'lightweight-charts';
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
  const klineContainerRef = useRef<HTMLDivElement>(null);
  const volContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);
  const kdContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);

  const chartsRef = useRef<IChartApi[]>([]);
  const seriesRefs = useRef<Record<string, any>>({});
  const [internalError, setInternalError] = useState<string | null>(null);

  // Master time sequence for alignment
  const validOHLCV = useMemo(() => {
    const processed = ohlcv
      .filter(d => d.time && !isNaN(Number(d.open)) && !isNaN(Number(d.high)) && !isNaN(Number(d.low)) && !isNaN(Number(d.close)))
      .sort((a, b) => {
        if (a.time < b.time) return -1;
        if (a.time > b.time) return 1;
        return 0;
      });

    const unique: typeof ohlcv = [];
    const seen = new Set();
    for (const item of processed) {
      if (!seen.has(item.time)) {
        seen.add(item.time);
        unique.push(item);
      }
    }
    return unique;
  }, [ohlcv]);

  const masterTimeline = useMemo(() => validOHLCV.map(d => d.time), [validOHLCV]);

  const candleData = useMemo(() => {
    return validOHLCV.map(d => ({
      time: d.time as any,
      open: Number(d.open),
      high: Number(d.high),
      low: Number(d.low),
      close: Number(d.close),
    }));
  }, [validOHLCV]);

  const volumeData = useMemo(() => {
    return validOHLCV
      .filter(d => d.volume !== undefined && d.volume !== null && !isNaN(Number(d.volume)))
      .map(d => ({
        time: d.time as any,
        value: Number(d.volume),
        color: Number(d.close) >= Number(d.open) ? 'rgba(239, 68, 68, 0.5)' : 'rgba(34, 197, 94, 0.5)',
      }));
  }, [validOHLCV]);

  // Aligned Indicator Data
  const alignedData = useMemo(() => {
    const align = (data: any[]) => {
      if (!data || !Array.isArray(data)) return [];
      
      const validData = data.filter(d => d && d.time).sort((a, b) => {
        if (a.time < b.time) return -1;
        if (a.time > b.time) return 1;
        return 0;
      });

      const uniqueData = [];
      const seen = new Set();
      for (const item of validData) {
        if (!seen.has(item.time)) {
          seen.add(item.time);
          uniqueData.push(item);
        }
      }
      return uniqueData;
    };

    if (!indicators) {
      return {
        macd: [], kd: [], rsi: [], sma5: [], sma20: [], sma60: [], upperBand: [], lowerBand: []
      };
    }

    return {
      macd: align(indicators.macd),
      kd: align(indicators.kd),
      rsi: align(indicators.rsi),
      sma5: align(indicators.sma5),
      sma20: align(indicators.sma20),
      sma60: align(indicators.sma60),
      upperBand: align(indicators.upperBand),
      lowerBand: align(indicators.lowerBand),
    };
  }, [indicators]);

  useEffect(() => {
    if (!klineContainerRef.current || candleData.length === 0) return;
    
    // Safety check: ensure containers have width
    const checkDimensions = () => {
      return klineContainerRef.current?.clientWidth !== 0;
    };

    if (!checkDimensions()) {
      const retryTimeout = setTimeout(() => {
        // Trigger re-render or effect retry if dimensions were 0
        setInternalError(null); 
      }, 100);
      return () => clearTimeout(retryTimeout);
    }

    setInternalError(null);
    const charts: IChartApi[] = [];
    
    const commonOptions = {
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' }, // Use a dark solid color instead of transparent to avoid black screen issues
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(51, 65, 85, 0.4)' },
        horzLines: { color: 'rgba(51, 65, 85, 0.4)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { width: 1 as any, color: 'rgba(226, 232, 240, 0.4)', style: LineStyle.Dotted, labelBackgroundColor: '#1e293b' },
        horzLine: { width: 1 as any, color: 'rgba(226, 232, 240, 0.4)', style: LineStyle.Dotted, labelBackgroundColor: '#1e293b' },
      },
      timeScale: {
        borderColor: 'rgba(51, 65, 85, 0.8)',
        timeVisible: true,
        rightOffset: 12,
        barSpacing: 8,
        fixLeftEdge: true,
      },
      rightPriceScale: {
        minimumWidth: 100,
      },
    };

    try {
      // Helper to create chart with dimension safety
      const createSafeChart = (container: HTMLDivElement, height: number) => {
        const width = container.clientWidth || 800; // Fallback to 800 if 0
        return createChart(container, { ...commonOptions, width, height });
      };

      // === 1. K-Line Chart ===
      const klineChart = createSafeChart(klineContainerRef.current, 450);
      charts.push(klineChart);
      
      const candlestickSeries = klineChart.addCandlestickSeries({
        upColor: '#ef4444', downColor: '#22c55e', borderVisible: false, wickUpColor: '#ef4444', wickDownColor: '#22c55e',
      });
      candlestickSeries.setData(candleData);
      seriesRefs.current.candlestick = candlestickSeries;

      seriesRefs.current.sma5 = klineChart.addLineSeries({ color: '#f59e0b', lineWidth: 2 });
      seriesRefs.current.sma20 = klineChart.addLineSeries({ color: '#3b82f6', lineWidth: 2 });
      seriesRefs.current.sma60 = klineChart.addLineSeries({ color: '#d946ef', lineWidth: 2 });
      seriesRefs.current.bbUpper = klineChart.addLineSeries({ color: 'rgba(148, 163, 184, 0.5)', lineWidth: 1, lineStyle: LineStyle.Dashed });
      seriesRefs.current.bbLower = klineChart.addLineSeries({ color: 'rgba(148, 163, 184, 0.5)', lineWidth: 1, lineStyle: LineStyle.Dashed });

      // === 2. Volume Chart ===
      const volChart = createSafeChart(volContainerRef.current!, 220);
      charts.push(volChart);
      const volumeSeries = volChart.addHistogramSeries({ priceFormat: { type: 'volume' } });
      volumeSeries.setData(volumeData);
      seriesRefs.current.volume = volumeSeries;

      // === 3. MACD Chart ===
      const macdChart = createSafeChart(macdContainerRef.current!, 240);
      charts.push(macdChart);
      const macdHistSeries = macdChart.addHistogramSeries();
      macdHistSeries.setData(alignedData.macd
        .filter(d => d.histogram !== undefined && !isNaN(Number(d.histogram)))
        .map(d => ({
          time: d.time, value: Number(d.histogram), color: Number(d.histogram) >= 0 ? 'rgba(239, 68, 68, 0.6)' : 'rgba(34, 197, 94, 0.6)'
        })));
      const macdLineSeries = macdChart.addLineSeries({ color: '#3b82f6', lineWidth: 2 });
      macdLineSeries.setData(alignedData.macd
        .filter(d => d.macd !== undefined && !isNaN(Number(d.macd)))
        .map(d => ({ time: d.time, value: Number(d.macd) })));
      const macdSignalSeries = macdChart.addLineSeries({ color: '#f59e0b', lineWidth: 2 });
      macdSignalSeries.setData(alignedData.macd
        .filter(d => d.signal !== undefined && !isNaN(Number(d.signal)))
        .map(d => ({ time: d.time, value: Number(d.signal) })));
      seriesRefs.current.macdLine = macdLineSeries;
      seriesRefs.current.macdSignal = macdSignalSeries;
      seriesRefs.current.macdHist = macdHistSeries;

      // === 4. KD Chart ===
      const kdChart = createSafeChart(kdContainerRef.current!, 240);
      charts.push(kdChart);
      const kSeries = kdChart.addLineSeries({ color: '#3b82f6', lineWidth: 2 });
      kSeries.setData(alignedData.kd
        .filter(d => d.k !== undefined && !isNaN(Number(d.k)))
        .map(d => ({ time: d.time, value: Number(d.k) })));
      const dSeries = kdChart.addLineSeries({ color: '#f59e0b', lineWidth: 2 });
      dSeries.setData(alignedData.kd
        .filter(d => d.d !== undefined && !isNaN(Number(d.d)))
        .map(d => ({ time: d.time, value: Number(d.d) })));

      kdChart.addLineSeries({ color: 'rgba(239, 68, 68, 0.5)', lineWidth: 1, lineStyle: LineStyle.Dashed, lastValueVisible: false, priceLineVisible: false }).setData(masterTimeline.map(t => ({ time: t as any, value: 80 })));
      kdChart.addLineSeries({ color: 'rgba(34, 197, 94, 0.5)', lineWidth: 1, lineStyle: LineStyle.Dashed, lastValueVisible: false, priceLineVisible: false }).setData(masterTimeline.map(t => ({ time: t as any, value: 20 })));

      // === 5. RSI Chart ===
      const rsiChart = createSafeChart(rsiContainerRef.current!, 240);
      charts.push(rsiChart);
      const rsiSeries = rsiChart.addLineSeries({ color: '#d946ef', lineWidth: 2 });
      rsiSeries.setData(alignedData.rsi
        .filter(d => d.value !== undefined && !isNaN(Number(d.value)))
        .map(d => ({ time: d.time, value: Number(d.value) })) as any);
      
      rsiChart.addLineSeries({ color: 'rgba(239, 68, 68, 0.5)', lineWidth: 1, lineStyle: LineStyle.Dashed, lastValueVisible: false, priceLineVisible: false }).setData(masterTimeline.map(t => ({ time: t as any, value: 70 })));
      rsiChart.addLineSeries({ color: 'rgba(34, 197, 94, 0.5)', lineWidth: 1, lineStyle: LineStyle.Dashed, lastValueVisible: false, priceLineVisible: false }).setData(masterTimeline.map(t => ({ time: t as any, value: 30 })));

      chartsRef.current = charts;

      // Sync Time Scales
      let isSyncing = false;
      charts.forEach((chart, index) => {
        chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
          if (isSyncing || range === null) return;
          isSyncing = true;
          charts.forEach((c, i) => {
            if (i !== index) c.timeScale().setVisibleLogicalRange(range);
          });
          isSyncing = false;
        });

        // Crosshair Sync
        chart.subscribeCrosshairMove((param: MouseEventParams) => {
          if (isSyncing) return;
          isSyncing = true;
          charts.forEach((c, i) => {
            if (i !== index) {
              if (param.time === undefined) {
                c.clearCrosshairPosition();
              } else {
                c.setCrosshairPosition(0, param.time, candlestickSeries); 
              }
            }
          });
          isSyncing = false;
        });
      });

      klineChart.timeScale().fitContent();

      const handleResize = () => {
        charts.forEach((c, index) => {
            const container = [klineContainerRef, volContainerRef, macdContainerRef, kdContainerRef, rsiContainerRef][index].current;
            if (container && container.clientWidth > 0) c.applyOptions({ width: container.clientWidth });
        });
      };

      window.addEventListener('resize', handleResize);
      
      // Secondary resize trigger to catch late layout shifts
      setTimeout(handleResize, 100);

      return () => {
        window.removeEventListener('resize', handleResize);
        charts.forEach(c => c.remove());
      };
    } catch (err: any) {
      console.error("Chart Creation Error:", err);
      setInternalError(err.message || "Failed to initialize charts");
    }
  }, [candleData, volumeData, alignedData, masterTimeline]);

  // Update indicators dynamically
  useEffect(() => {
    if (chartsRef.current.length === 0) return;

    if (showMA) {
      seriesRefs.current.sma5?.setData(alignedData.sma5.filter(d => d.value !== undefined && !isNaN(Number(d.value))).map(d => ({ time: d.time, value: Number(d.value) })) as any);
      seriesRefs.current.sma20?.setData(alignedData.sma20.filter(d => d.value !== undefined && !isNaN(Number(d.value))).map(d => ({ time: d.time, value: Number(d.value) })) as any);
      seriesRefs.current.sma60?.setData(alignedData.sma60.filter(d => d.value !== undefined && !isNaN(Number(d.value))).map(d => ({ time: d.time, value: Number(d.value) })) as any);
    } else {
      seriesRefs.current.sma5?.setData([]);
      seriesRefs.current.sma20?.setData([]);
      seriesRefs.current.sma60?.setData([]);
    }

    if (showBB) {
      seriesRefs.current.bbUpper?.setData(alignedData.upperBand.filter(d => d.value !== undefined && !isNaN(Number(d.value))).map(d => ({ time: d.time, value: Number(d.value) })) as any);
      seriesRefs.current.bbLower?.setData(alignedData.lowerBand.filter(d => d.value !== undefined && !isNaN(Number(d.value))).map(d => ({ time: d.time, value: Number(d.value) })) as any);
    } else {
      seriesRefs.current.bbUpper?.setData([]);
      seriesRefs.current.bbLower?.setData([]);
    }
  }, [showMA, showBB, alignedData]);

  const CardWrapper = ({ title, children, legend, heightClass }: { title: string, children: React.ReactNode, legend?: React.ReactNode, heightClass: string }) => (
    <div className={`bg-surface border border-surfaceLight rounded-xl overflow-hidden relative flex flex-col group ${heightClass}`}>
       <div className="px-4 py-2 border-b border-surfaceLight/50 flex justify-between items-center bg-surfaceLight/20">
          <span className="text-xs font-bold text-textMuted tracking-wider flex items-center gap-2">
             <Icon name="monitoring" className="text-[16px] text-primary" />
             {title}
          </span>
          {legend && <div className="text-xs font-medium">{legend}</div>}
       </div>
       <div className="flex-1 p-2 bg-surface pb-6"> {/* Added pb-6 to ensure time axis isn't clipped */}
         {children}
       </div>
    </div>
  );

  return (
    <div className="w-full flex flex-col gap-4 animate-fade-in pb-10">
      {internalError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
          <Icon name="error" className="text-2xl" />
          <div>
            <p className="font-bold">圖表初始化失敗</p>
            <p className="text-xs">{internalError}</p>
          </div>
        </div>
      )}

      <CardWrapper title="K線圖 (Price)" heightClass="h-[520px]" legend={
          <div className="flex gap-3">
            {showMA && (
              <>
                <span style={{ color: '#f59e0b' }}>MA5</span>
                <span style={{ color: '#3b82f6' }}>MA20</span>
                <span style={{ color: '#d946ef' }}>MA60</span>
              </>
            )}
            {showBB && <span style={{ color: '#94a3b8' }}>BB(20,2)</span>}
          </div>
      }>
        <div ref={klineContainerRef} className="w-full h-full" />
      </CardWrapper>

      <CardWrapper title="成交量 (Volume)" heightClass="h-[280px]">
        <div ref={volContainerRef} className="w-full h-full" />
      </CardWrapper>

      <CardWrapper title="MACD 指數平滑異同移動平均線 (12, 26, 9)" heightClass="h-[300px]" legend={
            <div className="flex gap-3">
                <span style={{ color: '#3b82f6' }}>DIF</span>
                <span style={{ color: '#f59e0b' }}>MACD</span>
                <span style={{ color: '#ef4444' }}>OSC</span>
            </div>
      }>
        <div ref={macdContainerRef} className="w-full h-full" />
      </CardWrapper>

      <CardWrapper title="KD 隨機指標 (9, 3, 3)" heightClass="h-[300px]" legend={
            <div className="flex gap-3">
                <span style={{ color: '#3b82f6' }}>K(9)</span>
                <span style={{ color: '#f59e0b' }}>D(3)</span>
            </div>
      }>
        <div ref={kdContainerRef} className="w-full h-full" />
      </CardWrapper>

      <CardWrapper title="RSI 相對強弱指標 (14)" heightClass="h-[300px]" legend={
            <div className="flex gap-3"><span style={{ color: '#d946ef' }}>RSI(14)</span></div>
      }>
        <div ref={rsiContainerRef} className="w-full h-full" />
      </CardWrapper>
    </div>
  );
};
