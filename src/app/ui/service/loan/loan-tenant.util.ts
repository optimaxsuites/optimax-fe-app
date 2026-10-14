/** Tenant used when none can be determined (local development, the shared optimaxsuites host). */
export const DEFAULT_LOAN_TENANT_ID = 'optimax';

const RESERVED_SUBDOMAINS = ['be', 'www', 'app', 'erp'];
const TENANT_PATTERN = /^[a-z0-9-]{2,40}$/i;

function isUsableTenant(value: string): boolean {
  return !!value
    && value !== 'undefined'
    && value !== 'null'
    && TENANT_PATTERN.test(value)
    && !RESERVED_SUBDOMAINS.includes(value.toLowerCase());
}

/**
 * The current tenant for the X-Tenant-ID header sent by the loan services: the tenant stored at
 * login, else the subdomain the app is served from, else DEFAULT_LOAN_TENANT_ID.
 *
 * Mirrors AuthInterceptor's resolution (which also sets this header on every request) so the loan
 * code never hardcodes a tenant. Kept inside the loan module so shared code is untouched.
 */
export function resolveTenantId(): string {
  const storedTenant = String(
    sessionStorage.getItem('tenantId')
      || sessionStorage.getItem('tenant')
      || localStorage.getItem('tenantId')
      || localStorage.getItem('tenant')
      || ''
  ).trim();
  if (isUsableTenant(storedTenant)) {
    return storedTenant;
  }

  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  if (!host || host.includes('localhost') || host.includes('127.0.0.1')) {
    return DEFAULT_LOAN_TENANT_ID;
  }
  if (host === 'be.optimaxsuites.com' || host.endsWith('.optimaxsuites.com')) {
    return DEFAULT_LOAN_TENANT_ID;
  }

  const firstSegment = String(host.split('.')[0] || '').trim();
  return isUsableTenant(firstSegment) ? firstSegment : DEFAULT_LOAN_TENANT_ID;
}
