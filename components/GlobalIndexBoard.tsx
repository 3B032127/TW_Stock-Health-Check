import React, { useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceDot,
} from 'recharts';
import { Icon } from '../App';
import {
  useGlobalIndexList, useGlobalIndexDetail, GlobalIndexSummary, MarketCode, MarketStatus,
} from '../hooks/useGlobalIndices';

const UP = '#ef4444';   // 台股習慣：紅漲
const DOWN = '#22c55e'; // 綠跌

const MARKET_FILTERS: { id: 'ALL' | MarketCode; label: string }[] = [
  { id: 'ALL', label: '全部概覽' },
  { id: 'TW', label: '台股' },
  { id: 'US', label: '美股' },
  { id: 'JP', label: '日股' },
];
const MARKET_LABEL: Record<MarketCode, string> = { TW: '台灣', US: '美國', JP: '日本' };
const MARKET_CURRENCY: Record<MarketCode, { mini: string; badge: string }> = {
  TW: { mini: '台幣 TWD', badge: '台幣 (TWD)' },
  US: { mini: '美元 USD', badge: '美元 (USD)' },
  JP: { mini: '日幣 JPY', badge: '日幣 (JPY)' },
};
const PERIODS = [
  { label: '1日', value: '1d' }, { label: '1週', value: '1w' },
  { label: '1月', value: '1m' }, { label: '1年', value: '1y' },
];

const fmt = (n: number, d = 2) =>
  n.toLocaleString('zh-TW', { minimumFractionDigits: d, maximumFractionDigits: d });

