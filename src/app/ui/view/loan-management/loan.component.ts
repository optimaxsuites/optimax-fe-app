import { Component } from '@angular/core';
import { TabConfig } from '../../shared-component/service/interface/data';
import { LoanDashboardComponent } from './loan-dashboard/loan-dashboard.component';
import { EmployeeLoanHistoryComponent } from './employee-loan-history/employee-loan-history.component';
import { LoanApprovalUiComponent } from './loan-approval-ui/loan-approval-ui.component';
import { LoanBalanceIndicatorComponent } from './loan-balance-indicators/loan-balance-indicators.component';
import { EmployeeDashboardComponent } from './employee-loan-dashboard/employee-loan-dashboard.component';
import { RepaymentScheduleComponent } from './repayment-schedule-view/repayment-schedule-view.component';

@Component({
  selector: 'app-loan',
  templateUrl: './loan.component.html',
  styleUrl: './loan.component.scss'
})
export class LoanComponent {
  tabsConfig: TabConfig[] = [
    { name: 'Dashboard', component: LoanDashboardComponent },
    { name: 'Manage Loans', component: LoanApprovalUiComponent },
    { name: 'Check Loan Balances', component: LoanBalanceIndicatorComponent },
    { name: 'Repayment Schedule', component: RepaymentScheduleComponent },
    { name: 'Employee Loan Dashboard', component: EmployeeDashboardComponent },
    
  ];

}
