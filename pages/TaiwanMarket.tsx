import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { Icon } from '../App';

// --- Mock Data Utilities ---

const generateSparkline = (points: number, isUp: boolean) => {
    const base = 50;
    const trend = isUp ? 1 : -1;
    return Array.from({ length: points }, (_, i) => ({
        value: base + (i * 2 * trend) + (Math.random() * 10)
    }));
};

const MiniSparkline = ({ data, color }: { data: any[], color: string }) => (
    <div className="h-8 w-16 opacity-80">
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.1} strokeWidth={1.5} isAnimationActive={false} />
                <YAxis domain={['auto', 'auto']} hide />
            </AreaChart>
        </ResponsiveContainer>
    </div>
);

const MOCK_ANOMALIES = [
    { name: '成交量激增', stock: '2330 台積電', reason: '量價齊揚', icon: 'bolt', color: 'text-amber-400' },
    { name: '法人急買', stock: '2454 聯發科', reason: '外資連 3 買', icon: 'groups', color: 'text-primary' },
    { name: '開低走高', stock: '2603 長榮', reason: '強勢韌性', icon: 'trending_up', color: 'text-up' },
];

const MOCK_HEATMAP = [
    { name: '半導體', value: 2.4, color: '#b91c1c', sub: 'IC設計、代工', flow: '45.2%', flowChange: '+5.2%', up: 45, down: 12, top: '2330' },
    { name: '航運業', value: -1.2, color: '#1e293b', sub: '貨櫃、散裝', flow: '12.4%', flowChange: '-2.1%', up: 5, down: 18, top: '2603' },
    { name: '電腦及週邊', value: 0.8, color: '#991b1b', sub: '伺服器、IPC', flow: '15.8%', flowChange: '+1.5%', up: 22, down: 8, top: '2382' },
    { name: '電子零組件', value: 1.5, color: '#b91c1c', sub: 'PCB、散熱', flow: '8.2%', flowChange: '+0.8%', up: 30, down: 10, top: '2313' },
    { name: '塑膠工業', value: -2.1, color: '#0f172a', sub: '原料、加工', flow: '3.5%', flowChange: '-0.4%', up: 2, down: 15, top: '1301' },
    { name: '生技醫療', value: 0.3, color: '#450a0a', sub: '新藥、醫材', flow: '2.8%', flowChange: '+0.2%', up: 12, down: 10, top: '1760' },
];

const MOCK_THEMATIC = [
    { name: 'AI 供應鏈', change: 3.2, count: 24, trend: generateSparkline(10, true) },
    { name: '電子五哥', change: 1.1, count: 5, trend: generateSparkline(10, true) },
    { name: '高股息 (High Dividend)', change: -0.5, count: 30, trend: generateSparkline(10, false) },
];

const MOCK_SELECTION_WALL = [
    { id: '2330', name: '台積電', score: 98, type: 'Health Score', industry: '半導體', tags: ['月線上', '黃金交叉'] },
    { id: '2454', name: '聯發科', score: 92, type: 'Health Score', industry: '半導體', tags: ['站上季線'] },
    { id: '2603', name: '長榮', yield: 8.5, type: 'High Yield', industry: '航運業', tags: ['填息中'] },
    { id: '2317', name: '鴻海', score: 85, type: 'Health Score', industry: '電腦及週邊', tags: ['法人續買'] },
    { id: '3711', name: '日月光', score: 88, type: 'Leader', industry: '半導體', tags: ['龍頭地位'] },
    { id: '2409', name: '友達', score: 75, type: 'Turnaround', industry: '光電業', tags: ['營收轉正'] },
];

const MOCK_CAUTION_LIST = [
    { id: '3231', name: '緯創', tag: '注意', time: '10:30 AM', remaining: '-', industry: '電腦及週邊' },
    { id: '2382', name: '廣達', tag: '處置', time: 'Yesterday', remaining: '3', total: 10, industry: '電腦及週邊', risk: 'HIGH RISK' },
];

