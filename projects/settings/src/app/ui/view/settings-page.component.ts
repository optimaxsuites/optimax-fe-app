import { Component, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MenuItem } from '../sharedComponents/domain/menuItem.dto';
import { MenuItemsService } from '../sharedComponents/service/menue-items/menu-items.service';

@Component({
  selector: 'app-settings-page',
  templateUrl: './settings-page.component.html',
  styleUrls: ['./settings-page.component.scss']
})
export class SettingsPageComponent implements OnDestroy {
  menuItems: MenuItem[] = [];
  role: string = "";
  searchQuery = '';
  private subs = new Subscription();

  constructor(private menuService: MenuItemsService, private router: Router) {}

  ngOnInit(): void {
    this.role = JSON.stringify(sessionStorage.getItem('role'));

    this.menuItems = this.menuService.getUnlockedSettingsModules().map(item => ({
      ...item,
      open: false
    }));

    this.subs.add(
      this.menuService.settingsMenuItems$.subscribe(() => {
        this.menuItems = this.menuService.getUnlockedSettingsModules().map(item => ({
          ...item,
          open: false
        }));
      })
    );

    this.subs.add(
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.updateActiveState();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
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

  get filteredMenuItems(): MenuItem[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.menuItems;
    return this.menuItems.filter(item => {
      if (item.label?.toLowerCase().includes(q)) return true;
      if (item.description?.toLowerCase().includes(q)) return true;
      if (item.shortDescription?.toLowerCase().includes(q)) return true;
      if (item.submenu?.some(sub => sub.label?.toLowerCase().includes(q))) return true;
      return false;
    });
  }

  get isAnyChildActive(): boolean {
    const matchesUrl = (route: any): boolean => {
      if (!route || (route as string).startsWith('/')) return false;
      const seg = (route as string).split('/').find(s => s.length > 0);
      return seg ? this.router.url.includes('/' + seg) : false;
    };

    return this.menuItems.some(item => {
      if (matchesUrl(item.route)) return true;
      if (item.submenu) return item.submenu.some(sub => matchesUrl(sub.route));
      return false;
    });
  }
}
