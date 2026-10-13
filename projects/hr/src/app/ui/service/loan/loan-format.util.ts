/**
 * Shared display helpers for loan screens. Components keep their own `formatCurrency` /
 * `getStatusLabel` / `getStatusClass` methods (templates call them), but those methods delegate here
 * so labels and formats can't drift apart between screens.
 */

const NAIRA_FORMATTERS = {
  fixed: new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  omitZeroKobo: new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0, maximumFractionDigits: 2 })
};

/**
 * Naira amount, e.g. ₦1,500.00. With `omitZeroKobo`, whole amounts drop the decimals (₦1,500) while
 * amounts with kobo keep them (₦3,333.33). Missing or invalid amounts render as zero.
 */
export function formatNaira(amount: number | null | undefined, options: { omitZeroKobo?: boolean } = {}): string {
  const value = Number(amount);
  const safeValue = Number.isFinite(value) ? value : 0;
  return (options.omitZeroKobo ? NAIRA_FORMATTERS.omitZeroKobo : NAIRA_FORMATTERS.fixed).format(safeValue);
}

const LOAN_STATUS_LABEL_OVERRIDES: Record<string, string> = {
  READY_FOR_DISBURSEMENT: 'Disbursable'
};

/** Human label for a loan status: "READY_FOR_DISBURSEMENT" → "Disbursable", "PAUSED" → "Paused". */
export function getLoanStatusLabel(status: string | null | undefined): string {
  const normalized = String(status || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (!normalized) {
    return '';
  }
  return LOAN_STATUS_LABEL_OVERRIDES[normalized]
    ?? normalized.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * CSS class for a status badge: `${prefix}${status in lowercase, words joined by separator}`.
 * Screens differ in prefix/separator because their stylesheets do ("status-ready_for_disbursement",
 * "ready_for_disbursement", "status-ready-for-disbursement"); an empty status gets `${prefix}default`.
 */
export function getLoanStatusClass(status: string | null | undefined, prefix = 'status-', separator = '_'): string {
  const normalized = String(status || '').trim().toLowerCase().replace(/[\s_-]+/g, separator);
  return `${prefix}${normalized || 'default'}`;
}
