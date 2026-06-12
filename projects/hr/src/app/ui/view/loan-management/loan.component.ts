import { Component, OnInit } from '@angular/core';
import { TabConfig } from '../../shared-component/service/interface/data';
import { EmployeeService } from '../../service/employee.service';
import { EmployeeDashboardComponent } from './employee-loan-dashboard/employee-loan-dashboard.component';
import { CooperativeMemberDashboardComponent } from './cooperative-member-dashboard/cooperative-member-dashboard.component';
import { MainDashboardComponent } from './main-dashboard-component/main-dashboard-component.component';

@Component({
  selector: 'app-loan',
  templateUrl: './loan.component.html',
  styleUrl: './loan.component.scss'
})
export class LoanComponent implements OnInit {
  tabsConfig: TabConfig[] = this.buildTabsConfig(false);

  constructor(private employeeService: EmployeeService) {}

  ngOnInit(): void {
    this.loadGenderSpecificIcons();
  }

  private loadGenderSpecificIcons(): void {
    this.employeeService.getAllEmployee().subscribe({
      next: (employees) => {
        const matchedEmployee = this.findCurrentEmployee(employees);
        const isFemale = this.isFemaleEmployee(matchedEmployee);
        this.tabsConfig = this.buildTabsConfig(isFemale);
      },
      error: () => {
        this.tabsConfig = this.buildTabsConfig(false);
      }
    });
  }

  private buildTabsConfig(isFemale: boolean): TabConfig[] {
    return [
      {
        name: 'See Dashboards',
        component: MainDashboardComponent,
        icon: 'fas fa-chart-line'
      },
      {
        name: 'My Loans',
        component: EmployeeDashboardComponent,
        icon: 'fas fa-wallet'
      },
      {
        name: 'My Membership',
        component: CooperativeMemberDashboardComponent,
        icon: 'fas fa-id-card'
      }
    ];
  }

  private findCurrentEmployee(employees: any[]): any | undefined {
    const normalizedEmployees = Array.isArray(employees) ? employees : [];
    const userRegDataRaw = sessionStorage.getItem('userRegData');
    const userRegData = userRegDataRaw ? JSON.parse(userRegDataRaw) : null;
    const sessionUsername = String(sessionStorage.getItem('username') || '').trim().toLowerCase();
    const sessionUserId = String(sessionStorage.getItem('userid') || '').trim();

    return normalizedEmployees.find((employee: any) => {
      const employeeId = String(employee?.id ?? employee?.employeeId ?? '').trim();
      const employeeEmail = String(employee?.email || employee?.workEmail || '').trim().toLowerCase();
      const employeeUsername = String(employee?.username || employee?.userName || '').trim().toLowerCase();

      const regEmail = String(userRegData?.email || '').trim().toLowerCase();
      const regUsername = String(userRegData?.username || '').trim().toLowerCase();

      if (sessionUserId && employeeId === sessionUserId) {
        return true;
      }

      if (regEmail && employeeEmail && employeeEmail === regEmail) {
        return true;
      }

      if (sessionUsername && (employeeUsername === sessionUsername || employeeEmail === sessionUsername)) {
        return true;
      }

      if (regUsername && (employeeUsername === regUsername || employeeEmail === regUsername)) {
        return true;
      }

      return false;
    });
  }

  private isFemaleEmployee(employee: any): boolean {
    const rawGender = employee?.gender?.name || employee?.gender?.gender || employee?.gender || '';
    return String(rawGender).trim().toLowerCase() === 'female';
  }
}
