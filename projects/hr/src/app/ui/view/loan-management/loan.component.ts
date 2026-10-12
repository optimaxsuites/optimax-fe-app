import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TabConfig } from '../../shared-component/service/interface/data';
import { EmployeeDashboardComponent } from './employee-loan-dashboard/employee-loan-dashboard.component';
import { CooperativeMemberDashboardComponent } from './cooperative-member-dashboard/cooperative-member-dashboard.component';
import { MainDashboardComponent } from './main-dashboard-component/main-dashboard-component.component';

@Component({
  selector: 'app-loan',
  templateUrl: './loan.component.html',
  styleUrl: './loan.component.scss'
})
export class LoanComponent implements OnInit {
  readonly tabsConfig: TabConfig[] = this.buildTabsConfig();

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.preselectTabFromQueryParam();
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

  private buildTabsConfig(): TabConfig[] {
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
}
