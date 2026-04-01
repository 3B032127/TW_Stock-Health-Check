import React from 'react';
import { Icon } from '../../App';
import { FinancialHighlightsData } from '../../types';

export const FinancialHighlights = ({ data }: { data?: FinancialHighlightsData }) => {
  if (!data) {
    return (
      <div className="bg-surface border border-surfaceLight rounded-xl p-6 flex flex-col items-center justify-center">
        <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2 self-start">
          <Icon name="insights" className="text-amber-500" />
          營運速覽
        </h3>
        <span className="text-textMuted text-sm py-8">暫無營運速覽資料</span>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-surfaceLight rounded-xl p-6">
      <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
        <Icon name="insights" className="text-amber-500" />
        營運速覽
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
        {/* 月營收 (懸浮擴張設計) */}
        <div className="relative w-full h-[140px] group">
          <div className="absolute inset-0 z-0 group-hover:z-50 p-4 bg-surfaceLight/20 border border-surfaceLight rounded-xl cursor-default transition-all duration-300 ease-out group-hover:-top-20 group-hover:-bottom-24 group-hover:-left-10 group-hover:-right-10 md:group-hover:-left-12 md:group-hover:-right-12 group-hover:bg-surface group-hover:shadow-2xl group-hover:shadow-primary/20 group-hover:border-primary/40 flex flex-col items-center justify-center overflow-hidden">

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center justify-center transition-transform duration-300 ease-out group-hover:-translate-y-8 w-full">
              <span className="text-sm font-bold text-textMuted mb-2 transition-transform duration-300 origin-bottom group-hover:scale-[2] group-hover:text-primary group-hover:-translate-y-8 whitespace-nowrap">最新月營收</span>
              <span className="text-2xl font-bold text-white mb-1 transition-transform duration-300 origin-center group-hover:scale-150 group-hover:-translate-y-2 whitespace-nowrap">{data.monthlyRevenue.value !== 'N/A' ? `${data.monthlyRevenue.value} 億` : 'N/A'}</span>
              <span className={`text-xs ${data.monthlyRevenue.yoy >= 0 ? 'text-up' : 'text-down'} transition-transform duration-300 origin-center group-hover:scale-110 group-hover:translate-y-1 whitespace-nowrap`}>
                YoY {data.monthlyRevenue.yoy >= 0 ? '+' : ''}{data.monthlyRevenue.yoy}%
              </span>
              {data.monthlyRevenue.value !== 'N/A' && (
                <span className={`text-xs mt-3 px-3 py-1 rounded-full border ${data.monthlyRevenue.yoy >= 0 ? 'bg-up/10 text-up border-up/20' : 'bg-down/10 text-down border-down/20'} transition-transform duration-300 origin-center group-hover:scale-110 group-hover:translate-y-3 whitespace-nowrap`}>
                  {data.monthlyRevenue.yoy >= 0 ? '持續成長' : '面臨衰退'}
                </span>
              )}
            </div>

            {/* Expanded Text */}
            <div className="absolute bottom-8 inset-x-0 mx-auto w-[240px] flex flex-col items-center opacity-0 translate-y-6 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto">
              <p className="text-sm text-white/90 font-medium text-center leading-relaxed tracking-wide drop-shadow-sm">
                表示公司最近一個月的營收規模。<br />正斜率 YoY 能證明需求相較去年擴大。
              </p>
            </div>
          </div>
        </div>

        {/* EPS */}
        <div className="relative w-full h-[140px] group">
          <div className="absolute inset-0 z-0 group-hover:z-50 p-4 bg-surfaceLight/20 border border-surfaceLight rounded-xl cursor-default transition-all duration-300 ease-out group-hover:-top-20 group-hover:-bottom-24 group-hover:-left-10 group-hover:-right-10 md:group-hover:-left-12 md:group-hover:-right-12 group-hover:bg-surface group-hover:shadow-2xl group-hover:shadow-emerald-500/10 group-hover:border-emerald-500/40 flex flex-col items-center justify-center overflow-hidden">

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center justify-center transition-transform duration-300 ease-out group-hover:-translate-y-8 w-full">
              <span className="text-sm font-bold text-textMuted mb-2 transition-transform duration-300 origin-bottom group-hover:scale-[2] group-hover:text-emerald-400 group-hover:-translate-y-8 whitespace-nowrap">近四季 EPS</span>
              <span className="text-xl md:text-2xl font-bold text-white mb-1 transition-transform duration-300 origin-center group-hover:scale-150 group-hover:-translate-y-2 whitespace-nowrap">{data.eps !== 'N/A' ? `${data.eps} 元` : 'N/A'}</span>
              {data.eps !== 'N/A' && (
                <span className={`text-xs mt-3 px-3 py-1 rounded-full border ${parseFloat(data.eps) > 0 ? 'bg-up/10 text-up border-up/20' : 'bg-down/10 text-down border-down/20'} transition-transform duration-300 origin-center group-hover:scale-110 group-hover:translate-y-3 whitespace-nowrap`}>
                  {parseFloat(data.eps) > 0 ? '保持獲利' : '目前虧損'}
                </span>
              )}
            </div>

            {/* Expanded Text */}
            <div className="absolute bottom-8 inset-x-0 mx-auto w-[240px] flex flex-col items-center opacity-0 translate-y-6 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto">
              <p className="text-sm text-white/90 font-medium text-center leading-relaxed tracking-wide drop-shadow-sm">
                過去 12 個月每股盈餘的總和。<br />數值越高表示潛在的賺錢能力越強。
              </p>
            </div>
          </div>
        </div>

        {/* 毛利率 */}
        <div className="relative w-full h-[140px] group">
          <div className="absolute inset-0 z-0 group-hover:z-50 p-4 bg-surfaceLight/20 border border-surfaceLight rounded-xl cursor-default transition-all duration-300 ease-out group-hover:-top-20 group-hover:-bottom-24 group-hover:-left-10 group-hover:-right-10 md:group-hover:-left-12 md:group-hover:-right-12 group-hover:bg-surface group-hover:shadow-2xl group-hover:shadow-amber-500/10 group-hover:border-amber-500/40 flex flex-col items-center justify-center overflow-hidden">

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center justify-center transition-transform duration-300 ease-out group-hover:-translate-y-8 w-full">
              <span className="text-sm font-bold text-textMuted mb-2 transition-transform duration-300 origin-bottom group-hover:scale-[2] group-hover:text-amber-400 group-hover:-translate-y-8 whitespace-nowrap">毛利率</span>
              <span className="text-2xl font-bold text-white mb-1 transition-transform duration-300 origin-center group-hover:scale-150 group-hover:-translate-y-2 whitespace-nowrap">{data.grossMargin?.toFixed(2)}%</span>
              {data.grossMargin !== undefined && (
                <span className={`text-xs mt-3 px-3 py-1 rounded-full border ${data.grossMargin >= 30 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : data.grossMargin >= 15 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'} transition-transform duration-300 origin-center group-hover:scale-110 group-hover:translate-y-3 whitespace-nowrap`}>
                  {data.grossMargin >= 30 ? '高毛利' : data.grossMargin >= 15 ? '表現穩定' : '仍需注意'}
                </span>
              )}
            </div>

            {/* Expanded Text */}
            <div className="absolute bottom-8 inset-x-0 mx-auto w-[240px] flex flex-col items-center opacity-0 translate-y-6 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto">
              <p className="text-sm text-white/90 font-medium text-center leading-relaxed tracking-wide drop-shadow-sm">
                反映產品附加價值。<br />越高代表能以低成本生產或具備強大定價能力。
              </p>
            </div>
          </div>
        </div>

        {/* 營益率 */}
        <div className="relative w-full h-[140px] group">
          <div className="absolute inset-0 z-0 group-hover:z-50 p-4 bg-surfaceLight/20 border border-surfaceLight rounded-xl cursor-default transition-all duration-300 ease-out group-hover:-top-20 group-hover:-bottom-24 group-hover:-left-12 group-hover:-right-4 md:group-hover:-left-20 md:group-hover:-right-4 group-hover:bg-surface group-hover:shadow-2xl group-hover:shadow-blue-500/10 group-hover:border-blue-500/40 flex flex-col items-center justify-center overflow-hidden">

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center justify-center transition-transform duration-300 ease-out group-hover:-translate-y-8 w-full">
              <span className="text-sm font-bold text-textMuted mb-2 transition-transform duration-300 origin-bottom group-hover:scale-[2] group-hover:text-blue-400 group-hover:-translate-y-8 whitespace-nowrap">營益率</span>
              <span className="text-2xl font-bold text-white mb-1 transition-transform duration-300 origin-center group-hover:scale-150 group-hover:-translate-y-2 whitespace-nowrap">{data.operatingMargin?.toFixed(2)}%</span>
              {data.operatingMargin !== undefined && (
                <span className={`text-xs mt-3 px-3 py-1 rounded-full border ${data.operatingMargin >= 15 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : data.operatingMargin >= 5 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'} transition-transform duration-300 origin-center group-hover:scale-110 group-hover:translate-y-3 whitespace-nowrap`}>
                  {data.operatingMargin >= 15 ? '本業強勁' : data.operatingMargin >= 5 ? '表現穩定' : '仍需注意'}
                </span>
              )}
            </div>

            {/* Expanded Text */}
            <div className="absolute bottom-8 inset-x-0 mx-auto w-[240px] flex flex-col items-center opacity-0 translate-y-6 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto">
              <p className="text-sm text-white/90 font-medium text-center leading-relaxed tracking-wide drop-shadow-sm">
                直接反映本業經營績效。<br />過低代表被隱性費用吃掉利潤。
              </p>
            </div>
          </div>
        </div>

        {/* 淨利率 */}
        <div className="relative w-full h-[140px] group">
          <div className="absolute inset-0 z-0 group-hover:z-50 p-4 bg-surfaceLight/20 border border-surfaceLight rounded-xl cursor-default transition-all duration-300 ease-out group-hover:-top-20 group-hover:-bottom-24 group-hover:-left-16 group-hover:-right-0 md:group-hover:-left-24 md:group-hover:-right-0 group-hover:bg-surface group-hover:shadow-2xl group-hover:shadow-purple-500/10 group-hover:border-purple-500/40 flex flex-col items-center justify-center overflow-hidden">

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center justify-center transition-transform duration-300 ease-out group-hover:-translate-y-8 w-full">
              <span className="text-sm font-bold text-textMuted mb-2 transition-transform duration-300 origin-bottom group-hover:scale-[2] group-hover:text-purple-400 group-hover:-translate-y-8 whitespace-nowrap">淨利率</span>
              <span className="text-2xl font-bold text-white mb-1 transition-transform duration-300 origin-center group-hover:scale-150 group-hover:-translate-y-2 whitespace-nowrap">{data.netMargin?.toFixed(2)}%</span>
              {data.netMargin !== undefined && (
                <span className={`text-xs mt-3 px-3 py-1 rounded-full border ${data.netMargin >= 10 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : data.netMargin > 0 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-down/10 text-down border-down/20'} transition-transform duration-300 origin-center group-hover:scale-110 group-hover:translate-y-3 whitespace-nowrap`}>
                  {data.netMargin >= 10 ? '獲利優異' : data.netMargin > 0 ? '表現穩定' : '面臨虧損'}
                </span>
              )}
            </div>

            {/* Expanded Text */}
            <div className="absolute bottom-8 inset-x-0 mx-auto w-[240px] flex flex-col items-center opacity-0 translate-y-6 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none group-hover:pointer-events-auto">
              <p className="text-sm text-white/90 font-medium text-center leading-relaxed tracking-wide drop-shadow-sm">
                結合業外投資收入與稅務考量。<br />是最終實際能放入自己口袋真實獲利佔比。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