const StatusLight: React.FC<{ status: MarketStatus; withText?: boolean }> = ({ status, withText }) => {
  const cfg = {
    open: { color: 'bg-green-400', text: '交易中', cls: 'text-green-400' },
    lunch: { color: 'bg-amber-400', text: '午休中', cls: 'text-amber-400' },
    closed: { color: 'bg-slate-500', text: '已收盤', cls: 'text-slate-400' },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${cfg.cls}`}>
      <span className="relative flex size-2">
        {status !== 'closed' && (
          <span className={`absolute inline-flex h-full w-full rounded-full ${cfg.color} opacity-60 animate-ping`} />
        )}
        <span className={`relative inline-flex size-2 rounded-full ${cfg.color}`} />
      </span>
      {withText && cfg.text}
    </span>
  );
};

const MiniSpark: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  if (data.length < 2) return <div className="w-16 h-8" />;
  const min = Math.min(...data), max = Math.max(...data), span = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 64},${30 - ((v - min) / span) * 28 - 1}`).join(' ');
  return (
    <svg width="64" height="32" viewBox="0 0 64 32" className="shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

/** Pulsing end-point dot rendered by recharts ReferenceDot */
const PulseDot = (props: any) => {
  const { cx, cy, color, slow } = props;
  if (cx == null || cy == null) return null;
  const dur = slow ? '3s' : '1.4s';
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill={color} opacity={0.5}>
        <animate attributeName="r" values="5;16;5" dur={dur} repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.55;0;0.55" dur={dur} repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r={5} fill={color} opacity={0.25}>
        <animate attributeName="r" values="5;11;5" dur={dur} begin="0.35s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0;0.4" dur={dur} begin="0.35s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r={4.5} fill={color} stroke="#fff" strokeWidth={1.5}>
        <animate attributeName="opacity" values="1;0.55;1" dur={dur} repeatCount="indefinite" />
      </circle>
    </g>
  );
};

const GlobalIndexBoard: React.FC<{ onUpdated?: (ts: number) => void }> = ({ onUpdated }) => {
  const [filter, setFilter] = useState<'ALL' | MarketCode>('ALL');
  const [selectedId, setSelectedId] = useState('taiex');
  const [period, setPeriod] = useState('1d');

  const { indices, dataUpdatedAt: listUpdated } = useGlobalIndexList();
  const visible = useMemo(
    () => indices.filter((i) => filter === 'ALL' || i.market === filter),
    [indices, filter]
  );
  const selected: GlobalIndexSummary | undefined =
    indices.find((i) => i.id === selectedId) ?? indices[0];

  const { detail, isLoading: detailLoading, dataUpdatedAt: detailUpdated } = useGlobalIndexDetail(
    selectedId, period, selected?.status !== 'closed'
  );

  useEffect(() => { onUpdated?.(Math.max(listUpdated || 0, detailUpdated || 0)); }, [listUpdated, detailUpdated, onUpdated]);

  const changeFilter = (f: 'ALL' | MarketCode) => {
    setFilter(f);
    const first = indices.find((i) => f === 'ALL' || i.market === f);
    if (first && !(selected && (f === 'ALL' || selected.market === f))) setSelectedId(first.id);
  };

  const sameIdx = detail && detail.id === selectedId && detail.period === period;
  const status: MarketStatus = (sameIdx ? detail!.status : selected?.status) ?? 'closed';
  const price = selected?.price ?? 0;
  const change = selected?.change ?? 0;
  const pct = selected?.changePercent ?? 0;
  const isUp = change >= 0;
  const color = isUp ? UP : DOWN;
  const cur = sameIdx ? detail!.current : null;

  const is1d = period === '1d';
  const showPulse = sameIdx && is1d && status !== 'closed' && detail!.history.length > 0;
  const lastPt = sameIdx && detail!.history.length ? detail!.history[detail!.history.length - 1] : null;

  const chartData = sameIdx ? detail!.history : [];
  const ticks = sameIdx && is1d ? detail!.session.ticks : undefined;

  const tickFormatter = (v: any) => {
    if (is1d) return ticks?.find((t) => t.x === v)?.label ?? '';
    const s = String(v);
    if (period === '1w') return s.slice(5, 10).replace('-', '/');
    if (period === '1m') return s.slice(5).replace('-', '/');
    return s.slice(0, 7).replace('-', '/');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Filter + mini cards */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Icon name="public" className="text-primary" />
          <h2 className="text-lg font-bold text-white mr-2">全球指數看盤艙</h2>
          {MARKET_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => changeFilter(f.id)}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${filter === f.id ? 'bg-primary text-white shadow-sm' : 'bg-surfaceLight text-textMuted hover:bg-slate-600 hover:text-white'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          {visible.map((i) => {
            const up = i.change >= 0;
            const c = up ? UP : DOWN;
            const active = i.id === selectedId;
            return (
              <button
                key={i.id}
                onClick={() => setSelectedId(i.id)}
                className={`text-left rounded-xl p-3 border transition-all bg-surface hover:-translate-y-0.5 ${active ? 'border-primary ring-2 ring-primary/60 shadow-lg shadow-primary/10' : 'border-surfaceLight hover:border-slate-500'}`}
              >
                <div className="flex items-center justify-between mb-1 gap-1">
                  <span className="text-[10px] font-bold text-textMuted tracking-wider truncate">
                    {MARKET_LABEL[i.market]}
                    <span className="text-slate-500 mx-1">·</span>
                    <span className="text-slate-400 font-medium">
                      {i.currencyMini ?? MARKET_CURRENCY[i.market].mini}
                    </span>
                  </span>
                  <StatusLight status={i.status} />
                </div>
                <p className="text-xs font-bold text-white truncate">{i.short}</p>
                <div className="flex items-end justify-between gap-1 mt-1">
                  <div className="min-w-0">
                    <p className="text-sm font-black font-mono-data text-white truncate">{fmt(i.price)}</p>
                    <p className="text-xs font-bold font-mono-data" style={{ color: c }}>
                      {up ? '+' : ''}{i.changePercent.toFixed(2)}%
                    </p>
                  </div>
                  <MiniSpark
                    data={
                      i.id === selectedId && sameIdx && is1d && detail!.history.length > 0
                        ? detail!.history.map((p) => p.close)
                        : i.sparkline
                    }
                    color={c}
                  />
                </div>
              </button>
            );
          })}
          {visible.length === 0 && (
            <div className="col-span-full text-sm text-textMuted py-6 text-center">指數資料載入中...</div>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="rounded-xl bg-surface border border-surfaceLight shadow-sm overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          <div className="flex flex-col p-6 lg:p-8 lg:w-1/3 border-b lg:border-b-0 lg:border-r border-surfaceLight gap-5 justify-center min-h-[360px]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-black tracking-tight text-white">{selected?.name ?? '--'}</h1>
              </div>
              <p className="text-textMuted text-sm font-medium min-h-[2.5rem]">{selected?.subtitle}</p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <StatusLight status={status} withText />
                {selected && (
                  <>
                    <span className="text-slate-600 text-xs">|</span>
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] font-medium text-slate-300">
                      計價貨幣：{selected.currencyBadge ?? MARKET_CURRENCY[selected.market].badge}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div>
              <span className="text-4xl lg:text-5xl font-bold tracking-tight font-mono-data" style={{ color }}>
                {selected ? fmt(price) : '--'}
              </span>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {selected && (
                  <span
                    className="flex items-center px-2 py-1 rounded text-sm font-bold border"
                    style={{ color, borderColor: `${color}33`, backgroundColor: `${color}1a` }}
                  >
                    <Icon name={isUp ? 'arrow_upward' : 'arrow_downward'} className="text-[16px] mr-1" />
                    {isUp ? '+' : ''}{fmt(change)} ({isUp ? '+' : ''}{pct.toFixed(2)}%)
                  </span>
                )}
                <span className="text-textMuted text-sm">{cur?.date ?? selected?.date ?? ''}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {cur && cur.turnover > 0 ? (
                <div>
                  <p className="text-textMuted text-xs uppercase tracking-wider font-semibold">成交金額</p>
                  <p className="text-lg font-bold text-white">{(cur.turnover / 1e8).toFixed(0)} 億</p>
                </div>
              ) : (
                <div>
                  <p className="text-textMuted text-xs uppercase tracking-wider font-semibold">前日收盤 / 開盤</p>
                  <p className="text-lg font-bold text-white whitespace-nowrap">
                    {cur ? `${fmt(cur.prevClose, 0)} / ${fmt(cur.open, 0)}` : '--'}
                  </p>
                </div>
              )}
              <div>
                <p className="text-textMuted text-xs uppercase tracking-wider font-semibold">當日區間</p>
                <p className="text-lg font-bold text-white whitespace-nowrap">
                  {cur ? `${fmt(cur.low, 0)} - ${fmt(cur.high, 0)}` : '--'}
                </p>
              </div>
            </div>
            {selected?.proxyNote && (
              <p className="text-[11px] text-amber-400/90 leading-relaxed">⚠ {selected.proxyNote}</p>
            )}
          </div>

          <div className="flex-1 p-6 relative flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <p className="text-xs text-textMuted">
                {sameIdx ? `${detail!.timezoneLabel}｜交易時段 ${detail!.sessionLabel}` : '\u00A0'}
                {status === 'lunch' && <span className="ml-2 text-amber-400 font-bold">午休中</span>}
              </p>
              <div className="flex gap-2">
                {PERIODS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPeriod(p.value)}
                    className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${period === p.value ? 'bg-primary text-white shadow-sm' : 'bg-surfaceLight text-textMuted hover:bg-slate-600 hover:text-white'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-full h-[300px] relative">
              {!sameIdx && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-textMuted z-10">
                  {detailLoading || detail ? '圖表載入中...' : '暫無走勢資料'}
                </div>
              )}
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gib-up" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={UP} stopOpacity={0.4} /><stop offset="95%" stopColor={UP} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gib-down" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={DOWN} stopOpacity={0.4} /><stop offset="95%" stopColor={DOWN} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  {is1d ? (
                    <XAxis
                      dataKey="x" type="number" domain={[0, sameIdx ? detail!.session.total : 1]}
                      ticks={ticks?.map((t) => t.x)} tickFormatter={tickFormatter}
                      stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} allowDataOverflow
                    />
                  ) : (
                    <XAxis
                      dataKey="date" tickFormatter={tickFormatter} stroke="#6b7280"
                      tick={{ fill: '#9ca3af', fontSize: 11 }} interval="preserveStartEnd" minTickGap={50}
                    />
                  )}
                  <YAxis domain={['auto', 'auto']} hide />
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload && payload.length ? (
                        <div className="bg-surface border border-surfaceLight rounded-lg px-3 py-2 shadow-lg">
                          <p className="text-textMuted text-xs mb-1">{payload[0].payload.date}</p>
                          <p className="text-white font-bold text-sm">{fmt(Number(payload[0].value))}</p>
                        </div>
                      ) : null
                    }
                  />
                  <Area
                    type="monotone" dataKey="close" stroke={color} strokeWidth={2.5}
                    fillOpacity={1} fill={isUp ? 'url(#gib-up)' : 'url(#gib-down)'}
                    isAnimationActive={false} dot={false}
                  />
                  {showPulse && lastPt && (
                    <ReferenceDot
                      x={lastPt.x} y={lastPt.close} ifOverflow="visible"
                      shape={<PulseDot color={color} slow={status === 'lunch'} />}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalIndexBoard;
