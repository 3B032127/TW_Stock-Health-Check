import React from 'react';
import { Icon } from '../../App';

interface DiagnosticHeaderProps {
  decisionQuadrant?: 'Quality Undervalued' | 'Growth Premium' | 'Value Trap' | 'Fairly Valued';
  aiSummary?: string;
}

export const DiagnosticHeader: React.FC<DiagnosticHeaderProps> = ({ decisionQuadrant, aiSummary }) => {
  if (!decisionQuadrant && !aiSummary) return null;

  const quadrantLabels = {
    'Quality Undervalued': { text: '優質低估', color: 'text-indigo-400', bg: 'bg-indigo-500/20', border: 'border-indigo-500/40', shadow: 'shadow-[0_0_15px_rgba(99,102,241,0.3)]' },
    'Growth Premium': { text: '成長溢價', color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/40', shadow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]' },
    'Value Trap': { text: '價值陷阱', color: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/40', shadow: 'shadow-[0_0_15px_rgba(225,29,72,0.3)]' },
    'Fairly Valued': { text: '評價合理', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]' },
  };

  const style = decisionQuadrant ? quadrantLabels[decisionQuadrant] : quadrantLabels['Fairly Valued'];

  return (
    <div className="w-full rounded-xl bg-gradient-to-r from-surfaceLight/80 to-surface p-5 shadow-lg border border-surfaceLight relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
      {/* Background Icon Effect */}
      <Icon name="explore" className="absolute -left-6 -bottom-6 text-9xl text-white opacity-[0.02] pointer-events-none" />

      {decisionQuadrant && (
        <div className="flex flex-col items-center justify-center shrink-0 w-full md:w-48 text-center md:border-r border-surfaceLight/50 md:pr-6">
          <span className="text-xs text-textMuted font-bold mb-2">投資性格導航</span>
          <div className={`px-4 py-1.5 rounded-full ${style.bg} ${style.border} border ${style.color} font-black text-lg tracking-wider ${style.shadow} w-full text-center transition-all duration-300`}>
            [{style.text}]
          </div>
        </div>
      )}

      {aiSummary && (
        <div className="flex-1 flex items-start gap-4 z-10 w-full">
          <div className="shrink-0 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 mt-1">
            <Icon name="psychology" className="text-blue-400 text-2xl" />
          </div>
          <div className="flex flex-col gap-1 w-full">
            <span className="text-sm font-black text-blue-400">AI 診斷核心結論</span>
            <p className="text-white/90 text-sm leading-relaxed font-sans font-medium">{aiSummary}</p>
          </div>
        </div>
      )}
    </div>
  );
};
