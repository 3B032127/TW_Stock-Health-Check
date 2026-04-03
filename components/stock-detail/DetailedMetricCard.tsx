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
                <div className="flex justify-between items-center">
                  <span className="text-xs text-textMuted font-bold">毛利率</span>
                  {advancedData?.peerAvgs?.rawGrossMargin && (
                    <span className="text-[10px] text-amber-500 font-bold">同業平均: {advancedData?.peerAvgs?.rawGrossMargin}%</span>
                  )}
                </div>
                <span className="text-xl font-black text-white">{categoryData.items[0]?.value || 'N/A'}</span>
                <div className="relative w-full h-1.5 bg-slate-800 rounded-full">
                  <div className="h-full bg-blue-500 rounded-full absolute left-0 top-0 bottom-0" style={{ width: categoryData.items[0]?.value ? `${Math.min(100, Math.max(0, parseFloat(categoryData.items[0].value.replace('%', '')) || 0))}%` : '0%' }}></div>
                  {advancedData?.peerAvgs?.rawGrossMargin && (
                    <div 
                      className="absolute top-[-4px] bottom-[-4px] w-[3px] bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.8)] z-10 rounded-full" 
                      style={{ left: `${Math.min(100, Math.max(0, advancedData?.peerAvgs?.rawGrossMargin))}%`, transform: 'translateX(-50%)' }} 
                      title={`同業平均: ${advancedData?.peerAvgs?.rawGrossMargin}%`}
                    ></div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 border-b border-surfaceLight pb-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-textMuted font-bold">淨利率</span>
                  {advancedData?.peerAvgs?.rawNetMargin && (
                    <span className="text-[10px] text-amber-500 font-bold">同業平均: {advancedData?.peerAvgs?.rawNetMargin}%</span>
                  )}
                </div>
                <span className="text-xl font-black text-white">{categoryData.items[2]?.value || 'N/A'}</span>
                <div className="relative w-full h-1.5 bg-slate-800 rounded-full">
                  <div className="h-full bg-blue-500 rounded-full absolute left-0 top-0 bottom-0" style={{ width: categoryData.items[2]?.value ? `${Math.min(100, Math.max(0, parseFloat(categoryData.items[2].value.replace('%', '')) || 0))}%` : '0%' }}></div>
                  {advancedData?.peerAvgs?.rawNetMargin && (
                    <div 
                      className="absolute top-[-4px] bottom-[-4px] w-[3px] bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.8)] z-10 rounded-full" 
                      style={{ left: `${Math.min(100, Math.max(0, advancedData?.peerAvgs?.rawNetMargin))}%`, transform: 'translateX(-50%)' }} 
                      title={`同業平均: ${advancedData?.peerAvgs?.rawNetMargin}%`}
                    ></div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-auto pt-4 flex flex-col gap-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-textMuted">現金轉向率 (Cash Quality)</span>
                <span className="text-emerald-400">{advancedData.cashConversion ?? 'N/A'}%</span>
              </div>
              <p className="text-[10px] text-textMuted">
                營業淨現金流 / 税後淨利。比率 &gt; 100% 代表淨利轉換為現金效率極高，確保獲利品質實打實。
              </p>
            </div>
          </>
        ) : !isProfit ? (
          <>
            {/* Valuation Slider (River Chart Style) */}
            {advancedData?.peBand ? (
              <div className="bg-surfaceLight/10 rounded-xl p-5 border border-surfaceLight shadow-inner">
                <div className="flex justify-between items-end mb-5">
                  <span className="text-xs font-bold text-textMuted uppercase tracking-wider">過去五年本益比區間 (河流圖)</span>
                  <span className="text-sm font-black text-white px-2 py-0.5 bg-blue-500/20 rounded-md border border-blue-500/30">
                    當前 P/E: <span className="text-blue-400">{advancedData.peBand.current}x</span>
                  </span>
                </div>
                
                <div className="relative w-full h-10 flex rounded-lg overflow-hidden border border-slate-900 shadow-lg">
                  <div className="flex-1 bg-emerald-600 border-r border-black/20 group relative overflow-hidden">
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold drop-shadow-md truncate px-1">極低 ({advancedData.peBand.p0}x)</span>
                  </div>
                  <div className="flex-1 bg-emerald-400 border-r border-black/20 group relative overflow-hidden">
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold drop-shadow-md truncate px-1">低估 ({advancedData.peBand.p25}x)</span>
                  </div>
                  <div className="flex-1 bg-amber-400 border-r border-black/20 group relative overflow-hidden text-slate-900">
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold drop-shadow-sm truncate px-1">合理 ({advancedData.peBand.p50}x)</span>
                  </div>
                  <div className="flex-1 bg-rose-500 border-r border-black/20 group relative overflow-hidden">
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold drop-shadow-md truncate px-1">高估 ({advancedData.peBand.p75}x)</span>
                  </div>
                  <div className="flex-1 bg-rose-800 group relative overflow-hidden">
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold drop-shadow-md truncate px-1">極高 ({advancedData.peBand.p100}x)</span>
                  </div>
                  
                  {/* Refined Pointer Indicator: Vertical Glowing Axis */}
                  <div 
                    className="absolute top-[-4px] bottom-[-4px] w-[2px] bg-white z-20 transition-all duration-1000 ease-out"
                    style={{ 
                      left: `${advancedData.pePercentile}%`, 
                      transform: 'translateX(-50%)',
                      boxShadow: '0 0 15px 4px rgba(255, 255, 255, 0.4), 0 0 5px 1px rgba(59, 130, 246, 0.8)'
                    }}
                  >
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-blue-500 shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-blue-500 shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
                  </div>
                </div>
                
                <div className="flex justify-between mt-3 px-1 text-[11px] font-bold">
                  <div className="flex items-center gap-1.5 text-textMuted">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shadow-[0_0_5px_rgba(96,165,250,0.8)]"></div>
                    目前落於第 <span className="text-white">{advancedData.pePercentile}</span> 百分位
                  </div>
                  <span className={`${advancedData.pePercentile > 80 ? 'text-rose-400 font-black' : advancedData.pePercentile < 30 ? 'text-emerald-400 font-black' : 'text-blue-400'}`}>
                    {advancedData.pePercentile > 80 ? '估值明顯承壓' : advancedData.pePercentile < 30 ? '深具安全邊際' : '估值中性合理'}
                  </span>
                </div>

              </div>
            ) : (
              <div className="bg-surfaceLight/10 rounded-xl p-5 border border-surfaceLight border-l-4 border-l-rose-500">
                <span className="text-xs font-bold text-textMuted uppercase tracking-wider block mb-2">評價水位狀態</span>
                <p className="text-sm text-white font-medium">數據計算中，請稍候...</p>
              </div>
            )}

            {/* Basic Evaluation Metrics (Restored for consistency) */}
            <div className="grid grid-cols-3 gap-3 mt-4">
               {categoryData.items.map((item, idx) => (
                 <div key={idx} className="flex flex-col gap-1 border-b border-surfaceLight/50 pb-2">
                   <span className="text-[10px] text-textMuted font-bold truncate">{item.label}</span>
                   <span className={`text-sm font-black ${item.status === 'pass' ? 'text-emerald-400' : item.status === 'neutral' ? 'text-blue-400' : 'text-rose-400'}`}>{item.value}</span>
                 </div>
               ))}
            </div>

            {/* INTEGRATED: Market Sentiment (formerly from DiagnosticHeader) */}
            {advancedData?.sentiment && (
              <div className="bg-surfaceLight/20 rounded-xl p-3 border border-surfaceLight/50 my-2">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-1.5">
                    <Icon name="local_fire_department" className={`text-sm ${advancedData.sentiment.status === '過熱' ? 'text-rose-500 animate-pulse' : 'text-textMuted'}`} />
                    <span className="text-[10px] font-black text-textMuted uppercase tracking-widest">市場籌碼熱度</span>
                  </div>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${advancedData.sentiment.status === '過熱' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : (advancedData.sentiment.status === '冷清' ? 'bg-slate-700/50 text-textMuted border-white/5' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20')}`}>
                    {advancedData.sentiment.status}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden flex shadow-inner border border-black/20">
                  <div className="h-full bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-1000" style={{ width: `${advancedData.sentiment.retail}%` }}></div>
                  <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-1000" style={{ width: `${advancedData.sentiment.institutional}%` }}></div>
                </div>
                <div className="flex justify-between mt-1.5 px-0.5">
                   <span className="text-[9px] font-bold text-rose-400/80">散戶 {advancedData.sentiment.retail}%</span>
                   <span className="text-[9px] font-bold text-blue-400/80">法人 {advancedData.sentiment.institutional}%</span>
                </div>
              </div>
            )}


            {/* MOS and PEG Box */}
            {advancedData?.mos && (
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="flex flex-col gap-1 border-r border-surfaceLight/50 pr-4">
                <span className="text-[10px] text-textMuted font-bold">推算合理價 (MOS)</span>
                <span className="text-lg font-black text-white">{advancedData.mos.fairPrice ? `$${advancedData.mos.fairPrice}` : 'N/A'}</span>
                <span className={`text-[10px] font-bold ${advancedData.mos.discount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {advancedData.mos.discount > 0 ? `折價 ${advancedData.mos.discount}%` : `溢價 ${Math.abs(advancedData.mos.discount)}%`}
                </span>
              </div>
              <div className="flex flex-col gap-1 pl-2">
                <span className="text-[10px] text-textMuted font-bold">成長估值比 (PEG)</span>
                <span className="text-lg font-black text-white">{advancedData.peg || 'N/A'}</span>
                {advancedData.peg !== undefined && (
                  <span className={`text-[9px] font-bold ${advancedData.peg < 1 ? 'text-emerald-400' : 'text-textMuted'}`}>
                    {advancedData.peg < 1 ? '具成長潛力' : '合理範圍'}
                  </span>
                )}
              </div>
            </div>
            )}

            <div className="mt-auto pt-4 border-t border-surfaceLight/30">
               <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-2.5 flex items-start gap-2">
                 <Icon name="info" className="text-rose-400 text-[14px] mt-0.5" />
                 <p className="text-[11px] text-rose-300 leading-tight">
                   配合 PEG 與 MOS 折價幅度進行評估。獲利穩定度越高，推算價格之參考價值越顯著。
                 </p>
               </div>
            </div>
          </>
        ) : (
          <div className="text-textMuted text-sm flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            數據拼裝中...
          </div>
        )}

      </div>
    </div>
  );
};
