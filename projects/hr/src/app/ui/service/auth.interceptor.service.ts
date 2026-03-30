import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { NavigationLinksService } from '../shared-component/service/navigation-links/navigation-links.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(private router: Router, private navigationLink: NavigationLinksService) {}
    intercept(
        request: HttpRequest<any>,
        next: HttpHandler
    ): Observable<HttpEvent<any>> {
        const rawAccessToken = sessionStorage.getItem("Token");
        const accessToken = this.extractToken(rawAccessToken);

        // if (!accessToken) {
        //     const loginLink = this.navigationLink.getLink('signinLink')
        //     this.router.navigate([loginLink]);
        //     return next.handle(request);
        // }



        const _request = accessToken
          ? request.clone({
              headers: request.headers.set(
                  "Authorization",
                  `Bearer ${accessToken}`
              ),
          })
          : request;
        // console.log("na request", _request)




        return next.handle(_request);
    }

    private extractToken(accessToken: unknown): string {
        const rawToken = String(accessToken || '').trim();

        if (!rawToken) {
            return '';
        }

        const bearerMatch = rawToken.match(/^Bearer\s+(.+)$/i);
        if (bearerMatch?.[1]) {
            return bearerMatch[1].trim();
        }

        return rawToken;
    }
}
