import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AppMainComponent } from './app.main.component';
import {UserLoginComponent} from './login/login.component';
import { DashboardComponent } from './report/view/dashboard.component';
import { ClientRegistrationComponent } from './client/view/client.registration.component';
import  {SettingListComponent } from './administration/view/setting.list.component'
import {ManageUsersComponent} from './administration/view/add.users.component'
import {UserlistComponent} from './administration/view/userlist.component'
import { AllergieslistComponent } from './administration/view/allergieslist.component';
import { ManageLaboratoriesComponent } from './administration/view/add.laboratories.component';
import { LaboratorieslistComponent } from './administration/view/laboratorieslist.component';
import {MetadataListComponent} from './administration/view/metadata.list.component';
import { GenderlistComponent } from './administration/view/genderlist.component';
import { ManagePharmaciesComponent } from './administration/view/add.pharmacies.component';
import { PharmacieslistComponent } from './administration/view/pharmacieslist.component';
import {ClientPortalListComponent} from './client/view/client.portal.list.component';
import {UserRoleListComponent} from './administration/view/user-role-list.component';
import {AuthGuardService} from './administration/service/auth-guard.service';
import { ClientPortalDetailComponent } from './client/view/client-portal-detail.component';
import { NationalitylistComponent } from './administration/view/nationalitylist.component';
import { TargetgrouplistComponent } from './administration/view/targetgrouplist.component';
import { OccupationlistComponent } from './administration/view/occupationlist.component';
import { ClientServiceDashboardComponent } from './client/view/client-service-dashboard.component';
import { PregnancylistComponent } from './administration/view/pregnancylist.component';
import { ManageEnrollmentsettingComponent } from './administration/view/add.enrollmentsetting.component';
import { EnrollmentsettinglistComponent } from './administration/view/enrollmentsettinglist.component';
import { ManageHivstatusatregistrationComponent } from './administration/view/add.hivstatusatregistration.component';
import { HivStatusAtRegistrationlistComponent } from './administration/view/hivstatusatregistrationlist.component';
import { HeirarchylistComponent } from './administration/view/heirarchylist.component';
import { AddHeirarchyComponent } from './administration/view/add-heirarchy.component';
import { ManageTbstatusComponent } from './administration/view/add.tbstatus.component';
import { LaboratorytestlistComponent } from './administration/view/laboratorytestlist.component';
import { StatuslistComponent } from './administration/view/statuslist.component';
import { PriorartlistComponent } from './administration/view/priorartlist.component';
//import { ManageTestgroupComponent } from './administration/view/add.testgroup.component';
//import { TestgrouplistComponent } from './administration/view/testgrouplist.component';
//import { ManageAllergensComponent } from './administration/view/add.allergens.component';
import { HeirarchyunitListComponent } from './administration/view/heirarchyunit.list.component';
import { AssessmentTypelistComponent } from './administration/view/assessmenttypelist.component';
import { ClientRegistrationStepsComponent } from './client/view/client.registration.steps.component';
import { ClientPersonalInfo } from './client/view/client.personal.info';
import { ClientNextOfKinInfo } from './client/view/client.nextofkin.info';
import { ClientNextofkinDetailComponent } from './client/view/client.nextofkin.detail.component';
import { ClientBiometricInfo } from './client/view/client.biometric.info';
import { ClientSummaryInfo } from './client/view/client.summary.info';
import { FormBuilderComponent } from './administration/view/form-builder.component';
import { ClientEnrolmentEntryComponent } from './client/view/client-enrolment-entry.component';
import { ClientProgramEnrolmentComponent } from './client/view/client-program-enrolment.component';
import { PharmacyPortalListComponent } from './pharmacy/view/pharmacy.portal.list.component';
import { PharmacyServiceDashboardComponent } from './pharmacy/view/pharmacy-service-dashboard.component';
import { ModeOfHivTestlistComponent } from './administration/view/modeofhivtestlist.component';
import { DruglistComponent } from './administration/view/druglist.component';
import { PharmacyOrdersComponent } from './pharmacy/view/pharmacy-orders.component';
import { ProgramslistComponent } from './administration/view/programslist.component';
import { DatatypelistComponent } from './administration/view/datatypelist.component';
import { StrengthlistComponent } from './administration/view/strengthlist.component';
import { DoselistComponent } from './administration/view/doselist.component';
import { DiagnosisconditionlistComponent } from './administration/view/diagnonisconditionlist.component';

