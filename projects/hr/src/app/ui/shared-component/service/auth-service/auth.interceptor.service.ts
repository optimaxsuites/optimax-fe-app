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
            request.url.startsWith('https://automation.optimaxsuites.com') ||
            request.url.startsWith('https://n8n.royalvilletechnologies.com')
        ) {
            return next.handle(request);
        }
        const accessToken =
            sessionStorage.getItem('Token') ||
            sessionStorage.getItem('token') ||
            localStorage.getItem('Token') ||
            localStorage.getItem('token');

        if (!accessToken) {
            return next.handle(request);
        }

        const authorizedRequest = request.clone({
            headers: request.headers.set('Authorization', `Bearer ${accessToken}`),
        });

        return next.handle(authorizedRequest);
    }
}
