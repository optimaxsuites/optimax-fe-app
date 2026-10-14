/**
 * The backend uses two different spellings for "interest", on two different fields. They are kept
 * as the backend expects them; don't "fix" one to match the other without a matching backend change.
 *
 * - Payment records (`paymentType` on advance/cooperative payment records): INTEREST_REPAYMENT
 * - Grace-period requests (`paymentSubtype` on advance/cooperative grace requests): INTEREST_PAYMENT
 *
 * Display code should use getPaymentTypeLabel/getPaymentTypeTone, which accept either spelling.
 */
export type PaymentRecordType = 'PRINCIPAL_REPAYMENT' | 'INTEREST_REPAYMENT' | 'LATE_FEE';
export type GraceRequestPaymentSubtype = 'PRINCIPAL_REPAYMENT' | 'INTEREST_PAYMENT' | 'LATE_FEE';
export type CooperativeGraceRequestPaymentSubtype = 'CONTRIBUTION' | GraceRequestPaymentSubtype;

type PaymentTone = 'principal' | 'interest' | 'late-fee' | 'contribution' | '';

function toTone(type: string | null | undefined): PaymentTone {
  switch (String(type || '').trim().toUpperCase()) {
    case 'PRINCIPAL_REPAYMENT': return 'principal';
    case 'INTEREST_REPAYMENT':
    case 'INTEREST_PAYMENT': return 'interest';
    case 'LATE_FEE': return 'late-fee';
    case 'CONTRIBUTION': return 'contribution';
    default: return '';
  }
}

const TONE_LABELS: Record<Exclude<PaymentTone, ''>, string> = {
  principal: 'Principal Payment',
  interest: 'Interest Payment',
  'late-fee': 'Late Fee',
  contribution: 'Contribution'
};

/** Label for a payment type or grace-request subtype, whichever interest spelling it uses. */
export function getPaymentTypeLabel(type: string | null | undefined): string {
  const tone = toTone(type);
  return tone ? TONE_LABELS[tone] : String(type || '');
}

/** CSS modifier for a payment type badge: principal, interest, late-fee or contribution. */
export function getPaymentTypeTone(type: string | null | undefined): string {
  return toTone(type);
}
