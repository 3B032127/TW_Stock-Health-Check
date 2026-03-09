import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { FinancialHighlightsData } from '../types';

export interface CompanyProfile {
    id: string;
    name: string;
    industry: string;
    sector: string;
    description: string;
    chairman: string;
    ceo: string;
    foundedDate: string;
    listingDate: string;
    capital: string;
    website: string;
    marketCap: number;
    fullTimeEmployees: number | string;
    financialHighlights?: FinancialHighlightsData;
}

export const useCompanyProfile = (stockId: string) => {
    return useQuery<CompanyProfile, Error>({
        queryKey: ['companyProfile', stockId],
        queryFn: async () => {
            const response = await api.getCompanyProfile(stockId);
            return response.data as CompanyProfile;
        },
        enabled: !!stockId,
        staleTime: 1000 * 60 * 60 * 24, // 24 hours, stock profile rarely changes
    });
};
