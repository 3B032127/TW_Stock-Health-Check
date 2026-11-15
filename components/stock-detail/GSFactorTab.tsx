import React, { useState } from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  AreaChart,
  Area,
} from 'recharts';
import { Icon } from '../../App';
import { useGSFactor } from '../../hooks/useGSFactor';
import { useCompanyProfile } from '../../hooks/useCompanyProfile';
import { AIAnalysisCard } from '../AIAnalysisCard';

type RollingMetricKey = 'zscore_20d' | 'volatility_20d' | 'rsi_14' | 'beta_60d';

const ROLLING_METRICS: { key: RollingMetricKey; label: string; unit: string; color: string; ref?: number }[] = [
  { key: 'zscore_20d', label: '20日價格 Z-Score', unit: 'σ', color: '#38bdf8', ref: 0 },
  { key: 'volatility_20d', label: '20日年化波動率', unit: '%', color: '#f59e0b' },
  { key: 'rsi_14', label: 'GS RSI(14) 強弱', unit: '', color: '#a855f7', ref: 50 },
  { key: 'beta_60d', label: '60日滾動 Beta', unit: '', color: '#10b981', ref: 1 },
];

export const GSFactorTab: React.FC<{ stockId: string }> = ({ stockId }) => {
  const { data, isLoading, error, refetch, isFetching } = useGSFactor(stockId);
  const { data: profile } = useCompanyProfile(stockId);
  const [selectedMetric, setSelectedMetric] = useState<RollingMetricKey>('zscore_20d');

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-surface/40 rounded-2xl border border-surfaceLight gap-4">
        <div className="size-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-textMuted text-sm font-medium">Goldman Sachs gs-quant 引擎正在計算多因子曝險與風險矩陣...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-surface/40 rounded-2xl border border-surfaceLight gap-4 text-center">
        <Icon name="analytics" className="text-4xl text-amber-400" />
        <h3 className="text-lg font-bold text-white">尚無法載入 gs-quant 因子分析</h3>
        <p className="text-textMuted text-sm max-w-md">
          {error?.message || '請先確認該檔股票已同步近一年日線股價歷史資料。'}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 rounded-lg bg-primary hover:bg-primaryHover text-white text-sm font-bold transition-colors flex items-center gap-2"
        >
          <Icon name="refresh" className="text-sm" />
          重新計算
        </button>
      </div>
    );
  }

  const activeRollingCfg = ROLLING_METRICS.find((m) => m.key === selectedMetric) || ROLLING_METRICS[0];
  const radarData = data.factors_detail.map((f) => ({
    subject: f.name.split(' ')[0],
    score: f.score,
    exposure: f.exposure,
    percentile: f.percentile,
  }));

  const barData = data.factors_detail.map((f) => ({
    name: f.name.split(' ')[0],
    fullName: f.name,
    exposure: f.exposure,
    signal: f.signal,
  }));

  const rm = data.risk_metrics;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header Engine Status Banner */}
      <div className="bg-surface border border-surfaceLight rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="size-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Icon name="hub" className="text-blue-400 text-2xl" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-white">Goldman Sachs gs-quant 多因子量化風險分析</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-blue-500/15 text-blue-300 border border-blue-500/30">
                gs-quant v{data.gs_quant_version}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {data.marquee_connected ? 'Marquee API 連線' : '本地時序量化引擎'}
              </span>
            </div>
            <p className="text-xs text-textMuted">
              基準日：<span className="text-slate-200 font-mono">{data.date}</span> ｜ 基準市場：
              <span className="text-slate-200">{data.benchmark}</span> ｜ 象限歸類：
              <span className="text-cyan-400 font-bold">{data.quant_quadrant}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 self-end lg:self-auto">
          <div className="flex flex-col items-end">
            <span className="text-[11px] text-textMuted font-medium">綜合量化評分</span>
            <div className="flex items-baseline gap-1">
              <span
                className={`text-3xl font-black font-mono ${
                  data.composite_score >= 70
                    ? 'text-emerald-400'
                    : data.composite_score >= 50
                    ? 'text-cyan-400'
                    : 'text-amber-400'
                }`}
              >
                {data.composite_score}
              </span>
              <span className="text-xs text-textMuted">/ 100</span>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-3.5 py-2 rounded-lg bg-surfaceLight hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors border border-white/10"
          >
            <Icon name="refresh" className={`text-sm ${isFetching ? 'animate-spin' : ''}`} />
            重算因子
          </button>
        </div>
      </div>

      {/* Econometric Risk Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
        {[
          {
            label: '20日年化波動率',
            value: `${rm.annualized_volatility_20d.toFixed(1)}%`,
            sub: `60日: ${rm.annualized_volatility_60d.toFixed(1)}%`,
            tone: rm.annualized_volatility_20d > 40 ? 'text-amber-400' : 'text-white',
          },
          {
            label: '60日夏普比率',
            value: rm.sharpe_ratio_60d.toFixed(2),
            sub: `252日: ${rm.sharpe_ratio_252d.toFixed(2)}`,
            tone: rm.sharpe_ratio_60d >= 1 ? 'text-emerald-400' : rm.sharpe_ratio_60d < 0 ? 'text-rose-400' : 'text-white',
          },
          {
            label: '一年期最大回撤',
            value: `${rm.max_drawdown_252d.toFixed(1)}%`,
            sub: 'Max Drawdown',
            tone: rm.max_drawdown_252d < -25 ? 'text-rose-400' : 'text-amber-300',
          },
          {
            label: '60日市場 Beta',
            value: rm.beta_60d.toFixed(2),
            sub: `相關性 ρ=${rm.correlation_taiex_60d.toFixed(2)}`,
            tone: rm.beta_60d > 1.2 ? 'text-cyan-400' : 'text-white',
          },
          {
            label: 'GS RSI(14) 動能',
            value: rm.rsi_14.toFixed(1),
            sub: rm.rsi_14 >= 70 ? '超買區間' : rm.rsi_14 <= 30 ? '超賣區間' : '常態區間',
            tone: rm.rsi_14 >= 70 ? 'text-up' : rm.rsi_14 <= 30 ? 'text-down' : 'text-white',
          },
          {
            label: '60日股價 Z-Score',
            value: `${rm.price_zscore_60d >= 0 ? '+' : ''}${rm.price_zscore_60d.toFixed(2)}σ`,
            sub: `年百分位 PR ${rm.price_percentile_252d.toFixed(0)}`,
            tone: Math.abs(rm.price_zscore_60d) > 1.5 ? 'text-amber-400' : 'text-cyan-400',
          },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-surface border border-surfaceLight rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs text-textMuted font-medium">{kpi.label}</span>
            <span className={`text-2xl font-black font-mono my-1 ${kpi.tone}`}>{kpi.value}</span>
            <span className="text-[11px] text-slate-400 font-mono">{kpi.sub}</span>
          </div>
        ))}
      </div>

      {/* Factor Visualizations: Radar + Z-Score Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: 6-Factor Radar Chart */}
        <div className="bg-surface border border-surfaceLight rounded-xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold text-base flex items-center gap-2">
              <Icon name="radar" className="text-cyan-400" />
              六大風格因子綜合評分雷達圖
            </h3>
            <span className="text-xs text-textMuted">分數區間 0 ~ 100</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="52%" outerRadius="78%" data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 700 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', color: '#fff' }}
                  formatter={(value: any, _name: any, props: any) => [
                    `${value} 分 (Z=${props.payload.exposure >= 0 ? '+' : ''}${props.payload.exposure}σ / PR ${props.payload.percentile}%)`,
                    props.payload.subject,
                  ]}
                />
                <Radar
                  name="因子得分"
                  dataKey="score"
                  stroke="#22d3ee"
                  fill="#0ea5e9"
                  fillOpacity={0.35}
                  strokeWidth={2.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Factor Z-Score Exposure Horizontal Bar */}
        <div className="bg-surface border border-surfaceLight rounded-xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold text-base flex items-center gap-2">
              <Icon name="equalizer" className="text-primary" />
              標準化因子曝險強度 (Z-Score)
            </h3>
            <span className="text-xs text-textMuted font-mono">[-3.0σ, +3.0σ]</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 25, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" domain={[-3, 3]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={72} tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 600 }} />
                <ReferenceLine x={0} stroke="#64748b" strokeWidth={1.5} />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', color: '#fff' }}
                  formatter={(value: any) => [`${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(3)} σ`, '因子曝險']}
                />
                <Bar dataKey="exposure" barSize={20} radius={[4, 4, 4, 4]}>
                  {barData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.exposure >= 0.5 ? '#10b981' : entry.exposure <= -0.5 ? '#f43f5e' : '#3b82f6'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Factor Detail Table */}
      <div className="bg-surface border border-surfaceLight rounded-xl overflow-hidden">
        <div className="p-5 border-b border-surfaceLight flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-white font-bold text-base flex items-center gap-2">
            <Icon name="table_chart" className="text-blue-400" />
            gs-quant 多因子曝險明細與模型詮釋
          </h3>
          <span className="text-xs text-textMuted">曝險值為標準常態 Z-Score，正值代表該風格偏向強於歷史常模</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surfaceLight bg-surfaceLight/30 text-xs text-textMuted uppercase">
                <th className="py-3.5 px-5 font-bold">因子名稱</th>
                <th className="py-3.5 px-4 font-bold text-right">曝險 Z-Score</th>
                <th className="py-3.5 px-4 font-bold">百分位強度 (PR)</th>
                <th className="py-3.5 px-4 font-bold text-center">訊號判讀</th>
                <th className="py-3.5 px-5 font-bold">量化計算依據</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surfaceLight/50 text-sm">
              {data.factors_detail.map((f) => {
                const isBull = f.exposure >= 0.5;
                const isBear = f.exposure <= -0.5;
                return (
                  <tr key={f.id} className="hover:bg-surfaceLight/20 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-white whitespace-nowrap">{f.name}</td>
                    <td
                      className={`py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap ${
                        isBull ? 'text-emerald-400' : isBear ? 'text-rose-400' : 'text-blue-300'
                      }`}
                    >
                      {f.exposure >= 0 ? '+' : ''}
                      {f.exposure.toFixed(3)} σ
                    </td>
                    <td className="py-3.5 px-4 min-w-[160px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-surfaceLight rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isBull ? 'bg-emerald-500' : isBear ? 'bg-rose-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.max(4, Math.min(100, f.percentile))}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-slate-300 w-10 text-right">{f.percentile.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                          isBull
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : isBear
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                        }`}
                      >
                        {f.signal}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-xs text-slate-300 leading-relaxed">{f.description}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rolling Time Series Interactive Chart */}
      <div className="bg-surface border border-surfaceLight rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-white font-bold text-base flex items-center gap-2">
              <Icon name="timeline" className="text-amber-400" />
              近 60 交易日 gs_quant.timeseries 滾動時間序列
            </h3>
            <p className="text-xs text-textMuted mt-1">追蹤個股於短中期內之均值回歸、已實現波動與 Beta 變化</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {ROLLING_METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setSelectedMetric(m.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                  selectedMetric === m.key
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surfaceLight/50 text-textMuted hover:text-white border-surfaceLight'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.rolling_series} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gsRollingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={activeRollingCfg.color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={activeRollingCfg.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(d: string) => d.slice(5)}
                minTickGap={25}
              />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} width={45} />
              {activeRollingCfg.ref !== undefined && (
                <ReferenceLine y={activeRollingCfg.ref} stroke="#64748b" strokeDasharray="4 4" />
              )}
              <RechartsTooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', color: '#fff' }}
                formatter={(value: any) => [`${Number(value).toFixed(2)}${activeRollingCfg.unit}`, activeRollingCfg.label]}
              />
              <Area
                type="monotone"
                dataKey={selectedMetric}
                stroke={activeRollingCfg.color}
                strokeWidth={2}
                fill="url(#gsRollingGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Automated Quantitative Summary */}
      <AIAnalysisCard
        type="health"
        title="gs-quant 因子曝險量化診斷"
        defaultExpanded={true}
        onAnalyze={async () => {
          const topFactor = [...data.factors_detail].sort((a, b) => b.exposure - a.exposure)[0];
          const weakFactor = [...data.factors_detail].sort((a, b) => a.exposure - b.exposure)[0];
          return (
            `### Goldman Sachs gs-quant 因子風格診斷報告\n` +
            `**${profile?.name || ''} (${stockId})** 截至 **${data.date}** 之量化綜合體質評分為 **${data.composite_score} 分**，模型定位為「**${data.quant_quadrant}**」。\n\n` +
            `* **最強正向因子**：**${topFactor.name}**（曝險 **${topFactor.exposure >= 0 ? '+' : ''}${topFactor.exposure.toFixed(2)}σ**，PR ${topFactor.percentile.toFixed(0)}%），${topFactor.description}。\n` +
            `* **相對弱勢因子**：**${weakFactor.name}**（曝險 **${weakFactor.exposure >= 0 ? '+' : ''}${weakFactor.exposure.toFixed(2)}σ**），顯示該維度相對歷史基準處於保守或高溢價區間。\n` +
            `* **風險與波動特徵**：20 日年化波動率為 **${rm.annualized_volatility_20d.toFixed(1)}%**，近 60 日夏普比率為 **${rm.sharpe_ratio_60d.toFixed(2)}**，過去一年最大回撤幅度為 **${rm.max_drawdown_252d.toFixed(1)}%**，市場 Beta 為 **${rm.beta_60d.toFixed(2)}**。\n` +
            `* **價格統計位階**：目前 60 日 Z-Score 為 **${rm.price_zscore_60d >= 0 ? '+' : ''}${rm.price_zscore_60d.toFixed(2)}σ**（過去一年百分位 PR ${rm.price_percentile_252d.toFixed(0)}），${Math.abs(rm.price_zscore_60d) > 1.8 ? '價格偏離均值較大，須留意短線均值回歸波動。' : '處於統計常態波動帶內，可搭配策略回測頁面驗證進出場勝率。'}`
          );
        }}
      />
    </div>
  );
};
