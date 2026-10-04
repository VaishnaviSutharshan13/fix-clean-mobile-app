// Prices are shown in LKR as in the prototype, e.g. "Rs. 2,500".
// Formatted by hand so the output is identical on every JS engine.
export function formatLKR(amount: number): string {
  const rounded = Math.round(amount);
  const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${rounded < 0 ? '-' : ''}Rs. ${digits}`;
}
