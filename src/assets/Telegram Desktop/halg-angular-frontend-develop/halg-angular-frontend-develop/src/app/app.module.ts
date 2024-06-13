
import { BrowserModule } from '@angular/platform-browser';
//import { NgxLoadingXModule } from 'ngx-loading-x';
import { NgModule } from '@angular/core';
import {FormsModule} from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { UserLoginComponent } from './login/login.component';
import {AccordionModule} from 'primeng/accordion';
import {AutoCompleteModule} from 'primeng/autocomplete';
import {BreadcrumbModule} from 'primeng/breadcrumb';
import { BadgeModule } from "primeng/badge";
import { GroupingBarService, FieldListService, PivotViewModule, CalculatedFieldService,ConditionalFormattingService } from '@syncfusion/ej2-angular-pivotview';
//import {PrimeIcons} from 'primeng/api';
//import {ButtonModule} from 'primeng/button';
import { TagModule } from 'primeng/tag';
import {CardModule} from 'primeng/card';
import {CarouselModule} from 'primeng/carousel';
import {ChartModule} from 'primeng/chart';
import {CheckboxModule} from 'primeng/checkbox';
import {ChipsModule} from 'primeng/chips';
import {CodeHighlighterModule} from 'primeng/codehighlighter';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {ColorPickerModule} from 'primeng/colorpicker';
import {ContextMenuModule} from 'primeng/contextmenu';
import {DataViewModule} from 'primeng/dataview';
import {DialogModule} from 'primeng/dialog';
import {DividerModule} from 'primeng/divider';
import {DropdownModule} from 'primeng/dropdown';
import {FieldsetModule} from 'primeng/fieldset';
import {FileUploadModule} from 'primeng/fileupload';
import {SplitterModule} from 'primeng/splitter';
import { FullCalendarModule } from '@fullcalendar/angular'; // the main connector. must go first
import dayGridPlugin from '@fullcalendar/daygrid'; // a plugin
import interactionPlugin from '@fullcalendar/interaction'; // a plugin

//import {FullCalendarModule} from 'primeng/fullcalendar';
import {GalleriaModule} from 'primeng/galleria';
import {InplaceModule} from 'primeng/inplace';
import {InputNumberModule} from 'primeng/inputnumber';
import {InputMaskModule} from 'primeng/inputmask';
import {InputSwitchModule} from 'primeng/inputswitch';
import {InputTextModule} from 'primeng/inputtext';
import {InputTextareaModule} from 'primeng/inputtextarea';
import {LightboxModule} from 'primeng/lightbox';
import {ListboxModule} from 'primeng/listbox';
import {MegaMenuModule} from 'primeng/megamenu';
import {MenuModule} from 'primeng/menu';
import {MenubarModule} from 'primeng/menubar';
import {MessagesModule} from 'primeng/messages';
import {MessageModule} from 'primeng/message';
import {MultiSelectModule} from 'primeng/multiselect';
import {OrderListModule} from 'primeng/orderlist';
import {OrganizationChartModule} from 'primeng/organizationchart';
import {OverlayPanelModule} from 'primeng/overlaypanel';
import {PaginatorModule} from 'primeng/paginator';
import {PanelModule} from 'primeng/panel';
import {PanelMenuModule} from 'primeng/panelmenu';
import {PasswordModule} from 'primeng/password';
import {PickListModule} from 'primeng/picklist';
import {ProgressBarModule} from 'primeng/progressbar';
import {RadioButtonModule} from 'primeng/radiobutton';
import {RatingModule} from 'primeng/rating';
import {RippleModule} from 'primeng/ripple';
import {ScrollPanelModule} from 'primeng/scrollpanel';
import {ScrollTopModule} from 'primeng/scrolltop';
import {SelectButtonModule} from 'primeng/selectbutton';
import {SidebarModule} from 'primeng/sidebar';
import {SlideMenuModule} from 'primeng/slidemenu';
import {SliderModule} from 'primeng/slider';
import {SkeletonModule} from 'primeng/skeleton';
import {SplitButtonModule} from 'primeng/splitbutton';
import {StepsModule} from 'primeng/steps';
import {TabMenuModule} from 'primeng/tabmenu';
import {TableModule} from 'primeng/table';
import {TabViewModule} from 'primeng/tabview';
import {TerminalModule} from 'primeng/terminal';
import {TieredMenuModule} from 'primeng/tieredmenu';
import {TimelineModule} from 'primeng/timeline';
import {ToastModule} from 'primeng/toast';
import {ToggleButtonModule} from 'primeng/togglebutton';
import {ToolbarModule} from 'primeng/toolbar';
import {TooltipModule} from 'primeng/tooltip';
import {TreeModule} from 'primeng/tree';
import {TreeTableModule} from 'primeng/treetable';
import {VirtualScrollerModule} from 'primeng/virtualscroller';
import { AppTopBarComponent } from './app.topbar.component';
import { AppRightPanelComponent } from './app.rightpanel.component';
import { AppMenuItemComponent } from './app.menuitem.component';
import { AppMenuComponent } from './app.menu.component';
import { AppConfigComponent } from './app.config.component';
import { AppBreadcrumbComponent } from './app.breadcrumb.component';
import { AppFooterComponent } from './app.footer.component';
import { AppMainComponent } from './app.main.component';
import { DashboardComponent } from './report/view/dashboard.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { SettingListComponent } from './administration/view/setting.list.component'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {ManageUsersComponent} from './administration/view/add.users.component';
import { UserlistComponent } from './administration/view/userlist.component';

