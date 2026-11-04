import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { NavigationLinksService } from '../../shared/service/navigation-links/navigation-links.service';
import { SessionExpiredService } from './session-expired.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private sessionExpiredTriggered = false;

  constructor(
    private router: Router,
    private sessionExpiredService: SessionExpiredService,
    // private navigationLink: NavigationLinksService
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // console.log("intercepted")
     const locationIqUrl = 'https://us1.locationiq.com/';

        // If the request is going to LocationIQ, don't attach auth≈
        if (request.url.startsWith(locationIqUrl) ) {
          return next.handle(request);
        }

    const host = window.location.hostname;
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
    let tenantId = 'optimax';

    if (!isLocalhost) {
      const parts = host.split('.');
      tenantId = parts[0] || 'optimax';
    } else {
      // Desktop app: use the workspace ID entered at login if available
      const stored = sessionStorage.getItem('workspaceId') || localStorage.getItem('workspaceId');
      if (stored) tenantId = stored;
    }

    const defaultTenantEndpoints = ['admin/login'];

    const isDefaultTenantEndpoint = defaultTenantEndpoints.some(path =>
      request.url.endsWith(path)
    );

    const accessToken =
      sessionStorage.getItem('Token') ||
      sessionStorage.getItem('token') ||
      sessionStorage.getItem('accessToken') ||
      localStorage.getItem('Token2') ||
      localStorage.getItem('token') ||
      '';

    const headers: Record<string, string> = {
      'X-Tenant-ID': isDefaultTenantEndpoint ? 'optimax' : tenantId,
    };

    if (accessToken && !request.headers.has('Authorization')) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    let updatedRequest = request.clone({
      withCredentials: true,
      setHeaders: headers,
    });

    return next.handle(updatedRequest).pipe(
      catchError((error) => {
        if (error.status === 401 && !this.sessionExpiredTriggered && this.isTokenExpired(accessToken)) {
          this.sessionExpiredTriggered = true;
          this.sessionExpiredService.trigger();
        }
        return throwError(() => error);
      }),
    );
  }

  private isTokenExpired(token: string): boolean {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() / 1000 > (payload.exp || 0);
    } catch {
      return false;
    }
  }
}
