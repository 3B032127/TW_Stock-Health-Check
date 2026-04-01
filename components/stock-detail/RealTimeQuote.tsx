import React from 'react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import { Icon } from '../../App';
import { STOCK_INTRADAY_DATA, ORDER_BOOK_DATA } from '../../constants';

export const RealTimeQuote = () => {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart & Stats */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Main Price Card */}
          <div className="bg-surface border border-surfaceLight rounded-xl p-6">
            <div className="flex flex-wrap justify-between items-end mb-6">
              <div>
                <h3 className="text-sm font-medium text-textMuted mb-1">即時成交價</h3>
                <div className="flex items-baseline gap-4">
                  <span className="text-5xl font-bold text-up">588.00</span>
                  <span className="text-xl font-bold text-up flex items-center">
                    <Icon name="arrow_upward" className="text-xl" />
                    8.00 (1.38%)
                  </span>
                </div>
                <p className="text-xs text-textMuted mt-2 flex items-center gap-1">
                  <Icon name="schedule" className="text-xs" />
                  資料時間: 2024/05/20 13:30:00 (已收盤)
                </p>
              </div>
              <div className="grid grid-cols-3 gap-x-8 gap-y-2 text-sm mt-4 lg:mt-0">
                <div className="flex flex-col">
                  <span className="text-textMuted">開盤</span>
                  <span className="font-bold text-white">585.00</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-textMuted">最高</span>
                  <span className="font-bold text-up">589.00</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-textMuted">最低</span>
                  <span className="font-bold text-white">582.00</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-textMuted">昨收</span>
                  <span className="font-bold text-white">580.00</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-textMuted">總量</span>
                  <span className="font-bold text-primary">32,458</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-textMuted">成交額</span>
                  <span className="font-bold text-white">190.8億</span>
                </div>
              </div>
            </div>

            <div className="h-80 w-full relative border-t border-surfaceLight pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={STOCK_INTRADAY_DATA}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                  <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} orientation="right" />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Area type="step" dataKey="value" stroke="#ef4444" strokeWidth={2} fill="url(#colorPrice)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Order Book (5 Levels) */}
        <div className="lg:col-span-1">
          <div className="bg-surface border border-surfaceLight rounded-xl overflow-hidden">
            <div className="p-4 border-b border-surfaceLight bg-surfaceLight/30">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Icon name="list_alt" />
                五檔報價
              </h3>
            </div>
            <div className="flex flex-col">
              {/* Asks (Sell) - Reversed */}
              <div className="flex flex-col-reverse">
                {ORDER_BOOK_DATA.asks.map((ask, i) => (
                  <div key={i} className="grid grid-cols-3 text-sm py-2 px-4 hover:bg-surfaceLight/20 relative">
                    <span className="text-textMuted font-medium text-center">賣 {5 - i}</span>
                    <span className="text-up font-bold text-right">{ask.price}</span>
                    <div className="text-right relative z-10">{ask.volume}</div>
                    <div className="absolute top-1 bottom-1 right-0 bg-up/20 z-0" style={{ width: `${(ask.volume / 500) * 100}%` }}></div>
                  </div>
                ))}
              </div>

              <div className="border-y border-surfaceLight py-2 bg-surfaceLight/10 text-center text-xs text-textMuted font-medium tracking-wider">
                最新成交 588.00
              </div>

              {/* Bids (Buy) */}
              <div className="flex flex-col">
                {ORDER_BOOK_DATA.bids.map((bid, i) => (
                  <div key={i} className="grid grid-cols-3 text-sm py-2 px-4 hover:bg-surfaceLight/20 relative">
                    <span className="text-textMuted font-medium text-center">買 {i + 1}</span>
                    <span className="text-up font-bold text-right">{bid.price}</span>
                    <div className="text-right relative z-10">{bid.volume}</div>
                    <div className="absolute top-1 bottom-1 right-0 bg-up/20 z-0" style={{ width: `${(bid.volume / 500) * 100}%` }}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
