export function getRouteContext() {
  const pathname = window.location.pathname;
  const isLive = pathname.startsWith('/admin/sales');
  
  // Extract UUID from pathname (8-4-4-4-12 pattern)
  const uuidMatch = pathname.match(/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/);
  let uuid = uuidMatch ? uuidMatch[1] : '';

  if (!uuid) {
    uuid = localStorage.getItem('tenantId') || '4a48c75c-dc92-43cd-a2bb-943eb1fef8f8';
  }

  return {
    isLive,
    prefix: isLive ? '/admin/sales' : '',
    uuid: uuid
  };
}

export function buildSalesLink(basePath: string, uuidOrId?: string, extra?: string): any[] {
  const context = getRouteContext();
  if (context.isLive) {
    if (basePath === '/sales/quotes/new' || basePath === '/sales/invoices/new' || basePath === '/sales-hub' || basePath === '/sales/invoices') {
      return [context.prefix + basePath, uuidOrId || context.uuid];
    }
    if (extra) {
      return [context.prefix + basePath, uuidOrId, extra];
    }
    if (uuidOrId) {
      return [context.prefix + basePath, uuidOrId];
    }
    return [context.prefix + basePath];
  }

  // Localhost standalone
  if (extra) {
    return [basePath, uuidOrId, extra];
  }
  if (uuidOrId) {
    return [basePath, uuidOrId];
  }
  return [basePath];
}
