import { RawStockData } from '../types';

export interface MetricConfig {
    field: keyof RawStockData;
    label: string;
    isReverse: boolean;
    fallbackField?: keyof RawStockData;
}

export type IndustryMapping = Record<string, MetricConfig[]>;

export const PEER_ENGINE_DICTIONARY: Record<string, IndustryMapping> = {
    '營建業': {
        '獲利能力': [
            { field: 'netMargin', label: '淨利率', isReverse: false },
            { field: 'projectGrossMargin', label: '建案毛利率', isReverse: false }
        ],
        '成長動能': [
            { field: 'contractLiabilitiesYoY', label: '合約負債年增率', isReverse: false }
        ],
        '財務安全': [
            { field: 'inventoryToAssetsRatio', label: '存貨佔總資產', isReverse: true },
            { field: 'debtRatio', label: '負債比', isReverse: true }
        ],
        '估值水準': [
            { field: 'pbRatio', label: '股價淨值比 (P/B)', isReverse: true }
        ],
        '籌碼與股息': [
            { field: 'dividendYield', label: '現金殖利率', isReverse: false }
        ]
    },
    '金融業': {
        '獲利能力': [
            { field: 'roa', label: 'ROA', isReverse: false },
            { field: 'roe', label: 'ROE', isReverse: false }
        ],
        '成長動能': [
            { field: 'netIncomeYoY', label: '淨收益 YoY', isReverse: false }
        ],
        '財務安全': [
            { field: 'capitalAdequacyRatio', label: '資本適足率 (BIS)', isReverse: false },
            { field: 'nplRatio', label: '逾放比', isReverse: true }
        ],
        '估值水準': [
            { field: 'pbRatio', label: '股價淨值比 (P/B)', isReverse: true }
        ],
        '籌碼與股息': [
            { field: 'dividendYield', label: '現金殖利率', isReverse: false }
        ]
    },
    '金融保險業': {
        '獲利能力': [
            { field: 'roa', label: 'ROA', isReverse: false },
            { field: 'roe', label: 'ROE', isReverse: false }
        ],
        '成長動能': [
            { field: 'netIncomeYoY', label: '淨收益 YoY', isReverse: false }
        ],
        '財務安全': [
            { field: 'capitalAdequacyRatio', label: '資本適足率 (BIS)', isReverse: false },
            { field: 'nplRatio', label: '逾放比', isReverse: true }
        ],
        '估值水準': [
            { field: 'pbRatio', label: '股價淨值比 (P/B)', isReverse: true }
        ],
        '籌碼與股息': [
            { field: 'dividendYield', label: '現金殖利率', isReverse: false }
        ]
    },
    'default': {
        '獲利能力': [
            { field: 'grossMargin', label: '毛利率', isReverse: false },
            { field: 'operatingMargin', label: '營益率', isReverse: false }
        ],
        '成長動能': [
            { field: 'revenueYoY', label: '營收 YoY', isReverse: false },
            { field: 'epsYoY', label: 'EPS YoY', isReverse: false }
        ],
        '財務安全': [
            { field: 'currentRatio', label: '流動比率', isReverse: false },
            { field: 'debtRatio', label: '負債比', isReverse: true }
        ],
        '估值水準': [
            { field: 'peRatio', label: '本益比 (P/E)', isReverse: true, fallbackField: 'psRatio' }
        ],
        '籌碼與股息': [
            { field: 'dividendYield', label: '現金殖利率', isReverse: false },
            { field: 'institutionalOwnership', label: '法人持股比例', isReverse: false }
        ]
    }
};

export const getIndustryMapping = (sector: string): IndustryMapping => {
    return PEER_ENGINE_DICTIONARY[sector] || PEER_ENGINE_DICTIONARY['default'];
};
