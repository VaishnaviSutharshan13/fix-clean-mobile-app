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
  isAvailable: boolean;
  avatarUrl: string | null;
  // Next bookable arrival window from the provider's schedule (Sri Lanka time), or null.
  nextSlot: { date: string; timeSlot: string } | null;
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
  availability: Availability;
}

export interface CategorySummary {
  category: ServiceCategory;
  providerCount: number;
  startingPrice: number | null;
}

export type ProviderSort = 'rating' | 'price' | 'experience';

export interface Availability {
  isAvailable: boolean;
  // 0 = Sunday … 6 = Saturday
  workingDays: number[];
  timeSlots: string[];
}

// The signed-in provider's own account (GET /provider/me).
export interface ProviderAccount {
  id: string;
  name: string;
  avatarUrl: string | null;
  email: string;
  phone: string;
  category: ServiceCategory;
  headline: string;
  serviceArea: string;
  experienceYears: number;
  verificationStatus: VerificationStatus;
  verificationChecks: VerificationChecks;
  // Administrator's reason, only when the application was rejected.
  rejectionReason: string | null;
  servicesCount: number;
  services: ProviderServiceItem[];
  visitFee: number;
  availability: Availability;
  availabilityUpdatedAt: string | null;
}
