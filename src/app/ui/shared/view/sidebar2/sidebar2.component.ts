import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MenuItem } from '../../domain/menuItem.dto';
import { NavigationEnd, Router, UrlTree } from '@angular/router';
import { NavigationLinksService } from '../../service/navigation-links/navigation-links.service';
import { MenuItemsService } from 'projects/settings/src/app/ui/sharedComponents/service/menue-items/menu-items.service';
import { BehaviorSubject, Observable } from 'rxjs';

@Component({
  selector: 'app-sidebar2',
  templateUrl: './sidebar2.component.html',
  styleUrl: './sidebar2.component.scss'
})
export class Sidebar2Component {
   @Input() sidebarHidden!: boolean;
     @Output() toggleSidebar = new EventEmitter<void>();
    showAdminUI = false;
  menuItems!: Observable<MenuItem[]>;
  role: string | null = null;
marketplace : any =   {
  label: 'Marketplace',
  route: this.navigationLink.getLink('marketplaceLink'),
  roles: ['ROLE_USER', 'ROLE_ADMIN'],
  icon: 'fas fa-store'
}

tenant: any = {
  label: 'Tenants',
  route: this.navigationLink.getLink('tenantLink'),
  roles: ['ROLE_USER', 'ROLE_ADMIN'],
  icon: 'fa-solid fa-people-arrows'
}
  constructor(private menuService: MenuItemsService,  private router: Router, private navigationLink: NavigationLinksService) {}

  ngOnInit(): void {
    // this.role = sessionStorage.getItem('role'); // Retrieve role from session storage
    // console.log("role = ", this.role)
    // if (this.role) {
    //   this.menuService.getUnlockedModulesObservable().subscribe(modules => {
    //     this.menuItems = modules;
    //   });
    // }
    // const items = this.menuService.getMenuItems();
    const hostname = window.location.hostname; 
    const subdomain = hostname.split('.')[0]; 

    this.showAdminUI = subdomain === 'optimax' || subdomain === 'localhost';

    const token = sessionStorage.getItem('Token');
    if (token) {
      this.menuService.getRegisterApps();
    }

    this.menuItems = this.menuService.getMenuItems$();

  // console.log("menuItems = ")
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        const latestToken = sessionStorage.getItem('Token');
        if (latestToken) {
          this.menuService.getRegisterApps();
        }
        this.updateActiveState();
      }
    });
  }

  updateActiveState(): void {
    this.menuItems.forEach((item: any) => {
      if (item.submenu) {
        item.open = item.submenu.some((subItem: { route: string | UrlTree; }) => this.router.isActive(subItem.route!, false));
      }
    });
  }

  toggleSubMenu(item: MenuItem, allItems?: MenuItem[]): void {
    if (item.submenu) {
      const willOpen = !item.open;
      const items = allItems ?? [];
      items.forEach(menuItem => {
        if (menuItem.submenu) {
          menuItem.open = false;
        }
      });
      item.open = willOpen; // Toggle the 'open' property to show/hide submenu
    }
  }
  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  get sidebarClass() {
    return this.sidebarHidden ? 'collapsed' : 'expanded';
  }

  isSuperUser(): boolean {
  const roles = sessionStorage.getItem("role");
  return roles?.includes("ROLE_ADMIN") ?? false;
}
  
}
