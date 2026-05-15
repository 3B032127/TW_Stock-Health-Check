import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, ReferenceLine, ComposedChart, Bar } from 'recharts';
import { Icon } from '../../App';
import { useTechnicalAnalysis } from '../../hooks/useTechnicalAnalysis';
import { KLineChart } from './technical/KLineChart';
import { IndicatorSection, IndicatorType } from './technical/IndicatorSection';
import { TradingSystemPanel } from './technical/TradingSystemPanel';
import { TechnicalAnalysisReport } from './technical/TechnicalAnalysisReport';
import { useIntraday } from '../../hooks/useIntraday';
import { useQuote } from '../../hooks/useQuote';
import { STOCK_INTRADAY_DATA, ORDER_BOOK_DATA } from '../../constants'; // Fallback

type ChartMode = 'INTRADAY' | 'KLINE';

interface RealTimeQuoteProps {
  stockId: string;
}

const TIME_RANGES = [
  { label: '日均', value: '1D' },
  { label: '五日', value: '5D' },
  { label: '近月', value: '1M' },
  { label: '三月', value: '3M' },
  { label: '六月', value: '6M' },
  { label: '一年', value: '1Y' },
  { label: '五年', value: '5Y' },
];

export const RealTimeQuote: React.FC<RealTimeQuoteProps> = ({ stockId }) => {
  const [chartMode, setChartMode] = useState<ChartMode>('INTRADAY');
  const [activeRange, setActiveRange] = useState('1D');

  const [showMA, setShowMA] = useState(true);
  const [showBB, setShowBB] = useState(false);

  const { data: quote, isLoading: isQuoteLoading } = useQuote(stockId);
  const { data: intraday, isLoading: isIntradayLoading } = useIntraday(stockId, activeRange);
  const { data: taData, isLoading: taLoading, error: taError } = useTechnicalAnalysis(stockId, 365);

  const currentPrice = quote?.close || 0;
  const prevPrice = quote?.yesterday_close || 0;
  const priceChange = quote?.change || 0;
  const priceChangePercent = quote?.change_percent || 0;
  const isUp = priceChange >= 0;

  // Chart Calculations
  const chartData = intraday && intraday.length > 0 ? intraday : STOCK_INTRADAY_DATA;
  const dataMax = Math.max(...chartData.map(d => d.value));
  const dataMin = Math.min(...chartData.map(d => d.value));
  const referenceValue = prevPrice > 0 ? prevPrice : chartData[0]?.value || 0;
  
  // Calculate offset for split gradient
  const offset = useMemo(() => {
    if (dataMax <= referenceValue) return 0;
    if (dataMin >= referenceValue) return 1;
    return (dataMax - referenceValue) / (dataMax - dataMin);
  }, [dataMax, dataMin, referenceValue]);

  // Order Book Binding
  // Use real order book from Shioaji quote API, fallback to mock data if not available
  const orderBook = quote?.order_book || ORDER_BOOK_DATA;

  const renderQuoteHeader = () => (
    <div className="bg-surface border border-surfaceLight rounded-xl p-6 mb-6">
      <div className="flex flex-wrap justify-between items-end">
        <div>
          <h3 className="text-sm font-medium text-textMuted mb-1">即時成交價</h3>
          <div className="flex items-baseline gap-4">
            <span className={`text-5xl font-bold ${isUp ? 'text-up' : 'text-down'}`}>
              {currentPrice > 0 ? currentPrice.toFixed(2) : '---'}
            </span>
            {currentPrice > 0 && (
              <span className={`text-xl font-bold ${isUp ? 'text-up' : 'text-down'} flex items-center`}>
                <Icon name={isUp ? "arrow_upward" : "arrow_downward"} className="text-xl" />
                {Math.abs(priceChange).toFixed(2)} ({priceChangePercent.toFixed(2)}%)
              </span>
            )}
          </div>
          <p className="text-xs text-textMuted mt-2 flex items-center gap-1">
            <Icon name="schedule" />
            資料來源: 永豐 Shioaji (即時連線中)
          </p>
        </div>
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-x-8 gap-y-2 text-sm mt-4 lg:mt-0">
          <div className="flex flex-col">
            <span className="text-textMuted">開盤</span>
            <span className={`font-bold ${quote?.open && quote.open > prevPrice ? 'text-up' : quote?.open && quote.open < prevPrice ? 'text-down' : 'text-white'}`}>
              {quote?.open?.toFixed(2) || '---'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-textMuted">最高</span>
            <span className={`font-bold ${quote?.high && quote.high > prevPrice ? 'text-up' : quote?.high && quote.high < prevPrice ? 'text-down' : 'text-white'}`}>
              {quote?.high?.toFixed(2) || '---'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-textMuted">最低</span>
            <span className={`font-bold ${quote?.low && quote.low > prevPrice ? 'text-up' : quote?.low && quote.low < prevPrice ? 'text-down' : 'text-white'}`}>
              {quote?.low?.toFixed(2) || '---'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-textMuted">昨收</span>
            <span className="font-bold text-white">{quote?.yesterday_close?.toFixed(2) || '---'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-textMuted">總量</span>
            <span className="font-bold text-primary">{quote?.volume?.toLocaleString() || '---'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-textMuted">成交額</span>
            <span className="font-bold text-white">{quote?.amount ? (quote.amount / 100000000).toFixed(2) + '億' : '---'}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col animate-fade-in">
      {renderQuoteHeader()}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column (Charts) */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          <div className="flex flex-wrap gap-4 justify-between items-center bg-surface border border-surfaceLight rounded-xl p-3 px-4">
             {/* Chart Toggle */}
             <div className="flex gap-2 p-1 bg-surfaceLight/50 rounded-lg w-fit">
              <button
                onClick={() => setChartMode('INTRADAY')}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                  chartMode === 'INTRADAY' ? 'bg-primary text-white shadow-sm' : 'text-textMuted hover:text-white'
                }`}
              >
                即時分時線
              </button>
              <button
                onClick={() => setChartMode('KLINE')}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                  chartMode === 'KLINE' ? 'bg-primary text-white shadow-sm' : 'text-textMuted hover:text-white'
                }`}
              >
                日 K 線圖
              </button>
            </div>
            
            {/* INTRADAY Controls */}
            {chartMode === 'INTRADAY' && (
              <div className="flex gap-1 overflow-x-auto pb-1 hide-scrollbar">
                {TIME_RANGES.map(range => (
                  <button
                    key={range.value}
                    onClick={() => setActiveRange(range.value)}
                    className={`px-3 py-1 text-sm font-bold rounded ${
                      activeRange === range.value ? 'bg-[#ca8a4b] text-black' : 'text-textMuted hover:text-white'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            )}

            {/* TA Controls & Indicator Toggles */}
            {chartMode === 'KLINE' && (
              <div className="flex flex-wrap gap-6 items-center">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                    <input type="checkbox" checked={showMA} onChange={() => setShowMA(!showMA)} className="accent-primary" />
                    移動平均線 (MA)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                    <input type="checkbox" checked={showBB} onChange={() => setShowBB(!showBB)} className="accent-primary" />
                    布林通道 (BOLL)
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Chart Rendering */}
          <div className="bg-surface border border-surfaceLight rounded-xl overflow-hidden min-h-[400px] relative">
             {chartMode === 'INTRADAY' ? (
                <div className="h-[450px] w-full p-4 pt-8">
                  {(isIntradayLoading) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-surface/50 z-10">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                      <defs>
                        <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset={offset} stopColor="#ef4444" stopOpacity={1} />
                          <stop offset={offset} stopColor="#22c55e" stopOpacity={1} />
                        </linearGradient>
                        <linearGradient id="splitArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset={offset} stopColor="#ef4444" stopOpacity={0.2} />
                          <stop offset={offset} stopColor="#22c55e" stopOpacity={0.2} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={true} horizontal={true} />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fill: '#94a3b8', fontSize: 12 }} 
                        axisLine={false} 
                        tickLine={false} 
                        tickMargin={10}
                      />
                      {/* Price Axis */}
                      <YAxis 
                        yAxisId="price"
                        domain={['dataMin - 1', 'dataMax + 1']} 
                        axisLine={false} 
                        tickLine={false} 
                        orientation="left"
                        tick={(props) => {
                          const { x, y, payload } = props;
                          const val = payload.value;
                          const isUp = val > referenceValue;
                          const isEq = val === referenceValue;
                          const color = isEq ? '#fff' : isUp ? '#ef4444' : '#22c55e';
                          const bgColor = isEq ? 'transparent' : isUp ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)';
                          return (
                            <g transform={`translate(${x},${y})`}>
                              <rect x={-50} y={-10} width="45" height="20" fill={bgColor} rx="2" />
                              <text x={-28} y={4} fill={color} fontSize="12" textAnchor="middle">{val.toFixed(2)}</text>
                            </g>
                          );
                        }}
                      />
                      <YAxis yAxisId="volume" orientation="right" hide domain={[0, 'dataMax * 3']} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ color: '#94a3b8' }}
                      />
                      <ReferenceLine yAxisId="price" y={referenceValue} stroke="#fff" strokeDasharray="3 3" />
                      <Bar yAxisId="volume" dataKey="volume" fill="#0ea5e9" opacity={0.6} />
                      <Area yAxisId="price" type="monotone" dataKey="value" stroke="url(#splitColor)" strokeWidth={2} fill="url(#splitArea)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
             ) : (
                <div className="flex flex-col h-full">
                  {taLoading && (
                     <div className="absolute inset-0 flex items-center justify-center bg-surface/50 z-10 flex-col gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="text-textMuted text-sm font-bold">技術分析資料載入中...</span>
                    </div>
                  )}
                  {taError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-500/10 z-10 flex-col gap-2">
                       <Icon name="error" className="text-red-400 text-5xl opacity-80" />
                       <span className="text-red-400 font-bold">無法載入技術分析資料</span>
                       <span className="text-red-400/80 text-sm">{taError}</span>
                    </div>
                  )}
                  {taData && taData.ohlcv && taData.ohlcv.length > 0 ? (
                    <KLineChart ohlcv={taData.ohlcv} indicators={taData.indicators} showMA={showMA} showBB={showBB} />
                  ) : (!taLoading && !taError && (
                     <div className="absolute inset-0 flex items-center justify-center bg-surface/50 z-10 flex-col gap-4">
                        <Icon name="history_toggle_off" className="text-textMuted text-5xl opacity-30" />
                        <span className="text-textMuted font-bold text-lg">尚無歷史價格資料</span>
                        <p className="text-textMuted text-sm max-w-xs text-center">該股票可能剛上市或尚未進行數據同步，請點擊上方「同步資料」按鈕。</p>
                     </div>
                  ))}
                </div>
             )}
          </div>
        </div>

        {/* Right Column (Auxiliary) */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          {chartMode === 'INTRADAY' ? (
            <>
              {/* Order Book - Only in Intraday */}
              <div className="bg-surface border border-surfaceLight rounded-xl overflow-hidden shadow-xl animate-fade-in">
                <div className="p-4 border-b border-surfaceLight bg-surfaceLight/30 flex justify-between">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <Icon name="list_alt" className="text-primary" />
                    五檔報價
                  </h3>
                  <span className="text-xs text-textMuted flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> 即時
                  </span>
                </div>
                <div className="flex flex-col">
                  <div className="flex flex-col-reverse">
                    {orderBook.asks.map((ask, i) => (
                      <div key={i} className="grid grid-cols-3 text-sm py-2 px-4 hover:bg-surfaceLight/20 relative">
                        <span className="text-textMuted font-medium text-center">賣 {5 - i}</span>
                        <span className="text-up font-bold text-right">{ask.price}</span>
                        <div className="text-right relative z-10">{ask.volume}</div>
                        <div className="absolute top-1 bottom-1 right-0 bg-up/20 z-0" style={{ width: `${(ask.volume / 500) * 100}%` }}></div>
                      </div>
                    ))}
                  </div>
                  <div className="border-y border-surfaceLight py-2 bg-surfaceLight/10 text-center text-xs text-textMuted font-medium tracking-wider flex justify-center gap-4">
                    <span>最新 <span className={isUp ? 'text-up' : 'text-down'}>{currentPrice.toFixed(2)}</span></span>
                    <span>單量 <span className="text-yellow-400">{quote?.volume || 0}</span></span>
                  </div>
                  <div className="flex flex-col">
                    {orderBook.bids.map((bid, i) => (
                      <div key={i} className="grid grid-cols-3 text-sm py-2 px-4 hover:bg-surfaceLight/20 relative">
                        <span className="text-textMuted font-medium text-center">買 {i + 1}</span>
                        <span className="text-down font-bold text-right">{bid.price}</span>
                        <div className="text-right relative z-10">{bid.volume}</div>
                        <div className="absolute top-1 bottom-1 right-0 bg-down/20 z-0" style={{ width: `${(bid.volume / 500) * 100}%` }}></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Strategy Panels - Only in Intraday */}
              {taData && taData.ohlcv && taData.ohlcv.length > 0 ? (
                <div className="animate-fade-in">
                  <TradingSystemPanel ohlcv={taData.ohlcv} indicators={taData.indicators} />
                </div>
              ) : (
                <div className="bg-surface border border-surfaceLight rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3 min-h-[250px]">
                  <Icon name="psychology" className="text-textMuted text-5xl opacity-30" />
                  <span className="text-textMuted font-bold text-lg">交易系統計算中</span>
                  <span className="text-textMuted/60 text-sm">正在同步大週期技術指標...</span>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Technical Analysis Report - Only in K-Line */}
              {taData && taData.ohlcv && taData.ohlcv.length > 0 ? (
                <div className="animate-fade-in">
                  <TechnicalAnalysisReport ohlcv={taData.ohlcv} indicators={taData.indicators} />
                </div>
              ) : (
                <div className="bg-surface border border-surfaceLight rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3 min-h-[400px]">
                  <Icon name="analytics" className="text-textMuted text-5xl opacity-30" />
                  <span className="text-textMuted font-bold text-lg">分析報告生成中</span>
                  <span className="text-textMuted/60 text-sm">正在診斷所有指標趨勢...</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
