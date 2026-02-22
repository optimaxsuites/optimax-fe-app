import { Component } from '@angular/core';
import { TabConfig } from '../../shared-component/service/interface/data';
import { LoanDashboardComponent } from './loan-dashboard/loan-dashboard.component';
import { LoanApprovalUiComponent } from './loan-approval-ui/loan-approval-ui.component';
import { EmployeeDashboardComponent } from './employee-loan-dashboard/employee-loan-dashboard.component';
import { CooperativeDashboardComponent } from './cooperative-dashboard/cooperative-dashboard.component';

@Component({
  selector: 'app-loan',
  templateUrl: './loan.component.html',
  styleUrl: './loan.component.scss'
})
export class LoanComponent {
  tabsConfig: TabConfig[] = [
    { name: 'Dashboard',
      component: LoanDashboardComponent,
      icon: 'fas fa-chart-line'
    },
    {
      name: 'Cooperative Dashboard',
      component: CooperativeDashboardComponent,
      icon: 'fas fa-handshake'
    },
    { name: 'Manage Employee Welfare',
      component: LoanApprovalUiComponent,
      icon: 'fas fa-clipboard'
    },
    { name: 'My Loans',
      component: EmployeeDashboardComponent,
      icon: 'fas fa-user'
    },

  ];
}
