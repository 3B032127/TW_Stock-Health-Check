import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Icon } from '../App';
import { INDICATOR_DETAILS, INDICATOR_CATEGORIES, generateHistoricalData } from '../indicatorDetails';

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
  changePercent?: string;
}

interface SidebarItemProps {
  icon: string;
  label: string;
  sublabel?: string;
  active?: boolean;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, sublabel, active = false, onClick }) => (
  <div
    onClick={onClick}
    className={`flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-all group ${active
      ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
      : 'text-textMuted hover:bg-surfaceLight hover:text-white'
      }`}
  >
    <Icon name={icon} className={`text-[20px] ${active ? 'text-primary' : 'group-hover:text-primary transition-colors'}`} />
    <div className="flex flex-col flex-1">
      <span className="text-sm font-semibold">{label}</span>
      {sublabel && <span className="text-[10px] text-textMuted uppercase">{sublabel}</span>}
    </div>
    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"></span>}
  </div>
);

const EconomicIndicators = () => {
  const [selectedIndicator, setSelectedIndicator] = useState<string>('us_yield');
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [chartPeriod, setChartPeriod] = useState<string>('1y');
  const [loading, setLoading] = useState(true);

  // Fetch indicators from API
  useEffect(() => {
    const fetchIndicators = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/market/indicators');
        const result = await response.json();

        if (result.status === 'success' && result.data && result.data.indicators) {
          setIndicators(result.data.indicators);
        }
      } catch (error) {
        console.error('Error fetching indicators:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIndicators();
  }, []);

  // Get current indicator data
  const currentIndicatorData = indicators.find(ind => ind.id === selectedIndicator);
  const indicatorDetail = INDICATOR_DETAILS[selectedIndicator];

  // Generate chart data
  const chartData = React.useMemo(() => {
    if (!currentIndicatorData || !indicatorDetail) return [];

    // Parse current value (remove non-numeric characters)
    const numericValue = parseFloat(currentIndicatorData.value.replace(/[^0-9.-]/g, ''));
    if (isNaN(numericValue)) return [];

    return generateHistoricalData(numericValue, currentIndicatorData.isUp, chartPeriod);
  }, [currentIndicatorData, indicatorDetail, chartPeriod]);

  // Group indicators by category
  const groupedIndicators = React.useMemo(() => {
    const groups: Record<string, Indicator[]> = {};

    indicators.forEach(ind => {
      if (!ind.id) return;
      const detail = INDICATOR_DETAILS[ind.id];
      if (!detail) return;

      const category = detail.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(ind);
    });

    return groups;
  }, [indicators]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-textMuted">載入中...</div>
      </div>
    );
  }

  if (!indicatorDetail || !currentIndicatorData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-textMuted">找不到指標資料</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 animate-fade-in">
      {/* Sidebar */}
      <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">
        <div className="hidden lg:flex flex-col gap-1 bg-surface rounded-xl border border-surfaceLight p-3 shadow-sm sticky top-24">
          {(Object.entries(groupedIndicators) as [string, Indicator[]][]).map(([category, categoryIndicators], idx) => (
            <React.Fragment key={category}>
              {idx > 0 && <div className="my-2 border-t border-surfaceLight" />}
              <div className="px-3 py-2">
                <h3 className="text-xs font-bold text-textMuted uppercase tracking-wider">{category}</h3>
              </div>
              {categoryIndicators.map(ind => {
                const detail = INDICATOR_DETAILS[ind.id!];
                return (
                  <SidebarItem
                    key={ind.id}
                    icon={detail.icon}
                    label={ind.name}
                    active={selectedIndicator === ind.id}
                    onClick={() => setSelectedIndicator(ind.id!)}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">
        <nav className="flex items-center gap-2 text-sm text-textMuted">
          <span className="hover:text-primary transition-colors cursor-pointer">首頁</span>
          <Icon name="chevron_right" className="text-xs" />
          <span className="hover:text-primary transition-colors cursor-pointer">基本面分析</span>
          <Icon name="chevron_right" className="text-xs" />
          <span className="font-medium text-white">全球經濟指標</span>
        </nav>

        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                  {indicatorDetail.name} ({indicatorDetail.nameEn})
                </h1>
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                  {indicatorDetail.code}
                </span>
              </div>
              <p className="text-textMuted max-w-2xl">{indicatorDetail.description}</p>
            </div>

            {/* Latest Data Card */}
            <div className="flex-shrink-0 bg-surface p-4 rounded-xl shadow-sm border border-surfaceLight flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center border border-surfaceLight">
                <Icon name="calendar_today" className="text-textMuted" />
              </div>
              <div>
                <p className="text-xs font-medium text-textMuted">最新數據</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">{currentIndicatorData.value}</span>
                  {currentIndicatorData.change && (
                    <span className={`text-sm font-semibold flex items-center gap-0.5 ${currentIndicatorData.isUp ? 'text-up' : 'text-down'
                      }`}>
                      <Icon name={currentIndicatorData.isUp ? 'arrow_upward' : 'arrow_downward'} className="text-sm" />
                      {currentIndicatorData.change}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-surface rounded-xl shadow-sm border border-surfaceLight overflow-hidden">
            <div className="px-6 py-4 border-b border-surfaceLight flex flex-wrap gap-4 justify-between items-center">
              <div className="flex items-center gap-2">
                <Icon name="show_chart" className="text-primary" />
                <h2 className="font-semibold text-white">歷史走勢分析</h2>
              </div>
              <div className="flex bg-surfaceLight rounded-lg p-1">
                {[
                  { label: '1M', value: '1m' },
                  { label: '1Y', value: '1y' },
                  { label: '5Y', value: '5y' },
                ].map(period => (
                  <button
                    key={period.value}
                    onClick={() => setChartPeriod(period.value)}
                    className={`px-3 py-1 text-xs font-medium rounded transition-all ${chartPeriod === period.value
                      ? 'bg-surface text-white shadow-sm'
                      : 'hover:bg-surface hover:text-white text-textMuted'
                      }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-6 relative h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id={indicatorDetail.chartGradient} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={indicatorDetail.chartColor} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={indicatorDetail.chartColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    stroke="#6b7280"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    tickFormatter={(value) => {
                      // Format based on selected period
                      if (chartPeriod === '1m') {
                        // Show month/day (MM/DD)
                        const parts = value.split('-');
                        return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : value;
                      } else if (chartPeriod === '1y') {
                        // Show year/month (YYYY/MM)
                        const parts = value.split('-');
                        return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : value;
                      } else {
                        // 5y: Show year (YYYY)
                        const parts = value.split('-');
                        return parts.length >= 1 ? parts[0] : value;
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
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const value = payload[0].value as number;
                        const date = payload[0].payload.date;

                        // Format value based on indicator type
                        let formattedValue: string;
                        if (selectedIndicator === 'usdtwd') {
                          // USD/TWD: 2 decimal places
                          formattedValue = value.toFixed(2);
                        } else if (selectedIndicator === 'us_yield' || selectedIndicator === 'fed_rate') {
                          // Yields and rates: 2 decimal places with %
                          formattedValue = value.toFixed(2) + '%';
                        } else if (selectedIndicator === 'us_cpi' || selectedIndicator === 'us_ppi') {
                          // CPI/PPI: 1 decimal place with %
                          formattedValue = value.toFixed(1) + '%';
                        } else if (selectedIndicator === 'sox') {
                          // SOX index: no decimals
                          formattedValue = value.toFixed(0);
                        } else if (selectedIndicator === 'monitor_light') {
                          // Monitor light: 1 decimal (score)
                          formattedValue = value.toFixed(1) + ' 分';
                        } else if (selectedIndicator === 'tsmc_outlook') {
                          // TSMC outlook: 1 decimal (score)
                          formattedValue = value.toFixed(1) + '/10';
                        } else {
                          // Default: 2 decimals
                          formattedValue = value.toFixed(2);
                        }

                        // Format date
                        const formattedDate = date.split('-').slice(1).join('/');

                        return (
                          <div className="bg-surface border border-surfaceLight rounded-lg px-3 py-2 shadow-lg">
                            <p className="text-textMuted text-xs mb-1">{formattedDate}</p>
                            <p className="text-white font-bold text-sm">{formattedValue}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                    cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={indicatorDetail.chartColor}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill={`url(#${indicatorDetail.chartGradient})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Introduction */}
            <div className="bg-surface rounded-xl shadow-sm border border-surfaceLight p-6 h-full transition-all hover:border-blue-900/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
                  <Icon name="info" className="text-[24px]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">指標介紹</h2>
                  <p className="text-[10px] uppercase font-bold text-textMuted tracking-wider">Indicator Intro</p>
                </div>
              </div>
              <div
                className="space-y-4 text-sm leading-relaxed text-textMuted"
                dangerouslySetInnerHTML={{ __html: indicatorDetail.introduction }}
              />
            </div>

            {/* Analysis */}
            <div className="bg-surface rounded-xl shadow-sm border border-surfaceLight p-6 h-full transition-all hover:border-amber-900/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <Icon name="lightbulb" className="text-[24px]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">分析方法與股市關聯</h2>
                  <p className="text-[10px] uppercase font-bold text-textMuted tracking-wider">Analysis Logic</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-3 bg-surfaceLight/50 rounded-lg">
                  <p className="text-sm text-textMuted">
                    <strong className="text-white block mb-1">{indicatorDetail.analysis.title}</strong>
                    {indicatorDetail.analysis.content}
                  </p>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <Icon name="trending_up" className="text-emerald-500 text-lg flex-shrink-0" />
                    <span className="text-textMuted">
                      <span className="font-medium text-emerald-400">利多：</span> {indicatorDetail.analysis.positive}
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <Icon name="trending_down" className="text-rose-500 text-lg flex-shrink-0" />
                    <span className="text-textMuted">
                      <span className="font-medium text-rose-400">利空：</span> {indicatorDetail.analysis.negative}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EconomicIndicators;
