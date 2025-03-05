import { Component } from '@angular/core';
import { MenuItem } from '../../domain/menuItem.dto';
import { MenuItemsService } from '../../service/menue-items/menu-items.service';
import { NavigationEnd, Router } from '@angular/router';
import { NavigationLinksService } from '../../service/navigation-links/navigation-links.service';

@Component({
  selector: 'app-sidebar2',
  templateUrl: './sidebar2.component.html',
  styleUrl: './sidebar2.component.scss'
})
export class Sidebar2Component {
  menuItems: MenuItem[] = [];
  role: string | null = null;
marketplace : any =   {
  label: 'Marketplace',
  route: this.navigationLink.getLink('marketplaceLink'),
  roles: ['ROLE_USER', 'ROLE_ADMIN'],
  icon: 'fas fa-store'
}
  constructor(private menuService: MenuItemsService,  private router: Router, private navigationLink: NavigationLinksService) {}

  ngOnInit(): void {
    this.role = sessionStorage.getItem('role'); // Retrieve role from session storage
    console.log("role = ", this.role)
    if (this.role) {
      this.menuService.getUnlockedModulesObservable().subscribe(modules => {
        this.menuItems = modules;
      });
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
      item.open = !item.open; // Toggle the 'open' property to show/hide submenu
      console.log(`Toggled submenu for ${item.label}, open: ${item.open}`);
    }
  }
}


