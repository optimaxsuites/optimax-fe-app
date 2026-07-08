import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { MenuService } from '../../service/menu.service';
import { MenuItem } from '../../domain/menuItem.dto';
import { EmployeeService } from '../../service/employee.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  menuItems: MenuItem[] = [];
  role: string | null = null;

  constructor(
    private menuService: MenuService,
    private router: Router,
    private employeeService: EmployeeService,
  ) {}

  ngOnInit(): void {
    this.role = sessionStorage.getItem('role');
    this.applyJoiningRestrictionFromStorage();
    this.buildMenu();

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updateActiveState();
      }
    });

    // Also fetch live employee data to catch JOINING status after async load
    this.employeeService.getCurrentEmployee().subscribe({
      next: (employee) => {
        if (employee?.employeeStatus === 'JOINING' && this.role !== 'ROLE_JOINING') {
          this.role = 'ROLE_JOINING';
          this.buildMenu();
        }
      },
      error: () => {}
    });
  }

  private applyJoiningRestrictionFromStorage(): void {
    try {
      const employeeStr =
        sessionStorage.getItem('currentEmployee') ||
        localStorage.getItem('currentEmployee') ||
        localStorage.getItem('employeeData') || '';
      const employee = employeeStr ? JSON.parse(employeeStr) : null;
      if (employee?.employeeStatus === 'JOINING') {
        this.role = 'ROLE_JOINING';
      }
    } catch { /* ignore */ }
  }

  private buildMenu(): void {
    if (this.role) {
      this.menuItems = this.menuService
        .getMenuItemsForRole(this.role)
        .map((item) => ({ ...item, open: false }));
    }
  }

  updateActiveState(): void {
    this.menuItems.forEach((item) => {
      if (item.submenu) {
        item.open = item.submenu.some((subItem) =>
          this.router.isActive(subItem.route!, false),
        );
      }
    });
  }

  toggleSubMenu(item: MenuItem): void {
    if (item.submenu) {
      const willOpen = !item.open;
      this.menuItems.forEach((menuItem) => {
        if (menuItem.submenu) {
          menuItem.open = false;
        }
      });
      item.open = willOpen;
    }
  }
}
