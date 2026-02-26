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
        const accessToken = 
            sessionStorage.getItem("Token") || 
            sessionStorage.getItem("accessToken") ||
            sessionStorage.getItem("token") ||
            localStorage.getItem("Token2") ||
            localStorage.getItem("accessToken2") ||
            localStorage.getItem("token");

        // Determine tenant ID from hostname
        const host = window.location.hostname;
        const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
        let tenantId = 'optimax';

        if (!isLocalhost) {
            const parts = host.split('.');
            tenantId = parts[0] || 'optimax';
        }

        const defaultTenantEndpoints = ['/auth/register', '/auth/forgot-password'];
        const isDefaultTenantEndpoint = defaultTenantEndpoints.some((url) =>
            request.url.includes(url)
        );

        // Always add X-Tenant-ID header (including for login requests)
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
