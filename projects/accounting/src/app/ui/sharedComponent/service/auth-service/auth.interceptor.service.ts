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
        if (
            request.url.startsWith('https://automation.optimaxsuites.com')
        ) {
            return next.handle(request);
        }

        const accessToken = 
            sessionStorage.getItem("Token") || 
            sessionStorage.getItem("accessToken") ||
            sessionStorage.getItem("token") ||
            localStorage.getItem("Token2") ||
            localStorage.getItem("accessToken2") ||
            localStorage.getItem("token");

        // Determine tenant ID from URL path or hostname
        const url = window.location.pathname;
        const host = window.location.hostname;
        const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
        
        // Extract UUID from path (mirroring Hospitality pattern)
        const pathParts = url.split('/').filter(p => !!p);
        let tenantIdFromUrl = '';
        
        if (pathParts.length > 0) {
            const lastPart = pathParts[pathParts.length - 1];
            // Check if it's a UUID (length > 20) or 'default'
            if (lastPart === 'default' || lastPart.length > 20 || /^[a-f0-9-]{32,}$/.test(lastPart)) {
                tenantIdFromUrl = lastPart;
            }
        }

        const validPathTenant = (tenantIdFromUrl && tenantIdFromUrl !== 'default') ? tenantIdFromUrl.toLowerCase() : '';
        
        // Default to 'optimax'
        let tenantId = 'optimax';
        
        if (validPathTenant) {
            tenantId = validPathTenant;
        } else if (!isLocalhost) {
            const parts = host.split('.');
            tenantId = (parts[0] || 'optimax').toLowerCase();
        }

        const defaultTenantEndpoints = ['/auth/signin', '/auth/signup', '/auth/register', '/auth/forgot-password'];
        const isDefaultTenantEndpoint = defaultTenantEndpoints.some((url) =>
            request.url.includes(url)
        );

        // Always add X-Tenant-ID header
        let updatedRequest = request.clone({
            setHeaders: {
                'X-Tenant-ID': isDefaultTenantEndpoint ? 'optimax' : tenantId,
            },
        });

        // Add Bearer token if available
        if (accessToken) {
            updatedRequest = updatedRequest.clone({
                setHeaders: {
                    ...updatedRequest.headers.keys().reduce((acc, key) => {
                        acc[key] = updatedRequest.headers.get(key)!;
                        return acc;
                    }, {} as Record<string, string>),
                    Authorization: `Bearer ${accessToken}`,
                },
            });
        }

        return next.handle(updatedRequest);
    }
}

