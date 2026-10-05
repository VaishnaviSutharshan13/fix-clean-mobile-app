import { describe, expect, it } from 'vitest';

import {
  ADMIN_BOOKING_META,
  allChecksConfirmed,
  BOOKING_ACCENT,
  BOOKING_FILTERS,
  COMPLAINT_STATUS_META,
  confirmedCheckCount,
  formatExperience,
  shortRef,
  truncate,
  userFilterQuery,
  validateComplaintNote,
  validateRejectionReason,
  VERIFICATION_META,
  verificationOutcome,
  withCount,
} from '../admin';

describe('admin status formatting', () => {
  it('labels verification and complaint statuses', () => {
    expect(VERIFICATION_META.pending.label).toBe('Pending');
    expect(VERIFICATION_META.verified.label).toBe('Verified');
    expect(VERIFICATION_META.rejected.label).toBe('Rejected');
    expect(COMPLAINT_STATUS_META.in_review.label).toBe('In Review');
  });

  it('has an admin chip and card accent for every booking status', () => {
    for (const status of ['requested', 'confirmed', 'on_the_way', 'completed', 'declined', 'cancelled'] as const) {
      expect(ADMIN_BOOKING_META[status].label).toBeTruthy();
      expect(BOOKING_ACCENT[status]).toMatch(/^#[0-9A-F]{6}$/);
    }
    expect(ADMIN_BOOKING_META.on_the_way.label).toBe('On the Way');
  });

  it('shortens ids into display references', () => {
    expect(shortRef('PRO', '6ac3342408aea4f3761d4585')).toBe('#PRO-1D4585');
  });

  it('adds counts to filter labels', () => {
    expect(withCount('Pending', 3)).toBe('Pending (3)');
    expect(withCount('Pending', undefined)).toBe('Pending');
  });

  it('formats experience', () => {
    expect(formatExperience(0)).toBe('Under 1 yr');
    expect(formatExperience(1)).toBe('1 yr');
    expect(formatExperience(12)).toBe('12 yrs');
  });

  it('truncates long text on a word-safe boundary', () => {
    expect(truncate('Short', 10)).toBe('Short');
    expect(truncate('A  long\n complaint description', 12)).toBe('A long comp…');
  });
});

describe('filters', () => {
  it('uses the exact booking statuses, with All first', () => {
    expect(BOOKING_FILTERS).toEqual([
      undefined,
      'requested',
      'confirmed',
      'on_the_way',
      'completed',
      'declined',
      'cancelled',
    ]);
  });

  it('maps user filters to API queries', () => {
    expect(userFilterQuery('all')).toEqual({});
    expect(userFilterQuery('provider')).toEqual({ role: 'provider' });
    expect(userFilterQuery('suspended')).toEqual({ status: 'suspended' });
  });
});

describe('verification checks', () => {
  it('counts confirmed checks and requires all three', () => {
    expect(confirmedCheckCount({ identity: true, contact: false, experience: true })).toBe(2);
    expect(allChecksConfirmed({ identity: true, contact: false, experience: true })).toBe(false);
    expect(allChecksConfirmed({ identity: true, contact: true, experience: true })).toBe(true);
  });

  it('limits the rejection reason length', () => {
    expect(validateRejectionReason('')).toBeUndefined();
    expect(validateRejectionReason('x'.repeat(301))).toContain('300');
  });

  it('describes the verification outcome', () => {
    expect(verificationOutcome('approve', 'Sunil').title).toBe('Provider verified');
    expect(verificationOutcome('reject', 'Sunil').message).toContain('hidden from customers');
  });
});

describe('complaint status logic', () => {
  it('requires a resolution note only when resolving', () => {
    expect(validateComplaintNote('in_review', '')).toBeUndefined();
    expect(validateComplaintNote('resolved', ' ok ')).toContain('resolution note');
    expect(validateComplaintNote('resolved', 'Refund issued')).toBeUndefined();
    expect(validateComplaintNote('in_review', 'x'.repeat(501))).toContain('500');
  });
});
