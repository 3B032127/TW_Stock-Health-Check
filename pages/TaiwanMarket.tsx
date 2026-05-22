import React, { useState, useMemo, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { Icon } from '../App';
import { CONCEPTS, CATEGORIES, CONCEPT_COLORS, Concept } from '../constants/concepts';
import { API_BASE_URL } from '../services/api';
import { useStockList } from '../hooks/useStockList';
import { DbStockStats } from '../types';


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

const getStockSegment = (conceptId: string, stockId: string): string[] => {
    if (conceptId === 'asic_ip') {
        if (["3529", "6643", "6533", "6423"].includes(stockId)) return ["upstream"];
        if (["8227", "6695", "6462"].includes(stockId)) return ["midstream"];
        if (["3443", "3035"].includes(stockId)) return ["upstream", "midstream"];
        if (["3661"].includes(stockId)) return ["downstream"];
    }
    if (conceptId === 'hpc_network_ic') {
        if (["2454"].includes(stockId)) return ["upstream"];
        if (["5274"].includes(stockId)) return ["downstream"];
        return ["midstream"];
    }
    if (conceptId === 'ddic_drivers') {
        if (["2303", "5347", "8150", "6147", "6770"].includes(stockId)) return ["upstream"];
        if (["3141", "HIMX", "3527", "2458", "3545", "3034", "3592", "8016", "4961"].includes(stockId)) return ["midstream"];
    }
    if (conceptId === 'analog_pmic') {
        if (["4919", "3227", "6679", "3288"].includes(stockId)) return ["upstream"];
        if (["6138", "6799", "2436", "6202", "3014", "8081", "5299", "7707", "6415", "6719"].includes(stockId)) return ["midstream"];
        if (["5347", "5425"].includes(stockId)) return ["downstream"];
    }
    return [];
};

const TaiwanMarket = ({ onNavigateToStock }: { onNavigateToStock: (id: string) => void }) => {
    const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
    const [activeStrategy, setActiveStrategy] = useState<'health' | 'yield' | 'leader' | 'turnaround'>('health');
    const [hoveredHeatmap, setHoveredHeatmap] = useState<any | null>(null);

    // --- 台股題材地圖核心狀態與資料讀取 ---
    const { stocks: allStocksList } = useStockList();
    const [dbStocksStats, setDbStocksStats] = useState<DbStockStats[]>([]);
    const [selectedConceptCategory, setSelectedConceptCategory] = useState<string>('all');
    const [conceptSearchQuery, setConceptSearchQuery] = useState<string>('');
    const [conceptDisplayMode, setConceptDisplayMode] = useState<'all' | 'active'>('all');
    const [activeConceptDetail, setActiveConceptDetail] = useState<Concept | null>(null);
    const [isBatchSyncing, setIsBatchSyncing] = useState<boolean>(false);
    const [syncProgressText, setSyncProgressText] = useState<string>('');

    // --- IC設計專屬儀表板局部狀態 ---
    const [icViewMode, setIcViewMode] = useState<'heatmap' | 'list'>('heatmap');
    const [icTimeframe, setIcTimeframe] = useState<'day' | 'week' | 'month'>('day');
    const [selectedValueChainSegment, setSelectedValueChainSegment] = useState<string | null>(null);
    const [hoveredIcStock, setHoveredIcStock] = useState<string | null>(null);
    const [selectedIcStockForBubble, setSelectedIcStockForBubble] = useState<string | null>(null);

    // 切換題材時重設 IC 儀表板狀態
    useEffect(() => {
        setIcViewMode('heatmap');
        setIcTimeframe('day');
        setSelectedValueChainSegment(null);
        setHoveredIcStock(null);
        setSelectedIcStockForBubble(null);
    }, [activeConceptDetail]);

    // 載入資料庫的真實股價與健康分數數據
    const fetchDbStocks = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/database/stocks`);
            if (res.ok) {
                const data = await res.json();
                setDbStocksStats(data);
            }
        } catch (e) {
            console.error("Failed to fetch DB stock stats for concepts", e);
        }
    };

    useEffect(() => {
        fetchDbStocks();
    }, []);

    // 一鍵同步概念成分股
    const handleBatchSyncConceptStocks = async (stocksToSync: string[]) => {
        if (stocksToSync.length === 0 || isBatchSyncing) return;
        setIsBatchSyncing(true);
        try {
            for (let i = 0; i < stocksToSync.length; i++) {
                const sid = stocksToSync[i];
                const matchStock = allStocksList.find(s => s.stock_id === sid);
                const name = matchStock?.stock_name || sid;
                setSyncProgressText(`正在同步 (${i + 1}/${stocksToSync.length})：${sid} ${name}...`);
                try {
                    await fetch(`${API_BASE_URL}/stock/${sid}/sync`, { method: 'POST' });
                } catch (err) {
                    console.error(`Failed to sync stock ${sid}`, err);
                }
            }
            setSyncProgressText('同步完成！正在刷新數據...');
            await fetchDbStocks();
        } catch (e) {
            console.error("Failed to batch sync concept stocks", e);
        } finally {
            setIsBatchSyncing(false);
            setSyncProgressText('');
        }
    };

    // 單一股票在抽屜內同步
    const handleSyncSingleStockInDrawer = async (stockId: string) => {
        setSyncProgressText(`正在同步：${stockId}...`);
        try {
            await fetch(`${API_BASE_URL}/stock/${stockId}/sync`, { method: 'POST' });
            await fetchDbStocks();
        } catch (err) {
            console.error(`Failed to sync stock ${stockId}`, err);
        } finally {
            setSyncProgressText('');
        }
    };


    const filteredConcepts = useMemo(() => {
        return CONCEPTS.filter(c => {
            const matchesCategory = selectedConceptCategory === 'all' || c.category === selectedConceptCategory;
            const matchesSearch = c.name.toLowerCase().includes(conceptSearchQuery.toLowerCase()) || 
                                 c.description.toLowerCase().includes(conceptSearchQuery.toLowerCase());
            const matchesActivity = conceptDisplayMode === 'all' || c.hasNewActivity;
            return matchesCategory && matchesSearch && matchesActivity;
        });
    }, [selectedConceptCategory, conceptSearchQuery, conceptDisplayMode]);

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

            {/* --- Hot Concept Map --- */}
            <div className="card-premium rounded-2xl p-8 flex flex-col shadow-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h3 className="text-white text-lg font-bold flex items-center gap-2">
                            <Icon name="map" className="text-primary" />
                            台股熱門題材地圖 (HOT CONCEPT MAP)
                        </h3>
                        <p className="text-textMuted text-xs mt-1">
                            精選 78 個核心熱門題材與板塊，結合本地 SQLite 資料庫，提供成分股健康度與股價快取更新
                        </p>
                    </div>
                    
                    {/* Controls: Search & Activity Toggle */}
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                        {/* Search Input */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="搜尋題材名稱或描述..."
                                value={conceptSearchQuery}
                                onChange={(e) => setConceptSearchQuery(e.target.value)}
                                className="w-full sm:w-64 bg-slate-900/60 text-white placeholder-textMuted/50 border border-white/5 rounded-xl px-4 py-2 pl-10 text-xs focus:outline-none focus:border-primary/50 transition-all backdrop-blur-sm"
                            />
                            <Icon name="search" className="absolute left-3 top-2.5 text-textMuted text-[14px]" />
                            {conceptSearchQuery && (
                                <button 
                                    onClick={() => setConceptSearchQuery('')}
                                    className="absolute right-3 top-2 text-textMuted hover:text-white"
                                >
                                    <Icon name="close" className="text-[14px]" />
                                </button>
                            )}
                        </div>
                        
                        {/* Activity Mode Switch */}
                        <div className="flex bg-slate-900/60 p-1 rounded-xl border border-white/5 backdrop-blur-sm self-start sm:self-auto">
                            <button
                                onClick={() => setConceptDisplayMode('all')}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${conceptDisplayMode === 'all' ? 'bg-primary text-white shadow-lg' : 'text-textMuted hover:text-white'}`}
                            >
                                全部
                            </button>
                            <button
                                onClick={() => setConceptDisplayMode('active')}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${conceptDisplayMode === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shadow-lg' : 'text-textMuted hover:text-white'}`}
                            >
                                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                有新動態
                            </button>
                        </div>
                    </div>
                </div>

                {/* Categories Tab Bar */}
                <div className="flex gap-2 overflow-x-auto pb-4 mb-6 custom-scrollbar scroll-smooth">
                    <button
                        onClick={() => setSelectedConceptCategory('all')}
                        className={`flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-bold transition-all border ${
                            selectedConceptCategory === 'all'
                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                : 'bg-slate-900/40 text-textMuted border-white/5 hover:border-white/20 hover:text-white'
                        }`}
                    >
                        全部 ({CONCEPTS.filter(c => {
                            const matchesSearch = c.name.toLowerCase().includes(conceptSearchQuery.toLowerCase()) || 
                                                 c.description.toLowerCase().includes(conceptSearchQuery.toLowerCase());
                            const matchesActivity = conceptDisplayMode === 'all' || c.hasNewActivity;
                            return matchesSearch && matchesActivity;
                        }).length})
                    </button>
                    {CATEGORIES.map(cat => {
                        const count = CONCEPTS.filter(c => {
                            const matchesCat = c.category === cat;
                            const matchesSearch = c.name.toLowerCase().includes(conceptSearchQuery.toLowerCase()) || 
                                                 c.description.toLowerCase().includes(conceptSearchQuery.toLowerCase());
                            const matchesActivity = conceptDisplayMode === 'all' || c.hasNewActivity;
                            return matchesCat && matchesSearch && matchesActivity;
                        }).length;

                        return (
                            <button
                                key={cat}
                                onClick={() => setSelectedConceptCategory(cat)}
                                className={`flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${
                                    selectedConceptCategory === cat
                                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                        : 'bg-slate-900/40 text-textMuted border-white/5 hover:border-white/20 hover:text-white'
                                }`}
                            >
                                {cat}
                                <span className={`text-[10px] font-mono-data px-1.5 py-0.5 rounded-full ${
                                    selectedConceptCategory === cat ? 'bg-white/20 text-white' : 'bg-slate-800 text-textMuted'
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Cards Grid */}
                {filteredConcepts.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-2xl bg-slate-900/20">
                        <Icon name="search_off" className="text-textMuted text-[32px] mb-3" />
                        <p className="text-sm font-bold text-textMuted">無符合條件的題材板塊</p>
                        <p className="text-xs text-textMuted/60 mt-1">請嘗試清除搜尋字詞或變更篩選類別</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredConcepts.map(concept => {
                            const style = CONCEPT_COLORS[concept.category] || {
                                border: "border-white/5 hover:border-primary/50",
                                text: "text-primary",
                                badge: "bg-primary/10 text-primary border-primary/20",
                                glow: "hover:shadow-[0_0_15px_rgba(59,130,246,0.15)]",
                                bg: "bg-primary/10"
                            };

                            return (
                                <div
                                    key={concept.id}
                                    onClick={() => setActiveConceptDetail(concept)}
                                    className={`group relative bg-slate-900/40 border ${style.border} rounded-2xl p-6 transition-all duration-300 hover:translate-y-[-2px] ${style.glow} cursor-pointer flex flex-col justify-between`}
                                >
                                    <div>
                                        {/* Card Header */}
                                        <div className="flex justify-between items-start mb-4">
                                            {/* Category Icon */}
                                            <div className="flex items-center gap-2">
                                                <div className={`size-8 rounded-lg ${style.bg} flex items-center justify-center`}>
                                                    <Icon name={concept.icon} className={`${style.text} text-[18px]`} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-textMuted font-bold uppercase tracking-wider">
                                                        {concept.category}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Badges */}
                                            <div className="flex items-center gap-1.5">
                                                {concept.hasNewActivity && (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                        有新動態
                                                    </span>
                                                )}
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${style.badge}`}>
                                                    {concept.stocks.length} 家公司
                                                </span>
                                            </div>
                                        </div>

                                        {/* Card Title & Description */}
                                        <h4 className="text-white text-base font-bold mb-2 group-hover:text-primary transition-colors">
                                            {concept.name}
                                        </h4>
                                        <p className="text-textMuted text-xs leading-relaxed mb-4 line-clamp-2" style={{
                                            overflow: 'hidden',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                        }}>
                                            {concept.description}
                                        </p>
                                    </div>

                                    {/* Card Footer */}
                                    <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-textMuted font-bold">
                                        <span>核實於：{concept.verifiedDate}</span>
                                        <span className="flex items-center gap-1 text-primary group-hover:text-primaryHover transition-colors">
                                            探索產業地圖
                                            <Icon name="arrow_forward" className="text-[12px] group-hover:translate-x-1 transition-transform" />
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* --- Concept Detail Centered Modal --- */}
            {activeConceptDetail && (
                (() => {
                    const isIcDesign = activeConceptDetail.category === 'IC 設計' && 
                        ['asic_ip', 'hpc_network_ic', 'ddic_drivers', 'analog_pmic'].includes(activeConceptDetail.id);

                    // Block renderer for Treemap
                    const renderBlock = (stockId: string) => {
                        const snap = activeConceptDetail.stockSnapshots?.[stockId];
                        if (!snap) return null;
                        
                        const dbInfo = dbStocksStats.find(s => s.id === stockId || s.stock_id === stockId);
                        const dbPrice = dbInfo?.price;
                        const dbScore = dbInfo?.health_score;

                        const change = snap.change;
                        const isUp = change > 0;
                        const isFlat = change === 0;
                        
                        let bgStyle = 'bg-slate-800/80 text-slate-200 border-white/5';
                        if (!isFlat) {
                            if (isUp) {
                                if (change > 6) {
                                    bgStyle = 'bg-rose-600/90 text-white font-bold border-rose-500/30';
                                } else if (change > 2) {
                                    bgStyle = 'bg-rose-700/75 text-rose-100 border-rose-600/20';
                                } else {
                                    bgStyle = 'bg-rose-950/60 text-rose-200 border-rose-900/30';
                                }
                            } else {
                                if (change < -2) {
                                    bgStyle = 'bg-emerald-600/90 text-white font-bold border-emerald-500/30';
                                } else {
                                    bgStyle = 'bg-emerald-950/60 text-emerald-200 border-emerald-900/30';
                                }
                            }
                        }

                        const segments = getStockSegment(activeConceptDetail.id, stockId);
                        const isFilteredOut = selectedValueChainSegment && !segments.includes(selectedValueChainSegment);
                        const isHighLighted = selectedValueChainSegment && segments.includes(selectedValueChainSegment);
                        const isBubbleActive = selectedIcStockForBubble === stockId;

                        return (
                            <div
                                key={stockId}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (selectedIcStockForBubble === stockId) {
                                        setActiveConceptDetail(null);
                                        onNavigateToStock(stockId);
                                    } else {
                                        setSelectedIcStockForBubble(stockId);
                                    }
                                }}
                                className={`relative flex flex-col justify-center items-center p-2 rounded-xl cursor-pointer transition-all duration-300 border h-full select-none ${bgStyle} ${
                                    isFilteredOut ? 'opacity-15 grayscale scale-[0.97]' : 'opacity-100 scale-100'
                                } ${
                                    isBubbleActive ? 'border-amber-400 ring-2 ring-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.6)] z-30 scale-[1.02]' :
                                    isHighLighted ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-[#0b1120] shadow-[0_0_15px_rgba(59,130,246,0.6)] scale-[1.02] z-10' : ''
                                } hover:scale-[1.03] hover:shadow-2xl hover:z-20`}
                            >
                                <div className="flex flex-col items-center justify-center text-center gap-1 h-full w-full">
                                    <span className="text-[10px] md:text-[11px] font-black tracking-tight leading-tight line-clamp-2 max-w-full">{snap.name}</span>
                                    <span className="text-[9px] md:text-[10px] font-black font-mono-data opacity-90">
                                        {change > 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`}
                                    </span>
                                </div>

                                {isBubbleActive && (
                                    <div 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveConceptDetail(null);
                                            onNavigateToStock(stockId);
                                        }}
                                        className="absolute bottom-[105%] left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-950/95 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md text-left text-xs z-50 animate-zoom-in text-white cursor-pointer select-none"
                                    >
                                        <div className="flex justify-between items-start border-b border-white/10 pb-1.5 mb-1.5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white text-[11px] truncate max-w-[100px]">{snap.name}</span>
                                                <span className="text-[9px] text-slate-400 font-mono mt-0.5">{stockId}</span>
                                            </div>
                                            <span className={`text-[10px] font-black font-mono-data px-1.5 py-0.5 rounded ${
                                                isFlat ? 'bg-slate-800 text-slate-400' :
                                                isUp ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                            }`}>
                                                {change > 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`}
                                            </span>
                                        </div>
                                        <div className="space-y-1.5 text-[10px]">
                                            <div className="flex justify-between">
                                                <span className="text-slate-450">股價</span>
                                                <span className="font-bold font-mono text-white">
                                                    ${dbPrice?.toFixed(1) ?? '未快取'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-450">市值</span>
                                                <span className="font-bold font-mono text-white">{snap.marketCap}</span>
                                            </div>
                                            {dbScore !== undefined && (
                                                <div className="flex justify-between">
                                                    <span className="text-slate-450">健康分數</span>
                                                    <span className={`font-bold font-mono ${
                                                        dbScore >= 80 ? 'text-primary' : dbScore <= 60 ? 'text-rose-400' : 'text-amber-400'
                                                    }`}>{dbScore}分</span>
                                                </div>
                                            )}
                                        </div>
                                        {/* Small triangular arrow at bottom */}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-955"></div>
                                    </div>
                                )}
                            </div>
                        );
                    };

                    const renderTreemap = () => {
                        switch(activeConceptDetail.id) {
                            case 'asic_ip':
                                return (
                                    <div className="grid grid-cols-10 gap-2 h-[340px] w-full mt-4">
                                        <div className="col-span-2 flex flex-col gap-2 h-full">
                                            <div className="h-[25%]">{renderBlock("3443")}</div>
                                            <div className="h-[12%]">{renderBlock("3661")}</div>
                                            <div className="h-[38%]">{renderBlock("3529")}</div>
                                            <div className="h-[25%]">{renderBlock("3035")}</div>
                                        </div>
                                        <div className="col-span-3 flex flex-col gap-2 h-full">
                                            <div className="h-[28%]">{renderBlock("6643")}</div>
                                            <div className="h-[34%]">{renderBlock("6462")}</div>
                                            <div className="h-[38%]">{renderBlock("6533")}</div>
                                            <div className="h-[0%] hidden">{renderBlock("6423")}</div>
                                        </div>
                                        <div className="col-span-5 flex flex-col gap-2 h-full">
                                            <div className="h-[48%]">{renderBlock("8227")}</div>
                                            <div className="h-[48%]">{renderBlock("6695")}</div>
                                            <div className="h-[4%]">{renderBlock("6423")}</div>
                                        </div>
                                    </div>
                                );
                            case 'hpc_network_ic':
                                return (
                                    <div className="grid grid-cols-12 gap-2 h-[340px] w-full mt-4">
                                        <div className="col-span-5 flex flex-col gap-2 h-full">
                                            <div className="h-[50%]">{renderBlock("2454")}</div>
                                            <div className="h-[50%]">{renderBlock("5274")}</div>
                                        </div>
                                        <div className="col-span-3 flex flex-col gap-2 h-full">
                                            <div className="h-[43%]">{renderBlock("8299")}</div>
                                            <div className="h-[14%]">{renderBlock("2379")}</div>
                                            <div className="h-[43%]">{renderBlock("6526")}</div>
                                        </div>
                                        <div className="col-span-4 flex flex-col gap-2 h-full">
                                            <div className="h-[35%]">{renderBlock("5269")}</div>
                                            <div className="h-[25%]">{renderBlock("4968")}</div>
                                            <div className="h-[40%] flex gap-2 w-full">
                                                <div className="w-1/2 flex flex-col gap-2 h-full">
                                                    <div className="h-[50%]">{renderBlock("6104")}</div>
                                                    <div className="h-[50%]">{renderBlock("6756")}</div>
                                                </div>
                                                <div className="w-1/2 flex flex-col gap-2 h-full">
                                                    <div className="h-[33%]">{renderBlock("7796")}</div>
                                                    <div className="h-[33%]">{renderBlock("8054")}</div>
                                                    <div className="h-[34%]">{renderBlock("6684")}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            case 'ddic_drivers':
                                return (
                                    <div className="grid grid-cols-12 gap-2 h-[340px] w-full mt-4">
                                        <div className="col-span-4 flex flex-col gap-2 h-full">
                                            <div className="h-[23%]">{renderBlock("2303")}</div>
                                            <div className="h-[37%]">{renderBlock("6770")}</div>
                                            <div className="h-[40%] flex gap-2 w-full">
                                                <div className="w-1/2">{renderBlock("5347")}</div>
                                                <div className="w-1/2">{renderBlock("3034")}</div>
                                            </div>
                                        </div>
                                        <div className="col-span-3 flex flex-col gap-2 h-full">
                                            <div className="h-[33%]">{renderBlock("2458")}</div>
                                            <div className="h-[33%]">{renderBlock("8016")}</div>
                                            <div className="h-[34%]">{renderBlock("4961")}</div>
                                        </div>
                                        <div className="col-span-5 flex flex-col gap-2 h-full">
                                            <div className="h-[55%] flex gap-2 w-full">
                                                <div className="w-1/2 flex flex-col gap-2 h-full">
                                                    <div className="h-[60%]">{renderBlock("3141")}</div>
                                                    <div className="h-[40%]">{renderBlock("8150")}</div>
                                                </div>
                                                <div className="w-1/2 flex flex-col gap-2 h-full">
                                                    <div className="h-[55%]">{renderBlock("HIMX")}</div>
                                                    <div className="h-[45%]">{renderBlock("3527")}</div>
                                                </div>
                                            </div>
                                            <div className="h-[45%] flex gap-2 w-full">
                                                <div className="w-1/3">{renderBlock("3545")}</div>
                                                <div className="w-1/3">{renderBlock("3592")}</div>
                                                <div className="w-1/3">{renderBlock("6147")}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            case 'analog_pmic':
                                return (
                                    <div className="grid grid-cols-12 gap-2 h-[340px] w-full mt-4">
                                        <div className="col-span-4 flex flex-col gap-2 h-full">
                                            <div className="h-[70%]">{renderBlock("4919")}</div>
                                            <div className="h-[30%] flex gap-2 w-full">
                                                <div className="w-1/2">{renderBlock("5347")}</div>
                                                <div className="w-1/2">{renderBlock("6415")}</div>
                                            </div>
                                        </div>
                                        <div className="col-span-3 flex flex-col gap-2 h-full">
                                            <div className="h-[30%]">{renderBlock("3227")}</div>
                                            <div className="h-[40%]">{renderBlock("3014")}</div>
                                            <div className="h-[30%] flex gap-2 w-full">
                                                <div className="w-1/2">{renderBlock("6719")}</div>
                                                <div className="w-1/2">{renderBlock("5425")}</div>
                                            </div>
                                        </div>
                                        <div className="col-span-5 flex flex-col gap-2 h-full">
                                            <div className="h-[55%] flex gap-2 w-full">
                                                <div className="w-1/2 flex flex-col gap-2 h-full">
                                                    <div className="h-[60%]">{renderBlock("6138")}</div>
                                                    <div className="h-[40%]">{renderBlock("8081")}</div>
                                                </div>
                                                <div className="w-1/2 flex flex-col gap-2 h-full">
                                                    <div className="h-[55%]">{renderBlock("2436")}</div>
                                                    <div className="h-[45%]">{renderBlock("6202")}</div>
                                                </div>
                                            </div>
                                            <div className="h-[45%] flex gap-2 w-full">
                                                <div className="w-[30%] flex flex-col gap-2 h-full">
                                                    <div className="h-[50%]">{renderBlock("7707")}</div>
                                                    <div className="h-[50%]">{renderBlock("5299")}</div>
                                                </div>
                                                <div className="w-[70%] flex flex-col gap-2 h-full">
                                                    <div className="h-[50%]">{renderBlock("6799")}</div>
                                                    <div className="h-[50%] flex gap-2">
                                                        <div className="w-1/2">{renderBlock("6679")}</div>
                                                        <div className="w-1/2">{renderBlock("3288")}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            default:
                                return null;
                        }
                    };

                    return (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            {/* Backdrop Overlay */}
                            <div 
                                className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-fade-in" 
                                onClick={() => setActiveConceptDetail(null)}
                            />
                            
                            {/* Modal Content */}
                            <div 
                                onClick={() => setSelectedIcStockForBubble(null)}
                                className={`relative w-full ${isIcDesign ? 'max-w-4xl' : 'max-w-2xl'} bg-[#0b1120]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col z-10 animate-zoom-in`}
                            >
                                {/* Modal Header */}
                                <div className="p-6 border-b border-white/10 flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold uppercase">
                                                {activeConceptDetail.category}
                                            </span>
                                            {isIcDesign && activeConceptDetail.cagr && (
                                                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                                                    CAGR {activeConceptDetail.cagr}
                                                </span>
                                            )}
                                            {isIcDesign && activeConceptDetail.marketSize && (
                                                <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full font-bold">
                                                    市場規模 {activeConceptDetail.marketSize}
                                                </span>
                                            )}
                                            {activeConceptDetail.hasNewActivity && (
                                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    有新動態
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-white text-xl md:text-2xl font-bold mt-0.5">{activeConceptDetail.name}</h3>
                                        <p className="text-textMuted text-xs mt-1">板塊核實日期：{activeConceptDetail.verifiedDate}</p>
                                    </div>
                                    
                                    <button 
                                        onClick={() => setActiveConceptDetail(null)}
                                        className="size-8 rounded-full border border-white/10 flex items-center justify-center text-textMuted hover:text-white hover:bg-white/5 transition-all"
                                    >
                                        <Icon name="close" className="text-[18px]" />
                                    </button>
                                </div>
                                
                                {/* Modal Body */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                    {/* 1. Description */}
                                    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5">
                                        <h4 className="text-white text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                            <Icon name="description" className="text-[14px] text-primary" />
                                            題材深度解讀 (CONCEPT INSIGHT)
                                        </h4>
                                        <p className="text-xs text-textMuted leading-relaxed">{activeConceptDetail.description}</p>
                                    </div>

                                    {/* Custom IC Design Layout */}
                                    {isIcDesign ? (
                                        <>
                                            {/* KPIs indicators */}
                                            {activeConceptDetail.keyIndicators && (
                                                <div className="space-y-3">
                                                    <h4 className="text-white text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                                                        <Icon name="radar" className="text-[14px] text-amber-500" />
                                                        產業關鍵指標
                                                    </h4>
                                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                        {activeConceptDetail.keyIndicators.map((ind, idx) => (
                                                            <div key={idx} className="bg-slate-900/60 border border-white/5 hover:border-white/10 rounded-xl p-4 flex items-start gap-3 transition-all relative overflow-hidden group">
                                                                <div className="size-8 rounded-lg bg-slate-800/80 flex items-center justify-center text-textMuted group-hover:text-primary transition-all">
                                                                    <Icon name={ind.icon} className={`${ind.color} text-[18px]`} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] text-textMuted font-bold">{ind.label}</p>
                                                                    <p className="text-white text-xs font-black mt-0.5">{ind.value}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Heatmap & List view switch */}
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <h4 className="text-white text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                                                            <Icon name="show_chart" className="text-[14px] text-primary" />
                                                            產業漲跌熱力圖
                                                        </h4>
                                                        <p className="text-[10px] text-textMuted mt-0.5 flex items-center gap-1">
                                                            依個股漲跌幅度(絕對值)決定區塊大小，可切換觀察時間維度。
                                                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                            資料更新於 上午1:05:11
                                                        </p>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex bg-slate-900/80 p-0.5 rounded-lg border border-white/5">
                                                            {[
                                                                { id: 'day', label: '單日' },
                                                                { id: 'week', label: '單週' },
                                                                { id: 'month', label: '單月' }
                                                            ].map(tf => (
                                                                <button
                                                                    key={tf.id}
                                                                    onClick={() => setIcTimeframe(tf.id as any)}
                                                                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                                                                        icTimeframe === tf.id
                                                                            ? 'bg-primary text-white shadow-md'
                                                                            : 'text-textMuted hover:text-white'
                                                                    }`}
                                                                >
                                                                    {tf.label}
                                                                </button>
                                                            ))}
                                                        </div>

                                                        <div className="flex bg-slate-900/80 p-0.5 rounded-lg border border-white/5">
                                                            <button
                                                                onClick={() => setIcViewMode('heatmap')}
                                                                className={`p-1 rounded-md transition-all flex items-center justify-center ${
                                                                    icViewMode === 'heatmap'
                                                                        ? 'bg-primary text-white'
                                                                        : 'text-textMuted hover:text-white'
                                                                }`}
                                                            >
                                                                <Icon name="grid_view" className="text-[14px]" />
                                                            </button>
                                                            <button
                                                                onClick={() => setIcViewMode('list')}
                                                                className={`p-1 rounded-md transition-all flex items-center justify-center ${
                                                                    icViewMode === 'list'
                                                                        ? 'bg-primary text-white'
                                                                        : 'text-textMuted hover:text-white'
                                                                }`}
                                                            >
                                                                <Icon name="format_list_bulleted" className="text-[14px]" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {icViewMode === 'heatmap' ? (
                                                    <>
                                                        {renderTreemap()}
                                                        
                                                        {/* Color Legend bar */}
                                                        <div className="flex items-center justify-center gap-1.5 mt-4 text-[10px] text-textMuted font-bold">
                                                            <span>跌</span>
                                                            <div className="w-4 h-2 rounded bg-emerald-600"></div>
                                                            <div className="w-4 h-2 rounded bg-emerald-950/80"></div>
                                                            <div className="w-4 h-2 rounded bg-slate-700/60"></div>
                                                            <div className="w-4 h-2 rounded bg-rose-950/80"></div>
                                                            <div className="w-4 h-2 rounded bg-rose-700/70"></div>
                                                            <div className="w-4 h-2 rounded bg-rose-600"></div>
                                                            <span>漲</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="border border-white/5 rounded-2xl overflow-hidden bg-slate-900/20">
                                                        <table className="w-full text-xs text-left">
                                                            <thead>
                                                                <tr className="bg-slate-900/60 text-textMuted border-b border-white/5">
                                                                    <th className="p-4 font-bold">公司 (Company)</th>
                                                                    <th className="p-4 font-bold">價值鏈 (Segment)</th>
                                                                    <th className="p-4 font-bold text-right">漲跌幅 (Change)</th>
                                                                    <th className="p-4 font-bold text-right">市值 (Market Cap)</th>
                                                                    <th className="p-4 font-bold text-right">健康分數 (Health)</th>
                                                                    <th className="p-4 font-bold text-center">操作</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-white/5">
                                                                {[...activeConceptDetail.stocks]
                                                                    .filter(stockId => {
                                                                        if (!selectedValueChainSegment) return true;
                                                                        const segs = getStockSegment(activeConceptDetail.id, stockId);
                                                                        return segs.includes(selectedValueChainSegment);
                                                                    })
                                                                    .map(stockId => {
                                                                        const snap = activeConceptDetail.stockSnapshots?.[stockId];
                                                                        const dbInfo = dbStocksStats.find(s => s.id === stockId || s.stock_id === stockId);
                                                                        const listInfo = allStocksList.find(s => s.stock_id === stockId);
                                                                        
                                                                        const name = snap?.name || listInfo?.stock_name || dbInfo?.name || dbInfo?.stock_name || '未同步股';
                                                                        const change = snap?.change ?? 0;
                                                                        const cap = snap?.marketCap ?? 'N/A';
                                                                        const dbPrice = dbInfo?.price;
                                                                        const dbScore = dbInfo?.health_score;

                                                                        const isUp = change > 0;
                                                                        const isFlat = change === 0;

                                                                        const segments = getStockSegment(activeConceptDetail.id, stockId);

                                                                        return (
                                                                            <tr key={stockId} className="hover:bg-white/5 transition-colors">
                                                                                <td className="p-4 flex items-center gap-2">
                                                                                    <div className={`w-1 h-8 rounded-full ${
                                                                                        isFlat ? 'bg-slate-600' : isUp ? 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                                                                                    }`} />
                                                                                    <div className="flex flex-col">
                                                                                        <span className="text-white font-bold">{name}</span>
                                                                                        <span className="text-[10px] text-textMuted font-mono-data mt-0.5">{stockId}</span>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="p-4">
                                                                                    <div className="flex gap-1.5">
                                                                                        {segments.map(seg => (
                                                                                            <span key={seg} className={`text-[8px] border px-1.5 py-0.5 rounded font-black uppercase ${
                                                                                                seg === 'upstream' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                                                                seg === 'midstream' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                                                                'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                                                            }`}>
                                                                                                {seg}
                                                                                            </span>
                                                                                        ))}
                                                                                    </div>
                                                                                </td>
                                                                                <td className={`p-4 text-right font-black font-mono-data ${
                                                                                    isFlat ? 'text-slate-400' : isUp ? 'text-rose-400' : 'text-emerald-400'
                                                                                }`}>
                                                                                    {change > 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`}
                                                                                </td>
                                                                                <td className="p-4 text-right font-mono-data text-white font-bold">
                                                                                    {cap}
                                                                                </td>
                                                                                <td className="p-4 text-right">
                                                                                    {dbScore !== undefined ? (
                                                                                        <span className="font-mono-data font-black text-white">{dbScore}分</span>
                                                                                    ) : (
                                                                                        <span className="text-textMuted/45 italic">未快取</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="p-4 text-center">
                                                                                    <div className="flex items-center justify-center gap-1.5">
                                                                                        <button
                                                                                            onClick={() => handleSyncSingleStockInDrawer(stockId)}
                                                                                            className="size-7 rounded-lg border border-white/5 bg-slate-900/60 hover:bg-primary/10 hover:border-primary/30 flex items-center justify-center text-textMuted hover:text-primary transition-all"
                                                                                            title="重新同步股價與健檢分數"
                                                                                        >
                                                                                            <Icon name="sync" className="text-[14px]" />
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                setActiveConceptDetail(null);
                                                                                                onNavigateToStock(stockId);
                                                                                            }}
                                                                                            className="px-2 py-1 rounded-lg border border-primary/20 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all text-[10px] font-bold"
                                                                                        >
                                                                                            健檢 →
                                                                                        </button>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Interactive Value Chain block */}
                                            {activeConceptDetail.valueChain && (
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-end">
                                                        <div>
                                                            <h4 className="text-white text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                                                                <Icon name="device_hub" className="text-[14px] text-primary" />
                                                                產業價值鏈結構 (VALUE CHAIN)
                                                            </h4>
                                                            <p className="text-[10px] text-textMuted mt-0.5">
                                                                ● 點擊節點或大類可查看相關公司，再次點擊清除篩選。
                                                            </p>
                                                        </div>
                                                        {selectedValueChainSegment && (
                                                            <button 
                                                                onClick={() => setSelectedValueChainSegment(null)}
                                                                className="text-[10px] text-primary hover:text-primaryHover font-bold flex items-center gap-1 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg transition-all"
                                                            >
                                                                清除高亮
                                                                <Icon name="clear" className="text-[10px]" />
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        {/* Upstream */}
                                                        <div className={`bg-slate-900/60 border rounded-xl p-4 flex flex-col gap-2.5 transition-all duration-300 ${
                                                            selectedValueChainSegment === 'upstream' 
                                                                ? 'border-blue-500 ring-1 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)] bg-slate-900/90' 
                                                                : 'border-white/5 hover:border-white/10'
                                                        }`}>
                                                            <div 
                                                                onClick={() => setSelectedValueChainSegment(selectedValueChainSegment === 'upstream' ? null : 'upstream')}
                                                                className="flex justify-between items-center cursor-pointer group"
                                                            >
                                                                <span className="text-[10px] text-blue-400 font-black uppercase tracking-wider">
                                                                    {activeConceptDetail.valueChain.upstream.title}
                                                                </span>
                                                                <Icon name={selectedValueChainSegment === 'upstream' ? 'check_circle' : 'circle'} className={`text-[12px] ${selectedValueChainSegment === 'upstream' ? 'text-primary' : 'text-textMuted group-hover:text-white'}`} />
                                                            </div>
                                                            <div className="flex flex-col gap-1.5">
                                                                {activeConceptDetail.valueChain.upstream.items.map((item, idx) => (
                                                                    <button
                                                                        key={idx}
                                                                        onClick={() => setSelectedValueChainSegment(selectedValueChainSegment === 'upstream' ? null : 'upstream')}
                                                                        className="bg-slate-800/40 border border-white/5 hover:bg-slate-800/80 hover:border-blue-500/30 p-2 rounded-lg text-left text-[11px] font-bold text-white transition-all flex justify-between items-center"
                                                                    >
                                                                        <span>{item}</span>
                                                                        <Icon name="arrow_forward" className="text-[9px] opacity-40" />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Midstream */}
                                                        <div className={`bg-slate-900/60 border rounded-xl p-4 flex flex-col gap-2.5 transition-all duration-300 ${
                                                            selectedValueChainSegment === 'midstream' 
                                                                ? 'border-emerald-500 ring-1 ring-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)] bg-slate-900/90' 
                                                                : 'border-white/5 hover:border-white/10'
                                                        }`}>
                                                            <div 
                                                                onClick={() => setSelectedValueChainSegment(selectedValueChainSegment === 'midstream' ? null : 'midstream')}
                                                                className="flex justify-between items-center cursor-pointer group"
                                                            >
                                                                <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider">
                                                                    {activeConceptDetail.valueChain.midstream.title}
                                                                </span>
                                                                <Icon name={selectedValueChainSegment === 'midstream' ? 'check_circle' : 'circle'} className={`text-[12px] ${selectedValueChainSegment === 'midstream' ? 'text-emerald-400' : 'text-textMuted group-hover:text-white'}`} />
                                                            </div>
                                                            <div className="flex flex-col gap-1.5">
                                                                {activeConceptDetail.valueChain.midstream.items.map((item, idx) => (
                                                                    <button
                                                                        key={idx}
                                                                        onClick={() => setSelectedValueChainSegment(selectedValueChainSegment === 'midstream' ? null : 'midstream')}
                                                                        className="bg-slate-800/40 border border-white/5 hover:bg-slate-800/80 hover:border-emerald-500/30 p-2 rounded-lg text-left text-[11px] font-bold text-white transition-all flex justify-between items-center"
                                                                    >
                                                                        <span>{item}</span>
                                                                        <Icon name="arrow_forward" className="text-[9px] opacity-40" />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Downstream */}
                                                        <div className={`bg-slate-900/60 border rounded-xl p-4 flex flex-col gap-2.5 transition-all duration-300 ${
                                                            selectedValueChainSegment === 'downstream' 
                                                                ? 'border-purple-500 ring-1 ring-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.15)] bg-slate-900/90' 
                                                                : 'border-white/5 hover:border-white/10'
                                                        }`}>
                                                            <div 
                                                                onClick={() => setSelectedValueChainSegment(selectedValueChainSegment === 'downstream' ? null : 'downstream')}
                                                                className="flex justify-between items-center cursor-pointer group"
                                                            >
                                                                <span className="text-[10px] text-purple-400 font-black uppercase tracking-wider">
                                                                    {activeConceptDetail.valueChain.downstream.title}
                                                                </span>
                                                                <Icon name={selectedValueChainSegment === 'downstream' ? 'check_circle' : 'circle'} className={`text-[12px] ${selectedValueChainSegment === 'downstream' ? 'text-purple-400' : 'text-textMuted group-hover:text-white'}`} />
                                                            </div>
                                                            <div className="flex flex-col gap-1.5">
                                                                {activeConceptDetail.valueChain.downstream.items.map((item, idx) => (
                                                                    <button
                                                                        key={idx}
                                                                        onClick={() => setSelectedValueChainSegment(selectedValueChainSegment === 'downstream' ? null : 'downstream')}
                                                                        className="bg-slate-800/40 border border-white/5 hover:bg-slate-800/80 hover:border-purple-500/30 p-2 rounded-lg text-left text-[11px] font-bold text-white transition-all flex justify-between items-center"
                                                                    >
                                                                        <span>{item}</span>
                                                                        <Icon name="arrow_forward" className="text-[9px] opacity-40" />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {/* Original Simplified layout */}
                                            {syncProgressText && (
                                                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
                                                    <div className="size-5 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                                                    <span className="text-xs font-bold text-primary">{syncProgressText}</span>
                                                </div>
                                            )}

                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <h4 className="text-white text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                                                        <Icon name="list" className="text-[14px] text-primary" />
                                                        成分概念股 ({activeConceptDetail.stocks.length} 檔)
                                                    </h4>
                                                    
                                                    <button
                                                        onClick={() => handleBatchSyncConceptStocks(activeConceptDetail.stocks)}
                                                        disabled={isBatchSyncing}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                                                            isBatchSyncing 
                                                                ? 'bg-slate-900 text-textMuted border-white/5 cursor-not-allowed' 
                                                                : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-white'
                                                        }`}
                                                    >
                                                        <Icon name="sync" className={`text-[14px] ${isBatchSyncing ? 'animate-spin' : ''}`} />
                                                        {isBatchSyncing ? '批次同步中...' : '一鍵同步成分股'}
                                                    </button>
                                                </div>
                                                
                                                <div className="border border-white/5 rounded-2xl overflow-hidden bg-slate-900/20">
                                                    <table className="w-full text-xs text-left">
                                                        <thead>
                                                            <tr className="bg-slate-900/60 text-textMuted border-b border-white/5">
                                                                <th className="p-4 font-bold">股票 (Stock)</th>
                                                                <th className="p-4 font-bold text-right">最新股價 (Price)</th>
                                                                <th className="p-4 font-bold text-right">健康分數 (Health)</th>
                                                                <th className="p-4 font-bold text-center">操作 (Action)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-white/5">
                                                            {activeConceptDetail.stocks.map(stockId => {
                                                                const dbInfo = dbStocksStats.find(s => s.id === stockId || s.stock_id === stockId);
                                                                const listInfo = allStocksList.find(s => s.stock_id === stockId);
                                                                const name = listInfo?.stock_name || dbInfo?.name || dbInfo?.stock_name || '未同步股';
                                                                
                                                                const price = dbInfo?.price;
                                                                const score = dbInfo?.health_score;
                                                                
                                                                let progressColor = 'bg-primary shadow-[0_0_8px_rgba(59,130,246,0.3)]';
                                                                if (score !== undefined) {
                                                                    if (score < 60) {
                                                                        progressColor = 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]';
                                                                    } else if (score < 80) {
                                                                        progressColor = 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]';
                                                                    }
                                                                }

                                                                return (
                                                                    <tr key={stockId} className="hover:bg-white/5 transition-colors">
                                                                        <td className="p-4">
                                                                            <div className="flex flex-col">
                                                                                <span className="text-white font-bold">{name}</span>
                                                                                <span className="text-[10px] text-textMuted font-mono-data mt-0.5">{stockId}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="p-4 text-right font-mono-data font-bold">
                                                                            {price !== undefined ? (
                                                                                <span className="text-white">{price.toFixed(2)}</span>
                                                                            ) : (
                                                                                <span className="text-textMuted/40 italic">無快取</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="p-4 text-right">
                                                                            {score !== undefined ? (
                                                                                <div className="flex items-center justify-end gap-2">
                                                                                    <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                                                        <div className={`h-full ${progressColor}`} style={{ width: `${score}%` }}></div>
                                                                                    </div>
                                                                                    <span className="font-mono-data font-black text-white w-6 text-right">
                                                                                        {score}
                                                                                    </span>
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-textMuted/40 italic">無快取</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="p-4">
                                                                            <div className="flex items-center justify-center gap-2">
                                                                                <button
                                                                                    onClick={() => handleSyncSingleStockInDrawer(stockId)}
                                                                                    className="size-7 rounded-lg border border-white/5 bg-slate-900/60 hover:bg-primary/10 hover:border-primary/30 flex items-center justify-center text-textMuted hover:text-primary transition-all"
                                                                                    title="重新同步股價與健檢分數"
                                                                                >
                                                                                    <Icon name="sync" className="text-[14px]" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setActiveConceptDetail(null);
                                                                                        onNavigateToStock(stockId);
                                                                                    }}
                                                                                    className="px-2 py-1 rounded-lg border border-primary/20 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all text-[10px] font-bold flex items-center gap-0.5"
                                                                                >
                                                                                    健檢
                                                                                    <Icon name="arrow_forward" className="text-[10px]" />
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                                
                                {/* Modal Footer */}
                                <div className="p-6 border-t border-white/10 bg-slate-950/40 flex justify-between items-center text-[10px] text-textMuted font-bold">
                                    <span>提示：本系統每日會自動與 SQLite 同步最新市值及日K數據</span>
                                    <button
                                        onClick={() => setActiveConceptDetail(null)}
                                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-white transition-all"
                                    >
                                        關閉視窗
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()
            )}

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
