import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
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

import { NgSelectComponent, NgSelectModule } from '@ng-select/ng-select';
import { FullCalendarModule } from '@fullcalendar/angular';

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
import { BackButtonComponent } from './ui/shared-component/view/back-button/back-button.component';
import { ButtonComponent } from './ui/shared-component/view/button/button.component';
import { CareerJobPostingComponent } from './ui/shared-component/view/career-job-posting/career-job-posting.component';
import { DashboardFooterComponent } from './ui/shared-component/view/dashboard-footer/dashboard-footer.component';
import { TableComponent } from './ui/shared-component/view/table/table.component';
import { TableBodyDirective } from './ui/shared-component/view/table/table-body.directive';
import { InterviewInviteComponent } from './ui/view/recruitment/interview-invite/interview-invite.component';
import { OfferLetterComponent } from './ui/view/recruitment/offer-letter/offer-letter.component';
import { AppointmentLetterComponent } from './ui/view/recruitment/appointment-letter/appointment-letter.component';
import { InterviewScoreSheetComponent } from './ui/view/recruitment/interview-score-sheet/interview-score-sheet.component';
import { AddEmployeeFormComponent } from './ui/view/employee-management/add-employee-form/add-employee-form.component';
import { EmployeeOnboardingFormComponent } from './ui/view/employee-management/employee-onboarding-form/employee-onboarding-form.component';
import { LeaveUsageComponent } from './ui/view/leave/leave-usage/leave-usage.component';
import { LeaveRequestComponent } from './ui/view/leave/leave-request/leave-request.component';
import { LeavePlanComponent } from './ui/view/leave/leave-plan/leave-plan.component';
import { LeavePlanningDashboardComponent } from './ui/view/leave/leave-planning-dashboard/leave-planning-dashboard.component';
import { ApplyComponent } from './ui/view/leave/apply/apply.component';
import { Navbar2Component } from './ui/shared-component/view/navbar/navbar2.component';
import { PerformanceComponent } from './ui/view/performance/performance.component';
import { AppraisallistComponent } from './ui/view/performance/appraisallist/appraisallist.component';
import { AppraisalcycleComponent } from './ui/view/performance/appraisalcycle/appraisalcycle.component';
import { AssignLeaveComponent } from './ui/view/leave/assign-leave/assign-leave.component';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { AttendanceSheetsComponent } from './ui/view/attendance/attendance-sheet/attendance-sheet.component';
import { NotificationComponent } from './ui/view/attendance/notification/notification.component';
import { TimeSheetComponent } from './ui/view/attendance/time-sheet/time-sheet.component';
import { MyAttendanceComponent } from './ui/view/attendance/my-attendance/my-attendance.component';
import { EmployeePayrollComponent } from './ui/view/payroll/employee-payroll/employee-payroll.component';
import { EmployeePayslipListComponent } from './ui/view/payroll/employee-payslip-list/employee-payslip-list.component';
import { PayslipViewComponent } from './ui/view/payroll/payslip-view/payslip-view.component';
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
import { MasterComponent } from './master.component';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from './ui/view/sidebar/sidebar.component';
import { AppraisalComponent } from './ui/view/performance/appraisal/appraisal.component';
import { LeavePolicyComponent } from './ui/view/leave/leave-policy/leave-policy.component';
import { AttendashboardComponent } from './ui/view/attendance/admin/attendashboard/attendashboard.component';
import { StatsCardsComponent } from './ui/view/attendance/admin/attendashboard/stats-cards/stats-cards.component';
import { HeatmapComponent } from './ui/view/attendance/admin/attendashboard/heatmap/heatmap.component';
import { LateArrivalsComponent } from './ui/view/attendance/admin/attendashboard/late-arrivals/late-arrivals.component';
// import { AttendancetableComponent } from './ui/view/attendance/admin/attendancetable/attendancetable.component';
// import { AttendancefilterComponent } from './ui/view/attendance/admin/attendancetable/attendancefilter/attendancefilter.component';
// import { AttendancesummaryComponent } from './ui/view/attendance/admin/attendancesummary/attendancesummary.component';
import { OfficeHoursComponent } from './ui/view/attendance/admin/attendashboard/office-hours/office-hours.component';
import { EmployeedashboardComponent } from './ui/view/attendance/employee/employeedashboard/employeedashboard.component';
import { TodaySummaryComponent } from './ui/view/attendance/employee/employeedashboard/today-summary/today-summary.component';
import { CheckinCheckoutComponent } from './ui/view/attendance/employee/employeedashboard/checkin-checkout/checkin-checkout.component';
// import { EmployeesummaryComponent } from './ui/view/attendance/employee/employeesummary/employeesummary.component';
// import { MonthlysummaryComponent } from './ui/view/attendance/employee/employeesummary/monthlysummary/monthlysummary.component';
import { CorrectionrequestComponent } from './ui/view/attendance/employee/correctionrequest/correctionrequest.component';
import { CorrectionrequestformComponent } from './ui/view/attendance/employee/correctionrequest/correctionrequestform/correctionrequestform.component';
// import { MonthlyattendancelistComponent } from './ui/view/attendance/employee/employeesummary/monthlyattendancelist/monthlyattendancelist.component';
import { AdminCorrectionsComponent } from './ui/view/attendance/admin/admin-corrections/admin-corrections.component';
import { CalendarModule } from 'primeng/calendar';
import { AttendanceDetailsComponent } from './ui/view/attendance/attendance-details/attendance-details.component';
import { ProjectComponent } from './ui/view/project/project.component';
import { ProjectDetailComponent } from './ui/view/project/project-list/project-detail/project-detail.component';
import { ProjectListComponent } from './ui/view/project/project-list/project-list.component';
import { MyProjectComponent } from './ui/view/project/my-project/my-project.component';
import { MyProjectDetailComponent } from './ui/view/project/my-project/my-project-detail/my-project-detail.component';
import { MySchedulesComponent } from './ui/view/scheduling/scheduling/my-schedules/my-schedules.component';
import { CreateProjectComponent } from './ui/view/project/project-list/create-project/create-project.component';
import { SchedulesComponent } from './ui/view/scheduling/scheduling/schedules/schedules.component';
import { SchedulingComponent } from './ui/view/scheduling/scheduling/scheduling.component';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MultiSelectModule } from 'primeng/multiselect';
import { AdminexportComponent } from './ui/view/attendance/admin/attendashboard/adminexport/adminexport.component';
import { LoanBalanceIndicatorsComponent } from './ui/view/loan-management/loan-balance-indicators/loan-balance-indicators.component';
import { RepaymentScheduleViewComponent } from './ui/view/loan-management/repayment-schedule-view/repayment-schedule-view.component';
import { LoanRequestFormComponent } from './ui/view/loan-management/loan-request-form/loan-request-form.component';
import { LoanDashboardComponent } from './ui/view/loan-management/loan-dashboard/loan-dashboard.component';
import { EmployeeLoanHistoryComponent } from './ui/view/loan-management/employee-loan-history/employee-loan-history.component';
import { EmployeeDashboardComponent } from './ui/view/loan-management/employee-loan-dashboard/employee-loan-dashboard.component';
import { LoanApprovalUiComponent } from './ui/view/loan-management/loan-approval-ui/loan-approval-ui.component';
import { LoanDetailsComponent } from './ui/view/loan-management/loan-details/loan-details.component';
import { StatusTrackingComponent } from './ui/view/loan-management/status-tracking/status-tracking.component';
import { LoanComponent } from './ui/view/loan-management/loan.component';
import { EmployeeRepaymentScheduleComponent } from './ui/view/loan-management/employee-repayment-schedule/employee-repayment-schedule.component';
import { LoanReportsComponent } from './ui/view/loan-management/loan-reports/loan-reports.component';
import { LoanDisbursementUiComponent } from './ui/view/loan-management/loan-disbursement-ui/loan-disbursement-ui.component';
import { CooperativeDashboardComponent } from './ui/view/loan-management/cooperative-dashboard/cooperative-dashboard.component';
import { CooperativeLoansComponent } from './ui/view/loan-management/cooperative-loans/cooperative-loans.component';
import { CooperativeLoanDetailComponent } from './ui/view/loan-management/cooperative-loan-detail/cooperative-loan-detail.component';
import { CooperativeLoanApplicationComponent } from './ui/view/loan-management/cooperative-loan-application/cooperative-loan-application.component';
import { CooperativeMembersComponent } from './ui/view/loan-management/cooperative-members/cooperative-members.component';
import { CooperativeMemberDetailComponent } from './ui/view/loan-management/cooperative-member-detail/cooperative-member-detail.component';
import { CooperativeMemberFormComponent } from './ui/view/loan-management/cooperative-member-form/cooperative-member-form.component';
import { QueryComponent } from './ui/view/query/query.component';
import { EmployeeProfileDashboardComponent } from './ui/view/employee-dashboard/employee-profile-dashboard.component';
import { CooperativeMemberDashboardComponent } from './ui/view/loan-management/cooperative-member-dashboard/cooperative-member-dashboard.component';
import { CooperativeMemberLoansComponent } from './ui/view/loan-management/cooperative-member-loans/cooperative-member-loans.component';
import { CooperativeLoanGroupsComponent } from './ui/view/loan-management/cooperative-loan-groups/cooperative-loan-groups.component';
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
import { WorkscheduleShiftsComponent } from './ui/view/workschedule-shifts/workschedule-shifts.component';
import { JoinCooperativeGroupComponent } from './ui/view/loan-management/join-cooperative-group/join-cooperative-group.component';

