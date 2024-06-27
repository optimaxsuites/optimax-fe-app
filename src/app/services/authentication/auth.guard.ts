// import { Injectable } from '@angular/core';
// import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
// import { Observable } from 'rxjs';
// import { AuthenticationService } from './authentication.service';

// @Injectable({
//   providedIn: 'root'
// })
// export class AuthGuard implements CanActivate {

//   constructor(private authService: AuthenticationService, private router: Router) {}

//   // canActivate(
//   //   next: ActivatedRouteSnapshot,
//   //   state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
//   //   if (this.authService.isAuthenticated()) {
//   //     return true;
//   //   } else {
//   //     this.router.navigate([''], { queryParams: { returnUrl: state.url }});
//   //     return false;
//   //   }
//   // }
// }