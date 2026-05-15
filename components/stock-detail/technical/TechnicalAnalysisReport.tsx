import React, { useMemo } from 'react';
import { OHLCV, TechnicalIndicators } from '../../../types';
import { Icon } from '../../../App';

interface TechnicalAnalysisReportProps {
  ohlcv: OHLCV[];
  indicators: TechnicalIndicators;
}

export const TechnicalAnalysisReport: React.FC<TechnicalAnalysisReportProps> = ({ ohlcv, indicators }) => {
  const analysis = useMemo(() => {
    if (!ohlcv || ohlcv.length < 2 || !indicators || !indicators.macd || indicators.macd.length < 2 || !indicators.kd || indicators.kd.length < 2 || !indicators.rsi || !indicators.rsi.length) {
      return null;
    }

    const last = ohlcv[ohlcv.length - 1];
    
    const macd = indicators.macd[indicators.macd.length - 1];
    const prevMacd = indicators.macd[indicators.macd.length - 2];
    
    const kd = indicators.kd[indicators.kd.length - 1];
    const prevKd = indicators.kd[indicators.kd.length - 2];
    
    const rsi = indicators.rsi[indicators.rsi.length - 1];
    
    const sma5 = indicators.sma5 && indicators.sma5.length ? indicators.sma5[indicators.sma5.length - 1]?.value : undefined;
    const sma20 = indicators.sma20 && indicators.sma20.length ? indicators.sma20[indicators.sma20.length - 1]?.value : undefined;
    const sma60 = indicators.sma60 && indicators.sma60.length ? indicators.sma60[indicators.sma60.length - 1]?.value : undefined;

    // 1. Trend Analysis
    const trendInsights = [];
    if (sma5 && sma20 && sma60) {
      if (last.close > sma5 && sma5 > sma20 && sma20 > sma60) {
        trendInsights.push({ type: 'bull', text: '均線多頭排列，處於強勢上漲軌道。' });
      } else if (last.close < sma5 && sma5 < sma20 && sma20 < sma60) {
        trendInsights.push({ type: 'bear', text: '均線空頭排列，目前處於弱勢下探階段。' });
      } else if (last.close > sma20) {
        trendInsights.push({ type: 'neutral', text: '股價站上月線，短期趨勢轉強。' });
      } else {
        trendInsights.push({ type: 'neutral', text: '股價跌破月線，短期進入整理區間。' });
      }
    }

    // 2. Momentum (MACD)
    const macdInsights = [];
    if (macd.histogram > 0 && prevMacd.histogram < 0) {
      macdInsights.push({ type: 'bull', text: 'MACD 柱狀體翻紅，出現黃金交叉訊號。' });
    } else if (macd.histogram < 0 && prevMacd.histogram > 0) {
      macdInsights.push({ type: 'bear', text: 'MACD 柱狀體翻綠，出現死亡交叉訊號。' });
    } else if (macd.histogram > prevMacd.histogram) {
      macdInsights.push({ type: 'bull', text: 'MACD 動能轉強，紅柱持續增長或綠柱縮短。' });
    } else {
      macdInsights.push({ type: 'bear', text: 'MACD 動能轉弱，紅柱縮短或綠柱持續增長。' });
    }

    // 3. Oscillators (KD/RSI)
    const oscInsights = [];
    if (kd.k > 80) oscInsights.push({ type: 'warn', text: 'KD 指標進入超買區（>80），需警惕拉回風險。' });
    else if (kd.k < 20) oscInsights.push({ type: 'bull', text: 'KD 指標進入超跌區（<20），低檔轉強機會增加。' });
    
    if (kd.k > kd.d && prevKd.k < prevKd.d) oscInsights.push({ type: 'bull', text: 'KD 出現低檔黃金交叉，買盤力道增溫。' });
    
    if (rsi.value > 70) oscInsights.push({ type: 'warn', text: 'RSI 指標 > 70，市場情緒較為過熱。' });
    else if (rsi.value < 30) oscInsights.push({ type: 'bull', text: 'RSI 指標 < 30，短線可能出現跌深反彈。' });

    // Summary Score (0-100)
    let score = 50;
    const all = [...trendInsights, ...macdInsights, ...oscInsights];
    all.forEach(i => {
      if (i.type === 'bull') score += 10;
      if (i.type === 'bear') score -= 10;
      if (i.type === 'warn') score -= 5;
    });
    score = Math.max(0, Math.min(100, score));

    return { trendInsights, macdInsights, oscInsights, score, lastPrice: last.close };
  }, [ohlcv, indicators]);

  if (!analysis) return null;

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'bull': return 'text-emerald-400';
      case 'bear': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      default: return 'text-textMuted';
    }
  };

  const getStatusBg = (type: string) => {
    switch (type) {
      case 'bull': return 'bg-emerald-400/10 border-emerald-400/20';
      case 'bear': return 'bg-red-400/10 border-red-400/20';
      case 'warn': return 'bg-yellow-400/10 border-yellow-400/20';
      default: return 'bg-surfaceLight/50 border-surfaceLight';
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Overall Score */}
      <div className="bg-surface border border-surfaceLight rounded-xl p-6 flex flex-col items-center gap-4">
        <h3 className="text-sm font-bold text-textMuted uppercase tracking-widest">技術面診斷分數</h3>
        <div className="relative flex items-center justify-center">
          <svg className="w-32 h-32 transform -rotate-90">
            <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-surfaceLight" />
            <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" 
              strokeDasharray={364} strokeDashoffset={364 - (364 * analysis.score) / 100}
              className={`${analysis.score >= 60 ? 'text-emerald-500' : analysis.score >= 40 ? 'text-yellow-500' : 'text-red-500'} transition-all duration-1000`} />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-4xl font-bold text-white">{analysis.score}</span>
            <span className="text-[10px] text-textMuted font-medium">綜合評價</span>
          </div>
        </div>
        <p className="text-sm font-bold text-center">
          目前盤勢：
          <span className={analysis.score >= 60 ? 'text-emerald-400' : analysis.score >= 40 ? 'text-yellow-400' : 'text-red-400'}>
            {analysis.score >= 80 ? ' 極度強勢' : analysis.score >= 60 ? ' 多頭占優' : analysis.score >= 40 ? ' 中性整理' : ' 空頭偏弱'}
          </span>
        </p>
      </div>

      {/* Summary Report Section */}
      <div className="bg-surface border border-surfaceLight rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-surfaceLight bg-surfaceLight/30">
          <h3 className="font-bold text-white flex items-center gap-2 text-sm">
            <Icon name="description" className="text-primary text-lg" />
            指標分析摘要
          </h3>
        </div>
        <div className="p-4 flex flex-col gap-3">
          {[...analysis.trendInsights, ...analysis.macdInsights, ...analysis.oscInsights].map((insight, idx) => (
            <div key={idx} className={`p-3 rounded-lg border flex gap-3 items-start ${getStatusBg(insight.type)}`}>
               <Icon name={insight.type === 'bull' ? 'trending_up' : insight.type === 'bear' ? 'trending_down' : 'info'} 
                 className={`text-lg mt-0.5 ${getStatusColor(insight.type)}`} />
               <span className="text-sm font-medium leading-relaxed">{insight.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Data Snapshot */}
      <div className="bg-surface border border-surfaceLight rounded-xl p-5">
        <h3 className="text-xs font-bold text-textMuted mb-4 uppercase tracking-widest">當前指標數據</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-textMuted">收盤價</span>
            <span className="font-mono font-bold text-white">{analysis.lastPrice.toFixed(2)}</span>
          </div>
          <div className="h-[1px] bg-surfaceLight/50" />
          <div className="flex justify-between items-center text-sm">
            <span className="text-textMuted">RSI(14)</span>
            <span className={`font-mono font-bold ${analysis.oscInsights.find(i => i.text.includes('RSI')) ? 'text-yellow-400' : 'text-white'}`}>
              {indicators.rsi[indicators.rsi.length - 1]?.value?.toFixed(2) || '---'}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-textMuted">KD(9,3)</span>
            <span className="font-mono font-bold text-white">
              {indicators.kd[indicators.kd.length - 1]?.k?.toFixed(1) || '---'} / {indicators.kd[indicators.kd.length - 1]?.d?.toFixed(1) || '---'}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-textMuted">MACD Hist</span>
            <span className={`font-mono font-bold ${analysis.macdInsights.find(i => i.type === 'bull') ? 'text-emerald-400' : 'text-red-400'}`}>
              {indicators.macd[indicators.macd.length - 1]?.histogram?.toFixed(3) || '---'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
