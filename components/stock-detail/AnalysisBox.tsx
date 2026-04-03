import React from 'react';
import { Icon } from '../../App';
import { ProsCons } from '../../types';

export const AnalysisBox: React.FC<{ data: ProsCons }> = ({ data }) => {
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Pros Box */}
      <div className="rounded-xl bg-[#10b981]/5 p-5 border border-emerald-500/10 hover:border-emerald-500/30 transition-colors shadow-sm flex flex-col relative overflow-hidden group flex-1">
        <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
          <Icon name="check_circle" className="text-7xl text-emerald-500" />
        </div>
        <h4 className="text-emerald-400 font-black mb-3 tracking-wide flex items-center gap-2 z-10 text-lg">
          <Icon name="check_circle" /> 護城河優勢
        </h4>
        <ul className="space-y-2 flex-1 flex flex-col z-10 overflow-y-auto max-h-[160px] pr-1 custom-scrollbar">
          {data.pros.map((pro, index) => (
            <li key={`pro-${index}`} className="flex items-start gap-2.5 bg-emerald-500/5 p-2 rounded border border-emerald-500/10 hover:bg-emerald-500/10 transition-colors group/item">
              <Icon name="arrow_right" className="text-emerald-400 mt-0.5 text-xs shrink-0 group-hover/item:translate-x-1 transition-transform" />
              <span className="text-sm font-medium text-emerald-50 leading-relaxed font-sans">{pro}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Cons Box */}
      <div className="rounded-xl bg-[#e11d48]/5 p-5 border border-rose-500/10 hover:border-rose-500/30 transition-colors shadow-sm flex flex-col relative overflow-hidden group flex-1 min-h-[220px]">
        <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
          <Icon name="warning" className="text-7xl text-rose-500" />
        </div>
        <h4 className="text-rose-400 font-black mb-3 tracking-wide flex items-center gap-2 z-10 text-lg">
          <Icon name="warning" /> 投資風險
        </h4>
        <ul className="space-y-2 flex-1 flex flex-col z-10 overflow-y-auto max-h-[160px] pr-1 custom-scrollbar">
          {data.cons.map((con, index) => (
            <li key={`con-${index}`} className="flex items-start gap-2.5 bg-rose-500/5 p-2 rounded border border-rose-500/10 hover:bg-rose-500/10 transition-colors group/item">
              <Icon name="arrow_right" className="text-rose-400 mt-0.5 text-xs shrink-0 group-hover/item:translate-x-1 transition-transform" />
              <span className="text-sm font-medium text-rose-50 leading-relaxed font-sans">{con}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
