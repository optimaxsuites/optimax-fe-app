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
import { LargeSideModalComponent } from './ui/sharedComponents/view/large-side-modal/large-side-modal.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { HrSettingsComponent } from './ui/view/hr/hr-settings/hr-settings.component';
import { SalaryComponent } from './ui/view/hr/salary/salary.component';

///mat
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
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SettingsPageComponent } from './ui/view/settings-page.component';
import { ScoresheetConfigComponent } from './ui/view/hr/scoresheet-config/scoresheet-config.component';
import { NavigationLinksService } from './ui/sharedComponents/service/navigation-links/navigation-links.service';
import { MenuItemsService } from './ui/sharedComponents/service/menue-items/menu-items.service';
import { GeneralSettingsComponent } from './ui/view/general/general-settings/general-settings.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LevelComponent } from './ui/view/hr/level/level.component';
import { LeaveComponent } from './ui/view/hr/leave/leave.component';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { AuthInterceptor } from './ui/sharedComponents/service/auth-service/auth.interceptor.service';
import { JWT_OPTIONS, JwtHelperService } from '@auth0/angular-jwt';
import { AppraisalassessmentComponent } from './ui/view/hr/appraisalassessment/appraisalassessment.component';
import { SideModalComponent } from './ui/sharedComponents/view/side-modal/side-modal.component';
import { CompensationComponent } from './ui/view/hr/compensation/compensation.component';
import { NavTabComponent } from './ui/sharedComponents/view/nav-tab/nav-tab.component';
import { LeaveStrctureComponent } from './ui/view/hr/leave-strcture/leave-strcture.component';
import { CheckoutComponent } from './ui/view/pos/checkout/checkout.component';
import { PosSettingComponent } from './ui/view/pos/pos-setting/pos-setting.component';
import { BusInfoSettingComponent } from './ui/view/pos/bus-info-setting/bus-info-setting.component';
import { PAndISettingComponent } from './ui/view/pos/p-and-isetting/p-and-isetting.component';
import { UserSettingComponent } from './ui/view/user-setting/user-setting.component';
import { RolesNpermissionComponent } from './ui/view/user-setting/roles-npermission/roles-npermission.component';
import { UsersComponent } from './ui/view/user-setting/users/users.component';
import { ConfirmationService, MessageService } from 'primeng/api';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BranchesComponent } from './ui/view/pos/branches/branches.component';
import { ChangePasswordComponent } from './ui/view/general/change-password/change-password.component';
import { ProfileComponent } from './ui/view/general/profile/profile.component';
import { PaykeysComponent } from './ui/view/pos/paykeys/paykeys.component';
import { DelveryComponent } from './ui/view/pos/delvery/delvery.component';
import { LocationPickerComponent } from './ui/view/pos/branches/location-picker/location-picker.component';
import { EstimatedDeliveryPipe } from './ui/view/pos/delvery/estimated-delivery.pipe';
import { LogisticFormComponent } from './ui/view/pos/delvery/LogisticFormComponent';
import { MetadatasComponent } from './ui/view/pos/metadatas/metadatas.component';
import { CategoryComponent } from './ui/view/pos/metadatas/category/category.component';
import { TaxComponent } from './ui/view/pos/metadatas/tax/tax.component';
import { SupplierComponent } from './ui/view/pos/metadatas/supplier/supplier.component';
import { DiscountComponent } from './ui/view/pos/metadatas/discount/discount.component';
import { QrcodeComponent } from './ui/view/pos/qrcode/qrcode.component';
import { MetadataComponent } from './ui/view/hr/metadata/metadata.component';
import { PayrollComponent } from './ui/view/hr/payroll/payroll.component';
import { GeneralComponent } from './ui/view/hr/payroll/general/general.component';
import { TaxationComponent } from './ui/view/hr/payroll/taxation/taxation.component';
import { BankTellerMappingComponent } from './ui/view/hr/payroll/bank-teller-mapping/bank-teller-mapping.component';
import { DropdownModule } from 'primeng/dropdown';
// import { DrawerModule } from 'primeng/drawer';
//

@NgModule({
  declarations: [
    AppComponent,
    HrSettingsComponent,
    SalaryComponent,
    SettingsPageComponent,
    ScoresheetConfigComponent,
    GeneralSettingsComponent,
    LevelComponent,
    LeaveComponent,
    AppraisalassessmentComponent,
    CompensationComponent,
    NavTabComponent,
    LeaveStrctureComponent,
    CheckoutComponent,
    PosSettingComponent,
    BusInfoSettingComponent,
    PAndISettingComponent,
    UserSettingComponent,
    UsersComponent,
    RolesNpermissionComponent,
    BranchesComponent,
    ChangePasswordComponent,
    ProfileComponent,
    PaykeysComponent,
    DelveryComponent,
    LocationPickerComponent,
    EstimatedDeliveryPipe,
    LogisticFormComponent,
    MetadatasComponent,
    CategoryComponent,
    TaxComponent,
    SupplierComponent,
    DiscountComponent,
    QrcodeComponent,
    MetadataComponent,
    PayrollComponent,
    GeneralComponent,
    TaxationComponent,
    BankTellerMappingComponent
  ],
  imports: [
    // BrowserModule,
    // BrowserAnimationsModule,
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
    DropdownModule,
    MatDatepickerModule,
    MatSelectModule,
    MatTooltipModule,
    MatButtonModule,
    MatDividerModule,
    MatTooltip,
    MatTabGroup,
    MatMenuModule,
    LargeSideModalComponent,
    SideModalComponent,
    MatSnackBarModule,
  ],
  providers: [
    NavigationLinksService,
    MenuItemsService,
    MessageService,
    ConfirmationService,
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
export class AppSettingsModule {}
