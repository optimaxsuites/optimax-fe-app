import { Loan } from './ui/view/loan-management/loan.model';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppHrComponent } from './app.component';
import { RecruitmentComponent } from './ui/view/recruitment/recruitment.component';
import { LeaveComponent } from './ui/view/leave/leave.component';
import { AttendanceComponent } from './ui/view/attendance/attendance.component';
import { EmployeeManagementComponent } from './ui/view/employee-management/employee-management.component';
import { PerformanceComponent } from './ui/view/performance/performance.component';
import { EmployeePayrollComponent } from './ui/view/payroll/employee-payroll/employee-payroll.component';
import { EmployeePayslipListComponent } from './ui/view/payroll/employee-payslip-list/employee-payslip-list.component';
import { MygoalComponent } from './ui/view/performance/mygoal/mygoal.component';
import { AddEmployeeFormComponent } from './ui/view/employee-management/add-employee-form/add-employee-form.component';
import { MasterComponent } from './master.component';
import { ProjectListComponent } from './ui/view/project/project-list/project-list.component';
import { ProjectComponent } from './ui/view/project/project.component';
import { SchedulingComponent } from './ui/view/scheduling/scheduling/scheduling.component';
import { LoanComponent } from './ui/view/loan-management/loan.component';
import { LoanDashboardComponent } from './ui/view/loan-management/loan-dashboard/loan-dashboard.component';
import { LoanRequestFormComponent } from './ui/view/loan-management/loan-request-form/loan-request-form.component';
import { LoanApprovalUiComponent } from './ui/view/loan-management/loan-approval-ui/loan-approval-ui.component';
import { LoanDetailsComponent } from './ui/view/loan-management/loan-details/loan-details.component';
import { EmployeeLoanHistoryComponent } from './ui/view/loan-management/employee-loan-history/employee-loan-history.component';
import { EmployeeDashboardComponent } from './ui/view/loan-management/employee-loan-dashboard/employee-loan-dashboard.component';
import { LoanReportsComponent } from './ui/view/loan-management/loan-reports/loan-reports.component';
import { CooperativeDashboardComponent } from './ui/view/loan-management/cooperative-dashboard/cooperative-dashboard.component';
import { CooperativeLoansComponent } from './ui/view/loan-management/cooperative-loans/cooperative-loans.component';
import { CooperativeLoanDetailComponent } from './ui/view/loan-management/cooperative-loan-detail/cooperative-loan-detail.component';
import { CooperativeLoanApplicationComponent } from './ui/view/loan-management/cooperative-loan-application/cooperative-loan-application.component';
import { CooperativeMembersComponent } from './ui/view/loan-management/cooperative-members/cooperative-members.component';
import { CooperativeMemberDetailComponent } from './ui/view/loan-management/cooperative-member-detail/cooperative-member-detail.component';
import { CooperativeMemberFormComponent } from './ui/view/loan-management/cooperative-member-form/cooperative-member-form.component';

const routes: Routes = [
  {
    path: 'user/onboarding/:id/:uuid',
    component: AddEmployeeFormComponent,
  },

  {
    path: '',
    redirectTo: 'loan/uu',
    pathMatch: 'full',
  },
  {
    path: 'loan/:uuid',
    component: LoanComponent,
  },
  {
    path: 'loan-management/loan-dashboard/:uuid',
    component: LoanDashboardComponent,
  },
  {
    path: 'loan-management/request-for-loan/:uuid',
    component: LoanRequestFormComponent,
  },
  {
    path: 'loan-management/loan-approval/:uuid',
    component: LoanApprovalUiComponent,
  },
   {
    path: 'loan-management/loan-details/:employeeId',
    component: LoanDetailsComponent,
  },
  // {
//   path: 'loan-management.loan-details/:loanId',
//   component: LoanDetailsComponent
//  },
  {
    path: 'loan-management/loan-details/:employeeId/:uuid',
    component: LoanDetailsComponent,
  },
  {
    path: 'loan-management/employee-loan-history/:employeeId',
    component: EmployeeLoanHistoryComponent
  },
  {
    path: 'loan-management/employee-loan-history/:employeeId/:uuid',
    component: EmployeeLoanHistoryComponent
  },
  {
  path: 'loan-management/reports/:uuid',
  component: LoanReportsComponent
  },
 // Cooperative Routes
  {
    path: 'admin/hr/cooperative/dashboard',
    component: CooperativeDashboardComponent
  },
  {
    path: 'admin/hr/cooperative/members',
    component: CooperativeMembersComponent
  },
  {
    path: 'admin/hr/cooperative/members/:id',
    component: CooperativeMemberDetailComponent
  },
  {
    path: 'admin/hr/cooperative/members/add',
    component: CooperativeMemberFormComponent
  },
  {
    path: 'admin/hr/cooperative/members/edit/:id',
    component: CooperativeMemberFormComponent
  },
  {
    path: 'admin/hr/cooperative/loans',
    component: CooperativeLoansComponent
  },
  {
    path: 'admin/hr/cooperative/loans/:id',
    component: CooperativeLoanDetailComponent
  },
  {
    path: 'admin/hr/cooperative/apply',
    component: CooperativeLoanApplicationComponent
  },
  {
    path: 'leave/:uuid',
    component: LeaveComponent,
  },
  {
    path: 'attendance/:uuid',
    component: AttendanceComponent,
  },
  // {
  //   path: 'employee-management/:uuid',
  //   component: EmployeeManagementComponent,
  // },
  {
 path: 'recruitment/:uuid',
    component: RecruitmentComponent,
  },

  {
    path: 'performance/:uuid',
    component: PerformanceComponent,
  },
  {
    path: 'employee-management/:uuid',
    component: EmployeeManagementComponent,
  },
  {
    path: 'payroll/:uuid',
    component: EmployeePayrollComponent,
  },
  {
    path: 'admin/employee-payslip/:uuid',
    component: EmployeePayslipListComponent,
  },
  // {
  //   path: 'attendance/:uuid',
  //   component: AttendanceComponent,
  // },
  { path: 'mygoal', component: MygoalComponent },

  // {
  //   path: 'onboarding/:id/:uuid',
  //   component: AddEmployeeFormComponent,
  // },
  {
    path: 'project/:uuid',
    component: ProjectComponent,
  },
   {
    path: 'work-schedule/:uuid',
    component: SchedulingComponent,
  },
];
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AppHrRoutingModule {}
