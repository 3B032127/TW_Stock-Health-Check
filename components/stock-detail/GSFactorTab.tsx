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

type RollingMetricKey = 'zscore_20d' | 'volatility_20d' | 'rsi_14' | 'beta_60d';

const ROLLING_METRICS: { key: RollingMetricKey; label: string; unit: string; color: string; ref?: number }[] = [
  { key: 'zscore_20d', label: '20日價格 Z-Score', unit: 'σ', color: '#38bdf8', ref: 0 },
  { key: 'volatility_20d', label: '20日年化波動率', unit: '%', color: '#f59e0b' },
  { key: 'rsi_14', label: 'GS RSI(14) 強弱', unit: '', color: '#a855f7', ref: 50 },
  { key: 'beta_60d', label: '60日滾動 Beta', unit: '', color: '#10b981', ref: 1 },
];

/**
 * Reusable InfoTooltip component displaying friendly plain-text explanations.
 */
export const InfoTooltip: React.FC<{ text: string }> = ({ text }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex items-center ml-1 group">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => {
          e.stopPropagation();
          setShow((prev) => !prev);
        }}
        className="size-3.5 rounded-full bg-slate-700/80 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center text-[10px] font-bold cursor-help transition-colors"
        aria-label="指標說明"
      >
        ?
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-[#0f172a] border border-slate-700 text-slate-200 text-xs rounded-xl shadow-2xl z-50 pointer-events-none whitespace-normal leading-relaxed text-left">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0f172a]" />
        </div>
      )}
    </div>
  );
};

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
            <div className="flex items-center">
              <span className="text-[11px] text-textMuted font-medium">綜合量化評分</span>
              <InfoTooltip text="綜合評估這檔股票的「上漲衝勁、估值便宜度、公司獲利體質、股價穩定度與法人籌碼」算出的總體健康分數。60 分以上代表整體偏多。" />
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className={`text-3xl font-black font-mono ${
                  data.composite_score >= 60
                    ? 'text-rose-400'
                    : data.composite_score >= 45
                    ? 'text-cyan-400'
                    : 'text-emerald-400'
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

      {/* AI Quantitative Plain-Language Diagnosis Card */}
      {data.ai_diagnosis && (
        <div className="bg-blue-950/25 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3.5 shadow-sm">
          <div className="size-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
            <Icon name="lightbulb" className="text-xl" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">
              AI 量化專家白話文診斷
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-medium">
              {data.ai_diagnosis}
            </p>
          </div>
        </div>
      )}

      {/* Econometric Risk Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
        {[
          {
            label: '20日年化波動率',
            tooltip: '【雲霄飛車指數】衡量股價平常上沖下洗的劇烈程度。一般穩健大型股約在 15%~25%；若超過 50% 代表股性極度活潑（妖股等級），投資時切勿重倉或使用融資槓桿。',
            value: `${rm.annualized_volatility_20d.toFixed(1)}%`,
            sub: `60日: ${rm.annualized_volatility_60d.toFixed(1)}%`,
            tone: rm.annualized_volatility_20d > 40 ? 'text-amber-400' : 'text-white',
          },
          {
            label: '60日夏普比率',
            tooltip: '【投資 CP 值】計算你每承受 1 分的波動風險，能換回多少分的超額報酬。大於 1.0 代表表現良好，大於 2.0 代表處於「高報酬、高效率」的強勢主升段。',
            value: rm.sharpe_ratio_60d.toFixed(2),
            sub: `252日: ${rm.sharpe_ratio_252d.toFixed(2)}`,
            tone: rm.sharpe_ratio_60d >= 1 ? 'text-rose-400' : rm.sharpe_ratio_60d < 0 ? 'text-emerald-400' : 'text-white',
          },
          {
            label: '一年期最大回撤',
            tooltip: '【歷史最慘腰斬紀錄】過去一年內，若不幸買在最高點並抱到最低點，帳面資產最多會縮水幾 %。用來做買進前的心理壓力測試。',
            value: `${rm.max_drawdown_252d.toFixed(1)}%`,
            sub: 'Max Drawdown',
            tone: rm.max_drawdown_252d < -25 ? 'text-emerald-400' : 'text-amber-300',
          },
          {
            label: '60日市場 Beta',
            tooltip: '【大盤連動度】Beta > 1 代表股價波動比大盤更兇（大盤漲 1%，它平均漲超過 1%）；相關性 ρ (0~1) 代表它有多常跟著大盤同漲同跌，數值越低代表越常走自己的獨立行情。',
            value: rm.beta_60d.toFixed(2),
            sub: `相關性 ρ=${rm.correlation_taiex_60d.toFixed(2)}`,
            tone: rm.beta_60d > 1.2 ? 'text-cyan-400' : 'text-white',
          },
          {
            label: 'GS RSI(14) 動能',
            tooltip: '【市場買氣溫度計】數值介於 0~100。超過 70 為「超買區」，代表短線買盤過熱、隨時可能拉回修正，不宜盲目追高；低於 30 為「超賣區」，代表短線跌深可能反彈。',
            value: rm.rsi_14.toFixed(1),
            sub: rm.rsi_14 >= 70 ? '超買區間' : rm.rsi_14 <= 30 ? '超賣區間' : '常態區間',
            tone: rm.rsi_14 >= 70 ? 'text-rose-400' : rm.rsi_14 <= 30 ? 'text-emerald-400' : 'text-white',
          },
          {
            label: '60日股價 Z-Score',
            tooltip: '【股價乖離雷達】衡量目前股價偏離 60 日平均線幾個標準差。大於 +2.0σ 代表短線嚴重超漲、乖離過大；小於 -2.0σ 代表嚴重超跌，可能醞釀均值回歸反彈。',
            value: `${rm.price_zscore_60d >= 0 ? '+' : ''}${rm.price_zscore_60d.toFixed(2)}σ`,
            sub: `年百分位 PR ${rm.price_percentile_252d.toFixed(0)}`,
            tone: rm.price_zscore_60d >= 1.5 ? 'text-rose-400' : rm.price_zscore_60d <= -1.5 ? 'text-emerald-400' : 'text-cyan-400',
          },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-surface border border-surfaceLight rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center">
              <span className="text-xs text-textMuted font-medium">{kpi.label}</span>
              <InfoTooltip text={kpi.tooltip} />
            </div>
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
            <h3 className="text-white font-bold text-base flex items-center gap-1">
              <Icon name="radar" className="text-cyan-400" />
              <span>六大風格因子綜合評分雷達圖</span>
              <InfoTooltip
                text={
                  '六大多因子曝險說明：\n' +
                  '• 動能因子：股價短中期創高衝勁\n' +
                  '• 價值因子：相較同業或歷史估值是否便宜（PE/PB 低、殖利率高）\n' +
                  '• 品質因子：公司賺錢體質與毛利/ROE 穩定度\n' +
                  '• 低波動因子：走勢是否穩健溫吞（抗跌力）\n' +
                  '• 市場 Beta：跟隨大盤起舞程度\n' +
                  '• 法人籌碼：三大法人近期真金白銀大舉買進強度'
                }
              />
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
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.25}
                  strokeWidth={2.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Factor Z-Score Exposure Horizontal Bar */}
        <div className="bg-surface border border-surfaceLight rounded-xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold text-base flex items-center gap-1">
              <Icon name="equalizer" className="text-primary" />
              <span>標準化因子曝險強度 (Z-Score)</span>
              <InfoTooltip text="衡量目前股票在各風格因子相較同業或歷史基準偏離幾個標準差 (+σ 為正向偏多/紅，-σ 為負向偏空/綠，中性/藍)。" />
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
                  {barData.map((entry, index) => {
                    // Taiwan Equity color convention: Positive (+) is Red, Negative (-) is Green, Neutral is Blue
                    const barColor = entry.exposure >= 0.3 ? '#ef4444' : entry.exposure <= -0.3 ? '#10b981' : '#3b82f6';
                    return <Cell key={`cell-${index}`} fill={barColor} />;
                  })}
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
          <span className="text-xs text-textMuted">曝險值為標準常態 Z-Score，紅多綠空，依台股配色慣例呈現</span>
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
                // Taiwan stock convention: Positive = Red/Coral, Negative = Green, Neutral = Blue
                const isBull = f.exposure >= 0.3;
                const isBear = f.exposure <= -0.3;
                return (
                  <tr key={f.id} className="hover:bg-surfaceLight/20 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-white whitespace-nowrap">{f.name}</td>
                    <td
                      className={`py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap ${
                        isBull ? 'text-rose-400' : isBear ? 'text-emerald-400' : 'text-blue-300'
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
                              isBull ? 'bg-rose-500' : isBear ? 'bg-emerald-500' : 'bg-blue-500'
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
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : isBear
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
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
                dataKey={activeRollingCfg.key}
                stroke={activeRollingCfg.color}
                fill="url(#gsRollingGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
