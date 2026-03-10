import { RawStockData, RadarChartScore, RadarMetricMetadata } from '../types';

// Helper: Normalize a value to a 0-100 scale based on typical min/max bounds
const normalizeScore = (val: number | undefined | null, min: number, max: number, reverse = false): number => {
    if (typeof val !== 'number' || isNaN(val)) return 0;

    // Clamp value
    const clamped = Math.max(min, Math.min(val, max));
    let score = ((clamped - min) / (max - min)) * 100;

    if (reverse) {
        score = 100 - score;
    }

    return Math.round(score);
};

// Helper: Combine multiple scores with optional weightings
const averageScores = (scores: number[]): number => {
    if (scores.length === 0) return 0;
    const sum = scores.reduce((acc, curr) => acc + curr, 0);
    return Math.round(sum / scores.length);
};

export const calculateRadarScores = (data: RawStockData, industrySector: string): RadarChartScore[] => {

    const scores: RadarChartScore[] = [];

    // ==========================================
    // 1. 獲利能力 (Profitability)
    // ==========================================
    let profitScore = 0;
    const profitMeta: RadarMetricMetadata[] = [];

    if (industrySector === '營建業') {
        const netMarginScore = normalizeScore(data.netMargin, 0, 40);
        const projMarginScore = normalizeScore(data.projectGrossMargin, 15, 50);
        profitScore = averageScores([netMarginScore, projMarginScore]);
        if (data.netMargin !== undefined) profitMeta.push({ label: '淨利率', valueData: `${data.netMargin.toFixed(2)}%` });
        if (data.projectGrossMargin !== undefined) profitMeta.push({ label: '建案毛利率', valueData: `${data.projectGrossMargin.toFixed(2)}%` });
    } else if (industrySector === '金融業' || industrySector === '金融保險業') {
        const roaScore = normalizeScore(data.roa, 0, 2);
        const roeScore = normalizeScore(data.roe, 0, 15);
        profitScore = averageScores([roaScore, roeScore]);
        if (data.roa !== undefined) profitMeta.push({ label: 'ROA', valueData: `${data.roa.toFixed(2)}%` });
        if (data.roe !== undefined) profitMeta.push({ label: 'ROE', valueData: `${data.roe.toFixed(2)}%` });
    } else {
        // 通用/科技業
        const grossScore = normalizeScore(data.grossMargin, 0, 60);
        const opScore = normalizeScore(data.operatingMargin, -10, 40);
        profitScore = averageScores([grossScore, opScore]);
        if (data.grossMargin !== undefined) profitMeta.push({ label: '毛利率', valueData: `${data.grossMargin.toFixed(2)}%` });
        if (data.operatingMargin !== undefined) profitMeta.push({ label: '營益率', valueData: `${data.operatingMargin.toFixed(2)}%` });
    }

    scores.push({ subject: '獲利能力', score: profitScore, metadata: profitMeta });

    // ==========================================
    // 2. 成長動能 (Growth)
    // ==========================================
    let growthScore = 0;
    const growthMeta: RadarMetricMetadata[] = [];

    if (industrySector === '營建業') {
        growthScore = normalizeScore(data.contractLiabilitiesYoY, -20, 100);
        if (data.contractLiabilitiesYoY !== undefined) growthMeta.push({ label: '合約負債年增率', valueData: `${data.contractLiabilitiesYoY.toFixed(2)}%` });
    } else if (industrySector === '金融業' || industrySector === '金融保險業') {
        growthScore = normalizeScore(data.netIncomeYoY, -30, 80);
        if (data.netIncomeYoY !== undefined) growthMeta.push({ label: '淨收益 YoY', valueData: `${data.netIncomeYoY.toFixed(2)}%` });
    } else {
        const revYoYScore = normalizeScore(data.revenueYoY, -20, 80);
        const epsYoYScore = normalizeScore(data.epsYoY, -50, 150);
        growthScore = averageScores([revYoYScore, epsYoYScore]);
        if (data.revenueYoY !== undefined) growthMeta.push({ label: '營收 YoY', valueData: `${data.revenueYoY.toFixed(2)}%` });
        if (data.epsYoY !== undefined) growthMeta.push({ label: 'EPS YoY', valueData: `${data.epsYoY.toFixed(2)}%` });
    }

    scores.push({ subject: '成長動能', score: growthScore, metadata: growthMeta });

    // ==========================================
    // 3. 財務安全 (Safety)
    // ==========================================
    let safetyScore = 0;
    const safetyMeta: RadarMetricMetadata[] = [];

    if (industrySector === '營建業') {
        // 營建業存貨越高可能積壓資金，負債比通常較高
        const invScore = normalizeScore(data.inventoryToAssetsRatio, 20, 80, true); // 反向，越低分數越高
        const debtScore = normalizeScore(data.debtRatio, 40, 90, true); // 反向
        safetyScore = averageScores([invScore, debtScore]);
        if (data.inventoryToAssetsRatio !== undefined) safetyMeta.push({ label: '存貨佔總資產', valueData: `${data.inventoryToAssetsRatio.toFixed(2)}%` });
        if (data.debtRatio !== undefined) safetyMeta.push({ label: '負債比', valueData: `${data.debtRatio.toFixed(2)}%` });
    } else if (industrySector === '金融業' || industrySector === '金融保險業') {
        const bisScore = normalizeScore(data.capitalAdequacyRatio, 8, 20);
        const nplScore = normalizeScore(data.nplRatio, 0, 2, true); // 逾放比越低越好
        safetyScore = averageScores([bisScore, nplScore]);
        if (data.capitalAdequacyRatio !== undefined) safetyMeta.push({ label: '資本適足率 (BIS)', valueData: `${data.capitalAdequacyRatio.toFixed(2)}%` });
        if (data.nplRatio !== undefined) safetyMeta.push({ label: '逾放比', valueData: `${data.nplRatio.toFixed(2)}%` });
    } else {
        const currentScore = normalizeScore(data.currentRatio, 100, 300);
        const debtScore = normalizeScore(data.debtRatio, 20, 80, true); // 負債越低越好
        safetyScore = averageScores([currentScore, debtScore]);
        if (data.currentRatio !== undefined) safetyMeta.push({ label: '流動比率', valueData: `${data.currentRatio.toFixed(2)}%` });
        if (data.debtRatio !== undefined) safetyMeta.push({ label: '負債比', valueData: `${data.debtRatio.toFixed(2)}%` });
    }

    scores.push({ subject: '財務安全', score: safetyScore, metadata: safetyMeta });

    // ==========================================
    // 4. 估值水準 (Valuation)
    // ==========================================
    let valuationScore = 0;
    const valuationMeta: RadarMetricMetadata[] = [];

    if (industrySector === '營建業' || industrySector === '金融業' || industrySector === '金融保險業') {
        // 這些產業主要看 P/B
        valuationScore = normalizeScore(data.pbRatio, 0.5, 4, true); // 越低越便宜
        if (data.pbRatio !== undefined) valuationMeta.push({ label: '股價淨值比 (P/B)', valueData: `${data.pbRatio.toFixed(2)} 倍` });
    } else {
        // 一般產業看 P/E，虧損時 fallback 至 P/S
        if (data.peRatio === null || data.peRatio < 0) {
            valuationScore = normalizeScore(data.psRatio, 0.5, 15, true);
            if (data.psRatio !== undefined) valuationMeta.push({ label: '股價營收比 (P/S)', valueData: `${data.psRatio.toFixed(2)} 倍` });
            valuationMeta.push({ label: '本益比 (P/E)', valueData: '虧損 / NA' });
        } else {
            valuationScore = normalizeScore(data.peRatio, 8, 50, true);
            if (data.peRatio !== undefined) valuationMeta.push({ label: '本益比 (P/E)', valueData: `${data.peRatio.toFixed(2)} 倍` });
        }
    }

    scores.push({ subject: '估值水準', score: valuationScore, metadata: valuationMeta });

    // ==========================================
    // 5. 籌碼與股息 (Dividend & Yield)
    // ==========================================
    let dividendScore = 0;
    const dividendMeta: RadarMetricMetadata[] = [];

    if (industrySector === '營建業' || industrySector === '金融業' || industrySector === '金融保險業') {
        dividendScore = normalizeScore(data.dividendYield, 0, 10); // 只看殖利率
        if (data.dividendYield !== undefined) dividendMeta.push({ label: '現金殖利率', valueData: `${data.dividendYield.toFixed(2)}%` });
    } else {
        const yieldScore = normalizeScore(data.dividendYield, 0, 8);
        const instScore = normalizeScore(data.institutionalOwnership, 0, 80);
        dividendScore = averageScores([yieldScore, instScore]);
        if (data.dividendYield !== undefined) dividendMeta.push({ label: '現金殖利率', valueData: `${data.dividendYield.toFixed(2)}%` });
        if (data.institutionalOwnership !== undefined) dividendMeta.push({ label: '法人持股比例', valueData: `${data.institutionalOwnership.toFixed(2)}%` });
    }

    scores.push({ subject: '籌碼與股息', score: dividendScore, metadata: dividendMeta });

    return scores;
};
