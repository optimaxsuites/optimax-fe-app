import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { MenuItem } from '../sharedComponents/domain/menuItem.dto';
import { MenuItemsService } from '../sharedComponents/service/menue-items/menu-items.service';

@Component({
  selector: 'app-settings-page',
  templateUrl: './settings-page.component.html',
  styleUrls: ['./settings-page.component.scss']
})
export class SettingsPageComponent {
  menuItems: MenuItem[] = [];
  role: string = "";

  constructor(private menuService: MenuItemsService, private router: Router) {}

  ngOnInit(): void {
    this.role = JSON.stringify(sessionStorage.getItem('role'));

    if (this.role) {
      this.menuItems = this.menuService.getUnlockedSettingsModules().map(item => ({
        ...item,
        open: false
      }));
    }

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.updateActiveState();
      }
    });
  }

  isRouteActive(route: any): boolean {
    if (!route) return false;
    const routelink = (route as string).split('/');
    return this.router.url.includes(routelink[0]);
  }

  updateActiveState(): void {
    this.menuItems.forEach(item => {
      if (item.submenu) {
        item.open = item.submenu.some(sub => sub.route ? this.isRouteActive(sub.route) : false);
      }
    });
  }

  toggleSubMenu(item: MenuItem): void {
    if (item.submenu) {
      item.open = !item.open;
    }
  }

  // True when the URL is at a settings child route (general-settings, HR-settings, etc.)
  // Relative routes in settingsMenuItems look like 'general-settings/<uuid>' — extract
  // the first segment and test it against the current URL.
  get isAnyChildActive(): boolean {
    return this.menuItems.some(item => {
      const route = item.route as string;
      if (!route || route.startsWith('/')) return false;
      const seg = route.split('/').find(s => s.length > 0);
      return seg ? this.router.url.includes('/' + seg) : false;
    });
  }
}
