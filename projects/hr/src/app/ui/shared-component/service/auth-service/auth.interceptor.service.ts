import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
  HttpResponse,
} from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { NavigationLinksService } from '../navigation-links/navigation-links.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly protectedEndpoints = [
    '/hr/corrections',
    '/hr/attendance',
    '/hr/attendanceRecords',
    '/hr/officeHours',
    '/accounting/events',
    '/hr/advanceLoans',
    '/cooperativeLoans'
  ];
  
  constructor(private router: Router, private navigationLink: NavigationLinksService) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Skip external service endpoints
    if (
      request.url.startsWith('https://automation.optimaxsuites.com') ||
      request.url.startsWith('https://n8n.royalvilletechnologies.com') ||
      request.url.startsWith('https://us1.locationiq.com')
    ) {
      return next.handle(request.clone({ withCredentials: false }));
    }

    const tenantId = this.resolveTenantId();

    // Check if this is a login endpoint (don't require token)
    const isLoginEndpoint = request.url.includes('/login');

    // Check if this is a protected endpoint that requires authentication
    const isProtectedEndpoint = this.protectedEndpoints.some(endpoint =>
      request.url.includes(endpoint)
    );

    const accessToken = isLoginEndpoint ? '' : this.getStoredAccessToken();

    const defaultTenantEndpoints = ['admin/login'];
    const isDefaultTenantEndpoint = defaultTenantEndpoints.some(path =>
      request.url.endsWith(path)
    );

    // Clone request and add headers
    let headers: Record<string, string> = {
      'X-Tenant-ID': isDefaultTenantEndpoint ? 'optimax' : tenantId,
    };

    // Add Authorization header if token exists
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Create new request with headers
    let updatedRequest = request.clone({
      setHeaders: headers
    });

    return next.handle(updatedRequest).pipe(
      catchError((error: HttpErrorResponse): Observable<HttpEvent<any>> => {
        if (error.status === 401) {
          if (request.url.includes('/attendanceRecords') || request.url.includes('/attendance')) {
            return throwError(() => error);
          }
          return of(new HttpResponse({ status: 200, body: { content: [] } }));
        }

        return throwError(() => error);
      })
    );
  }

  private getStoredAccessToken(): string {
    // Try multiple token keys in order of priority
    const tokenKeys = ['Token', 'token', 'accessToken', 'Token2', 'accessToken2'];

    for (const key of tokenKeys) {
      const rawToken = sessionStorage.getItem(key) || localStorage.getItem(key);
      const normalized = this.normalizeToken(rawToken);
      if (normalized) {
        return normalized;
      }
    }

    // If still no token, try to extract from userRegData
    const userRegData = this.getUserRegData();
    if (userRegData?.token) {
      const normalized = this.normalizeToken(userRegData.token);
      if (normalized) {
        return normalized;
      }
    }

    return '';
  }

  private normalizeToken(rawToken: string | null): string {
    if (!rawToken) return '';
    
    const token = String(rawToken).trim();
    if (!token || token === 'undefined' || token === 'null') {
      return '';
    }

    // Remove Bearer prefix if present
    const bearerMatch = token.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch?.[1]) {
      return bearerMatch[1].trim();
    }

    // Remove cookie format if present
    const cookieMatch = token.match(/=(.*?)(;|$)/);
    if (cookieMatch?.[1]) {
      return cookieMatch[1].trim();
    }

    return token;
  }

  private resolveTenantId(): string {
    const fallbackTenant = 'optimax';
    
    // Check stored tenant first
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

    // Try to get from hostname
    const host = window.location.hostname;
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
    if (isLocalhost) {
      return fallbackTenant;
    }

    if (host === 'be.optimaxsuites.com' || host.endsWith('.optimaxsuites.com')) {
      return fallbackTenant;
    }

    // Extract subdomain as potential tenant
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

  private getUserRegData(): any {
    try {
      const rawData = sessionStorage.getItem('userRegData') || localStorage.getItem('userRegData');
      if (rawData && rawData !== 'undefined' && rawData !== 'null') {
        return JSON.parse(rawData);
      }
    } catch {
      return null;
    }
    return null;
  }
}