import { Component, HostListener, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard-dropdown',
  templateUrl: './dashboard-dropdown.component.html',
  styleUrls: ['./dashboard-dropdown.component.scss']
})
export class DashboardDropdownComponent implements OnInit {
  dropdownOpen = false;
  selectedModule = 'Overview';

  modules = [
    { name: 'Overview', route: '/dashboard/overview' },
    { name: 'POS', route: '/POS/86b1650f-670f-4692-bf4f-332f45c033b9' },
    { name: 'HR', route: '/HR/86b1650f-670f-4692-bf4f-332f45c033b9' },
    { name: 'General', route: '/86b1650f-670f-4692-bf4f-332f45c033b9' },
    // { name: 'Kitchen' },
    // { name: 'Accounting' },
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    // Initialize selected module based on current route
    this.setModuleFromRoute();
    
    // Listen to route changes to update selected module
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.setModuleFromRoute();
      });
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: Event) {
    if (this.dropdownOpen) {
      this.dropdownOpen = false;
    }
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  selectModule(module: any) {
    this.selectedModule = module.name;
    this.dropdownOpen = false;

    // Navigate if route is provided
    if (module.route) {
      const target = module.route.startsWith('/') ? module.route : `/${module.route}`;
      this.router.navigateByUrl(target).catch(err => 
        console.error('Navigation error:', err)
      );
    }
  }

  private setModuleFromRoute() {
    const currentRoute = this.router.url;
    
    // Find module that matches current route
    const foundModule = this.modules.find(module => {
      if (!module.route) return false;
      
      // Extract path segments for comparison
      const modulePath = module.route.split('/')[1]?.toLowerCase();
      const currentPath = currentRoute.split('/')[1]?.toLowerCase();
      
      return modulePath === currentPath || 
             currentRoute.includes(module.route) ||
             (currentRoute === '/' && module.name === 'Overview');
    });
    
    // Update selected module if found
    if (foundModule) {
      this.selectedModule = foundModule.name;
    }
  }

  // Optional: Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative') && this.dropdownOpen) {
      this.dropdownOpen = false;
    }
  }
}