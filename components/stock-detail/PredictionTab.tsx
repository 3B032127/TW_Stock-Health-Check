import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  Legend,
} from 'recharts';
import { Icon } from '../../App';
import { getPredictionCacheKey, useStockPrediction } from '../../hooks/useStockPrediction';
import { removeDailyCache } from '../../utils/tradingHours';
import { InfoTooltip } from './GSFactorTab';

interface FanChartPoint {
  date: string;
  phase: 'backtest' | 'anchor' | 'forecast';
  horizon?: number;
  actual_close?: number;
  predicted_5d_ago?: number;
  hist_p10?: number;
  hist_p90?: number;
  histRange?: [number, number];
  future_p10?: number;
  future_p50?: number;
  future_p90?: number;
  futureRange?: [number, number];
  expected_return_pct?: number;
}

const UP_COLOR = '#EF4444'; // 台股：上漲紅
const DOWN_COLOR = '#10B981'; // 台股：下跌綠

type VerifyMode = 'T1' | 'T5';

const fmtMD = (d?: string) => (d ? d.slice(5) : '');

const fmtPrice = (v?: number | null) =>
  v == null || Number.isNaN(Number(v)) ? '--' : Number(v).toFixed(2);

export const PredictionTab: React.FC<{ stockId: string }> = ({ stockId }) => {
  const { data, isLoading, error, refetch, isFetching } = useStockPrediction(stockId);
  const [verifyMode, setVerifyMode] = useState<VerifyMode>('T1');

  const { chartData, yDomain, anchorDate } = useMemo(() => {
    if (!data) {
      return { chartData: [] as FanChartPoint[], yDomain: [0, 100] as [number, number], anchorDate: '' };
    }

    const rawHist =
      (verifyMode === 'T1' ? data.historical_backtest_t1 : data.historical_backtest) ||
      data.historical_backtest ||
      [];
    // 前端防禦：以日期去重（保留 predict_date 較新者），避免 X 軸出現重複類別導致基準線消失
    const dedup = new Map<string, (typeof rawHist)[number]>();
    for (const h of rawHist) {
      const prev = dedup.get(h.date);
      if (!prev || (h.predict_date || '') > (prev.predict_date || '')) dedup.set(h.date, h);
    }
    const hist = Array.from(dedup.values()).sort((a, b) => a.date.localeCompare(b.date));
    const fut = data.future_forecast || [];
    const lastHist = hist.length > 0 ? hist[hist.length - 1] : null;
    const anchor = data.last_updated || lastHist?.date || '';
    const anchorClose =
      data.base_close ??
      lastHist?.actual_close ??
      (fut.length > 0 ? fut[0].pred_p50 / (1 + (fut[0].expected_return_pct || 0) / 100) : 0);

    const points: FanChartPoint[] = [];
    const seenDates = new Set<string>();
    let anchorAttached = false;

    for (let i = 0; i < hist.length; i++) {
      const h = hist[i];
      if (!h.date || seenDates.has(h.date)) continue;
      seenDates.add(h.date);
      const isAnchor = h.date === anchor;
      const pt: FanChartPoint = {
        date: h.date,
        phase: 'backtest',
        actual_close: h.actual_close,
        predicted_5d_ago: h.predicted_close_5d_ago,
        hist_p10: h.pred_p10_5d_ago,
        hist_p90: h.pred_p90_5d_ago,
        histRange: [h.pred_p10_5d_ago, h.pred_p90_5d_ago],
      };
      if (isAnchor && fut.length > 0) {
        pt.future_p10 = anchorClose;
        pt.future_p50 = anchorClose;
        pt.future_p90 = anchorClose;
        pt.futureRange = [anchorClose, anchorClose];
        anchorAttached = true;
      } else if (isAnchor) {
        anchorAttached = true;
      }
      points.push(pt);
    }

    if (!anchorAttached && anchor && anchorClose > 0 && !seenDates.has(anchor)) {
      seenDates.add(anchor);
      const anchorPt: FanChartPoint = {
        date: anchor,
        phase: 'anchor',
        actual_close: anchorClose,
      };
      if (fut.length > 0) {
        anchorPt.future_p10 = anchorClose;
        anchorPt.future_p50 = anchorClose;
        anchorPt.future_p90 = anchorClose;
        anchorPt.futureRange = [anchorClose, anchorClose];
      }
      points.push(anchorPt);
      anchorAttached = true;
    }

    for (const f of fut) {
      if (!f.target_date || seenDates.has(f.target_date)) continue;
      seenDates.add(f.target_date);
      points.push({
        date: f.target_date,
        phase: 'forecast',
        horizon: f.horizon,
        future_p10: f.pred_p10,
        future_p50: f.pred_p50,
        future_p90: f.pred_p90,
        futureRange: [f.pred_p10, f.pred_p90],
        expected_return_pct: f.expected_return_pct,
      });
    }

    const effectiveAnchorDate =
      anchor && seenDates.has(anchor) ? anchor : lastHist?.date || '';

    const nums: number[] = [];
    for (const p of points) {
      for (const val of [
        p.actual_close,
        p.predicted_5d_ago,
        p.hist_p10,
        p.hist_p90,
        p.future_p10,
        p.future_p50,
        p.future_p90,
      ]) {
        if (typeof val === 'number' && Number.isFinite(val)) {
          nums.push(val);
        }
      }
    }

    if (nums.length === 0) {
      return { chartData: points, yDomain: [0, 100] as [number, number], anchorDate: effectiveAnchorDate };
    }
    const minVal = Math.min(...nums);
    const maxVal = Math.max(...nums);
    const pad = Math.max((maxVal - minVal) * 0.08, maxVal * 0.015);
    return {
      chartData: points,
      yDomain: [Number((minVal - pad).toFixed(2)), Number((maxVal + pad).toFixed(2))] as [number, number],
      anchorDate: effectiveAnchorDate,
    };
  }, [data, verifyMode]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-surface/40 rounded-2xl border border-surfaceLight gap-4">
        <div className="size-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-textMuted text-sm font-medium">
          正在從資料庫讀取 Kronos + TimesFM 2.5 雙模型融合預測與近 30 日回測紀錄...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-surface/40 rounded-2xl border border-surfaceLight gap-4 text-center">
        <Icon name="psychology" className="text-4xl text-amber-400" />
        <h3 className="text-lg font-bold text-white">尚無此標的之 AI 雙模型預測資料</h3>
        <p className="text-textMuted text-sm max-w-md">
          {error?.message || '請確認該個股已具備至少 60 個交易日歷史股價，或執行離線預測腳本。'}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 rounded-lg bg-primary hover:bg-primaryHover text-white text-sm font-bold transition-colors flex items-center gap-2"
        >
          <Icon name="refresh" className="text-sm" />
          重新載入預測資料
        </button>
      </div>
    );
  }

  const kpis = verifyMode === 'T1' ? data.kpis_t1 ?? data.kpis : data.kpis;
  const verifyLabel = verifyMode === 'T1' ? '明日' : '5日';
  const wKronosPct = Math.round((kpis.model_weights?.kronos ?? 0.6) * 100);
  const wTimesfmPct = Math.max(0, 100 - wKronosPct);
  const t5 = data.future_forecast?.[data.future_forecast.length - 1];
  const t5Return = t5?.expected_return_pct ?? 0;
  const isBullish = t5Return >= 0;
  const t1 = data.future_forecast?.[0];
  const t1Return = t1?.expected_return_pct ?? 0;
  const t1Bullish = t1Return >= 0;
  const refClose = data.base_close ?? 0;
  const trendUp = t5 ? (refClose > 0 ? t5.pred_p50 >= refClose : t5Return >= 0) : true;
  const trendColor = trendUp ? UP_COLOR : DOWN_COLOR;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header Banner: Dual-Model Ensemble Metadata & Weight Distribution */}
      <div className="bg-surface border border-surfaceLight rounded-xl p-5 flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="size-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center shrink-0">
              <Icon name="auto_graph" className="text-sky-400 text-2xl" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  雙模型融合股價預測 (Kronos × TimesFM 2.5 Ensemble)
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  XTAI 台股日曆對齊
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  ±10% 漲跌停截斷
                </span>
              </div>
              <p className="text-xs text-textMuted mt-1">
                主力：<span className="text-slate-200 font-mono">NeoQuasar/Kronos-base</span> (512日 OHLCV 蒙地卡羅×20) ＋
                輔助：<span className="text-slate-200 font-mono">google/timesfm-2.5-200m-pytorch</span> (512日 Close 分位數頭)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-center">
            <div className="text-right font-mono">
              <span className="text-[11px] text-textMuted block font-sans">預測基準交易日 (T₀)</span>
              <span className="text-sm font-bold text-white">{data.last_updated}</span>
            </div>
            <button
              onClick={() => {
                removeDailyCache(getPredictionCacheKey(stockId));
                removeDailyCache(`stock_prediction:${stockId}`);
                refetch();
              }}
              disabled={isFetching}
              className="px-3 py-1.5 rounded-lg bg-surfaceLight/80 hover:bg-slate-600 text-xs font-bold text-white border border-surfaceLight transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Icon name="refresh" className={`text-sm ${isFetching ? 'animate-spin' : ''}`} />
              <span>刷新快取</span>
            </button>
          </div>
        </div>

        {/* Dynamic Inverse-MAPE Weight Bar */}
        <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="font-bold text-white">動態反比誤差融合權重：</span>
            <span className="font-mono text-sky-400 font-bold">Kronos {wKronosPct}%</span>
            <span className="text-slate-500">vs</span>
            <span className="font-mono text-indigo-400 font-bold">TimesFM {wTimesfmPct}%</span>
            <InfoTooltip
              text={
                '動態反比誤差融合 (Dynamic Inverse-MAPE Ensemble)：\n\n' +
                '系統每日追蹤個股過去 30 次有效回測中 Kronos 與 TimesFM 各自的 MAPE 誤差率。\n' +
                '表現越準確的模型會自動獲得越高的投票權重；若為新上市冷啟動標的，則採用預設 60% / 40% 權重。'
              }
            />
          </div>
          <div className="w-full sm:w-72 h-2.5 bg-slate-800 rounded-full overflow-hidden flex border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-500"
              style={{ width: `${wKronosPct}%` }}
            />
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-400 transition-all duration-500"
              style={{ width: `${wTimesfmPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface border border-surfaceLight rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center">
            <span className="text-xs text-textMuted font-medium">{verifyLabel}方向勝率 (Directional Accuracy)</span>
            <InfoTooltip
              text={
                (verifyMode === 'T1'
                  ? '過去 30 次 T+1 預測中，模型成功預測「隔天上漲或下跌方向」與實際走勢一致的比例。\n'
                  : '過去 30 次 T+5 預測中，模型成功預測「5天後上漲或下跌方向」與實際走勢一致的比例。\n') +
                '超過 55% 即具備顯著方向統計優勢。'
              }
            />
          </div>
          <div className="flex items-baseline gap-2 my-1.5">
            <span
              className={`text-3xl font-black font-mono ${
                kpis.directional_accuracy >= 60
                  ? 'text-[#EF4444]'
                  : kpis.directional_accuracy >= 50
                  ? 'text-amber-400'
                  : 'text-slate-300'
              }`}
            >
              {kpis.directional_accuracy.toFixed(1)}%
            </span>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            有效回測樣本：{kpis.sample_count} 次 (近30日滾動)
          </div>
        </div>

        <div className="bg-surface border border-surfaceLight rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center">
            <span className="text-xs text-textMuted font-medium">{verifyLabel} MAPE 平均誤差</span>
            <InfoTooltip
              text={
                'Mean Absolute Percentage Error：\n' +
                (verifyMode === 'T1'
                  ? '衡量 T+1 基準預測價 (P50) 與隔日實際收盤價的平均偏差幅度。\n'
                  : '衡量 T+5 基準預測價 (P50) 與 5 個交易日後實際收盤價的平均偏差幅度。\n') +
                '數值越小代表點位預測越精準（台股權值股通常在 1.5% ~ 3.5%）。'
              }
            />
          </div>
          <div className="flex items-baseline gap-2 my-1.5">
            <span
              className={`text-3xl font-black font-mono ${
                kpis.mape <= 2.5 ? 'text-cyan-400' : kpis.mape <= 4.0 ? 'text-sky-400' : 'text-amber-400'
              }`}
            >
              {kpis.mape.toFixed(2)}%
            </span>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            嚴格採用預測當日截斷數據，零未來函數偏差
          </div>
        </div>

        <div className="bg-surface border border-surfaceLight rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center">
            <span className="text-xs text-textMuted font-medium">80% 信賴區間命中率 (Coverage)</span>
            <InfoTooltip
              text={
                '實際收盤價嚴格落在模型給出的 [P10 悲觀支撐 ~ P90 樂觀阻力] 帶狀區間內的比例。\n' +
                '理論目標為 80%，代表模型能準確估計市場波動幅度。'
              }
            />
          </div>
          <div className="flex items-baseline gap-2 my-1.5">
            <span className="text-3xl font-black font-mono text-indigo-400">
              {kpis.interval_coverage.toFixed(1)}%
            </span>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            P10 ~ P90 雙模型概率區間校正水準
          </div>
        </div>

        <div className="bg-surface border border-surfaceLight rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center">
            <span className="text-xs text-textMuted font-medium">多空訊號：明日 (T+1) 與 5日 (T+5)</span>
            <InfoTooltip
              text={
                '依雙模型融合中位數 (P50) 相對於基準日收盤價的預期漲跌幅判斷多空。\n' +
                '遵循台股慣例：紅色＝看漲、綠色＝看跌。僅供量化研究參考，非投資建議。'
              }
            />
          </div>
          {[
            { key: 't1', tag: '明日', row: t1, ret: t1Return, bull: t1Bullish },
            { key: 't5', tag: '5日', row: t5, ret: t5Return, bull: isBullish },
          ].map((it) => (
            <div key={it.key} className="flex items-center justify-between gap-2">
              <span
                className="px-2.5 py-1 rounded-md text-white text-sm font-black font-mono whitespace-nowrap"
                style={{ backgroundColor: it.bull ? UP_COLOR : DOWN_COLOR }}
              >
                {it.row
                  ? `${it.tag}${it.bull ? '看漲 ▲ +' : '看跌 ▼ '}${it.ret.toFixed(2)}%`
                  : '--'}
              </span>
              <span className="text-right font-mono leading-tight">
                <span className="block text-sm font-bold text-white">
                  {it.row ? `NT$${fmtPrice(it.row.pred_p50)}` : '--'}
                </span>
                <span className="block text-[10px] text-slate-400">
                  {it.row ? `${fmtMD(it.row.target_date)} ${fmtPrice(it.row.pred_p10)}~${fmtPrice(it.row.pred_p90)}` : ''}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Unified Fan Chart: Historical 30D Backtest + Future 5D Confidence Cone */}
      <div className="bg-surface border border-surfaceLight rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-white font-bold text-base flex items-center gap-2">
              <Icon name="timeline" className="text-sky-400" />
              近 30 日滾動回測驗證與未來 5 日概率錐
            </h3>
            <p className="text-xs text-textMuted mt-0.5">
              基準線左側為過去 30 日「當時{verifyMode === 'T1' ? '前一天' : ' 5 天前'}預測 vs 實際走勢」，右側為 T+1 至 T+5 之 [P10, P50, P90] 預測軌跡
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-[11px] text-textMuted">驗證模式</span>
            <div className="flex p-0.5 bg-surfaceLight rounded-lg">
              {[
                { id: 'T1' as VerifyMode, label: '明日預測 (T-1)' },
                { id: 'T5' as VerifyMode, label: '5日波段預測 (T-5)' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setVerifyMode(m.id)}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    verifyMode === m.id ? 'bg-primary text-white shadow-sm' : 'text-textMuted hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {data.base_close && (
              <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200">
                T₀ 收盤：NT$ {fmtPrice(data.base_close)}
              </span>
            )}
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 30, right: 24, left: 4, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis
                dataKey="date"
                allowDuplicatedCategory={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(d: string) => d.slice(5)}
                minTickGap={22}
              />
              <YAxis
                domain={yDomain}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(v: number) => v.toFixed(0)}
                width={58}
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const pt = payload[0].payload as FanChartPoint;
                  return (
                    <div className="bg-[#0f172a] border border-slate-700 rounded-xl px-3.5 py-2.5 shadow-2xl text-xs space-y-1.5 min-w-[210px]">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                        <span className="font-mono font-bold text-white">{pt.date}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {pt.phase === 'forecast'
                            ? `未來 T+${pt.horizon}`
                            : pt.phase === 'anchor'
                            ? 'T₀ 基準日'
                            : '歷史回測驗證'}
                        </span>
                      </div>
                      {pt.actual_close != null && (
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">實際收盤價</span>
                          <span className="font-mono font-bold text-white">NT$ {fmtPrice(pt.actual_close)}</span>
                        </div>
                      )}
                      {pt.predicted_5d_ago != null && (
                        <>
                          <div className="flex justify-between gap-4">
                            <span className="text-amber-400">{verifyMode === 'T1' ? '前1日預測' : '5日前預測'} (P50)</span>
                            <span className="font-mono font-bold text-amber-300">
                              NT$ {fmtPrice(pt.predicted_5d_ago)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4 text-[11px]">
                            <span className="text-slate-400">5日前 80% 區間</span>
                            <span className="font-mono text-slate-300">
                              {fmtPrice(pt.hist_p10)} ~ {fmtPrice(pt.hist_p90)}
                            </span>
                          </div>
                        </>
                      )}
                      {pt.phase === 'forecast' && pt.future_p50 != null && (
                        <>
                          <div className="flex justify-between gap-4">
                            <span style={{ color: trendColor }}>基準預測 (P50)</span>
                            <span className="font-mono font-bold" style={{ color: trendColor }}>
                              NT$ {fmtPrice(pt.future_p50)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-rose-400">樂觀阻力 (P90)</span>
                            <span className="font-mono font-bold text-rose-300">
                              NT$ {fmtPrice(pt.future_p90)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-emerald-400">悲觀支撐 (P10)</span>
                            <span className="font-mono font-bold text-emerald-300">
                              NT$ {fmtPrice(pt.future_p10)}
                            </span>
                          </div>
                          {pt.expected_return_pct != null && (
                            <div className="flex justify-between gap-4 pt-1 border-t border-slate-800">
                              <span className="text-slate-400">預期漲跌幅</span>
                              <span
                                className={`font-mono font-bold ${
                                  pt.expected_return_pct >= 0 ? 'text-[#EF4444]' : 'text-[#10B981]'
                                }`}
                              >
                                {pt.expected_return_pct >= 0 ? '+' : ''}
                                {pt.expected_return_pct.toFixed(2)}%
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />

              <Area
                type="monotone"
                dataKey="histRange"
                name="歷史80%區間 [P10~P90]"
                fill="#f59e0b"
                fillOpacity={0.12}
                stroke="none"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="futureRange"
                name={`未來80%信賴區間 (${trendUp ? '看漲' : '看跌'})`}
                fill={trendColor}
                fillOpacity={0.22}
                stroke="none"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="actual_close"
                name="實際收盤價"
                stroke="#f8fafc"
                strokeWidth={2.5}
                dot={{ r: 2, fill: '#f8fafc' }}
                isAnimationActive={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="predicted_5d_ago"
                name={verifyMode === 'T1' ? '前1日融合預測 (P50)' : '5日前融合預測 (P50)'}
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                isAnimationActive={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="future_p90"
                name="P90 上界"
                stroke={trendColor}
                strokeOpacity={0.65}
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
                isAnimationActive={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="future_p50"
                name={`未來基準預測 P50 (${trendUp ? '看漲' : '看跌'})`}
                stroke={trendColor}
                strokeWidth={3}
                dot={{ r: 3.5, fill: trendColor, stroke: '#0f172a', strokeWidth: 1.5 }}
                isAnimationActive={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="future_p10"
                name="P10 下界"
                stroke={trendColor}
                strokeOpacity={0.65}
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
                isAnimationActive={false}
                connectNulls={false}
              />
              {anchorDate && (
                <ReferenceLine
                  x={anchorDate}
                  stroke="#F59E0B"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  ifOverflow="extendDomain"
                  label={(props: any) => {
                    const vb = props?.viewBox || {};
                    const text = `今日收盤基準 (${fmtMD(anchorDate)})`;
                    const w = text.length * 12 + 16;
                    const x = (vb.x ?? 0) - w / 2;
                    return (
                      <g>
                        <rect x={x} y={(vb.y ?? 0) - 4} width={w} height={22} rx={11} fill="#F59E0B" />
                        <text
                          x={x + w / 2}
                          y={(vb.y ?? 0) + 11}
                          textAnchor="middle"
                          fill="#0f172a"
                          fontSize={11}
                          fontWeight={700}
                        >
                          {text}
                        </text>
                      </g>
                    );
                  }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Detail Grids: Future 5 Days + Recent 30D Backtest Verification */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Future 5D Table */}
        <div className="bg-surface border border-surfaceLight rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-surfaceLight flex items-center justify-between">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <Icon name="event_upcoming" className="text-sky-400 text-lg" />
              未來 5 個台股交易日逐日預測明細 (T+1 ~ T+5)
            </h3>
            <span className="text-[11px] font-mono text-textMuted">XTAI 開盤日</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white/2 text-textMuted uppercase tracking-wider font-bold border-b border-white/5">
                  <th className="py-3 px-4">步長</th>
                  <th className="py-3 px-3">目標交易日</th>
                  <th className="py-3 px-3 text-right">悲觀 P10</th>
                  <th className="py-3 px-3 text-right">基準 P50</th>
                  <th className="py-3 px-3 text-right">樂觀 P90</th>
                  <th className="py-3 px-4 text-right">預期報酬</th>
                </tr>
              </thead>
              <tbody className="font-mono divide-y divide-white/5">
                {data.future_forecast.map((f) => {
                  const up = f.expected_return_pct >= 0;
                  return (
                    <tr key={f.horizon} className="hover:bg-white/3 transition-colors">
                      <td className="py-3 px-4 font-bold text-sky-400">T+{f.horizon}</td>
                      <td className="py-3 px-3 text-slate-200">{f.target_date}</td>
                      <td className="py-3 px-3 text-right text-emerald-400">{fmtPrice(f.pred_p10)}</td>
                      <td className="py-3 px-3 text-right font-bold text-white">{fmtPrice(f.pred_p50)}</td>
                      <td className="py-3 px-3 text-right text-rose-400">{fmtPrice(f.pred_p90)}</td>
                      <td className={`py-3 px-4 text-right font-bold ${up ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                        {up ? '+' : ''}
                        {f.expected_return_pct.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Historical 30D Backtest Verification Table */}
        <div className="bg-surface border border-surfaceLight rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-surfaceLight flex items-center justify-between">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <Icon name="fact_check" className="text-amber-400 text-lg" />
              近 30 日 T+5 歷史回測驗證明細
            </h3>
            <span className="text-[11px] font-mono text-textMuted">最近 {data.historical_backtest.length} 筆</span>
          </div>
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-surface z-10">
                <tr className="bg-white/2 text-textMuted uppercase tracking-wider font-bold border-b border-white/5">
                  <th className="py-3 px-4">目標日</th>
                  <th className="py-3 px-3 text-right">實際收盤</th>
                  <th className="py-3 px-3 text-right">5日前預測</th>
                  <th className="py-3 px-3 text-right">誤差率</th>
                  <th className="py-3 px-4 text-right">區間檢核</th>
                </tr>
              </thead>
              <tbody className="font-mono divide-y divide-white/5">
                {[...data.historical_backtest].reverse().map((h) => {
                  const errPct =
                    h.actual_close > 0
                      ? (Math.abs(h.actual_close - h.predicted_close_5d_ago) / h.actual_close) * 100
                      : 0;
                  const inBand =
                    h.actual_close >= h.pred_p10_5d_ago && h.actual_close <= h.pred_p90_5d_ago;
                  return (
                    <tr key={h.date} className="hover:bg-white/3 transition-colors">
                      <td className="py-2.5 px-4 text-slate-200">{h.date}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-white">
                        {fmtPrice(h.actual_close)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-300">
                        {fmtPrice(h.predicted_close_5d_ago)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300">{errPct.toFixed(2)}%</td>
                      <td className="py-2.5 px-4 text-right font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            inBand
                              ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                              : 'bg-slate-700/60 text-slate-400 border-slate-600'
                          }`}
                        >
                          {inBand ? '命中區間' : '區間外'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
