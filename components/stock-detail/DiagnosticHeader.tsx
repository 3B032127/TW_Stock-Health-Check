import React from 'react';
import { Icon } from '../../App';
import { AdvancedHealthData } from '../../types';

interface DiagnosticHeaderProps {
  data?: AdvancedHealthData;
}

export const DiagnosticHeader: React.FC<DiagnosticHeaderProps> = ({ data }) => {
  if (!data) return null;

  const aiSummary = data.prosCons?.aiSummary;
  const quadrant = data.decisionQuadrant || 'Fairly Valued';
  const beta = data.beta;
  const volClass = data.volatilityClass;
  const nextEvent = data.nextEvent;
  const sentiment = data.sentiment;

  const quadrantLabels = {
    'Quality Undervalued': { text: '優質低估', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]' },
    'Growth Premium': { text: '成長溢價', color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/40', shadow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]' },
    'Value Trap': { text: '價值陷阱', color: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/40', shadow: 'shadow-[0_0_15px_rgba(225,29,72,0.3)]' },
    'Fairly Valued': { text: '評價合理', color: 'text-indigo-400', bg: 'bg-indigo-500/20', border: 'border-indigo-500/40', shadow: 'shadow-[0_0_15px_rgba(99,102,241,0.3)]' },
  };

  const style = quadrantLabels[quadrant] || quadrantLabels['Fairly Valued'];

  return (
    <div className="w-full flex justify-between rounded-xl bg-gradient-to-r from-surfaceLight/80 to-surface p-5 shadow-lg border border-surfaceLight relative overflow-hidden flex-col gap-4">
      {/* Background Icon Effect */}
      <Icon name="explore" className="absolute -left-6 -bottom-6 text-9xl text-white opacity-[0.02] pointer-events-none" />

      <div className="flex items-center gap-2 z-10 text-lg text-white font-bold mb-1">
        <Icon name="radar" className="text-indigo-400" />
        投資性格與環境導航
      </div>
      
      {/* Metrics Row */}
      <div className="flex flex-col xl:flex-row gap-4 z-10 w-full justify-between items-stretch">
        
        {/* Metric 1: Quadrant */}
        <div className="flex-1 rounded-xl bg-surface/40 border border-surfaceLight p-4 flex flex-col justify-center items-center group transition-colors hover:bg-surface/80 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface hover:opacity-0 transition-opacity pointer-events-none"></div>
          <span className="text-[10px] text-textMuted uppercase tracking-widest font-bold mb-3 z-10">估值與體質象限</span>
          <div className={`px-4 py-1.5 rounded-full ${style.bg} ${style.border} border ${style.color} font-black text-sm tracking-widest ${style.shadow} w-[80%] text-center transition-all duration-300 z-10`}>
            [{style.text}]
          </div>
        </div>

        {/* Metric 2: Volatility */}
        {beta !== undefined && volClass && (
        <div className="flex-1 rounded-xl bg-surface/40 border border-surfaceLight p-4 flex flex-col justify-center items-center group transition-colors hover:bg-surface/80 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface hover:opacity-0 transition-opacity pointer-events-none"></div>
          <span className="text-[10px] text-textMuted uppercase tracking-widest font-bold mb-2 z-10 flex items-center gap-1">
             波動與避險風險 (Beta)
          </span>
          <div className="flex items-center gap-3 z-10">
            <span className="text-3xl font-black text-white">{beta.toFixed(2)}</span>
            <span className={`text-[10px] px-2 py-1 rounded-md border font-bold ${beta > 1.2 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : beta < 0.8 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
              {volClass}
            </span>
          </div>
        </div>
        )}

        {/* Metric 3: Next Event */}
        {nextEvent && (
        <div className="flex-1 rounded-xl bg-surface/40 border border-surfaceLight p-4 flex flex-col justify-center items-center group transition-colors hover:bg-surface/80 relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface hover:opacity-0 transition-opacity pointer-events-none"></div>
           <span className="text-[10px] text-textMuted uppercase tracking-widest font-bold mb-1 z-10 flex items-center gap-1">
             <Icon name="event" className="text-[14px]" /> 關鍵行事曆倒數
           </span>
           <div className="flex items-baseline gap-1.5 z-10">
             <span className="text-3xl font-black text-amber-400 drop-shadow-md">{nextEvent.daysLeft}</span>
             <span className="text-xs font-bold text-textMuted">天後</span>
           </div>
           <span className="text-[11px] text-slate-300 font-bold z-10 bg-surfaceLight/30 px-2 py-0.5 rounded border border-white/5">{nextEvent.name} ({nextEvent.date})</span>
        </div>
        )}

        {/* Metric 4: Sentiment */}
        {sentiment && (
        <div className="flex-1 rounded-xl bg-surface/40 border border-surfaceLight p-4 flex flex-col justify-center items-center group transition-colors hover:bg-surface/80 relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface hover:opacity-0 transition-opacity pointer-events-none"></div>
           <span className="text-[10px] text-textMuted uppercase tracking-widest font-bold mb-3 z-10 flex items-center gap-1">
             <Icon name="local_fire_department" className={`text-[14px] ${sentiment.status === '過熱' ? 'text-rose-500 animate-pulse' : 'text-textMuted'}`} /> 市場籌碼熱度
           </span>
           <div className="w-[85%] h-2 rounded-full bg-slate-800 mb-2 relative overflow-hidden flex z-10 border border-black/30">
             <div className="h-full bg-gradient-to-r from-rose-500 to-rose-400" style={{ width: `${sentiment.retail}%` }}></div>
             <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400" style={{ width: `${sentiment.institutional}%` }}></div>
           </div>
           <div className="flex w-[85%] justify-between items-center z-10">
             <span className="text-[10px] font-bold text-rose-400">散戶 {sentiment.retail}%</span>
             <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${sentiment.status === '過熱' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : sentiment.status === '冷清' ? 'bg-slate-700/50 text-textMuted border-white/5' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
               {sentiment.status}
             </span>
             <span className="text-[10px] font-bold text-blue-400">法人 {sentiment.institutional}%</span>
           </div>
        </div>
        )}

      </div>

      {/* AI Summary Conclusion */}
      {aiSummary && (
        <div className="flex-1 flex items-start gap-4 z-10 w-full bg-blue-500/5 p-4 rounded-xl border border-blue-500/10 transition-colors hover:bg-blue-500/10 mt-2">
          <div className="shrink-0 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 shadow-inner">
            <Icon name="psychology" className="text-blue-400 text-2xl" />
          </div>
          <div className="flex flex-col gap-1 w-full">
            <span className="text-sm font-black text-blue-400">AI 綜合診斷結論</span>
            <p className="text-white/90 text-[13px] leading-relaxed font-sans font-medium">{aiSummary}</p>
          </div>
        </div>
      )}
    </div>
  );
};
