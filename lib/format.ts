// Indian number formatting — ₹1,00,000 digit grouping.

export function inr(n: number): string {
  const rounded = Math.round(n);
  const s = Math.abs(rounded).toString();
  let out: string;
  if (s.length <= 3) {
    out = s;
  } else {
    const last3 = s.slice(-3);
    const rest = s.slice(0, -3);
    out = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
  }
  return (rounded < 0 ? "-₹" : "₹") + out;
}

// Same grouping but for a raw number with no rupee symbol (used in charts/tables).
export function inrPlain(n: number): string {
  return inr(n).replace("₹", "");
}
