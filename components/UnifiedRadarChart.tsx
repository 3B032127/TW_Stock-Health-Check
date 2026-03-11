import React, { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, RadarChart, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { RawStockData } from '../types';
import { calculateRadarScores } from '../utils/radarEngine';

interface Props {
    mainStock: RawStockData;
    industryAverage: RawStockData;
    industrySector: string;
    hoveredDimension?: string | null;
    setHoveredDimension?: (dim: string | null) => void;
}

export const UnifiedRadarChart: React.FC<Props> = ({ mainStock, industryAverage, industrySector, hoveredDimension, setHoveredDimension }) => {
    const radarData = useMemo(() => {
        // Compute scores 0-100 for main stock and industry avg using the unified engine
        const mainScores = calculateRadarScores(mainStock, industrySector);
        const avgScores = calculateRadarScores(industryAverage, industrySector);

        // Merge them into one data array for Recharts
        return mainScores.map((ms, i) => ({
            subject: ms.subject,
            mainScore: ms.score,
            avgScore: avgScores[i]?.score || 0,
            metadata: ms.metadata // Keep metadata on the data object for Tooltip access
        }));
    }, [mainStock, industryAverage, industrySector]);

    // Extract tooltip content so it can be reused for static display
    const renderTooltipContent = (dataPoint: any) => (
        <div className="bg-surface border border-slate-600 rounded-xl p-5 shadow-[0_0_30px_rgba(0,0,0,0.8)] min-w-[240px] z-[100] relative backdrop-blur-none">
            <div className="flex items-center gap-2 mb-3 border-b border-surfaceLight pb-3">
                <span className="font-bold text-white text-xl">{dataPoint.subject}</span>
            </div>

            <div className="space-y-4">
                {/* Scores */}
                <div className="flex flex-col gap-2 text-base bg-surfaceLight/30 p-3 rounded-lg">
                    <div className="flex justify-between items-center text-primary">
                        <span className="font-medium">個股得分</span>
                        <span className="font-bold text-lg">{dataPoint.mainScore} 分</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                        <span className="font-medium">同業基準</span>
                        <span className="font-bold text-lg">{dataPoint.avgScore} 分</span>
                    </div>
                </div>

                {/* Underlying Metadata */}
                {dataPoint.metadata && dataPoint.metadata.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-surfaceLight/50">
                        <span className="text-sm text-textMuted font-bold uppercase tracking-wider mb-2 block">
                            底層指標貢獻
                        </span>
                        <ul className="flex flex-col gap-2">
                            {dataPoint.metadata.map((meta: { label: string, valueData: string }, i: number) => (
                                <li key={i} className="flex justify-between items-center text-sm">
                                    <span className="text-slate-300">{meta.label}</span>
                                    <span className="text-white font-mono text-base">{meta.valueData}</span>
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
                個股 vs 同業綜合滿分圖 (滿分100)
            </h4>

            <ResponsiveContainer width="100%" height="100%" className="relative z-10">
                <RadarChart cx="50%" cy="55%" outerRadius="80%" data={radarData}>
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
                                            fill: isHovered ? '#38bdf8' : '#e2e8f0',
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
                        name="同業平均"
                        dataKey="avgScore"
                        stroke="#64748b"
                        fill="#64748b"
                        fillOpacity={0.15}
                        strokeDasharray="4 4"
                    />
                    <Radar
                        name="當前個股"
                        dataKey="mainScore"
                        stroke="#38bdf8"
                        fill="#38bdf8"
                        fillOpacity={0.55}
                        strokeWidth={2}
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
