const FORMULA_TRIGGER = /^[=+\-@\t\r]/;
const PLAIN_NUMBER = /^[-+]?\d+(\.\d+)?$/;

/**
 * Stops spreadsheet apps from executing a cell as a formula (CSV/formula injection): text starting
 * with =, +, -, @, tab or carriage return gets a leading apostrophe. Plain numbers such as "-500"
 * are left alone so amounts still export as numbers.
 */
export function neutralizeSpreadsheetFormula<T>(value: T): T | string {
  if (typeof value !== 'string') {
    return value;
  }
  return FORMULA_TRIGGER.test(value) && !PLAIN_NUMBER.test(value.trim()) ? `'${value}` : value;
}

/** One CSV cell: formula-neutralized, quoted, with embedded quotes doubled. */
export function toCsvCell(value: unknown): string {
  const text = String(neutralizeSpreadsheetFormula(value ?? '') ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}
