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

    // Try multiple token keys (case-sensitive)
    let accessToken = sessionStorage.getItem('Token');
    if (!accessToken) {
      accessToken = sessionStorage.getItem('token');
    }
    if (!accessToken) {
      accessToken = sessionStorage.getItem('accessToken');
    }

    // Log token status for cooperative endpoints (for debugging)
    if (request.url.includes('cooperativeLoans') || request.url.includes('cooperative')) {
      console.log(`[AuthInterceptor] Request to: ${request.url}`);
      console.log(`[AuthInterceptor] Token found: ${!!accessToken}`);
      if (accessToken) {
        console.log(`[AuthInterceptor] Token preview: ${accessToken.substring(0, 50)}...`);
      }
    }

    // Get tenant ID from hostname
    const host = window.location.hostname;
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
    let tenantId = 'optimax';

    if (!isLocalhost) {
      const parts = host.split('.');
      tenantId = parts[0] || 'optimax';
    }

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
}