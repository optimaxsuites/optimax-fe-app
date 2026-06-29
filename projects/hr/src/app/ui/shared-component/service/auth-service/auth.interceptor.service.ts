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
  
  // List of endpoints that should always have authentication
  private readonly protectedEndpoints = [
    '/accounting/events',
    '/hr/advanceLoans',
    '/cooperativeLoans'
  ];
  
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
    const tenantId = this.resolveTenantId();
    
    // Check if this is a protected endpoint that requires authentication
    const isProtectedEndpoint = this.protectedEndpoints.some(endpoint => 
      request.url.includes(endpoint)
    );
    
    // Log debugging info for protected endpoints
    if (isProtectedEndpoint) {
      console.log(`[AuthInterceptor] Protected endpoint detected: ${request.url}`);
      console.log(`[AuthInterceptor] Token found: ${!!accessToken}`);
      console.log(`[AuthInterceptor] Tenant ID: ${tenantId}`);
      if (accessToken) {
        console.log(`[AuthInterceptor] Token preview: ${accessToken.substring(0, 30)}...`);
      } else {
        console.warn(`[AuthInterceptor] No token found for protected endpoint: ${request.url}`);
        this.logAvailableTokens();
      }
    }

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

    // Log final headers for debugging (only in development)
    if (isProtectedEndpoint && accessToken) {
      console.log(`[AuthInterceptor] Request headers:`, {
        'Authorization': 'Bearer [REDACTED]',
        'X-Tenant-ID': headers['X-Tenant-ID']
      });
    }

    // Handle errors
    return next.handle(updatedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          console.error(`[AuthInterceptor] Authentication failed for endpoint: ${request.url}`);
          console.error(`[AuthInterceptor] Error details:`, error.error);
          
          // Special handling for accounting endpoints
          if (isProtectedEndpoint && request.url.includes('/accounting/events')) {
            console.error('[AuthInterceptor] Accounting endpoint authentication failed!');
            console.error('[AuthInterceptor] Possible causes:');
            console.error('  1. Invalid or expired token');
            console.error('  2. Missing X-Tenant-ID header');
            console.error('  3. Backend service requires different authentication method');
            
            // Check if token is expired
            if (accessToken) {
              const tokenExpired = this.isTokenExpired(accessToken);
              if (tokenExpired) {
                console.error('[AuthInterceptor] Token appears to be expired');
              }
            }
          }
          
          // Don't auto-redirect for API endpoints - let the component handle it
          if (!request.url.includes('/login') && !request.url.includes('/auth')) {
            // Just log and pass through
            console.warn('[AuthInterceptor] 401 error will be handled by component');
          }
        } else if (error.status === 403) {
          console.error(`[AuthInterceptor] Forbidden access to: ${request.url}`);
        } else if (error.status === 0) {
          console.error(`[AuthInterceptor] Network error or CORS issue: ${request.url}`);
        }
        
        return throwError(() => error);
      })
    );
  }

  private getStoredAccessToken(): string {
    // Try multiple token keys in order of priority
    const tokenKeys = ['Token', 'token', 'accessToken', 'Token2', 'accessToken2'];
    
    for (const key of tokenKeys) {
      // Try sessionStorage first, then localStorage
      const rawToken = sessionStorage.getItem(key) || localStorage.getItem(key);
      const normalized = this.normalizeToken(rawToken);
      if (normalized) {
        if (key === 'Token' || key === 'token') {
          console.log(`[AuthInterceptor] Token found using key: ${key}`);
        }
        return normalized;
      }
    }
    
    // If still no token, try to extract from userRegData
    const userRegData = this.getUserRegData();
    if (userRegData?.token) {
      const normalized = this.normalizeToken(userRegData.token);
      if (normalized) {
        console.log('[AuthInterceptor] Token extracted from userRegData');
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
    } catch (error) {
      console.error('[AuthInterceptor] Failed to parse userRegData:', error);
    }
    return null;
  }

  private isTokenExpired(token: string): boolean {
    try {
      // Try to decode JWT token to check expiration
      const payload = token.split('.')[1];
      if (payload) {
        const decoded = JSON.parse(atob(payload));
        if (decoded.exp) {
          const expirationTime = decoded.exp * 1000; // Convert to milliseconds
          return Date.now() >= expirationTime;
        }
      }
    } catch (error) {
      // Not a JWT token or can't decode
      console.debug('[AuthInterceptor] Could not decode token to check expiration');
    }
    return false;
  }

  private logAvailableTokens(): void {
    const tokenKeys = ['Token', 'token', 'accessToken', 'Token2', 'accessToken2'];
    const availableTokens: string[] = [];
    
    for (const key of tokenKeys) {
      const token = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (token && token !== 'undefined' && token !== 'null') {
        availableTokens.push(key);
      }
    }
    
    if (availableTokens.length > 0) {
      console.log('[AuthInterceptor] Available token keys:', availableTokens);
    } else {
      console.warn('[AuthInterceptor] No tokens found in storage');
      
      // Check if user is logged in
      const isLoggedIn = sessionStorage.getItem('isLoggedIn') || localStorage.getItem('isLoggedIn');
      const username = sessionStorage.getItem('username') || localStorage.getItem('username');
      
      if (isLoggedIn === 'true' && username) {
        console.warn('[AuthInterceptor] User appears to be logged in but no token found');
        console.warn('[AuthInterceptor] This may cause authentication errors');
      }
    }
  }
}