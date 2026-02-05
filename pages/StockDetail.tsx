import React, { useState } from 'react';
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, LineChart, Line, Legend, CartesianGrid, PieChart, Pie, AreaChart, Area } from 'recharts';
import { Icon } from '../App';
import { AIAnalysisCard } from '../components/AIAnalysisCard';
import {
  FINANCIAL_METRICS,
  FINANCIAL_TABLE_DATA,
  REVENUE_DATA,
  BALANCE_SHEET_CHART_DATA,
  BALANCE_SHEET_TABLE_DATA,
  CASH_FLOW_CHART_DATA,
  CASH_FLOW_TABLE_DATA,
  REVENUE_MIX_DATA,
  DIVIDEND_HISTORY,
  STOCK_INTRADAY_DATA,
  ORDER_BOOK_DATA,
  CHIPS_TREND_DATA
} from '../constants';
import { StockTab, FinancialSubTab } from '../types';

const MetricCard = ({ category, items }: { category: string; items: any[] }) => {
  const getIcon = (cat: string) => {
    switch (cat) {
      case 'profitability': return 'attach_money';
      case 'solvency': return 'shield';
      case 'growth': return 'trending_up';
      case 'valuation': return 'sell';
      default: return 'analytics';
    }
  };

  const getTitle = (cat: string) => {
    switch (cat) {
      case 'profitability': return '獲利能力';
      case 'solvency': return '償債能力';
      case 'growth': return '成長動能';
      case 'valuation': return '評價水位';
      default: return '';
    }
  };

  const getColor = (cat: string) => {
    switch (cat) {
      case 'profitability': return 'text-primary'; // Blue
      case 'solvency': return 'text-emerald-500'; // Green
      case 'growth': return 'text-amber-500'; // Orange
      case 'valuation': return 'text-rose-500'; // Red
      default: return 'text-white';
    }
  };

  const getBgColor = (cat: string) => {
    switch (cat) {
      case 'profitability': return 'bg-blue-500/10 text-blue-400';
      case 'solvency': return 'bg-emerald-500/10 text-emerald-400';
      case 'growth': return 'bg-amber-500/10 text-amber-400';
      case 'valuation': return 'bg-rose-500/10 text-rose-400';
      default: return 'bg-slate-700';
    }
  };

  // Calculate score (mock)
  const score = Math.floor(Math.random() * 30) + 70;

  return (
    <div className="rounded-xl bg-surface p-6 shadow-sm border border-surfaceLight flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${getBgColor(category)}`}>
            <Icon name={getIcon(category)} />
          </div>
          <h3 className="text-lg font-bold text-white">{getTitle(category)}</h3>
        </div>
        <span className={`text-2xl font-bold ${getColor(category)}`}>
          {score}<span className="text-sm text-textMuted font-normal">/100</span>
        </span>
      </div>

      <div className="space-y-4 flex-1">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 rounded-lg hover:bg-surfaceLight transition-colors">
            <div className="flex flex-col">
              <span className="text-sm text-textMuted">{item.label}</span>
              <span className="text-base font-bold text-white">{item.value}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-textMuted hidden sm:block">目標: {item.target}</span>
              {item.status === 'pass' && (
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">通過</span>
              )}
              {item.status === 'fail' && (
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/20">失敗</span>
              )}
              {item.status === 'neutral' && (
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/20">持平</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Financial Components ---

const FinancialChart = ({ subTab }: { subTab: FinancialSubTab }) => {
  let title = '';
  let data: any[] = [];
  let bars = null;

  switch (subTab) {
    case FinancialSubTab.INCOME:
      title = '季度營收與淨利趨勢';
      data = REVENUE_DATA;
      bars = (
        <>
          <Bar dataKey="revenue" name="營業收入" fill="#135bec" radius={[2, 2, 0, 0]} barSize={30} />
          <Bar dataKey="netIncome" name="稅後淨利" fill="#06b6d4" radius={[2, 2, 0, 0]} barSize={30} />
        </>
      );
      break;
    case FinancialSubTab.BALANCE:
      title = '資產、負債與權益趨勢';
      data = BALANCE_SHEET_CHART_DATA;
      bars = (
        <>
          <Bar dataKey="assets" name="總資產" fill="#10b981" radius={[2, 2, 0, 0]} barSize={20} />
          <Bar dataKey="equity" name="股東權益" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={20} />
          <Bar dataKey="liabilities" name="總負債" fill="#ef4444" radius={[2, 2, 0, 0]} barSize={20} />
        </>
      );
      break;
    case FinancialSubTab.CASH_FLOW:
      title = '現金流量趨勢';
      data = CASH_FLOW_CHART_DATA;
      bars = (
        <>
          <Bar dataKey="operating" name="營業現金流" fill="#10b981" radius={[2, 2, 0, 0]} barSize={20} />
          <Bar dataKey="investing" name="投資現金流" fill="#f59e0b" radius={[2, 2, 0, 0]} barSize={20} />
          <Bar dataKey="financing" name="籌資現金流" fill="#6366f1" radius={[2, 2, 0, 0]} barSize={20} />
        </>
      );
      break;
  }

  return (
    <div className="bg-surface border border-surfaceLight rounded-xl p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-white text-lg font-bold flex items-center gap-2">
          <Icon name="bar_chart" className="text-primary" />
          {title}
        </h3>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="quarter" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
            <RechartsTooltip
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
              itemStyle={{ color: '#fff' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {bars}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const FinancialTable = ({ data }: { data: any[] }) => (
  <div className="bg-surface border border-surfaceLight rounded-xl overflow-hidden">
    <div className="p-4 border-b border-surfaceLight flex justify-between items-center">
      <h3 className="text-white text-lg font-bold">詳細財務數據</h3>
      <span className="text-textMuted text-xs">單位: 百萬元 / EPS: 元</span>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-right whitespace-nowrap">
        <thead className="bg-surfaceLight text-textMuted">
          <tr>
            <th className="px-6 py-4 text-left font-medium sticky left-0 bg-surfaceLight z-10 border-r border-surfaceLight">項目</th>
            <th className="px-6 py-4 font-medium min-w-[100px]">2024 Q1</th>
            <th className="px-6 py-4 font-medium min-w-[100px]">2023 Q4</th>
            <th className="px-6 py-4 font-medium min-w-[100px]">2023 Q3</th>
            <th className="px-6 py-4 font-medium min-w-[100px]">2023 Q2</th>
            <th className="px-6 py-4 font-medium min-w-[100px]">2023 Q1</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surfaceLight">
          {data.map((row, i) => (
            <tr key={i} className={`hover:bg-surfaceLight/30 transition-colors ${row.highlight ? 'bg-surfaceLight/10' : ''}`}>
              <td className={`px-6 py-4 text-left font-medium sticky left-0 z-10 border-r border-surfaceLight ${row.highlight ? 'text-primary' : row.item.includes('EPS') || row.item.includes('淨利') || row.item.includes('總計') ? 'text-white font-bold' : 'text-textMuted'} ${row.highlight ? 'bg-[#182336]' : 'bg-surface'}`}>
                {row.item}
              </td>
              <td className={`px-6 py-4 ${row.highlight ? 'text-primary font-bold' : 'text-white'}`}>{row.q1}</td>
              <td className="px-6 py-4 text-textMuted">{row.q4}</td>
              <td className="px-6 py-4 text-textMuted">{row.q3}</td>
              <td className="px-6 py-4 text-textMuted">{row.q2}</td>
              <td className="px-6 py-4 text-textMuted">{row.q1_prev}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// --- New Tab Components ---

const CompanyProfile = () => {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface border border-surfaceLight rounded-xl p-6">
            <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
              <Icon name="business" className="text-primary" />
              基本資料
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <div className="flex justify-between border-b border-surfaceLight pb-2">
                <span className="text-textMuted">股票名稱</span>
                <span className="text-white font-medium">台積電 (2330)</span>
              </div>
              <div className="flex justify-between border-b border-surfaceLight pb-2">
                <span className="text-textMuted">產業類別</span>
                <span className="text-white font-medium">半導體業</span>
              </div>
              <div className="flex justify-between border-b border-surfaceLight pb-2">
                <span className="text-textMuted">董事長</span>
                <span className="text-white font-medium">劉德音</span>
              </div>
              <div className="flex justify-between border-b border-surfaceLight pb-2">
                <span className="text-textMuted">總經理</span>
                <span className="text-white font-medium">魏哲家</span>
              </div>
              <div className="flex justify-between border-b border-surfaceLight pb-2">
                <span className="text-textMuted">實收資本額</span>
                <span className="text-white font-medium">2,593 億元</span>
              </div>
              <div className="flex justify-between border-b border-surfaceLight pb-2">
                <span className="text-textMuted">成立日期</span>
                <span className="text-white font-medium">1987/02/21</span>
              </div>
              <div className="flex justify-between border-b border-surfaceLight pb-2">
                <span className="text-textMuted">上市日期</span>
                <span className="text-white font-medium">1994/09/05</span>
              </div>
              <div className="flex justify-between border-b border-surfaceLight pb-2">
                <span className="text-textMuted">統編</span>
                <span className="text-white font-medium">22099131</span>
              </div>
            </div>
            <div className="mt-6">
              <h4 className="text-sm font-bold text-textMuted mb-2">公司簡介</h4>
              <p className="text-sm text-textMuted leading-relaxed">
                台灣積體電路製造股份有限公司（TSMC）是全球最大的專用半導體晶圓代工廠。成立於1987年，率先開創了專業積體電路製造服務之商業模式。公司主要業務為製造及銷售積體電路及其他半導體裝置，並提供相關的封裝與測試服務。台積電在先進製程技術（如7奈米、5奈米、3奈米）保持全球領先地位。
              </p>
            </div>
          </div>

          <div className="bg-surface border border-surfaceLight rounded-xl p-6">
            <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
              <Icon name="paid" className="text-emerald-500" />
              股利政策
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-surfaceLight text-textMuted">
                  <tr>
                    <th className="px-4 py-3 text-left">發放年度</th>
                    <th className="px-4 py-3">現金股利</th>
                    <th className="px-4 py-3">股票股利</th>
                    <th className="px-4 py-3">合計</th>
                    <th className="px-4 py-3">除息日</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surfaceLight text-white">
                  {DIVIDEND_HISTORY.map((row, i) => (
                    <tr key={i} className="hover:bg-surfaceLight/30">
                      <td className="px-4 py-3 text-left font-medium">{row.year}</td>
                      <td className="px-4 py-3">{row.cash}</td>
                      <td className="px-4 py-3">{row.stock}</td>
                      <td className="px-4 py-3 font-bold text-emerald-400">{row.cash + row.stock}</td>
                      <td className="px-4 py-3 text-textMuted">{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-surface border border-surfaceLight rounded-xl p-6 h-fit">
            <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
              <Icon name="pie_chart" className="text-blue-400" />
              營收佔比
            </h3>
            <div className="h-64 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={REVENUE_MIX_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {REVENUE_MIX_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0)" />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <span className="block text-2xl font-bold text-white">100%</span>
                <span className="text-xs text-textMuted">Product Mix</span>
              </div>
            </div>
            <div className="space-y-3 mt-2">
              {REVENUE_MIX_DATA.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-textMuted">{item.name}</span>
                  </div>
                  <span className="font-bold text-white">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RealTimeQuote = () => {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart & Stats */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Main Price Card */}
          <div className="bg-surface border border-surfaceLight rounded-xl p-6">
            <div className="flex flex-wrap justify-between items-end mb-6">
              <div>
                <h3 className="text-sm font-medium text-textMuted mb-1">即時成交價</h3>
                <div className="flex items-baseline gap-4">
                  <span className="text-5xl font-bold text-up">588.00</span>
                  <span className="text-xl font-bold text-up flex items-center">
                    <Icon name="arrow_upward" className="text-xl" />
                    8.00 (1.38%)
                  </span>
                </div>
                <p className="text-xs text-textMuted mt-2 flex items-center gap-1">
                  <Icon name="schedule" className="text-xs" />
                  資料時間: 2024/05/20 13:30:00 (已收盤)
                </p>
              </div>
              <div className="grid grid-cols-3 gap-x-8 gap-y-2 text-sm mt-4 lg:mt-0">
                <div className="flex flex-col">
                  <span className="text-textMuted">開盤</span>
                  <span className="font-bold text-white">585.00</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-textMuted">最高</span>
                  <span className="font-bold text-up">589.00</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-textMuted">最低</span>
                  <span className="font-bold text-white">582.00</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-textMuted">昨收</span>
                  <span className="font-bold text-white">580.00</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-textMuted">總量</span>
                  <span className="font-bold text-primary">32,458</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-textMuted">成交額</span>
                  <span className="font-bold text-white">190.8億</span>
                </div>
              </div>
            </div>

            <div className="h-80 w-full relative border-t border-surfaceLight pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={STOCK_INTRADAY_DATA}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                  <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} orientation="right" />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Area type="step" dataKey="value" stroke="#ef4444" strokeWidth={2} fill="url(#colorPrice)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Order Book (5 Levels) */}
        <div className="lg:col-span-1">
          <div className="bg-surface border border-surfaceLight rounded-xl overflow-hidden">
            <div className="p-4 border-b border-surfaceLight bg-surfaceLight/30">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Icon name="list_alt" />
                五檔報價
              </h3>
            </div>
            <div className="flex flex-col">
              {/* Asks (Sell) - Reversed */}
              <div className="flex flex-col-reverse">
                {ORDER_BOOK_DATA.asks.map((ask, i) => (
                  <div key={i} className="grid grid-cols-3 text-sm py-2 px-4 hover:bg-surfaceLight/20 relative">
                    <span className="text-textMuted font-medium text-center">賣 {5 - i}</span>
                    <span className="text-up font-bold text-right">{ask.price}</span>
                    <div className="text-right relative z-10">{ask.volume}</div>
                    <div className="absolute top-1 bottom-1 right-0 bg-up/20 z-0" style={{ width: `${(ask.volume / 500) * 100}%` }}></div>
                  </div>
                ))}
              </div>

              <div className="border-y border-surfaceLight py-2 bg-surfaceLight/10 text-center text-xs text-textMuted font-medium tracking-wider">
                最新成交 588.00
              </div>

              {/* Bids (Buy) */}
              <div className="flex flex-col">
                {ORDER_BOOK_DATA.bids.map((bid, i) => (
                  <div key={i} className="grid grid-cols-3 text-sm py-2 px-4 hover:bg-surfaceLight/20 relative">
                    <span className="text-textMuted font-medium text-center">買 {i + 1}</span>
                    <span className="text-up font-bold text-right">{bid.price}</span>
                    <div className="text-right relative z-10">{bid.volume}</div>
                    <div className="absolute top-1 bottom-1 right-0 bg-up/20 z-0" style={{ width: `${(bid.volume / 500) * 100}%` }}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChipsAnalysis = () => {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-surfaceLight rounded-xl p-5 flex flex-col items-center text-center">
          <p className="text-sm text-textMuted mb-2">外資買賣超 (今日)</p>
          <p className="text-2xl font-bold text-up">+3,100 張</p>
          <span className="text-xs text-up bg-up/10 px-2 py-0.5 rounded mt-2">連買 3 日</span>
        </div>
        <div className="bg-surface border border-surfaceLight rounded-xl p-5 flex flex-col items-center text-center">
          <p className="text-sm text-textMuted mb-2">投信買賣超 (今日)</p>
          <p className="text-2xl font-bold text-down">-100 張</p>
          <span className="text-xs text-down bg-down/10 px-2 py-0.5 rounded mt-2">轉買為賣</span>
        </div>
        <div className="bg-surface border border-surfaceLight rounded-xl p-5 flex flex-col items-center text-center">
          <p className="text-sm text-textMuted mb-2">自營商買賣超 (今日)</p>
          <p className="text-2xl font-bold text-up">+150 張</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-surface border border-surfaceLight rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-white text-lg font-bold flex items-center gap-2">
            <Icon name="groups" className="text-primary" />
            三大法人買賣超趨勢
          </h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500"></span>外資</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500"></span>投信</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-500"></span>自營商</div>
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={CHIPS_TREND_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <RechartsTooltip
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend />
              <Bar dataKey="foreign" name="外資" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              <Bar dataKey="trust" name="投信" fill="#10b981" radius={[2, 2, 0, 0]} />
              <Bar dataKey="dealer" name="自營商" fill="#f59e0b" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-surface border border-surfaceLight rounded-xl p-6">
        <h3 className="text-white text-lg font-bold mb-4">籌碼集中度分析</h3>
        <p className="text-sm text-textMuted">
          目前大戶持股比例（&gt;400張）為 <span className="text-white font-bold">88.5%</span>，散戶持股比例（&lt;10張）為 <span className="text-white font-bold">4.2%</span>。籌碼相對集中，顯示主力信心充足。
        </p>
      </div>

      {/* AI Analysis */}
      <AIAnalysisCard type="chips" title="籌碼面智能分析" defaultExpanded={true} />
    </div>
  );
};

const StockDetail = () => {
  const [activeTab, setActiveTab] = useState<StockTab>(StockTab.PROFILE); // Default set to PROFILE
  const [activeSubTab, setActiveSubTab] = useState<FinancialSubTab>(FinancialSubTab.INCOME);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex text-sm font-medium text-textMuted">
        <ol className="flex items-center gap-2">
          <li>首頁</li>
          <li><Icon name="chevron_right" className="text-xs" /></li>
          <li>台股市場</li>
          <li><Icon name="chevron_right" className="text-xs" /></li>
          <li className="text-white font-bold">台積電 (2330)</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">台積電 (2330)</h1>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">半導體業</span>
          </div>
          <p className="text-textMuted text-sm md:text-base max-w-2xl">
            台灣積體電路製造股份有限公司。基於 2023 年第三季度財報的基本面分析報告。
            <span className="block mt-1 text-xs opacity-70">最後更新：2023年10月27日 • 市值：15.2兆 TWD</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 h-10 px-4 rounded-lg border border-surfaceLight bg-surface text-sm font-medium hover:bg-surfaceLight transition-colors text-white">
            <Icon name="star" className="text-[20px]" />
            <span>加入觀察清單</span>
          </button>
          <button className="flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-white text-sm font-medium shadow-lg shadow-primary/25 hover:bg-primaryHover transition-colors">
            <Icon name="download" className="text-[20px]" />
            <span>下載完整報告</span>
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="mb-2 border-b border-surfaceLight overflow-x-auto">
        <nav className="flex space-x-8 min-w-max">
          {[
            { id: StockTab.PROFILE, label: '公司簡介' },
            { id: StockTab.QUOTE, label: '即時報價' },
            { id: StockTab.CHIPS, label: '籌碼分析' },
            { id: StockTab.HEALTH_CHECK, label: '財報健檢' },
            { id: StockTab.FINANCIALS, label: '財報數據' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-textMuted hover:text-white hover:border-slate-500'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content Switch */}
      {activeTab === StockTab.PROFILE && <CompanyProfile />}
      {activeTab === StockTab.QUOTE && <RealTimeQuote />}
      {activeTab === StockTab.CHIPS && <ChipsAnalysis />}

      {activeTab === StockTab.HEALTH_CHECK && (
        <div className="flex flex-col gap-8">
          {/* Overall Score */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-4 lg:col-span-3 rounded-xl bg-surface p-6 shadow-sm border border-surfaceLight relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Icon name="health_metrics" className="text-9xl" />
              </div>
              <h3 className="text-textMuted font-medium mb-4">綜合健康評分</h3>
              <div className="flex flex-col items-center justify-center py-4">
                <div className="relative size-32 flex items-center justify-center rounded-full border-[8px] border-emerald-500 bg-transparent mb-4 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <div className="text-center">
                    <span className="text-4xl font-black text-white">87</span>
                    <span className="block text-xs font-bold text-emerald-400 uppercase tracking-wider">優秀</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-textMuted">同業平均</span>
                  <span className="font-bold text-white">64</span>
                </div>
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400 w-[64%]"></div>
                </div>
              </div>
            </div>

            <div className="md:col-span-8 lg:col-span-9 rounded-xl bg-surface p-6 shadow-sm border border-surfaceLight">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white">績效概覽</h3>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-xs text-textMuted"><div className="size-2 rounded-full bg-primary"></div>台積電</div>
                  <div className="flex items-center gap-2 text-xs text-textMuted"><div className="size-2 rounded-full bg-slate-500"></div>同業平均</div>
                </div>
              </div>
              {/* Mock Bars */}
              <div className="grid grid-cols-4 gap-4 h-48 items-end pb-4 border-b border-surfaceLight">
                {[
                  { label: '獲利能力', val: 92, avg: 65, color: 'bg-primary' },
                  { label: '償債能力', val: 85, avg: 70, color: 'bg-emerald-500' },
                  { label: '成長動能', val: 60, avg: 50, color: 'bg-amber-500' },
                  { label: '評價水位', val: 45, avg: 60, color: 'bg-rose-500' },
                ].map((d, i) => (
                  <div key={i} className="flex flex-col justify-end gap-2 h-full text-center group">
                    <div className="flex items-end justify-center gap-2 h-full px-1">
                      <div className="w-full bg-slate-700 rounded-t-sm relative group-hover:bg-slate-600 transition-colors" style={{ height: `${d.avg}%` }}></div>
                      <div className={`w-full ${d.color} rounded-t-sm relative shadow-lg`} style={{ height: `${d.val}%` }}></div>
                    </div>
                    <span className="text-xs font-bold text-slate-300">{d.label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-textMuted">
                <span className="font-bold text-primary">洞察：</span> 與同業相比，台積電展現了優越的獲利能力和強大的償債能力，雖然目前評價處於溢價水準。
              </p>
            </div>
          </div>

          {/* Detailed Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MetricCard category="profitability" items={FINANCIAL_METRICS.profitability} />
            <MetricCard category="solvency" items={FINANCIAL_METRICS.solvency} />
            <MetricCard category="growth" items={FINANCIAL_METRICS.growth} />
            <MetricCard category="valuation" items={FINANCIAL_METRICS.valuation} />
          </div>

          {/* AI Analysis */}
          <AIAnalysisCard type="health" title="財報健檢智能診斷" defaultExpanded={true} />


        </div>
      )}

      {activeTab === StockTab.FINANCIALS && (
        <div className="flex flex-col gap-6">
          {/* Sub Navigation */}
          <div className="flex gap-2 p-1 bg-surfaceLight rounded-lg w-fit">
            {[
              { id: FinancialSubTab.INCOME, label: '綜合損益表' },
              { id: FinancialSubTab.BALANCE, label: '資產負債表' },
              { id: FinancialSubTab.CASH_FLOW, label: '現金流量表' }
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => setActiveSubTab(sub.id)}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeSubTab === sub.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-textMuted hover:text-white'
                  }`}
              >
                {sub.label}
              </button>
            ))}
          </div>



          <FinancialChart subTab={activeSubTab} />

          {activeSubTab === FinancialSubTab.INCOME && <FinancialTable data={FINANCIAL_TABLE_DATA} />}
          {activeSubTab === FinancialSubTab.BALANCE && <FinancialTable data={BALANCE_SHEET_TABLE_DATA} />}
          {activeSubTab === FinancialSubTab.CASH_FLOW && <FinancialTable data={CASH_FLOW_TABLE_DATA} />}

          {/* AI Analysis */}
          <AIAnalysisCard type="financial" title="財務數據趨勢解讀" defaultExpanded={true} />
        </div>
      )}
    </div>
  );
};

export default StockDetail;