import React from 'react';
import { Icon } from '../../App';
import { AdvancedHealthData, ProsCons } from '../../types';

interface HealthScoreGaugeProps {
  score: number;
  peerAvg: number;
  data?: AdvancedHealthData;
  prosCons?: ProsCons;
  nextEvent?: { name: string; date: string; daysLeft: number };
}

export const HealthScoreGauge: React.FC<HealthScoreGaugeProps> = ({ score, peerAvg, data, prosCons, nextEvent }) => {
  const getStatus = (s: number) => {
    if (s >= 80) return { label: '優秀', color: 'emerald', hex: '#10b981' };
    if (s >= 60) return { label: '良好', color: 'blue', hex: '#3b82f6' };
    return { label: '待加強', color: 'rose', hex: '#f43f5e' };
  };

  const quadrant = data?.decisionQuadrant || 'Fairly Valued';
  const quadrantLabels = {
    'Quality Undervalued': { text: '優質低估', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    'Growth Premium': { text: '成長溢價', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    'Value Trap': { text: '價值陷阱', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    'Fairly Valued': { text: '評價合理', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  };

  const qStyle = quadrantLabels[quadrant] || quadrantLabels['Fairly Valued'];

  const getVolatilityLabel = (b: number) => {
    if (b < 0.8) return { 
      text: '防禦型 (低波動)', 
      desc: `較大盤波動率約 ${(b*100).toFixed(0)}%`,
      advice: '適合長線領息與風險規避',
      color: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', icon: 'shield' 
    };
    if (b > 1.2) return { 
      text: '攻擊型 (高波動)', 
      desc: `較大盤波動率約 ${(b*100).toFixed(0)}%`,
      advice: '適合追逐價差或景氣復甦',
      color: 'text-rose-400', bg: 'bg-rose-500/5', border: 'border-rose-500/20', icon: 'bolt' 
    };
    return { 
      text: '標竿型 (中波動)', 
      desc: '波動率與大盤趨於一致',
      advice: '適合標準化產業趨勢配置',
      color: 'text-blue-400', bg: 'bg-blue-500/5', border: 'border-blue-500/20', icon: 'auto_graph' 
    };
  };

  const vStyle = data?.beta !== undefined ? getVolatilityLabel(data.beta) : null;
  const status = getStatus(score);
  
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col h-full rounded-xl bg-surface p-6 shadow-sm border border-surfaceLight relative group">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon name="health_metrics" className="text-9xl text-white" />
      </div>
      
      {/* Updated Title: Standardize with other cards */}
      <div className="flex justify-between items-center mb-6 border-b border-surfaceLight/50 pb-3 z-10">
        <h3 className="text-white text-lg font-bold flex items-center gap-2">
          <Icon name="verified_user" className="text-blue-400" />
          全能導航摘要
        </h3>
        <span className={`px-2 py-0.5 rounded border ${qStyle.bg} ${qStyle.border} ${qStyle.color} text-[10px] font-black tracking-widest`}>
          {qStyle.text}
        </span>
      </div>
      
      {/* Gauge Section */}
      <div className="flex flex-col items-center justify-center py-4 z-10">
        <div className="relative size-32 flex items-center justify-center mb-2">
          <svg className="absolute inset-0 size-full -rotate-90">
            <circle cx="64" cy="64" r="54" className="stroke-surfaceLight fill-none" strokeWidth="8" />
            <circle
              cx="64"
              cy="64"
              r="54"
              className={`fill-none drop-shadow-[0_0_10px_rgba(59,130,246,0.3)] transition-all duration-1000 ease-out`}
              stroke={status.hex}
              strokeWidth="8"
              strokeDasharray={2 * Math.PI * 54}
              strokeDashoffset={(2 * Math.PI * 54) - (score / 100) * (2 * Math.PI * 54)}
              strokeLinecap="round"
            />
          </svg>
          <div className="text-center">
            <span className="text-4xl font-black text-white">{score}</span>
            <span className={`block text-[10px] font-bold tracking-[0.2em] text-${status.color}-400`}>{status.label}</span>
          </div>
        </div>
        
        <div className="w-full space-y-2 mt-4 px-2">
          <div className="flex justify-between items-end text-[9px]">
            <span className="text-textMuted font-bold uppercase tracking-wider">同業均值對比</span>
            <span className="font-black text-white">{peerAvg}</span>
          </div>
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden shadow-inner flex">
            <div className="h-full bg-slate-500 rounded-full transition-all duration-1000" style={{ width: `${peerAvg}%` }}></div>
          </div>
        </div>
      </div>

      {/* Integrated Pros & Cons & Personality Section - ALL CARD STYLES */}
      <div className="mt-6 flex flex-col gap-6 z-10 flex-1 overflow-y-auto pr-1 custom-scrollbar">
          
          {/* 1. Investment Personality Card (Moved from MoatCard) */}
          {vStyle && (
            <div className={`rounded-xl ${vStyle.bg} p-5 border ${vStyle.border} hover:brightness-110 transition-all shadow-sm flex flex-col relative overflow-hidden group/per h-fit`}>
              <div className="absolute top-0 right-0 p-3 opacity-5 group-hover/per:opacity-10 transition-opacity">
                <Icon name={vStyle.icon} className={`text-5xl ${vStyle.color}`} />
              </div>
              <h4 className={`${vStyle.color} font-black mb-4 tracking-wide flex items-center gap-2 z-10 text-base`}>
                <Icon name={vStyle.icon} /> 客觀性格判定
              </h4>
              <div className="z-10 space-y-2">
                <div className="flex items-baseline gap-2">
                   <span className="text-lg font-black text-white">{vStyle.text}</span>
                   <span className="text-[10px] text-textMuted font-bold uppercase tracking-widest">{vStyle.desc}</span>
                </div>
                <div className={`text-[11px] font-medium text-white/80 p-2 rounded bg-black/10 border border-white/5 flex items-center gap-2`}>
                   <Icon name="tips_and_updates" className={`text-xs ${vStyle.color}`} />
                   {vStyle.advice}
                </div>
              </div>
            </div>
          )}

          {/* 2. Moat Pros Card Box (Expandable) */}
          {prosCons && prosCons.pros.length > 0 && (
            <div className="rounded-xl bg-[#10b981]/5 p-4 border border-emerald-500/10 hover:border-emerald-500/30 transition-all shadow-sm flex flex-col relative group/item cursor-default z-20 hover:z-50">
              <div className="absolute top-0 right-0 p-2 opacity-5 group-hover/item:opacity-10 transition-opacity">
                <Icon name="check_circle" className="text-4xl text-emerald-500" />
              </div>
              <div className="flex justify-between items-center z-10 mb-2">
                <h4 className="text-emerald-400 font-black tracking-wide flex items-center gap-2 text-sm">
                  <Icon name="check_circle" className="text-base" /> 護城河優勢
                </h4>
                {prosCons.pros.length > 1 && (
                   <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 rounded-full group-hover/item:opacity-0 transition-opacity">+{prosCons.pros.length - 1} 詳情</span>
                )}
              </div>
              
              <div className="w-full relative">
                <ul className="flex flex-col gap-2 relative z-10">
                  <li className="flex items-start gap-2 bg-emerald-500/5 p-2 rounded border border-emerald-500/10">
                    <Icon name="arrow_right" className="text-emerald-400 mt-0.5 text-xs shrink-0" />
                    <span className="text-xs font-medium text-emerald-50 leading-relaxed font-sans">{prosCons.pros[0]}</span>
                  </li>
                </ul>
                  
                {prosCons.pros.length > 1 && (
                  <div className="absolute left-0 right-0 top-full pt-1 opacity-0 invisible group-hover/item:opacity-100 group-hover/item:visible transition-all duration-300 z-50">
                    <div className="bg-surface/95 backdrop-blur-xl p-2 rounded-xl border border-emerald-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col gap-2">
                       {prosCons.pros.slice(1).map((pro, i) => (
                         <li key={i} className="flex items-start gap-2 bg-emerald-500/10 p-2 rounded border border-emerald-500/20 list-none">
                           <Icon name="arrow_right" className="text-emerald-400 mt-0.5 text-xs shrink-0" />
                           <span className="text-xs font-medium text-emerald-50 leading-relaxed font-sans">{pro}</span>
                         </li>
                       ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Risks Card Box (Expandable) */}
          {prosCons && prosCons.cons.length > 0 && (
            <div className="rounded-xl bg-[#e11d48]/5 p-4 border border-rose-500/10 hover:border-rose-500/30 transition-all shadow-sm flex flex-col relative group/risk cursor-default z-10 hover:z-50">
              <div className="absolute top-0 right-0 p-2 opacity-5 group-hover/risk:opacity-10 transition-opacity">
                <Icon name="warning" className="text-4xl text-rose-500" />
              </div>
              <div className="flex justify-between items-center z-10 mb-2">
                <h4 className="text-rose-400 font-black tracking-wide flex items-center gap-2 text-sm">
                  <Icon name="warning" className="text-base" /> 投資風險
                </h4>
                {prosCons.cons.length > 1 && (
                   <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-1.5 rounded-full group-hover/risk:opacity-0 transition-opacity">+{prosCons.cons.length - 1} 詳情</span>
                )}
              </div>
              
              <div className="w-full relative">
                <ul className="flex flex-col gap-2 relative z-10">
                  <li className="flex items-start gap-2 bg-rose-500/5 p-2 rounded border border-rose-500/10">
                    <Icon name="arrow_right" className="text-rose-400 mt-0.5 text-xs shrink-0" />
                    <span className="text-xs font-medium text-rose-50 leading-relaxed font-sans">{prosCons.cons[0]}</span>
                  </li>
                </ul>
                  
                {prosCons.cons.length > 1 && (
                  <div className="absolute left-0 right-0 top-full pt-1 opacity-0 invisible group-hover/risk:opacity-100 group-hover/risk:visible transition-all duration-300 z-50">
                    <div className="bg-surface/95 backdrop-blur-xl p-2 rounded-xl border border-rose-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col gap-2">
                       {prosCons.cons.slice(1).map((con, i) => (
                         <li key={i} className="flex items-start gap-2 bg-rose-500/10 p-2 rounded border border-rose-500/20 list-none">
                           <Icon name="arrow_right" className="text-rose-400 mt-0.5 text-xs shrink-0" />
                           <span className="text-xs font-medium text-rose-50 leading-relaxed font-sans">{con}</span>
                         </li>
                       ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. Footer: Integrated Next Event Countdown (TITLE REMOVED AS REQUESTED) */}
          {nextEvent && (
            <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-5 flex items-center justify-between group hover:bg-amber-500/10 transition-all hover:border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.05)] shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 group-hover:scale-110 transition-transform">
                  <Icon name="event_note" className="text-xl" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black text-white leading-tight mb-1">{nextEvent.name}</span>
                  <span className="text-[10px] font-bold text-amber-500/70">{nextEvent.date}</span>
                </div>
              </div>
              <div className="text-right flex flex-col items-center">
                <span className="text-3xl font-black text-amber-400 tabular-nums">{nextEvent.daysLeft}</span>
                <span className="text-[10px] font-black text-textMuted uppercase tracking-widest -mt-1">DAYS LEFT</span>
              </div>
            </div>
          )}
      </div>

    </div>
  );
};


