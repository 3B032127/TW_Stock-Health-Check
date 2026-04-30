import React, { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import { Icon } from '../../App';
import { STOCK_INTRADAY_DATA, ORDER_BOOK_DATA } from '../../constants';
import { useTechnicalAnalysis } from '../../hooks/useTechnicalAnalysis';
import { KLineChart } from './technical/KLineChart';
import { IndicatorSection, IndicatorType } from './technical/IndicatorSection';
import { TradingSystemPanel } from './technical/TradingSystemPanel';
import { useIntraday } from '../../hooks/useIntraday';
import { useValuationMetrics } from '../../hooks/useValuationMetrics';

type QuoteSubTab = 'INTRADAY' | 'TECHNICAL' | 'STRATEGY';

interface RealTimeQuoteProps {
  stockId: string;
}

export const RealTimeQuote: React.FC<RealTimeQuoteProps> = ({ stockId }) => {
  const [activeSubTab, setActiveSubTab] = useState<QuoteSubTab>('INTRADAY');
  const [activeIndicator, setActiveIndicator] = useState<IndicatorType>('VOLUME');
  const [showMA, setShowMA] = useState(true);
  const [showBB, setShowBB] = useState(false);

  const { data: taData, isLoading: taLoading, error: taError } = useTechnicalAnalysis(stockId, 365);
  const { data: valuation, isLoading: isValuationLoading } = useValuationMetrics(stockId);
  const { data: intraday, isLoading: isIntradayLoading } = useIntraday(stockId);

  const currentPrice = valuation?.price || (intraday && intraday.length > 0 ? intraday[intraday.length - 1].value : 0);
  const prevPrice = valuation?.sparklineData && valuation.sparklineData.length > 1 
    ? valuation.sparklineData[valuation.sparklineData.length - 2].value 
    : (intraday && intraday.length > 1 ? intraday[intraday.length - 2].value : currentPrice);
  
  const priceChange = currentPrice - prevPrice;
  const priceChangePercent = prevPrice > 0 ? (priceChange / prevPrice) * 100 : 0;
  const isUp = priceChange >= 0;

  const renderSubTabs = () => (
    <div className="flex gap-2 p-1 bg-surfaceLight rounded-lg w-fit mb-6">
      {[
        { id: 'INTRADAY', label: '即時分時' },
        { id: 'TECHNICAL', label: '專業技術分析' },
        { id: 'STRATEGY', label: '實戰交易系統' }
      ].map((sub) => (
        <button
          key={sub.id}
          onClick={() => setActiveSubTab(sub.id as QuoteSubTab)}
          className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
            activeSubTab === sub.id
              ? 'bg-primary text-white shadow-sm'
              : 'text-textMuted hover:text-white'
          }`}
        >
          {sub.label}
        </button>
      ))}
    </div>
  );

  // Show loading state for TECHNICAL/STRATEGY tabs
  if (activeSubTab !== 'INTRADAY') {
    if (taLoading) {
      return (
        <div className="flex flex-col gap-6 animate-fade-in">
          {renderSubTabs()}
          <div className="h-[400px] w-full bg-surfaceLight/20 rounded-xl border border-surfaceLight/50 flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <span className="text-textMuted font-bold text-lg">技術分析資料載入中...</span>
            <span className="text-textMuted text-sm">正在計算指標數據，請稍候</span>
          </div>
        </div>
      );
    }

    if (taError) {
      return (
        <div className="flex flex-col gap-6 animate-fade-in">
          {renderSubTabs()}
          <div className="h-[400px] w-full bg-surfaceLight/10 rounded-xl border border-red-500/20 flex flex-col items-center justify-center gap-4">
            <Icon name="error" className="text-red-400 text-5xl opacity-50" />
            <div className="text-center">
              <p className="text-red-400 font-bold text-lg">無法載入技術分析資料</p>
              <p className="text-textMuted text-sm mt-1">{taError}</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-surfaceLight hover:bg-surface border border-surfaceLight rounded-lg text-white text-sm font-medium transition-colors"
            >
              重新整理頁面
            </button>
          </div>
        </div>
      );
    }

    const hasTechnicalData = taData && taData.ohlcv && taData.ohlcv.length > 0;
    if (!hasTechnicalData) {
      return (
        <div className="flex flex-col gap-6 animate-fade-in">
          {renderSubTabs()}
          <div className="h-[400px] w-full bg-surfaceLight/10 rounded-xl border border-surfaceLight flex flex-col items-center justify-center gap-4">
            <Icon name="history_toggle_off" className="text-textMuted text-5xl opacity-30" />
            <div className="text-center">
              <p className="text-textMuted font-bold text-lg">尚無歷史價格資料</p>
              <p className="text-textMuted text-sm mt-1 max-w-xs px-4">該股票可能剛上市或尚未進行數據同步，請點擊上方「同步資料」按鈕。</p>
            </div>
          </div>
        </div>
      );
    }
  }

  const renderDiagnostics = () => {
    if (activeSubTab !== 'TECHNICAL') return null;
    return (
      <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] font-mono grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="flex flex-col">
          <span className="text-blue-400/60 uppercase">Diagnostics v1.1</span>
          <span className="text-blue-400">Status: {taLoading ? 'LOADING' : (taError ? 'ERROR' : 'READY')}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-blue-400/60 uppercase">Candles</span>
          <span className="text-blue-400">{taData?.ohlcv.length || 0} items</span>
        </div>
        <div className="flex flex-col">
          <span className="text-blue-400/60 uppercase">Indicators</span>
          <span className="text-blue-400">{taData ? 'INITIALIZED' : 'NULL'}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-blue-400/60 uppercase">Error Msg</span>
          <span className="text-blue-400 truncate">{taError || 'NONE'}</span>
        </div>
      </div>
    );
  };


  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex justify-between items-center">
        {renderSubTabs()}
        {activeSubTab === 'TECHNICAL' && (
           <div className="text-[10px] text-textMuted bg-surfaceLight px-2 py-1 rounded">
             Build: {new Date().toLocaleTimeString()}
           </div>
        )}
      </div>

      {renderDiagnostics()}

      {/* Intraday View (Original) */}
      {activeSubTab === 'INTRADAY' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-surface border border-surfaceLight rounded-xl p-6">
              <div className="flex flex-wrap justify-between items-end mb-6">
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
                    資料來源: Yahoo/FinMind (更新時間: {new Date().toLocaleTimeString()})
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-x-8 gap-y-2 text-sm mt-4 lg:mt-0">
                  <div className="flex flex-col">
                    <span className="text-textMuted">開盤</span>
                    <span className="font-bold text-white">585.00</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-textMuted">最高</span>
                    <span className="font-bold text-up">589.00</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-textMuted">最低</span>
                    <span className="font-bold text-white">582.00</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-textMuted">昨收</span>
                    <span className="font-bold text-white">580.00</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-textMuted">總量</span>
                    <span className="font-bold text-primary">32,458</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-textMuted">成交額</span>
                    <span className="font-bold text-white">190.8億</span>
                  </div>
                </div>
              </div>

              <div className="h-80 w-full relative border-t border-surfaceLight pt-4">
                {(isIntradayLoading || isValuationLoading) && (!intraday || intraday.length === 0) ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-surface/50 z-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : null}
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={intraday && intraday.length > 0 ? intraday : (valuation?.sparklineData || STOCK_INTRADAY_DATA)}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isUp ? "#ef4444" : "#22c55e"} stopOpacity={0.1} />
                        <stop offset="95%" stopColor={isUp ? "#ef4444" : "#22c55e"} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="time" hide={true} />
                    <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} orientation="right" />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                    <Area type="monotone" dataKey="value" stroke={isUp ? "#ef4444" : "#22c55e"} strokeWidth={2} fill="url(#colorPrice)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-surface border border-surfaceLight rounded-xl overflow-hidden">
              <div className="p-4 border-b border-surfaceLight bg-surfaceLight/30">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Icon name="list_alt" />
                  五檔報價
                </h3>
              </div>
              <div className="flex flex-col">
                <div className="flex flex-col-reverse">
                  {ORDER_BOOK_DATA.asks.map((ask, i) => (
                    <div key={i} className="grid grid-cols-3 text-sm py-2 px-4 hover:bg-surfaceLight/20 relative">
                      <span className="text-textMuted font-medium text-center">賣 {5 - i}</span>
                      <span className="text-up font-bold text-right">{ask.price}</span>
                      <div className="text-right relative z-10">{ask.volume}</div>
                      <div className="absolute top-1 bottom-1 right-0 bg-up/20 z-0" style={{ width: `${(ask.volume / 500) * 100}%` }}></div>
                    </div>
                  ))}
                </div>
                <div className="border-y border-surfaceLight py-2 bg-surfaceLight/10 text-center text-xs text-textMuted font-medium tracking-wider">
                  最新成交 588.00
                </div>
                <div className="flex flex-col">
                  {ORDER_BOOK_DATA.bids.map((bid, i) => (
                    <div key={i} className="grid grid-cols-3 text-sm py-2 px-4 hover:bg-surfaceLight/20 relative">
                      <span className="text-textMuted font-medium text-center">買 {i + 1}</span>
                      <span className="text-up font-bold text-right">{bid.price}</span>
                      <div className="text-right relative z-10">{bid.volume}</div>
                      <div className="absolute top-1 bottom-1 right-0 bg-up/20 z-0" style={{ width: `${(bid.volume / 500) * 100}%` }}></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Technical Analysis View */}
      {activeSubTab === 'TECHNICAL' && taData && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center bg-surface border border-surfaceLight rounded-xl p-3 px-4">
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
            <div className="flex gap-2">
              {(['VOLUME', 'MACD', 'RSI'] as IndicatorType[]).map(ind => (
                <button
                  key={ind}
                  onClick={() => setActiveIndicator(ind)}
                  className={`px-3 py-1 text-xs font-bold rounded ${
                    activeIndicator === ind ? 'bg-primary text-white' : 'bg-surfaceLight text-textMuted hover:text-white'
                  }`}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>
          
          <KLineChart ohlcv={taData.ohlcv} indicators={taData.indicators} showMA={showMA} showBB={showBB} />
          <IndicatorSection ohlcv={taData.ohlcv} indicators={taData.indicators} type={activeIndicator} />
        </div>
      )}

      {/* Strategy View */}
      {activeSubTab === 'STRATEGY' && taData && (
        <TradingSystemPanel ohlcv={taData.ohlcv} indicators={taData.indicators} />
      )}
    </div>
  );
};
