import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Icon } from '../../App';
import { useGSBacktest } from '../../hooks/useGSBacktest';
import { useCompanyProfile } from '../../hooks/useCompanyProfile';
import { AIAnalysisCard } from '../AIAnalysisCard';

const STRATEGIES = [
  { id: 'multi_factor', label: 'GS 多因子權重' },
  { id: 'ma_cross', label: '雙均線交叉 (MA5/20)' },
  { id: 'rsi_mean_reversion', label: 'RSI 布林均值回歸' },
  { id: 'macd_momentum', label: 'MACD 動能突破' },
];

const PERIOD_OPTIONS = [
  { id: '6M', label: '近半年', days: 183 },
  { id: '1Y', label: '近一年', days: 365 },
  { id: '2Y', label: '近兩年', days: 730 },
  { id: '3Y', label: '近三年', days: 1095 },
];

export const GSBacktestTab: React.FC<{ stockId: string }> = ({ stockId }) => {
  const [strategy, setStrategy] = useState<string>('multi_factor');
  const [periodId, setPeriodId] = useState<string>('1Y');
  const { data: profile } = useCompanyProfile(stockId);

  const startDate = useMemo(() => {
    const opt = PERIOD_OPTIONS.find((p) => p.id === periodId) || PERIOD_OPTIONS[1];
    const dt = new Date();
    dt.setDate(dt.getDate() - opt.days);
    return dt.toISOString().split('T')[0];
  }, [periodId]);

  const { data, isLoading, error, refetch, isFetching } = useGSBacktest(stockId, strategy, startDate);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-surface/40 rounded-2xl border border-surfaceLight gap-4">
        <div className="size-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-textMuted text-sm font-medium">gs-quant 回測引擎正在模擬歷史逐日部位與交易成本...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-surface/40 rounded-2xl border border-surfaceLight gap-4 text-center">
        <Icon name="query_stats" className="text-4xl text-amber-400" />
        <h3 className="text-lg font-bold text-white">尚無法執行 gs-quant 策略回測</h3>
        <p className="text-textMuted text-sm max-w-md">
          {error?.message || '請先同步個股歷史行情資料後再試。'}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 rounded-lg bg-primary hover:bg-primaryHover text-white text-sm font-bold transition-colors flex items-center gap-2"
        >
          <Icon name="refresh" className="text-sm" />
          重新執行回測
        </button>
      </div>
    );
  }

  const m = data.metrics;
  const isExcessPositive = m.excess_return >= 0;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Control Bar: Strategy Selector + Lookback Period */}
      <div className="bg-surface border border-surfaceLight rounded-xl p-5 flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Icon name="candlestick_chart" className="text-indigo-400 text-xl" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-white">{data.strategy_name}</h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  gs-quant v{data.gs_quant_version}
                </span>
              </div>
              <p className="text-xs text-textMuted mt-0.5">{data.strategy_description}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodId(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                  periodId === p.id
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surfaceLight/50 text-textMuted hover:text-white border-surfaceLight'
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-3 py-1.5 rounded-lg bg-surfaceLight hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 border border-white/10"
            >
              <Icon name="refresh" className={`text-sm ${isFetching ? 'animate-spin' : ''}`} />
              重算
            </button>
          </div>
        </div>

        {/* Strategy Pill Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-surfaceLight/50">
          <div className="flex flex-wrap gap-2">
            {STRATEGIES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStrategy(s.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all border ${
                  strategy === s.id
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-500/20'
                    : 'bg-background/60 text-textMuted hover:text-white border-surfaceLight'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="text-xs text-textMuted font-mono">
            區間：{data.start_date} ~ {data.end_date}（{data.trading_days} 交易日 ｜ 初始本金 NT$1,000,000 ｜ 含手續費 0.1425% + 證交稅 0.3%）
          </div>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface border border-surfaceLight rounded-xl p-5 flex flex-col justify-between">
          <span className="text-xs text-textMuted font-medium">策略累積報酬率 (含交易成本)</span>
          <div className="flex items-baseline gap-2 my-1">
            <span className={`text-3xl font-black font-mono ${m.cumulative_return >= 0 ? 'text-up' : 'text-down'}`}>
              {m.cumulative_return >= 0 ? '+' : ''}
              {m.cumulative_return.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>買入持有: {m.benchmark_return >= 0 ? '+' : ''}{m.benchmark_return.toFixed(2)}%</span>
            <span className={isExcessPositive ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
              Alpha {m.excess_return >= 0 ? '+' : ''}{m.excess_return.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="bg-surface border border-surfaceLight rounded-xl p-5 flex flex-col justify-between">
          <span className="text-xs text-textMuted font-medium">風險調整後報酬 (Sharpe / Sortino)</span>
          <div className="flex items-baseline gap-3 my-1">
            <span className={`text-3xl font-black font-mono ${m.sharpe_ratio >= 1 ? 'text-emerald-400' : m.sharpe_ratio >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
              {m.sharpe_ratio.toFixed(2)}
            </span>
            <span className="text-xs text-textMuted font-mono">Sortino: {m.sortino_ratio.toFixed(2)}</span>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            年化報酬 {m.annualized_return >= 0 ? '+' : ''}{m.annualized_return.toFixed(2)}% ｜ Calmar {m.calmar_ratio.toFixed(2)}
          </div>
        </div>

        <div className="bg-surface border border-surfaceLight rounded-xl p-5 flex flex-col justify-between">
          <span className="text-xs text-textMuted font-medium">最大淨值回撤 (Max Drawdown)</span>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-3xl font-black font-mono text-rose-400">{m.max_drawdown.toFixed(2)}%</span>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            策略年化波動率 {m.annualized_volatility.toFixed(2)}% ｜ 期末資產 NT${m.final_equity.toLocaleString()}
          </div>
        </div>

        <div className="bg-surface border border-surfaceLight rounded-xl p-5 flex flex-col justify-between">
          <span className="text-xs text-textMuted font-medium">交易勝率與獲利因子</span>
          <div className="flex items-baseline gap-3 my-1">
            <span className="text-3xl font-black font-mono text-white">{m.win_rate.toFixed(1)}%</span>
            <span className="text-xs text-cyan-400 font-mono font-bold">PF {m.profit_factor.toFixed(2)}</span>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            總訊號調倉次數：{m.total_trades} 筆
          </div>
        </div>
      </div>

      {/* Equity Curve Comparison Chart */}
      <div className="bg-surface border border-surfaceLight rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <h3 className="text-white font-bold text-base flex items-center gap-2">
            <Icon name="show_chart" className="text-primary" />
            累積報酬曲線比較：量化策略 vs. 買入持有 (Buy & Hold)
          </h3>
          <span className="text-xs text-textMuted">嚴格採用 T-1 日收盤訊號於 T 日執行調倉，排除未來函數偏差</span>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.equity_curve} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(d: string) => d.slice(2, 10)}
                minTickGap={35}
              />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} width={50} />
              <ReferenceLine y={0} stroke="#64748b" strokeDasharray="4 4" />
              <RechartsTooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', color: '#fff' }}
                formatter={(value: any, name: any) => [`${Number(value).toFixed(2)}%`, name]}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Line
                type="monotone"
                dataKey="strategy_return_pct"
                name={`${data.strategy_name} (%)`}
                stroke="#22d3ee"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="benchmark_return_pct"
                name="買入並持有 Buy & Hold (%)"
                stroke="#94a3b8"
                strokeWidth={1.8}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Underwater Drawdown Chart */}
      <div className="bg-surface border border-surfaceLight rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold text-base flex items-center gap-2">
            <Icon name="trending_down" className="text-rose-400" />
            策略水下回撤曲線 (Underwater Drawdown %)
          </h3>
          <span className="text-xs font-mono text-rose-400">最大回撤：{m.max_drawdown.toFixed(2)}%</span>
        </div>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.equity_curve} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gsDrawdownGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.05} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.45} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(d: string) => d.slice(2, 10)}
                minTickGap={35}
              />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} width={50} />
              <ReferenceLine y={0} stroke="#64748b" />
              <RechartsTooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', color: '#fff' }}
                formatter={(value: any) => [`${Number(value).toFixed(2)}%`, '當日回撤']}
              />
              <Area type="monotone" dataKey="drawdown_pct" stroke="#f43f5e" strokeWidth={1.8} fill="url(#gsDrawdownGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Historical Trade Signals Table */}
      <div className="bg-surface border border-surfaceLight rounded-xl overflow-hidden">
        <div className="p-5 border-b border-surfaceLight flex justify-between items-center">
          <h3 className="text-white font-bold text-base flex items-center gap-2">
            <Icon name="receipt_long" className="text-emerald-400" />
            歷史調倉交易明細（最近 {data.trade_log.length} 筆）
          </h3>
          <span className="text-xs text-textMuted">依交易日期由新到舊排序</span>
        </div>
        {data.trade_log.length === 0 ? (
          <div className="p-8 text-center text-textMuted text-sm">選定期間內未觸發進出場切換訊號。</div>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface z-10">
                <tr className="border-b border-surfaceLight bg-surfaceLight/40 text-xs text-textMuted uppercase">
                  <th className="py-3 px-5 font-bold">執行日期</th>
                  <th className="py-3 px-4 font-bold text-center">動作</th>
                  <th className="py-3 px-4 font-bold text-right">成交參考價</th>
                  <th className="py-3 px-4 font-bold text-right">目標持股比</th>
                  <th className="py-3 px-4 font-bold text-right">單筆平倉報酬</th>
                  <th className="py-3 px-5 font-bold">gs-quant 觸發依據</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surfaceLight/50 text-sm">
                {data.trade_log.map((t, idx) => {
                  const isBuySide = t.action === 'BUY' || t.action === 'ADD';
                  return (
                    <tr key={`${t.date}-${idx}`} className="hover:bg-surfaceLight/20 transition-colors">
                      <td className="py-3 px-5 font-mono text-slate-200 whitespace-nowrap">{t.date}</td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                            isBuySide
                              ? 'bg-up/15 text-up border-up/30'
                              : 'bg-down/15 text-down border-down/30'
                          }`}
                        >
                          {t.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-white">{t.price.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-cyan-300">{t.weight.toFixed(0)}%</td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-bold ${
                          t.trade_return_pct === null
                            ? 'text-slate-500'
                            : t.trade_return_pct >= 0
                            ? 'text-up'
                            : 'text-down'
                        }`}
                      >
                        {t.trade_return_pct === null
                          ? '—'
                          : `${t.trade_return_pct >= 0 ? '+' : ''}${t.trade_return_pct.toFixed(2)}%`}
                      </td>
                      <td className="py-3 px-5 text-xs text-slate-300">{t.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Backtest Automated Diagnosis */}
      <AIAnalysisCard
        type="health"
        title="gs-quant 策略回測績效總結"
        defaultExpanded={true}
        onAnalyze={async () => {
          return (
            `### ${data.strategy_name} 回測績效歸因報告\n` +
            `針對 **${profile?.name || ''} (${stockId})** 於 **${data.start_date} ~ ${data.end_date}**（共 ${data.trading_days} 個交易日）執行模擬回測（已計入手續費 0.1425% 與賣出證交稅 0.3%）：\n\n` +
            `* **收益對比**：策略累積報酬為 **${m.cumulative_return >= 0 ? '+' : ''}${m.cumulative_return.toFixed(2)}%**，同期買入持有報酬為 **${m.benchmark_return >= 0 ? '+' : ''}${m.benchmark_return.toFixed(2)}%**，相對超額報酬（Alpha）為 **${m.excess_return >= 0 ? '+' : ''}${m.excess_return.toFixed(2)}%**。\n` +
            `* **風控品質**：策略最大淨值回撤為 **${m.max_drawdown.toFixed(2)}%**，年化夏普比率 **${m.sharpe_ratio.toFixed(2)}**，索提諾比率 **${m.sortino_ratio.toFixed(2)}**。\n` +
            `* **交易紀律**：共執行 **${m.total_trades}** 次調倉訊號，平均勝率 **${m.win_rate.toFixed(1)}%**、獲利因子 **${m.profit_factor.toFixed(2)}**。${m.excess_return > 0 ? '此量化模型在該期間成功創造正超額報酬並有效控制回撤。' : '在強單邊行情下，擇時進出可能產生追蹤誤差，可切換比較 RSI 均值回歸或雙均線交叉策略尋求最佳參數配置。'}`
          );
        }}
      />
    </div>
  );
};
