import { Injectable } from '@angular/core';
import {UserLoginComponent} from '../../login/login.component';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';


@Injectable({
  providedIn: 'root'
})
export class AuthGuardService {

  constructor(private router: Router,
    private loginService: UserLoginComponent) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
      if (this.loginService.loggedIn){
        return true;
    }
  else{
      this.router.navigate(['login']);
      return false;
  }
    }
}
