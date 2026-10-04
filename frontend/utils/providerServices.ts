// Pure helpers for the "Services & Rates" editor (unit-tested). Rules mirror
// backend/src/providers/dto/update-services.dto.ts; the server stays authoritative.
import type { ServiceCategory } from '../types/provider';

export const MAX_SERVICES = 10;
export const MIN_PRICE = 100;
export const MAX_PRICE = 1_000_000;
export const MAX_VISIT_FEE = 10_000;

// Common services per trade, offered as one-tap suggestions.
export const SERVICE_SUGGESTIONS: Record<ServiceCategory, string[]> = {
  plumbing: ['Tap Repair & Washer Replacement', 'Pipe Leak Repair', 'Drain Unblocking', 'Water Pump Check'],
  electrical: ['Wiring Fault Repair', 'Fan & Light Installation', 'Socket & Switch Repair', 'Distribution Board Check'],
  cleaning: ['Full Home Deep Clean', 'Kitchen Deep Clean', 'Bathroom Deep Clean', 'Sofa & Carpet Shampoo'],
};

export interface ServiceDraft {
  id?: string;
  name: string;
  price: string; // text field value
}

export interface ServicesErrors {
  visitFee?: string;
  list?: string;
  rows: Record<number, string>;
}

function parseRupees(value: string): number | null {
  const trimmed = value.replace(/[,\s]/g, '');
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}

export function validateServices(drafts: ServiceDraft[], visitFee: string): ServicesErrors {
  const errors: ServicesErrors = { rows: {} };

  const fee = parseRupees(visitFee || '0');
  if (fee === null) errors.visitFee = 'Enter the visiting fee in whole rupees (0 if none)';
  else if (fee > MAX_VISIT_FEE) errors.visitFee = `Visiting fee must be at most Rs. ${MAX_VISIT_FEE.toLocaleString('en-US')}`;

  if (drafts.length === 0) errors.list = 'Add at least one service';
  if (drafts.length > MAX_SERVICES) errors.list = `You can list up to ${MAX_SERVICES} services`;

  const seen = new Set<string>();
  drafts.forEach((d, i) => {
    const name = d.name.trim();
    const price = parseRupees(d.price);
    if (name.length < 3) errors.rows[i] = 'Service name must be at least 3 characters';
    else if (name.length > 60) errors.rows[i] = 'Service name must be at most 60 characters';
    else if (seen.has(name.toLowerCase())) errors.rows[i] = 'This service is already listed';
    else if (price === null) errors.rows[i] = 'Enter the price in whole rupees';
    else if (price < MIN_PRICE) errors.rows[i] = `Price must be at least Rs. ${MIN_PRICE}`;
    else if (price > MAX_PRICE) errors.rows[i] = 'Price is too high';
    seen.add(name.toLowerCase());
  });

  return errors;
}

export function hasServiceErrors(errors: ServicesErrors): boolean {
  return !!errors.visitFee || !!errors.list || Object.keys(errors.rows).length > 0;
}

export function toServicesPayload(drafts: ServiceDraft[], visitFee: string) {
  return {
    visitFee: parseRupees(visitFee || '0') ?? 0,
    services: drafts.map((d) => ({
      ...(d.id ? { id: d.id } : {}),
      name: d.name.trim(),
      price: parseRupees(d.price) ?? 0,
    })),
  };
}
