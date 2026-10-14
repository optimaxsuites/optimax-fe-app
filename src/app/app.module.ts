import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HrSettingsComponent } from './ui/view/settings/hr-settings.component';
import { UserProfileComponent } from './ui/view/user-profile/user-profile.component';
import { HrAnalyticsDashboardComponent } from './ui/view/analytics/hr-analytics-dashboard.component';
import { OvertimeManagementComponent } from './ui/view/overtime/overtime-management.component';
import { OrgChartComponent } from './ui/view/org-chart/org-chart.component';
import { HrReportsComponent } from './ui/view/hr-reports/hr-reports.component';
import { PreOnboardingFormComponent } from './ui/view/employee-management/pre-onboarding-form/pre-onboarding-form.component';
import { PreOnboardingImportComponent } from './ui/view/employee-management/pre-onboarding-import/pre-onboarding-import.component';
import { OffboardingFormComponent } from './ui/view/employee-management/offboarding-form/offboarding-form.component';
import { EmployeeUpdateFormComponent } from './ui/view/employee-management/employee-update-form/employee-update-form.component';
import { InviteModalComponent } from './ui/view/recruitment/invite-modal/invite-modal.component';
import { CooperativePatronageDistributionComponent } from './ui/view/loan-management/cooperative-patronage-distribution/cooperative-patronage-distribution.component';
import { ProductivityWorkspaceComponent } from './ui/view/productivity/productivity-workspace.component';
import { BonusDisbursementComponent } from './ui/view/payroll/bonus-disbursement/bonus-disbursement.component';
import { EmployeeRelativesWidgetComponent } from './ui/shared-component/employee-relatives-widget/employee-relatives-widget.component';
import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { JwtHelperService, JWT_OPTIONS } from '@auth0/angular-jwt';


////primeng
import { ButtonModule } from 'primeng/button';
import { EditorModule } from 'primeng/editor';
import { PasswordModule } from 'primeng/password';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { SidebarModule } from 'primeng/sidebar';
import { DialogModule } from 'primeng/dialog';
import { TabViewModule } from 'primeng/tabview';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SplitButtonModule } from 'primeng/splitbutton';
import { PanelModule } from 'primeng/panel';
import { DividerModule } from 'primeng/divider';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { StepperModule } from 'primeng/stepper';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { MessagesModule } from 'primeng/messages';
import { MessageModule } from 'primeng/message';
import { ConfirmationService, MessageService } from 'primeng/api';
import { RippleModule } from 'primeng/ripple';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { AutoCompleteModule } from 'primeng/autocomplete';

import { NgSelectComponent, NgSelectModule } from '@ng-select/ng-select';
import { FullCalendarModule } from '@fullcalendar/angular';
import { NgApexchartsModule } from 'ng-apexcharts';

