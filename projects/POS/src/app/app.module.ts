import { NgModule } from '@angular/core';
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
import { ExcelExportAndImportComponent } from './ui/view/excel-export-and-import/excel-export-and-import.component';
import { ReportDashboardComponent } from './ui/view/report-dashboard/report-dashboard.component';
import { NgApexchartsModule } from 'ng-apexcharts';
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
    ExcelExportAndImportComponent,
    ReportDashboardComponent,
  ],
  imports: [
    // BrowserModule,
    // BrowserAnimationsModule,
    // UserModule,
    AppRoutingModule,
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
    SideModalComponent,
    SearchbarComponent,
    NavTabComponent,
    HttpClientModule,
    NgApexchartsModule,
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
  ],
  bootstrap: [AppComponent],
})
export class AppPOSModule {}
