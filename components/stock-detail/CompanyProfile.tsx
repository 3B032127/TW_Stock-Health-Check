import React from 'react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import { Icon } from '../../App';
import { useCompanyProfile } from '../../hooks/useCompanyProfile';
import { useDividends } from '../../hooks/useDividends';
import { useRevenueMix } from '../../hooks/useRevenueMix';
import { ValuationMetrics } from './ValuationMetrics';
import { FinancialHighlights } from './FinancialHighlights';
import { OwnershipSummary } from './OwnershipSummary';
import { DynamicPeerComparison } from '../DynamicPeerComparison';
import CompanyNews from '../CompanyNews';
import { usePeerComparison } from '../../hooks/usePeerComparison';

// We also need PeerComparisonSection inside CompanyProfile or as a separate component.
// It was defined right before RealTimeQuote in the original file, so I will include it here.

const PeerComparisonSection = ({ stockId }: { stockId: string }) => {
  const { data, isLoading, error } = usePeerComparison(stockId);

  if (error || (!data && !isLoading) || !data?.peers || data.peers.length === 0) {
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

export const CompanyProfile = ({ stockId }: { stockId: string }) => {
  const { data: profile, isLoading, error } = useCompanyProfile(stockId);
  const { data: dividends } = useDividends(stockId);

  if (error || (!profile && !isLoading)) {
    return (
      <div className="flex flex-col gap-6 items-center justify-center p-12 bg-surface/50 rounded-xl border border-surfaceLight">
        <Icon name="error_outline" className="text-4xl text-rose-500 mb-2" />
        <p className="text-white font-medium">無法載入公司基本資料</p>
        <p className="text-sm text-textMuted">請稍後再試或確認網路連線</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <ValuationMetrics stockId={stockId} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <FinancialHighlights data={profile.financialHighlights} />

          <div className="h-[500px]">
            <CompanyNews stockId={stockId} />
          </div>

          <PeerComparisonSection stockId={stockId} />

          <div className="bg-surface border border-surfaceLight rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white text-lg font-bold flex items-center gap-2">
                <Icon name="paid" className="text-emerald-500" />
                股利政策與配息趨勢
              </h3>
              {dividends && dividends.length > 0 && (
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500"></span>現金股利</div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500"></span>股票股利</div>
                </div>
              )}
            </div>

            {dividends && dividends.length > 0 ? (
              <div className="flex flex-col gap-6">
                {/* 頂部快速指標 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-surfaceLight/20 p-3 rounded-lg border border-surfaceLight/30">
                    <p className="text-[10px] text-textMuted font-bold uppercase mb-1">近 5 年平均</p>
                    <p className="text-xl font-bold text-white">
                      {(dividends.slice(0, 5).reduce((acc: number, curr: any) => acc + curr.cash + curr.stock, 0) / Math.min(5, dividends.length)).toFixed(2)} <span className="text-xs font-normal text-textMuted">元</span>
                    </p>
                  </div>
                  <div className="bg-surfaceLight/20 p-3 rounded-lg border border-surfaceLight/30">
                    <p className="text-[10px] text-textMuted font-bold uppercase mb-1">最新總額</p>
                    <p className="text-xl font-bold text-emerald-400">
                      {(dividends[0].cash + dividends[0].stock).toFixed(2)} <span className="text-xs font-normal text-textMuted">元</span>
                    </p>
                  </div>
                  <div className="bg-surfaceLight/20 p-3 rounded-lg border border-surfaceLight/30">
                    <p className="text-[10px] text-textMuted font-bold uppercase mb-1">配息連續性</p>
                    <p className="text-xl font-bold text-blue-400">
                      {dividends.length} <span className="text-xs font-normal text-textMuted">年</span>
                    </p>
                  </div>
                  <div className="bg-surfaceLight/20 p-3 rounded-lg border border-surfaceLight/30">
                    <p className="text-[10px] text-textMuted font-bold uppercase mb-1">配息穩定度</p>
                    <p className="text-xl font-bold text-amber-400">
                      優
                    </p>
                  </div>
                </div>

                {/* 股利趨勢圖表 */}
                <div className="h-64 w-full bg-surfaceLight/10 rounded-xl p-4 border border-surfaceLight/20">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...dividends].reverse()} barGap={0}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.3} />
                      <XAxis 
                        dataKey="year" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10 }} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                      />
                      <RechartsTooltip
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="cash" name="現金股利" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={24} />
                      <Bar dataKey="stock" name="股票股利" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* 詳細數據表格 */}
                <div className="overflow-x-auto rounded-xl border border-surfaceLight/50">
                  <table className="w-full text-sm text-right">
                    <thead className="bg-surfaceLight/50 text-textMuted uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-4 py-3 text-left">發放年度</th>
                        <th className="px-4 py-3">現金股利</th>
                        <th className="px-4 py-3">股票股利</th>
                        <th className="px-4 py-3">合計金額</th>
                        <th className="px-4 py-3">除息日期</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surfaceLight/30 text-white">
                      {(dividends || []).map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-surfaceLight/30 transition-colors group">
                          <td className="px-4 py-3 text-left font-bold text-slate-300">{row.year}</td>
                          <td className="px-4 py-3 text-emerald-400 font-mono">{row.cash.toFixed(2)}</td>
                          <td className="px-4 py-3 text-blue-400 font-mono">{row.stock.toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-xs font-bold border border-emerald-500/10">
                              {(row.cash + row.stock).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-textMuted text-xs font-mono">{row.date || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 bg-surfaceLight/5 rounded-xl border border-dashed border-surfaceLight">
                <Icon name="event_busy" className="text-4xl text-surfaceLight mb-2" />
                <p className="text-textMuted text-sm">暫無股利政策資料</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-surface border border-surfaceLight rounded-xl p-6">
            <h3 className="text-white text-md font-bold mb-4 flex items-center gap-2 border-b border-surfaceLight pb-4">
              <Icon name="business" className="text-primary" />
              基本資料與產業排名
            </h3>
            
            <div className="space-y-5">
              {/* 產業排名看板 */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 group hover:border-primary/30 transition-all">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] text-textMuted font-black uppercase tracking-widest">產業地位</span>
                  <div className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">
                    {profile.ranking?.industry || profile.industry}
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-textMuted">市值排名</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-primary font-black text-3xl italic drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]">
                      #{profile.ranking?.rank || '-'}
                    </span>
                    <span className="text-xs text-textMuted">/ {profile.ranking?.total || '-'} 名</span>
                  </div>
                </div>
              </div>

              {/* 詳細屬性 */}
              <div className="grid grid-cols-1 gap-y-3.5 px-1">
                <div className="flex justify-between border-b border-surfaceLight/50 pb-2">
                  <span className="text-xs text-textMuted">董事長</span>
                  <span className="text-sm text-white font-bold">{profile.chairman}</span>
                </div>
                <div className="flex justify-between border-b border-surfaceLight/50 pb-2">
                  <span className="text-xs text-textMuted">總經理</span>
                  <span className="text-sm text-white font-bold">{profile.ceo}</span>
                </div>
                <div className="flex justify-between border-b border-surfaceLight/50 pb-2">
                  <span className="text-xs text-textMuted">實收資本</span>
                  <span className="text-sm text-white font-bold">{profile.capital}</span>
                </div>
                <div className="flex justify-between border-b border-surfaceLight/50 pb-2">
                  <span className="text-xs text-textMuted">上市日期</span>
                  <span className="text-sm text-white font-bold">{profile.listingDate}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-xs text-textMuted">官方網站</span>
                  <a href={profile.website !== 'N/A' ? profile.website : '#'} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline font-bold flex items-center gap-1">
                    點擊前往 <Icon name="open_in_new" className="text-[10px]" />
                  </a>
                </div>
              </div>

              {/* 公司簡介小卡 */}
              <div className="pt-4 border-t border-surfaceLight">
                <h4 className="text-[10px] font-black text-textMuted mb-2 uppercase tracking-widest opacity-60 italic">Business Summary</h4>
                <p className="text-xs text-textMuted leading-relaxed line-clamp-4 hover:line-clamp-none transition-all duration-300 cursor-help bg-white/[0.01] p-3 rounded-lg border border-white/5">
                  {profile.description}
                </p>
              </div>
            </div>
          </div>

          <OwnershipSummary stockId={stockId} />
        </div>
      </div>
    </div>
  );
};
