import React, { useState, useEffect } from 'react';
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, LineChart, Line, Legend, CartesianGrid, PieChart, Pie, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Sector } from 'recharts';
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
  CHIPS_TREND_DATA,
  MOCK_VALUATION_DATA,
  MOCK_FINANCIAL_HIGHLIGHTS,
  MOCK_PEER_COMPARISON,
  MOCK_OWNERSHIP_DATA
} from '../constants';
import { StockTab, FinancialSubTab, FinancialHighlightsData } from '../types';
import { useCompanyProfile } from '../hooks/useCompanyProfile';
import { useDividends } from '../hooks/useDividends';
import { useRevenueMix } from '../hooks/useRevenueMix';
import { useValuationMetrics } from '../hooks/useValuationMetrics';
import { useOwnershipData } from '../hooks/useOwnershipData';
import { usePeerComparison } from '../hooks/usePeerComparison';
import { DynamicPeerComparison } from '../components/DynamicPeerComparison';
import CompanyNews from '../components/CompanyNews';

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

const SparklineChart = ({ data, color }: { data: { time: string; value: number }[], color?: string }) => {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data.map(d => d.value));
  const max = Math.max(...data.map(d => d.value));
  const isUp = data[data.length - 1].value >= data[0].value;
  const strokeColor = color || (isUp ? '#ef4444' : '#10b981');

  return (
    <div className="w-24 h-10 ml-auto">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="value" stroke={strokeColor} strokeWidth={2} dot={false} isAnimationActive={false} />
          <YAxis domain={[min - (max - min) * 0.1, max + (max - min) * 0.1]} hide />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const ValuationMetrics = ({ stockId }: { stockId: string }) => {
  const { data, isLoading, error } = useValuationMetrics(stockId);
  const [activeMetric, setActiveMetric] = useState<'price' | 'peRatio' | 'pbRatio' | 'dividendYield' | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (activeMetric) {
      setTimeout(() => setIsMounted(true), 10);
    } else {
      setIsMounted(false);
    }
  }, [activeMetric]);

  const handleCloseModal = () => {
    setIsMounted(false);
    setTimeout(() => setActiveMetric(null), 300);
  };

  let priceColorClass = "text-white";
  let isPriceUp = false;
  let isPriceDown = false;
  if (data?.sparklineData && data.sparklineData.length > 1) {
    const prevClose = data.sparklineData[data.sparklineData.length - 2].value;
    isPriceUp = data.price > prevClose;
    isPriceDown = data.price < prevClose;
    if (isPriceUp) priceColorClass = "text-up";
    else if (isPriceDown) priceColorClass = "text-down";
  }

  const getPeTag = (pe: number | null | undefined) => {
    if (!pe || pe <= 0) return { text: "虧損中", textClass: "text-slate-400", bgClass: "bg-surfaceLight/50", borderClass: "border-transparent" };
    if (pe < 15) return { text: "偏低估值", textClass: "text-emerald-400", bgClass: "bg-emerald-500/10", borderClass: "border-emerald-500/20" };
    if (pe > 25) return { text: "較高期待", textClass: "text-red-400", bgClass: "bg-red-500/10", borderClass: "border-red-500/20" };
    return { text: "合理區間", textClass: "text-blue-400", bgClass: "bg-blue-500/10", borderClass: "border-blue-500/20" };
  };

  const getPbTag = (pb: number | null | undefined) => {
    if (!pb || pb <= 0) return { text: "無資料", textClass: "text-textMuted", bgClass: "bg-surfaceLight/50", borderClass: "border-transparent" };
    if (pb < 1.5) return { text: "低於淨值", textClass: "text-emerald-400", bgClass: "bg-emerald-500/10", borderClass: "border-emerald-500/20" };
    if (pb > 3) return { text: "估值偏高", textClass: "text-red-400", bgClass: "bg-red-500/10", borderClass: "border-red-500/20" };
    return { text: "合理區間", textClass: "text-blue-400", bgClass: "bg-blue-500/10", borderClass: "border-blue-500/20" };
  };

  const getYieldTag = (y: number | null | undefined) => {
    if (!y || y <= 0) return { text: "無配息", textClass: "text-slate-400", bgClass: "bg-surfaceLight/50", borderClass: "border-transparent" };
    if (y > 4) return { text: "高配息", textClass: "text-amber-400", bgClass: "bg-amber-500/10", borderClass: "border-amber-500/20" };
    return { text: "穩定配息", textClass: "text-blue-400", bgClass: "bg-blue-500/10", borderClass: "border-blue-500/20" };
  };

  const peTag = getPeTag(data?.peRatio);
  const pbTag = getPbTag(data?.pbRatio);
  const yieldTag = getYieldTag(data?.dividendYield);
  const priceTag = isPriceUp
    ? { text: "上漲趨勢", textClass: "text-up", bgClass: "bg-red-500/10", borderClass: "border-red-500/20" }
    : isPriceDown
      ? { text: "下跌趨勢", textClass: "text-down", bgClass: "bg-emerald-500/10", borderClass: "border-emerald-500/20" }
      : { text: "平盤震盪", textClass: "text-slate-400", bgClass: "bg-slate-500/10", borderClass: "border-slate-500/20" };


  const getModalContent = () => {
    if (!data || !activeMetric) return null;

    let title = "";
    let explanation = "";
    let analysis = "";
    let chartData: any[] = [];
    let color = "#10b981";
    let currentValue = "";
    let tag = priceTag;

    switch (activeMetric) {
      case 'price':
        title = "目前股價 (Current Price)";
        explanation = "股價是市場買賣雙方交集出的當前交易價格，反映市場對公司價值的共識。";
        analysis = `目前股價為 ${data.price.toFixed(2)} 元。透過觀察近 1 年走勢，可了解近期資金動能與市場長期情緒。`;
        chartData = data.sparklineData;
        color = isPriceUp ? "#ef4444" : isPriceDown ? "#10b981" : "#135bec"; // Dynamic Color
        currentValue = `${data.price.toFixed(2)} TWD`;
        tag = priceTag;
        break;
      case 'peRatio':
        title = "本益比 (P/E Ratio)";
        explanation = (!data.peRatio || data.peRatio <= 0)
          ? "目前公司處於虧損狀態，無法計算實質本益比。"
          : "算法為「股價 ÷ 每股盈餘 (EPS)」。用來評估買進股票後，假設公司獲利不變，需要多少年才能回本。";
        analysis = (!data.peRatio || data.peRatio <= 0)
          ? "目前公司處於虧損狀態，本益比無法給予參考。建議關注本業是否能轉虧為盈或觀察淨值比。"
          : `目前本益比為 ${data.peRatio.toFixed(1)} 倍。${peTag.text === '偏低估值' ? '處於相對便宜區間，具投資吸引力。' : '代表市場可能給予較高期待，需注意是否超漲。'}`;
        chartData = data.peSparkline || [];
        color = "#a855f7"; // purple
        currentValue = (!data.peRatio || data.peRatio <= 0) ? `虧損中` : `${data.peRatio.toFixed(2)} 倍`;
        tag = peTag;
        break;
      case 'pbRatio':
        title = "股價淨值比 (P/B Ratio)";
        explanation = "算法為「股價 ÷ 每股淨值」。用來衡量股價是否高於公司清算價值，特別適合評估金融股或景氣循環股。";
        analysis = `目前淨值比為 ${data.pbRatio ? data.pbRatio.toFixed(2) : '-'} 倍。${pbTag.text === '低於淨值' ? '數值偏低，可能有低估機會，俗稱「破淨」。' : '高於淨值較多，反映市場看好其無形資產或未來成長性。'}`;
        color = "#6366f1"; // indigo
        chartData = data.pbSparkline || [];
        currentValue = `${data.pbRatio ? data.pbRatio.toFixed(2) : '-'} 倍`;
        tag = pbTag;
        break;
      case 'dividendYield':
        title = "現金殖利率 (Dividend Yield)";
        explanation = (!data.dividendYield || data.dividendYield <= 0)
          ? "目前公司未配發現金股利。"
          : "算法為「(每股發放的現金股利 ÷ 股價) × 100%」。如同銀行定存利率，用來衡量投資能獲得的被動現金流報酬。";
        analysis = (!data.dividendYield || data.dividendYield <= 0)
          ? "目前公司未配發現金股利。若是成長型科技股，可能將資金保留作為未來投資擴張之用。"
          : `目前殖利率為 ${data.dividendYield.toFixed(1)}%。${yieldTag.text === '高配息' ? '屬於高配息水準，對存股族具備吸引力，能提供較好的下檔保護。' : '數值一般，需觀察未來配息是否穩定成長。'}`;
        color = "#f59e0b"; // amber
        chartData = data.yieldSparkline || [];
        currentValue = (!data.dividendYield || data.dividendYield <= 0) ? `無配息` : `${data.dividendYield.toFixed(2)} %`;
        tag = yieldTag;
        break;
    }

    return { title, explanation, analysis, chartData, color, currentValue, tag };
  };

  const modalContent = getModalContent();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-surface border border-surfaceLight rounded-xl p-5 h-[104px]">
            <div className="h-4 bg-surfaceLight w-16 mb-4 rounded"></div>
            <div className="h-6 bg-surfaceLight w-24 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-surface border border-surfaceLight rounded-xl p-5 h-[104px] flex items-center justify-center">
            <span className="text-textMuted text-xs">暫無估值資料</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveMetric('price')}
          className="bg-surface border border-surfaceLight rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-primary hover:scale-[1.02] cursor-pointer transition-all duration-300"
        >
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><Icon name="show_chart" className="text-4xl text-primary" /></div>
          <p className="text-sm text-textMuted mb-2">目前股價</p>
          <div className="flex items-end gap-2">
            <span className={`text-3xl font-bold z-10 ${priceColorClass}`}>{data.price.toFixed(2)}</span>
            <span className="text-sm text-textMuted mb-1 z-10">TWD</span>
          </div>
          <div className="absolute bottom-4 right-4 z-0 opacity-40 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <SparklineChart data={data.sparklineData} color={isPriceUp ? '#ef4444' : isPriceDown ? '#10b981' : '#135bec'} />
          </div>
          <div className={`mt-2 text-xs px-2 py-1 rounded w-fit font-medium relative z-10 ${priceTag.textClass} ${priceTag.bgClass}`}>{priceTag.text}</div>
        </div>

        <div
          onClick={() => setActiveMetric('peRatio')}
          className="bg-surface border border-surfaceLight rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-purple-500 hover:scale-[1.02] cursor-pointer transition-all duration-300"
        >
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-15 transition-opacity z-0 pointer-events-none"><Icon name="analytics" className="text-4xl text-purple-500" /></div>
          <p className="text-sm text-textMuted mb-2 relative z-10">本益比 (P/E)</p>
          <div className="flex items-baseline gap-2 relative z-10">
            {(!data.peRatio || data.peRatio <= 0) ? (
              <span className="text-3xl font-bold text-slate-400">虧損中</span>
            ) : (
              <>
                <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">{data.peRatio.toFixed(1)}</span>
                <span className="text-sm text-textMuted">倍</span>
              </>
            )}
          </div>
          <div className="absolute bottom-4 right-4 z-0 opacity-40 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <SparklineChart data={data.peSparkline || []} color="#a855f7" />
          </div>
          <div className={`mt-2 text-xs px-2 py-1 rounded w-fit font-medium relative z-10 ${peTag.textClass} ${peTag.bgClass}`}>{peTag.text}</div>
        </div>

        <div
          onClick={() => setActiveMetric('pbRatio')}
          className="bg-surface border border-surfaceLight rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-indigo-500 hover:scale-[1.02] cursor-pointer transition-all duration-300"
        >
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-15 transition-opacity z-0 pointer-events-none"><Icon name="pie_chart" className="text-4xl text-indigo-500" /></div>
          <p className="text-sm text-textMuted mb-2 relative z-10">股價淨值比 (P/B)</p>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">{data.pbRatio ? data.pbRatio.toFixed(2) : '-'}</span>
            <span className="text-sm text-textMuted">倍</span>
          </div>
          <div className="absolute bottom-4 right-4 z-0 opacity-40 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <SparklineChart data={data.pbSparkline || []} color="#6366f1" />
          </div>
          <div className={`mt-2 text-xs px-2 py-1 rounded w-fit font-medium relative z-10 ${pbTag.textClass} ${pbTag.bgClass}`}>{pbTag.text}</div>
        </div>

        <div
          onClick={() => setActiveMetric('dividendYield')}
          className="bg-surface border border-surfaceLight rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500 hover:scale-[1.02] cursor-pointer transition-all duration-300"
        >
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-15 transition-opacity z-0 pointer-events-none"><Icon name="savings" className="text-4xl text-amber-500" /></div>
          <p className="text-sm text-textMuted mb-2 relative z-10">現金殖利率</p>
          <div className="flex items-baseline gap-2 relative z-10">
            {(!data.dividendYield || data.dividendYield <= 0) ? (
              <span className="text-3xl font-bold text-slate-400">無配息</span>
            ) : (
              <>
                <span className="text-3xl font-bold text-amber-400">{data.dividendYield.toFixed(1)}</span>
                <span className="text-xl font-bold text-amber-400">%</span>
              </>
            )}
          </div>
          <div className="absolute bottom-4 right-4 z-0 opacity-40 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <SparklineChart data={data.yieldSparkline || []} color="#f59e0b" />
          </div>
          <div className={`mt-2 text-xs px-2 py-1 rounded w-fit font-medium relative z-10 ${yieldTag.textClass} ${yieldTag.bgClass}`}>{yieldTag.text}</div>
        </div>
      </div>

      {/* Modal */}
      {(activeMetric || isMounted) && modalContent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className={`absolute inset-0 bg-black/60 transition-all duration-300 ease-out ${isMounted ? 'opacity-100 backdrop-blur-sm' : 'opacity-0 backdrop-blur-none'}`} onClick={handleCloseModal}></div>
          <div className={`relative bg-surface border border-surfaceLight rounded-2xl w-full max-w-2xl shadow-2xl my-auto mx-auto overflow-hidden transition-all duration-300 ease-out transform ${isMounted ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}>
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-surfaceLight">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <Icon name="insert_chart_outlined" className="text-primary text-2xl" />
                {modalContent.title}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-textMuted hover:text-white transition-colors bg-surfaceLight/50 hover:bg-surfaceLight rounded-full p-2 flex items-center justify-center hover:scale-110 active:scale-95 duration-200"
              >
                <Icon name="close" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              {/* Highlight Dashboard Card */}
              <div className="flex items-center gap-4 mb-6 bg-surfaceLight/10 p-5 rounded-2xl border border-surfaceLight/30 shadow-inner">
                <div>
                  <p className="text-sm text-textMuted font-medium mb-1">當前數值</p>
                  <p className="text-4xl font-black tracking-tight" style={{ color: modalContent.color }}>
                    {modalContent.currentValue}
                  </p>
                </div>
                <div className={`ml-auto px-5 py-2.5 rounded-xl border-2 font-black tracking-wide shadow-sm ${modalContent.tag.bgClass} ${modalContent.tag.textClass} ${modalContent.tag.borderClass}`}>
                  {modalContent.tag.text}
                </div>
              </div>

              <div className="mb-6 bg-surfaceLight/20 p-4 rounded-xl border border-surfaceLight/50">
                <p className="text-sm text-slate-300 leading-relaxed">
                  <span className="font-bold text-white mr-2">📌 指標解說：</span>
                  {modalContent.explanation}
                </p>
              </div>

              {modalContent.chartData && modalContent.chartData.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs text-textMuted font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Icon name="timeline" className="text-textMuted" />
                    近 1 年走勢
                  </h4>
                  <div className="h-48 w-full bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={modalContent.chartData}>
                        <defs>
                          <linearGradient id="modalGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={modalContent.color} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={modalContent.color} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="time" hide />
                        <YAxis domain={['auto', 'auto']} hide />
                        <RechartsTooltip
                          separator=""
                          labelFormatter={(label) => label ? `${label}` : ''}
                          formatter={(value: any) => [`${value}`, '']}
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ color: modalContent.color, fontWeight: 'bold' }}
                          labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                          cursor={{ stroke: modalContent.color, strokeWidth: 1.5, strokeDasharray: '4 4' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          name="數值"
                          stroke={modalContent.color}
                          fill="url(#modalGradient)"
                          strokeWidth={2.5}
                          isAnimationActive={true}
                          animationDuration={500}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex items-start gap-3">
                <Icon name="lightbulb" className="text-primary mt-0.5" />
                <p className="text-sm text-primary leading-relaxed">
                  <span className="font-bold mr-1">當前分析：</span>
                  {modalContent.analysis}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};


const FinancialHighlights = ({ data }: { data?: FinancialHighlightsData }) => {
  if (!data) {
    return (
      <div className="bg-surface border border-surfaceLight rounded-xl p-6 flex flex-col items-center justify-center">
        <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2 self-start">
          <Icon name="insights" className="text-amber-500" />
          營運速覽
        </h3>
        <span className="text-textMuted text-sm py-8">暫無營運速覽資料</span>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-surfaceLight rounded-xl p-6">
      <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
        <Icon name="insights" className="text-amber-500" />
        營運速覽
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
        {/* 月營收 (懸浮擴張設計) */}
        <div className="relative w-full h-[140px] group">
          <div className="absolute inset-0 z-0 group-hover:z-50 p-4 bg-surfaceLight/20 border border-surfaceLight rounded-xl cursor-default transition-all duration-300 ease-out group-hover:-top-20 group-hover:-bottom-24 group-hover:-left-10 group-hover:-right-10 md:group-hover:-left-12 md:group-hover:-right-12 group-hover:bg-surface group-hover:shadow-2xl group-hover:shadow-primary/20 group-hover:border-primary/40 flex flex-col items-center justify-center overflow-hidden">

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center justify-center transition-transform duration-300 ease-out group-hover:-translate-y-8 w-full">
              <span className="text-sm font-bold text-textMuted mb-2 transition-transform duration-300 origin-bottom group-hover:scale-[2] group-hover:text-primary group-hover:-translate-y-8 whitespace-nowrap">最新月營收</span>
              <span className="text-2xl font-bold text-white mb-1 transition-transform duration-300 origin-center group-hover:scale-150 group-hover:-translate-y-2 whitespace-nowrap">{data.monthlyRevenue.value !== 'N/A' ? `${data.monthlyRevenue.value} 億` : 'N/A'}</span>
              <span className={`text-xs ${data.monthlyRevenue.yoy >= 0 ? 'text-up' : 'text-down'} transition-transform duration-300 origin-center group-hover:scale-110 group-hover:translate-y-1 whitespace-nowrap`}>
                YoY {data.monthlyRevenue.yoy >= 0 ? '+' : ''}{data.monthlyRevenue.yoy}%
              </span>
              {data.monthlyRevenue.value !== 'N/A' && (
                <span className={`text-xs mt-3 px-3 py-1 rounded-full border ${data.monthlyRevenue.yoy >= 0 ? 'bg-up/10 text-up border-up/20' : 'bg-down/10 text-down border-down/20'} transition-transform duration-300 origin-center group-hover:scale-110 group-hover:translate-y-3 whitespace-nowrap`}>
                  {data.monthlyRevenue.yoy >= 0 ? '持續成長' : '面臨衰退'}
                </span>
              )}
            </div>

            {/* Expanded Text */}
            <div className="absolute bottom-8 inset-x-0 mx-auto w-[240px] flex flex-col items-center opacity-0 translate-y-6 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto">
              <p className="text-sm text-white/90 font-medium text-center leading-relaxed tracking-wide drop-shadow-sm">
                表示公司最近一個月的營收規模。<br />正斜率 YoY 能證明需求相較去年擴大。
              </p>
            </div>
          </div>
        </div>

        {/* EPS */}
        <div className="relative w-full h-[140px] group">
          <div className="absolute inset-0 z-0 group-hover:z-50 p-4 bg-surfaceLight/20 border border-surfaceLight rounded-xl cursor-default transition-all duration-300 ease-out group-hover:-top-20 group-hover:-bottom-24 group-hover:-left-10 group-hover:-right-10 md:group-hover:-left-12 md:group-hover:-right-12 group-hover:bg-surface group-hover:shadow-2xl group-hover:shadow-emerald-500/10 group-hover:border-emerald-500/40 flex flex-col items-center justify-center overflow-hidden">

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center justify-center transition-transform duration-300 ease-out group-hover:-translate-y-8 w-full">
              <span className="text-sm font-bold text-textMuted mb-2 transition-transform duration-300 origin-bottom group-hover:scale-[2] group-hover:text-emerald-400 group-hover:-translate-y-8 whitespace-nowrap">近四季 EPS</span>
              <span className="text-xl md:text-2xl font-bold text-white mb-1 transition-transform duration-300 origin-center group-hover:scale-150 group-hover:-translate-y-2 whitespace-nowrap">{data.eps !== 'N/A' ? `${data.eps} 元` : 'N/A'}</span>
              {data.eps !== 'N/A' && (
                <span className={`text-xs mt-3 px-3 py-1 rounded-full border ${parseFloat(data.eps) > 0 ? 'bg-up/10 text-up border-up/20' : 'bg-down/10 text-down border-down/20'} transition-transform duration-300 origin-center group-hover:scale-110 group-hover:translate-y-3 whitespace-nowrap`}>
                  {parseFloat(data.eps) > 0 ? '保持獲利' : '目前虧損'}
                </span>
              )}
            </div>

            {/* Expanded Text */}
            <div className="absolute bottom-8 inset-x-0 mx-auto w-[240px] flex flex-col items-center opacity-0 translate-y-6 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto">
              <p className="text-sm text-white/90 font-medium text-center leading-relaxed tracking-wide drop-shadow-sm">
                過去 12 個月每股盈餘的總和。<br />數值越高表示潛在的賺錢能力越強。
              </p>
            </div>
          </div>
        </div>

        {/* 毛利率 */}
        <div className="relative w-full h-[140px] group">
          <div className="absolute inset-0 z-0 group-hover:z-50 p-4 bg-surfaceLight/20 border border-surfaceLight rounded-xl cursor-default transition-all duration-300 ease-out group-hover:-top-20 group-hover:-bottom-24 group-hover:-left-10 group-hover:-right-10 md:group-hover:-left-12 md:group-hover:-right-12 group-hover:bg-surface group-hover:shadow-2xl group-hover:shadow-amber-500/10 group-hover:border-amber-500/40 flex flex-col items-center justify-center overflow-hidden">

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center justify-center transition-transform duration-300 ease-out group-hover:-translate-y-8 w-full">
              <span className="text-sm font-bold text-textMuted mb-2 transition-transform duration-300 origin-bottom group-hover:scale-[2] group-hover:text-amber-400 group-hover:-translate-y-8 whitespace-nowrap">毛利率</span>
              <span className="text-2xl font-bold text-white mb-1 transition-transform duration-300 origin-center group-hover:scale-150 group-hover:-translate-y-2 whitespace-nowrap">{data.grossMargin?.toFixed(2)}%</span>
              {data.grossMargin !== undefined && (
                <span className={`text-xs mt-3 px-3 py-1 rounded-full border ${data.grossMargin >= 30 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : data.grossMargin >= 15 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'} transition-transform duration-300 origin-center group-hover:scale-110 group-hover:translate-y-3 whitespace-nowrap`}>
                  {data.grossMargin >= 30 ? '高毛利' : data.grossMargin >= 15 ? '表現穩定' : '仍需注意'}
                </span>
              )}
            </div>

            {/* Expanded Text */}
            <div className="absolute bottom-8 inset-x-0 mx-auto w-[240px] flex flex-col items-center opacity-0 translate-y-6 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto">
              <p className="text-sm text-white/90 font-medium text-center leading-relaxed tracking-wide drop-shadow-sm">
                反映產品附加價值。<br />越高代表能以低成本生產或具備強大定價能力。
              </p>
            </div>
          </div>
        </div>

        {/* 營益率 */}
        <div className="relative w-full h-[140px] group">
          <div className="absolute inset-0 z-0 group-hover:z-50 p-4 bg-surfaceLight/20 border border-surfaceLight rounded-xl cursor-default transition-all duration-300 ease-out group-hover:-top-20 group-hover:-bottom-24 group-hover:-left-12 group-hover:-right-4 md:group-hover:-left-20 md:group-hover:-right-4 group-hover:bg-surface group-hover:shadow-2xl group-hover:shadow-blue-500/10 group-hover:border-blue-500/40 flex flex-col items-center justify-center overflow-hidden">

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center justify-center transition-transform duration-300 ease-out group-hover:-translate-y-8 w-full">
              <span className="text-sm font-bold text-textMuted mb-2 transition-transform duration-300 origin-bottom group-hover:scale-[2] group-hover:text-blue-400 group-hover:-translate-y-8 whitespace-nowrap">營益率</span>
              <span className="text-2xl font-bold text-white mb-1 transition-transform duration-300 origin-center group-hover:scale-150 group-hover:-translate-y-2 whitespace-nowrap">{data.operatingMargin?.toFixed(2)}%</span>
              {data.operatingMargin !== undefined && (
                <span className={`text-xs mt-3 px-3 py-1 rounded-full border ${data.operatingMargin >= 15 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : data.operatingMargin >= 5 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'} transition-transform duration-300 origin-center group-hover:scale-110 group-hover:translate-y-3 whitespace-nowrap`}>
                  {data.operatingMargin >= 15 ? '本業強勁' : data.operatingMargin >= 5 ? '表現穩定' : '仍需注意'}
                </span>
              )}
            </div>

            {/* Expanded Text */}
            <div className="absolute bottom-8 inset-x-0 mx-auto w-[240px] flex flex-col items-center opacity-0 translate-y-6 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto">
              <p className="text-sm text-white/90 font-medium text-center leading-relaxed tracking-wide drop-shadow-sm">
                直接反映本業經營績效。<br />過低代表被隱性費用吃掉利潤。
              </p>
            </div>
          </div>
        </div>

        {/* 淨利率 */}
        <div className="relative w-full h-[140px] group">
          <div className="absolute inset-0 z-0 group-hover:z-50 p-4 bg-surfaceLight/20 border border-surfaceLight rounded-xl cursor-default transition-all duration-300 ease-out group-hover:-top-20 group-hover:-bottom-24 group-hover:-left-16 group-hover:-right-0 md:group-hover:-left-24 md:group-hover:-right-0 group-hover:bg-surface group-hover:shadow-2xl group-hover:shadow-purple-500/10 group-hover:border-purple-500/40 flex flex-col items-center justify-center overflow-hidden">

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center justify-center transition-transform duration-300 ease-out group-hover:-translate-y-8 w-full">
              <span className="text-sm font-bold text-textMuted mb-2 transition-transform duration-300 origin-bottom group-hover:scale-[2] group-hover:text-purple-400 group-hover:-translate-y-8 whitespace-nowrap">淨利率</span>
              <span className="text-2xl font-bold text-white mb-1 transition-transform duration-300 origin-center group-hover:scale-150 group-hover:-translate-y-2 whitespace-nowrap">{data.netMargin?.toFixed(2)}%</span>
              {data.netMargin !== undefined && (
                <span className={`text-xs mt-3 px-3 py-1 rounded-full border ${data.netMargin >= 10 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : data.netMargin > 0 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-down/10 text-down border-down/20'} transition-transform duration-300 origin-center group-hover:scale-110 group-hover:translate-y-3 whitespace-nowrap`}>
                  {data.netMargin >= 10 ? '獲利優異' : data.netMargin > 0 ? '表現穩定' : '面臨虧損'}
                </span>
              )}
            </div>

            {/* Expanded Text */}
            <div className="absolute bottom-8 inset-x-0 mx-auto w-[240px] flex flex-col items-center opacity-0 translate-y-6 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto">
              <p className="text-sm text-white/90 font-medium text-center leading-relaxed tracking-wide drop-shadow-sm">
                結合業外投資收入與稅務考量。<br />是最終實際能放入自己口袋真實獲利佔比。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PeerComparisonSection = ({ stockId }: { stockId: string }) => {
  const { data, isLoading, error } = usePeerComparison(stockId);

  if (isLoading) {
    return (
      <div className="bg-surface border border-surfaceLight rounded-xl p-6 flex items-center justify-center animate-pulse min-h-[200px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-textMuted text-sm">載入同業資料中...</p>
        </div>
      </div>
    );
  }

  if (error || !data || !data.peers || data.peers.length === 0) {
    return (
      <div className="bg-surface border border-surfaceLight rounded-xl p-6 flex flex-col items-center justify-center min-h-[200px]">
        <Icon name="compare_arrows" className="text-4xl text-surfaceLight mb-2" />
        <span className="text-textMuted text-sm">暫無同業比較資料</span>
      </div>
    );
  }

  return (
    <DynamicPeerComparison
      stockId={stockId}
      industrySector={data.industry}
      peers={data.peers}
      industryAverage={data.industryAverage}
    />
  );
};

const OwnershipSummary = ({ stockId }: { stockId: string }) => {
  const { data, isLoading, error } = useOwnershipData(stockId);

  const tooltipRef = React.useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const [tooltipState, setTooltipState] = useState<{
    visible: boolean;
    data: any | null;
  }>({
    visible: false,
    data: null,
  });

  const pieData = data ? [
    { name: '董監持股', value: data.directors, color: '#60a5fa', description: '主要經營團隊及大股東之持股狀況。' },
    { name: '外資持股', value: data.foreign, color: '#34d399', description: '外國法人對於台股的信心指標。' },
    { name: '投信持股', value: data.investmentTrust, color: '#fb7185', description: '國內資產管理公司法人部位。' },
    { name: '其他', value: Math.max(0, 100 - data.directors - data.foreign - data.investmentTrust), color: '#475569', description: '散戶與其他未揭露之法人持股。' }
  ] : [];

  const handlePieEnter = (data: any, index: number, e: React.MouseEvent) => {
    setHoveredIndex(index);
    setTooltipState({
      visible: true,
      data: data.payload || data,
    });
    if (tooltipRef.current && e && e.clientX !== undefined) {
      tooltipRef.current.style.left = `${e.clientX + 15}px`;
      tooltipRef.current.style.top = `${e.clientY + 15}px`;
    }
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (tooltipRef.current) {
      tooltipRef.current.style.left = `${e.clientX + 15}px`;
      tooltipRef.current.style.top = `${e.clientY + 15}px`;
    }
  };

  const handlePieLeave = () => {
    setHoveredIndex(null);
    setTooltipState((prev) => ({ ...prev, visible: false }));
  };

  const handleContainerMouseLeave = () => {
    setHoveredIndex(null);
    setTooltipState((prev) => ({ ...prev, visible: false }));
  };

  return (
    <div className="bg-surface border border-surfaceLight rounded-xl p-6 relative">
      <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
        <Icon name="groups" className="text-indigo-400" />
        股權與籌碼摘要
      </h3>

      {isLoading ? (
        <div className="space-y-4 animate-pulse pt-4">
          <div className="h-48 w-48 mx-auto bg-surfaceLight rounded-full"></div>
          <div className="flex justify-center gap-4 mt-6">
            <div className="h-4 w-16 bg-surfaceLight rounded"></div>
            <div className="h-4 w-16 bg-surfaceLight rounded"></div>
            <div className="h-4 w-16 bg-surfaceLight rounded"></div>
          </div>
        </div>
      ) : error || !data ? (
        <div className="py-12 text-center">
          <span className="text-textMuted text-sm">暫無股權資料</span>
        </div>
      ) : (
        <div className="flex flex-col gap-6 mt-2">
          {/* Pie Chart Top Section */}
          <div
            className="h-[250px] w-full relative"
            onMouseMove={handleContainerMouseMove}
            onMouseLeave={handleContainerMouseLeave}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart onMouseLeave={handleContainerMouseLeave}>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={4}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  stroke="none"
                  isAnimationActive={false} // Disable initial load animation to strictly enforce pure CSS hardware acceleration
                  onMouseEnter={handlePieEnter}
                  onMouseLeave={handlePieLeave}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      className="transition-all duration-300 ease-out cursor-pointer outline-none transform-gpu will-change-transform pointer-events-auto"
                      style={{
                        transformOrigin: '50% 45%',
                        transformBox: 'view-box',
                        opacity: hoveredIndex === index ? 1 : 0.9,
                        transform: hoveredIndex === index ? 'scale(1.1)' : 'scale(1)',
                        filter: hoveredIndex === index ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))' : 'none'
                      }}
                    />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  content={() => (
                    <ul className="flex flex-wrap justify-center gap-x-5 gap-y-3 mt-1">
                      {pieData.map((entry, index) => (
                        <li
                          key={`item-${index}`}
                          className="flex items-center text-sm px-2 py-1 rounded-md transition-all duration-200 cursor-default hover:bg-white/5 opacity-80 hover:opacity-100"
                        >
                          <span className="w-3.5 h-3.5 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
                          <span className="text-textMuted transition-colors">{entry.name}</span>
                          <span className="text-white font-medium ml-1.5">
                            {entry.value.toFixed(1)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Custom Tooltip */}
            <div
              ref={tooltipRef}
              className={`fixed pointer-events-none z-[110] bg-surfaceLight border border-slate-600 p-3 rounded-lg shadow-xl shadow-black/50 transition-opacity duration-300 ease-in-out ${tooltipState.visible ? 'opacity-100' : 'opacity-0'}`}
              style={{
                left: -9999, // default off screen to prevent initial flash
                top: -9999,
                transform: 'translate(0, 0)',
              }}
            >
              {tooltipState.data && (
                <>
                  <div className="font-bold text-white flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tooltipState.data.color }}></span>
                    {tooltipState.data.name}: {tooltipState.data.value.toFixed(2)}%
                  </div>
                  <div className="text-xs text-textMuted max-w-[200px]">
                    {tooltipState.data.description}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Separator */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-surfaceLight to-transparent my-1"></div>

          {/* New Equity Metric Cards Bottom Section */}
          <div className="grid grid-cols-2 gap-3 h-fit mt-1">
            {/* 1. 發行總張數 (Total Shares) */}
            <div className="relative w-full h-[140px] group col-span-2">
              <div className="absolute inset-0 z-0 group-hover:z-50 p-4 bg-surfaceLight/20 border border-surfaceLight rounded-xl cursor-default transition-all duration-300 ease-out group-hover:-top-4 group-hover:-bottom-20 group-hover:-inset-x-4 group-hover:bg-surface group-hover:shadow-2xl group-hover:shadow-blue-500/10 group-hover:border-blue-500/40 flex flex-col items-center justify-center overflow-hidden">
                <div className="relative z-10 flex flex-col items-center justify-center transition-transform duration-300 ease-out group-hover:-translate-y-6 w-full">
                  <div className="flex items-center gap-2 mb-2 transition-transform duration-300 origin-bottom group-hover:scale-[1.8] group-hover:text-blue-400 group-hover:-translate-y-6">
                    <Icon name="account_balance" className="text-blue-500/70 text-sm" />
                    <span className="text-sm font-bold text-textMuted group-hover:text-blue-400 transition-colors">發行總張數</span>
                  </div>
                  <span className="text-2xl font-bold text-white transition-transform duration-300 origin-center group-hover:scale-[1.4] group-hover:-translate-y-1">
                    {data.totalShares ? (data.totalShares / 10).toLocaleString('en-US', { maximumFractionDigits: 1 }) : '-'} 萬張
                  </span>
                  {data.totalShares !== undefined && (
                    <span className={`text-xs mt-3 px-3 py-1 rounded-full border transition-transform duration-300 origin-center group-hover:scale-110 group-hover:translate-y-4 whitespace-nowrap ${data.totalShares > 1000000 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : data.totalShares < 100000 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                      {data.totalShares > 1000000 ? '大型權值股' : data.totalShares < 100000 ? '小型潛力股' : '中型穩健股'}
                    </span>
                  )}
                </div>
                <div className="absolute bottom-6 inset-x-0 mx-auto w-[90%] flex flex-col items-center opacity-0 translate-y-4 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto">
                  <p className="text-xs text-white/90 font-medium text-center leading-relaxed tracking-wide drop-shadow-sm">
                    公司發行在外的全部股票總數。<br />代表整體的資本規模與市場胃納量基準。
                  </p>
                </div>
              </div>
            </div>

            {/* 2. 散戶持股比例 (Retail Ratio) */}
            <div className="relative w-full aspect-square group">
              <div className="absolute inset-0 z-0 group-hover:z-50 p-4 bg-surfaceLight/20 border border-surfaceLight rounded-xl cursor-default transition-all duration-300 ease-out group-hover:-top-6 group-hover:-bottom-24 group-hover:-left-6 group-hover:-right-8 group-hover:bg-surface group-hover:shadow-2xl group-hover:shadow-amber-500/10 group-hover:border-amber-500/40 flex flex-col items-center justify-center overflow-hidden">
                <div className="relative z-10 flex flex-col items-center justify-center transition-transform duration-300 ease-out group-hover:-translate-y-6 w-full">
                  <div className="flex items-center gap-2 mb-2 transition-transform duration-300 origin-bottom group-hover:scale-[1.8] group-hover:text-amber-400 group-hover:-translate-y-6">
                    <Icon name="person" className="text-amber-500/70 text-sm" />
                    <span className="text-sm font-bold text-textMuted group-hover:text-amber-400 transition-colors">散戶比例</span>
                  </div>
                  <span className="text-2xl font-bold text-white transition-transform duration-300 origin-center group-hover:scale-[1.4] group-hover:-translate-y-1">
                    {data.retailRatio !== undefined ? data.retailRatio.toFixed(1) : '-'}%
                  </span>
                  {data.retailRatio !== undefined && (
                    <span className={`text-xs mt-3 px-3 py-1 rounded-full border transition-transform duration-300 origin-center group-hover:scale-110 group-hover:translate-y-4 whitespace-nowrap ${data.retailRatio < 10 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : data.retailRatio > 30 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                      {data.retailRatio < 10 ? '籌碼極度安定' : data.retailRatio > 30 ? '籌碼較為凌亂' : '比例適中'}
                    </span>
                  )}
                </div>
                <div className="absolute bottom-6 inset-x-0 mx-auto w-[90%] flex flex-col items-center opacity-0 translate-y-4 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto">
                  <p className="text-xs text-white/90 font-medium text-center leading-relaxed tracking-wide drop-shadow-sm">
                    散戶持有的籌碼比例。<br />過高代表籌碼較為分散凌亂，需留意潛在賣壓。
                  </p>
                </div>
              </div>
            </div>

            {/* 3. 大戶內部人數 (Major Shareholders Count) */}
            <div className="relative w-full aspect-square group">
              <div className="absolute inset-0 z-0 group-hover:z-50 p-4 bg-surfaceLight/20 border border-surfaceLight rounded-xl cursor-default transition-all duration-300 ease-out group-hover:-top-6 group-hover:-bottom-24 group-hover:-left-8 group-hover:-right-6 group-hover:bg-surface group-hover:shadow-2xl group-hover:shadow-emerald-500/10 group-hover:border-emerald-500/40 flex flex-col items-center justify-center overflow-hidden">
                <div className="relative z-10 flex flex-col items-center justify-center transition-transform duration-300 ease-out group-hover:-translate-y-6 w-full">
                  <div className="flex items-center gap-2 mb-2 transition-transform duration-300 origin-bottom group-hover:scale-[1.8] group-hover:text-emerald-400 group-hover:-translate-y-6">
                    <Icon name="groups" className="text-emerald-500/70 text-sm" />
                    <span className="text-sm font-bold text-textMuted group-hover:text-emerald-400 transition-colors">大戶人數</span>
                  </div>
                  <span className="text-2xl font-bold text-white transition-transform duration-300 origin-center group-hover:scale-[1.4] group-hover:-translate-y-1">
                    {data.majorShareholdersCount !== undefined ? data.majorShareholdersCount : '-'} <span className="text-sm text-textMuted font-normal group-hover:text-white transition-colors">人</span>
                  </span>
                  {data.majorShareholdersCount !== undefined && (
                    <span className={`text-xs mt-3 px-3 py-1 rounded-full border transition-transform duration-300 origin-center group-hover:scale-110 group-hover:translate-y-4 whitespace-nowrap ${data.majorShareholdersCount > 50 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : data.majorShareholdersCount < 10 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                      {data.majorShareholdersCount > 50 ? '籌碼高度集中' : data.majorShareholdersCount < 10 ? '大戶動能較弱' : '集中度穩定'}
                    </span>
                  )}
                </div>
                <div className="absolute bottom-6 inset-x-0 mx-auto w-[90%] flex flex-col items-center opacity-0 translate-y-4 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto">
                  <p className="text-xs text-white/90 font-medium text-center leading-relaxed tracking-wide drop-shadow-sm">
                    掌握大量籌碼的關鍵大戶人數。<br />可作為評估籌碼集中度與大戶動向的參考基準。
                  </p>
                </div>
              </div>
            </div>

            {/* 4. 董監質設比例 (Director Pledge Ratio) */}
            <div className="relative w-full aspect-square group">
              <div className="absolute inset-0 z-0 group-hover:z-50 p-4 bg-surfaceLight/20 border border-surfaceLight rounded-xl cursor-default transition-all duration-300 ease-out group-hover:-top-6 group-hover:-bottom-24 group-hover:-left-6 group-hover:-right-8 group-hover:bg-surface group-hover:shadow-2xl group-hover:shadow-rose-500/10 group-hover:border-rose-500/40 flex flex-col items-center justify-center overflow-hidden">
                <div className="relative z-10 flex flex-col items-center justify-center transition-transform duration-300 ease-out group-hover:-translate-y-6 w-full">
                  <div className="flex items-center gap-2 mb-2 transition-transform duration-300 origin-bottom group-hover:scale-[1.8] group-hover:text-rose-400 group-hover:-translate-y-6">
                    <Icon name="warning" className="text-rose-500/70 text-sm" />
                    <span className="text-sm font-bold text-textMuted group-hover:text-rose-400 transition-colors">董監質設</span>
                  </div>
                  <span className={`text-2xl font-bold transition-transform duration-300 origin-center group-hover:scale-[1.4] group-hover:-translate-y-1 ${data.directorPledgeRatio !== undefined && data.directorPledgeRatio > 5 ? 'text-rose-400' : 'text-white'}`}>
                    {data.directorPledgeRatio !== undefined ? data.directorPledgeRatio.toFixed(1) : '-'}%
                  </span>
                  {data.directorPledgeRatio !== undefined && (
                    <span className={`text-xs mt-3 px-3 py-1 rounded-full border transition-transform duration-300 origin-center group-hover:scale-110 group-hover:translate-y-4 whitespace-nowrap ${data.directorPledgeRatio === 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : data.directorPledgeRatio > 10 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                      {data.directorPledgeRatio === 0 ? '無質押風險' : data.directorPledgeRatio > 10 ? '質押風險偏高' : '需持續留意'}
                    </span>
                  )}
                </div>
                <div className="absolute bottom-6 inset-x-0 mx-auto w-[90%] flex flex-col items-center opacity-0 translate-y-4 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto">
                  <p className="text-xs text-white/90 font-medium text-center leading-relaxed tracking-wide drop-shadow-sm">
                    董監事將持股向銀行抵押借款的比率。<br />若居高不下，需特別防範潛在的斷頭賣壓。
                  </p>
                </div>
              </div>
            </div>

            {/* 5. 外資持股上限 (Foreign Limit) */}
            <div className="relative w-full aspect-square group">
              <div className="absolute inset-0 z-0 group-hover:z-50 p-4 bg-surfaceLight/20 border border-surfaceLight rounded-xl cursor-default transition-all duration-300 ease-out group-hover:-top-6 group-hover:-bottom-24 group-hover:-left-8 group-hover:-right-6 group-hover:bg-surface group-hover:shadow-2xl group-hover:shadow-indigo-500/10 group-hover:border-indigo-500/40 flex flex-col items-center justify-center overflow-hidden">
                <div className="relative z-10 flex flex-col items-center justify-center transition-transform duration-300 ease-out group-hover:-translate-y-6 w-full">
                  <div className="flex items-center gap-2 mb-2 transition-transform duration-300 origin-bottom group-hover:scale-[1.8] group-hover:text-indigo-400 group-hover:-translate-y-6">
                    <Icon name="public" className="text-indigo-500/70 text-sm" />
                    <span className="text-sm font-bold text-textMuted group-hover:text-indigo-400 transition-colors">外資上限</span>
                  </div>
                  <span className="text-2xl font-bold text-white transition-transform duration-300 origin-center group-hover:scale-[1.4] group-hover:-translate-y-1">
                    {data.foreignLimit === 100 ? '無上限' : (data.foreignLimit !== undefined ? `${data.foreignLimit.toFixed(1)}%` : '-')}
                  </span>
                  {data.foreignLimit !== undefined && (
                    <span className={`text-xs mt-3 px-3 py-1 rounded-full border transition-transform duration-300 origin-center group-hover:scale-110 group-hover:translate-y-4 whitespace-nowrap ${data.foreignLimit === 100 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                      {data.foreignLimit === 100 ? '買盤動能無虞' : '外資買進受限'}
                    </span>
                  )}
                </div>
                <div className="absolute bottom-6 inset-x-0 mx-auto w-[90%] flex flex-col items-center opacity-0 translate-y-4 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto">
                  <p className="text-xs text-white/90 font-medium text-center leading-relaxed tracking-wide drop-shadow-sm">
                    法規限制外資能持有的最高比例。<br />達上限後外資將無法買進，可能限制後續動能。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- New Tab Components ---

const CompanyProfile = ({ stockId }: { stockId: string }) => {
  const { data: profile, isLoading, error } = useCompanyProfile(stockId);
  const { data: dividends, isLoading: isDivLoading } = useDividends(stockId);
  const { data: revenueMix, isLoading: isRevLoading } = useRevenueMix(stockId);

  if (isLoading || isDivLoading || isRevLoading) {
    return (
      <div className="flex flex-col gap-6 items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-textMuted">載入資料中...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col gap-6 items-center justify-center p-12 bg-surface/50 rounded-xl border border-surfaceLight">
        <Icon name="error_outline" className="text-4xl text-rose-500 mb-2" />
        <p className="text-white font-medium">無法載入公司基本資料</p>
        <p className="text-sm text-textMuted">請稍後再試或確認網路連線</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <ValuationMetrics stockId={stockId} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <FinancialHighlights data={profile.financialHighlights} />

          <div className="bg-surface border border-surfaceLight rounded-xl p-6">
            <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
              <Icon name="business" className="text-primary" />
              基本資料
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <div className="flex justify-between border-b border-surfaceLight pb-2">
                <span className="text-textMuted">股票掛牌</span>
                <span className="text-white font-medium">{profile.name} ({profile.id})</span>
              </div>
              <div className="flex justify-between border-b border-surfaceLight pb-2">
                <span className="text-textMuted">產業類別</span>
                <span className="text-white font-medium">{profile.industry}</span>
              </div>
              <div className="flex justify-between border-b border-surfaceLight pb-2">
                <span className="text-textMuted">板塊分類</span>
                <span className="text-white font-medium">{profile.sector}</span>
              </div>
              <div className="flex justify-between border-b border-surfaceLight pb-2">
                <span className="text-textMuted">董事長</span>
                <span className="text-white font-medium">{profile.chairman}</span>
              </div>
              <div className="flex justify-between border-b border-surfaceLight pb-2">
                <span className="text-textMuted">總經理</span>
                <span className="text-white font-medium">{profile.ceo}</span>
              </div>
              <div className="flex justify-between border-b border-surfaceLight pb-2">
                <span className="text-textMuted">實收資本額</span>
                <span className="text-white font-medium">{profile.capital}</span>
              </div>
              <div className="flex justify-between border-b border-surfaceLight pb-2">
                <span className="text-textMuted">成立日期</span>
                <span className="text-white font-medium">{profile.foundedDate}</span>
              </div>
              <div className="flex justify-between border-b border-surfaceLight pb-2">
                <span className="text-textMuted">上市日期</span>
                <span className="text-white font-medium">{profile.listingDate}</span>
              </div>
              <div className="flex justify-between border-b border-surfaceLight pb-2">
                <span className="text-textMuted">公司網址</span>
                <a href={profile.website !== 'N/A' ? profile.website : '#'} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">
                  {profile.website !== 'N/A' ? '前往網站' : 'N/A'}
                </a>
              </div>
              <div className="flex justify-between border-b border-surfaceLight pb-2">
                <span className="text-textMuted">員工人數</span>
                <span className="text-white font-medium">{profile.fullTimeEmployees !== 'N/A' ? `${profile.fullTimeEmployees.toLocaleString()} 人` : 'N/A'}</span>
              </div>
            </div>
            <div className="mt-6">
              <h4 className="text-sm font-bold text-textMuted mb-2">公司簡介</h4>
              <p className="text-sm text-textMuted leading-relaxed whitespace-pre-wrap">
                {profile.description}
              </p>
            </div>
          </div>

          <PeerComparisonSection stockId={stockId} />

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
                  {(dividends || []).map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-surfaceLight/30">
                      <td className="px-4 py-3 text-left font-medium">{row.year}</td>
                      <td className="px-4 py-3">{row.cash}</td>
                      <td className="px-4 py-3">{row.stock}</td>
                      <td className="px-4 py-3 font-bold text-emerald-400">{(row.cash + row.stock).toFixed(2)}</td>
                      <td className="px-4 py-3 text-textMuted">{row.date}</td>
                    </tr>
                  ))}
                  {(!dividends || dividends.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-textMuted">暫無股利資料</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <OwnershipSummary stockId={stockId} />



          <div className="h-[400px]">
            <CompanyNews stockId={stockId} />
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

const StockDetail: React.FC<{ stockId: string, onNavigateHome?: () => void, onNavigateToStock?: (id: string) => void }> = ({ stockId = "2330", onNavigateHome, onNavigateToStock }) => {
  const [activeTab, setActiveTab] = useState<StockTab>(StockTab.PROFILE); // Default set to PROFILE
  const [activeSubTab, setActiveSubTab] = useState<FinancialSubTab>(FinancialSubTab.INCOME);
  const { data: profile } = useCompanyProfile(stockId);

  // Reset tabs when stockId changes (e.g., from searching a new stock)
  useEffect(() => {
    setActiveTab(StockTab.PROFILE);
    setActiveSubTab(FinancialSubTab.INCOME);
  }, [stockId]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap text-sm font-medium text-textMuted">
        <ol className="flex items-center gap-2">
          <li className="cursor-pointer hover:text-primary transition-colors flex items-center gap-1" onClick={onNavigateHome}>
            <Icon name="home" className="text-[16px]" />
            首頁
          </li>
          <li><Icon name="chevron_right" className="text-xs" /></li>
          <li className="cursor-pointer hover:text-primary transition-colors" onClick={onNavigateHome}>台股市場</li>
          <li><Icon name="chevron_right" className="text-xs" /></li>
          <li className="text-white font-bold">{profile ? `${profile.name} (${profile.id})` : `股票代碼 (${stockId})`}</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
              {profile ? `${profile.name} (${profile.id})` : stockId}
            </h1>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
              {profile ? profile.industry : '載入中'}
            </span>
          </div>
          <p className="text-textMuted text-sm md:text-base max-w-2xl truncate">
            {profile ? profile.description : '公司簡介資料載入中...'}
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
      {activeTab === StockTab.PROFILE && <CompanyProfile stockId={stockId} />}
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