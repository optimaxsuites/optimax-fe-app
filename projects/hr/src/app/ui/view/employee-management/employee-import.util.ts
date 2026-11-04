/** Lowercase letters and digits only, so "Full-Time", "full time" and "FULL_TIME" compare equal. */
export function normalizeName(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * The id of the metadata item (`{ id, name }`) whose name matches `name`: an exact match first, then one
 * that starts with the other (e.g. "Christian" / "Christianity"). Undefined when nothing matches.
 */
export function findIdByName(items: any[], name: string | undefined): number | undefined {
  const wanted = normalizeName(name);
  if (!wanted) return undefined;
  const exact = items.find((item) => normalizeName(item?.name) === wanted);
  if (exact) return exact.id;
  if (wanted.length < 4) return undefined;
  return items.find((item) => {
    const candidate = normalizeName(item?.name);
    return candidate.length >= 4 && (candidate.startsWith(wanted) || wanted.startsWith(candidate));
  })?.id;
}

/** A date typed or scanned from a form: ISO (2024-05-31) or day-first (31/05/2024), as Nigerian forms write it. */
export function parseImportedDate(value: string | undefined): Date | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
  const dayFirst = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(text);
  const date = iso
    ? new Date(+iso[1], +iso[2] - 1, +iso[3])
    : dayFirst
      ? new Date(+dayFirst[3], +dayFirst[2] - 1, +dayFirst[1])
      : new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Day 0 of Excel's date serial numbers (30 Dec 1899, which absorbs Excel's phantom 29 Feb 1900). */
const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * A date from a spreadsheet cell, as a local date at midnight. Excel stores date cells as serial
 * numbers (days since 1899-12-30), which `new Date(serial)` would misread as milliseconds in 1970;
 * text cells go through parseImportedDate.
 */
export function parseSpreadsheetDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return null;
    const utc = new Date(EXCEL_EPOCH_UTC + Math.floor(value) * MS_PER_DAY);
    return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
  }
  return parseImportedDate(typeof value === 'string' ? value : undefined);
}
