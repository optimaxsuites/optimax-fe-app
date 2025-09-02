import { ChartModule } from 'primeng/chart';
import { NgModule, viewChild, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ButtonModule } from 'primeng/button';
import { EditorModule } from 'primeng/editor';
import { PasswordModule } from 'primeng/password';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { SidebarModule } from 'primeng/sidebar';
import { DialogModule } from 'primeng/dialog';

import { TabViewModule } from 'primeng/tabview';
import { BadgeModule } from 'primeng/badge';
import { MenubarModule } from 'primeng/menubar';
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
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LargeSideModalComponent } from './ui/sharedComponent/view/large-side-modal/large-side-modal.component';
import { PosPageComponent } from './ui/view/pos-page.component';
import { CommisionComponent } from './ui/view/commision/commision.component';
import { ConfigurationComponent } from './ui/view/configuration/configuration.component';
import { InventoryComponent } from './ui/view/inventory/inventory.component';
import { ManageUserFormComponent } from './ui/view/manage-user-form/manage-user-form.component';
import { ManageUsersComponent } from './ui/view/manage-users/manage-users.component';
import { ButtonComponent } from './ui/sharedComponent/view/button/button.component';
import { ProductsComponent } from './ui/view/products/products.component';
import { AddProductComponent } from './ui/view/products/add-product/add-product.component';
import { ViewProductComponent } from './ui/view/products/view-product/view-product.component';
import { ModalComponent } from './ui/sharedComponent/view/modal/modal.component';
import { SideModalComponent } from './ui/sharedComponent/view/side-modal/side-modal.component';
import { SearchbarComponent } from './ui/sharedComponent/view/searchbar/searchbar.component';
import { NavTabComponent } from './ui/sharedComponent/view/nav-tab/nav-tab.component';
import {
  HTTP_INTERCEPTORS,
  HttpClientModule,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { UserModule } from './user/user.module';
import { AuthInterceptor } from './ui/sharedComponent/service/auth-service/auth.interceptor.service';

import { JwtHelperService, JWT_OPTIONS } from '@auth0/angular-jwt';
import { NgApexchartsModule } from 'ng-apexcharts';
import { ExcelExportAndImportComponent } from './ui/view/excel-export-and-import/excel-export-and-import.component';
import {
  ReportDashboardComponent,
  SalesSummaryChartOptions,
} from './ui/view/report-dashboard/report-dashboard.component';
import { SalesReportComponent } from './ui/view/report-dashboard/sales-report/sales-report.component';
import { FinanceReportComponent } from './ui/view/report-dashboard/finance-report/finance-report.component';
import { InventoryReportComponent } from './ui/view/report-dashboard/inventory-report/inventory-report.component';
import { ExpensesReportComponent } from './ui/view/report-dashboard/expenses-report/expenses-report.component';
import { CreateReportComponent } from './ui/view/report-dashboard/create-report/create-report.component';
import { EditInventoryComponent } from './ui/view/inventory/edit-inventory/edit-inventory.component';
import { ViewInventoryComponent } from './ui/view/inventory/view-inventory/view-inventory.component';
import { SummaryReportComponent } from './ui/view/report-dashboard/summary-report/summary-report.component';
import { CustomReportComponent } from './ui/view/report-dashboard/custom-report/custom-report.component';
import { InformationComponent } from './ui/view/inventory/information/information.component';

import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { SalesComponent } from './ui/view/sales/sales.component';
import { ChartTableComponent } from './ui/view/report-dashboard/chart-table/chart-table.component';
// import { ChartTableComponent } from './ui/view/report-dashboard/chart-table/chart-table.component';
import { MessageService } from 'primeng/api';
import { RefundComponent } from './ui/view/refund/refund/refund.component';
import { SaleSummaryComponent } from './ui/view/sales/sale-summary/sale-summary.component';
import { BackButtonComponent } from './ui/sharedComponent/view/back-button/back-button.component';

import { SaleComponent } from './ui/view/sales/sale/sale.component';
import { SaleSummariesComponent } from './ui/view/sales/sale-summaries/sale-summaries.component';
import { DropdownModule } from 'primeng/dropdown';

import { CalendarModule } from 'primeng/calendar';
import { MenuModule } from 'primeng/menu';
import { IngredientComponent } from './ui/view/ingredient/ingredient/ingredient.component';
import { AddIngredientComponent } from './ui/view/ingredient/add-ingredient/add-ingredient.component';
import { KitchenOrderComponent } from './ui/view/kitchen-order/kitchen-order.component';
// import { CheckoutKitchenComponent } from './ui/view/checkout-kitchen/checkout-kitchen.component';

import { InputNumberModule } from 'primeng/inputnumber';

import { SkeletonModule } from 'primeng/skeleton';
import { PaginatorModule } from 'primeng/paginator';

import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { share } from 'rxjs';
import { OrderFilterPipe } from './ui/pipes/order-filter.pipe';
import { OrderStatusPipe } from './ui/pipes/order-status.pipe';
import { AppInitService } from './ui/service/app-init.service';
import { CheckoutKitchenComponent } from './ui/view/checkout-kitchen/checkout-kitchen.component';
import { HotelBillsComponent } from './ui/view/hotel-bills/hotel-bills.component';
import { HotelChangeroomComponent } from './ui/view/hotel-changeroom/hotel-changeroom.component';
import { HotelCheckoutComponent } from './ui/view/hotel-checkout/hotel-checkout.component';
import { HotelDooraccessComponent } from './ui/view/hotel-dooraccess/hotel-dooraccess.component';
import { HotelFormComponent } from './ui/view/hotel-form/hotel-form.component';
import { HotelKeycardComponent } from './ui/view/hotel-keycard/hotel-keycard.component';
import { HotelMessageComponent } from './ui/view/hotel-message/hotel-message.component';
import { HotelRoomdetailsComponent } from './ui/view/hotel-roomdetails/hotel-roomdetails.component';
import { HotelRoomlistComponent } from './ui/view/hotel-roomlist/hotel-roomlist.component';
import { EditIngredientsComponent } from './ui/view/ingredient/edit-ingredients/edit-ingredients.component';
import { ViewIngredientsComponent } from './ui/view/ingredient/view-ingredients/view-ingredients.component';
import { CheckoutHeaderComponent } from './ui/view/pos-checkout-page/components/checkout-header/checkout-header.component';
import { CheckoutOrdersComponent } from './ui/view/checkout-orders/checkout-orders.component';
import { CategoryComponent } from './ui/view/products/metaDatas/category/category.component';
import { DiscountComponent } from './ui/view/products/metaDatas/discount/discount.component';
import { SupplierComponent } from './ui/view/products/metaDatas/supplier/supplier.component';
import { TaxComponent } from './ui/view/products/metaDatas/tax/tax.component';
import { PromotionReportComponent } from './ui/view/report-dashboard/promotion-report/promotion-report.component';
import { StockReportComponent } from './ui/view/report-dashboard/stock-report/stock-report.component';
import { SalesDetailsComponent } from './ui/view/sales/sales-details/sales-details.component';
import { MultiSelectModule } from 'primeng/multiselect';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { SelectButtonModule } from 'primeng/selectbutton';
import { UniquePipe } from './shared/pipes/unique.pipe';
export function appInitializerFactory(appInitService: AppInitService) {
  return () => appInitService.init();
}
@NgModule({
  declarations: [
    AppComponent,
    PosPageComponent,
    CommisionComponent,
    ConfigurationComponent,
    InventoryComponent,
    ManageUserFormComponent,
    ManageUsersComponent,
    ProductsComponent,
    AddProductComponent,
    ViewProductComponent,
    ReportDashboardComponent,
    SalesReportComponent,
    FinanceReportComponent,
    InventoryReportComponent,
    ExpensesReportComponent,
    CreateReportComponent,
    ExcelExportAndImportComponent,
    EditInventoryComponent,
    ViewInventoryComponent,
    InformationComponent,
    SummaryReportComponent,
    CustomReportComponent,
    ChartTableComponent,
    SalesComponent,
    RefundComponent,
    BackButtonComponent,
    SaleSummaryComponent,
    SaleComponent,
    SaleSummariesComponent,
    // KitchenOrderComponent,
    // CheckoutKitchenComponent,
    
    IngredientComponent,
    AddIngredientComponent,
    IngredientComponent,
    AddIngredientComponent,
    HotelCheckoutComponent,
    HotelCheckoutComponent,
    IngredientComponent,
    AddIngredientComponent,
    HotelFormComponent,
    HotelMessageComponent,
    HotelRoomlistComponent,
    HotelRoomdetailsComponent,
    CategoryComponent,
    DiscountComponent,
    SupplierComponent,
    TaxComponent,
    HotelBillsComponent,
    HotelChangeroomComponent,
    HotelKeycardComponent,
    HotelDooraccessComponent,
    ViewIngredientsComponent,
    EditIngredientsComponent,
    PromotionReportComponent,
    StockReportComponent,
    OrderStatusPipe,
    OrderFilterPipe,
    SalesDetailsComponent,
    UniquePipe,
    //CheckoutKitchenComponent,
  ],
  imports: [
    // BrowserModule,
    // UserModule,
    AppRoutingModule,
    CheckboxModule,
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
    LargeSideModalComponent,
    ButtonComponent,
    ModalComponent,
    BadgeModule,
    MenubarModule,
    SideModalComponent,
    SearchbarComponent,
    NavTabComponent,
    HttpClientModule,
    NgApexchartsModule,
    InputNumberModule,
    CalendarModule,
    MenuModule,
    InputGroupModule,
    InputGroupAddonModule,
    ChartModule,
    DropdownModule,
    ChartModule,
    CardModule,
    InputGroupAddonModule,
    SkeletonModule,
    PaginatorModule,
    MultiSelectModule,
    ProgressSpinnerModule,
    SelectButtonModule,

    // BrowserAnimationsModule,

    TagModule,
  ],
  exports: [HotelRoomlistComponent, HotelRoomdetailsComponent],
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
    {
      provide: APP_INITIALIZER,
      useFactory: (appInitService: AppInitService) => () =>
        appInitService.init(),
      deps: [AppInitService],
      multi: true,
    },
    JwtHelperService,
    provideHttpClient(withInterceptorsFromDi()),
    MessageService,
  ],
  bootstrap: [AppComponent],
})
export class AppPOSModule {}
