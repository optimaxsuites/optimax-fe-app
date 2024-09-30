import { Component } from '@angular/core';

import { NavigationEnd, Router } from '@angular/router';
import { MenuItem } from '../../shared/domain/menuItem.dto';
import { MenuItemsService } from '../../shared/service/menue-items/menu-items.service';
@Component({
  selector: 'app-settings-page',
  templateUrl: './settings-page.component.html',
  styleUrls: ['./settings-page.component.scss']
})
export class SettingsPageComponent {
  menuItems: MenuItem[] = [];
  role: string | null = null;

  constructor(private menuService: MenuItemsService,  private router: Router) {}

  ngOnInit(): void {
    this.role = sessionStorage.getItem('role');
 
    if (this.role) {
      this.menuItems = this.menuService.getSettingsMenuItemsForRole(this.role).map(item => ({
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

  isRouteActive(route: any){

    if(route){
      const routelink = route?.split("/")
  
      return this.router.url.includes(routelink[0]);
    }
   return
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
      item.open = !item.open; 
      console.log(`Toggled submenu for ${item.label}, open: ${item.open}`);
    }
  }
}