import { BiometricInfoDetailComponent } from './client/view/client.biometric.info.detail.component';
import { ClientRegistrationStepsDetailsComponent } from './client/view/client.registration.steps.details.component';

import { SpecimenTypelistComponent } from './administration/view/specimen-typelist.component';
import { ArtStatusComponent } from './administration/view/artstatus.component';
import { ClientTypeComponent } from './administration/view/clienttype.component';
import { PharmacyARVRefillComponent } from './pharmacy/view/pharmacy-arvrefill.component';









import { DataMigrationComponent } from './administration/view/data-migration.component';
import { AddFormAttributesComponent } from './administration/view/add-form-attributes.component';
import { LaboaratoryPortalListComponent } from './laboratory/view/laboaratory-portal-list.component';
import { LaboratoryServiceDashboardComponent } from './laboratory/view/laboratory-service-dashboard.component';
import { ListImplentingPartnersComponent } from './administration/view/list-implenting-partners.component';
import { ConfirmsampleComponent } from './administration/view/confirmsample.component';
import { ClientAppointmentComponent } from './client/view/client-appointment.component';
import { ClinicalStagesComponent } from './administration/view/clinicalstages.component';
import { FunctionalStatusComponent } from './administration/view/functionalstatus.component';
import { DispensingPatternComponent } from './administration/view/dispensingpattern.component';
import { ClientClinicsComponent } from './client/view/client-clinics.component';
import { OppInfectionsComponent } from './administration/view/oppinfections.component';
import { LevelofAdherenceComponent } from './administration/view/levelofadherence.component';
import { ClinicvisitComponent } from './client/view/client.clinicvisit.component';
import { KPDataVisualizationComponent } from './report/view/kpdatavisualization.component';
import { InteroperabilityComponent } from './administration/view/interoperability.component';











