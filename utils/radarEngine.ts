import { RawStockData, RadarChartScore, RadarMetricMetadata } from '../types';
import { getIndustryMapping } from './peerEngineConfig';

const formatMetricValue = (field: string, value: number): string => {
    if (['peRatio', 'pbRatio', 'psRatio'].includes(field)) {
        return `${value.toFixed(2)} 倍`;
    }
    return `${value.toFixed(2)}%`;
};

// Selection Engine: filter and pick closest market cap peers
export const selectPeerSamplePool = (
    targetStock: RawStockData,
    allStocks: RawStockData[],
    maxCount: number = 10
): RawStockData[] => {
    const peersWithoutTarget = allStocks.filter(s => s.id !== targetStock.id);
    const targetMarketCap = targetStock.marketCap || 0;

    const sortedPeers = peersWithoutTarget.sort((a, b) => {
        const diffA = Math.abs((a.marketCap || 0) - targetMarketCap);
        const diffB = Math.abs((b.marketCap || 0) - targetMarketCap);
        return diffA - diffB;
    });

    return sortedPeers.slice(0, maxCount);
};

// Min-Max Normalization Engine (20-100 range)
export const calculateMinMaxScore = (
    value: number, 
    min: number, 
    max: number, 
    isReverse: boolean
): number => {
    if (max === min || isNaN(max) || isNaN(min) || isNaN(value)) return 50; // Edge case: all same or bad data
    
    let score = 0;
    if (isReverse) {
        // Negative Indicator (Lower is better: e.g. PE, Debt Ratio)
        score = 20 + ((max - value) / (max - min)) * 80;
    } else {
        // Positive Indicator (Higher is better: e.g. Gross Margin, ROA)
        score = 20 + ((value - min) / (max - min)) * 80;
    }
    
    return Math.round(Math.max(20, Math.min(100, score)));
};

// Statistical Engine: Median
export const calculateMedianValues = (pool: RawStockData[], field: string): number => {
    const values = pool
        .map(p => p[field as keyof RawStockData])
        .filter((v): v is number => typeof v === 'number');
    
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
        ? (sorted[mid - 1] + sorted[mid]) / 2 
        : sorted[mid];
};

// Main scoring calculation (Min-Max Based)
export const calculateRadarScores = (
    mainStock: RawStockData,
    peerPool: RawStockData[],
    industrySector: string,
    industryAverage?: any,
    industryRange?: any
): { targetScores: RadarChartScore[], benchmarkScores: RadarChartScore[] } => {
    const mapping = getIndustryMapping(industrySector);
    // 組合用於計算極值的 Pool：如果有 industryRange 則優先使用範圍
    const fullPool = [mainStock, ...peerPool];
    
    const targetScores: RadarChartScore[] = [];
    const benchmarkScores: RadarChartScore[] = [];

    const dimensions = ['獲利能力', '成長動能', '財務安全', '估值水準', '籌碼與股息'];

    dimensions.forEach(dim => {
        const configs = mapping[dim] || [];
        const dimTargetScores: number[] = [];
        const dimBenchmarkScores: number[] = [];
        const metadata: RadarMetricMetadata[] = [];

        configs.forEach(config => {
            let field = config.field;
            let label = config.label;

            // 估值降級機制 (Valuation Fallback Mechanism)
            if (dim === '估值水準' && field === 'peRatio') {
                const requiresFallback = fullPool.some(p => p.peRatio === null || p.peRatio === undefined || p.peRatio <= 0);
                if (requiresFallback && config.fallbackField) {
                    field = config.fallbackField;
                    if (field === 'psRatio') label = '股價營收比 (P/S)';
                    if (field === 'pbRatio') label = '股價淨值比 (P/B)';
                    
                    const peVal = mainStock.peRatio;
                    metadata.push({ 
                        label: '本益比 (P/E)', 
                        valueData: (peVal === null || peVal === undefined || peVal <= 0) ? '虧損 / NA' : `${peVal.toFixed(2)} 倍` 
                    });
                }
            }

            // 取得 Min/Max 範圍 (優先使用傳入的產業全量數據)
            let min: number = 0;
            let max: number = 0;
            let hasValidRange = false;

            if (industryRange && industryRange[field as string]) {
                min = industryRange[field as string].min;
                max = industryRange[field as string].max;
                hasValidRange = true;
            } else {
                const validPool = fullPool.filter(p => typeof p[field as keyof RawStockData] === 'number');
                const poolValues = validPool.map(p => Number(p[field as keyof RawStockData]));
                if (poolValues.length > 0) {
                    max = Math.max(...poolValues);
                    min = Math.min(...poolValues);
                    hasValidRange = true;
                }
            }
            
            if (hasValidRange) {
                // Target Score
                const targetValue = mainStock[field as keyof RawStockData];
                if (typeof targetValue === 'number') {
                    dimTargetScores.push(calculateMinMaxScore(targetValue, min, max, config.isReverse));
                    metadata.push({ label, valueData: formatMetricValue(field as string, targetValue) });
                }

                // Benchmark Score (同業標竿)
                let benchmarkRawValue: number = 0;
                if (industryAverage && typeof industryAverage[field as string] === 'number') {
                    benchmarkRawValue = industryAverage[field as string];
                } else {
                    benchmarkRawValue = calculateMedianValues(peerPool, field as string);
                }
                dimBenchmarkScores.push(calculateMinMaxScore(benchmarkRawValue, min, max, config.isReverse));
            }
        });

        // Use Average of indices PR for dimension score (or median)
        const getAvg = (arr: number[]) => {
            const valid = arr.filter(n => typeof n === 'number' && !isNaN(n));
            return valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 50;
        };

        targetScores.push({ subject: dim, score: getAvg(dimTargetScores), metadata });
        benchmarkScores.push({ subject: dim, score: getAvg(dimBenchmarkScores), metadata: [] });
    });

    return { targetScores, benchmarkScores };
};
