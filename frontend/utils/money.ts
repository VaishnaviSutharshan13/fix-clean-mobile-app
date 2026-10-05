// Prices are shown in LKR as in the prototype, e.g. "Rs. 2,500".
// Formatted by hand so the output is identical on every JS engine.
export function formatLKR(amount: number): string {
  const rounded = Math.round(amount);
  const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${rounded < 0 ? '-' : ''}Rs. ${digits}`;
}

// Short form for narrow KPI tiles: "Rs. 950", "Rs. 15k", "Rs. 3.2M".
export function formatLKRCompact(amount: number): string {
  const rounded = Math.round(amount);
  if (Math.abs(rounded) < 1000) return formatLKR(rounded);
  const thousands = Math.round(rounded / 1000);
  if (Math.abs(thousands) < 1000) return `Rs. ${thousands}k`;
  return `Rs. ${(rounded / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}
