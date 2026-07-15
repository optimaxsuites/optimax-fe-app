import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, GuardResult, MaybeAsync, Router, RouterStateSnapshot } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class UuidGuard implements CanActivate {

  private uuidRegex =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

  constructor(private router: Router) {}

  private getUuidFromRoute(route: ActivatedRouteSnapshot): string | null {
    let current: ActivatedRouteSnapshot | null = route;
    while (current) {
      if (current.params['uuid']) return current.params['uuid'];
      current = current.firstChild;
    }

    const fromUrl = route.url
      .map(segment => segment.path)
      .find(segment => this.uuidRegex.test(segment));
    return fromUrl || null;
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const uuid = this.getUuidFromRoute(route);
    if (uuid && this.uuidRegex.test(uuid)) return true;

    // When lazy-loading, firstChild is not yet available — extract UUID from the full destination URL
    const segments = (state.url || '').split(/[/?#]/);
    const fromFullUrl = segments.find(s => this.uuidRegex.test(s));
    if (fromFullUrl) return true;

    this.router.navigate(['/404']);
    return false;
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
