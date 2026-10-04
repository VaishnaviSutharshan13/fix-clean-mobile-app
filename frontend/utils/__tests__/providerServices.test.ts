import { describe, expect, it } from 'vitest';

import {
  hasServiceErrors,
  SERVICE_SUGGESTIONS,
  toServicesPayload,
  validateServices,
} from '../providerServices';

describe('Services & Rates validation', () => {
  it('accepts valid services and a zero visiting fee', () => {
    const errors = validateServices([{ name: 'Tap Repair', price: '2,000' }], '0');
    expect(hasServiceErrors(errors)).toBe(false);
  });

  it('requires at least one service', () => {
    expect(validateServices([], '500').list).toBe('Add at least one service');
  });

  it('rejects short names, duplicates, bad and too-low prices', () => {
    const errors = validateServices(
      [
        { name: 'Ab', price: '1000' },
        { name: 'Tap Repair', price: 'free' },
        { name: 'Drain Unblocking', price: '50' },
        { name: 'Pump Check', price: '2500' },
        { name: 'pump check', price: '2600' },
      ],
      '300',
    );
    expect(errors.rows).toEqual({
      0: 'Service name must be at least 3 characters',
      1: 'Enter the price in whole rupees',
      2: 'Price must be at least Rs. 100',
      4: 'This service is already listed',
    });
  });

  it('validates the visiting fee', () => {
    expect(validateServices([{ name: 'Tap Repair', price: '2000' }], '-5').visitFee).toMatch(/whole rupees/);
    expect(validateServices([{ name: 'Tap Repair', price: '2000' }], '20000').visitFee).toMatch(/at most/);
  });

  it('builds the API payload, keeping ids of existing services', () => {
    expect(
      toServicesPayload(
        [
          { id: 'abc', name: ' Tap Repair ', price: '2,500' },
          { name: 'Pump Check', price: '3000' },
        ],
        '',
      ),
    ).toEqual({
      visitFee: 0,
      services: [
        { id: 'abc', name: 'Tap Repair', price: 2500 },
        { name: 'Pump Check', price: 3000 },
      ],
    });
  });

  it('offers suggestions for every trade', () => {
    for (const list of Object.values(SERVICE_SUGGESTIONS)) expect(list.length).toBeGreaterThan(0);
  });
});