const MOCK_INDUSTRY_DATA = [
    { name: '半導體', index: 482.15, change: 2.4, vol: 35.2, rep: '2330 台積電', yield: 2.1, health: 92 },
    { name: '電腦及週邊', index: 215.30, change: 0.8, vol: 18.5, rep: '2382 廣達', yield: 3.5, health: 85 },
    { name: '航運業', index: 185.60, change: -1.2, vol: 8.4, rep: '2603 長榮', yield: 8.5, health: 78 },
];

const MOCK_HOT_INDUSTRIES = [
    { name: '半導體', change: 2.4, vol: '35%', count: 12 },
    { name: '電腦及週邊', change: 1.5, vol: '18%', count: 8 },
    { name: '電子零組件', change: 1.8, vol: '10%', count: 32 },
    { name: '光電業', change: 0.8, vol: '8%', count: 15 },
    { name: '航運業', change: -1.2, vol: '12%', count: 5 },
    { name: '生技醫療', change: 0.3, vol: '5%', count: 20 },
    { name: '電機機械', change: 1.1, vol: '4%', count: 14 },
    { name: '觀光事業', change: 0.5, vol: '2%', count: 10 },
];

const StatCard = ({ title, value, change, isUp, unit, hasChart, extra }: any) => {
    const chartData = useMemo(() => generateSparkline(10, isUp), [isUp]);
    return (
        <div className="card-premium rounded-xl p-6 flex flex-col justify-between h-40 transition-all hover:translate-y-[-2px]">
            <div className="flex justify-between items-start">
                <p className="text-textMuted text-[10px] font-bold uppercase tracking-widest">{title}</p>
                {hasChart && <MiniSparkline data={chartData} color={isUp ? '#d64141' : '#1fb370'} />}
            </div>
            <div className="flex flex-col gap-1 mt-2">
                <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-black text-white font-mono-data tracking-tight">{value}</span>
                    {unit && <span className="text-textMuted text-xs font-bold">{unit}</span>}
                </div>
                {change && (
                    <div className={`text-xs font-bold flex items-center gap-1 font-mono-data ${isUp ? 'text-up/90' : 'text-down/90'}`}>
                        <Icon name={isUp ? 'arrow_upward' : 'arrow_downward'} className="text-[14px]" />
                        {change}
                    </div>
                )}
            </div>
            {extra && (
                <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center">
                    <span className="text-[10px] text-textMuted font-bold">{extra.label}</span>
                    <span className={`text-[11px] font-black font-mono-data ${extra.isPos ? 'text-primary' : 'text-rose-400'}`}>
                        {extra.value}
                    </span>
                </div>
            )}
        </div>
    );
};

const MarketBreadth = () => (
    <div className="card-premium rounded-xl p-6 h-40 flex flex-col justify-between">
        <div className="flex justify-between items-start">
            <p className="text-textMuted text-[10px] font-bold uppercase tracking-widest">市場熱度 (BREADTH)</p>
            <div className="text-right">
                <p className="text-[9px] text-textMuted font-bold uppercase">5MA 支撐率</p>
                <p className="text-xs font-black text-primary font-mono-data">72.5%</p>
            </div>
        </div>
        <div className="flex items-center gap-4 mt-1">
            <div className="flex-1 h-1.5 bg-slate-800/50 rounded-full flex overflow-hidden">
                <div className="h-full bg-up shadow-[0_0_8px_rgba(214,65,65,0.3)]" style={{ width: '60%' }}></div>
                <div className="h-full bg-slate-500" style={{ width: '10%' }}></div>
                <div className="h-full bg-down shadow-[0_0_8px_rgba(31,179,112,0.3)]" style={{ width: '30%' }}></div>
            </div>
            <span className="text-xs font-bold text-white font-mono-data">60%</span>
        </div>
        <div className="flex justify-between text-[10px] font-bold font-mono-data">
            <div className="flex items-center gap-1"><div className="size-1.5 rounded-full bg-up"></div> 620 上漲</div>
            <div className="flex items-center gap-1"><div className="size-1.5 rounded-full bg-slate-500"></div> 115 平盤</div>
            <div className="flex items-center gap-1"><div className="size-1.5 rounded-full bg-down"></div> 245 下跌</div>
        </div>
    </div>
);

