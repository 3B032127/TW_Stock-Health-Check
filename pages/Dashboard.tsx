import React from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Icon } from '../App';
import { MARKET_INDEX_DATA, INDICATORS, TOP_GAINERS, TOP_LOSERS } from '../constants';
import { Stock } from '../types';

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
}

const IndicatorCard: React.FC<IndicatorCardProps> = ({ title, value, change, isUp }) => (
  <div className="flex flex-col p-5 rounded-xl border border-surfaceLight bg-surface hover:border-slate-600 transition-colors">
    <p className="text-textMuted text-sm font-medium">{title}</p>
    <div className="flex items-end justify-between mt-2">
      <p className="text-2xl font-bold">{value}</p>
      <div className={`flex items-center text-sm font-bold ${isUp ? 'text-up' : 'text-down'}`}>
        <Icon name={isUp ? 'arrow_upward' : 'arrow_downward'} className="text-[16px] mr-0.5" />
        {change}
      </div>
    </div>
  </div>
);

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

const Dashboard = ({ onNavigateToStock }: { onNavigateToStock: (id: string) => void }) => {
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
                <span className="text-4xl lg:text-5xl font-bold tracking-tight text-up">17,650.32</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="flex items-center text-up bg-up/10 px-2 py-1 rounded text-sm font-bold border border-up/20">
                  <Icon name="arrow_upward" className="text-[16px] mr-1" />
                  +120.45 (+0.69%)
                </span>
                <span className="text-textMuted text-sm">今日</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <p className="text-textMuted text-xs uppercase tracking-wider font-semibold">成交量</p>
                <p className="text-lg font-bold text-white">2,854 億</p>
              </div>
              <div>
                <p className="text-textMuted text-xs uppercase tracking-wider font-semibold">當日區間</p>
                <p className="text-lg font-bold text-white">17,580 - 17,685</p>
              </div>
            </div>
          </div>
          
          <div className="flex-1 p-6 relative min-h-[300px] flex flex-col">
            <div className="flex justify-end gap-2 mb-4">
               {['1日', '1週', '1月', '1年'].map((period, idx) => (
                 <button key={period} className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${idx === 1 ? 'bg-primary text-white shadow-sm' : 'bg-surfaceLight text-textMuted hover:bg-slate-600 hover:text-white'}`}>
                   {period}
                 </button>
               ))}
            </div>
            <div className="flex-1 w-full relative">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={MARKET_INDEX_DATA}>
                    <defs>
                      <linearGradient id="colorIndex" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} 
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ display: 'none' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#ef4444" fillOpacity={1} fill="url(#colorIndex)" strokeWidth={3} />
                 </AreaChart>
               </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-xs text-textMuted mt-2 font-mono px-2">
              <span>09:00</span>
              <span>10:00</span>
              <span>11:00</span>
              <span>12:00</span>
              <span>13:00</span>
              <span>13:30</span>
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
          {INDICATORS.map((ind, i) => (
             <IndicatorCard key={i} title={ind.name} value={ind.value} change={ind.change} isUp={ind.isUp} />
          ))}
        </div>
      </div>

      {/* Rankings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StockTable title="漲幅排行榜" stocks={TOP_GAINERS} type="gainer" onNavigate={onNavigateToStock} />
        <StockTable title="跌幅排行榜" stocks={TOP_LOSERS} type="loser" onNavigate={onNavigateToStock} />
      </div>
    </div>
  );
};

export default Dashboard;