import { AllergieslistComponent } from './administration/view/allergieslist.component';
import { ManageLaboratoriesComponent } from './administration/view/add.laboratories.component';
import { LaboratorieslistComponent } from './administration/view/laboratorieslist.component';
import { MetadataListComponent } from './administration/view/metadata.list.component';
import { GenderlistComponent } from './administration/view/genderlist.component';
import { UserRoleListComponent } from './administration/view/user-role-list.component';
import { ManagePharmaciesComponent } from './administration/view/add.pharmacies.component';
import { PharmacieslistComponent } from './administration/view/pharmacieslist.component';
import { ClientPortalListComponent } from './client/view/client.portal.list.component';
import { ClientPortalDetailComponent } from './client/view/client-portal-detail.component';
import { ClientRegistrationComponent } from './client/view/client.registration.component';
import { OccupationlistComponent } from './administration/view/occupationlist.component';
//import { PatientComponent } from './client/view/patient.registration.component';
import { NationalitylistComponent } from './administration/view/nationalitylist.component';
import { TargetgrouplistComponent } from './administration/view/targetgrouplist.component';
import { ClientServiceDashboardComponent } from './client/view/client-service-dashboard.component'
import { PregnancylistComponent } from './administration/view/pregnancylist.component';
import { ManageEnrollmentsettingComponent } from './administration/view/add.enrollmentsetting.component';
import { EnrollmentsettinglistComponent } from './administration/view/enrollmentsettinglist.component';
import { ManageHivstatusatregistrationComponent } from './administration/view/add.hivstatusatregistration.component';
import { HivStatusAtRegistrationlistComponent } from './administration/view/hivstatusatregistrationlist.component';
import { HeirarchylistComponent } from './administration/view/heirarchylist.component';
import { AddHeirarchyComponent } from './administration/view/add-heirarchy.component';
import { ManageTbstatusComponent } from './administration/view/add.tbstatus.component';

import { StatuslistComponent } from './administration/view/statuslist.component';
import { PriorartlistComponent } from './administration/view/priorartlist.component';

//import { PatientComponent } from './client/patient.registration.component';
//import {MatDividerModule} from '@angular/material/divider';
//import { IgxDividerModule } from "igniteui-angular";
//import { jqxTreeModule } from "jqxtree";
import { HeirarchyunitListComponent } from './administration/view/heirarchyunit.list.component';
import { AssessmentTypelistComponent } from './administration/view/assessmenttypelist.component';
import { ClientRegistrationStepsComponent } from './client/view/client.registration.steps.component';
import { ClientPersonalInfo } from './client/view/client.personal.info';
import { ClientNextOfKinInfo } from './client/view/client.nextofkin.info';
import { ClientBiometricInfo } from './client/view/client.biometric.info';
import { ClientSummaryInfo } from './client/view/client.summary.info';
import { FormioAppConfig, FormioModule } from 'angular-formio';
import { FormBuilderComponent } from './administration/view/form-builder.component';
import { ClientEnrolmentEntryComponent } from './client/view/client-enrolment-entry.component';
import { ClientProgramEnrolmentComponent } from './client/view/client-program-enrolment.component';
import { PharmacyPortalListComponent } from './pharmacy/view/pharmacy.portal.list.component';
import { PharmacyServiceDashboardComponent } from './pharmacy/view/pharmacy-service-dashboard.component';
import {  ReactiveFormsModule } from '@angular/forms';
import { ModeOfHivTestlistComponent } from './administration/view/modeofhivtestlist.component';
import { DruglistComponent } from './administration/view/druglist.component';
import { PharmacyOrdersComponent } from './pharmacy/view/pharmacy-orders.component';

