import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CommonModule } from '@angular/common';

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
import { NgApexchartsModule } from 'ng-apexcharts';

import { NgSelectModule } from '@ng-select/ng-select';
import { PayslipViewComponent } from './ui/view/dashboard-page/payslip-view/payslip-view.component';
import { EmployeePayslipsListComponent } from './ui/view/employee-payslips-list/employee-payslips-list.component';
import { LargeSideModalComponent } from './ui/sharedComponent/view/large-side-modal/large-side-modal.component';
import { DashboardPageComponent } from './ui/view/dashboard-page/dashboard-page.component';
import { SideModalComponent } from './ui/sharedComponent/view/side-modal/side-modal.component';

import { DragDropModule } from '@angular/cdk/drag-drop';
import { DashboardOverviewComponent } from './dashboard-overview/dashboard-overview.component';
import { DashboardsideModalComponent } from './shared/dashboardside-modal/dashboardside-modal.component';
import { GeneraldashboardComponent } from './generaldashboard/generaldashboard.component';
import { DashboardDropdownComponent } from './shared/dashboard-dropdown/dashboard-dropdown.component';
import { HrDashboardComponent } from './hr-dashboard/hr-dashboard.component';
import {
  HTTP_INTERCEPTORS,
  HttpClient,
  HttpClientModule,
} from '@angular/common/http';
// import { AuthInterceptor } from './ui/services/auth.interceptor.service';
import {
  JWT_OPTIONS,
  JwtHelperService,
} from './ui/sharedComponent/service/auth-service/auth0-shim';
import { AuthInterceptor } from './ui/sharedComponent/service/auth-service/auth.interceptor.service';
import { OptimaxaiComponent } from './optimax-ai/optimax-ai.component';
import { CommunicationComponent } from './communication/communication.component';
import { AnalyticsComponent } from './analytics/analytics.component';
// import { MarkdownPipe } from './optimax-ai/optimax-ai.component';
import { MarkdownModule } from 'ngx-markdown';

@NgModule({
  declarations: [
    AppComponent,
    PayslipViewComponent,
    EmployeePayslipsListComponent,
    DashboardPageComponent,
    DashboardOverviewComponent,
    DashboardsideModalComponent,
    DashboardDropdownComponent,
    GeneraldashboardComponent,
    HrDashboardComponent,
    SideModalComponent,
    OptimaxaiComponent,
    CommunicationComponent,
    AnalyticsComponent,
  ],
  imports: [
    MarkdownModule.forRoot(),
    BrowserModule,
    CommonModule,
    AppRoutingModule,
    TableModule,
    RippleModule,
    DialogModule,
    ToastModule,
    DragDropModule,
    FormsModule,
    ReactiveFormsModule,
    SidebarModule,
    TabViewModule,
    ToolbarModule,
    ConfirmDialogModule,
    HttpClientModule,
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
    PasswordModule,
    ButtonModule,
    NgSelectModule,
    NgApexchartsModule,
    BrowserAnimationsModule,
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    {
      provide: JWT_OPTIONS,
      useValue: {},
    },
    JwtHelperService,
    DashboardOverviewComponent,
  ],
  bootstrap: [AppComponent],
})
export class AppDashboardModule {}
