// Local password-strength hint for Customer Sign Up (four bars, as in the
// reference). It only guides the user; the rules that are actually enforced
// are in validatePassword (mirroring the backend DTO).
export type StrengthLevel = 0 | 1 | 2 | 3 | 4;

const LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'] as const;

export function getPasswordStrength(password: string): { level: StrengthLevel; label: string } {
  if (!password) return { level: 0, label: '' };
  let score = 1;
  if (password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password)) score++;
  if (password.length >= 12) score++;
  if (/[^A-Za-z0-9]/.test(password) || (/[a-z]/.test(password) && /[A-Z]/.test(password))) score++;
  // A password that fails the required rules is never shown as better than "Weak".
  if (score > 1 && (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))) score = 1;
  const level = score as StrengthLevel;
  return { level, label: LABELS[level] };
}
