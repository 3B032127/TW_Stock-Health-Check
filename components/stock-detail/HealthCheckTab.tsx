import React from 'react';
import { Icon } from '../../App';
import { useHealthCheck } from '../../hooks/useHealthCheck';
import { useCompanyProfile } from '../../hooks/useCompanyProfile';
import { MetricCard } from './MetricCard';
import { AIAnalysisCard } from '../AIAnalysisCard';

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

  if (!healthCheckData) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-surface/50 rounded-xl border border-surfaceLight">
        <Icon name="error_outline" className="text-4xl text-rose-500 mb-2" />
        <p className="text-white font-medium">無法載入財報健檢資料</p>
        <p className="text-sm text-textMuted">請確認財報數據已同步或稍後再試</p>
      </div>
    );
  }

  return (
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
                <span className="text-4xl font-black text-white">{healthCheckData.totalScore}</span>
                <span className="block text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  {healthCheckData.totalScore >= 80 ? '優秀' : healthCheckData.totalScore >= 60 ? '良好' : '待加強'}
                </span>
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
              <div className="flex items-center gap-2 text-xs text-textMuted"><div className="size-2 rounded-full bg-primary"></div>當前公司</div>
              <div className="flex items-center gap-2 text-xs text-textMuted"><div className="size-2 rounded-full bg-slate-500"></div>同業平均</div>
            </div>
          </div>
          {/* Mock Bars */}
          <div className="grid grid-cols-4 gap-4 h-48 items-end pb-4 border-b border-surfaceLight">
            {[
              { label: '獲利能力', val: healthCheckData.profitability.score, avg: 65, color: 'bg-primary' },
              { label: '償債能力', val: healthCheckData.solvency.score, avg: 70, color: 'bg-emerald-500' },
              { label: '成長動能', val: healthCheckData.growth.score, avg: 50, color: 'bg-amber-500' },
              { label: '評價水位', val: healthCheckData.valuation.score, avg: 60, color: 'bg-rose-500' },
            ].map((d, i) => (
              <div key={i} className="flex flex-col justify-end gap-2 h-full text-center group relative">
                {/* Tooltip Popup */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-surfaceLight border border-white/20 p-2 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap min-w-[80px]">
                  <div className="text-[10px] text-textMuted font-bold uppercase mb-1">{d.label}</div>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-[10px] text-white/70">當前分數</span>
                      <span className="text-sm font-black text-white">{d.val}</span>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-[10px] text-white/50">同業平均</span>
                      <span className="text-xs font-bold text-textMuted">{d.avg}</span>
                    </div>
                  </div>
                  {/* Arrow */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-surfaceLight border-r border-b border-white/20 rotate-45"></div>
                </div>

                <div className="flex items-end justify-center gap-2 h-full px-1">
                  <div className="w-full bg-slate-700 rounded-t-sm relative group-hover:bg-slate-600 transition-colors" style={{ height: `${d.avg}%` }}></div>
                  <div className={`w-full ${d.color} rounded-t-sm relative shadow-lg`} style={{ height: `${d.val}%` }}></div>
                </div>
                <span className="text-xs font-bold text-slate-300">{d.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-textMuted">
            <span className="font-bold text-primary">綜合分析：</span> 個股目前在各項指標表現如上，詳細指標請參考下方資料。
          </p>
        </div>
      </div>

      {/* Detailed Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricCard category="profitability" items={healthCheckData.profitability.items} score={healthCheckData.profitability.score} />
        <MetricCard category="solvency" items={healthCheckData.solvency.items} score={healthCheckData.solvency.score} />
        <MetricCard category="growth" items={healthCheckData.growth.items} score={healthCheckData.growth.score} />
        <MetricCard category="valuation" items={healthCheckData.valuation.items} score={healthCheckData.valuation.score} />
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
