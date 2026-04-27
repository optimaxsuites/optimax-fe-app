import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ProcurementPageComponent } from './ui/view/procurement.page.component';
import { NavTabComponent } from './ui/sharedComponent/view/nav-tab/nav-tab.component';
import { ButtonComponent } from './ui/sharedComponent/view/button/button.component';
import { SideModalComponent } from './ui/sharedComponent/view/side-modal/side-modal.component';

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
import { TagModule } from 'primeng/tag';

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
import { NgSelectModule } from '@ng-select/ng-select';
import { CommonModule } from '@angular/common';
import { ModalComponent } from './ui/sharedComponent/view/modal/modal.component';
import { HTTP_INTERCEPTORS, HttpClientModule, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { LargeSideModalComponent } from './ui/sharedComponent/view/large-side-modal/large-side-modal.component';
import { RfqComponent } from './ui/view/vendor-portal/rfq/rfq.component';
import { QuotationComponent } from './ui/view/quotation/quotation.component';
import { ProformaInvoiceComponent } from './ui/view/proforma-invoice/proforma-invoice.component';
import { InvoiceComponent } from './ui/view/invoice/invoice.component';
import { DispatchNoteComponent } from './ui/view/dispatch-note/dispatch-note.component';
import { RfqFormComponent } from './ui/view/rfq-form/rfq-form.component';
import { AddQuotationItemComponent } from './ui/view/quotation/add-quotation-item/add-quotation-item.component';
import { VendorPageComponent } from './ui/view/vendor/vendor-page.component';
import { VendorQuoteFormComponent } from './ui/view/vendor-portal/vendor-quote-form/vendor-quote-form.component';
import { VendorQuoteListComponent } from './ui/view/vendor-portal/vendor-quote-list/vendor-quote-list.component';
import { VendorRfqListComponent } from './ui/view/vendor/vendor-rfq-list/vendor-rfq-list.component';
import { PurchaseReqManagementComponent } from './ui/view/purchase-req-management/purchase-req-management.component';
import { PrCreateComponent } from './ui/view/purchase-req-management/pr-create/pr-create.component';
import { PrApprovalInboxComponent } from './ui/view/purchase-req-management/pr-approval-inbox/pr-approval-inbox.component';

import { MultiSelectModule } from 'primeng/multiselect';
import { FileUploadModule } from 'primeng/fileupload';
import { DropdownModule } from 'primeng/dropdown';

import { MessageService } from 'primeng/api';
import { VendorStatusBadgeComponent } from './ui/sharedComponent/view/vendor-status-badge/vendor-status-badge.component';
import { VendorCategorySelectComponent } from './ui/sharedComponent/view/vendor-category-select/vendor-category-select.component';
import { ComplianceDocumentUploadComponent } from './ui/sharedComponent/view/compliance-document-upload/compliance-document-upload.component';
import { VendorListComponent } from './ui/view/vendor-management/vendor-list/vendor-list.component';
import { VendorDetailsComponent } from './ui/view/vendor-management/vendor-details/vendor-details.component';
import { VendorRegistrationComponent } from './ui/view/vendor-management/vendor-registration/vendor-registration.component';
import { VendorApprovalComponent } from './ui/view/vendor-management/vendor-approval/vendor-approval.component';
import { PaginatorModule } from 'primeng/paginator';
import { DashboardComponent } from './ui/view/vendor-portal/dashboard/dashboard.component';

import { NgChartsModule } from 'ng2-charts';
import { NgApexchartsModule } from "ng-apexcharts";
import { ApprovedVendorComponent } from './ui/view/vendor-management/approved-vendor/approved-vendor.component';
import { RejectedVendorComponent } from './ui/view/vendor-management/rejected-vendor/rejected-vendor.component';
import { TableComponent } from './ui/sharedComponent/view/table/table.component';
import { AuthInterceptor } from './ui/sharedComponent/service/auth-service/auth.interceptor.service';
import { JWT_OPTIONS, JwtHelperService } from '@auth0/angular-jwt';
import { SelectButtonModule } from "primeng/selectbutton";
import { VendorProfileFormComponent } from './ui/view/vendor-management/vendor-profile-form/vendor-profile-form.component';
import { PrListComponent } from './ui/view/purchase-req-management/pr-list/pr-list.component';
import { VendorPrListComponent } from './ui/view/vendor-portal/vendor-pr-list/vendor-pr-list.component';
import { PrQuoteReviewComponent } from './ui/view/purchase-req-management/pr-quote-review/pr-quote-review.component';
// import { SelectModule } from 'primeng/select';
import { RecaptchaModule } from 'ng-recaptcha';


@NgModule({
  declarations: [
    AppComponent,
    ProcurementPageComponent,
    RfqComponent,
    QuotationComponent,
    ProformaInvoiceComponent,
    InvoiceComponent,
    DispatchNoteComponent,
    BackButtonComponent,
    ButtonComponent,
    SideModalComponent,
    ModalComponent,
    NavTabComponent,
    RfqFormComponent,
    AddQuotationItemComponent,
    VendorPageComponent,
    VendorQuoteFormComponent,
    VendorQuoteListComponent,
    VendorRfqListComponent,
    PurchaseReqManagementComponent,
    PrCreateComponent,
    PrApprovalInboxComponent,
    VendorStatusBadgeComponent,
    VendorCategorySelectComponent,
    ComplianceDocumentUploadComponent,
    VendorListComponent,
    VendorDetailsComponent,
    VendorRegistrationComponent,
    VendorApprovalComponent,
    DashboardComponent,
    ApprovedVendorComponent,
    RejectedVendorComponent,
    TableComponent,
    VendorProfileFormComponent,
    PrListComponent,
    VendorPrListComponent,
    PrQuoteReviewComponent,
    
  ],
  imports: [
    // BrowserModule,
    // BrowserAnimationsModule,
    CommonModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
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
    TagModule,
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
    LargeSideModalComponent,
    MultiSelectModule,
    FileUploadModule,
    DropdownModule,
    PaginatorModule,
    DialogModule,
    NgChartsModule,
    NgApexchartsModule,
    SelectButtonModule,
    RecaptchaModule
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
})
export class AppModule {}
