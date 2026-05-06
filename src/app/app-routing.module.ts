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
import { GuarantorConfirmationComponent } from './ui/view/employee-management/guarantor-confirmation/guarantor-confirmation.component';
import { MasterComponent } from './master.component';
import { ProjectListComponent } from './ui/view/project/project-list/project-list.component';
import { ProjectComponent } from './ui/view/project/project.component';
import { SchedulingComponent } from './ui/view/scheduling/scheduling/scheduling.component';
import { LoanComponent } from './ui/view/loan-management/loan.component';
import { LoanDashboardComponent } from './ui/view/loan-management/loan-dashboard/loan-dashboard.component';
import { LoanApprovalUiComponent } from './ui/view/loan-management/loan-approval-ui/loan-approval-ui.component';
import { LoanDetailsComponent } from './ui/view/loan-management/loan-details/loan-details.component';
import { EmployeeLoanHistoryComponent } from './ui/view/loan-management/employee-loan-history/employee-loan-history.component';
import { EmployeeDashboardComponent } from './ui/view/loan-management/employee-loan-dashboard/employee-loan-dashboard.component';
import { LoanReportsComponent } from './ui/view/loan-management/loan-reports/loan-reports.component';
import { LoanDisbursementUiComponent } from './ui/view/loan-management/loan-disbursement-ui/loan-disbursement-ui.component';
import { CooperativeDashboardComponent } from './ui/view/loan-management/cooperative-dashboard/cooperative-dashboard.component';
import { CooperativeLoansComponent } from './ui/view/loan-management/cooperative-loans/cooperative-loans.component';
import { CooperativeLoanDetailComponent } from './ui/view/loan-management/cooperative-loan-detail/cooperative-loan-detail.component';
import { CooperativeMembersComponent } from './ui/view/loan-management/cooperative-members/cooperative-members.component';
import { CooperativeMemberDetailComponent } from './ui/view/loan-management/cooperative-member-detail/cooperative-member-detail.component';
import { CooperativeMemberFormComponent } from './ui/view/loan-management/cooperative-member-form/cooperative-member-form.component';
import { CooperativeMemberLoanHistoryComponent } from './ui/view/loan-management/cooperative-member-loan-history/cooperative-member-loan-history.component';
// import { QueryComponent } from './ui/view/query/query.component';
import { EmployeeProfileDashboardComponent } from './ui/view/employee-dashboard/employee-profile-dashboard.component';
import { CooperativeMemberDashboardComponent } from './ui/view/loan-management/cooperative-member-dashboard/cooperative-member-dashboard.component';
import { CooperativeMemberLoansComponent } from './ui/view/loan-management/cooperative-member-loans/cooperative-member-loans.component';
import { CooperativeMemberGroupDashboardComponent } from './ui/view/loan-management/cooperative-member-group-dashboard/cooperative-member-group-dashboard.component';
import { CooperativeLoanGroupsComponent } from './ui/view/loan-management/cooperative-loan-groups/cooperative-loan-groups.component';
import { CooperativeGroupJoinHistoryComponent } from './ui/view/loan-management/cooperative-group-join-history/cooperative-group-join-history.component';
import { CooperativeGracePeriodRequestsManagementComponent } from './ui/view/loan-management/cooperative-grace-period-requests-management/cooperative-grace-period-requests-management.component';
import { LoanRequestFormComponent } from './ui/view/loan-management/loan-request-form/loan-request-form.component';
import { WorkscheduleShiftsComponent } from './ui/view/workschedule-shifts/workschedule-shifts.component';
// import { PayrolExtrasComponent } from './ui/view/payrol-extras/payrol-extras.component';
import { LoanPurposeManagementComponent } from './ui/view/loan-management/loan-purpose-management/loan-purpose-management.component';
import { CooperativeLoanPurposeManagementComponent } from './ui/view/loan-management/cooperative-loan-purpose-management/cooperative-loan-purpose-management.component';
import { CooperativeLoanApprovalUiComponent } from './ui/view/loan-management/cooperative-loan-approval-ui/cooperative-loan-approval-ui.component';
import { CooperativeLoanDisbursementUiComponent } from './ui/view/loan-management/cooperative-loan-disbursement-ui/cooperative-loan-disbursement-ui.component';
import { CooperativeLoanReportsComponent } from './ui/view/loan-management/cooperative-loan-reports/cooperative-loan-reports.component';
import { PayrolExtrasComponent } from './ui/view/payrol-extras/payrol-extras.component';
import { LoanGracePeriodRequestsManagementComponent } from './ui/view/loan-management/loan-grace-period-request-management/loan-grace-period-requests-management.component';
import { CooperativePatronageDistributionComponent } from './ui/view/loan-management/cooperative-patronage-distribution/cooperative-patronage-distribution.component';
import { ProductivityWorkspaceComponent } from './ui/view/productivity/productivity-workspace.component';

