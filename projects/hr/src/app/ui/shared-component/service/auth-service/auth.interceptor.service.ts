import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { NavigationLinksService } from '../navigation-links/navigation-links.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  locationIqUrl = 'https://us1.locationiq.com';
  
  constructor(private router: Router, private navigationLink: NavigationLinksService) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Skip automation and n8n endpoints
    if (
      request.url.startsWith('https://automation.optimaxsuites.com') ||
      request.url.startsWith('https://n8n.royalvilletechnologies.com')
    ) {
      return next.handle(request);
    }
    
    // Skip LocationIQ requests
    if (request.url.startsWith(this.locationIqUrl)) {
      return next.handle(request);
    }

    const accessToken = this.getStoredAccessToken();

    // Log token status for cooperative endpoints (for debugging)
    if (request.url.includes('cooperativeLoans') || request.url.includes('cooperative')) {
      console.log(`[AuthInterceptor] Request to: ${request.url}`);
      console.log(`[AuthInterceptor] Token found: ${!!accessToken}`);
      if (accessToken) {
        console.log(`[AuthInterceptor] Token preview: ${accessToken.substring(0, 50)}...`);
      }
    }

    const tenantId = this.resolveTenantId();

    const defaultTenantEndpoints = ['admin/login'];
    const isDefaultTenantEndpoint = defaultTenantEndpoints.some(path =>
      request.url.endsWith(path)
    );

    // Start with base headers
    let updatedRequest = request.clone({
      setHeaders: {
        'X-Tenant-ID': isDefaultTenantEndpoint ? 'optimax' : tenantId,
      },
    });

    // Add Authorization header if token exists
    if (accessToken) {
      updatedRequest = updatedRequest.clone({
        setHeaders: {
          ...updatedRequest.headers.keys().reduce((acc, key) => {
            acc[key] = updatedRequest.headers.get(key)!;
            return acc;
          }, {} as Record<string, string>),
          'Authorization': `Bearer ${accessToken}`,
        },
      });
    }

    // Handle 401 errors gracefully
    return next.handle(updatedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !request.url.includes('login')) {
          console.warn('Authentication failed for endpoint:', request.url);
          // Don't redirect - let the component handle it with fallback data
          // Just log and pass through
        }
        return throwError(() => error);
      })
    );
  }

  private getStoredAccessToken(): string {
    const keys = ['Token', 'token', 'accessToken', 'Token2', 'accessToken2'];
    for (const key of keys) {
      const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
      const normalized = this.normalizeToken(raw);
      if (normalized) {
        return normalized;
      }
    }
    return '';
  }

  private normalizeToken(rawToken: string | null): string {
    const token = String(rawToken || '').trim();
    if (!token || token === 'undefined' || token === 'null') {
      return '';
    }

    const bearerMatch = token.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch?.[1]) {
      return bearerMatch[1].trim();
    }

    const cookieMatch = token.match(/=(.*?)(;|$)/);
    if (cookieMatch?.[1]) {
      return cookieMatch[1].trim();
    }

    return token;
  }

  private resolveTenantId(): string {
    const fallbackTenant = 'optimax';
    const storedTenant = sessionStorage.getItem('tenantId')
      || sessionStorage.getItem('tenant')
      || localStorage.getItem('tenantId')
      || localStorage.getItem('tenant');
    const normalizedStoredTenant = String(storedTenant || '').trim();
    if (
      normalizedStoredTenant
      && normalizedStoredTenant !== 'undefined'
      && normalizedStoredTenant !== 'null'
      && /^[a-z0-9-]{2,40}$/i.test(normalizedStoredTenant)
      && !['be', 'www', 'app', 'erp'].includes(normalizedStoredTenant.toLowerCase())
    ) {
      return normalizedStoredTenant;
    }

    const host = window.location.hostname;
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
    if (isLocalhost) {
      return fallbackTenant;
    }

    if (host === 'be.optimaxsuites.com' || host.endsWith('.optimaxsuites.com')) {
      return fallbackTenant;
    }

    const firstSegment = String(host.split('.')[0] || '').trim();
    if (
      firstSegment
      && /^[a-z0-9-]{2,40}$/i.test(firstSegment)
      && !['be', 'www', 'app', 'erp'].includes(firstSegment.toLowerCase())
    ) {
      return firstSegment;
    }

    return fallbackTenant;
  }
}