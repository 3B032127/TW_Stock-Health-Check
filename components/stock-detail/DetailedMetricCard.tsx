import React from 'react';
import { Icon } from '../../App';
import { HealthCheckCategory, AdvancedHealthData } from '../../types';

interface DetailedMetricCardProps {
  type: 'profitability' | 'valuation';
  categoryData: HealthCheckCategory;
  advancedData?: AdvancedHealthData;
}

export const DetailedMetricCard: React.FC<DetailedMetricCardProps> = ({ type, categoryData, advancedData }) => {
  const isProfit = type === 'profitability';

  return (
    <div className="rounded-xl bg-surface p-6 shadow-sm border border-surfaceLight relative flex flex-col h-full overflow-hidden">
      {/* Background Icon */}
      <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] pointer-events-none">
        <Icon name={isProfit ? 'attach_money' : 'receipt_long'} className="text-9xl text-white" />
      </div>

      <div className="flex justify-between items-center mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isProfit ? 'bg-blue-500/10 text-blue-400' : 'bg-rose-500/10 text-rose-400'}`}>
            <Icon name={isProfit ? 'insights' : 'price_check'} />
          </div>
          <h3 className="text-lg font-bold text-white">
            {isProfit ? '獲利能力與杜邦分析' : '評價水位與安全邊際'}
          </h3>
        </div>
        <span className={`text-3xl font-black ${isProfit ? 'text-blue-500' : 'text-rose-500'}`}>
          {categoryData.score}<span className="text-sm font-medium text-textMuted/70">/100</span>
        </span>
      </div>

      <div className="flex-1 relative z-10 space-y-4">
        {isProfit && advancedData?.dupont ? (
          <>
            {/* Dupont Analysis */}
            <div className="bg-surfaceLight/10 rounded-xl p-5 border border-surfaceLight border-l-4 border-l-blue-500">
              <div className="flex justify-between items-end mb-3">
                <span className="text-sm font-bold text-slate-300">股東權益報酬率 (ROE)</span>
                <span className="text-2xl font-black text-emerald-400">{advancedData.dupont.roe}%</span>
              </div>
              <p className="text-xs text-textMuted leading-relaxed">
                <span className="text-blue-400 font-bold italic">ROE 驅動主因來自：</span> 
                {advancedData.dupont.netMargin > 15 ? '高淨利率提供底層強大支撐' : '資產周轉率優化帶動獲利循環'}，
                {advancedData.dupont.equityMultiplier < 1.5 ? '且未使用過度槓桿，獲利品質極佳。' : '輔以適當槓桿擴大股東報酬。'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="flex flex-col gap-2 border-b border-surfaceLight pb-3">
                <span className="text-xs text-textMuted font-bold">毛利率</span>
                <span className="text-xl font-black text-white">{categoryData.items[0]?.value || 'N/A'}</span>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: categoryData.items[0]?.value ? `${Math.min(100, Math.max(0, parseFloat(categoryData.items[0].value.replace('%', '')) || 0))}%` : '0%' }}></div>
                </div>
              </div>
              <div className="flex flex-col gap-2 border-b border-surfaceLight pb-3">
                <span className="text-xs text-textMuted font-bold">淨利率</span>
                <span className="text-xl font-black text-white">{categoryData.items[2]?.value || 'N/A'}</span>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: categoryData.items[2]?.value ? `${Math.min(100, Math.max(0, parseFloat(categoryData.items[2].value.replace('%', '')) || 0))}%` : '0%' }}></div>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-4 flex flex-col gap-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-textMuted">現金轉向率 (Cash Quality)</span>
                <span className="text-emerald-400">115%</span>
              </div>
              <p className="text-[10px] text-textMuted">
                營業淨現金流 / 税後淨利。比率 &gt; 100% 代表淨利轉換為現金效率極高，確保獲利品質實打實。
              </p>
            </div>
          </>
        ) : !isProfit && advancedData?.peBand ? (
          <>
            {/* Valuation Slider */}
            <div className="bg-surfaceLight/10 rounded-xl p-5 border border-surfaceLight">
              <div className="flex justify-between items-end mb-4">
                <span className="text-xs font-bold text-textMuted">過去 5 年本益比區間 ({advancedData.peBand.min}x - {advancedData.peBand.max}x)</span>
                <span className="text-sm font-black text-white">當前 P/E:{advancedData.peBand.current}x</span>
              </div>
              
              <div className="relative w-full h-8 flex rounded-md overflow-hidden bg-slate-800">
                <div className="flex-1 bg-emerald-900 border-r border-slate-900"></div>
                <div className="flex-1 bg-yellow-900 border-r border-slate-900"></div>
                <div className="flex-1 bg-amber-900 border-r border-slate-900"></div>
                <div className="flex-1 bg-rose-950"></div>
                
                {/* Pointer */}
                <div 
                  className="absolute top-0 bottom-0 w-[2px] bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)] z-10 transition-all duration-700"
                  style={{ left: `${advancedData.pePercentile}%` }}
                >
                  <div className="absolute -top-1 -translate-x-1/2 w-3 h-3 rounded-full bg-blue-400 border-2 border-surface"></div>
                </div>
              </div>
              
              <div className="mt-4 flex items-center gap-2 text-xs">
                <Icon name="check_circle" className="text-[14px] text-emerald-400" />
                <span className="text-textMuted">當前 P/E 落於過去 5 年 <span className="text-emerald-400 font-bold">{advancedData.pePercentile}% 分位數</span> (估值偏低)。</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 mt-4">
               {categoryData.items.slice(1).map((item, idx) => (
                 <div key={idx} className="flex justify-between items-center py-2 border-b border-surfaceLight/50 last:border-0">
                   <span className="text-sm text-textMuted font-bold">{item.label}</span>
                   <div className="flex items-center gap-2">
                     <span className="font-black text-white">{item.value}</span>
                     <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.status === 'pass' ? 'bg-emerald-500/20 text-emerald-400' : item.status === 'fail' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                       {item.status === 'pass' ? '安全區間' : item.status === 'fail' ? '歷史高位' : '持平'}
                     </span>
                   </div>
                 </div>
               ))}
            </div>

            <div className="mt-auto pt-4">
               <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 flex items-start gap-2">
                 <Icon name="gpp_bad" className="text-rose-400 text-[16px] mt-0.5" />
                 <p className="text-xs text-rose-300">
                   <span className="font-bold">安全邊際建議：</span> 分批佈局，留意短期外資動向。
                 </p>
               </div>
            </div>
          </>
        ) : (
          <div className="text-textMuted text-sm">數據加載中...</div>
        )}
      </div>
    </div>
  );
};
