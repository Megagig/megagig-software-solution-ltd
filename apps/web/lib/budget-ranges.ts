// Budget bands for the /start-project intake form. `key` is the canonical
// value actually submitted/stored on Lead.budget_range — stable regardless
// of which currency the client had the toggle on. `ngn`/`usd` are display
// labels only.
//
// USD_PER_NGN is an approximate, illustrative conversion rate (~₦1,600 to
// $1) for display purposes only — not a live rate. Adjust this constant
// when a real rate is available; it does not affect what gets stored.
const USD_PER_NGN = 1 / 1600;

function usd(ngnAmount: number): string {
  const value = ngnAmount * USD_PER_NGN;
  return `$${Math.round(value).toLocaleString()}`;
}

export interface BudgetRange {
  key: string;
  ngn: string;
  usd: string;
}

export const BUDGET_RANGES: BudgetRange[] = [
  { key: "under-500k", ngn: "Under ₦500,000", usd: `Under ${usd(500_000)}` },
  { key: "500k-2m", ngn: "₦500,000 – ₦2,000,000", usd: `${usd(500_000)} – ${usd(2_000_000)}` },
  { key: "2m-10m", ngn: "₦2,000,000 – ₦10,000,000", usd: `${usd(2_000_000)} – ${usd(10_000_000)}` },
  { key: "10m-plus", ngn: "₦10,000,000+", usd: `${usd(10_000_000)}+` },
  { key: "not-sure", ngn: "Not sure yet", usd: "Not sure yet" },
];
