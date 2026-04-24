import React from 'react';
import { Icon } from '../../App';
import { MoatItem, AdvancedHealthData } from '../../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, ComposedChart, Bar, Line, YAxis, Tooltip as RechartsTooltip, Cell } from 'recharts';

interface MoatCardProps {
  items: MoatItem[];
  score: number;
  dividendHistory?: { year: number; amount: number; payoutRatio: number }[];
  advancedData?: AdvancedHealthData;
}

export const MoatCard: React.FC<MoatCardProps> = ({ items, score, dividendHistory, advancedData }) => {
  const radarData = advancedData?.moatRadar || [];
  const keywords = advancedData?.moatKeywords || [];
  const zScore = advancedData?.profitStabilityZScore;
  const beta = advancedData?.beta;

  const getVolatilityLabel = (b: number) => {
    if (b < 0.8) return { 
      text: '防禦型 (低波動)', 
      desc: `較大盤波動率約 ${(b*100).toFixed(0)}%，屬於穩健標的`,
      advice: '適合長線領息與風險規避型佈局',
      color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'shield' 
    };
    if (b > 1.2) return { 
      text: '攻擊型 (高波動)', 
      desc: `較大盤波動率約 ${(b*100).toFixed(0)}%，屬於積極標的`,
      advice: '適合追求價差的波段操作或景氣復甦期',
      color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: 'bolt' 
    };
    return { 
      text: '標竿型 (中波動)', 
      desc: '波動率與大盤趨於一致',
      advice: '適合追隨產業趨勢的標準化配置',
      color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: 'auto_graph' 
    };
  };

  const vStyle = beta !== undefined ? getVolatilityLabel(beta) : null;

  // Enhance dividend history with payout ratio and ensure timeline order
  const chartData = dividendHistory ? [...dividendHistory].reverse().map(d => ({
    name: d.year.toString().slice(-2),
    amount: d.amount,
    payout: Math.min(d.payoutRatio * 100, 150) // Cap visual height for payout
  })) : [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface border border-surfaceLight p-3 rounded-lg shadow-xl flex flex-col gap-1.5 z-50 min-w-[130px]">
          <span className="text-white font-bold text-[11px] mb-1 border-b border-surfaceLight pb-1.5 flex justify-between">
            <span className="text-textMuted">年度</span>
            <span className="text-amber-400">{label}</span>
          </span>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between items-center gap-4 text-[11px]">
              <div className="flex items-center gap-1.5">
                 <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.dataKey === 'amount' ? '#10b981' : '#f59e0b' }}></div>
                 <span className="text-slate-300">
                   {entry.dataKey === 'amount' ? '現金股利' : '配發率'}
                 </span>
              </div>
              <span className="font-bold text-white tracking-wider">
                {entry.dataKey === 'amount' ? `$${entry.value}` : `${entry.value.toFixed(0)}%`}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-xl bg-surface p-6 shadow-sm border border-surfaceLight flex flex-col h-full flex-1 relative overflow-hidden">
      <div className="flex flex-wrap justify-between items-center mb-5 border-b border-surfaceLight/50 pb-3 gap-4">
        <h3 className="text-white text-lg font-bold flex items-center gap-2">
          <Icon name="verified" className="text-amber-400" />
          穩定性與深寬護城河
        </h3>
        
        <div className="flex items-center gap-6">
          {/* Z-Score */}
          {zScore !== undefined && (
            <div className="flex items-center gap-2" title="Z-Score 越高代表獲利波動度越低，趨勢越平滑">
               <span className="text-xs text-textMuted font-bold">穩定度 Z-Score</span>
               <span className={`text-sm font-black px-1.5 py-0.5 rounded ${zScore > 2 ? 'bg-emerald-500/20 text-emerald-400' : zScore > 1 ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>
                 {zScore.toFixed(2)}
               </span>
            </div>
          )}



          {/* Moat Keywords */}
          {keywords.length > 0 && (
            <div className="flex items-center gap-2 hidden sm:flex">
              {keywords.map(kw => (
                 <span key={kw} className="text-[10px] font-bold text-amber-900 bg-gradient-to-r from-amber-400 to-yellow-500 px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.2)]">
                   # {kw}
                 </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="text-xs text-textMuted font-bold hidden md:inline">總護城河分數</span>
            <div className="flex items-center gap-2">
              <div className="w-20 md:w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)]" 
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className="text-xl font-black text-amber-400">{score}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 h-full">
        {/* 1. Radar Chart & Checklist Section (Left Column) */}
        <div className="col-span-1 flex flex-col h-full gap-4">
          <div className="flex-1 min-h-[120px] relative">
             {radarData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                   <PolarGrid stroke="#334155" strokeDasharray="3 3" />
                   <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                   <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                   <Radar name="護城河維度" dataKey="score" stroke="#f59e0b" fill="#fbbf24" fillOpacity={0.3} isAnimationActive={true} animationDuration={1000} />
                 </RadarChart>
               </ResponsiveContainer>
             ) : (
                <div className="flex-1 flex items-center justify-center text-textMuted text-xs bg-surfaceLight/10 rounded-lg border border-surfaceLight/30 h-full">尚未計算雷達圖數據</div>
             )}
          </div>
          
          {/* Checklist moved under Radar */}
          <div className="flex flex-col gap-1.5 mt-auto">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center px-3 py-1.5 rounded-lg bg-surfaceLight/5 border border-surfaceLight/20 hover:bg-surfaceLight/20 transition-colors group">
                <span className="text-[11px] font-bold text-slate-300 tracking-wide flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full transition-transform group-hover:scale-125 ${item.status === 'pass' ? 'bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.8)]' : 'bg-slate-600'}`}></div>
                  {item.label.includes('(') ? item.label.split('(')[0].trim() : item.label}
                </span>
                {item.status === 'pass' ? (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Icon name="check" className="text-[10px]" /> {item.label.includes('(') ? item.label.split('(')[1].split(')')[0] : '達標'}
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-surfaceLight/50 text-textMuted border border-white/5">
                    <Icon name="close" className="text-[10px]" /> 待加強
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 2. Dividend Chart (Right Column) */}
        <div className="col-span-1 flex flex-col h-full border-t md:border-t-0 md:border-l border-surfaceLight/50 pt-4 md:pt-0 md:pl-4">
          <div className="flex justify-between items-end mb-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-textMuted font-bold flex items-center gap-1.5">
                <Icon name="payments" className="text-[14px]" /> 股利與配發率
              </span>
            </div>
            {chartData.length > 0 && chartData[chartData.length-1].amount > 0 && (
              <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                最新 ${chartData[chartData.length-1].amount}
              </span>
            )}
          </div>
          
          {chartData.length > 0 ? (
            <div className="flex-1 w-full min-h-[200px] relative mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                  <YAxis yAxisId="left" orientation="left" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 150]} hide />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                  <Bar yAxisId="left" dataKey="amount" radius={[2, 2, 0, 0]} barSize={14} isAnimationActive={true}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.amount > 0 ? '#10b981' : '#f43f5e'} />
                    ))}
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="payout" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2, fill: '#f59e0b', stroke: '#1e293b', strokeWidth: 1.5 }} isAnimationActive={true} />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="flex justify-between mt-1 px-2 text-[9px] font-mono text-textMuted">
                 {chartData.map(d => <span key={d.name}>{d.name}</span>)}
              </div>
            </div>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs bg-surfaceLight/5 rounded-xl border border-surfaceLight/20 min-h-[200px] gap-2">
               <Icon name="hide_source" className="text-xl opacity-50" />
               尚無股利資料
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
