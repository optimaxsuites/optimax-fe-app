import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { NavigationLinksService } from '../navigation-links/navigation-links.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(private router: Router, private navigationLink: NavigationLinksService) {}

    intercept(
        request: HttpRequest<any>,
        next: HttpHandler
    ): Observable<HttpEvent<any>> {
        // Determine tenant ID from URL path or hostname
        const url = window.location.pathname;
        const host = window.location.hostname;
        const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
        
        // Extract UUID from path (look for the last part if it looks like a UUID or 'default')
        const pathParts = url.split('/').filter(p => !!p);
        let tenantIdFromUrl = '';
        
        if (pathParts.length > 0) {
            const lastPart = pathParts[pathParts.length - 1];
            // Check if it's a UUID (length > 20) or 'default' or matches certain patterns
            if (lastPart === 'default' || lastPart.length > 20 || /^[a-f0-9-]{32,}$/.test(lastPart)) {
                tenantIdFromUrl = lastPart;
            }
        }

        // Filter out 'default' - it's a placeholder, not a real tenant ID
        const validPathTenant = (tenantIdFromUrl && tenantIdFromUrl !== 'default') ? tenantIdFromUrl.toLowerCase() : '';
        
        // Default to 'optimax' as per POS implementation
        let tenantId = 'optimax';
        
        if (validPathTenant) {
            tenantId = validPathTenant;
        } else if (!isLocalhost) {
            // Only try to parse hostname if NOT on localhost
            const parts = host.split('.');
            tenantId = (parts[0] || 'optimax').toLowerCase();
        }
        
        // Note: We deliberately skip localStorage.getItem('tenantId') here if it contains 
        // numeric IDs like '1306' that we don't want as the default header value on localhost.

        const defaultTenantEndpoints = ['/auth/signin', '/auth/signup', '/auth/register', '/auth/forgot-password'];
        const isDefaultTenantEndpoint = defaultTenantEndpoints.some((url) =>
            request.url.includes(url)
        );

        // Always add X-Tenant-ID header (including for login requests)
        let updatedRequest = request.clone({
            withCredentials: true,
            setHeaders: {
                'X-Tenant-ID': isDefaultTenantEndpoint ? 'optimax' : tenantId,
            },
        });

        return next.handle(updatedRequest);
    }
}
