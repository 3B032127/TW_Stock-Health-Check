import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface StockLoadingProps {
    text?: string;
}

interface ChartDataPoint {
    time: number;
    value: number;
}

const StockLoading: React.FC<StockLoadingProps> = ({
    text = "獲取最新股市資料中..."
}) => {
    // Increased to 40 points for ultra-smooth curves
    const [chartData, setChartData] = useState<ChartDataPoint[]>(() =>
        Array.from({ length: 40 }, (_, i) => ({
            time: i,
            value: 50
        }))
    );

    const [subtitle, setSubtitle] = useState("正在連線至證券交易所...");

    // Simple momentum tracking
    const momentumRef = useRef(0);

    const subtitles = [
        "正在連線至證券交易所...",
        "計算技術指標中...",
        "同步市場數據...",
        "分析即時報價..."
    ];

    // Ultra-smooth animation with requestAnimationFrame
    useEffect(() => {
        let counter = 40;
        let animationFrame: number;
        let lastUpdate = Date.now();

        const animate = () => {
            const now = Date.now();
            const delta = now - lastUpdate;

            // Update every ~40ms for high FPS (~25 fps)
            if (delta >= 40) {
                lastUpdate = now;

                setChartData(prev => {
                    const lastValue = prev[prev.length - 1]?.value || 50;

                    // Stronger momentum for dramatic movement
                    let momentum = momentumRef.current * 0.88; // Lower persistence for more variation
                    momentum += (Math.random() - 0.5) * 3; // Larger impulse for dramatic waves
                    momentum = Math.max(-3.5, Math.min(3.5, momentum)); // Wider range for big swings
                    momentumRef.current = momentum;

                    // Calculate new value
                    let newValue = lastValue + momentum;
                    newValue = Math.max(20, Math.min(80, newValue));

                    counter++;
                    return [
                        ...prev.slice(1),
                        {
                            time: counter,
                            value: newValue
                        }
                    ];
                });
            }

            animationFrame = requestAnimationFrame(animate);
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, []);

    // Subtitle rotation
    useEffect(() => {
        let index = 0;
        const interval = setInterval(() => {
            index = (index + 1) % subtitles.length;
            setSubtitle(subtitles[index]);
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    // Memoize color calculation
    const { isUpTrend, lineColor } = useMemo(() => {
        const startValue = chartData[0]?.value || 50;
        const latestValue = chartData[chartData.length - 1]?.value || 50;
        const up = latestValue >= startValue;
        return {
            isUpTrend: up,
            lineColor: up ? '#ef4444' : '#10b981'
        };
    }, [chartData]);

    return (
        <div
            className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50"
            style={{
                backgroundImage: `
                    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px'
            }}
        >
            {/* Chart Container */}
            <div className="w-full max-w-xl h-48 mb-8 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={chartData}
                        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    >
                        <defs>
                            {/* Enhanced multi-layer neon glow */}
                            <filter id="glow" height="400%" width="400%" x="-150%" y="-150%">
                                {/* Outer glow - very strong */}
                                <feGaussianBlur stdDeviation="12" result="outerGlow" />
                                {/* Medium glow */}
                                <feGaussianBlur stdDeviation="6" in="SourceGraphic" result="mediumGlow" />
                                {/* Inner glow */}
                                <feGaussianBlur stdDeviation="3" in="SourceGraphic" result="innerGlow" />
                                {/* Combine all layers */}
                                <feMerge>
                                    <feMergeNode in="outerGlow" />
                                    <feMergeNode in="outerGlow" />
                                    <feMergeNode in="mediumGlow" />
                                    <feMergeNode in="innerGlow" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={lineColor}
                            strokeWidth={4}
                            dot={false}
                            isAnimationActive={false}
                            animationDuration={0}
                            filter="url(#glow)"
                        />
                    </LineChart>
                </ResponsiveContainer>

                {/* Enhanced CSS glow layers for strong neon effect */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: `radial-gradient(ellipse 90% 70% at center, ${lineColor}50 0%, ${lineColor}30 20%, ${lineColor}15 40%, transparent 70%)`,
                    }}
                />
                <div
                    className="absolute inset-0 pointer-events-none blur-3xl"
                    style={{
                        background: `radial-gradient(ellipse 80% 60% at center, ${lineColor}40 0%, transparent 60%)`,
                    }}
                />
            </div>

            {/* Main Text */}
            <div className="text-center space-y-3">
                <h2 className="text-2xl font-bold text-white animate-pulse">
                    {text}
                </h2>

                <div className="flex items-center justify-center space-x-2">
                    <div
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ backgroundColor: lineColor }}
                    />
                    <p className="text-sm text-textMuted uppercase tracking-wider">
                        {subtitle}
                    </p>
                </div>
            </div>

            {/* Status Indicators */}
            <div className="mt-12 flex items-center space-x-6 text-xs text-textMuted">
                <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                    <span>History Data</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                    <span>Model Inference</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: lineColor, animationDelay: '0.6s' }} />
                    <span>Trend Detection</span>
                </div>
            </div>
        </div>
    );
};

export default StockLoading;