const DEFAULT_LOAN_ROUTE = 'loan/uu';

const routes: Routes = [
  {
    path: 'user/onboarding/:id/:uuid',
    component: AddEmployeeFormComponent,
  },
  {
    path: 'guarantor/confirm/:token/:uuid',
    component: GuarantorConfirmationComponent,
  },

  {
    path: '',
    // redirectTo: DEFAULT_LOAN_ROUTE,
    redirectTo: DEFAULT_LOAN_ROUTE,
    pathMatch: 'full',
  },
  // {
  //   path: 'loan-dashboard',
  //   redirectTo: 'loan/uu',
  //   pathMatch: 'full'
  // },
  {
    path: 'loan-dashboard/:legacyId',
    redirectTo: DEFAULT_LOAN_ROUTE,
    pathMatch: 'full',
  },
  {
    path: 'admin/hr/loan-dashboard',
    redirectTo: DEFAULT_LOAN_ROUTE,
    pathMatch: 'full',
  },
  {
    path: 'admin/hr/loan-dashboard/:legacyId',
    redirectTo: DEFAULT_LOAN_ROUTE,
    pathMatch: 'full',
  },
  {
    path: 'admin/hr/loan-management/loan-dashboard',
    redirectTo: DEFAULT_LOAN_ROUTE,
    pathMatch: 'full',
  },
  {
    path: 'admin/hr/loan-management/loan-dashboard/:uuid',
    component: LoanDashboardComponent,
  },
  {
    path: 'workschedule-shifts/:uuid',
    component: WorkscheduleShiftsComponent,
  },
  {
    path: 'guarantor/confirm/:token',
    component: GuarantorConfirmationComponent,
  },
  {
    path: 'me/:uuid',
    component: EmployeeProfileDashboardComponent,
  },
  {
    path: 'employee-dashboard/:uuid',
    component: EmployeeProfileDashboardComponent,
  },
  {
    path: 'loan/:uuid',
    component: LoanComponent,
  },
  {
    path: 'admin/hr/loan/:uuid',
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
    path: 'admin/hr/loan-management/request-for-loan/:uuid',
    component: LoanRequestFormComponent,
  },
  {
    path: 'loan-management/loan-approval/:uuid',
    component: LoanApprovalUiComponent,
  },
  {
    path: 'admin/hr/loan-management/loan-approval/:uuid',
    component: LoanApprovalUiComponent,
  },
  {
    path: 'loan-management/loan-disbursement/:uuid',
    component: LoanDisbursementUiComponent,
  },
    {
      path: 'loan-management/loan-purposes/:uuid',
      component: LoanPurposeManagementComponent,
    },
    {
    path: 'admin/hr/loan-management/loan-purposes/:uuid',
    component: LoanPurposeManagementComponent,
  },
    {
      path: 'cooperative/loan-purposes/:uuid',
      component: CooperativeLoanPurposeManagementComponent,
    },
    {
      path: 'admin/hr/cooperative/loan-purposes/:uuid',
      component: CooperativeLoanPurposeManagementComponent,
    },
  {
    path: 'admin/hr/loan-management/loan-disbursement/:uuid',
    component: LoanDisbursementUiComponent,
  },

  {
    path: 'loan-management/grace-period-requests/:uuid',
    component: LoanGracePeriodRequestsManagementComponent,
  },
  {
    path: 'admin/hr/loan-management/grace-period-requests/:uuid',
    component: LoanGracePeriodRequestsManagementComponent,
  },
  // Added missing route for loan-grace-period-requests (with 'loan-' in path)
  {
    path: 'loan-management/loan-grace-period-requests/:uuid',
    component: LoanGracePeriodRequestsManagementComponent,
  },
  {
    path: 'admin/hr/loan-management/loan-grace-period-requests/:uuid',
    component: LoanGracePeriodRequestsManagementComponent,
  },

  // {
  //   path: 'loan-management.loan-details/:loanId',
  //   component: LoanDetailsComponent
  //  },
  {
    path: 'loan-management/loan-details/:loanId/:uuid',
    component: LoanDetailsComponent,
  },
  {
    path: 'admin/hr/loan-management/loan-details/:loanId/:uuid',
    component: LoanDetailsComponent,
  },
  {
    path: 'loan-management/cooperative-member-loan-history/:memberId/:uuid',
    component: CooperativeMemberLoanHistoryComponent,
  },
  {
    path: 'loan-management/employee-loan-history/:employeeId/:uuid',
    component: EmployeeLoanHistoryComponent,
  },
  {
    path: 'admin/hr/loan-management/cooperative-member-loan-history/:memberId/:uuid',
    component: CooperativeMemberLoanHistoryComponent,
  },
  {
    path: 'admin/hr/loan-management/employee-loan-history/:employeeId/:uuid',
    component: EmployeeLoanHistoryComponent,
  },
  {
    path: 'loan-management/reports/:uuid',
    component: LoanReportsComponent,
  },
  {
    path: 'admin/hr/loan-management/reports/:uuid',
    component: LoanReportsComponent,
  },
  {
    path: 'admin/hr/loan-management/loans/:uuid',
    component: LoanDashboardComponent,
  },
  // Cooperative Routes
  {
    path: 'cooperative/dashboard/:uuid',
    component: CooperativeDashboardComponent,
  },
  {
    path: 'admin/hr/cooperative/dashboard/:uuid',
    component: CooperativeDashboardComponent,
  },
  {
    path: 'cooperative/members/:uuid',
    component: CooperativeMembersComponent,
  },
  {
    path: 'cooperative/members/add/:uuid',
    component: CooperativeMemberFormComponent,
  },
  {
    path: 'cooperative/members/edit/:id/:uuid',
    component: CooperativeMemberFormComponent,
  },
  {
    path: 'cooperative/members/:id/:uuid',
    component: CooperativeMemberDetailComponent,
  },
  {
    path: 'admin/hr/cooperative/members/:uuid',
    component: CooperativeMembersComponent,
  },
  {
    path: 'admin/hr/cooperative/members/add/:uuid',
    component: CooperativeMemberFormComponent,
  },
  {
    path: 'admin/hr/cooperative/members/edit/:id/:uuid',
    component: CooperativeMemberFormComponent,
  },
  {
    path: 'admin/hr/cooperative/members/:id/:uuid',
    component: CooperativeMemberDetailComponent,
  },
  {
    path: 'cooperative/loans/:uuid',
    component: CooperativeLoansComponent,
  },
  {
    path: 'cooperative/loans/:id/:uuid',
    component: CooperativeLoanDetailComponent,
  },
  {
    path: 'admin/hr/cooperative/loans/:uuid',
    component: CooperativeLoansComponent,
  },
  {
    path: 'admin/hr/cooperative/loans/:id/:uuid',
    component: CooperativeLoanDetailComponent,
  },
  {
    path: 'cooperative/groups/:uuid',
    component: CooperativeLoanGroupsComponent,
  },
  {
    path: 'cooperative/patronage-distribution/:uuid',
    component: CooperativePatronageDistributionComponent,
  },
  {
    path: 'admin/hr/cooperative/patronage-distribution/:uuid',
    component: CooperativePatronageDistributionComponent,
  },
  {
    path: 'admin/hr/cooperative/groups/:uuid',
    component: CooperativeLoanGroupsComponent,
  },
  {
    path: 'cooperative/group-join-applications/:uuid',
    component: CooperativeGroupJoinHistoryComponent,
  },
  {
    path: 'admin/hr/cooperative/group-join-applications/:uuid',
    component: CooperativeGroupJoinHistoryComponent,
  },
  {
    path: 'cooperative/grace-period-requests/:uuid',
    component: CooperativeGracePeriodRequestsManagementComponent,
  },
  {
    path: 'admin/hr/cooperative/grace-period-requests/:uuid',
    component: CooperativeGracePeriodRequestsManagementComponent,
  },
  {
    path: 'cooperative/loan-approval/:uuid',
    component: CooperativeLoanApprovalUiComponent,
  },
  {
    path: 'admin/hr/cooperative/loan-approval/:uuid',
    component: CooperativeLoanApprovalUiComponent,
  },
  {
    path: 'cooperative/loan-disbursement/:uuid',
    component: CooperativeLoanDisbursementUiComponent,
  },
  {
    path: 'admin/hr/cooperative/loan-disbursement/:uuid',
    component: CooperativeLoanDisbursementUiComponent,
  },
  {
    path: 'cooperative/reports/:uuid',
    component: CooperativeLoanReportsComponent,
  },
  {
    path: 'admin/hr/cooperative/reports/:uuid',
    component: CooperativeLoanReportsComponent,
  },
  // Member routes
  {
    path: 'member/cooperative/dashboard/:uuid',
    component: CooperativeMemberDashboardComponent,
  },
  {
    path: 'member/cooperative/my-loans/:uuid',
    component: CooperativeMemberLoansComponent,
  },
  {
    path: 'member/cooperative/groups/:groupId/:uuid',
    component: CooperativeMemberGroupDashboardComponent,
  },
  {
    path: 'member/cooperative/loans/:id/:uuid',
    component: CooperativeMemberDetailComponent, // Read-only version
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
    path: 'productivity/:uuid',
    component: ProductivityWorkspaceComponent,
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
    path: 'payroll-operations/:uuid',
    component: PayrolExtrasComponent,
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
  {
    path: '**',
    redirectTo: DEFAULT_LOAN_ROUTE,
  },
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppHrRoutingModule {}