@NgModule({
  declarations: [
    AppHrComponent,
    RecruitmentComponent,
    LeaveComponent,
    AttendanceComponent,
    EmployeeManagementComponent,
    RecruitmentListComponent,
    RecruitmentFormComponent,
    CandidateComponent,
    ScheduledInterviewComponent,
    BackButtonComponent,
    InterviewInviteComponent,
    OfferLetterComponent,
    AppointmentLetterComponent,
    InterviewScoreSheetComponent,
    AddEmployeeFormComponent,
    EmployeeOnboardingFormComponent,
    LeaveUsageComponent,
    LeaveRequestComponent,
    LeavePlanComponent,
    LeavePlanningDashboardComponent,
    AssignLeaveComponent,
    ApplyComponent,
    PerformanceComponent,
    AppraisallistComponent,
    AppraisalcycleComponent,
    AttendanceSheetsComponent,
    NotificationComponent,
    TimeSheetComponent,
    MyAttendanceComponent,
    EmployeePayrollComponent,
    EmployeePayslipListComponent,
    PayslipViewComponent,
    AdminCreationFormComponent,
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
    TableComponent,
    TableBodyDirective,
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
    HeatmapComponent,
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
    ProjectComponent,
    ProjectDetailComponent,
    ProjectListComponent,
    MyProjectComponent,
    MyProjectDetailComponent,
    MySchedulesComponent,
    CreateProjectComponent,
    SchedulesComponent,
    SchedulingComponent,
    AdminexportComponent,
    LoanBalanceIndicatorsComponent,
    RepaymentScheduleViewComponent,
    LoanRequestFormComponent,
    LoanDashboardComponent,
    EmployeeLoanHistoryComponent,
    EmployeeDashboardComponent,
    LoanApprovalUiComponent,
    LoanBalanceIndicatorsComponent,
    LoanDetailsComponent,
    StatusTrackingComponent,
    LoanComponent,
    EmployeeRepaymentScheduleComponent,
    LoanReportsComponent,
    LoanDisbursementUiComponent,
    CooperativeDashboardComponent,
    CooperativeLoansComponent,
    CooperativeLoanDetailComponent,
    CooperativeLoanApplicationComponent,
    CooperativeMembersComponent,
    CooperativeMemberDetailComponent,
    CooperativeMemberFormComponent,
    EmployeeProfileDashboardComponent,
    CooperativeMemberDashboardComponent,
    CooperativeMemberLoansComponent,
    CooperativeLoanGroupsComponent,
    MainDashboardComponent,
    EmployeeLoanDetailsModalComponent,
    SortableTableDirective,
    QueryComponent,
    LeaveTimelineComponent,
    JoinCooperativeGroupComponent,
    MonthlyattendancelistComponent,
    EmployeesummaryComponent,
    MonthlysummaryComponent,
    AttendancetableComponent,
    AttendancefilterComponent,
    AttendancesummaryComponent,
    JopOpeningsComponent,
    WorkscheduleShiftsComponent,
    ShiftListComponent,
    ShiftFormComponent,
    ShiftAssignmentComponent,
    ShiftCalendarComponent,
  ],

  imports: [
    // BrowserModule,
    // BrowserAnimationsModule,
    AppHrRoutingModule,
    CommonModule,
    TableModule,
    RouterModule,
    RippleModule,
    DialogModule,
    CalendarModule,
    ToastModule,
    FormsModule,
    ReactiveFormsModule,
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
    RippleModule,
    TableModule,
    MatExpansionModule,
    MatRadioModule,
    MatPaginatorModule,
    MatTableModule,
    MatRadioModule,
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
    PasswordModule,
    ButtonModule,
    NgSelectModule,
    FullCalendarModule,
    LargeSideModalComponent,
    FooterComponent,
  ],
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
      provide: JWT_OPTIONS,
      useValue: JWT_OPTIONS,
    },
    JwtHelperService,
    provideHttpClient(withInterceptorsFromDi()),
    ConfirmationService,
    MessageService,
  ],
  bootstrap: [AppHrComponent],
})
export class AppHrModule {}
