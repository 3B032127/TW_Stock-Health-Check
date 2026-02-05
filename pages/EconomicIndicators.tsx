import React from 'react';
import { AreaChart, Area, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Icon } from '../App';
import { US_YIELD_DATA } from '../constants';

const SidebarItem = ({ icon, label, sublabel, active = false }: { icon: string; label: string; sublabel?: string; active?: boolean }) => (
  <div className={`flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-all group ${active ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' : 'text-textMuted hover:bg-surfaceLight hover:text-white'}`}>
    <Icon name={icon} className={`text-[20px] ${active ? 'text-primary' : 'group-hover:text-primary transition-colors'}`} />
    <div className="flex flex-col">
      <span className="text-sm font-semibold">{label}</span>
      {sublabel && <span className="text-[10px] text-textMuted uppercase">{sublabel}</span>}
    </div>
    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"></span>}
  </div>
);

const EconomicIndicators = () => {
  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 animate-fade-in">
      {/* Sidebar */}
      <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">
        <div className="hidden lg:flex flex-col gap-1 bg-surface rounded-xl border border-surfaceLight p-3 shadow-sm sticky top-24">
          <div className="px-3 py-2">
            <h3 className="text-xs font-bold text-textMuted uppercase tracking-wider">全球關鍵數據</h3>
          </div>
          <SidebarItem icon="candlestick_chart" label="美國10年期公債殖利率" active={true} />
          <SidebarItem icon="trending_up" label="消費者物價指數 (CPI)" />
          <SidebarItem icon="factory" label="製造業 PMI" />
          <SidebarItem icon="local_shipping" label="台灣外銷訂單" />
          <SidebarItem icon="attach_money" label="美元指數 (DXY)" />
          
          <div className="px-3 py-2 mt-4 border-t border-surfaceLight">
            <h3 className="text-xs font-bold text-textMuted uppercase tracking-wider">我的追蹤</h3>
          </div>
          <SidebarItem icon="star" label="重點觀察清單" />
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
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">美國10年期公債殖利率 (US 10Y Yield)</h1>
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-bold border border-primary/20">USGG10YR</span>
              </div>
              <p className="text-textMuted max-w-2xl">全球資產定價之錨，反映市場對未來經濟與通膨的預期。聯準會貨幣政策的重要觀察指標。</p>
            </div>
            <div className="flex-shrink-0 bg-surface p-4 rounded-xl shadow-sm border border-surfaceLight flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center border border-surfaceLight">
                <Icon name="calendar_today" className="text-textMuted" />
              </div>
              <div>
                <p className="text-xs font-medium text-textMuted">最新數據 (2024-05-20)</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">4.25%</span>
                  <span className="text-sm font-semibold text-emerald-500 flex items-center gap-0.5">
                    <Icon name="arrow_upward" className="text-sm" />
                    0.05%
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
                <button className="px-3 py-1 text-xs font-medium rounded hover:bg-surface hover:text-white text-textMuted transition-all">1M</button>
                <button className="px-3 py-1 text-xs font-medium rounded bg-surface text-white shadow-sm transition-all">1Y</button>
                <button className="px-3 py-1 text-xs font-medium rounded hover:bg-surface hover:text-white text-textMuted transition-all">5Y</button>
                <button className="px-3 py-1 text-xs font-medium rounded hover:bg-surface hover:text-white text-textMuted transition-all">ALL</button>
              </div>
            </div>
            <div className="p-6 relative h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={US_YIELD_DATA}>
                    <defs>
                      <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} 
                      itemStyle={{ color: '#fff' }}
                      cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorYield)" />
                 </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-textMuted">
                  美國10年期公債殖利率（US 10-Year Treasury Yield）被廣泛視為全球金融市場的<span className="font-bold text-white">「無風險利率」(Risk-free Rate)</span>。它是投資者在評估其他資產（如股票、公司債、房地產）時的重要參考基準。
                </p>
                <p className="text-sm leading-relaxed text-textMuted">
                  當殖利率上升時，代表市場對未來的通膨預期升高或聯準會（Fed）可能採取緊縮貨幣政策；反之，殖利率下降通常暗示經濟放緩或資金湧入避險資產。
                </p>
              </div>
            </div>

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
                    <strong className="text-white block mb-1">估值模型影響 (DCF)</strong>
                    10年期公債殖利率常作為股票折現模型中的分母。當殖利率上升，未來現金流的折現價值下降，這對高本益比的成長股（如科技股）衝擊最大。
                  </p>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <Icon name="trending_down" className="text-emerald-500 text-lg" />
                    <span className="text-textMuted">
                      <span className="font-medium text-emerald-400">殖利率下行：</span> 有利於股市估值修復，特別是科技類股。
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <Icon name="trending_up" className="text-rose-500 text-lg" />
                    <span className="text-textMuted">
                      <span className="font-medium text-rose-400">殖利率飆升：</span> 資金成本變貴，企業獲利承壓，資金可能流出股市轉向債市。
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
