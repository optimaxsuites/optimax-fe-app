export function parseFlexDate(d: any): Date {
  if (!d) return new Date(NaN);
  if (Array.isArray(d)) {
    // Java LocalDateTime array: [year, month(1-based), day, hour, min, sec, nano]
    return new Date(d[0], (d[1] ?? 1) - 1, d[2] ?? 1, d[3] ?? 0, d[4] ?? 0, d[5] ?? 0);
  }
  return new Date(d);
}

export function formatFlexDate(d: any, opts?: Intl.DateTimeFormatOptions): string {
  if (!d) return '—';
  const date = parseFlexDate(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', opts ?? { day: '2-digit', month: 'short', year: 'numeric' });
}
