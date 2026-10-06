import { describe, expect, it } from 'vitest';

import { getPasswordStrength } from '../passwordStrength';

describe('getPasswordStrength', () => {
  it('is empty for an empty password', () => {
    expect(getPasswordStrength('')).toEqual({ level: 0, label: '' });
  });

  it('rates passwords that fail the required rules as Weak', () => {
    expect(getPasswordStrength('abc').label).toBe('Weak');
    expect(getPasswordStrength('abcdefghijkLMN!').label).toBe('Weak'); // no digit
    expect(getPasswordStrength('Ab1!').label).toBe('Weak'); // too short
  });

  it('increases with length and character variety', () => {
    expect(getPasswordStrength('secret123')).toEqual({ level: 2, label: 'Fair' });
    expect(getPasswordStrength('secretpass123')).toEqual({ level: 3, label: 'Good' });
    expect(getPasswordStrength('SriLankaPass123')).toEqual({ level: 4, label: 'Strong' });
  });
});
