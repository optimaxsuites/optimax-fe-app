import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(private router: Router) {}
    intercept(
        request: HttpRequest<any>,
        next: HttpHandler
    ): Observable<HttpEvent<any>> {
        const accessToken = sessionStorage.getItem("accessToken");
        console.log('access token---', accessToken)
        if (!accessToken) {
            // this.router.navigate(['']);
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
