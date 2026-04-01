import React from 'react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Icon } from '../../App';
import { FinancialSubTab } from '../../types';

export const FinancialChart = ({ subTab, chartData }: { subTab: FinancialSubTab, chartData: any[] }) => {
  let title = '';
  let bars = null;

  switch (subTab) {
    case FinancialSubTab.INCOME:
      title = '季度營收與淨利趨勢';
      bars = (
        <>
          <Bar dataKey="revenue" name="營業收入(億)" fill="#135bec" radius={[2, 2, 0, 0]} barSize={30} />
          <Bar dataKey="netIncome" name="稅後淨利(億)" fill="#06b6d4" radius={[2, 2, 0, 0]} barSize={30} />
        </>
      );
      break;
    case FinancialSubTab.BALANCE:
      title = '資產、負債與權益趨勢';
      bars = (
        <>
          <Bar dataKey="assets" name="總資產(億)" fill="#10b981" radius={[2, 2, 0, 0]} barSize={20} />
          <Bar dataKey="equity" name="股東權益(億)" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={20} />
          <Bar dataKey="liabilities" name="總負債(億)" fill="#ef4444" radius={[2, 2, 0, 0]} barSize={20} />
        </>
      );
      break;
    case FinancialSubTab.CASH_FLOW:
      title = '現金流量趨勢';
      bars = (
        <>
          <Bar dataKey="operating" name="營業現金流(億)" fill="#10b981" radius={[2, 2, 0, 0]} barSize={20} />
          <Bar dataKey="investing" name="投資現金流(億)" fill="#f59e0b" radius={[2, 2, 0, 0]} barSize={20} />
          <Bar dataKey="financing" name="籌資現金流(億)" fill="#6366f1" radius={[2, 2, 0, 0]} barSize={20} />
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
          <BarChart data={chartData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="quarter" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
            <RechartsTooltip
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                borderColor: '#334155', 
                borderRadius: '12px', 
                padding: '12px 16px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' 
              }}
              labelStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}
              itemStyle={{ fontSize: '14px', fontWeight: 'bold', padding: '2px 0' }}
              formatter={(value: number) => [`${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 億元`, null]}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {bars}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
