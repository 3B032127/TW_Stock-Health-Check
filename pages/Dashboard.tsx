import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Icon } from '../App';
import { MARKET_INDEX_DATA, INDICATORS } from '../constants';
import { loadMonitorLightData, getLatestMonitorData } from '../monitorLightData';
import { Stock } from '../types';
import { api } from '../services/api';

// API Response Interfaces
interface TaixDataPoint {
  date: string;
  close: number;
  volume: number;
}

interface TaixCurrentData {
  price: number;
  change: number;
  changePercent: number;
  date: string;
  volume: number;
  high: number;
  low: number;
  open: number;
}

interface TaixData {
  current: TaixCurrentData;
  history: TaixDataPoint[];
  period: string;
}

interface Indicator {
  id?: string;
  name: string;
  value: string;
  change: string;
  isUp: boolean;
  description?: string;
  note?: string;
  text?: string;
  isPositiveForMarket?: boolean;
}

interface SparklineProps {
  data: any[];
  color: string;
}

const Sparkline: React.FC<SparklineProps> = ({ data, color }) => (
  <div className="h-10 w-24">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <Area type="monotone" dataKey="value" stroke={color} fill="transparent" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

interface IndicatorCardProps {
  title: string;
  value: string;
  change: string;
  isUp: boolean;
  description?: string;
  note?: string;
  text?: string;
  isPositiveForMarket?: boolean;
  onClick?: () => void;
}

const IndicatorCard: React.FC<IndicatorCardProps> = ({
  title,
  value,
  change,
  isUp,
  description,
  note,
  text,
  isPositiveForMarket,
  onClick
}) => {
  // Generate mock trend data (5 points)
  const trendData = React.useMemo(() => {
    const baseValue = 50;
    const trend = isUp ? 1 : -1;
    return Array.from({ length: 5 }, (_, i) => ({
      value: baseValue + (i * 3 * trend) + (Math.random() * 2 - 1)
    }));
  }, [isUp]);

  return (
    <div
      onClick={onClick}
      className={`flex flex-col p-5 rounded-xl border border-surfaceLight bg-surface transition-all ${onClick ? 'cursor-pointer hover:border-primary/50 hover:shadow-md' : 'hover:border-slate-600'}`}
    >
      {/* Header with title and mini chart */}
      <div className="flex items-start justify-between mb-2">
        <p className="text-textMuted text-sm font-medium flex-1">{title}</p>
        <div className="ml-2">
          <Sparkline data={trendData} color={isUp ? '#ef4444' : '#10b981'} />
        </div>
      </div>

      {/* Value and change */}
      <div className="flex items-end justify-between mb-3">
        <p className="text-2xl font-bold">{value}</p>
        <div className={`flex items-center text-sm font-bold ${isUp ? 'text-up' : 'text-down'}`}>
          <Icon name={isUp ? 'arrow_upward' : 'arrow_downward'} className="text-[16px] mr-0.5" />
          {change}
        </div>
      </div>

      {/* Additional metadata */}
      {(description || note || text || isPositiveForMarket !== undefined) && (
        <div className="pt-3 border-t border-surfaceLight/50 space-y-2">
          {description && (
            <div className="flex items-start gap-2 text-xs text-textMuted">
              <span className="text-sm">📊</span>
              <span className="flex-1">{description}</span>
            </div>
          )}
          {note && (
            <div className="flex items-start gap-2 text-xs text-primary">
              <span className="text-sm">💡</span>
              <span className="flex-1">{note}</span>
            </div>
          )}
          {text && (
            <div className="flex items-start gap-2 text-xs text-yellow-400 italic">
              <span className="text-sm">✨</span>
              <span className="flex-1">{text}</span>
            </div>
          )}
          {isPositiveForMarket !== undefined && (
            <div className={`flex items-center gap-2 text-xs font-semibold ${isPositiveForMarket ? 'text-up' : 'text-down'}`}>
              <span className="text-sm">{isPositiveForMarket ? '📈' : '📉'}</span>
              <span>{isPositiveForMarket ? '利多' : '利空'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface StockTableProps {
  title: string;
  stocks: Stock[];
  type: 'gainer' | 'loser';
  onNavigate: (id: string) => void;
}

const StockTable: React.FC<StockTableProps> = ({ title, stocks, type, onNavigate }) => {
  const isGainer = type === 'gainer';
  const colorClass = isGainer ? 'text-up' : 'text-down';
  const icon = isGainer ? 'trending_up' : 'trending_down';

  // Mock sparkline data (randomized for visual effect)
  const getMockData = () => Array.from({ length: 10 }, (_, i) => ({ value: Math.random() * 10 + (isGainer ? i : 10 - i) }));

  return (
    <div className="flex flex-col rounded-xl border border-surfaceLight bg-surface overflow-hidden">
      <div className="px-5 py-4 border-b border-surfaceLight flex justify-between items-center">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Icon name={icon} className={colorClass} />
          {title}
        </h3>
        <button className="text-sm text-primary font-medium hover:text-white transition-colors">查看更多</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surfaceLight/50 text-xs text-textMuted">
              <th className="py-3 px-5 font-semibold">個股</th>
              <th className="py-3 px-5 font-semibold text-right">成交價</th>
              <th className="py-3 px-5 font-semibold text-right">漲跌幅</th>
              <th className="py-3 px-5 font-semibold w-24">走勢</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {stocks.map((stock) => (
              <tr
                key={stock.id}
                onClick={() => onNavigate(stock.id)}
                className="border-b border-surfaceLight hover:bg-surfaceLight/30 transition-colors cursor-pointer last:border-0"
              >
                <td className="py-3 px-5">
                  <p className="font-bold text-white">{stock.name}</p>
                  <p className="text-xs text-textMuted">{stock.id}</p>
                </td>
                <td className="py-3 px-5 text-right font-medium text-white">{stock.price.toFixed(2)}</td>
                <td className={`py-3 px-5 text-right font-bold ${colorClass}`}>
                  {isGainer ? '+' : ''}{stock.changePercent.toFixed(2)}%
                </td>
                <td className="py-3 px-5">
                  <Sparkline data={getMockData()} color={isGainer ? '#ef4444' : '#10b981'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Dashboard = ({ onNavigateToStock, onNavigateToIndicator }: { onNavigateToStock: (id: string) => void, onNavigateToIndicator?: (id: string) => void }) => {
  // State management
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1d');
  const [taixData, setTaixData] = useState<TaixData | null>(null);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [indexData, setIndexData] = useState<{ date: string, value: number }[]>([]);
  const [topGainers, setTopGainers] = useState<Stock[]>([]);
  const [topLosers, setTopLosers] = useState<Stock[]>([]);


  // Fetch TAIEX data
  useEffect(() => {
    const fetchTaixData = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/v1/market/taiex?period=${selectedPeriod}`);
        const result = await response.json();

        if (result.status === 'success' && result.data) {
          setTaixData(result.data);

          // Map history to chart data format
          const chartData = result.data.history.map((item: TaixDataPoint) => ({
            date: item.date,
            value: item.close
          }));
          setIndexData(chartData);
        }
      } catch (error) {
        console.error('Error fetching TAIEX data:', error);
      }
    };

    fetchTaixData();
  }, [selectedPeriod]);

  // Fetch market indicators
  useEffect(() => {
    const fetchIndicators = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/market/indicators');
        const result = await response.json();

        let apiIndicators: Indicator[] = [];
        if (result.status === 'success' && result.data && result.data.indicators) {
          apiIndicators = result.data.indicators;
        }

        // Load monitor light from CSV
        const monitorData = await loadMonitorLightData();
        const latestMonitor = getLatestMonitorData(monitorData);

        if (latestMonitor) {
          const monitorIndicator: Indicator = {
            id: 'monitor_light',
            name: '景氣對策信號',
            value: `${latestMonitor.score.toFixed(0)}分`,
            change: `${latestMonitor.signal}燈`,
            isUp: latestMonitor.score >= 23,
            description: latestMonitor.score >= 32 ? '景氣轉熱' : latestMonitor.score >= 23 ? '景氣穩定' : '景氣轉冷',
          };

          // Merge monitor light with API indicators
          // Filter out existing monitor_light from API to avoid duplicates
          const filteredApi = apiIndicators.filter(ind => ind.id !== 'monitor_light');
          setIndicators([...filteredApi, monitorIndicator]);
        } else {
          setIndicators(apiIndicators);
        }
      } catch (error) {
        console.error('Error fetching indicators:', error);
      }
    };

    fetchIndicators();
  }, []);

  // Fetch stock rankings
  useEffect(() => {
    const fetchRankings = async () => {
      try {
        // Fetch top 10 gainers and losers
        const [gainersResult, losersResult] = await Promise.all([
          api.getTopGainers(10),
          api.getTopLosers(10)
        ]);

        if (gainersResult.status === 'success' && gainersResult.data.rankings) {
          setTopGainers(gainersResult.data.rankings);
        }

        if (losersResult.status === 'success' && losersResult.data.rankings) {
          setTopLosers(losersResult.data.rankings);
        }
      } catch (error) {
        console.error('Error fetching rankings:', error);
      }
    };

    fetchRankings();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Index Section */}
      <div className="rounded-xl bg-surface border border-surfaceLight shadow-sm overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          <div className="flex flex-col p-6 lg:p-8 lg:w-1/3 border-b lg:border-b-0 lg:border-r border-surfaceLight gap-6 justify-center">
            <div>
              <h1 className="text-3xl font-black tracking-tight mb-1 text-white">台股加權指數</h1>
              <p className="text-textMuted text-sm font-medium">臺灣證券交易所發行量加權股價指數</p>
            </div>
            <div>
              <div className="flex items-baseline gap-3">
                <span className={`text-4xl lg:text-5xl font-bold tracking-tight ${taixData && taixData.current.change >= 0 ? 'text-up' : 'text-down'}`}>
                  {taixData ? taixData.current.price.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {taixData && (
                  <span className={`flex items-center ${taixData.current.change >= 0 ? 'text-up bg-up/10 border-up/20' : 'text-down bg-down/10 border-down/20'} px-2 py-1 rounded text-sm font-bold border`}>
                    <Icon name={taixData.current.change >= 0 ? 'arrow_upward' : 'arrow_downward'} className="text-[16px] mr-1" />
                    {taixData.current.change >= 0 ? '+' : ''}{taixData.current.change.toFixed(2)} ({taixData.current.change >= 0 ? '+' : ''}{taixData.current.changePercent.toFixed(2)}%)
                  </span>
                )}
                <span className="text-textMuted text-sm">{taixData ? taixData.current.date : '今日'}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <p className="text-textMuted text-xs uppercase tracking-wider font-semibold">成交量</p>
                <p className="text-lg font-bold text-white">
                  {taixData && taixData.current.volume > 0
                    ? `${(taixData.current.volume / 100000000).toFixed(0)} 億`
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-textMuted text-xs uppercase tracking-wider font-semibold">當日區間</p>
                <p className="text-lg font-bold text-white whitespace-nowrap">
                  {taixData ? `${taixData.current.low.toLocaleString('zh-TW', { maximumFractionDigits: 0 })} - ${taixData.current.high.toLocaleString('zh-TW', { maximumFractionDigits: 0 })}` : '--'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 p-6 relative min-h-[300px] flex flex-col">
            <div className="flex justify-end gap-2 mb-4">
              {[{ label: '1日', value: '1d' }, { label: '1週', value: '1w' }, { label: '1月', value: '1m' }, { label: '1年', value: '1y' }].map((period) => (
                <button
                  key={period.value}
                  onClick={() => setSelectedPeriod(period.value)}
                  className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${selectedPeriod === period.value ? 'bg-primary text-white shadow-sm' : 'bg-surfaceLight text-textMuted hover:bg-slate-600 hover:text-white'}`}
                >
                  {period.label}
                </button>
              ))}
            </div>
            <div className="flex-1 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={indexData}>
                  <defs>
                    <linearGradient id="colorIndexUp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorIndexDown" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    stroke="#6b7280"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    tickFormatter={(value) => {
                      // Format based on selected period
                      if (selectedPeriod === '1d') {
                        // Show time only (HH:MM)
                        return value.split(' ')[1] || value;
                      } else if (selectedPeriod === '1w') {
                        // Show month/day (MM/DD)
                        const parts = value.split('-');
                        return parts.length >= 3 ? `${parts[1]}/${parts[2].split(' ')[0]}` : value;
                      } else if (selectedPeriod === '1m') {
                        // Show month/day (MM/DD)
                        const parts = value.split('-');
                        return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : value;
                      } else {
                        // 1y: Show year/month (YYYY/MM)
                        const parts = value.split('-');
                        return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : value;
                      }
                    }}
                    interval="preserveStartEnd"
                    minTickGap={50}
                  />
                  <YAxis
                    stroke="#6b7280"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    domain={['auto', 'auto']}
                    hide
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-surface border border-surfaceLight rounded-lg px-3 py-2 shadow-lg">
                            <p className="text-textMuted text-xs mb-1">{payload[0].payload.date}</p>
                            <p className="text-white font-bold text-sm">
                              {payload[0].value.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={taixData && taixData.current.change >= 0 ? '#ef4444' : '#22c55e'}
                    fillOpacity={1}
                    fill={taixData && taixData.current.change >= 0 ? 'url(#colorIndexUp)' : 'url(#colorIndexDown)'}
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Indicators Grid */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 px-1">
          <Icon name="monitoring" className="text-primary" />
          <h2 className="text-xl font-bold text-white">關鍵經濟指標</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {indicators
            .filter(ind => ind.id !== 'TAIEX' && !ind.name.includes('加權指數'))
            .sort((a, b) => {
              // Define category order
              const categoryOrder: Record<string, number> = {
                // Taiwan market indicators
                'usdtwd': 1,
                'monitor_light': 2,
                // Semiconductor related
                'sox': 3,
                'tsmc_outlook': 4,
                // US market indicators
                'us_yield': 5,
                'fed_rate': 6,
                // US economic data
                'us_cpi': 7,
                'us_ppi': 8,
              };

              const orderA = categoryOrder[a.id || ''] || 999;
              const orderB = categoryOrder[b.id || ''] || 999;

              return orderA - orderB;
            })
            .map((ind, i) => (
              <IndicatorCard
                key={ind.id || i}
                title={ind.name}
                value={ind.value}
                change={ind.change}
                isUp={ind.isUp}
                description={ind.description}
                note={ind.note}
                text={ind.text}
                isPositiveForMarket={ind.isPositiveForMarket}
                onClick={() => ind.id && onNavigateToIndicator?.(ind.id)}
              />
            ))}
        </div>
      </div>

      {/* Rankings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StockTable title="漲幅排行榜" stocks={topGainers.slice(0, 5)} type="gainer" onNavigate={onNavigateToStock} />
        <StockTable title="跌幅排行榜" stocks={topLosers.slice(0, 5)} type="loser" onNavigate={onNavigateToStock} />
      </div>
    </div >
  );
};

export default Dashboard;