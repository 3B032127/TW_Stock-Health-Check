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

// Percentage Rank (PR) Calculation
export const calculatePR = (value: number, poolValues: number[], isReverse: boolean): number => {
    if (poolValues.length === 0) return 0;

    const sorted = [...poolValues].sort((a, b) => a - b);
    const belowCount = sorted.filter(v => v < value).length;
    const equalCount = sorted.filter(v => v === value).length;

    let pr = ((belowCount + 0.5 * equalCount) / poolValues.length) * 100;

    if (isReverse) {
        pr = 100 - pr;
    }

    return Math.round(pr);
};

// Statistical Engine: Median
export const calculateMedian = (values: number[]): number => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    }
    return Math.round(sorted[mid]);
};

// Main scoring calculation
export const calculateRadarScores = (
    mainStock: RawStockData,
    peerPool: RawStockData[],
    industrySector: string
): RadarChartScore[] => {
    const mapping = getIndustryMapping(industrySector);
    
    // Include main stock in the sample pool for PR calculation
    const fullPool = [mainStock, ...peerPool];
    const scores: RadarChartScore[] = [];

    const dimensions = ['獲利能力', '成長動能', '財務安全', '估值水準', '籌碼與股息'];

    dimensions.forEach(dim => {
        const configs = mapping[dim] || [];
        const dimPRs: number[] = [];
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
                    
                    if (mainStock.peRatio === null || mainStock.peRatio === undefined || mainStock.peRatio <= 0) {
                        metadata.push({ label: '本益比 (P/E)', valueData: '虧損 / NA' });
                    } else {
                        metadata.push({ label: '本益比 (P/E)', valueData: `${mainStock.peRatio.toFixed(2)} 倍` });
                    }
                }
            }

            const validPool = fullPool.filter(p => typeof p[field] === 'number');
            const poolValues = validPool.map(p => Number(p[field]));
            
            const mainValue = mainStock[field];

            if (typeof mainValue === 'number') {
                const prScore = calculatePR(mainValue, poolValues, config.isReverse);
                dimPRs.push(prScore);
                metadata.push({ label, valueData: formatMetricValue(field as string, mainValue) });
            } else {
                metadata.push({ label, valueData: '-' });
            }
        });

        const score = calculateMedian(dimPRs);
        scores.push({ subject: dim, score, metadata });
    });

    return scores;
};
