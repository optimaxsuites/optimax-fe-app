import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { DialogModule } from '@angular/cdk/dialog';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
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
import { NgSelectComponent, NgSelectModule } from '@ng-select/ng-select';
import { MatRippleModule } from '@angular/material/core';
import { CalendarModule } from 'primeng/calendar';
import { MultiSelectModule } from 'primeng/multiselect';
import { AngularEditorModule } from '@kolkov/angular-editor';

////primeng
import { ButtonModule } from 'primeng/button';
import { EditorModule } from 'primeng/editor';
import { PasswordModule } from 'primeng/password';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { SidebarModule } from 'primeng/sidebar';
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
import { RadioButtonModule } from 'primeng/radiobutton';
import { ButtonComponent } from './ui/shared-component/view/button/button.component';
import { ProfileCardComponent } from './ui/shared-component/view/profile-card/profile-card.component';
import { ProfileInfoComponent } from './ui/shared-component/view/profile-info/profile-info.component';
import { UserInterfaceComponent } from './ui/shared-component/view/user-interface/user-interface.component';
import { SideModalComponent } from './ui/shared-component/view/side-modal/side-modal.component';
import { BackButtonComponent } from './ui/shared-component/view/back-button/back-button.component';
import { TableComponent } from './ui/shared-component/view/table/table.component';
import { SidebarComponent } from './ui/shared-component/view/sidebar/sidebar.component';
import { ModalComponent } from './ui/shared-component/view/modal/modal.component';

import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { JwtHelperService, JWT_OPTIONS } from '@auth0/angular-jwt';
import { AuthInterceptor } from './ui/shared-component/service/auth-service/auth.interceptor.service';
import { ErrorToastInterceptor } from './ui/shared-component/service/error-message/error-toast.interceptor';

import { NavTabComponent } from './ui/shared-component/view/nav-tab/nav-tab.component';

import { ProductRequestListComponent } from './ui/view/request-management/product-request-management/product-request-list/product-request-list.component';
import { RequestManagementComponent } from './ui/view/request-management/request-management.component';
import { ProductRequestFormComponent } from './ui/view/request-management/product-request-management/product-request-form/product-request-form.component';
import { ProductRequestDetailComponent } from './ui/view/request-management/product-request-management/product-request-detail/product-request-detail.component';
import { RequestEditFormComponent } from './ui/view/request-management/product-request-management/request-edit-form/request-edit-form.component';
import { DeliveryTrackingMapComponent } from './ui/view/request-management/product-request-management/delivery-tracking-map/delivery-tracking-map.component';
import { VendorRatingComponent } from './ui/view/request-management/product-request-management/vendor-rating/vendor-rating.component';
import { RequestDraftsComponent } from './ui/view/request-management/product-request-management/request-drafts/request-drafts.component';
import { RequestReorderComponent } from './ui/view/request-management/product-request-management/request-reorder/request-reorder.component';
import { NotificationCenterComponent } from './ui/view/request-management/product-request-management/notification-center/notification-center.component';
import { ExportDropdownComponent } from './ui/view/request-management/product-request-management/export-dropdown/export-dropdown.component';
import { ServiceRequestListComponent } from './ui/view/request-management/service-request-management/service-request-list/service-request-list.component';
import { ServiceRequestFormComponent } from './ui/view/request-management/service-request-management/service-request-form/service-request-form.component';  
import { OrderDetailComponent } from './ui/view/request-management/product-request-management/order-detail/order-detail.component';
import { ApprovalInboxComponent } from './ui/view/approval-inbox/approval-inbox.component';
import { DashboardComponent } from './ui/view/vendor-portal/dashboard/dashboard.component';
import { FinanceComponent } from './ui/view/vendor-portal/finance/finance.component';
import { LpoComponent } from './ui/view/vendor-portal/lpo/lpo.component';
import { VendorPortalComponent } from './ui/view/vendor-portal/vendor-portal.component';
import { SalesDashboardComponent } from './ui/view/sales-hub/sales-dashboard/sales-dashboard.component';
import { ProductServiceCatalogComponent } from './ui/view/sales-hub/product-service-catalog/product-service-catalog.component';
import { CustomerManagementComponent } from './ui/view/sales-hub/customer-management/customer-management.component';
import { DeliveryManagementComponent } from './ui/view/sales-hub/delivery-management/delivery-management.component';
import { PaymentProcessingComponent } from './ui/view/sales-hub/payment-processing/payment-processing.component';
import { SalesOrdersComponent } from './ui/view/sales-hub/sales-orders/sales-orders.component';
import { SalesHubComponent } from './ui/view/sales-hub/sales-hub.component';
import { QuoteFormComponent } from './ui/view/sales-hub/quotations/quote-form/quote-form.component';
import { QuoteDetailComponent } from './ui/view/sales-hub/quotations/quote-detail/quote-detail.component';
import { PerformanceComponent } from './ui/view/vendor-portal/performance/performance.component';
import { DocumentsComponent } from './ui/view/vendor-portal/documents/documents.component';
import { InvoiceFormComponent } from './ui/view/sales-hub/invoices/invoice-form/invoice-form.component';
import { InvoiceListComponent } from './ui/view/sales-hub/invoices/invoice-list/invoice-list.component';
import { InvoiceDetailComponent } from './ui/view/sales-hub/invoices/invoice-detail/invoice-detail.component';

@NgModule({
  declarations: [
    App,
    TableComponent,
    ModalComponent,
    SideModalComponent,
    SidebarComponent,
    NavTabComponent,
    ProductRequestListComponent,
    ServiceRequestListComponent,
    RequestManagementComponent,
    NotificationCenterComponent,
    DashboardComponent,
    FinanceComponent,
    LpoComponent,
    VendorPortalComponent,
    // SalesDashboardComponent,
    CustomerManagementComponent,
    DeliveryManagementComponent,
    PaymentProcessingComponent,
    SalesOrdersComponent,
    SalesHubComponent,
    ProductServiceCatalogComponent,
    QuoteDetailComponent,
    PerformanceComponent,
    DocumentsComponent,
    InvoiceDetailComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    CommonModule,
    TableModule,
    RippleModule,
    AngularEditorModule,
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
    ApprovalInboxComponent,
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
    ButtonComponent,
    ProfileCardComponent,
    ProfileInfoComponent,
    UserInterfaceComponent,
    BackButtonComponent,
    ProductRequestFormComponent,
    ProductRequestDetailComponent,
    RequestEditFormComponent,
    DeliveryTrackingMapComponent,
    VendorRatingComponent,
    RequestDraftsComponent,
    RequestReorderComponent,
    ExportDropdownComponent,
    ServiceRequestFormComponent,
    OrderDetailComponent,
    QuoteFormComponent,
    InvoiceListComponent,
    InvoiceFormComponent,
  ],
  exports: [TableComponent],
  providers: [
    // provideBrowserGlobalErrorListeners()
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
    DecimalPipe
  ],
  bootstrap: [App]
})
export class AppModule {}
