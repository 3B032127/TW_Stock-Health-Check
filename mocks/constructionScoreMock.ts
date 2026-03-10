import { RawStockData } from '../types';

export const CONSTRUCTION_MOCK_DATA: RawStockData[] = [
    {
        id: '1',
        name: '星宇建設 (個股)',
        price: 45.2,
        peRatio: 12.5,
        pbRatio: 1.2,
        dividendYield: 4.5,
        marketCap: 150.5,
        // 獲利能力
        netMargin: 18.2,
        projectGrossMargin: 32.5,
        // 成長動能
        contractLiabilitiesYoY: 25.4,
        // 財務安全
        inventoryToAssetsRatio: 45.2,
        debtRatio: 65.8,
    },
    {
        id: '2',
        name: '海悅',
        price: 112.5,
        peRatio: 8.5,
        pbRatio: 2.1,
        dividendYield: 6.2,
        marketCap: 450.2,
        // 獲利能力
        netMargin: 22.4,
        projectGrossMargin: 40.1,
        // 成長動能
        contractLiabilitiesYoY: 15.2,
        // 財務安全
        inventoryToAssetsRatio: 30.5,
        debtRatio: 55.4,
    },
    {
        id: '3',
        name: '興富發',
        price: 38.6,
        peRatio: 15.2,
        pbRatio: 1.5,
        dividendYield: 3.8,
        marketCap: 800.5,
        // 獲利能力
        netMargin: 15.5,
        projectGrossMargin: 28.4,
        // 成長動能
        contractLiabilitiesYoY: -5.2,
        // 財務安全
        inventoryToAssetsRatio: 60.5,
        debtRatio: 75.2,
    }
];

export const CONSTRUCTION_INDUSTRY_AVG: RawStockData = {
    id: 'ALL',
    name: '營建業平均',
    price: 0,
    peRatio: 12.0,
    pbRatio: 1.6,
    dividendYield: 4.8,
    marketCap: 0,
    netMargin: 18.7,
    projectGrossMargin: 33.6,
    contractLiabilitiesYoY: 11.8,
    inventoryToAssetsRatio: 45.4,
    debtRatio: 65.4,
};
