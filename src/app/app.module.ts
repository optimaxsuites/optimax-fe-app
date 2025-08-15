import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AddPerDiemComponent } from './ui/view/add-per-diem/add-per-diem.component';
import { ExpenseApprovalComponent } from './ui/view/expense-approval/expense-approval.component';
import { ExpenseFormsModalComponent } from './ui/view/expense-forms-modal/expense-forms-modal.component';
import { ExpenseSummaryComponent } from './ui/view/expense-summary/expense-summary.component';
import { ExpenseTableComponent } from './ui/view/expense-table/expense-table.component';
import { UploadRecieptComponent } from './ui/view/upload-reciept/upload-reciept.component';
import { ExpensesComponent } from './ui/view/expenses.component';

///////primeng
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
import { PrimeIcons, MenuItem } from 'primeng/api';



/////////////mat
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabGroup, MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatRadioModule } from '@angular/material/radio';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';




////////////////
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BackButtonComponent } from './ui/sharedComponent/view/back-button/back-button.component';
import { ButtonComponent } from './ui/sharedComponent/view/button/button.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { CommonModule } from '@angular/common';
import { ApprovalReportsComponent } from './ui/view/approval-reports/approval-reports.component';
import { ChartModule } from 'primeng/chart';
import { SideModalComponent } from "./ui/sharedComponent/view/side-modal/side-modal.component";
import { ReimbursementComponent } from './ui/view/reimbursement/reimbursement.component';
import { DisbursementComponent } from './ui/view/disbursement/disbursement.component';





@NgModule({
  declarations: [
    AppComponent,
    AddPerDiemComponent,
    ExpenseApprovalComponent,
    ExpenseFormsModalComponent,
    ExpenseSummaryComponent,
    ExpenseTableComponent,
    UploadRecieptComponent,
    ExpensesComponent,
    ApprovalReportsComponent,
    ReimbursementComponent,
    DisbursementComponent,
    
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    CommonModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    MatTabGroup,
    MatTooltip,
    MatGridListModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTabsModule,
    MatDatepickerModule,
    MatSelectModule,
    MatTooltipModule,
    MatButtonModule,
    MatTabsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatAutocompleteModule,
    MatExpansionModule,
    MatRadioModule,
    MatPaginatorModule,
    MatTableModule,
    MatRadioModule,
    MatMenuModule,
    NgSelectModule,
    SidebarModule,
    TabViewModule,
    ToolbarModule,
    ChartModule,
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
    ToastModule,
    ButtonModule,
    BackButtonComponent,
    ButtonComponent,
    SideModalComponent
],
  providers: [],
  bootstrap: [AppComponent],


})
export class AppExpensesModule { }
