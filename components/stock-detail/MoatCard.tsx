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

  return (
    <div className="rounded-xl bg-surface p-5 shadow-sm border border-surfaceLight flex flex-col h-full relative overflow-hidden">
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

      <div className="flex flex-col xl:flex-row gap-6 flex-1">
        {/* Left: Radar + Checklist */}
        <div className="flex-1 flex flex-col gap-4 justify-between">
          
          {/* Radar Chart Section */}
          <div className="flex items-center gap-2 h-[140px]">
             {radarData.length > 0 ? (
               <div className="w-full h-full relative">
                 <ResponsiveContainer width="100%" height="100%">
                   <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                     <PolarGrid stroke="#334155" strokeDasharray="3 3" />
                     <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                     <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                     <Radar name="護城河維度" dataKey="score" stroke="#f59e0b" fill="#fbbf24" fillOpacity={0.3} isAnimationActive={true} animationDuration={1000} />
                   </RadarChart>
                 </ResponsiveContainer>
               </div>
             ) : (
                <div className="flex-1 flex items-center justify-center text-textMuted text-xs bg-surfaceLight/10 rounded-lg border border-surfaceLight/30 h-full">尚未計算雷達圖數據</div>
             )}
          </div>

          {/* Checklist */}
          <div className="flex flex-col gap-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center px-4 py-2 rounded-lg bg-surfaceLight/5 border border-surfaceLight/20 hover:bg-surfaceLight/20 transition-colors group">
                <span className="text-xs font-bold text-slate-300 tracking-wide flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full transition-transform group-hover:scale-125 ${item.status === 'pass' ? 'bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.8)]' : 'bg-slate-600'}`}></div>
                  {item.label.includes('(') ? item.label.split('(')[0].trim() : item.label}
                </span>
                {item.status === 'pass' ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Icon name="check" className="text-[10px]" /> {item.label.includes('(') ? item.label.split('(')[1].split(')')[0] : '達標'}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black bg-surfaceLight/50 text-textMuted border border-white/5">
                    <Icon name="close" className="text-[10px]" /> 待加強
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Dual Axis Dividend Chart */}
        <div className="flex-1 flex flex-col pt-2 xl:pt-0 xl:border-l border-t xl:border-t-0 border-surfaceLight/50 xl:pl-6">
          <div className="flex justify-between items-end mb-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-textMuted font-bold flex items-center gap-1.5">
                <Icon name="payments" className="text-[14px]" /> 歷史股利與配發率趨勢
              </span>
              <span className="text-[10px] text-slate-400 italic">長線護城河驗證指標</span>
            </div>
            {chartData.length > 0 && chartData[chartData.length-1].amount > 0 && (
              <span className="text-xs font-black bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20">
                最新現金股利 ${chartData[chartData.length-1].amount}
              </span>
            )}
          </div>
          
          {chartData.length > 0 ? (
            <div className="flex-1 w-full min-h-[160px] relative mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <YAxis yAxisId="left" orientation="left" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 150]} hide />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    itemStyle={{ fontSize: 12, fontWeight: 'bold' }}
                    labelStyle={{ color: '#94a3b8', fontSize: 10, marginBottom: 4 }}
                    formatter={(value: number, name: string) => {
                      if (name === 'payout') return [`${value.toFixed(1)}%`, '盈餘配發率'];
                      return [`$${value.toFixed(2)}`, '配息金額'];
                    }}
                  />
                  <Bar yAxisId="left" dataKey="amount" radius={[4, 4, 0, 0]} barSize={20} isAnimationActive={true}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.amount > 0 ? '#10b981' : '#f43f5e'} />
                    ))}
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="payout" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: '#f59e0b', stroke: '#1e293b', strokeWidth: 2 }} isAnimationActive={true} />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="flex justify-between mt-1 px-4 text-[9px] font-mono text-textMuted">
                 {chartData.map(d => <span key={d.name}>{d.name}</span>)}
              </div>
            </div>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs bg-surfaceLight/5 rounded-xl border border-surfaceLight/20 h-full min-h-[160px] gap-2">
               <Icon name="hide_source" className="text-2xl opacity-50" />
               尚無股利資料或不配息
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
