import { Component, HostListener, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

// dami just modified this to reflect separate dashboard destinations for communications and tasks and routines.
@Component({
  selector: 'app-dashboard-dropdown',
  templateUrl: './dashboard-dropdown.component.html',
  styleUrls: ['./dashboard-dropdown.component.scss']
})
export class DashboardDropdownComponent implements OnInit {
  dropdownOpen = false;
  selectedModule = 'Communications';
  currentUuid = 'uu';

  get modules() {
    return [
      { name: 'Communications', route: `/admin/dashboard/communications/${this.currentUuid}` },
      { name: 'Tasks and Routines', route: `/admin/dashboard/tasks-routines/${this.currentUuid}` },
      { name: 'Analytics', route: `/admin/dashboard/analytics/${this.currentUuid}` },
      { name: 'POS', route: `/admin/dashboard/POS/${this.currentUuid}` },
      { name: 'HR', route: `/admin/dashboard/HR/${this.currentUuid}` },
      { name: 'Overview', route: `/admin/dashboard/${this.currentUuid}` },
    ];
  }

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
    const uuidMatch = currentRoute.match(/[0-9a-fA-F-]{36}/);
    if (uuidMatch?.[0]) {
      this.currentUuid = uuidMatch[0];
    }
    
    // Find module that matches current route
    const foundModule = this.modules.find(module => {
      if (!module.route) return false;
      
      // Extract path segments for comparison
      const modulePath = module.route.split('/')[3]?.toLowerCase();
      const currentPath = currentRoute.split('/')[3]?.toLowerCase();
      
      return modulePath === currentPath || 
             currentRoute.includes(module.route) ||
             (currentRoute.includes('/admin/dashboard/tasks-routines/') && module.name === 'Tasks and Routines') ||
             (currentRoute.includes('/admin/dashboard/communications/') && module.name === 'Communications');
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
