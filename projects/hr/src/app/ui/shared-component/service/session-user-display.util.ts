function normalizeSessionValue(value: unknown): string {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return '';
  }

  const lowered = normalized.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null' || lowered === 'unknown') {
    return '';
  }

  return normalized;
}

export function getSessionUserDisplayName(fallback = 'Admin'): string {
  const fullName = normalizeSessionValue(sessionStorage.getItem('fullname'));
  const altName = normalizeSessionValue(sessionStorage.getItem('name'));
  const username = normalizeSessionValue(sessionStorage.getItem('username'));

  let registrationName = '';
  try {
    const rawUserRegData = sessionStorage.getItem('userRegData');
    if (rawUserRegData) {
      const parsed = JSON.parse(rawUserRegData);
      const payload = Array.isArray(parsed) ? parsed[0] : parsed;
      registrationName = normalizeSessionValue(payload?.fullName || payload?.fullname || payload?.name);
    }
  } catch {
    registrationName = '';
  }

  const resolvedName = fullName || altName || registrationName || username || fallback;
  return resolvedName.replace(/\w\S*/g, (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
}