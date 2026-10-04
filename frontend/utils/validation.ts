// Client-side checks that mirror the backend DTO rules (backend/src/auth/dto),
// so users get instant feedback. The server remains the source of truth.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Sri Lankan numbers: 0XXXXXXXXX, 94XXXXXXXXX or +94XXXXXXXXX (9 digits after the prefix).
const LK_PHONE_PATTERN = /^(?:\+94|94|0)[1-9]\d{8}$/;

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'Email is required';
  if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid email address';
  return undefined;
}

export function validatePhone(phone: string): string | undefined {
  const compact = phone.replace(/[\s-]/g, '');
  if (!compact) return 'Phone number is required';
  if (!LK_PHONE_PATTERN.test(compact)) return 'Enter a valid Sri Lankan phone number (e.g. 0771234567)';
  return undefined;
}

export function validateName(name: string): string | undefined {
  if (!name.trim()) return 'Full name is required';
  if (name.trim().length > 100) return 'Name must be at most 100 characters';
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 72) return 'Password must be at most 72 characters';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must contain at least one letter and one number';
  }
  return undefined;
}

export function validateRequired(value: string, label: string): string | undefined {
  return value.trim() ? undefined : `${label} is required`;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s-]/g, '');
}
