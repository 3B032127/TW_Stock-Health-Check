import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Icon } from '../App';
import { INDICATOR_DETAILS, INDICATOR_CATEGORIES, generateHistoricalData } from '../indicatorDetails';
import { loadMonitorLightData, getMonitorDataForPeriod, getLatestMonitorData, getSignalColor, getSignalDescription, type MonitorLightData } from '../monitorLightData';

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
  const [selectedIndicator, setSelectedIndicator] = useState<string>('usdtwd');
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [chartPeriod, setChartPeriod] = useState<string>('1y');
  const [loading, setLoading] = useState(true);
  const [monitorLightData, setMonitorLightData] = useState<MonitorLightData[]>([]);

  // Fetch indicators from API and merge with monitor light data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch API indicators
        const response = await fetch('http://localhost:8000/api/v1/market/indicators');
        const result = await response.json();

        let apiIndicators: Indicator[] = [];
        if (result.status === 'success' && result.data && result.data.indicators) {
          apiIndicators = result.data.indicators;
        }

        // Load monitor light from CSV
        const monitorData = await loadMonitorLightData();
        setMonitorLightData(monitorData);
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
          // Filter out any existing monitor_light from API to avoid duplicates
          const filteredApi = apiIndicators.filter(ind => ind.id !== 'monitor_light');
          setIndicators([...filteredApi, monitorIndicator]);
        } else {
          setIndicators(apiIndicators);
        }
      } catch (error) {
        console.error('Error fetching indicators:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get current indicator data
  const currentIndicatorData = indicators.find(ind => ind.id === selectedIndicator);
  const indicatorDetail = INDICATOR_DETAILS[selectedIndicator];

  // Generate chart data
  const chartData = useMemo(() => {
    if (!currentIndicatorData || !indicatorDetail) return [];

    // Use real data for monitor_light
    if (selectedIndicator === 'monitor_light' && monitorLightData.length > 0) {
      const periodData = getMonitorDataForPeriod(monitorLightData, chartPeriod as '1y' | '5y');
      return periodData.map(d => ({
        date: d.date,
        value: d.score,
        signal: d.signal,
      }));
    }

    // Parse current value (remove non-numeric characters)
    const numericValue = parseFloat(currentIndicatorData.value.replace(/[^0-9.-]/g, ''));
    if (isNaN(numericValue)) return [];

    return generateHistoricalData(numericValue, currentIndicatorData.isUp, chartPeriod);
  }, [currentIndicatorData, indicatorDetail, chartPeriod, selectedIndicator, monitorLightData]);

  const handleIndicatorClick = (id: string) => {
    setSelectedIndicator(id);
  };

  if (loading && indicators.length === 0) {
    return <div className="p-8 text-center text-textMuted animate-pulse">載入數據中...</div>;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 animate-fade-in">
      {/* Sidebar */}
      <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">
        <div className="hidden lg:flex flex-col gap-1 bg-surface rounded-xl border border-surfaceLight p-3 shadow-sm sticky top-24">
          {Object.values(INDICATOR_CATEGORIES).map((category) => (
            <div key={category} className="mb-2 last:mb-0">
              <div className="px-3 py-2">
                <h3 className="text-xs font-bold text-textMuted uppercase tracking-wider">{category}</h3>
              </div>
              <div className="flex flex-col gap-1">
                {Object.values(INDICATOR_DETAILS)
                  .filter(detail => detail.category === category)
                  .map((detail) => (
                    <SidebarItem
                      key={detail.id}
                      icon={detail.icon}
                      label={detail.name}
                      sublabel={detail.code}
                      active={selectedIndicator === detail.id}
                      onClick={() => handleIndicatorClick(detail.id)}
                    />
                  ))}
              </div>
            </div>
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

        {currentIndicatorData && indicatorDetail ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">{indicatorDetail.name} ({indicatorDetail.nameEn})</h1>
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-bold border border-primary/20">{indicatorDetail.code}</span>
                </div>
                <p className="text-textMuted max-w-2xl">{indicatorDetail.description}</p>
              </div>
              <div className="flex-shrink-0 bg-surface p-4 rounded-xl shadow-sm border border-surfaceLight flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center border border-surfaceLight">
                  <Icon name="calendar_today" className="text-textMuted" />
                </div>
                <div>
                  <p className="text-xs font-medium text-textMuted">最新數據</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white">{currentIndicatorData.value}</span>
                    <span className={`text-sm font-semibold flex items-center gap-0.5 ${currentIndicatorData.isUp ? 'text-rose-500' : 'text-emerald-500'}`}>
                      <Icon name={currentIndicatorData.isUp ? 'arrow_upward' : 'arrow_downward'} className="text-sm" />
                      {currentIndicatorData.change}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-xl shadow-sm border border-surfaceLight overflow-hidden">
              <div className="px-6 py-4 border-b border-surfaceLight flex flex-wrap gap-4 justify-between items-center">
                <div className="flex items-center gap-2">
                  <Icon name="show_chart" className="text-primary" />
                  <h2 className="font-semibold text-white">歷史走勢分析</h2>
                </div>
                <div className="flex bg-surfaceLight rounded-lg p-1">
                  {selectedIndicator === 'monitor_light' ? (
                    <>
                      <button
                        onClick={() => setChartPeriod('1y')}
                        className={`px-3 py-1 text-xs font-medium rounded transition-all ${chartPeriod === '1y' ? 'bg-surface text-white shadow-sm' : 'text-textMuted hover:bg-surface hover:text-white'}`}
                      >
                        1Y
                      </button>
                      <button
                        onClick={() => setChartPeriod('5y')}
                        className={`px-3 py-1 text-xs font-medium rounded transition-all ${chartPeriod === '5y' ? 'bg-surface text-white shadow-sm' : 'text-textMuted hover:bg-surface hover:text-white'}`}
                      >
                        5Y
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setChartPeriod('1m')} className={`px-3 py-1 text-xs font-medium rounded transition-all ${chartPeriod === '1m' ? 'bg-surface text-white shadow-sm' : 'text-textMuted hover:bg-surface hover:text-white'}`}>1M</button>
                      <button onClick={() => setChartPeriod('6m')} className={`px-3 py-1 text-xs font-medium rounded transition-all ${chartPeriod === '6m' ? 'bg-surface text-white shadow-sm' : 'text-textMuted hover:bg-surface hover:text-white'}`}>6M</button>
                      <button onClick={() => setChartPeriod('1y')} className={`px-3 py-1 text-xs font-medium rounded transition-all ${chartPeriod === '1y' ? 'bg-surface text-white shadow-sm' : 'text-textMuted hover:bg-surface hover:text-white'}`}>1Y</button>
                      <button onClick={() => setChartPeriod('5y')} className={`px-3 py-1 text-xs font-medium rounded transition-all ${chartPeriod === '5y' ? 'bg-surface text-white shadow-sm' : 'text-textMuted hover:bg-surface hover:text-white'}`}>5Y</button>
                    </>
                  )}
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
                      dy={10}
                      interval="preserveStartEnd"
                      minTickGap={30}
                      tickFormatter={(value) => {
                        if (chartPeriod === '1m' || chartPeriod === '6m') {
                          // Show month/day (MM/DD)
                          const parts = value.split('-');
                          return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : value;
                        } else {
                          // 1y, 5y: Show year/month (YYYY/MM)
                          const parts = value.split('-');
                          return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : value;
                        }
                      }}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      hide
                    />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                      cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const formattedValue = selectedIndicator === 'monitor_light'
                            ? `${data.value.toFixed(0)}分`
                            : `${data.value.toFixed(2)}${indicatorDetail.unit || ''}`;
                          const date = data.date;
                          const signal = data.signal;

                          // Format date
                          const formattedDate = date.split('-').slice(1).join('/');

                          return (
                            <div className="bg-surface border border-surfaceLight rounded-lg px-3 py-2 shadow-lg">
                              <p className="text-textMuted text-xs mb-1">{formattedDate}</p>
                              <p className="text-white font-bold text-sm">{formattedValue}</p>
                              {selectedIndicator === 'monitor_light' && signal && (
                                <div className="mt-2 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: getSignalColor(signal) }}
                                    />
                                    <span className="text-xs text-white font-semibold">{signal}燈</span>
                                  </div>
                                  <p className="text-xs text-textMuted pl-5">{getSignalDescription(signal)}</p>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`bg-surface rounded-xl shadow-sm border border-surfaceLight p-6 h-full transition-all hover:border-[${indicatorDetail.chartColor}]/50`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
                    <Icon name="info" className="text-[24px]" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">指標介紹</h2>
                    <p className="text-[10px] uppercase font-bold text-textMuted tracking-wider">Indicator Intro</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="text-sm leading-relaxed text-textMuted" dangerouslySetInnerHTML={{ __html: indicatorDetail.introduction }} />
                </div>
              </div>

              <div className={`bg-surface rounded-xl shadow-sm border border-surfaceLight p-6 h-full transition-all hover:border-[${indicatorDetail.chartColor}]/50`}>
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
                      <Icon name="trending_up" className="text-emerald-500 text-lg" />
                      <span className="text-textMuted">
                        {indicatorDetail.analysis.positive}
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <Icon name="trending_down" className="text-rose-500 text-lg" />
                      <span className="text-textMuted">
                        {indicatorDetail.analysis.negative}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-textMuted">
            <Icon name="error_outline" className="text-4xl mb-4" />
            <p className="text-lg font-semibold">找不到指標資料</p>
            <p>請確認後端服務是否正常運作</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EconomicIndicators;