import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatRadioModule } from '@angular/material/radio';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { DragDropModule } from '@angular/cdk/drag-drop';
import { AppHrRoutingModule } from './app-routing.module';
import { AppHrComponent } from './app.component';
import { CommonModule } from '@angular/common';
import { RecruitmentComponent } from './ui/view/recruitment/recruitment.component';
import { LeaveComponent } from './ui/view/leave/leave.component';
import { AttendanceComponent } from './ui/view/attendance/attendance.component';
import { EmployeeManagementComponent } from './ui/view/employee-management/employee-management.component';
import { RecruitmentListComponent } from './ui/view/recruitment/recruitment-list/recruitment-list.component';
import { RecruitmentFormComponent } from './ui/view/recruitment/recruitment-form/recruitment-form.component';
import { CandidateComponent } from './ui/view/recruitment/candidate/candidate.component';
import { ScheduledInterviewComponent } from './ui/view/recruitment/scheduled-interview/scheduled-interview.component';
import { NavTabComponent } from './ui/shared-component/view/nav-tab/nav-tab.component';
import { SideModalComponent } from './ui/shared-component/view/side-modal/side-modal.component';
import { LargeSideModalComponent } from './ui/shared-component/view/large-side-modal/large-side-modal.component';
import { ModalComponent } from './ui/shared-component/view/modal/modal.component';
import { BackButtonModule } from './ui/shared-component/view/back-button/back-button.module';
import { ButtonComponent } from './ui/shared-component/view/button/button.component';
import { CareerJobPostingComponent } from './ui/shared-component/view/career-job-posting/career-job-posting.component';
import { DashboardFooterComponent } from './ui/shared-component/view/dashboard-footer/dashboard-footer.component';
import { TableComponent } from './ui/shared-component/view/table/table.component';
import { TableBodyDirective } from './ui/shared-component/view/table/table-body.directive';
import { CooperativeLoanReportsComponent } from './ui/view/loan-management/cooperative-loan-reports/cooperative-loan-reports.component';
import { InterviewInviteComponent } from './ui/view/recruitment/interview-invite/interview-invite.component';
import { InterviewResponseComponent } from './ui/view/recruitment/candidate/interview-response.component';
import { OfferLetterComponent } from './ui/view/recruitment/offer-letter/offer-letter.component';
import { AppointmentLetterComponent } from './ui/view/recruitment/appointment-letter/appointment-letter.component';
import { InterviewScoreSheetComponent } from './ui/view/recruitment/interview-score-sheet/interview-score-sheet.component';
import { AddEmployeeFormComponent } from './ui/view/employee-management/add-employee-form/add-employee-form.component';
import { EmployeeOnboardingFormComponent } from './ui/view/employee-management/employee-onboarding-form/employee-onboarding-form.component';
import { LeaveUsageComponent } from './ui/view/leave/leave-usage/leave-usage.component';
import { LeaveRequestComponent } from './ui/view/leave/leave-request/leave-request.component';
import { LeavePlanComponent } from './ui/view/leave/leave-plan/leave-plan.component';
import { LeavePlanningDashboardComponent } from './ui/view/leave/leave-planning-dashboard/leave-planning-dashboard.component';
// import { ApplyComponent } from './ui/view/leave/apply/apply.component';
import { Navbar2Component } from './ui/shared-component/view/navbar/navbar2.component';
import { PerformanceComponent } from './ui/view/performance/performance.component';
import { AppraisallistComponent } from './ui/view/performance/appraisallist/appraisallist.component';
import { AppraisalcycleComponent } from './ui/view/performance/appraisalcycle/appraisalcycle.component';
import { AssignLeaveComponent } from './ui/view/leave/assign-leave/assign-leave.component';
import {
  HTTP_INTERCEPTORS,
  HttpClientModule,
} from '@angular/common/http';
import { AttendanceSheetsComponent } from './ui/view/attendance/attendance-sheet/attendance-sheet.component';
import { NotificationComponent } from './ui/view/attendance/notification/notification.component';
import { MyAttendanceComponent } from './ui/view/attendance/my-attendance/my-attendance.component';
import { EmployeePayrollComponent } from './ui/view/payroll/employee-payroll/employee-payroll.component';
import { PayrollDashboardComponent } from './ui/view/payroll/payroll-dashboard/payroll-dashboard.component';
import { EmployeePayslipListComponent } from './ui/view/payroll/employee-payslip-list/employee-payslip-list.component';
import { PayslipViewComponent } from './ui/view/payroll/payslip-view/payslip-view.component';
import { PayrollDisbursementComponent } from './ui/view/payroll/payroll-disbursement/payroll-disbursement.component';
import { GoalComponent } from './ui/view/performance/goal/goal.component';
import { MygoalComponent } from './ui/view/performance/mygoal/mygoal.component';
import { EmployeeGuarantorComponent } from './ui/view/employee-management/employee-guarantor/employee-guarantor.component';
import { EmployeeNokComponent } from './ui/view/employee-management/employee-nok/employee-nok.component';
import { EmployeeOffboardingComponent } from './ui/view/employee-management/employee-offboarding/employee-offboarding.component';
import { ViewEmployeeComponent } from './ui/view/employee-management/view-employee/view-employee.component';
import { AdminCreationFormComponent } from './ui/view/employee-management/admin-creation-form/admin-creation-form.component';
import { GuarantorConfirmationComponent } from './ui/view/employee-management/guarantor-confirmation/guarantor-confirmation.component';
import { TargetComponent } from './ui/view/performance/target/target.component';
import { TargetformComponent } from './ui/view/performance/targetform/targetform.component';
import { BulkEmployeeInstructionComponent } from './ui/view/employee-management/bulk-employee-instruction/bulk-employee-instruction.component';
import { SplitAndTitleCasePipe } from './ui/shared-component/service/split-and-title-case.pipe';
import { AppraisalformComponent } from './ui/view/performance/appraisalform/appraisalform.component';
import { JobApplicationFormComponent } from './ui/shared-component/view/job-application-form/job-application-form.component';
import { SearchbarComponent } from './ui/shared-component/view/searchbar/searchbar.component';
import { NavbarComponent } from './ui/shared-component/view/navbar/navbar.component';
import { FooterComponent } from './ui/shared-component/view/footer/footer.component';
import { EditableLabelComponent } from './ui/shared-component/view/editable-label/editable-label.component';
import { DropdownComponent } from './ui/shared-component/view/dropdown/dropdown.component';
import { AuthInterceptor } from './ui/shared-component/service/auth-service/auth.interceptor.service';
import { ErrorToastInterceptor } from './ui/shared-component/service/error-message/error-toast.interceptor';
import { DateConversionInterceptor } from './ui/service/date-conversion.interceptor';
import { MasterComponent } from './master.component';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from './ui/view/sidebar/sidebar.component';
import { AppraisalComponent } from './ui/view/performance/appraisal/appraisal.component';
import { LeavePolicyComponent } from './ui/view/leave/leave-policy/leave-policy.component';
import { AttendashboardComponent } from './ui/view/attendance/admin/attendashboard/attendashboard.component';
import { StatsCardsComponent } from './ui/view/attendance/admin/attendashboard/stats-cards/stats-cards.component';
import { LateArrivalsComponent } from './ui/view/attendance/admin/attendashboard/late-arrivals/late-arrivals.component';
//import { AttendancetableComponent } from './ui/view/attendance/admin/attendashboard/attendancetable/attendancetable.component';
//import { AttendancefilterComponent } from './ui/view/attendance/admin/attendashboard/attendancetable/attendancefilter/attendancefilter.component';
//import { AttendancesummaryComponent } from './ui/view/attendance/admin/attendashboard/attendancesummary/attendancesummary.component';
import { OfficeHoursComponent } from './ui/view/attendance/admin/attendashboard/office-hours/office-hours.component';
import { EmployeedashboardComponent } from './ui/view/attendance/employee/employeedashboard/employeedashboard.component';
import { TodaySummaryComponent } from './ui/view/attendance/employee/employeedashboard/today-summary/today-summary.component';
import { CheckinCheckoutComponent } from './ui/view/attendance/employee/employeedashboard/checkin-checkout/checkin-checkout.component';
//import { EmployeesummaryComponent } from './ui/view/attendance/employee/employeedashboard/employeesummary/employeesummary.component';
//import { MonthlysummaryComponent } from './ui/view/attendance/employee/employeedashboard/employeesummary/monthlysummary/monthlysummary.component';
import { CorrectionrequestComponent } from './ui/view/attendance/employee/correctionrequest/correctionrequest.component';
import { CorrectionrequestformComponent } from './ui/view/attendance/employee/correctionrequest/correctionrequestform/correctionrequestform.component';
//import { MonthlyattendancelistComponent } from './ui/view/attendance/employee/employeedashboard/employeesummary/monthlyattendancelist/monthlyattendancelist.component';
import { AdminCorrectionsComponent } from './ui/view/attendance/admin/admin-corrections/admin-corrections.component';
import { AttendanceReportsComponent } from './ui/view/attendance/admin/attendance-reports/attendance-reports.component';
import { BiometricEnrollmentComponent } from './ui/view/biometric/biometric-enrollment/biometric-enrollment.component';
import { RemoteCheckinComponent } from './ui/view/attendance/employee/remote-checkin/remote-checkin.component';
import { SupervisorApprovalQueueComponent } from './ui/view/attendance/admin/supervisor-approval-queue/supervisor-approval-queue.component';
import { CalendarModule } from 'primeng/calendar';
import { AttendanceDetailsComponent } from './ui/view/attendance/attendance-details/attendance-details.component';
import { ProjectComponent } from './ui/view/project/project.component';
import { ProjectDetailComponent } from './ui/view/project/project-list/project-detail/project-detail.component';
import { ProjectListComponent } from './ui/view/project/project-list/project-list.component';
import { MyProjectComponent } from './ui/view/project/my-project/my-project.component';
import { MyProjectDetailComponent } from './ui/view/project/my-project/my-project-detail/my-project-detail.component';
//import { MySchedulesComponent } from './ui/view/scheduling/scheduling/my-schedules/my-schedules.component';
import { CreateProjectComponent } from './ui/view/project/project-list/create-project/create-project.component';
//import { SchedulesComponent } from './ui/view/scheduling/scheduling/schedules/schedules.component';
import { SchedulingComponent } from './ui/view/scheduling/scheduling/scheduling.component';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MultiSelectModule } from 'primeng/multiselect';
import { AdminexportComponent } from './ui/view/attendance/admin/attendashboard/adminexport/adminexport.component';
import { LoanRequestFormComponent } from './ui/view/loan-management/loan-request-form/loan-request-form.component';
import { LoanDashboardComponent } from './ui/view/loan-management/loan-dashboard/loan-dashboard.component';
import { EmployeeLoanHistoryComponent } from './ui/view/loan-management/employee-loan-history/employee-loan-history.component';
import { EmployeeDashboardComponent } from './ui/view/loan-management/employee-loan-dashboard/employee-loan-dashboard.component';
import { LoanApprovalUiComponent } from './ui/view/loan-management/loan-approval-ui/loan-approval-ui.component';
import { LoanDetailsComponent } from './ui/view/loan-management/loan-details/loan-details.component';
import { LoanComponent } from './ui/view/loan-management/loan.component';
import { EmployeeRepaymentScheduleComponent } from './ui/view/loan-management/employee-repayment-schedule/employee-repayment-schedule.component';
import { LoanReportsComponent } from './ui/view/loan-management/loan-reports/loan-reports.component';
import { LoanDisbursementUiComponent } from './ui/view/loan-management/loan-disbursement-ui/loan-disbursement-ui.component';
import { CooperativeDashboardComponent } from './ui/view/loan-management/cooperative-dashboard/cooperative-dashboard.component';
import { CooperativeLoansComponent } from './ui/view/loan-management/cooperative-loans/cooperative-loans.component';
import { CooperativeLoanDetailComponent } from './ui/view/loan-management/cooperative-loan-detail/cooperative-loan-detail.component';
import { CooperativeLoanApplicationComponent } from './ui/view/loan-management/cooperative-loan-application/cooperative-loan-application.component';
import { GuarantorApprovalModalComponent } from './ui/view/loan-management/cooperative-loan-application/guarantor-approval-modal.component';
import { CooperativeMembersComponent } from './ui/view/loan-management/cooperative-members/cooperative-members.component';
import { CooperativeMemberDetailComponent } from './ui/view/loan-management/cooperative-member-detail/cooperative-member-detail.component';
import { CooperativeMemberFormComponent } from './ui/view/loan-management/cooperative-member-form/cooperative-member-form.component';
import { CooperativeMemberLoanHistoryComponent } from './ui/view/loan-management/cooperative-member-loan-history/cooperative-member-loan-history.component';
import { EmployeeProfileDashboardComponent } from './ui/view/employee-dashboard/employee-profile-dashboard.component';
import { CooperativeMemberDashboardComponent } from './ui/view/loan-management/cooperative-member-dashboard/cooperative-member-dashboard.component';
import { CooperativeMemberLoansComponent } from './ui/view/loan-management/cooperative-member-loans/cooperative-member-loans.component';
import { CooperativeMemberGroupDashboardComponent } from './ui/view/loan-management/cooperative-member-group-dashboard/cooperative-member-group-dashboard.component';
import { CooperativeLoanGroupsComponent } from './ui/view/loan-management/cooperative-loan-groups/cooperative-loan-groups.component';
import { CooperativeGroupJoinHistoryComponent } from './ui/view/loan-management/cooperative-group-join-history/cooperative-group-join-history.component';
import { MainDashboardComponent } from './ui/view/loan-management/main-dashboard-component/main-dashboard-component.component';
import { EmployeeLoanDetailsModalComponent } from './ui/view/loan-management/employee-loan-details-modal/employee-loan-details-modal.component';
import { SortableTableDirective } from './ui/shared-component/view/table/sortable-table.directive';
import { AttendancesummaryComponent } from './ui/view/attendance/admin/attendashboard/attendancesummary/attendancesummary.component';
import { AttendancefilterComponent } from './ui/view/attendance/admin/attendashboard/attendancetable/attendancefilter/attendancefilter.component';
import { AttendancetableComponent } from './ui/view/attendance/admin/attendashboard/attendancetable/attendancetable.component';
import { EmployeesummaryComponent } from './ui/view/attendance/employee/employeedashboard/employeesummary/employeesummary.component';
import { MonthlyattendancelistComponent } from './ui/view/attendance/employee/employeedashboard/employeesummary/monthlyattendancelist/monthlyattendancelist.component';
import { MonthlysummaryComponent } from './ui/view/attendance/employee/employeedashboard/employeesummary/monthlysummary/monthlysummary.component';
// import { QueryComponent } from './ui/view/query/query.component';
import { LeaveTimelineComponent } from './ui/view/leave/leave-timeline/leave-timeline.component';
import { JopOpeningsComponent } from './ui/view/recruitment/job-opening/jop.openings.component';
import { ShiftAssignmentComponent } from './ui/view/workschedule-shifts/shift-assignment/shift-assignment.component';
import { ShiftCalendarComponent } from './ui/view/workschedule-shifts/shift-calendar/shift-calendar.component';
import { ShiftFormComponent } from './ui/view/workschedule-shifts/shift-form/shift-form.component';
import { ShiftListComponent } from './ui/view/workschedule-shifts/shift-list/shift-list.component';
import { JoinCooperativeGroupComponent } from './ui/view/loan-management/join-cooperative-group/join-cooperative-group.component';
import { EmployeePaymentHistoryComponent } from './ui/view/loan-management/employee-payment-history/employee-payment-history.component';
import { EmployeePaymentHistoryPageComponent } from './ui/view/loan-management/employee-payment-history-page/employee-payment-history-page.component';
import { LoanPurposeManagementComponent } from './ui/view/loan-management/loan-purpose-management/loan-purpose-management.component';

