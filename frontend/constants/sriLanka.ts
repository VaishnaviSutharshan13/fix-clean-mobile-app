// Sri Lankan districts for "Operating District" (Provider Sign Up).
// Keep in sync with backend/src/providers/sri-lanka-districts.ts.
export const SRI_LANKA_DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha',
  'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala',
  'Mannar', 'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya',
  'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya',
] as const;

// "Experience" options on Provider Sign Up; value = minimum years stored.
export const EXPERIENCE_OPTIONS = [
  { label: 'Less than 1 year', value: 0 },
  { label: '1 – 3 years', value: 1 },
  { label: '3 – 5 years', value: 3 },
  { label: '5 – 10 years', value: 5 },
  { label: '10+ years', value: 10 },
] as const;