const GaugeScore = ({ score }: { score: number }) => (
    <div className="relative size-12 flex items-center justify-center">
        <svg className="size-full" viewBox="0 0 36 36">
            <path className="text-slate-800 stroke-current" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path className="text-primary stroke-current" strokeWidth="3" strokeDasharray={`${score}, 100`} strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        </svg>
        <span className="absolute text-[10px] font-black text-white font-mono-data">{score}</span>
    </div>
);

const TaiwanMarket = ({ onNavigateToStock }: { onNavigateToStock: (id: string) => void }) => {
    const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
    const [activeStrategy, setActiveStrategy] = useState<'health' | 'yield' | 'leader' | 'turnaround'>('health');
    const [hoveredHeatmap, setHoveredHeatmap] = useState<any | null>(null);

    const filteredSelectionWall = useMemo(() => {
        let base = MOCK_SELECTION_WALL;
        if (selectedIndustry) base = base.filter(s => s.industry === selectedIndustry);
        if (activeStrategy === 'health') return base.filter(s => s.type === 'Health Score');
        if (activeStrategy === 'yield') return base.filter(s => s.type === 'High Yield');
        if (activeStrategy === 'leader') return base.filter(s => s.type === 'Leader');
        if (activeStrategy === 'turnaround') return base.filter(s => s.type === 'Turnaround');
        return base;
    }, [selectedIndustry, activeStrategy]);

    const filteredCautionList = useMemo(() => {
        if (!selectedIndustry) return MOCK_CAUTION_LIST;
        return MOCK_CAUTION_LIST.filter(s => s.industry === selectedIndustry);
    }, [selectedIndustry]);

    return (
        <div className="flex flex-col gap-8 animate-fade-in pb-20">
            {/* Top Stat Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    title="台指期 (FITX)" 
                    value="23,456.00" 
                    change="+0.51% (119.10)" 
                    isUp={true} 
                    hasChart={true} 
                    extra={{ label: '外資淨口數', value: '+15,240', isPos: true }}
                />
                <StatCard title="預估成交量 (VOLUME)" value="4,205" unit="億" isUp={false} hasChart={true} />
                <MarketBreadth />
            </div>

            {/* --- Hot Industry Row --- */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <Icon name="trending_up" className="text-amber-400 text-[18px]" />
                    <h3 className="text-white text-sm font-bold uppercase tracking-widest">熱門產業排榜 (HOT 6 SECTORS)</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {MOCK_HOT_INDUSTRIES.slice(0, 6).map((ind, i) => (
                        <div 
                            key={i} 
                            onClick={() => setSelectedIndustry(ind.name)}
                            className={`card-premium rounded-xl px-4 py-4 flex flex-col justify-between cursor-pointer hover:border-primary/50 transition-all ${selectedIndustry === ind.name ? 'border-primary bg-primary/5' : 'border-white/5 hover:bg-white/5'}`}
                        >
                            <div className="flex justify-between items-start">
                                <p className="text-white font-bold text-sm truncate">{ind.name}</p>
                                <span className="text-[9px] text-white/20 font-mono-data uppercase">#{i + 1}</span>
                            </div>
                            <div className="mt-4 flex justify-between items-end">
                                <p className={`font-black font-mono-data text-lg leading-none ${ind.change > 0 ? 'text-up/90' : 'text-down/90'}`}>
                                    {ind.change > 0 ? '+' : ''}{ind.change}%
                                </p>
                                <p className="text-[9px] text-textMuted font-mono-data uppercase">VOL {ind.vol}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Second Row: Heatmap & Thematic */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 card-premium rounded-2xl p-8 relative overflow-visible">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-white text-lg font-bold flex items-center gap-2">
                                <Icon name="grid_view" className="text-primary" />
                                產業熱力圖 (INDUSTRY HEATMAP)
                            </h3>
                            <p className="text-textMuted text-xs mt-1">資金流向佔比與漲跌比</p>
                        </div>
                        {selectedIndustry && (
                            <button 
                                onClick={() => setSelectedIndustry(null)}
                                className="text-xs bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full hover:bg-primary hover:text-white transition-all font-bold"
                            >
                                清除過濾: {selectedIndustry}
                            </button>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-3 grid-rows-2 h-[320px] gap-2">
                        {MOCK_HEATMAP.map((item, i) => (
                            <div 
                                key={i} 
                                onClick={() => setSelectedIndustry(item.name)}
                                onMouseEnter={() => setHoveredHeatmap(item)}
                                onMouseLeave={() => setHoveredHeatmap(null)}
                                className={`group relative p-4 flex flex-col justify-between overflow-hidden rounded-lg transition-all duration-300 cursor-pointer ${i === 0 ? 'row-span-2 col-span-1' : ''} ${selectedIndustry && selectedIndustry !== item.name ? 'opacity-40 grayscale-[0.5]' : 'hover:scale-[1.02] hover:shadow-lg hover:z-10'}`}
                                style={{ background: `linear-gradient(135deg, ${item.color}CC 0%, #0f172a 150%)` }}
                            >
                                <div className="z-10 flex justify-between items-start">
                                    <div>
                                        <div className="bg-black/20 backdrop-blur-sm px-2 py-1 rounded inline-block">
                                            <span className="text-[11px] font-black text-white/90 uppercase">{item.name}</span>
                                        </div>
                                        <p className="text-[10px] text-white/60 font-bold mt-1">Flow: {item.flow}</p>
                                    </div>
                                    <span className={`text-[10px] font-black font-mono-data ${item.flowChange.startsWith('+') ? 'text-primary' : 'text-rose-400'}`}>
                                        {item.flowChange}
                                    </span>
                                </div>
                                <span className="z-10 text-2xl font-black text-white font-mono-data">{item.value > 0 ? '+' : ''}{item.value}%</span>
                                
                                {/* Hover background effect */}
                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                        ))}
                    </div>

                    {/* Heatmap Tooltip */}
                    {hoveredHeatmap && (
                        <div className="absolute top-24 right-8 z-50 card-premium border border-primary/30 p-4 rounded-xl shadow-2xl animate-fade-in w-48 backdrop-blur-xl">
                            <h4 className="text-white font-bold text-sm mb-2">{hoveredHeatmap.name}</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-textMuted">漲跌家數比</span>
                                    <span className="text-white font-mono-data">{hoveredHeatmap.up}升 / {hoveredHeatmap.down}降</span>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-textMuted">領漲指標</span>
                                    <span className="text-primary font-bold">{hoveredHeatmap.top}</span>
                                </div>
                                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden mt-1">
                                    <div className="h-full bg-up" style={{ width: `${(hoveredHeatmap.up / (hoveredHeatmap.up + hoveredHeatmap.down)) * 100}%` }}></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="card-premium rounded-2xl p-8">
                    <h3 className="text-white text-lg font-bold mb-8 flex items-center gap-2">
                        <Icon name="auto_awesome" className="text-amber-400" />
                        主題投資 (THEMATIC)
                    </h3>
                    <div className="space-y-5">
                        {MOCK_THEMATIC.map((item, i) => (
                            <div key={i} className="group bg-slate-900/40 border border-white/5 rounded-xl p-5 flex justify-between items-center hover:border-primary/40 hover:bg-slate-900/60 cursor-pointer transition-all">
                                <div className="flex-1">
                                    <p className="text-white font-bold text-sm group-hover:text-primary transition-colors">{item.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-textMuted text-[10px]">{item.count} 檔成份股</p>
                                        <MiniSparkline data={item.trend} color={item.change > 0 ? '#d64141' : '#1fb370'} />
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-black font-mono-data ${item.change > 0 ? 'text-up/90' : 'text-down/90'}`}>
                                        {item.change > 0 ? '+' : ''}{item.change}%
                                    </p>
                                    <div className="w-16 h-1 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                                        <div className={`h-full transition-all duration-1000 ${item.change > 0 ? 'bg-up' : 'bg-down'}`} style={{ width: `${Math.abs(item.change) * 15}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Third Row: Strategy Wall & Unified Risk/Anomaly Monitor */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* --- Selection Wall --- */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <div className="card-premium rounded-2xl p-8 flex flex-col shadow-2xl flex-1">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-white text-lg font-bold flex items-center gap-2">
                                    <Icon name="bolt" className="text-amber-400" />
                                    選股牆 (STRATEGY WALL)
                                </h3>
                                <p className="text-textMuted text-xs mt-1">基於多維度指標的自動化選股</p>
                            </div>
                            <div className="flex bg-slate-900/60 p-1 rounded-lg border border-white/5">
                                {[
                                    { id: 'health', label: '健康', icon: 'favorite' },
                                    { id: 'yield', label: '殖利率', icon: 'local_atm' },
                                    { id: 'leader', label: '龍頭', icon: 'workspace_premium' },
                                    { id: 'turnaround', label: '轉機', icon: 'refresh' },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveStrategy(tab.id as any)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeStrategy === tab.id ? 'bg-primary text-white shadow-lg' : 'text-textMuted hover:text-white'}`}
                                    >
                                        <Icon name={tab.icon} className="text-[14px]" />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {filteredSelectionWall.map((s, i) => (
                                <div key={s.id} className="group relative bg-slate-900/40 border border-white/5 rounded-2xl p-5 hover:border-primary/50 transition-all cursor-pointer overflow-hidden">
                                    <div className="absolute top-0 right-0 p-3">
                                        <button className="text-textMuted hover:text-amber-400 transition-colors">
                                            <Icon name="star" className="text-[18px]" />
                                        </button>
                                    </div>
                                    <div className="flex items-start gap-4" onClick={() => onNavigateToStock(s.id)}>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-black text-white group-hover:text-primary transition-colors">{s.name}</span>
                                                <span className="bg-slate-800 text-textMuted text-[10px] px-1.5 py-0.5 rounded font-mono-data">{s.id}</span>
                                            </div>
                                            <p className="text-[10px] text-textMuted mt-1 flex items-center gap-1">
                                                <Icon name="category" className="text-[12px]" />
                                                {s.industry}
                                            </p>
                                            
                                            <div className="mt-4 flex items-center gap-3">
                                                {(activeStrategy === 'health' || activeStrategy === 'leader') ? (
                                                    <>
                                                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                            <div className="h-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ width: `${s.score}%` }}></div>
                                                        </div>
                                                        <span className="text-primary font-black font-mono-data text-sm">{s.score}</span>
                                                    </>
                                                ) : (
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-emerald-400 font-black font-mono-data text-xl">{s.yield}</span>
                                                        <span className="text-emerald-400/60 text-[10px] font-bold">%</span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {(s.tags || []).map(tag => (
                                                    <span key={tag} className="bg-slate-800/80 text-white/60 text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/5">
                                                        {tag}
                                                    </span>
                                                ))}
                                                <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/20">基本面優</span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Subtle background pulse for top ranks */}
                                    {i < 2 && <div className="absolute -bottom-6 -right-6 size-12 bg-primary/5 rounded-full blur-2xl"></div>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- Unified Risk & Intelligence Monitor --- */}
                <div className="card-premium rounded-2xl p-8 flex flex-col shadow-2xl overflow-hidden">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-white text-lg font-bold flex items-center gap-2">
                                <Icon name="radar" className="text-rose-500" />
                                風險與異常監控 (RISK & ANOMALIES)
                            </h3>
                            <p className="text-textMuted text-xs mt-1">即時整合警示、處置與市場異常</p>
                        </div>
                        <div className="flex items-center gap-2 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                            <span className="size-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></span>
                            <span className="text-rose-500 text-[9px] font-black tracking-widest uppercase">Live Pulse</span>
                        </div>
                    </div>

                    <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar pr-1 max-h-[600px]">
                        {/* Anomalies first */}
                        {MOCK_ANOMALIES.map((anom, i) => (
                            <div key={`anom-${i}`} className="group bg-slate-900/40 border border-white/5 rounded-xl p-4 hover:border-amber-400/30 transition-all cursor-pointer">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="size-7 rounded bg-amber-400/10 flex items-center justify-center">
                                            <Icon name={anom.icon} className={`${anom.color} text-[16px]`} />
                                        </div>
                                        <span className="text-white font-bold text-xs">{anom.stock}</span>
                                    </div>
                                    <span className="text-[9px] font-black bg-slate-800 text-amber-400 px-2 py-0.5 rounded border border-amber-400/20 tracking-widest uppercase">Anomalous</span>
                                </div>
                                <p className="text-[11px] text-textMuted">偵測到 <span className="text-amber-400 font-bold">{anom.name}</span>：{anom.reason}</p>
                            </div>
                        ))}

                        {/* Caution/Disposal List */}
                        {filteredCautionList.map((item, i) => (
                            <div key={`risk-${i}`} className="group bg-slate-900/40 border border-white/5 rounded-xl p-4 hover:border-rose-500/30 transition-all cursor-pointer">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className={`size-7 rounded flex items-center justify-center ${item.tag === '處置' ? 'bg-rose-500/20' : 'bg-slate-800'}`}>
                                            <Icon name={item.tag === '處置' ? 'gavel' : 'error'} className={item.tag === '處置' ? 'text-rose-500' : 'text-amber-400'} />
                                        </div>
                                        <span className="text-white font-bold text-xs">{item.name}</span>
                                        <span className="text-textMuted text-[10px] font-mono-data">{item.id}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase ${item.tag === '注意' ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'}`}>
                                        {item.tag}
                                    </span>
                                </div>
                                
                                {item.remaining !== '-' && (
                                    <div className="mt-2">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <p className="text-textMuted text-[9px] font-bold uppercase tracking-widest">處置進度</p>
                                            <span className="text-rose-400 text-[10px] font-black font-mono-data">-{item.remaining}D</span>
                                        </div>
                                        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-rose-500" 
                                                style={{ width: `${(1 - (Number(item.remaining) / (item.total || 10))) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    
                    <button className="mt-6 w-full py-3 rounded-xl bg-slate-900/60 border border-white/5 text-textMuted text-[10px] font-black hover:text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                        <Icon name="history" className="text-[16px]" />
                        歷史數據回溯 (HISTORY)
                    </button>
                </div>
            </div>

            {/* Bottom: Industry Data Table */}
            <div className="card-premium rounded-2xl p-8">
                <h3 className="text-white text-lg font-bold mb-8 flex items-center gap-2">
                    <Icon name="analytics" className="text-primary" />
                    產業詳細數據 (INDUSTRY DATA)
                </h3>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-xs text-left min-w-[800px]">
                        <thead>
                            <tr className="text-textMuted border-b border-white/5 pb-4">
                                <th className="pb-5 font-bold uppercase tracking-wider">產業 (Industry)</th>
                                <th className="pb-5 font-bold uppercase tracking-wider text-right">指數 (Index)</th>
                                <th className="pb-5 font-bold uppercase tracking-wider text-right">漲跌幅 (Change %)</th>
                                <th className="pb-5 font-bold uppercase tracking-wider text-right">成交比重 (Vol %)</th>
                                <th className="pb-5 font-bold uppercase tracking-wider text-center">代表股 (Rep. Stock)</th>
                                <th className="pb-5 font-bold uppercase tracking-wider text-right">殖利率 (Yield %)</th>
                                <th className="pb-5 font-bold uppercase tracking-wider text-right">健康分數 (Health)</th>
                            </tr>
                        </thead>
                        <tbody className="text-white divide-y divide-white/5">
                            {MOCK_INDUSTRY_DATA.map((item, i) => (
                                <tr key={i} className="hover:bg-white/5 transition-colors cursor-pointer group">
                                    <td className="py-5 font-bold text-slate-300 group-hover:text-primary transition-colors">{item.name}</td>
                                    <td className="py-5 text-right font-mono-data">{item.index.toFixed(2)}</td>
                                    <td className={`py-5 text-right font-black font-mono-data ${item.change > 0 ? 'text-up/90' : 'text-down/90'}`}>
                                        {item.change > 0 ? '+' : ''}{item.change}%
                                    </td>
                                    <td className="py-5 text-right font-mono-data">{item.vol}%</td>
                                    <td className="py-5 text-center text-textMuted">{item.rep}</td>
                                    <td className="py-5 text-right font-mono-data">{item.yield}%</td>
                                    <td className="py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-primary" style={{ width: `${item.health}%` }}></div>
                                            </div>
                                            <span className="font-black font-mono-data text-primary w-6 text-right">
                                                {item.health}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TaiwanMarket;
