import React, { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, YAxis } from 'recharts';
import { Icon } from '../../App';
import { useOwnershipData } from '../../hooks/useOwnershipData';

export const OwnershipSummary = ({ stockId }: { stockId: string }) => {
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
    <div className="bg-surface border border-surfaceLight rounded-xl p-[18px] relative">
      <h3 className="text-white text-lg font-bold mb-3 flex items-center gap-2">
        <Icon name="groups" className="text-indigo-400" />
        股權與籌碼摘要
      </h3>

      {error || (!data && !isLoading) ? (
        <div className="py-12 text-center">
          <span className="text-textMuted text-sm">暫無股權資料</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {/* Pie Chart Top Section */}
          <div
            className="h-[215px] w-full relative"
            onMouseMove={handleContainerMouseMove}
            onMouseLeave={handleContainerMouseLeave}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart onMouseLeave={handleContainerMouseLeave}>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={80}
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

            {/* 30 Day Trend Section - Separated with sub-heading */}
            {data.ownershipTrend && data.ownershipTrend.length > 0 && (
              <div className="bg-surfaceLight/30 border border-surfaceLight/50 rounded-xl p-4 my-1">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1 px-1.5 bg-blue-500/10 rounded border border-blue-500/20">
                    <Icon name="trending_up" className="text-blue-400 text-sm" />
                  </div>
                  <span className="text-sm font-black text-white">近 30 日籌碼動態趨勢</span>
                  <div className="ml-auto flex gap-3">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-[#34d399]"></div>
                      <span className="text-[10px] text-textMuted font-bold">外資</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-[#fb7185]"></div>
                      <span className="text-[10px] text-textMuted font-bold">投信</span>
                    </div>
                  </div>
                </div>
                
                <div className="h-20 w-full opacity-90">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.ownershipTrend}>
                      <YAxis yAxisId="foreign" hide domain={['auto', 'auto']} />
                      <YAxis yAxisId="investmentTrust" hide domain={['auto', 'auto']} />
                      <Line yAxisId="foreign" type="monotone" dataKey="foreign" stroke="#34d399" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                      <Line yAxisId="investmentTrust" type="monotone" dataKey="investmentTrust" stroke="#fb7185" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-center">
                  <p className="text-[10px] text-textMuted italic">
                    數據整合週頻率持股比例（外資）與日頻率累積買賣超（投信）
                  </p>
                </div>
              </div>
            )}

          {/* Separator */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-surfaceLight to-transparent my-0.5"></div>

          {/* New Equity Metric Cards Bottom Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="p-1 px-1.5 bg-amber-500/10 rounded border border-amber-500/20">
                <Icon name="analytics" className="text-amber-400 text-sm" />
              </div>
              <span className="text-sm font-black text-white">關鍵股權指標</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 h-fit">
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
        </div>
      )}
    </div>
  );
};
