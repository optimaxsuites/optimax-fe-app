import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

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



import { NgSelectModule } from '@ng-select/ng-select';
import { PayslipViewComponent } from './ui/view/dashboard-page/payslip-view/payslip-view.component';
import { EmployeePayslipsListComponent } from './ui/view/employee-payslips-list/employee-payslips-list.component';
import { LargeSideModalComponent } from './ui/sharedComponent/view/large-side-modal/large-side-modal.component';
import { DashboardPageComponent } from './ui/view/dashboard-page/dashboard-page.component';



@NgModule({
  declarations: [
    AppComponent,
    PayslipViewComponent,
    EmployeePayslipsListComponent,
    DashboardPageComponent
  ],
  imports: [
    // BrowserModule,
    CommonModule,
    AppRoutingModule,
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
  bootstrap: [AppComponent]
})
export class AppDashboardModule { }
