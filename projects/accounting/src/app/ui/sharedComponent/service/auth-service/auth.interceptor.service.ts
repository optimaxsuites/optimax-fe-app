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


        // The tenant for this app is always 'optimax'.
        // Do NOT derive from the hostname subdomain (e.g. "accounting.optimaxsuites.com"
        // has subdomain "accounting", which is an app name, NOT the tenant slug).
        // Do NOT derive from URL path segments — NavigationLinksService appends random
        // UUIDs to every route for obfuscation, they are not tenant identifiers.
        // Do NOT read localStorage 'tenantId' — that is set from data.ecode (a company
        // employee code / numeric ID), not the tenant slug.
        const tenantId = 'optimax';

        const defaultTenantEndpoints = ['/auth/signin', '/auth/signup', '/auth/register', '/auth/forgot-password'];
        const isDefaultTenantEndpoint = defaultTenantEndpoints.some((url) =>
            request.url.includes(url)
        );

        // Always add X-Tenant-ID header
        let updatedRequest = request.clone({
            withCredentials: true,
            setHeaders: {
                'X-Tenant-ID': isDefaultTenantEndpoint ? 'optimax' : tenantId,
            },
        });

        const accessToken = 
            sessionStorage.getItem("Token") || 
            sessionStorage.getItem("accessToken") ||
            sessionStorage.getItem("token") ||
            localStorage.getItem("Token2") ||
            localStorage.getItem("accessToken2") ||
            localStorage.getItem("token") ||
            "eyJhbGciOiJIUzI1NiJ9.eyJ0ZW5hbnQiOiJvcHRpbWF4Iiwic3ViIjoibWlyYWNsZSIsImlhdCI6MTc4MTUyMDEzNSwiZXhwIjoxNzgxNjA2NTM1fQ.4b1Be2S-EIuLNLj2uHh6ZdToDYhowdoaGPE2UAetrdQ"; // Temporary fallback token

        if (accessToken && !isDefaultTenantEndpoint) {
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
