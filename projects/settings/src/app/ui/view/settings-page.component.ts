import { Component } from '@angular/core';

import { NavigationEnd, Router } from '@angular/router';
import { MenuItem } from '../sharedComponents/domain/menuItem.dto';
import { CloseScrollStrategy } from '@angular/cdk/overlay';
import { MenuItemsService } from '../sharedComponents/service/menue-items/menu-items.service';

@Component({
  selector: 'app-settings-page',
  templateUrl: './settings-page.component.html',
  styleUrls: ['./settings-page.component.scss']
})
export class SettingsPageComponent {
  menuItems: MenuItem[] = [];
  role: string = "";

  constructor(private menuService: MenuItemsService,  private router: Router) {}

  ngOnInit(): void {
    this.role = JSON.stringify(sessionStorage.getItem('role'))
    const fetchedItems = this.menuService.getSettingsMenuItemsForRole(this.role);
    console.log('Fetched Menu Items:', fetchedItems);

    if (this.role) {
      this.menuItems = this.menuService.getUnlockedSettingsModules().map(item => ({
        ...item,
        open: false
      }));
      console.log(this.menuItems)
    }

    // this.menuItems = [...this.menuService.settingsMenuItems]
    // console.log(this.menuService.settingsMenuItems)
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