const routes: Routes = [
    {path: '', component: UserLoginComponent},
    {path: '', component: AppMainComponent,
    children: [
    {path: 'dashboard', component: DashboardComponent},
    {path: 'registration', component: ClientRegistrationComponent},
    {path: 'cEnrolment', component:ClientEnrolmentEntryComponent},
    {path: 'cPEnrolment', component:ClientProgramEnrolmentComponent},
    {path: 'setting', component: SettingListComponent},
    {path: 'addUser', component: ManageUsersComponent},
    {path: 'userlist', component: UserlistComponent},
    {path: 'clinical/:index', component: AllergieslistComponent},
    {path: 'addLaboratories', component: ManageLaboratoriesComponent},
    {path: 'laboratorieslist', component: LaboratorieslistComponent},
    {path: 'metadatalist', component: MetadataListComponent},
    {path: 'basicinfo/:index', component: GenderlistComponent},
    {path: 'userrolelist', component: UserRoleListComponent},
    {path: '##/kpportal', component: ClientPortalListComponent},
    {path: 'userlist', component: UserlistComponent},
    {path: 'addPharmacies', component: ManagePharmaciesComponent},
    {path: 'pharmacieslist', component: PharmacieslistComponent},
    {path: 'arvrefill', component: PharmacyARVRefillComponent},
    {path: 'cportal', component: ClientPortalListComponent},
    {path: '##/cportald', component: ClientPortalDetailComponent},
    {path: 'cclinics', component: ClientClinicsComponent},
    {path: 'pportal', component: PharmacyPortalListComponent},
    {path: 'interperability', component: InteroperabilityComponent},




    {path: 'location/:index', component: NationalitylistComponent},
    {path: 'cli-enrl/:index', component: TargetgrouplistComponent},
    {path: 'edu/:index', component: OccupationlistComponent},
    {path: '##/sportal', component: ClientServiceDashboardComponent},
    {path: 'pregnancylist', component: PregnancylistComponent},
    {path: 'addEnrollmentSetting', component: ManageEnrollmentsettingComponent},
    {path: 'enrollmensettingtlist', component: EnrollmentsettinglistComponent},
    {path: 'addHivstatusatregistration', component: ManageHivstatusatregistrationComponent},
    {path: 'hivstatusatregistrationlist', component: HivStatusAtRegistrationlistComponent},
    {path: 'hiv-enrl/:index', component: PriorartlistComponent},
    {path: 'heirarchylist', component: HeirarchylistComponent },
    {path: 'addHeirarchy', component: AddHeirarchyComponent },
    {path: 'addTbstatus', component: ManageTbstatusComponent},

    {path: 'laboratory/:index', component: LaboratorytestlistComponent},
    {path: 'status/:index', component: StatuslistComponent},

    {path: 'sReg', component: ClientRegistrationStepsComponent,
    children: [
      {path: 'basic', component: ClientPersonalInfo},
      {path: 'nextofkin', component: ClientNextOfKinInfo},
      {path: 'biometric', component: ClientBiometricInfo},
      {path: 'summary', component: ClientSummaryInfo},
    ]
    },
    {path: 'eReg', component: ClientRegistrationStepsDetailsComponent,
    children: [
      {path: 'ebasic', component: ClientPortalDetailComponent},
      {path: 'enextofkin', component: ClientNextofkinDetailComponent},
      {path: 'ebiometric', component: BiometricInfoDetailComponent},
      {path: 'esummary', component: ClientSummaryInfo},
    ]
    },


    //{path: 'addTestgroup', component: ManageTestgroupComponent},
    //{path: 'testgrouplist', component: TestgrouplistComponent},
       //{path: 'addAllergens', component: ManageAllergensComponent},
    {path: 'fbuilder', component: FormBuilderComponent},
    {path: 'afattr', component: AddFormAttributesComponent},
    {path: 'heirarchyunitlist', component: HeirarchyunitListComponent},
    {path: 'assessment/:index', component: AssessmentTypelistComponent},
    {path: 'prescription', component: PharmacyPortalListComponent},
    {path: 'viewPrescription', component: PharmacyServiceDashboardComponent},
    {path: 'modeofhivtestlist', component: ModeOfHivTestlistComponent},
    {path: 'pharm/:index', component: DruglistComponent},
    {path: 'pharmacyorders', component: PharmacyOrdersComponent},

    {path: 'programs/:index', component: ProgramslistComponent},
    {path: 'datatypelist', component: DatatypelistComponent},
    {path: 'strengthlist', component: StrengthlistComponent},
    {path: 'doselist', component: DoselistComponent},
    {path: 'cfsample', component: ConfirmsampleComponent},
    {path: 'diagnosisconditionlist', component: DiagnosisconditionlistComponent},
    {path: 'clinicalstageslist', component: ClinicalStagesComponent},
    {path: 'functionalstatuslist', component: FunctionalStatusComponent},
    {path: 'dispensingpatternlist', component: DispensingPatternComponent},
    {path: 'client-typelist', component: ClientTypeComponent},
    {path: 'artstatuslist', component: ArtStatusComponent},
    {path: 'oppinfectionslist', component: OppInfectionsComponent},
    {path: 'levelofadherencelist', component: LevelofAdherenceComponent},




    {path: 'datamigration', component: DataMigrationComponent},
    {path: 'cOrderedtest', component: LaboratoryServiceDashboardComponent},

    {path: 'cLabtest', component: LaboaratoryPortalListComponent},
    {path: 'iPartners', component: ListImplentingPartnersComponent},
    {path: 'specimen/:index', component: SpecimenTypelistComponent},
    {path: 'cAppointment', component: ClientAppointmentComponent},
    {path: 'clinicvisit', component: ClinicvisitComponent},
    {path: 'kpdvt', component: KPDataVisualizationComponent},

 




]
},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
