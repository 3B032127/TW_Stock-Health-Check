import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { HealthCheckData } from '../types';

export const useHealthCheck = (stockId: string) => {
    return useQuery<HealthCheckData, Error>({
        queryKey: ['healthCheck', stockId],
        queryFn: async () => {
            const response = await api.getHealthCheck(stockId);
            const data = response.data as HealthCheckData;

            // Inject advanced mock data for the new UI until backend is updated
            data.advanced = {
                prosCons: {
                    pros: [
                        '估值極具吸引力，處於歷史低位區間',
                        '強大償債能力，利息保障倍數遠超業界',
                        '獲利轉現金效率極高，股利發放無虞'
                    ],
                    cons: [
                        '短期營收受終端市場疲弱影響放緩',
                        '地緣政治風險溢價，可能壓抑整體本益比',
                        '資本支出維持高檔，可能壓縮短期自由現金流'
                    ]
                },
                moat: [
                    { label: '連續 10 年獲利', status: 'pass' },
                    { label: '連續 5 年配息成長', status: 'pass' },
                    { label: '毛利率變動幅度 (<5%)', status: 'fail' },
                    { label: '技術領導力 (N2/N3)', status: 'pass' }
                ],
                moatScore: 94,
                dupont: {
                    roe: 28.1,
                    netMargin: 38.8,
                    assetTurnover: 0.8,
                    equityMultiplier: 1.1
                },
                pePercentile: 20,
                peBand: { min: 12, max: 30, current: 16.4 }
            };

            // Inject mock sparklines to fill empty spaces in MetricCards
            if (data.solvency?.items) {
                data.solvency.items.forEach(item => {
                    item.sparkline = Array.from({length: 10}, () => Math.random() * 10 + 10);
                });
            }
            if (data.growth?.items) {
                data.growth.items.forEach(item => {
                    // Growth often swings more
                    item.sparkline = Array.from({length: 10}, () => Math.random() * 20 - 10);
                });
            }

            return data;
        },
        enabled: !!stockId,
        staleTime: 1000 * 60 * 60, // 1 hour
    });
};
