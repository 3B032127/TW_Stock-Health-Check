import React from 'react';
import { Icon } from '../../App';
import { SparklineChart } from './SparklineChart';

export const MetricCard = ({ category, items, score = 0 }: { category: string; items: any[], score?: number }) => {
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

  return (
    <div className="rounded-xl bg-surface p-6 shadow-sm border border-surfaceLight flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${getBgColor(category)}`}>
            <Icon name={getIcon(category)} />
          </div>
          <h3 className="text-lg font-bold text-white">{getTitle(category)}</h3>
        </div>
        <span className={`text-4xl font-black ${getColor(category)}`}>
          {score}<span className="text-lg text-textMuted font-normal">/100</span>
        </span>
      </div>

      <div className="space-y-3 flex-1">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between py-3 px-4 rounded-xl bg-surfaceLight/10 hover:bg-surfaceLight/30 transition-all duration-300">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-textMuted uppercase tracking-wider">{item.label}</span>
              <span className="text-xl font-black text-white">{item.value}</span>
            </div>
            <div className="flex items-center gap-4">
              {item.sparkline && (
                <div className="hidden sm:block">
                  <SparklineChart 
                    data={item.sparkline.map((v: number, i: number) => ({ time: i.toString(), value: v }))}
                    color={item.status === 'pass' ? '#10b981' : item.status === 'fail' ? '#f43f5e' : '#f59e0b'}
                  />
                </div>
              )}
              <span className="text-xs text-textMuted hidden sm:block font-medium">目標: {item.target}</span>
              {item.status === 'pass' && (
                <span className="px-3 py-1 rounded-lg text-sm font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/10">通過</span>
              )}
              {item.status === 'fail' && (
                <span className="px-3 py-1 rounded-lg text-sm font-black bg-rose-500/20 text-rose-400 border border-rose-500/20 shadow-sm shadow-rose-500/10">失敗</span>
              )}
              {item.status === 'neutral' && (
                <span className="px-3 py-1 rounded-lg text-sm font-black bg-amber-500/20 text-amber-400 border border-amber-500/20 shadow-sm shadow-amber-500/10">持平</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
