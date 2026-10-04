import type { Review } from '../types/provider';
import { apiRequest } from './api';

export const reviewService = {
  listForProvider(providerId: string, limit = 10, skip = 0): Promise<{ items: Review[]; total: number }> {
    return apiRequest('/reviews', { query: { providerId, limit, skip } });
  },
};
