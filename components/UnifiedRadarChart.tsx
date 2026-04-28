import React, { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, RadarChart, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { RawStockData } from '../types';
import { calculateRadarScores, selectPeerSamplePool } from '../utils/radarEngine';

interface Props {
    mainStock: RawStockData;
    peerPool: RawStockData[];
    industrySector: string;
    hoveredDimension?: string | null;
    setHoveredDimension?: (dim: string | null) => void;
}

export const UnifiedRadarChart: React.FC<Props> = ({ mainStock, peerPool, industrySector, hoveredDimension, setHoveredDimension }) => {
    const radarData = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const cacheKey = `radar_v3_${mainStock.id}_${today}`;
        
        // 嘗試從 sessionStorage 讀取快取
        const cachedData = sessionStorage.getItem(cacheKey);
        if (cachedData) {
            try {
                return JSON.parse(cachedData);
            } catch (e) {
                console.error("Cache parsing error:", e);
            }
        }

        // Select the sample pool (closest by market cap)
        const samplePool = selectPeerSamplePool(mainStock, peerPool, 10);
        
        // Compute Min-Max scores 20-100 for main stock and benchmark using the unified dynamic engine
        const { targetScores, benchmarkScores } = calculateRadarScores(mainStock, samplePool, industrySector);

        // Merge them into one data array for Recharts
        const finalData = targetScores.map((ts, index) => ({
            subject: ts.subject,
            mainScore: ts.score,
            avgScore: benchmarkScores[index].score, // Dynamic Benchmark Score (not always 50)
            metadata: ts.metadata // Keep metadata on the data object for Tooltip access
        }));

        // 寫入快取
        sessionStorage.setItem(cacheKey, JSON.stringify(finalData));
        return finalData;
    }, [mainStock, peerPool, industrySector]);

    // Extract tooltip content so it can be reused for static display
    const renderTooltipContent = (dataPoint: any) => (
        <div className="bg-surface border border-slate-600 rounded-xl p-3 shadow-[0_0_20px_rgba(0,0,0,0.8)] min-w-[200px] z-[100] relative backdrop-blur-none">
            <div className="flex items-center gap-2 mb-2 border-b border-surfaceLight pb-2">
                <span className="font-bold text-white text-lg">{dataPoint.subject}</span>
            </div>

            <div className="space-y-2">
                {/* Scores */}
                <div className="flex flex-col gap-1 text-sm bg-surfaceLight/30 p-2 rounded-lg">
                    <div className="flex justify-between items-center text-primary">
                        <span className="font-medium">個股得分</span>
                        <span className="font-bold">{dataPoint.mainScore} 分</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                        <span className="font-medium text-xs">同業標竿 (PR)</span>
                        <span className="font-bold">{dataPoint.avgScore} 分</span>
                    </div>
                </div>

                {/* Underlying Metadata */}
                {dataPoint.metadata && dataPoint.metadata.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-surfaceLight/50">
                        <span className="text-[10px] text-textMuted font-bold uppercase tracking-wider mb-1 block">
                            底層指標數據
                        </span>
                        <ul className="flex flex-col gap-1">
                            {dataPoint.metadata.map((meta: { label: string, valueData: string }, i: number) => (
                                <li key={i} className="flex justify-between items-center text-[11px]">
                                    <span className="text-slate-400">{meta.label}</span>
                                    <span className="text-white font-mono">{meta.valueData}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );

    // Custom Tooltip component to reveal bottom-layer indicators (for native recharts hover)
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return renderTooltipContent(payload[0].payload);
        }
        return null;
    };

    // State to track if mouse is over the chart area vs the explanation cards
    const [isMouseOverChart, setIsMouseOverChart] = useState(false);
    const [lastHoveredData, setLastHoveredData] = useState<any>(null);

    const hoveredData = useMemo(() => {
        if (!hoveredDimension) return null;
        return radarData.find(d => d.subject === hoveredDimension);
    }, [hoveredDimension, radarData]);

    useEffect(() => {
        if (hoveredData) {
            setLastHoveredData(hoveredData);
        }
    }, [hoveredData]);

    const showStaticTooltip = hoveredData && !isMouseOverChart;

    return (
        <div 
            className="flex-none h-80 border-b border-surfaceLight bg-surface/50 p-4 relative"
            onMouseEnter={() => setIsMouseOverChart(true)}
            onMouseLeave={() => setIsMouseOverChart(false)}
        >
            <h4 className="absolute top-4 left-4 text-sm font-bold text-textMuted uppercase tracking-wider z-10">
                真實財報量化同業對標雷達圖 (PR 百分位數)
            </h4>

            <ResponsiveContainer width="100%" height="100%" className="relative z-10">
                <RadarChart cx="50%" cy="55%" outerRadius="80%" data={radarData}>
                    <defs>
                        <linearGradient id="radarMainGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                        </linearGradient>
                        <linearGradient id="radarAvgGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.7}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.3}/>
                        </linearGradient>
                    </defs>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis
                        dataKey="subject"
                        tick={(props: any) => {
                            const { payload, x, y, textAnchor } = props;
                            const isHovered = hoveredDimension === payload.value;
                            return (
                                <g
                                    className="cursor-pointer outline-none transition-all duration-300"
                                    onMouseEnter={() => setHoveredDimension && setHoveredDimension(payload.value)}
                                    onMouseLeave={() => setHoveredDimension && setHoveredDimension(null)}
                                >
                                    <text
                                        x={x}
                                        y={y}
                                        textAnchor={textAnchor}
                                        dominantBaseline="central"
                                        style={{
                                            fill: isHovered ? '#22d3ee' : '#e2e8f0',
                                            fontSize: '14px',
                                            fontWeight: 700,
                                            transform: isHovered ? 'scale(1.25)' : 'scale(1)',
                                            transformOrigin: `${x}px ${y}px`,
                                            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {payload.value}
                                    </text>
                                </g>
                            );
                        }}
                    />
                    <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]} // Unified dimensions are always 0-100
                        tick={false}
                        axisLine={false}
                    />
                    <RechartsTooltip 
                        content={<CustomTooltip />} 
                        cursor={{ fill: 'rgba(255,255,255,0.02)' }} 
                        wrapperStyle={{ zIndex: 1000 }} 
                    />
                    <Radar
                        name="同業標竿 (均值)"
                        dataKey="avgScore"
                        stroke="#f59e0b"
                        fill="url(#radarAvgGradient)"
                        fillOpacity={1}
                        strokeWidth={2}
                        strokeDasharray="4 4"
                    />
                    <Radar
                        name="當前個股"
                        dataKey="mainScore"
                        stroke="#22d3ee"
                        fill="url(#radarMainGradient)"
                        fillOpacity={1}
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#22d3ee', strokeWidth: 2, stroke: '#0f172a' }}
                    />
                    <Legend
                        verticalAlign="bottom"
                        height={20}
                        iconType="circle"
                        wrapperStyle={{ fontSize: '14px', paddingTop: '10px', zIndex: 1 }}
                    />
                </RadarChart>
            </ResponsiveContainer>

            {/* Static overlay tooltip for when cards are hovered from below */}
            <div 
                className={`absolute top-4 z-[9999] pointer-events-none transition-opacity duration-300 drop-shadow-2xl ${showStaticTooltip ? 'opacity-100' : 'opacity-0'} ${
                    lastHoveredData && (lastHoveredData.subject === '估值水準' || lastHoveredData.subject === '籌碼與股息') 
                        ? 'left-4 right-auto' 
                        : 'right-4 left-auto'
                }`}
            >
                {lastHoveredData ? renderTooltipContent(lastHoveredData) : null}
            </div>
        </div>
    );
};
