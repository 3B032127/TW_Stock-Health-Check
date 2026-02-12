import React, { useMemo } from 'react';
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';
import { useSectorData } from '../hooks/useMarketData';
import { Icon } from '../App';

// Custom Content Component for Treemap Node
const CustomizedContent = (props: any) => {
    const { root, depth, x, y, width, height, index, payload, colors, rank, name, change } = props;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: depth < 2 ? colors[Math.floor((index / root.children.length) * 6)] : 'transparent',
                    stroke: '#fff',
                    strokeWidth: 2 / (depth + 1e-10),
                    strokeOpacity: 1 / (depth + 1e-10),
                }}
            />
            {/* 
        Only show text if the box is big enough.
        Simple heuristic: width > 50 and height > 40
      */}
            {width > 50 && height > 40 && (
                <>
                    <text
                        x={x + width / 2}
                        y={y + height / 2 - 8}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={Math.min(width / 6, 16)} // Dynamic font size based on width
                        fontWeight="bold"
                    >
                        {name}
                    </text>
                    <text
                        x={x + width / 2}
                        y={y + height / 2 + 12}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={Math.min(width / 8, 14)}
                    >
                        {change > 0 ? '+' : ''}{change}%
                    </text>
                </>
            )}
        </g>
    );
};

// Define Color Helper based on Change % - High Contrast for Readability
const getFillColor = (change: number) => {
    if (change > 3.0) return '#991b1b'; // Red-800 (Deep Red) - Clear contrast for white text
    if (change >= 0.1) return '#dc2626'; // Red-600 (Vibrant Red)
    if (change > -0.1) return '#4b5563'; // Gray-600 (Solid Gray)
    if (change >= -3.0) return '#166534'; // Green-700 (Vibrant Green)
    return '#14532d'; // Green-900 (Deep Green)
};

const SectorHeatmap: React.FC = () => {
    const { sectors, isLoading, isFetching } = useSectorData();

    // Process data for Treemap
    // Recharts Treemap expects nested data structure usually, but can handle flat array if configured?
    // Actually, standard usage often wraps in a root for single-level treemap.
    const treeMapData = useMemo(() => {
        if (!sectors || sectors.length === 0) return [];

        // Convert flat list to children of a root node
        return [
            {
                name: 'Market',
                children: sectors.map(s => ({
                    name: s.name,
                    size: s.value, // Recharts uses 'size' or 'value' prop? checking docs... usually 'size' or dataKey="value"
                    value: s.value,
                    change: s.change
                }))
            }
        ];
    }, [sectors]);

    // Custom Content Prop requires a different approach in newer Recharts or custom implementation.
    // We can pass a functional component.

    // Actually, let's use the content prop on Treemap to render custom cells.
    // We need to pass the custom color logic into the content renderer or handle it there.

    if (isLoading) {
        return (
            <div className="h-[400px] w-full flex items-center justify-center bg-surface border border-surfaceLight rounded-xl">
                <span className="text-textMuted animate-pulse">載入產業數據 (FinMind)...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 px-1">
                <Icon name="grid_view" className="text-primary" />
                <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-white">產業行情熱力圖</h2>
                    <span className="text-xs text-textMuted">依成交值(面積)與漲跌幅(顏色)視覺化呈現</span>
                </div>
                {isFetching && !isLoading && <span className="text-xs text-textMuted animate-pulse ml-2">更新中...</span>}
            </div>

            <div className="h-[300px] lg:h-[400px] w-full bg-surface border border-surfaceLight rounded-xl overflow-hidden p-2">
                <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                        data={treeMapData}
                        dataKey="size"
                        aspectRatio={4 / 3}
                        stroke="#1e293b"
                        fill="#8884d8"
                        content={(props: any) => {
                            const { root, depth, x, y, width, height, index, payload, colors, rank, name } = props;

                            // Robustly access 'change' property
                            // Recharts passes data differently depending on nesting and version
                            let change = 0;
                            if (typeof props.change === 'number') {
                                change = props.change;
                            } else if (payload && typeof payload.change === 'number') {
                                change = payload.change;
                            } else if (root && root.children && root.children[index] && typeof root.children[index].change === 'number') {
                                change = root.children[index].change;
                            }

                            const color = getFillColor(change);

                            return (
                                <g>
                                    <rect
                                        x={x}
                                        y={y}
                                        width={width}
                                        height={height}
                                        fill={color}
                                        stroke="#1e293b"
                                        strokeWidth={1}
                                        className="transition-all hover:opacity-90 cursor-pointer"
                                    />
                                    {/* Only show text if box is large enough */}
                                    {width > 42 && height > 36 && (
                                        <>
                                            <text
                                                x={x + width / 2}
                                                y={y + height / 2 - 7}
                                                textAnchor="middle"
                                                fill="#fff"
                                                // Increased font size and minimum size
                                                fontSize={Math.max(13, Math.min(width / 5, 20))}
                                                fontWeight="700"
                                                style={{
                                                    textShadow: '0px 2px 4px rgba(0,0,0,0.8)',
                                                    pointerEvents: 'none'
                                                }}
                                            >
                                                {name}
                                            </text>
                                            <text
                                                x={x + width / 2}
                                                y={y + height / 2 + 11}
                                                textAnchor="middle"
                                                fill="#f0f9ff" // Slightly off-white for distinction
                                                // Increased font size
                                                fontSize={Math.max(11, Math.min(width / 6, 16))}
                                                fontWeight="500"
                                                style={{
                                                    textShadow: '0px 2px 4px rgba(0,0,0,0.8)',
                                                    pointerEvents: 'none'
                                                }}
                                            >
                                                {change > 0 ? '▲' : change < 0 ? '▼' : ''} {Math.abs(change)}%
                                            </text>
                                        </>
                                    )}
                                </g>
                            );
                        }}
                    >
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-surface border border-surfaceLight rounded-lg px-3 py-2 shadow-lg z-50">
                                            <p className="text-white font-bold text-sm mb-1">{data.name}</p>
                                            <div className={`flex items-center text-sm font-bold ${data.change >= 0.1 ? 'text-up' : data.change <= -0.1 ? 'text-down' : 'text-gray-400'}`}>
                                                <span>{data.change > 0 ? '+' : ''}{data.change}%</span>
                                            </div>
                                            <p className="text-xs text-textMuted mt-1">
                                                成交值: {(data.value / 100000000).toFixed(1)}億
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                    </Treemap>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 text-sm justify-center lg:justify-end px-2 font-medium">
                <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 bg-[#991b1b] rounded-sm shadow-sm"></span>
                    <span className="text-text">&gt; 3%</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 bg-[#dc2626] rounded-sm shadow-sm"></span>
                    <span className="text-text">0.1~3%</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 bg-[#4b5563] rounded-sm shadow-sm"></span>
                    <span className="text-text">±0.1%</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 bg-[#166534] rounded-sm shadow-sm"></span>
                    <span className="text-text">-3~-0.1%</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 bg-[#14532d] rounded-sm shadow-sm"></span>
                    <span className="text-text">&lt; -3%</span>
                </div>
            </div>
        </div>
    );
};

export default SectorHeatmap;
