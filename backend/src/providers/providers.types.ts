import type { ReviewView } from '../reviews/reviews.types.js';
import type { AvailabilityView } from './availability.js';
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
  // Duty status (FR5); off-duty providers can't be booked.
  isAvailable: boolean;
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
  availability: AvailabilityView;
}

// The signed-in provider's own account (Provider Dashboard / Manage Availability).
export interface ProviderAccountView {
  id: string;
  name: string;
  email: string;
  phone: string;
  category: ServiceCategory;
  headline: string;
  serviceArea: string;
  experienceYears: number;
  verificationStatus: VerificationStatus;
  verificationChecks: VerificationChecksView;
  servicesCount: number;
  services: ProviderServiceView[];
  visitFee: number;
  availability: AvailabilityView;
  availabilityUpdatedAt: Date | null;
}

export interface CategorySummary {
  category: ServiceCategory;
  providerCount: number;
  startingPrice: number | null;
}
