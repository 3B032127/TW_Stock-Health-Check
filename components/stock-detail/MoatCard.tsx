import React from 'react';
import { Icon } from '../../App';
import { MoatItem } from '../../types';

interface MoatCardProps {
  items: MoatItem[];
  score: number;
  dividendHistory?: { year: number; amount: number; payoutRatio: number }[];
}

export const MoatCard: React.FC<MoatCardProps> = ({ items, score, dividendHistory }) => {
  return (
    <div className="rounded-xl bg-surface p-5 shadow-sm border border-surfaceLight flex flex-col h-full relative overflow-hidden">
      <div className="flex justify-between items-center mb-5 border-b border-surfaceLight/50 pb-3">
        <h3 className="text-white text-lg font-bold flex items-center gap-2">
          <Icon name="verified" className="text-amber-400" />
          穩定性與護城河
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-textMuted font-bold">總護城河分數</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)]" 
                style={{ width: `${score}%` }}
              />
            </div>
            <span className="text-lg font-black text-amber-400">{score}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 flex-1">
        {/* Left: Moat Checklist */}
        <div className="flex-1 flex flex-col gap-3 justify-center">
          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center px-4 py-2.5 rounded-lg bg-surfaceLight/10 border border-surfaceLight/30 hover:bg-surfaceLight/30 transition-colors">
              <span className="text-sm font-medium text-slate-300 tracking-wide flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'pass' ? 'bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.8)]' : 'bg-slate-600'}`}></div>
                {item.label}
              </span>
              {item.status === 'pass' ? (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Icon name="check" className="text-[12px]" /> 具備優勢
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black bg-surfaceLight/50 text-textMuted border border-white/5">
                  <Icon name="close" className="text-[12px]" /> 待加強
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Right: Dividend Chart */}
        <div className="flex-1 flex flex-col pt-2 xl:pt-0 xl:border-l border-t xl:border-t-0 border-surfaceLight/50 xl:pl-6">
          <div className="flex justify-between items-end mb-4">
            <span className="text-xs text-textMuted font-bold">
              長線投資價值：歷史股利發放 
              <span className="text-emerald-400 ml-2">
                {dividendHistory && dividendHistory.length > 0 && dividendHistory[0].amount > 0 ? `最新 $${dividendHistory[0].amount}` : ''}
              </span>
            </span>
          </div>
          
          {dividendHistory && dividendHistory.length > 0 ? (
            <div className="flex-1 flex items-end gap-1.5 h-full min-h-[120px] mt-2">
              {dividendHistory.slice().reverse().map((d, i) => {
                const maxAmount = Math.max(...dividendHistory.map(item => item.amount), 1); 
                const barHeight = d.amount > 0 ? Math.max((d.amount / maxAmount) * 100, 5) : 0; 
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5 group relative h-full">
                    <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg z-10 whitespace-nowrap border border-white/10">
                      ${d.amount}
                    </div>
                    {d.amount > 0 ? (
                      <div 
                        className="w-full bg-emerald-500/80 hover:bg-emerald-400 transition-all rounded-t shadow-[0_0_8px_rgba(16,185,129,0.2)]" 
                        style={{ height: `${barHeight}%` }}
                      />
                    ) : (
                      <div className="w-full h-[2px] bg-rose-500/50" />
                    )}
                    <span className="text-[9px] text-textMuted font-mono">{d.year.toString().slice(-2)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
             <div className="flex-1 flex items-center justify-center text-textMuted text-sm h-full min-h-[120px]">
               尚無股利資料或不配息
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