import { DatatypelistComponent } from './administration/view/datatypelist.component';
import { StrengthlistComponent } from './administration/view/strengthlist.component';
import { DoselistComponent } from './administration/view/doselist.component';
import { ProgramslistComponent } from './administration/view/programslist.component';

import { DataMigrationComponent } from './administration/view/data-migration.component';
import { AddFormAttributesComponent } from './administration/view/add-form-attributes.component';
import { DiagnosisconditionlistComponent } from './administration/view/diagnonisconditionlist.component';
import { LaboratoryServiceDashboardComponent } from './laboratory/view/laboratory-service-dashboard.component';
import { LaboaratoryPortalListComponent } from './laboratory/view/laboaratory-portal-list.component';

import { ClientNextofkinDetailComponent } from './client/view/client.nextofkin.detail.component';
import { ClientRegistrationStepsDetailsComponent } from './client/view/client.registration.steps.details.component';
import { BiometricInfoDetailComponent } from './client/view/client.biometric.info.detail.component';
import { ClientSummaryInfoDetailComponent } from './client/view/client.summary.info.detail.component';
import { ListImplentingPartnersComponent } from './administration/view/list-implenting-partners.component';
// import {MatDatepickerModule} from '@angular/material/datepicker';
// import {MatNativeDateModule} from '@angular/material/core';
// import {MatInputModule} from '@angular/material/input';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
//import { CalendarModule, DateAdapter } from 'angular-calendar';
//import {DpDatePickerModule} from 'ng2-date-picker';
import {CalendarModule } from 'primeng/calendar';
import { AuthInterceptor } from './administration/service/AuthInterceptor';
import { SpecimenTypelistComponent } from './administration/view/specimen-typelist.component';
import { LaboratorytestlistComponent } from './administration/view/laboratorytestlist.component';
import { ConfirmsampleComponent } from './administration/view/confirmsample.component';
import { ScheduleModule, RecurrenceEditorModule, DayService, WeekService, WorkWeekService, MonthService, AgendaService, MonthAgendaService } from '@syncfusion/ej2-angular-schedule';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { ClientAppointmentComponent } from './client/view/client-appointment.component';
import { ClinicalStagesComponent } from './administration/view/clinicalstages.component';
import { FunctionalStatusComponent } from './administration/view/functionalstatus.component';
import { DispensingPatternComponent } from './administration/view/dispensingpattern.component';
import { ClientClinicsComponent } from './client/view/client-clinics.component';
import { ArtStatusComponent } from './administration/view/artstatus.component';
import { ClientTypeComponent } from './administration/view/clienttype.component';
import { PharmacyARVRefillComponent } from './pharmacy/view/pharmacy-arvrefill.component';
import { OppInfectionsComponent } from './administration/view/oppinfections.component';
import { LevelofAdherenceComponent } from './administration/view/levelofadherence.component';
import { ClinicvisitComponent } from './client/view/client.clinicvisit.component';
import { KPDataVisualizationComponent } from './report/view/kpdatavisualization.component';
import { InteroperabilityComponent } from './administration/view/interoperability.component';




FullCalendarModule.registerPlugins([ // register FullCalendar plugins
  dayGridPlugin,
  interactionPlugin
]);

