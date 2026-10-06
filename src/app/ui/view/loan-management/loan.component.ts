import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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

  constructor(
    private employeeService: EmployeeService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.preselectTabFromQueryParam();
    this.loadGenderSpecificIcons();
  }

  /**
   * Supports links like `/admin/hr/loan/:uuid?tab=my-membership`.
   * The shared nav tab restores its last selected tab from sessionStorage (key: tab names joined
   * with '-', lowercased), so we write the requested tab there before the nav tab initialises.
   */
  private preselectTabFromQueryParam(): void {
    const requestedTab = this.route.snapshot.queryParamMap.get('tab');
    if (!requestedTab) {
      return;
    }

    const slug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const tab = this.tabsConfig.find((t) => slug(t.name) === slug(requestedTab));
    if (!tab) {
      return;
    }

    const navTabCacheKey = this.tabsConfig.map((t) => t.name).join('-').toLowerCase().trim();
    sessionStorage.setItem(navTabCacheKey, tab.name);
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
