import React, { useState, useMemo } from 'react';
import { OHLCV, TechnicalIndicators } from '../../../types';
import { Icon } from '../../../App';

interface TradingSystemPanelProps {
  ohlcv: OHLCV[];
  indicators: TechnicalIndicators;
}

export const TradingSystemPanel: React.FC<TradingSystemPanelProps> = ({ ohlcv, indicators }) => {
  const [entryPriceInput, setEntryPriceInput] = useState<string>('');

  const currentData = useMemo(() => {
    if (!ohlcv.length || !indicators.ema50.length) return null;
    
    const lastPrice = ohlcv[ohlcv.length - 1].close;
    const currentEma50 = indicators.ema50[indicators.ema50.length - 1]?.value || 0;
    const currentEma200 = indicators.ema200[indicators.ema200.length - 1]?.value || 0;
    const currentRsi = indicators.rsi[indicators.rsi.length - 1]?.value || 50;
    const currentAtr = indicators.atr[indicators.atr.length - 1]?.value || 0;
    
    // OBV trend check
    const currentObv = indicators.obv[indicators.obv.length - 1]?.value || 0;
    const prevObv = indicators.obv[indicators.obv.length - 6]?.value || 0;
    
    return {
      lastPrice,
      currentEma50,
      currentEma200,
      currentRsi,
      currentAtr,
      obvTrend: currentObv > prevObv ? 'up' : 'down'
    };
  }, [ohlcv, indicators]);

  if (!currentData) return <div className="p-4 text-textMuted text-sm">載入中...</div>;

  const { lastPrice, currentEma50, currentEma200, currentRsi, currentAtr, obvTrend } = currentData;

  // Filter 1: Trend
  const isBullMarket = currentEma50 > currentEma200;
  const isPriceAboveEma50 = lastPrice > currentEma50;
  let trendStatus = { label: '空頭排列', color: 'text-red-400', icon: 'trending_down' };
  if (isBullMarket && isPriceAboveEma50) {
    trendStatus = { label: '強勢多頭', color: 'text-emerald-400', icon: 'trending_up' };
  } else if (isBullMarket && !isPriceAboveEma50) {
    trendStatus = { label: '多頭回調', color: 'text-yellow-400', icon: 'trending_flat' };
  }

  // Filter 2: Momentum
  let momentumStatus = { label: '中性震盪', color: 'text-textMuted', icon: 'swap_horiz' };
  if (currentRsi > 70) {
    momentumStatus = { label: '超買區間 (謹慎追高)', color: 'text-red-400', icon: 'warning' };
  } else if (currentRsi < 30) {
    momentumStatus = { label: '超賣區間 (尋找買點)', color: 'text-emerald-400', icon: 'check_circle' };
  }

  // Filter 3: Confirmation
  const confirmStatus = obvTrend === 'up' 
    ? { label: '量能增溫', color: 'text-emerald-400', icon: 'moving' }
    : { label: '量能退潮', color: 'text-red-400', icon: 'moving' };

  // ATR Calculator
  const entryPrice = parseFloat(entryPriceInput) || lastPrice;
  const stopLossDistance = currentAtr * 1.5;
  const stopLossPrice = entryPrice - stopLossDistance;
  const takeProfitPrice = entryPrice + (stopLossDistance * 2); // 1:2 Risk/Reward

  return (
    <div className="flex flex-col gap-6">
      {/* Triple Screen Filter */}
      <div className="bg-surface border border-surfaceLight rounded-xl p-5">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <Icon name="filter_alt" className="text-primary" />
          三重濾網交易系統
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-surfaceLight/30 border border-surfaceLight/50 flex flex-col gap-2">
            <span className="text-xs font-bold text-textMuted uppercase tracking-wider">第一重：大趨勢</span>
            <div className={`flex items-center gap-2 text-lg font-bold ${trendStatus.color}`}>
              <Icon name={trendStatus.icon} />
              {trendStatus.label}
            </div>
            <p className="text-xs text-textMuted mt-1">EMA(50) 與 EMA(200) 關係</p>
          </div>

          <div className="p-4 rounded-lg bg-surfaceLight/30 border border-surfaceLight/50 flex flex-col gap-2">
            <span className="text-xs font-bold text-textMuted uppercase tracking-wider">第二重：動能時機</span>
            <div className={`flex items-center gap-2 text-lg font-bold ${momentumStatus.color}`}>
              <Icon name={momentumStatus.icon} />
              {momentumStatus.label}
            </div>
            <p className="text-xs text-textMuted mt-1">RSI(14) 超買超賣判定</p>
          </div>

          <div className="p-4 rounded-lg bg-surfaceLight/30 border border-surfaceLight/50 flex flex-col gap-2">
            <span className="text-xs font-bold text-textMuted uppercase tracking-wider">第三重：量能確認</span>
            <div className={`flex items-center gap-2 text-lg font-bold ${confirmStatus.color}`}>
              <Icon name={confirmStatus.icon} />
              {confirmStatus.label}
            </div>
            <p className="text-xs text-textMuted mt-1">OBV 能量潮趨勢</p>
          </div>
        </div>
      </div>

      {/* ATR Risk Manager */}
      <div className="bg-surface border border-surfaceLight rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Icon name="security" className="text-blue-400" />
            ATR 動態風險管理
          </h3>
          <span className="text-sm font-medium text-textMuted">
            目前真實波幅 (ATR): <span className="text-white">{currentAtr.toFixed(2)}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-textMuted">預計買入價格</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted">$</span>
              <input
                type="number"
                value={entryPriceInput}
                onChange={(e) => setEntryPriceInput(e.target.value)}
                placeholder={lastPrice.toFixed(2)}
                className="w-full bg-surfaceLight border border-surfaceLight/50 rounded-lg py-2 pl-8 pr-4 text-white focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <p className="text-xs text-textMuted">預設為最新收盤價，可手動修改試算。</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 flex flex-col justify-center">
              <span className="text-xs font-medium text-red-400/80 mb-1">防洗盤停損價 (Entry - 1.5 ATR)</span>
              <span className="text-xl font-bold text-red-400">{stopLossPrice.toFixed(2)}</span>
              <span className="text-xs text-red-400/60 mt-1">最大虧損: {(stopLossDistance).toFixed(2)} 元</span>
            </div>
            
            <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex flex-col justify-center">
              <span className="text-xs font-medium text-emerald-400/80 mb-1">建議停利價 (R/R = 1:2)</span>
              <span className="text-xl font-bold text-emerald-400">{takeProfitPrice.toFixed(2)}</span>
              <span className="text-xs text-emerald-400/60 mt-1">預期獲利: {(stopLossDistance * 2).toFixed(2)} 元</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
