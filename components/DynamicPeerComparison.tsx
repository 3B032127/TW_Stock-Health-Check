import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, RadarChart, Tooltip as RechartsTooltip } from 'recharts';
import { PeerComparisonData } from '../types';
import { Icon } from '../App';
import { UnifiedRadarChart } from './UnifiedRadarChart';

// --- Formatters (TWD Formatting) ---
export const formatTWD = (val: number) => `NT$ ${val.toFixed(2)}`;
export const formatMarketCap = (val: number) => `${val.toLocaleString('zh-TW', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} 億元`;
export const formatPercent = (val: number | undefined | null) => typeof val === 'number' ? `${val.toFixed(2)}%` : '-';

// --- Industry Configurations ---
export interface ColumnConfig {
    key: string;
    label: string;
    align?: 'left' | 'right' | 'center';
    render: (value: any, row: PeerComparisonData, maxVal?: number) => React.ReactNode;
}

interface Props {
    industrySector: string;
    peers: PeerComparisonData[];
    industryAverage: any;
    stockId: string;
}

export const DynamicPeerComparison: React.FC<Props> = ({ industrySector, peers, industryAverage, stockId }) => {
    const [hoveredDimension, setHoveredDimension] = useState<string | null>(null);
    const currentStock = peers.find(p => p.id === stockId);

    const maxPe = Math.max(...peers.map(p => p.peRatio || 0));
    const maxPb = Math.max(...peers.map(p => p.pbRatio || 0));
    const maxYield = Math.max(...peers.map(p => p.dividendYield || 0));
    const maxPs = Math.max(...peers.map(p => p.psRatio || 0));

    // 判斷是否需要 Fallback (有任何一家公司 PE < 0 或為 null)
    const requiresFallback = peers.some(p => p.peRatio === null || p.peRatio < 0);
    const isFin = industrySector === '金融業' || industrySector === '金融保險業';
    const isConst = industrySector === '營建業';

    const columns = useMemo(() => {
        const baseColumns: ColumnConfig[] = [
            {
                key: 'name',
                label: '股票名稱',
                align: 'left',
                render: (_, row: PeerComparisonData) => (
                    <div className="relative z-10 w-fit min-w-[120px] whitespace-nowrap">
                        <span className="font-bold text-white">{row.name}</span>
                        <span className="text-textMuted text-xs ml-1">{row.id}</span>
                        {row.id === stockId && <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-primary/20 text-primary rounded border border-primary/20">目前</span>}
                    </div>
                )
            }
        ];

        // 建立泛用長條圖 Render 函式
        const createBarRenderer = (key: keyof PeerComparisonData, colorClass: string = 'bg-emerald-500/40') => {
            const vals = peers.map(p => Number(p[key]) || 0);
            const maxVal = Math.max(...vals, 0);

            return (val: number | undefined | null) => {
                if (typeof val !== 'number') return <div className="relative z-10 text-white/50">-</div>;
                const width = maxVal > 0 && val > 0 ? ((val / maxVal) * 90) : 0;
                return (
                    <div className="relative group">
                        {val > 0 && <div className={`absolute inset-y-1.5 right-4 ${colorClass} rounded-l transition-all duration-500 z-0`} style={{ width: `${width}%` }}></div>}
                        <div className={`relative z-10 font-medium text-white transition-colors`}>{formatPercent(val)}</div>
                    </div>
                );
            };
        };

        // 建立各項指標的 Render 函式
        const renderPE = (val: number | null) => {
            if (val === null || val < 0) {
                return (
                    <div className="relative z-10">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 ml-auto block w-fit">
                            虧損
                        </span>
                    </div>
                );
            }
            return (
                <div className="relative group">
                    <div className="absolute inset-y-1.5 right-4 bg-purple-500/40 rounded-l transition-all duration-500 z-0" style={{ width: maxPe > 0 && val ? `${(val / maxPe) * 90}%` : '0%' }}></div>
                    <div className="relative z-10 font-medium text-white transition-colors">{val.toFixed(2)}</div>
                </div>
            );
        };

        const renderPB = (val: number) => (
            <div className="relative group">
                <div className="absolute inset-y-1.5 right-4 bg-indigo-500/40 rounded-l transition-all duration-500 z-0" style={{ width: maxPb > 0 && val ? `${(val / maxPb) * 90}%` : '0%' }}></div>
                <div className="relative z-10 font-medium text-white transition-colors">{val.toFixed(2)}</div>
            </div>
        );

        const renderYield = (val: number) => {
            if (!val || val === 0) return <div className="relative z-10 text-white/50">0.00%</div>;
            return (
                <div className="relative group">
                    <div className="absolute inset-y-1.5 right-4 bg-amber-500/40 rounded-l transition-all duration-500 z-0" style={{ width: maxYield > 0 && val ? `${(val / maxYield) * 90}%` : '0%' }}></div>
                    <div className="relative z-10 font-medium text-white transition-colors">{val.toFixed(2)}%</div>
                </div>
            );
        };

        // 疊加基礎欄位
        baseColumns.push(
            { key: 'price', label: '目前股價', align: 'right', render: (val: number) => <span className="font-medium relative z-10 text-white">{formatTWD(val)}</span> },
            { key: 'marketCap', label: '市值', align: 'right', render: (val: number) => <span className="font-medium relative z-10 text-white">{formatMarketCap(val)}</span> },
            { key: 'peRatio', label: '本益比 (P/E)', align: 'right', render: renderPE }
        );

        // 動態插入股價營收比 (P/S Ratio) Fallback
        if (requiresFallback) {
            baseColumns.push({
                key: 'psRatio',
                label: '股價營收比 (P/S)',
                align: 'right',
                render: (val: number | undefined) => {
                    if (!val) return <div className="relative z-10 text-white/50 font-medium">-</div>;
                    return (
                        <div className="relative group">
                            <div className="absolute inset-y-1.5 right-4 bg-fuchsia-500/40 rounded-l transition-all duration-500 z-0" style={{ width: maxPs > 0 && val ? `${(val / maxPs) * 90}%` : '0%' }}></div>
                            <div className="relative z-10 text-white font-medium transition-colors">
                                {val.toFixed(2)}
                            </div>
                        </div>
                    );
                }
            });
        }

        baseColumns.push(
            { key: 'pbRatio', label: '股價淨值比 (P/B)', align: 'right', render: renderPB },
            { key: 'dividendYield', label: '殖利率', align: 'right', render: renderYield }
        );

        let specificColumns: ColumnConfig[] = [];

        if (isConst) {
            specificColumns = [
                { key: 'netMargin', label: '淨利率', align: 'right', render: createBarRenderer('netMargin', 'bg-cyan-500/40') },
                { key: 'projectGrossMargin', label: '建案毛利率', align: 'right', render: createBarRenderer('projectGrossMargin', 'bg-teal-500/40') },
                { key: 'contractLiabilitiesYoY', label: '合約負債年增', align: 'right', render: createBarRenderer('contractLiabilitiesYoY', 'bg-sky-500/40') },
                { key: 'inventoryToAssetsRatio', label: '存貨佔總資產', align: 'right', render: createBarRenderer('inventoryToAssetsRatio', 'bg-rose-500/40') },
                { key: 'debtRatio', label: '負債比', align: 'right', render: createBarRenderer('debtRatio', 'bg-orange-500/40') }
            ];
        } else if (isFin) {
            specificColumns = [
                { key: 'roa', label: 'ROA', align: 'right', render: createBarRenderer('roa', 'bg-cyan-500/40') },
                { key: 'roe', label: 'ROE', align: 'right', render: createBarRenderer('roe', 'bg-blue-500/40') },
                { key: 'netIncomeYoY', label: '淨收益 YoY', align: 'right', render: createBarRenderer('netIncomeYoY', 'bg-emerald-500/40') },
                { key: 'capitalAdequacyRatio', label: '資本適足率', align: 'right', render: createBarRenderer('capitalAdequacyRatio', 'bg-indigo-500/40') },
                { key: 'nplRatio', label: '逾放比', align: 'right', render: createBarRenderer('nplRatio', 'bg-rose-500/40') }
            ];
        } else {
            // 通用/科技業
            // 經評估，保留最核心的基地欄位即可，不再附加毛利率等過多細項，維持版面極簡
            specificColumns = [];
        }

        return [...baseColumns, ...specificColumns];
    }, [peers, industrySector, stockId, maxPe, maxPb, maxYield]);

    return (
        <div className="bg-surface border border-surfaceLight rounded-xl flex flex-col w-full relative">
            <div className="p-4 border-b border-surfaceLight bg-surfaceLight/30 flex justify-between items-center rounded-t-xl">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <Icon name="compare_arrows" className="text-blue-400" />
                    同業比較 ({industrySector})
                </h3>
                {peers.some(p => p.peRatio === null || p.peRatio < 0) && (
                    <span className="text-[11px] text-amber-400 font-medium bg-amber-400/10 px-2.5 py-1 rounded border border-amber-400/20 flex items-center gap-1.5 shadow-sm">
                        <Icon name="warning" className="text-sm" />
                        部分同業無本益比資料，已自動啟用 P/S Ratio 輔助估值
                    </span>
                )}
            </div>

            {/* Unified Radar Chart Section */}
            {currentStock && industryAverage && (
                <>
                    <UnifiedRadarChart
                        mainStock={currentStock as any}
                        industryAverage={industryAverage as any}
                        industrySector={industrySector}
                        hoveredDimension={hoveredDimension}
                        setHoveredDimension={setHoveredDimension}
                    />

                    {/* Industry Specific Radar Dimensions Explanation */}
                    <div className="px-4 pb-4 relative z-20">
                        <div className="bg-surfaceLight/30 border border-surfaceLight rounded-lg p-3 relative z-20">
                            <h4 className="text-xs font-semibold text-textMuted mb-2 flex items-center gap-1.5">
                                <Icon name="info" className="text-[14px]" />
                                [{industrySector}] 雷達圖底層引擎評估指標說明
                            </h4>
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-[11px] relative">
                                {[
                                    {
                                        name: '獲利能力',
                                        desc: isConst ? '淨利率、建案毛利率' : isFin ? 'ROA、ROE' : '毛利率、營益率、淨利率',
                                        formula: isConst ? '淨利(0~40%) 與建案毛利(15~50%) 之平均' : isFin ? 'ROA(0~2%) 與 ROE(0~15%) 之平均' : '毛利率(0~60%) 與營益率(-10~40%) 之平均'
                                    },
                                    {
                                        name: '成長動能',
                                        desc: isConst ? '合約負債年增、營收 YoY' : isFin ? '淨收益 YoY' : '營收 YoY、EPS YoY',
                                        formula: isConst ? '合約負債年增率(-20~100%)' : isFin ? '淨收益 YoY(-30~80%)' : '營收 YoY(-20~80%) 與 EPS YoY(-50~150%) 之平均'
                                    },
                                    {
                                        name: '財務安全',
                                        desc: isConst ? '存貨佔總資產、負債比' : isFin ? '資本適足率、逾放比' : '流動比率、負債比',
                                        formula: isConst ? '依存貨佔比(越低越好)與負債比平均' : isFin ? '依資本適足率與逾放比(越低越好)平均' : '依流動比率與負債比(越低越好)平均'
                                    },
                                    {
                                        name: '估值水準',
                                        desc: isConst ? 'P/B' : 'P/E、P/B' + (requiresFallback ? ' (P/S 輔助)' : ''),
                                        title: requiresFallback ? 'P/B、P/S (虧損輔助)' : 'P/E、P/B',
                                        formula: (isConst || isFin) ? '參考 P/B (越低分越高)' : (requiresFallback ? 'P/E為主，虧損使用 P/S 輔助 (越低分越高)' : '參考本益比 P/E (8~50倍, 越低分越高)')
                                    },
                                    {
                                        name: '籌碼與股息',
                                        desc: isFin || isConst ? '殖利率' : '法人持股、殖利率',
                                        formula: (isFin || isConst) ? '現金殖利率 (0~10%)' : '殖利率(0~8%) 與法人持股(0~80%) 之平均'
                                    }
                                ].map((dim) => {
                                    const isHovered = hoveredDimension === dim.name;
                                    return (
                                        <div
                                            key={dim.name}
                                            className="relative"
                                            onMouseEnter={() => setHoveredDimension(dim.name)}
                                            onMouseLeave={() => setHoveredDimension(null)}
                                        >
                                            <div
                                                className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full min-h-full space-y-1 rounded-lg flex flex-col justify-center transition-all duration-300 ease-out cursor-default border origin-center ${isHovered
                                                    ? 'scale-[1.4] sm:scale-[1.5] shadow-[0_0_25px_rgba(0,0,0,0.8)] bg-slate-800 border-primary/50 z-50 p-2.5'
                                                    : 'scale-100 bg-surface/40 hover:bg-surface/60 border-transparent z-0 p-2.5'
                                                    }`}
                                            >
                                                <div className={`font-bold border-b transition-colors duration-300 flex-shrink-0 pb-1 mb-1 text-[12px] ${isHovered ? 'text-primary border-primary/50 tracking-wide' : 'text-white/90 border-surfaceLight/50'
                                                    }`}>
                                                    {dim.name}
                                                </div>
                                                <div className={`transition-colors duration-300 leading-relaxed break-words whitespace-normal text-[11px] ${isHovered ? 'text-white/95' : 'text-textMuted/80'
                                                    }`} title={dim.title || dim.desc}>
                                                    {dim.desc}
                                                </div>
                                                {/* 計算公式說明，只在 Hover 時顯示 */}
                                                <div className={`overflow-hidden transition-all duration-300 ease-out flex-col flex-shrink-0 flex ${isHovered ? 'max-h-[500px] opacity-100 mt-1.5' : 'max-h-0 opacity-0 mt-0'}`}>
                                                    <div className="text-[7px] text-primary/80 font-bold mb-0.5 border-t border-surfaceLight/50 pt-1.5">評估與計算邏輯：</div>
                                                    <div className="text-[8px] text-textMuted/90 leading-snug whitespace-normal break-words pb-0.5">
                                                        {dim.formula}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 佔據 Grid 空間用之隱藏層，保證文字不被切且撐開應有高度 */}
                                            <div className="space-y-1 p-2.5 invisible pointer-events-none">
                                                <div className="font-bold border-b pb-1 mb-1 text-[12px]">{dim.name}</div>
                                                <div className="text-[11px] whitespace-normal break-words leading-relaxed">{dim.desc}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </>
            )}

            <div className="overflow-x-auto rounded-b-xl">
                <table className="w-full text-sm text-right">
                    <thead className="bg-surface text-textMuted border-b border-surfaceLight">
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={`px-4 py-3 font-medium whitespace-nowrap ${col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right'}`}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surfaceLight text-white">
                        {peers.map((peer) => (
                            <tr key={peer.id} className={`hover:bg-surfaceLight/40 transition-colors relative ${peer.id === stockId ? 'bg-primary/5' : ''}`}>
                                {columns.map((col) => (
                                    <td
                                        key={`${peer.id}-${col.key}`}
                                        className={`px-4 py-3 ${col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right'}`}
                                    >
                                        {col.render((peer as any)[col.key], peer)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
