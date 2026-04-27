import { Location } from '@angular/common';
import { Injectable } from '@angular/core';
import { NavigationExtras, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class BackNavigationService {
  constructor(
    private readonly location: Location,
    private readonly router: Router
  ) {}

  goBack(fallbackCommands: any[], fallbackExtras?: NavigationExtras): void {
    const navigationId = Number(window.history.state?.navigationId || 0);

    if (navigationId > 1) {
      this.location.back();
      window.setTimeout(() => window.dispatchEvent(new Event('resize')), 0);
      return;
    }

    this.router.navigate(fallbackCommands, fallbackExtras).then((navigated) => {
      if (navigated) {
        window.dispatchEvent(new Event('resize'));
      }
    });
  }
}