import { MenuModule } from 'primeng/menu';
import { AdHocComponent } from './ui/view/payrol-extras/ad-hoc/ad-hoc.component';
import { PayrolExtrasComponent } from './ui/view/payrol-extras/payrol-extras.component';
import { QueryComponent } from './ui/view/payrol-extras/query/query.component';
import { GracePeriodRequestsComponent } from './ui/view/loan-management/grace-period-requests/grace-period-requests.component';
import { LoanGracePeriodRequestsManagementComponent } from './ui/view/loan-management/loan-grace-period-request-management/loan-grace-period-requests-management.component';
import { CooperativeGracePeriodRequestsManagementComponent } from './ui/view/loan-management/cooperative-grace-period-requests-management/cooperative-grace-period-requests-management.component';
import { CooperativeGracePeriodRequestFormComponent } from './ui/view/loan-management/cooperative-grace-period-request-form/cooperative-grace-period-request-form.component';
import { CooperativeGracePeriodRequestFormModule } from './ui/view/loan-management/cooperative-grace-period-request-form/cooperative-grace-period-request-form.module';
import { LoanPaymentModalComponent } from './ui/view/loan-management/loan-payment-modal/loan-payment-modal.component';
import { EmployeePaymentReminderComponent } from './ui/view/loan-management/employee-payment-reminder/employee-payment-reminder.component';
import { CooperativeLoanPurposeManagementComponent } from './ui/view/loan-management/cooperative-loan-purpose-management/cooperative-loan-purpose-management.component';
import { CooperativePaymentModalComponent } from './ui/view/loan-management/cooperative-payment-modal/cooperative-payment-modal.component';
import { CooperativeLoanDisbursementUiComponent } from './ui/view/loan-management/cooperative-loan-disbursement-ui/cooperative-loan-disbursement-ui.component';

