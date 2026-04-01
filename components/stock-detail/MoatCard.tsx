import React from 'react';
import { Icon } from '../../App';
import { MoatItem } from '../../types';

interface MoatCardProps {
  items: MoatItem[];
  score: number;
}

export const MoatCard: React.FC<MoatCardProps> = ({ items, score }) => {
  return (
    <div className="rounded-xl bg-surface p-6 shadow-sm border border-surfaceLight flex flex-col h-full relative overflow-hidden">
      <h3 className="text-white text-lg font-bold mb-6 flex items-center gap-2">
        <Icon name="verified" className="text-amber-400" />
        穩定性與護城河
      </h3>

      <div className="flex-1 flex flex-col gap-4">
        {items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center px-4 py-3 rounded-lg bg-surfaceLight/20 border border-surfaceLight/50">
            <span className="text-sm font-bold text-slate-300 tracking-wide">{item.label}</span>
            {item.status === 'pass' ? (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-500 shadow-sm shadow-amber-500/10 border border-amber-500/20">
                <Icon name="check" className="text-[14px]" /> 具備
              </span>
            ) : (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-surfaceLight text-textMuted border border-white/5">
                <Icon name="close" className="text-[14px]" /> 缺乏
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 空白處優化：防禦力總評量表 */}
      <div className="mt-8 pt-6 border-t border-surfaceLight/50">
        <div className="flex justify-between items-end mb-2">
          <span className="text-xs text-textMuted font-bold">穩定性分數 (Stability Score)</span>
          <span className="text-xl font-black text-amber-400">{score}<span className="text-sm font-medium text-textMuted">/100</span></span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)]" 
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
};
