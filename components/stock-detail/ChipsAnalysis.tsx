import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Icon } from '../../App';
import { AIAnalysisCard } from '../AIAnalysisCard';
import { api } from '../../services/api';

export const ChipsAnalysis = ({ stockId }: { stockId: string }) => {
  const [chipsData, setChipsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!stockId) return;
    const fetchChips = async () => {
      try {
        setIsLoading(true);
        const res = await api.getChips(stockId);
        if (res.status === 'success') {
          setChipsData(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch chips data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChips();
  }, [stockId]);

  if (isLoading || !chipsData) {
    return (
      <div className="flex justify-center items-center h-64 bg-surface rounded-xl border border-surfaceLight/50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <span className="text-textMuted text-sm font-bold">載入籌碼數據中...</span>
        </div>
      </div>
    );
  }

  const { history, concentration } = chipsData;
  const latestChips = history && history.length > 0 ? history[history.length - 1] : { foreign_net: 0, trust_net: 0, dealer_net: 0 };
  
  // 準備圖表資料
  const chartData = (history || []).map((h: any) => ({
    date: h.date.substring(5), // 只顯示 MM-DD
    foreign: h.foreign_net,
    trust: h.trust_net,
    dealer: h.dealer_net
  }));

  const formatNet = (val: number) => {
    const rounded = Math.round(val);
    if (rounded > 0) return `+${rounded.toLocaleString()} 張`;
    return `${rounded.toLocaleString()} 張`;
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-surfaceLight rounded-xl p-5 flex flex-col items-center text-center">
          <p className="text-sm text-textMuted mb-2">外資買賣超 (最新)</p>
          <p className={`text-2xl font-bold ${latestChips.foreign_net > 0 ? 'text-up' : latestChips.foreign_net < 0 ? 'text-down' : 'text-white'}`}>
            {formatNet(latestChips.foreign_net)}
          </p>
        </div>
        <div className="bg-surface border border-surfaceLight rounded-xl p-5 flex flex-col items-center text-center">
          <p className="text-sm text-textMuted mb-2">投信買賣超 (最新)</p>
          <p className={`text-2xl font-bold ${latestChips.trust_net > 0 ? 'text-up' : latestChips.trust_net < 0 ? 'text-down' : 'text-white'}`}>
            {formatNet(latestChips.trust_net)}
          </p>
        </div>
        <div className="bg-surface border border-surfaceLight rounded-xl p-5 flex flex-col items-center text-center">
          <p className="text-sm text-textMuted mb-2">自營商買賣超 (最新)</p>
          <p className={`text-2xl font-bold ${latestChips.dealer_net > 0 ? 'text-up' : latestChips.dealer_net < 0 ? 'text-down' : 'text-white'}`}>
            {formatNet(latestChips.dealer_net)}
          </p>
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
            {chartData.length > 0 ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}
                />
                <Legend />
                <Bar dataKey="foreign" name="外資" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="trust" name="投信" fill="#10b981" radius={[2, 2, 0, 0]} />
                <Bar dataKey="dealer" name="自營商" fill="#f59e0b" radius={[2, 2, 0, 0]} />
              </BarChart>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-textMuted text-sm border border-dashed border-surfaceLight rounded-lg">無近期買賣超數據</div>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-surface border border-surfaceLight rounded-xl p-6">
        <h3 className="text-white text-lg font-bold mb-4">籌碼集中度分析</h3>
        <p className="text-sm text-textMuted leading-relaxed">
          根據集保戶股權分散資料推估，目前大戶持股比例（&gt;400張）約為 <span className="text-white font-bold">{concentration?.largeHolders}%</span>，散戶持股比例（&lt;10張）約為 <span className="text-white font-bold">{concentration?.retailHolders}%</span>。
          {concentration?.largeHolders > 75 ? " 籌碼相對集中，顯示大戶與主力信心充足，利於股價表現。" : " 籌碼分散程度中等，可能較易受市場情緒波動影響。"}
        </p>
      </div>

      {/* AI Analysis */}
      <AIAnalysisCard type="chips" title="籌碼面智能分析" defaultExpanded={true} />
    </div>
  );
};
