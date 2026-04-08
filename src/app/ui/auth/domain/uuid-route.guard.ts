import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, GuardResult, MaybeAsync, Router, RouterStateSnapshot } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class UuidGuard implements CanActivate {

  private uuidRegex =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

  constructor(private router: Router) {}
 

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const child = route.firstChild;
    // const secondChild = route.lastChild
    const uuid = child?.params['uuid'];
    console.log(uuid)

    if (!uuid || !this.uuidRegex.test(uuid)) {
      this.router.navigate(['/404']);
      return false;
    }

    return true;
  }
}



@Injectable({ providedIn: 'root' })
export class ChildUuidGuard implements CanActivateChild {

private getUuidFromRoute(route: ActivatedRouteSnapshot): string | null {
  let current: ActivatedRouteSnapshot | null = route;
  while (current) {
    if (current.params['uuid']) return current.params['uuid'];
    current = current.firstChild;
  }
  return null;
}

  private uuidRegex =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

  constructor(private router: Router) {}
  canActivateChild(childRoute: ActivatedRouteSnapshot, ): boolean {
      const uuid = this.getUuidFromRoute(childRoute);
  console.log(uuid);

  if (!uuid || !this.uuidRegex.test(uuid)) {
    this.router.navigate(['/404']);
    return false;
  }
  return true;
  }

}

