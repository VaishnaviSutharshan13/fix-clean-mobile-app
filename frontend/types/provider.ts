export type ServiceCategory = 'plumbing' | 'electrical' | 'cleaning';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface VerificationChecks {
  identity: boolean;
  contact: boolean;
  experience: boolean;
}

export interface Provider {
  id: string;
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
  verificationChecks: VerificationChecks;
}

export interface ProviderServiceItem {
  id: string;
  name: string;
  description: string;
  price: number;
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  customerName: string;
  createdAt: string;
}

export interface ProviderDetails extends Provider {
  bio: string;
  services: ProviderServiceItem[];
  priceRange: { min: number; max: number };
  recentReviews: Review[];
  memberSince: string;
}

export interface CategorySummary {
  category: ServiceCategory;
  providerCount: number;
  startingPrice: number | null;
}

export type ProviderSort = 'rating' | 'price' | 'experience';
