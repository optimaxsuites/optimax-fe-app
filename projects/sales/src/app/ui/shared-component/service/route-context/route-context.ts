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
    // 1. Collections & new paths: prefix + basePath + :uuid
    if (
      basePath === '/sales-hub' ||
      basePath === '/sales/quotes' ||
      basePath === '/sales/quotes/new' ||
      basePath === '/sales/invoices' ||
      basePath === '/sales/invoices/new'
    ) {
      return [context.prefix + basePath, context.uuid];
    }
    
    // 2. Edit path: prefix + basePath + :id + 'edit' + :uuid
    if (extra === 'edit' && uuidOrId) {
      return [context.prefix + basePath, uuidOrId, 'edit', context.uuid];
    }
    
    // 3. Detail path: prefix + basePath + :id + :uuid
    if (uuidOrId) {
      return [context.prefix + basePath, uuidOrId, context.uuid];
    }
    
    return [context.prefix + basePath];
  }

  // Localhost standalone
  if (extra === 'edit' && uuidOrId) {
    return [basePath, uuidOrId, 'edit'];
  }
  if (uuidOrId) {
    return [basePath, uuidOrId];
  }
  return [basePath];
}
