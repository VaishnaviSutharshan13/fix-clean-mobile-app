import type { CategorySummary, Provider, ProviderDetails, ProviderSort, ServiceCategory } from '../types/provider';
import { apiRequest } from './api';

export type ProviderQuery = {
  category?: ServiceCategory;
  search?: string;
  sort?: ProviderSort;
  limit?: number;
};

export const providerService = {
  list(query: ProviderQuery = {}): Promise<Provider[]> {
    return apiRequest<Provider[]>('/providers', { query });
  },

  categories(): Promise<CategorySummary[]> {
    return apiRequest<CategorySummary[]>('/providers/categories');
  },

  details(providerId: string): Promise<ProviderDetails> {
    return apiRequest<ProviderDetails>(`/providers/${encodeURIComponent(providerId)}`);
  },
};
