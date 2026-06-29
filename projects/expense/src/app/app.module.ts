import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HTTP_INTERCEPTORS, HttpClientModule, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Feature components (non-standalone, declared here)
import { AddPerDiemComponent } from './ui/view/add-per-diem/add-per-diem.component';
import { ExpenseApprovalComponent } from './ui/view/expense-approval/expense-approval.component';
import { ExpenseFormsModalComponent } from './ui/view/expense-forms-modal/expense-forms-modal.component';
import { ExpenseSummaryComponent } from './ui/view/expense-summary/expense-summary.component';
import { ExpenseTableComponent } from './ui/view/expense-table/expense-table.component';
import { UploadRecieptComponent } from './ui/view/upload-reciept/upload-reciept.component';
import { ExpensesComponent } from './ui/view/expenses.component';
import { ApprovalReportsComponent } from './ui/view/approval-reports/approval-reports.component';
import { TaxReportComponent } from './ui/view/tax-report/tax-report.component';
import { MobileCheckoutComponent } from './ui/view/mobile-checkout/mobile-checkout.component';
import { ReimbursementComponent } from './ui/view/reimbursement/reimbursement.component';
import { DisbursementComponent } from './ui/view/disbursement/disbursement.component';
import { RecurringPaymentModalComponent } from './ui/sharedComponent/view/recurring-payment-modal/recurring-payment-modal.component';

// Standalone components (standalone: true → imported, not declared)
import { BackButtonComponent } from './ui/sharedComponent/view/back-button/back-button.component';
import { ButtonComponent } from './ui/sharedComponent/view/button/button.component';
import { SideModalComponent } from './ui/sharedComponent/view/side-modal/side-modal.component';

// PrimeNG modules
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
import { InputNumberModule } from 'primeng/inputnumber';
import { ChartModule } from 'primeng/chart';
import { NgApexchartsModule } from 'ng-apexcharts';

// Angular Material modules
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
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';

import { NgSelectModule } from '@ng-select/ng-select';
import { BillSplittingModalComponent } from './ui/sharedComponent/view/bill-splitting-modal/bill-splitting-modal.component';
import { JWT_OPTIONS, JwtHelperService, JwtModule } from '@auth0/angular-jwt';
import { MessageService } from 'primeng/api';
import { AuthInterceptor } from './ui/sharedComponent/service/auth-service/auth.interceptor.service';
import { SafeUrlPipe } from './ui/sharedComponent/safe-url.pipe';

@NgModule({
  declarations: [
    AppComponent,
    AddPerDiemComponent,
    UploadRecieptComponent,
    ExpensesComponent,
    ApprovalReportsComponent,
    DisbursementComponent,
    TaxReportComponent,
    MobileCheckoutComponent,
    BillSplittingModalComponent
  ],
  imports: [
    // BrowserModule,
    // BrowserAnimationsModule,
    CommonModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    RouterModule,
    HttpClientModule,

    //  Configure JwtModule to provide JwtHelperService
    JwtModule.forRoot({
      config: {
        tokenGetter: tokenGetter,
        allowedDomains: ['be.optimaxsuites.com'], 
        disallowedRoutes: [],
      },
    }),

    // PrimeNG
    ButtonModule,
    EditorModule,
    PasswordModule,
    TableModule,
    ToastModule,
    SidebarModule,
    DialogModule,
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
    MessagesModule,
    MessageModule,
    RippleModule,
    InputNumberModule,
    ChartModule,

    // Angular Material
    MatDialogModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatExpansionModule,
    MatDatepickerModule,
    MatSelectModule,
    MatTooltipModule,
    MatButtonModule,
    MatMenuModule,
    MatTabsModule,
    MatDividerModule,
    MatRadioModule,
    MatAutocompleteModule,
    MatPaginatorModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatGridListModule,

    // NgSelect
    NgSelectModule,
    NgApexchartsModule,

    // Standalone components
    BackButtonComponent,
    ButtonComponent,
    SideModalComponent,
    ExpenseTableComponent,
    ReimbursementComponent,
    ExpenseApprovalComponent,
    ExpenseFormsModalComponent,
    ExpenseSummaryComponent,
    RecurringPaymentModalComponent,
    SafeUrlPipe
  ],

   providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    {
      provide: JWT_OPTIONS,
      useValue: JWT_OPTIONS,
    },
    JwtHelperService,
    provideHttpClient(withInterceptorsFromDi()),
    MessageService,

  ],

  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})
export class AppModule {}

export function tokenGetter() {
  return (
    sessionStorage.getItem('Token') ||
    sessionStorage.getItem('token') ||
    sessionStorage.getItem('accessToken') ||
    localStorage.getItem('Token') ||
    localStorage.getItem('Token2') ||
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('accessToken2')
  );
}

export { AppModule as AppExpensesModule };
