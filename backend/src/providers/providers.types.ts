import type { ReviewView } from '../reviews/reviews.types.js';
import type { ServiceCategory, VerificationStatus } from './schemas/provider-profile.schema.js';

export interface VerificationChecksView {
  identity: boolean;
  contact: boolean;
  experience: boolean;
}

// Card-level information for Home and Provider List (FR1, FR2, pricing).
export interface ProviderSummary {
  id: string; // provider's User id
  name: string;
  headline: string;
  category: ServiceCategory;
  serviceArea: string;
  experienceYears: number;
  startingPrice: number;
  visitFee: number;
  ratingAverage: number;
  reviewCount: number;
  completedJobs: number;
  verificationStatus: VerificationStatus;
  verificationChecks: VerificationChecksView;
}

export interface ProviderServiceView {
  id: string;
  name: string;
  description: string;
  price: number;
}

// Provider Details screen (Variant B): decision-support information.
export interface ProviderDetails extends ProviderSummary {
  bio: string;
  services: ProviderServiceView[];
  priceRange: { min: number; max: number };
  recentReviews: ReviewView[];
  memberSince: Date;
}

export interface CategorySummary {
  category: ServiceCategory;
  providerCount: number;
  startingPrice: number | null;
}
