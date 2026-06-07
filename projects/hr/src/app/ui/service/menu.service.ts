import { Injectable } from '@angular/core';
import { MenuItem } from '../domain/menuItem.dto';
import { NavigationLinksService } from '../shared-component/service/navigation-links/navigation-links.service';
@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private menuItems: MenuItem[];

  constructor(public navigationLink: NavigationLinksService) {
    this.menuItems = [
      {
        label: 'Dashboard',
        route: this.navigationLink.getLink('dashboardLink'),
        roles: ['ROLE_USER', 'ROLE_ADMIN'],
        icon: 'fas fa-tachometer-alt'
      },
      {
        label: 'Employee Management',
        route: this.navigationLink.getLink('employeeManagementLink'),
        roles: ['ROLE_USER', 'ROLE_ADMIN'],
        icon: 'fas fa-user-cog'
      },
      {
        label: 'Recruitment',
        route: this.navigationLink.getLink('recuitmentLink'),
        roles: ['ROLE_USER', 'ROLE_ADMIN'],
        icon: 'fas fa-user-plus'
      },
      {
        label: 'Performance',
        route: this.navigationLink.getLink('performanceLink'),
        roles: ['ROLE_USER', 'ROLE_ADMIN'],
        icon: 'fas fa-user-clock'
      },
      {
        label: 'Payroll',
        route: this.navigationLink.getLink('payroll'),
        roles: ['ROLE_USER', 'ROLE_ADMIN'],
        icon: 'fas fa-dollar-sign'
      },
      {
        label: 'Attendance',
        route: this.navigationLink.getLink('attendanceLink'),
        roles: ['ROLE_USER', 'ROLE_ADMIN'],
        icon: 'fas fa-calendar-check'
      },
      {
        label: 'Leave',
        route: this.navigationLink.getLink('leaveLink'),
        roles: ['ROLE_USER', 'ROLE_ADMIN'],
        icon: 'fas fa-calendar-minus'
      },
      {
        label: 'Analytics',
        route: this.navigationLink.getLink('hrAnalytics'),
        roles: ['ROLE_USER', 'ROLE_ADMIN'],
        icon: 'fas fa-chart-line'
      },
      {
        label: 'Overtime',
        route: this.navigationLink.getLink('hrOvertime'),
        roles: ['ROLE_USER', 'ROLE_ADMIN'],
        icon: 'fas fa-clock'
      },
      {
        label: 'Settings',
        route: this.navigationLink.getLink('HRSettings'),
        roles: ['ROLE_USER', 'ROLE_ADMIN'],
        icon: 'fas fa-cog'
      },
    ];
  }



  getMenuItemsForRole(role: string): MenuItem[] {
    return this.menuItems.filter(item => item.roles.includes(role));
  }


}
