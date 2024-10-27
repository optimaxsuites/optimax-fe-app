import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';

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
import { RippleModule } from 'primeng/ripple';

import { NgSelectModule } from '@ng-select/ng-select';


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
    NavTabComponent,
    SideModalComponent,
    ModalComponent,
    BackButtonComponent,
    ButtonComponent,
    CareerJobPostingComponent,
    DashboardFooterComponent,
  ],
  imports: [
    // BrowserModule,
    AppHrRoutingModule,
    CommonModule,
    TableModule,
    RippleModule,
    DialogModule,
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
      OverlayPanelModule,
      StepperModule,
      InputTextModule,
      FloatLabelModule,
      EditorModule,
      MessagesModule,
      MessageModule,
      RippleModule,
      TableModule,
      PasswordModule,
      ButtonModule,
      NgSelectModule,

    LargeSideModalComponent
  ],
  providers: [],
  bootstrap: [AppHrComponent]
})
export class AppHrModule { }
