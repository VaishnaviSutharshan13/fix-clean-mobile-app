import { ServiceCategory } from '../providers/schemas/provider-profile.schema.js';

// Same limits as Services & Rates (providers/dto/update-services.dto.ts).
export const MIN_SERVICE_PRICE = 100;
export const MAX_SERVICE_PRICE = 1_000_000;

type ProfileForReview = {
  category?: string | null;
  headline?: string | null;
  serviceArea?: string | null;
  experienceYears?: number | null;
  visitFee?: number | null;
  services?: { name?: string | null; price?: number | null }[] | null;
  verificationChecks?: { identity?: boolean; contact?: boolean; experience?: boolean } | null;
};

type AccountForReview = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  isActive?: boolean | null;
} | null;

// FR7: what still prevents an administrator from approving a provider. A
// provider may only become verified (and therefore visible and bookable to
// customers) when the profile is complete, at least one valid service with a
// valid price exists, and the admin has confirmed identity, contact and
// experience. An empty list means the provider can be approved.
export function approvalProblems(profile: ProfileForReview, account: AccountForReview): string[] {
  const problems: string[] = [];

  if (!account) {
    problems.push('The provider account no longer exists.');
  } else {
    if (account.isActive === false) problems.push('The provider account is suspended.');
    if (!account.name?.trim()) problems.push('Full name is missing.');
    if (!account.email?.trim()) problems.push('Email address is missing.');
    if (!account.phone?.trim()) problems.push('Phone number is missing.');
  }

  if (!profile.category || !Object.values<string>(ServiceCategory).includes(profile.category)) {
    problems.push('Trade / service category is missing or invalid.');
  }
  if (!profile.serviceArea?.trim()) problems.push('Service area (district) is missing.');
  if (!profile.headline?.trim()) problems.push('Professional headline is missing.');
  if (typeof profile.experienceYears !== 'number' || profile.experienceYears < 0) {
    problems.push('Years of experience is missing.');
  }
  if (typeof profile.visitFee !== 'number' || profile.visitFee < 0) {
    problems.push('Visiting fee is invalid.');
  }

  const services = profile.services ?? [];
  if (services.length === 0) {
    problems.push('The provider has not proposed any services & rates yet.');
  }
  for (const service of services) {
    const name = service.name?.trim() ?? '';
    const price = service.price;
    if (
      name.length < 3 ||
      typeof price !== 'number' ||
      !Number.isInteger(price) ||
      price < MIN_SERVICE_PRICE ||
      price > MAX_SERVICE_PRICE
    ) {
      problems.push(`Service "${name || 'Unnamed'}" needs a valid name and a price of at least Rs. ${MIN_SERVICE_PRICE}.`);
    }
  }

  const checks = profile.verificationChecks ?? {};
  if (!checks.identity) problems.push('Identity check has not been confirmed.');
  if (!checks.contact) problems.push('Contact check has not been confirmed.');
  if (!checks.experience) problems.push('Experience check has not been confirmed.');

  return problems;
}
