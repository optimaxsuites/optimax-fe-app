export function formatLoanPurposeDisplay(purpose?: string | null): string {
  return toTitleCase((purpose || '').replace(/_/g, ' ')) || 'N/A';
}

export function formatLoanPaymentModeDisplay(mode?: string | null): string {
  switch (String(mode || '').toUpperCase()) {
    case 'MONTHLY':
      return 'Monthly';
    case 'ONE_OFF':
      return 'One Off';
    default:
      return toTitleCase((mode || '').replace(/_/g, ' ')) || 'Not specified';
  }
}

const naturalSortCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base'
});

export function compareLoanSortValues(left: string | number | null | undefined, right: string | number | null | undefined): number {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  const normalizedLeft = normalizeSortValue(left);
  const normalizedRight = normalizeSortValue(right);
  const numericLeft = parseSortableNumber(normalizedLeft);
  const numericRight = parseSortableNumber(normalizedRight);

  if (numericLeft !== null && numericRight !== null) {
    return numericLeft - numericRight;
  }

  return naturalSortCollator.compare(normalizedLeft, normalizedRight);
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function normalizeSortValue(value: string | number | null | undefined): string {
  return String(value ?? '').trim();
}

function parseSortableNumber(value: string): number | null {
  if (!value) {
    return null;
  }

  const normalizedValue = value.replace(/,/g, '');

  if (!/^-?\d+(\.\d+)?$/.test(normalizedValue)) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}