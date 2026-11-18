import React, { useState } from 'react';
import { Icon } from '../App';
import StockLoading from '../components/StockLoading';
import {
  useIndicators,
  useIndicatorHistory,
  useADRMonitor,
  useGlobalRankings,
  ADRQuote,
  RankingCategory,
  RankingStock,
} from '../hooks/useMarketData';
import GlobalIndexBoard from '../components/GlobalIndexBoard';
import SyncIndicator from '../components/SyncIndicator';

const UP = '#ef4444';
const DOWN = '#22c55e';

const MARKET_BADGE: Record<'TW' | 'US' | 'JP', { flag: string; cls: string }> = {
  TW: { flag: 'TW', cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  US: { flag: 'US', cls: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  JP: { flag: 'JP', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
};

const RANKING_TABS: { id: 'tw' | 'us' | 'jp' | 'semi'; label: string }[] = [
  { id: 'tw', label: '🇹🇼 台股主力' },
  { id: 'us', label: '🇺🇸 美股科技 / 費半' },
  { id: 'jp', label: '🇯🇵 日股核心 (日經 225)' },
  { id: 'semi', label: '🌐 全球半導體鏈' },
];

const INDICATOR_ORDER: Record<string, number> = {
  usdtwd: 1,
  usdjpy: 2,
  jp_rate: 3,
  vix: 4,
  us_nfp: 5,
  us_yield: 6,
  fed_rate: 7,
  us_cpi: 8,
};

/** Pure SVG real-data Sparkline (avoids shared Recharts gradient ID collisions) */
const RealSparkline: React.FC<{ data: number[]; color: string; width?: number; height?: number }> = ({
  data,
  color,
  width = 84,
  height = 36,
}) => {
  if (!data || data.length < 2) {
    return (
      <div
        className="flex items-center justify-end text-[10px] text-slate-600 font-mono"
        style={{ width, height }}
      >
        —
      </div>
    );
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - 3 - ((v - min) / span) * (height - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0 overflow-visible">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

interface IndicatorCardProps {
  id?: string;
  title: string;
  value: string;
  change: string;
  isUp: boolean;
  description?: string;
  note?: string;
  sparkline?: number[];
  onClick?: () => void;
}

const DashboardIndicatorCard: React.FC<IndicatorCardProps> = ({
  id,
  title,
  value,
  change,
  isUp,
  description,
  note,
  sparkline,
  onClick,
}) => {
  // Prefer sparkline bundled in /market/indicators; query history only as backup if empty
  const needBackupHistory = !sparkline || sparkline.length < 2;
  const { history } = useIndicatorHistory(needBackupHistory ? id || '' : '', '1m');

  const chartValues = React.useMemo(() => {
    if (sparkline && sparkline.length >= 2) return sparkline;
    if (history && history.length >= 2) return history.map((p) => p.value);
    return [];
  }, [sparkline, history]);

  return (
    <div
      onClick={onClick}
      className={`card-premium h-full flex flex-col justify-between p-5 rounded-xl transition-all ${
        onClick ? 'cursor-pointer hover:translate-y-[-2px] hover:shadow-premium' : ''
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="text-textMuted text-xs font-bold tracking-wider leading-snug flex-1">{title}</p>
          <RealSparkline data={chartValues} color={isUp ? UP : DOWN} width={80} height={34} />
        </div>

        <div className="flex items-baseline justify-between gap-2 mb-3">
          <p className="text-2xl font-black text-white font-mono-data tracking-tight truncate">{value}</p>
          <div className={`flex items-center text-xs font-bold font-mono-data shrink-0 ${isUp ? 'text-up' : 'text-down'}`}>
            <Icon name={isUp ? 'arrow_upward' : 'arrow_downward'} className="text-[14px] mr-0.5" />
            <span>{change}</span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-white/5 space-y-2">
        <p className="text-[11px] text-slate-300 font-mono truncate" title={description}>
          {description || '—'}
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-primary/85 font-medium">
          <span className="text-xs shrink-0">💡</span>
          <span className="truncate" title={note}>
            {note || '客觀總經參考指標'}
          </span>
        </div>
      </div>
    </div>
  );
};

const ADRCard: React.FC<{ adr: ADRQuote; onNavigate: (id: string) => void }> = ({ adr, onNavigate }) => {
  const usUp = adr.change >= 0;
  const premUp = adr.premiumPercent >= 0;
  return (
    <div
      onClick={() => onNavigate(adr.twId)}
      className="bg-surface border border-surfaceLight hover:border-slate-500 rounded-xl p-4 flex flex-col justify-between gap-3 cursor-pointer transition-all hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-white truncate">{adr.name}</span>
            <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold">
              {adr.id}
            </span>
          </div>
          <p className="text-[11px] text-textMuted mt-0.5 font-mono">
            對應 {adr.twId} {adr.twName} ({adr.ratioLabel})
          </p>
        </div>
        <RealSparkline data={adr.sparkline} color={usUp ? UP : DOWN} width={64} height={28} />
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xl font-black text-white font-mono-data">${adr.adrPrice.toFixed(2)}</span>
        <span className={`text-xs font-bold font-mono-data ${usUp ? 'text-up' : 'text-down'}`}>
          {usUp ? '+' : ''}
          {adr.change.toFixed(2)} ({usUp ? '+' : ''}
          {adr.changePercent.toFixed(2)}%)
        </span>
      </div>

      <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-xs gap-2">
        <div className="min-w-0">
          <span className="text-textMuted text-[10px] block">換算台股價 (現貨 NT${adr.twSpotPrice.toFixed(1)})</span>
          <span className="text-slate-100 font-bold font-mono">NT$ {adr.convertedTwd.toFixed(2)}</span>
        </div>
        <span
          className={`px-2 py-1 rounded-md font-bold font-mono text-xs border shrink-0 ${
            premUp
              ? 'bg-up/15 text-up border-up/30'
              : 'bg-down/15 text-down border-down/30'
          }`}
        >
          {premUp ? '溢價 +' : '折價 '}
          {adr.premiumPercent.toFixed(2)}%
        </span>
      </div>
    </div>
  );
};

interface StockTableProps {
  title: string;
  stocks: RankingStock[];
  type: 'gainer' | 'loser';
  isLoading?: boolean;
  onNavigate: (id: string) => void;
}

const StockTable: React.FC<StockTableProps> = ({ title, stocks, type, isLoading, onNavigate }) => {
  const isGainer = type === 'gainer';
  const colorClass = isGainer ? 'text-up' : 'text-down';
  const icon = isGainer ? 'trending_up' : 'trending_down';
  const sparkColor = isGainer ? UP : DOWN;

  return (
    <div className="card-premium flex flex-col rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center">
        <h3 className="font-bold text-lg flex items-center gap-2 text-white">
          <Icon name={icon} className={colorClass} />
          {title}
        </h3>
        <span className="text-[11px] text-textMuted font-mono uppercase tracking-wider">Top 5</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/2 text-[10px] text-textMuted uppercase tracking-widest font-bold">
              <th className="py-3.5 px-6">個股</th>
              <th className="py-3.5 px-4 text-right">成交價</th>
              <th className="py-3.5 px-4 text-right">漲跌幅</th>
              <th className="py-3.5 px-6 text-right w-28">走勢</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {stocks.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-10 text-center text-textMuted text-xs">
                  {isLoading ? '正在載入跨國排行榜報價...' : '暫無符合條件的排行資料'}
                </td>
              </tr>
            ) : (
              stocks.map((stock) => {
                const badge = MARKET_BADGE[stock.market];
                const clickable = stock.market === 'TW';
                const pctUp = stock.changePercent >= 0;
                return (
                  <tr
                    key={`${stock.market}-${stock.id}`}
                    onClick={() => clickable && onNavigate(stock.id)}
                    className={`border-b border-white/5 transition-colors last:border-0 group ${
                      clickable ? 'hover:bg-white/5 cursor-pointer' : 'hover:bg-white/3'
                    }`}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${badge.cls}`}
                        >
                          {badge.flag}
                        </span>
                        <p className={`font-bold text-white ${clickable ? 'group-hover:text-primary' : ''} transition-colors`}>
                          {stock.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-textMuted font-mono-data">{stock.symbol}</span>
                        <span className="px-1.5 py-0.2 rounded bg-surfaceLight/80 text-slate-300 text-[10px]">
                          {stock.industry}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-black font-mono-data whitespace-nowrap">
                      <span
                        className={`
                          ${stock.isLimitUp ? 'bg-up/20 border border-up/40 px-2 py-0.5 rounded text-up' : ''}
                          ${stock.isLimitDown ? 'bg-down/20 border border-down/40 px-2 py-0.5 rounded text-down' : ''}
                          ${!stock.isLimitUp && !stock.isLimitDown ? 'text-white' : ''}
                        `}
                      >
                        <span className="text-textMuted text-[11px] font-normal mr-1">{stock.currencySymbol}</span>
                        {stock.price.toLocaleString('zh-TW', {
                          minimumFractionDigits: stock.market === 'JP' ? 0 : 2,
                          maximumFractionDigits: stock.market === 'JP' ? 0 : 2,
                        })}
                      </span>
                    </td>
                    <td className={`py-4 px-4 text-right font-black font-mono-data whitespace-nowrap ${pctUp ? 'text-up' : 'text-down'}`}>
                      {pctUp ? '+' : ''}
                      {stock.changePercent.toFixed(2)}%
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end">
                        <RealSparkline data={stock.sparkline} color={sparkColor} width={84} height={32} />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Dashboard = ({
  onNavigateToStock,
  onNavigateToIndicator,
}: {
  onNavigateToStock: (id: string) => void;
  onNavigateToIndicator?: (id: string) => void;
}) => {
  const [boardUpdated, setBoardUpdated] = useState(0);
  const [rankingGroup, setRankingGroup] = useState<'tw' | 'us' | 'jp' | 'semi'>('tw');
  const [twScope, setTwScope] = useState<'tw_core' | 'tw_all'>('tw_core');

  const activeRankingCategory: RankingCategory = rankingGroup === 'tw' ? twScope : rankingGroup;

  const {
    indicators,
    isLoading: indicatorsLoading,
    isFetching: indicatorsFetching,
    dataUpdatedAt: indicatorsUpdatedAt,
  } = useIndicators();

  const {
    adrData,
    isFetching: adrFetching,
    dataUpdatedAt: adrUpdatedAt,
  } = useADRMonitor();

  const {
    gainers: topGainers,
    losers: topLosers,
    isLoading: rankingsLoading,
    isFetching: rankingsFetching,
    dataUpdatedAt: rankingsUpdatedAt,
  } = useGlobalRankings(activeRankingCategory, 5);

  const isLoading = indicatorsLoading;
  const isFetching = indicatorsFetching || adrFetching || rankingsFetching;

  const lastUpdated = Math.max(
    boardUpdated || 0,
    indicatorsUpdatedAt || 0,
    adrUpdatedAt || 0,
    rankingsUpdatedAt || 0
  );

  const isInitialLoading = !indicators.length && indicatorsLoading;
  if (isInitialLoading) {
    return <StockLoading />;
  }

  const orderedIndicators = indicators
    .filter((ind) => ind.id && INDICATOR_ORDER[ind.id] !== undefined)
    .sort((a, b) => (INDICATOR_ORDER[a.id || ''] || 999) - (INDICATOR_ORDER[b.id || ''] || 999));

  return (
    <div className="space-y-8 animate-fade-in relative">
      <SyncIndicator isFetching={isFetching && !isLoading} lastUpdated={lastUpdated} />

      {/* Global Index Board (TW / US / JP) */}
      <GlobalIndexBoard onUpdated={setBoardUpdated} />

      {/* 8 Objective Macroeconomic Indicators (2x4 Grid) */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-1 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Icon name="monitoring" className="text-primary" />
            <h2 className="text-xl font-bold text-white">關鍵經濟指標</h2>
          </div>
          <span className="text-xs text-textMuted">涵蓋台/美/日匯率、日債殖利率、VIX 恐慌指數與美國就業/利率/通膨</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
          {orderedIndicators.map((ind, i) => (
            <DashboardIndicatorCard
              key={ind.id || i}
              id={ind.id}
              title={ind.name}
              value={ind.value}
              change={ind.change}
              isUp={ind.isUp}
              description={ind.description}
              note={ind.note}
              sparkline={ind.sparkline}
              onClick={() => ind.id && onNavigateToIndicator?.(ind.id)}
            />
          ))}
        </div>
      </div>

      {/* Taiwan ADR International Premium Monitor */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-1 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Icon name="currency_exchange" className="text-primary" />
            <h2 className="text-xl font-bold text-white">台股 ADR 國際溢價監控</h2>
          </div>
          <span className="text-xs text-textMuted font-mono">
            換算匯率 USD/TWD：{adrData.usdTwd.toFixed(2)} ｜ 溢價為紅 / 折價為綠
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {adrData.items.map((adr) => (
            <ADRCard key={adr.id} adr={adr} onNavigate={onNavigateToStock} />
          ))}
          {adrData.items.length === 0 && (
            <div className="col-span-full bg-surface border border-surfaceLight rounded-xl p-6 text-center text-sm text-textMuted">
              台股 ADR 即時報價載入中...
            </div>
          )}
        </div>
      </div>

      {/* Multi-Market Rankings with Category Pill Tabs */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-1">
          <div className="flex flex-wrap items-center gap-2">
            <Icon name="leaderboard" className="text-primary" />
            <h2 className="text-xl font-bold text-white mr-2">跨國漲跌幅排行榜</h2>
            {RANKING_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRankingGroup(tab.id)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all border ${
                  rankingGroup === tab.id
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-surfaceLight/70 text-textMuted border-surfaceLight hover:bg-slate-600 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {rankingGroup === 'tw' && (
            <div className="flex items-center gap-1.5 bg-surface border border-surfaceLight rounded-full p-1 self-start lg:self-auto">
              <button
                onClick={() => setTwScope('tw_core')}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                  twScope === 'tw_core' ? 'bg-indigo-600 text-white' : 'text-textMuted hover:text-white'
                }`}
              >
                主力權值 Top 100
              </button>
              <button
                onClick={() => setTwScope('tw_all')}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                  twScope === 'tw_all' ? 'bg-indigo-600 text-white' : 'text-textMuted hover:text-white'
                }`}
              >
                全部台股
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StockTable
            title="漲幅排行榜"
            stocks={topGainers}
            type="gainer"
            isLoading={rankingsLoading}
            onNavigate={onNavigateToStock}
          />
          <StockTable
            title="跌幅排行榜"
            stocks={topLosers}
            type="loser"
            isLoading={rankingsLoading}
            onNavigate={onNavigateToStock}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
