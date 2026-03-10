import React, { useMemo } from 'react';
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

    // Custom Tooltip component to reveal bottom-layer indicators
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;

            return (
                <div className="bg-surface border border-surfaceLight rounded-xl p-4 shadow-xl backdrop-blur-md min-w-[200px]">
                    <div className="flex items-center gap-2 mb-3 border-b border-surfaceLight pb-2">
                        <span className="font-bold text-white text-lg">{dataPoint.subject}</span>
                    </div>

                    <div className="space-y-3">
                        {/* Scores */}
                        <div className="flex flex-col gap-1 text-sm bg-surfaceLight/20 p-2 rounded-lg">
                            <div className="flex justify-between items-center text-primary">
                                <span className="font-medium">個股得分</span>
                                <span className="font-bold">{dataPoint.mainScore} 分</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400">
                                <span className="font-medium">同業基準</span>
                                <span className="font-bold">{dataPoint.avgScore} 分</span>
                            </div>
                        </div>

                        {/* Underlying Metadata */}
                        {dataPoint.metadata && dataPoint.metadata.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-surfaceLight/50">
                                <span className="text-xs text-textMuted font-bold uppercase tracking-wider mb-2 block">
                                    底層指標貢獻
                                </span>
                                <ul className="flex flex-col gap-1.5">
                                    {dataPoint.metadata.map((meta: { label: string, valueData: string }, i: number) => (
                                        <li key={i} className="flex justify-between items-center text-xs">
                                            <span className="text-slate-300">{meta.label}</span>
                                            <span className="text-white font-mono">{meta.valueData}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex-none h-80 border-b border-surfaceLight bg-surface/50 p-4 relative">
            <h4 className="absolute top-4 left-4 text-sm font-bold text-textMuted uppercase tracking-wider">
                個股 vs 同業綜合滿分圖 (滿分100)
            </h4>
            <ResponsiveContainer width="100%" height="100%">
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
                                            fill: isHovered ? '#60a5fa' : '#e2e8f0',
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
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                    <Radar
                        name="同業平均"
                        dataKey="avgScore"
                        stroke="#94a3b8"
                        fill="#94a3b8"
                        fillOpacity={0.3}
                    />
                    <Radar
                        name="當前個股"
                        dataKey="mainScore"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.5}
                    />
                    <Legend
                        verticalAlign="bottom"
                        height={20}
                        iconType="circle"
                        wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
};
