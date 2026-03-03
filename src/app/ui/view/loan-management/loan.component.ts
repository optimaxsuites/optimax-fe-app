import { Component } from '@angular/core';
import { TabConfig } from '../../shared-component/service/interface/data';
import { EmployeeDashboardComponent } from './employee-loan-dashboard/employee-loan-dashboard.component';
import { CooperativeMemberDashboardComponent } from './cooperative-member-dashboard/cooperative-member-dashboard.component';
import { MainDashboardComponent } from './main-dashboard-component/main-dashboard-component.component';

@Component({
  selector: 'app-loan',
  templateUrl: './loan.component.html',
  styleUrl: './loan.component.scss'
})
export class LoanComponent {
  tabsConfig: TabConfig[] = [
    {
      name: 'See Dashboards',
      component: MainDashboardComponent,
      icon: 'fas fa-chart-line'
    },
    { name: 'My Loans',
      component: EmployeeDashboardComponent,
      icon: 'fas fa-user'
    },
    { name: 'My Membership',
      component: CooperativeMemberDashboardComponent,
      icon: 'fas fa-user-tie'
    },

  ];
}
