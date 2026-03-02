import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { MenuService } from '../../service/menu.service';
import { MenuItem } from '../../domain/menuItem.dto';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  menuItems: MenuItem[] = [];
  role: string | null = null;

  constructor(private menuService: MenuService,  private router: Router) {}

  ngOnInit(): void {
    this.role = sessionStorage.getItem('role'); // Retrieve role from session storage
    console.log("role = ", this.role)
    if (this.role) {
      this.menuItems = this.menuService.getMenuItemsForRole(this.role).map(item => ({
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

  updateActiveState(): void {
    this.menuItems.forEach(item => {
      if (item.submenu) {
        item.open = item.submenu.some(subItem => this.router.isActive(subItem.route!, false));
      }
    });
  }

  toggleSubMenu(item: MenuItem): void {
    if (item.submenu) {
      const willOpen = !item.open;
      this.menuItems.forEach(menuItem => {
        if (menuItem.submenu) {
          menuItem.open = false;
        }
      });
      item.open = willOpen; // Toggle the 'open' property to show/hide submenu
      console.log(`Toggled submenu for ${item.label}, open: ${item.open}`);
    }
  }
}

