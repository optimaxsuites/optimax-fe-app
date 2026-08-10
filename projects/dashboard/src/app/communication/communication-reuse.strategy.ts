import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  DetachedRouteHandle,
  RouteReuseStrategy,
} from '@angular/router';

@Injectable()
export class CommunicationReuseStrategy implements RouteReuseStrategy {
  private readonly CACHE_ROUTE = 'communications/:uuid';
  private stored: DetachedRouteHandle | null = null;

  private routeKey(route: ActivatedRouteSnapshot): string {
    return route.routeConfig?.path ?? '';
  }

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return this.routeKey(route) === this.CACHE_ROUTE;
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
    if (this.routeKey(route) === this.CACHE_ROUTE) {
      this.stored = handle;
    }
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    return this.routeKey(route) === this.CACHE_ROUTE && this.stored != null;
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    if (this.routeKey(route) === this.CACHE_ROUTE) {
      return this.stored;
    }
    return null;
  }

  shouldReuseRoute(
    future: ActivatedRouteSnapshot,
    curr: ActivatedRouteSnapshot,
  ): boolean {
    return future.routeConfig === curr.routeConfig;
  }
}
