import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';



@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = sessionStorage.getItem('token'); 
    if (!token) {
      return next.handle(request);
    }

    const _request = request.clone({
     headers: request.headers
     .set('Authorization', `Bearer ${token}`)
    }
    );

    return next.handle(_request);
  }

}