import { CooperativeRepaymentScheduleComponent } from './ui/view/loan-management/cooperative-repayment-schedule/cooperative-repayment-schedule.component';
import { MyScheduleComponent } from './ui/view/workschedule-shifts/my-schedule/my-schedule.component';
import { MySchedulesComponent } from './ui/view/scheduling/scheduling/my-schedules/my-schedules.component';
import { ProfileChangeRequestsComponent } from './ui/view/profile-change-requests/profile-change-requests.component';
import { BankDetailsChangeRequestComponent } from './ui/view/profile-change-requests/bank-details-change-request/bank-details-change-request.component';
import { NokChangeRequestComponent } from './ui/view/profile-change-requests/nok-change-request/nok-change-request.component';
// import { GuarantorChangeRequestComponent } from './ui/view/profile-change-requests/guarantor-change-request/guarantor-change-request.component';
import { EmployeeChangeRequestsDashboardComponent } from './ui/view/profile-change-requests/employee-change-requests-dashboard/employee-change-requests-dashboard.component';
import { EmployeeChangeRequestsSummaryComponent } from './ui/view/employee-dashboard/employee-change-requests-summary/employee-change-requests-summary.component';
import { GuarantorChangeRequestComponent } from './ui/view/profile-change-requests/guarantor-change-request/guarantor-change-request.component';

