// import { Injectable } from '@angular/core';
// import {
//   HttpInterceptor,
//   HttpRequest,
//   HttpHandler,
//   HttpEvent,
// } from '@angular/common/http';
// import { Observable } from 'rxjs';
// import { AuthenticationService } from './authentication.service';

// @Injectable()
// export class AuthInterceptor implements HttpInterceptor {
//   constructor(private authService: AuthenticationService) {}

//   intercept(
//     req: HttpRequest<any>,
//     next: HttpHandler
//   ): Observable<HttpEvent<any>> {
//     // Get the authentication token from the service
//     const authToken = this.authService.getToken();

//     // Clone the request and attach the token if it exists
//     if (authToken) {
//       const authReq = req.clone({
//         setHeaders: {
//           Authorization: `Bearer ${authToken}`,
//         },
//       });
//       return next.handle(authReq);
//     }

//     // If no token, just proceed with the original request
//     return next.handle(req);
//   }
// }
