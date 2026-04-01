import React from 'react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Icon } from '../../App';
import { CHIPS_TREND_DATA } from '../../constants';
import { AIAnalysisCard } from '../AIAnalysisCard';

export const ChipsAnalysis = () => {
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