// import { ProfileChangeRequestsComponent } from './ui/view/profile-change-requests/profile-change-requests.component';
import { HrLettersComponent } from './ui/view/employee-management/hr-letters/hr-letters.component';
import { TimeFormatPipe } from './ui/shared-component/pipes/time-format.pipe';
import { ToastComponent } from './shared-component/view/toast/toast.component';
import { PayrollCorrectionComponent } from './ui/view/payroll/payroll-correction/payroll-correction.component';


@NgModule({
  declarations: [
    AppHrComponent,
    RecruitmentComponent,
    LeaveComponent,
    AttendanceComponent,
    RecruitmentListComponent,
    RecruitmentFormComponent,
    CandidateComponent,
    ScheduledInterviewComponent,
    InterviewInviteComponent,
    AppointmentLetterComponent,
    InterviewScoreSheetComponent,
    AddEmployeeFormComponent,
    EmployeeManagementComponent,
    AdminCreationFormComponent,
    EmployeeProfileDashboardComponent,
    // EmployeeOnboardingFormComponent,
    PreOnboardingFormComponent,
    PreOnboardingImportComponent,
    OffboardingFormComponent,
    EmployeeUpdateFormComponent,
    LeaveUsageComponent,
    LeaveRequestComponent,
    LeavePlanComponent,
    LeavePlanningDashboardComponent,
    AssignLeaveComponent,
    // ApplyComponent,
    PerformanceComponent,
    NotificationComponent,
    MyAttendanceComponent,
    EmployeePayrollComponent,
    PayrollDashboardComponent,
    PayrollDisbursementComponent,
    EmployeePayslipListComponent,
    PayslipViewComponent,
    GuarantorConfirmationComponent,
    ViewEmployeeComponent,
    EmployeeNokComponent,
    EmployeeGuarantorComponent,
    EmployeeOffboardingComponent,
    GoalComponent,
    MygoalComponent,
    TargetComponent,
    TargetformComponent,
    BulkEmployeeInstructionComponent,
    SplitAndTitleCasePipe,
    AppraisalformComponent,
    AppraisallistComponent,
    AppraisalcycleComponent,
    CareerJobPostingComponent,
    DashboardFooterComponent,
    ButtonComponent,
    NavTabComponent,
    Navbar2Component,
    NavbarComponent,
    JobApplicationFormComponent,
    ModalComponent,
    SideModalComponent,
    SidebarComponent,
    SearchbarComponent,
    EditableLabelComponent,
    DropdownComponent,
    MasterComponent,
    AppraisalComponent,
    LeavePolicyComponent,
    AttendashboardComponent,
    StatsCardsComponent,
    LateArrivalsComponent,
    AttendanceDetailsComponent,
    AttendanceSheetsComponent,
    OfficeHoursComponent,
    EmployeedashboardComponent,
    TodaySummaryComponent,
    CheckinCheckoutComponent,
    CorrectionrequestComponent,
    CorrectionrequestformComponent,
    AdminCorrectionsComponent,
    AttendanceReportsComponent,
    BiometricEnrollmentComponent,
    RemoteCheckinComponent,
    SupervisorApprovalQueueComponent,
    ProjectComponent,
    ProjectDetailComponent,
    ProjectListComponent,
    MyProjectComponent,
    MyProjectDetailComponent,
    //MySchedulesComponent,
    CreateProjectComponent,
    //SchedulesComponent,
    SchedulingComponent,
    AdminexportComponent,
    LoanRequestFormComponent,
    LoanDashboardComponent,
    EmployeeLoanHistoryComponent,
    EmployeeDashboardComponent,
    EmployeeProfileDashboardComponent,
    LoanApprovalUiComponent,
    LoanDetailsComponent,
    LoanComponent,
    EmployeeRepaymentScheduleComponent,
    LoanReportsComponent,
    LoanDisbursementUiComponent,
    CooperativeDashboardComponent,
    CooperativeLoansComponent,
    CooperativeLoanDetailComponent,
    CooperativeLoanApplicationComponent,
    GuarantorApprovalModalComponent,
    CooperativeMembersComponent,
    CooperativeMemberDetailComponent,
    CooperativeMemberFormComponent,
    CooperativeMemberDashboardComponent,
    CooperativeMemberLoansComponent,
    CooperativeMemberGroupDashboardComponent,
    CooperativeLoanGroupsComponent,
    CooperativeGroupJoinHistoryComponent,
    MainDashboardComponent,
    EmployeeLoanDetailsModalComponent,
    SortableTableDirective,
    LeaveTimelineComponent,
    JoinCooperativeGroupComponent,
    MonthlyattendancelistComponent,
    EmployeesummaryComponent,
    MonthlysummaryComponent,
    AttendancetableComponent,
    AttendancefilterComponent,
    AttendancesummaryComponent,
    JopOpeningsComponent,
    ShiftListComponent,
    ShiftFormComponent,
    ShiftAssignmentComponent,
    ShiftCalendarComponent,
    EmployeePaymentHistoryComponent,
    EmployeePaymentHistoryPageComponent,
    LoanPurposeManagementComponent,
    AdHocComponent,
    QueryComponent,
    PayrolExtrasComponent,
    GracePeriodRequestsComponent,
    LoanGracePeriodRequestsManagementComponent,
    CooperativeGracePeriodRequestsManagementComponent,
    CooperativeLoanPurposeManagementComponent,
    CooperativeRepaymentScheduleComponent,
    CooperativePaymentModalComponent,
    LoanPaymentModalComponent,
    EmployeePaymentReminderComponent,
    CooperativeLoanReportsComponent,
    CooperativeLoanDisbursementUiComponent,
    CooperativeMemberLoanHistoryComponent,
    MyScheduleComponent,
    MySchedulesComponent,
    CooperativePatronageDistributionComponent,
    ProductivityWorkspaceComponent,
    InterviewResponseComponent,
    InviteModalComponent,
    ProfileChangeRequestsComponent,
    BankDetailsChangeRequestComponent,
    NokChangeRequestComponent,
    GuarantorChangeRequestComponent,
    EmployeeChangeRequestsDashboardComponent,
    EmployeeChangeRequestsSummaryComponent,
    HrSettingsComponent,
    HrAnalyticsDashboardComponent,
    OvertimeManagementComponent,
    OrgChartComponent,
    HrReportsComponent,
    HrLettersComponent,
    UserProfileComponent,
    PayrollCorrectionComponent,
    BonusDisbursementComponent,
    // FooterComponent,
  ],
  imports: [
    BrowserModule,
    CommonModule,
    AppHrRoutingModule,
    LargeSideModalComponent,
    FormsModule,
    ReactiveFormsModule,
    TableComponent,
    HttpClientModule,
    TableModule,
    // RouterModule.forChild([], {
    //   bindToComponentInputs: true,
    //   enableTracing: false,
    //   useHash: false,
    // }),
    RippleModule,
    DialogModule,
    CalendarModule,
    ToastModule,
    SidebarModule,
    TabViewModule,
    ToolbarModule,
    ConfirmDialogModule,
    SplitButtonModule,
    PanelModule,
    DividerModule,
    TagModule,
    DropdownModule,
    OverlayPanelModule,
    StepperModule,
    InputTextModule,
    FloatLabelModule,
    RadioButtonModule,
    MultiSelectModule,
    EditorModule,
    MessagesModule,
    MessageModule,
    MatExpansionModule,
    MatRadioModule,
    MatPaginatorModule,
    MatTableModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTabsModule,
    MatDatepickerModule,
    MatSelectModule,
    MatTooltipModule,
    MatButtonModule,
    MatDividerModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    PasswordModule,
    ButtonModule,
    NgSelectModule,
    DragDropModule,
    FullCalendarModule,
    NgApexchartsModule,
    BackButtonModule,
    MenuModule,
    AutoCompleteModule,
    CooperativeGracePeriodRequestFormModule,
    EmployeeRelativesWidgetComponent,
    TimeFormatPipe,
    ToastComponent,
    // Standalone. Without these two here <app-table> resolves to an unknown
    // element and NO_ERRORS_SCHEMA swallows the error, so the table silently
    // renders nothing.
    TableComponent,
    TableBodyDirective,
  ],
  schemas: [NO_ERRORS_SCHEMA],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorToastInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: DateConversionInterceptor,
      multi: true,
    },
    {
      provide: JWT_OPTIONS,
      useValue: JWT_OPTIONS,
    },
    JwtHelperService,
    ConfirmationService,
    MessageService,
  ],
  bootstrap: [AppHrComponent],
})
export class AppHrModule { }