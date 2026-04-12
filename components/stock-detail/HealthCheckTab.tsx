import React from 'react';
import { Icon } from '../../App';
import { useHealthCheck } from '../../hooks/useHealthCheck';
import { useCompanyProfile } from '../../hooks/useCompanyProfile';
import { MetricCard } from './MetricCard';
import { AIAnalysisCard } from '../AIAnalysisCard';

import { HealthScoreGauge } from './HealthScoreGauge';
import { MoatCard } from './MoatCard';
import { DetailedMetricCard } from './DetailedMetricCard';

export const HealthCheckTab = ({ stockId }: { stockId: string }) => {
  const { data: healthCheckData, isLoading: isHealthCheckLoading } = useHealthCheck(stockId);
  const { data: profile } = useCompanyProfile(stockId);

  if (isHealthCheckLoading) {
    return (
      <div className="flex flex-col gap-6 items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-textMuted">載入財報健檢資料中...</p>
      </div>
    );
  }

  if (!healthCheckData || (healthCheckData as any)._isNoData) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-surface/30 rounded-2xl border border-surfaceLight/50 backdrop-blur-sm relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500/0 via-amber-500/50 to-amber-500/0"></div>
        <div className="absolute -bottom-24 -right-24 size-64 bg-amber-500/5 rounded-full blur-3xl"></div>
        
        <div className="size-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-6 border border-amber-500/20">
          <Icon name="database" className="text-3xl text-amber-400 animate-pulse" />
        </div>
        
        <h3 className="text-xl font-bold text-white mb-2">需要同步財報數據</h3>
        <p className="text-textMuted text-center max-w-md mb-8">
          這是一支新搜尋的股票，為了提供精確的 10 年亮點與護城河分析，
          我們需要從 API 抓取歷史財報數據並存儲於本地資料庫中。
        </p>
        
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-surfaceLight/50 rounded-full border border-white/5 text-xs text-amber-200">
            <Icon name="info" className="text-sm" />
            <span>請點擊頁面右上方「發現新資料」按鈕執行同步</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 頂部主儀表板：財務對比、護城河與綜合看板 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* 左側主區域 (8/12) */}
        <div className="lg:col-span-8 flex flex-col gap-6 font-sans">
          
          {/* 同業對比卡片 */}
          <div className="rounded-xl bg-surface p-6 shadow-sm border border-surfaceLight flex flex-col relative overflow-hidden group min-h-[300px]">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <Icon name="compare_arrows" className="text-9xl text-slate-400" />
            </div>
            <div className="flex justify-between items-center mb-6 z-10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Icon name="bar_chart" className="text-blue-400" />
                財務標竿同業對比
              </h3>
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-xs text-textMuted"><div className="size-2 rounded-full bg-blue-500"></div>當前公司</div>
                <div className="flex items-center gap-2 text-xs text-textMuted"><div className="size-2 rounded-full bg-slate-600"></div>同業平均</div>
              </div>
            </div>
            
            <div className="flex-1 grid grid-cols-4 gap-6 items-end pb-6 border-b border-surfaceLight/50 relative z-10">
              {[
                { label: '獲利能力', val: healthCheckData.profitability.score, avg: healthCheckData.advanced?.peerAvgs?.profitability || 65, color: 'bg-blue-500' },
                { label: '償債能力', val: healthCheckData.solvency.score, avg: healthCheckData.advanced?.peerAvgs?.solvency || 70, color: 'bg-emerald-500' },
                { label: '成長動能', val: healthCheckData.growth.score, avg: healthCheckData.advanced?.peerAvgs?.growth || 50, color: 'bg-amber-500' },
                { label: '評價水位', val: healthCheckData.valuation.score, avg: healthCheckData.advanced?.peerAvgs?.valuation || 60, color: 'bg-rose-500' },
              ].map((d, i) => (
                <div key={i} className="flex flex-col justify-end gap-3 h-40 text-center group/bar relative">
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-surfaceLight border border-white/10 p-2 rounded shadow-xl opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap min-w-[90px]">
                     <div className="text-[10px] text-white/50 font-bold mb-1">{d.label}</div>
                     <div className="text-sm font-black text-white">{d.val} <span className="text-[10px] text-textMuted font-normal">/ Avg: {d.avg}</span></div>
                  </div>

                  <div className="flex items-end justify-center gap-1.5 h-full px-2 w-full mx-auto max-w-[80px]">
                    <div className="w-full bg-slate-600/50 rounded-t shadow-inner hover:bg-slate-500 transition-colors relative" style={{ height: `${d.avg}%` }}></div>
                     <div className={`w-full ${d.color} rounded-t shadow-lg hover:brightness-110 transition-all relative`} style={{ height: `${d.val}%` }}></div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">{d.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[10px] text-textMuted z-10 italic">
              * 基於 FinMind 同業數據運算，反映企業在產業競爭中的相對財務優勢。
            </p>
          </div>

          {/* 護城河卡片 */}
          {healthCheckData.advanced?.moat && (
             <MoatCard 
               advancedData={healthCheckData.advanced} 
               items={healthCheckData.advanced.moat} 
               score={healthCheckData.advanced.moatScore || 0} 
               dividendHistory={healthCheckData.advanced.dividendHistory} 
             />
          )}
        </div>

        {/* 右側綜合導航大卡片 (4/12) - 垂直拉長整合 */}
        <div className="lg:col-span-4 h-full">
          <HealthScoreGauge 
            score={healthCheckData.totalScore} 
            peerAvg={healthCheckData.advanced?.peerAvgs?.total || 64} 
            data={healthCheckData.advanced} 
            prosCons={healthCheckData.advanced?.prosCons}
            nextEvent={healthCheckData.advanced?.nextEvent}
          />
        </div>
      </div>



      {/* 第三排：進階檢點卡片 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DetailedMetricCard type="profitability" categoryData={healthCheckData.profitability} advancedData={healthCheckData.advanced} />
        <DetailedMetricCard type="valuation" categoryData={healthCheckData.valuation} advancedData={healthCheckData.advanced} />
      </div>

      {/* 第四排：基礎檢點卡片 (含 Sparkline) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricCard category="solvency" items={healthCheckData.solvency.items} score={healthCheckData.solvency.score} />
        <MetricCard category="growth" items={healthCheckData.growth.items} score={healthCheckData.growth.score} />
      </div>

      {/* AI Analysis */}
      <AIAnalysisCard 
        type="health" 
        title="財報健檢智能診斷" 
        defaultExpanded={true} 
        onAnalyze={async () => {
          if (!healthCheckData) return "暫無資料進行分析。";
          const data = healthCheckData;
          const statusLabel = data.totalScore >= 80 ? '優秀' : data.totalScore >= 60 ? '良好' : '待加強';
          return `### 財務健檢深度診斷報告\n` +
            `**${profile?.name || ''} (${stockId})** 之綜合財務體質經精密量化評估後得分為 **${data.totalScore}分**，整體表現評為「**${statusLabel}**」。\n\n` +
            `* **核心獲利能力 (${data.profitability.score}分)**：${data.profitability.score >= 80 ? '企業展現強大的定價與盈餘品質，各項毛利指標顯著高於產業長期中值（Peer Average），具備深厚經濟護城河。' : '利潤空間受到成本結構侵蝕，需加強營收品質控管並優化營業毛利。'}\n` +
            `* **資產流動性與債務償還 (${data.solvency.score}分)**：${data.solvency.score >= 80 ? '資產負債結構極為精簡穩健，短期流動比率充裕，且槓桿水平遠低於財務警戒線，流動性風險極低。' : '負債水平偏高或速動比率未達標準，需密切監控現金流轉換週期（Cash Conversion Cycle）。'}\n` +
            `* **中長期成長動能 (${data.growth.score}分)**：${data.growth.score >= 80 ? '營收年增率（YoY）與核心淨利展現強勁的複合成長力道，顯示企業處於顯著的市場擴張階段。' : '成長性顯現鈍化跡象，需關注未來營運動能是否受產業週期循環影響而放緩。'}\n` +
            `* **市場估值水位評估 (${data.valuation.score}分)**：${data.valuation.score >= 80 ? '當前市場價格相較於內在價值存在顯著折價（Discount），安全邊際空間充足，具備長線佈局潛力。' : '目前市場交易溢價水平偏高，預期投資報酬率（Forward Yield）可能受到壓縮，建議審慎評估進場時機檢視基期。'}`;
        }}
      />
    </div>
  );
};
