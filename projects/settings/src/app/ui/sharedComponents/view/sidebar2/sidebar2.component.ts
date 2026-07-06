import { Component, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { MenuItem } from '../../domain/menuItem.dto';
import { MenuItemsService } from '../../service/menue-items/menu-items.service';

// UUID v4 segment pattern — strip from URLs before comparing
const UUID_RE = /\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

@Component({
  selector: 'app-sidebar2',
  templateUrl: './sidebar2.component.html',
  styleUrl: './sidebar2.component.scss'
})
export class Sidebar2Component implements OnDestroy {
  menuItems: MenuItem[] = [];
  role: string | null = null;
  currentPath = '';

  private sub = new Subscription();

  constructor(private menuService: MenuItemsService, private router: Router) {}

  ngOnInit(): void {
    this.role = sessionStorage.getItem('role');
    if (this.role) {
      this.menuItems = this.menuService.getMenuItemsForRole(this.role).map(item => ({
        ...item,
        open: false
      }));
    }
    this.currentPath = this.stripUuid(this.router.url.split('?')[0]);
    this.sub.add(
      this.router.events
        .pipe(filter(e => e instanceof NavigationEnd))
        .subscribe((e: any) => {
          this.currentPath = this.stripUuid((e.urlAfterRedirects || e.url).split('?')[0]);
          this.updateActiveState();
        })
    );
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  private stripUuid(url: string): string {
    return url.replace(UUID_RE, '');
  }

  isSubItemActive(route: string | undefined): boolean {
    if (!route) return false;
    const routePath = this.stripUuid(route);
    return !!routePath && this.currentPath.startsWith(routePath);
  }

  updateActiveState(): void {
    this.menuItems.forEach(item => {
      if (item.submenu) {
        item.open = item.submenu.some(sub => this.isSubItemActive(sub.route));
      }
    });
  }

  toggleSubMenu(item: MenuItem): void {
    if (item.submenu) {
      item.open = !item.open;
    }
  }
}


