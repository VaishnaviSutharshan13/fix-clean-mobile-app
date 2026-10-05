import { approvalProblems } from './provider-readiness.js';

const account = { name: 'Sunil Fernando', email: 'sunil@example.com', phone: '0771234567', isActive: true };
const ready = {
  category: 'plumbing',
  headline: 'Plumbing Specialist',
  serviceArea: 'Jaffna',
  experienceYears: 5,
  visitFee: 500,
  services: [{ name: 'Tap Repair', price: 2000 }],
  verificationChecks: { identity: true, contact: true, experience: true },
};

describe('approvalProblems', () => {
  it('returns no problems for a complete provider with confirmed checks', () => {
    expect(approvalProblems(ready, account)).toEqual([]);
  });

  it('requires at least one service', () => {
    expect(approvalProblems({ ...ready, services: [] }, account)).toEqual([
      'The provider has not proposed any services & rates yet.',
    ]);
  });

  it('rejects services with an invalid price', () => {
    const problems = approvalProblems({ ...ready, services: [{ name: 'Tap Repair', price: 50 }] }, account);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('Tap Repair');
  });

  it('requires all three verification checks', () => {
    const problems = approvalProblems(
      { ...ready, verificationChecks: { identity: true, contact: false, experience: false } },
      account,
    );
    expect(problems).toEqual([
      'Contact check has not been confirmed.',
      'Experience check has not been confirmed.',
    ]);
  });

  it('flags missing profile fields and suspended accounts', () => {
    const problems = approvalProblems(
      { ...ready, category: 'gardening', serviceArea: ' ', headline: '' },
      { ...account, isActive: false },
    );
    expect(problems).toEqual([
      'The provider account is suspended.',
      'Trade / service category is missing or invalid.',
      'Service area (district) is missing.',
      'Professional headline is missing.',
    ]);
  });

  it('handles a missing account', () => {
    expect(approvalProblems(ready, null)).toEqual(['The provider account no longer exists.']);
  });
});
