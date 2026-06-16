export function getRouteContext() {
  const pathname = window.location.pathname;
  const isLive = pathname.startsWith('/admin/sales');
  
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
  
  // Determine if this is a collection or new route (no ID)
  const isCollectionRoute = 
    basePath === '/sales-hub' ||
    basePath === '/sales/quotes' ||
    basePath === '/sales/quotes/new' ||
    basePath === '/sales/invoices' ||
    basePath === '/sales/invoices/new' ||
    basePath === '/sales/customers' ||
    basePath === '/sales/customers/new' ||
    basePath === '/sales/products' ||
    basePath === '/sales/products/new';
  
  if (context.isLive) {
    // For collection routes: prefix + basePath + UUID
    if (isCollectionRoute) {
      return [context.prefix + basePath, context.uuid];
    }
    
    // For edit routes: prefix + basePath + id + 'edit' + UUID
    if (extra === 'edit' && uuidOrId) {
      return [context.prefix + basePath, uuidOrId, 'edit', context.uuid];
    }
    
    // For detail routes: prefix + basePath + id + UUID
    if (uuidOrId && !isCollectionRoute) {
      return [context.prefix + basePath, uuidOrId, context.uuid];
    }
    
    return [context.prefix + basePath];
  }

  // Local development
  if (extra === 'edit' && uuidOrId) {
    return [basePath, uuidOrId, 'edit'];
  }
  if (uuidOrId && !isCollectionRoute) {
    return [basePath, uuidOrId];
  }
  return [basePath];
}