@NgModule({
  declarations: [
    AppComponent,
    UserLoginComponent,
    AppTopBarComponent,
    AppRightPanelComponent,
    AppMenuItemComponent,
    AppMenuComponent,
    AppConfigComponent,
    AppBreadcrumbComponent,
    AppFooterComponent,
    AppMainComponent,
    DashboardComponent,
     SettingListComponent,
    ManageUsersComponent,
    UserlistComponent,

    AllergieslistComponent,
    ManageLaboratoriesComponent,
    LaboratorieslistComponent,
    MetadataListComponent,
    GenderlistComponent,
    UserRoleListComponent,
    ManagePharmaciesComponent,
    PharmacieslistComponent,
    ClientPortalListComponent,
    ClientPortalDetailComponent,
    ClientRegistrationComponent,

    OccupationlistComponent,

    //PatientComponent,



   // ManageUserRoleService





    NationalitylistComponent,

    TargetgrouplistComponent,

    ClientServiceDashboardComponent,
    PregnancylistComponent,
    ManageEnrollmentsettingComponent,
    EnrollmentsettinglistComponent,
    ManageHivstatusatregistrationComponent,
    HivStatusAtRegistrationlistComponent,


    HeirarchylistComponent,
    AddHeirarchyComponent,
    ManageTbstatusComponent,
    PriorartlistComponent,



    StatuslistComponent,



    HeirarchyunitListComponent,
    AssessmentTypelistComponent,
    ClientRegistrationStepsComponent,
    ClientPersonalInfo,
    ClientNextOfKinInfo,
    ClientBiometricInfo,
    ClientSummaryInfo,
    FormBuilderComponent,
    ClientEnrolmentEntryComponent,
    ClientProgramEnrolmentComponent,
    PharmacyPortalListComponent,
    PharmacyServiceDashboardComponent,
    ModeOfHivTestlistComponent,
    DruglistComponent,
    ProgramslistComponent,
    PharmacyOrdersComponent,


    DatatypelistComponent,
    StrengthlistComponent,
    DoselistComponent,
    ProgramslistComponent,



    DataMigrationComponent,
    AddFormAttributesComponent,
    DiagnosisconditionlistComponent,
    LaboratoryServiceDashboardComponent,
    LaboaratoryPortalListComponent,
    ClientNextofkinDetailComponent,
    ClientRegistrationStepsDetailsComponent,
    BiometricInfoDetailComponent,
    ClientSummaryInfoDetailComponent,
    ListImplentingPartnersComponent,
    SpecimenTypelistComponent,
    LaboratorytestlistComponent,
    ConfirmsampleComponent,
    ClientAppointmentComponent,
    ClinicalStagesComponent,
    FunctionalStatusComponent,
    DispensingPatternComponent,
    ClientClinicsComponent,
    ArtStatusComponent,
    ClientTypeComponent,
    PharmacyARVRefillComponent,
    OppInfectionsComponent,
    LevelofAdherenceComponent,
    ClinicvisitComponent,
    KPDataVisualizationComponent,
    InteroperabilityComponent,
    
    
  


 ],




  imports: [
    ReactiveFormsModule,
    //NgxLoadingXModule,
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    FormsModule,
    FormioModule,
    TagModule,
    SplitterModule,
    PivotViewModule,
    //NgPipesModule,
    //MatDividerModule,
    //IgxDividerModule,
        AppRoutingModule,
        AccordionModule,
        AutoCompleteModule,
        BreadcrumbModule,
        BadgeModule,
       // ButtonModule,
        CalendarModule,
        CardModule,
        CarouselModule,
        ChartModule,
        CheckboxModule,
        ChipsModule,
        CodeHighlighterModule,
        ConfirmDialogModule,
        ColorPickerModule,
        ContextMenuModule,
        DataViewModule,
        DialogModule,
        DividerModule,
        DropdownModule,
        FieldsetModule,
        FileUploadModule,
        //FullCalendarModule,
        FullCalendarModule,
        GalleriaModule,
        HttpClientModule,
        InplaceModule,
        InputNumberModule,
        InputMaskModule,
        InputSwitchModule,
        InputTextModule,
        InputTextareaModule,
        LightboxModule,
        ListboxModule,
        MegaMenuModule,
        MenuModule,
        MenubarModule,
        MessageModule,
        MessagesModule,
        MultiSelectModule,
        OrderListModule,
        OrganizationChartModule,
        OverlayPanelModule,
        PaginatorModule,
        PanelModule,
        PanelMenuModule,
        PasswordModule,
        PickListModule,
      //  PrimeIcons,
        ProgressBarModule,
        RadioButtonModule,
        RatingModule,
        RippleModule,
        ScrollPanelModule,
        ScrollTopModule,
        SelectButtonModule,
        SidebarModule,
        SlideMenuModule,
        SliderModule,
        SkeletonModule,
        SplitButtonModule,
        StepsModule,
        TableModule,
        TabMenuModule,
        TabViewModule,
        TerminalModule,
        TieredMenuModule,
        TimelineModule,
        ToastModule,
        ToggleButtonModule,
        ToolbarModule,
        TooltipModule,
        TreeModule,
        TreeTableModule,
        VirtualScrollerModule,
        FontAwesomeModule,
        //jqxTreeModule,
        DividerModule,
        FontAwesomeModule,
        BrowserModule,
        AppRoutingModule,
        ScheduleModule, RecurrenceEditorModule,
        ButtonModule
        // MatDatepickerModule,
        // MatNativeDateModule,
        // MatInputModule,
        //DpDatePickerModule,
        // CalendarModule.forRoot({
        //   provide: DateAdapter,
        //   useFactory: adapterFactory,
        // })


  ],
  providers: [GroupingBarService, FieldListService,CalculatedFieldService,ConditionalFormattingService,
    {provide: FormioAppConfig, useValue: {
    apiUrl: 'https://api.centrifugegroup.com',
    icons: 'fontawesome'}},
    {provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    DayService, 
                WeekService, 
                WorkWeekService, 
                MonthService,
                AgendaService,
                MonthAgendaService
],
bootstrap: [AppComponent]
})
export class AppModule { }
