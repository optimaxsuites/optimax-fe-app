import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { NavigationLinksService } from '../../shared/service/navigation-links/navigation-links.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(private router: Router, private navigationLink: NavigationLinksService) {}
    intercept(
        request: HttpRequest<any>,
        next: HttpHandler
    ): Observable<HttpEvent<any>> {
        const accessToken = sessionStorage.getItem("accessToken");

        if (!accessToken) {
            const loginLink = this.navigationLink.getLink('loginLink')
            this.router.navigate([loginLink]);
            return next.handle(request);
        }



        const _request = request.clone({
            headers: request.headers.set(
                "Authorization",
                `Bearer ${accessToken}`
            ),
        });



        return next.handle(_request);
    }
}
