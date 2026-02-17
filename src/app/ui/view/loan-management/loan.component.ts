import { Component } from '@angular/core';
import { TabConfig } from '../../shared-component/service/interface/data';
import { LoanDashboardComponent } from './loan-dashboard/loan-dashboard.component';
import { LoanApprovalUiComponent } from './loan-approval-ui/loan-approval-ui.component';
import { EmployeeDashboardComponent } from './employee-loan-dashboard/employee-loan-dashboard.component';

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
    { name: 'Manage Loans',
      component: LoanApprovalUiComponent,
      icon: 'fas fa-clipboard'
    },
    { name: 'Employee Loan Dashboard',
      component: EmployeeDashboardComponent,
      icon: 'fas fa-user-circle'},
  ];
}
