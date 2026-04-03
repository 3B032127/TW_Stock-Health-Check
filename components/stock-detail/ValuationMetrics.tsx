import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Icon } from '../../App';
import { useValuationMetrics } from '../../hooks/useValuationMetrics';
import { useHealthCheck } from '../../hooks/useHealthCheck';
import { SparklineChart } from './SparklineChart';

export const ValuationMetrics = ({ stockId }: { stockId: string }) => {
  const { data, isLoading, error } = useValuationMetrics(stockId);
  const { data: hcData } = useHealthCheck(stockId);
  const forwardYield = hcData?.advanced?.forwardYield;
  const [activeMetric, setActiveMetric] = useState<'price' | 'peRatio' | 'pbRatio' | 'dividendYield' | 'forwardYield' | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (activeMetric) {
      setTimeout(() => setIsMounted(true), 10);
    } else {
      setIsMounted(false);
    }
  }, [activeMetric]);

  const handleCloseModal = () => {
    setIsMounted(false);
    setTimeout(() => setActiveMetric(null), 300);
  };

  let priceColorClass = "text-white";
  let isPriceUp = false;
  let isPriceDown = false;
  if (data?.sparklineData && data.sparklineData.length > 1) {
    const prevClose = data.sparklineData[data.sparklineData.length - 2].value;
    isPriceUp = data.price > prevClose;
    isPriceDown = data.price < prevClose;
    if (isPriceUp) priceColorClass = "text-up";
    else if (isPriceDown) priceColorClass = "text-down";
  }

  const getPeTag = (pe: number | null | undefined) => {
    if (!pe || pe <= 0) return { text: "虧損中", textClass: "text-slate-400", bgClass: "bg-surfaceLight/50", borderClass: "border-transparent" };
    if (pe < 15) return { text: "偏低估值", textClass: "text-emerald-400", bgClass: "bg-emerald-500/10", borderClass: "border-emerald-500/20" };
    if (pe > 25) return { text: "較高期待", textClass: "text-red-400", bgClass: "bg-red-500/10", borderClass: "border-red-500/20" };
    return { text: "合理區間", textClass: "text-blue-400", bgClass: "bg-blue-500/10", borderClass: "border-blue-500/20" };
  };

  const getPbTag = (pb: number | null | undefined) => {
    if (!pb || pb <= 0) return { text: "無資料", textClass: "text-textMuted", bgClass: "bg-surfaceLight/50", borderClass: "border-transparent" };
    if (pb < 1.5) return { text: "低於淨值", textClass: "text-emerald-400", bgClass: "bg-emerald-500/10", borderClass: "border-emerald-500/20" };
    if (pb > 3) return { text: "估值偏高", textClass: "text-red-400", bgClass: "bg-red-500/10", borderClass: "border-red-500/20" };
    return { text: "合理區間", textClass: "text-blue-400", bgClass: "bg-blue-500/10", borderClass: "border-blue-500/20" };
  };

  const getYieldTag = (y: number | null | undefined) => {
    if (!y || y <= 0) return { text: "無配息", textClass: "text-slate-400", bgClass: "bg-surfaceLight/50", borderClass: "border-transparent" };
    if (y > 4) return { text: "高配息", textClass: "text-amber-400", bgClass: "bg-amber-500/10", borderClass: "border-amber-500/20" };
    return { text: "穩定配息", textClass: "text-blue-400", bgClass: "bg-blue-500/10", borderClass: "border-blue-500/20" };
  };

  const peTag = getPeTag(data?.peRatio);
  const pbTag = getPbTag(data?.pbRatio);
  const yieldTag = getYieldTag(data?.dividendYield);
  const priceTag = isPriceUp
    ? { text: "上漲趨勢", textClass: "text-up", bgClass: "bg-red-500/10", borderClass: "border-red-500/20" }
    : isPriceDown
      ? { text: "下跌趨勢", textClass: "text-down", bgClass: "bg-emerald-500/10", borderClass: "border-emerald-500/20" }
      : { text: "平盤震盪", textClass: "text-slate-400", bgClass: "bg-slate-500/10", borderClass: "border-slate-500/20" };


  const getModalContent = () => {
    if (!data || !activeMetric) return null;

    let title = "";
    let explanation = "";
    let analysis = "";
    let chartData: any[] = [];
    let color = "#10b981";
    let currentValue = "";
    let tag = priceTag;

    switch (activeMetric) {
      case 'price':
        title = "目前股價 (Current Price)";
        explanation = "股價是市場買賣雙方交集出的當前交易價格，反映市場對公司價值的共識。";
        analysis = `目前股價為 ${data.price.toFixed(2)} 元。透過觀察近 1 年走勢，可了解近期資金動能與市場長期情緒。`;
        chartData = data.sparklineData;
        color = isPriceUp ? "#ef4444" : isPriceDown ? "#10b981" : "#135bec"; // Dynamic Color
        currentValue = `${data.price.toFixed(2)} TWD`;
        tag = priceTag;
        break;
      case 'peRatio':
        title = "本益比 (P/E Ratio)";
        explanation = (!data.peRatio || data.peRatio <= 0)
          ? "目前公司處於虧損狀態，無法計算實質本益比。"
          : "算法為「股價 ÷ 每股盈餘 (EPS)」。用來評估買進股票後，假設公司獲利不變，需要多少年才能回本。";
        analysis = (!data.peRatio || data.peRatio <= 0)
          ? "目前公司處於虧損狀態，本益比無法給予參考。建議關注本業是否能轉虧為盈或觀察淨值比。"
          : `目前本益比為 ${data.peRatio.toFixed(1)} 倍。${peTag.text === '偏低估值' ? '處於相對便宜區間，具投資吸引力。' : '代表市場可能給予較高期待，需注意是否超漲。'}`;
        chartData = data.peSparkline || [];
        color = "#a855f7"; // purple
        currentValue = (!data.peRatio || data.peRatio <= 0) ? `虧損中` : `${data.peRatio.toFixed(2)} 倍`;
        tag = peTag;
        break;
      case 'pbRatio':
        title = "股價淨值比 (P/B Ratio)";
        explanation = "算法為「股價 ÷ 每股淨值」。用來衡量股價是否高於公司清算價值，特別適合評估金融股或景氣循環股。";
        analysis = `目前淨值比為 ${data.pbRatio ? data.pbRatio.toFixed(2) : '-'} 倍。${pbTag.text === '低於淨值' ? '數值偏低，可能有低估機會，俗稱「破淨」。' : '高於淨值較多，反映市場看好其無形資產或未來成長性。'}`;
        color = "#6366f1"; // indigo
        chartData = data.pbSparkline || [];
        currentValue = `${data.pbRatio ? data.pbRatio.toFixed(2) : '-'} 倍`;
        tag = pbTag;
        break;
      case 'dividendYield':
        title = "現金殖利率 (Dividend Yield)";
        explanation = (!data.dividendYield || data.dividendYield <= 0)
          ? "目前公司未配發現金股利。"
          : "算法為「(每股發放的現金股利 ÷ 股價) × 100%」。如同銀行定存利率，用來衡量投資能獲得的被動現金流報酬。";
        analysis = (!data.dividendYield || data.dividendYield <= 0)
          ? "目前公司未配發現金股利。若是成長型科技股，可能將資金保留作為未來投資擴張之用。"
          : `目前殖利率為 ${data.dividendYield.toFixed(1)}%。${yieldTag.text === '高配息' ? '屬於高配息水準，對存股族具備吸引力，能提供較好的下檔保護。' : '數值一般，需觀察未來配息是否穩定成長。'}`;
        color = "#f59e0b"; // amber
        chartData = data.yieldSparkline || [];
        currentValue = (!data.dividendYield || data.dividendYield <= 0) ? `無配息` : `${data.dividendYield.toFixed(2)} %`;
        tag = yieldTag;
        break;
      case 'forwardYield':
        title = "預估殖利率 (Forward Yield)";
        explanation = (!forwardYield || forwardYield <= 0)
          ? "無法計算預估殖利率（可能因公司近期虧損或未配息）。"
          : "算法為「(近四季累積 EPS × 歷史平均配息率) ÷ 股價」。此指標能提早反映公司近期獲利對未來配息能力的潛在影響，比單純看落後指標(歷史殖利率)更具前瞻性。";
        analysis = (!forwardYield || forwardYield <= 0)
          ? "預估殖利率無法評估。建議關注公司營運是否轉盈或具有其他成長動能。"
          : `考量近四季 EPS 與歷史發放率，預估未來一年殖利率約為 ${forwardYield.toFixed(1)}%。這有助於評估當前股價是否提供足夠的安全邊際。`;
        color = "#10b981"; // emerald
        chartData = []; // No sparkline for forward yield
        currentValue = (!forwardYield || forwardYield <= 0) ? `無預估` : `${forwardYield.toFixed(2)} %`;
        tag = (forwardYield && forwardYield > 4) ? { text: "具高殖利率潛力", textClass: "text-emerald-400", bgClass: "bg-emerald-500/10", borderClass: "border-emerald-500/20" } : { text: "合理水準", textClass: "text-blue-400", bgClass: "bg-blue-500/10", borderClass: "border-blue-500/20" };
        break;
    }

    return { title, explanation, analysis, chartData, color, currentValue, tag };
  };

  const modalContent = getModalContent();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 animate-pulse">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-surface border border-surfaceLight rounded-xl p-5 h-[104px]">
            <div className="h-4 bg-surfaceLight w-16 mb-4 rounded"></div>
            <div className="h-6 bg-surfaceLight w-24 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-surface border border-surfaceLight rounded-xl p-5 h-[104px] flex items-center justify-center">
            <span className="text-textMuted text-xs">暫無估值資料</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <div
          onClick={() => setActiveMetric('price')}
          className="bg-surface border border-surfaceLight rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-primary hover:scale-[1.02] cursor-pointer transition-all duration-300"
        >
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><Icon name="show_chart" className="text-4xl text-primary" /></div>
          <p className="text-sm text-textMuted mb-2">目前股價</p>
          <div className="flex items-end gap-2">
            <span className={`text-3xl font-bold z-10 ${priceColorClass}`}>{data.price.toFixed(2)}</span>
            <span className="text-sm text-textMuted mb-1 z-10">TWD</span>
          </div>
          <div className="absolute bottom-4 right-4 z-0 opacity-40 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <SparklineChart data={data.sparklineData} color={isPriceUp ? '#ef4444' : isPriceDown ? '#10b981' : '#135bec'} />
          </div>
          <div className={`mt-2 text-xs px-2 py-1 rounded w-fit font-medium relative z-10 ${priceTag.textClass} ${priceTag.bgClass}`}>{priceTag.text}</div>
        </div>

        <div
          onClick={() => setActiveMetric('peRatio')}
          className="bg-surface border border-surfaceLight rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-purple-500 hover:scale-[1.02] cursor-pointer transition-all duration-300"
        >
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-15 transition-opacity z-0 pointer-events-none"><Icon name="analytics" className="text-4xl text-purple-500" /></div>
          <p className="text-sm text-textMuted mb-2 relative z-10">本益比 (P/E)</p>
          <div className="flex items-baseline gap-2 relative z-10">
            {(!data.peRatio || data.peRatio <= 0) ? (
              <span className="text-3xl font-bold text-slate-400">虧損中</span>
            ) : (
              <>
                <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">{data.peRatio.toFixed(1)}</span>
                <span className="text-sm text-textMuted">倍</span>
              </>
            )}
          </div>
          <div className="absolute bottom-4 right-4 z-0 opacity-40 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <SparklineChart data={data.peSparkline || []} color="#a855f7" />
          </div>
          <div className={`mt-2 text-xs px-2 py-1 rounded w-fit font-medium relative z-10 ${peTag.textClass} ${peTag.bgClass}`}>{peTag.text}</div>
        </div>

        <div
          onClick={() => setActiveMetric('pbRatio')}
          className="bg-surface border border-surfaceLight rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-indigo-500 hover:scale-[1.02] cursor-pointer transition-all duration-300"
        >
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-15 transition-opacity z-0 pointer-events-none"><Icon name="pie_chart" className="text-4xl text-indigo-500" /></div>
          <p className="text-sm text-textMuted mb-2 relative z-10">股價淨值比 (P/B)</p>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">{data.pbRatio ? data.pbRatio.toFixed(2) : '-'}</span>
            <span className="text-sm text-textMuted">倍</span>
          </div>
          <div className="absolute bottom-4 right-4 z-0 opacity-40 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <SparklineChart data={data.pbSparkline || []} color="#6366f1" />
          </div>
          <div className={`mt-2 text-xs px-2 py-1 rounded w-fit font-medium relative z-10 ${pbTag.textClass} ${pbTag.bgClass}`}>{pbTag.text}</div>
        </div>

        <div
          onClick={() => setActiveMetric('dividendYield')}
          className="bg-surface border border-surfaceLight rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500 hover:scale-[1.02] cursor-pointer transition-all duration-300"
        >
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-15 transition-opacity z-0 pointer-events-none"><Icon name="savings" className="text-4xl text-amber-500" /></div>
          <p className="text-sm text-textMuted mb-2 relative z-10">現金殖利率</p>
          <div className="flex items-baseline gap-2 relative z-10">
            {(!data.dividendYield || data.dividendYield <= 0) ? (
              <span className="text-3xl font-bold text-slate-400">無配息</span>
            ) : (
              <>
                <span className="text-3xl font-bold text-amber-400">{data.dividendYield.toFixed(1)}</span>
                <span className="text-xl font-bold text-amber-400">%</span>
              </>
            )}
          </div>
          <div className="absolute bottom-4 right-4 z-0 opacity-40 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <SparklineChart data={data.yieldSparkline || []} color="#f59e0b" />
          </div>
          <div className={`mt-2 text-xs px-2 py-1 rounded w-fit font-medium relative z-10 ${yieldTag.textClass} ${yieldTag.bgClass}`}>{yieldTag.text}</div>
        </div>

        <div
          onClick={() => setActiveMetric('forwardYield')}
          className="bg-surface border border-surfaceLight rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500 hover:scale-[1.02] cursor-pointer transition-all duration-300"
        >
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-15 transition-opacity z-0 pointer-events-none"><Icon name="trending_up" className="text-4xl text-emerald-500" /></div>
          <p className="text-sm text-textMuted mb-2 relative z-10">預估殖利率</p>
          <div className="flex items-baseline gap-2 relative z-10">
            {(!forwardYield || forwardYield <= 0) ? (
              <span className="text-3xl font-bold text-slate-400">無預估</span>
            ) : (
              <>
                <span className="text-3xl font-bold text-emerald-400">{forwardYield.toFixed(1)}</span>
                <span className="text-xl font-bold text-emerald-400">%</span>
              </>
            )}
          </div>
          <div className={`mt-auto pt-4 text-xs px-2 py-1 rounded w-fit font-medium relative z-10 ${forwardYield && forwardYield > 4 ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 bg-slate-500/10'}`}>{forwardYield && forwardYield > 4 ? '優於定存' : '一般基準'}</div>
        </div>
      </div>

      {/* Modal */}
      {(activeMetric || isMounted) && modalContent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className={`absolute inset-0 bg-black/60 transition-all duration-300 ease-out ${isMounted ? 'opacity-100 backdrop-blur-sm' : 'opacity-0 backdrop-blur-none'}`} onClick={handleCloseModal}></div>
          <div className={`relative bg-surface border border-surfaceLight rounded-2xl w-full max-w-2xl shadow-2xl my-auto mx-auto overflow-hidden transition-all duration-300 ease-out transform ${isMounted ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}>
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-surfaceLight">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <Icon name="insert_chart_outlined" className="text-primary text-2xl" />
                {modalContent.title}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-textMuted hover:text-white transition-colors bg-surfaceLight/50 hover:bg-surfaceLight rounded-full p-2 flex items-center justify-center hover:scale-110 active:scale-95 duration-200"
              >
                <Icon name="close" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              {/* Highlight Dashboard Card */}
              <div className="flex items-center gap-4 mb-6 bg-surfaceLight/10 p-5 rounded-2xl border border-surfaceLight/30 shadow-inner">
                <div>
                  <p className="text-sm text-textMuted font-medium mb-1">當前數值</p>
                  <p className="text-4xl font-black tracking-tight" style={{ color: modalContent.color }}>
                    {modalContent.currentValue}
                  </p>
                </div>
                <div className={`ml-auto px-5 py-2.5 rounded-xl border-2 font-black tracking-wide shadow-sm ${modalContent.tag.bgClass} ${modalContent.tag.textClass} ${modalContent.tag.borderClass}`}>
                  {modalContent.tag.text}
                </div>
              </div>

              <div className="mb-6 bg-surfaceLight/20 p-4 rounded-xl border border-surfaceLight/50">
                <p className="text-sm text-slate-300 leading-relaxed">
                  <span className="font-bold text-white mr-2">📌 指標解說：</span>
                  {modalContent.explanation}
                </p>
              </div>

              {modalContent.chartData && modalContent.chartData.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs text-textMuted font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Icon name="timeline" className="text-textMuted" />
                    近 1 年走勢
                  </h4>
                  <div className="h-48 w-full bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={modalContent.chartData}>
                        <defs>
                          <linearGradient id="modalGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={modalContent.color} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={modalContent.color} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="time" hide />
                        <YAxis domain={['auto', 'auto']} hide />
                        <RechartsTooltip
                          separator=""
                          labelFormatter={(label) => label ? `${label}` : ''}
                          formatter={(value: any) => [`${value}`, '']}
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ color: modalContent.color, fontWeight: 'bold' }}
                          labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                          cursor={{ stroke: modalContent.color, strokeWidth: 1.5, strokeDasharray: '4 4' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          name="數值"
                          stroke={modalContent.color}
                          fill="url(#modalGradient)"
                          strokeWidth={2.5}
                          isAnimationActive={true}
                          animationDuration={500}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex items-start gap-3">
                <Icon name="lightbulb" className="text-primary mt-0.5" />
                <p className="text-sm text-primary leading-relaxed">
                  <span className="font-bold mr-1">當前分析：</span>
                  {modalContent.analysis}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
