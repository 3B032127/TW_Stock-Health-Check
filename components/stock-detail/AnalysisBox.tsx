import React from 'react';
import { Icon } from '../../App';
import { ProsCons } from '../../types';

export const AnalysisBox: React.FC<{ data: ProsCons }> = ({ data }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
      {/* Pros Box */}
      <div className="rounded-xl bg-[#10b981]/5 p-5 border border-emerald-500/10 hover:border-emerald-500/30 transition-colors shadow-sm flex flex-col relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
          <Icon name="check_circle" className="text-7xl text-emerald-500" />
        </div>
        <h4 className="text-emerald-400 font-black mb-3 tracking-wide flex items-center gap-2 z-10 text-lg">
          <Icon name="check_circle" /> 優勢 (Pros)
        </h4>
        <ul className="space-y-2.5 flex-1 flex flex-col z-10">
          {data.pros.map((pro, index) => (
            <li key={`pro-${index}`} className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-sm font-medium text-emerald-50 leading-relaxed font-sans">{pro}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Cons Box */}
      <div className="rounded-xl bg-[#e11d48]/5 p-5 border border-rose-500/10 hover:border-rose-500/30 transition-colors shadow-sm flex flex-col relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
          <Icon name="warning" className="text-7xl text-rose-500" />
        </div>
        <h4 className="text-rose-400 font-black mb-3 tracking-wide flex items-center gap-2 z-10 text-lg">
          <Icon name="warning" /> 風險 (Cons)
        </h4>
        <ul className="space-y-2.5 flex-1 flex flex-col z-10">
          {data.cons.map((con, index) => (
            <li key={`con-${index}`} className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0 shadow-[0_0_8px_rgba(225,29,72,0.5)]" />
              <span className="text-sm font-medium text-rose-50 leading-relaxed font-sans">{con}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
