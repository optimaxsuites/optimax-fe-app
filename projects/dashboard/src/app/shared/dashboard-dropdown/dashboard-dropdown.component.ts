import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-dropdown',
  templateUrl: './dashboard-dropdown.component.html',
  styleUrls: ['./dashboard-dropdown.component.scss']
})
export class DashboardDropdownComponent {
  dropdownOpen = false;
  selectedModule = 'Overview';

  modules = [
    { name: 'POS', route: '/admin/dashboard/POS/86b1650f-670f-4692-bf4f-332f45c033b9' },
    // { name: 'Kitchen' },
    // { name: 'Accounting' },
    { name: 'HR', route: 'admin/dashboard/HR/86b1650f-670f-4692-bf4f-332f45c033b9' },
    { name: 'General', route: '/admin/dashboard/86b1650f-670f-4692-bf4f-332f45c033b9' },
  ];

  constructor(private router: Router) {}

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  selectModule(module: any) {
    this.selectedModule = module.name;
    this.dropdownOpen = false;

    if (module.route) {
      const target = module.route.startsWith('/') ? module.route : `/${module.route}`;
      console.log('DashboardDropdown navigating to', target);
      this.router.navigateByUrl(target).catch(err => console.error('Navigation error', err));
    }
  }
}
