import { Component, OnInit } from '@angular/core';
import { AppBreadcrumbService } from '../../app.breadcrumb.service';
import { PersonalData } from '../domain/client.data';
import {ManageClientService} from '../service/manage.client.service';
import { Location } from '@angular/common';
import {MessageService,TreeNode} from 'primeng/api';
import { Router } from '@angular/router';
import { GenderData, ReligionData } from '../../administration/domain/gender.data';
import { ManageGendersService } from 'src/app/administration/service/manage.genders.service';
import { MetadataConfigService } from 'src/app/administration/service/metadata-config.service';
import { MaritalStatusData } from 'src/app/administration/domain/gender.data';
import { OccupationData } from 'src/app/administration/domain/occupation.data';
import { QualificationData } from 'src/app/administration/domain/occupation.data';
import { HeirarchyUnitsData } from 'src/app/administration/domain/heirarchyunits.data';
import { AssessmentQuestions, AssessmentResponses, AssessmentType } from 'src/app/administration/domain/assessments.data';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {ConfirmationService} from 'primeng/api';
import { LanguageData } from 'src/app/administration/domain/gender.data';
import { RefferedfromData } from 'src/app/administration/domain/targetgroup.data';
import { ViewChild } from '@angular/core';
import { TargetGroupData } from '../../administration/domain/targetgroup.data';
import { NationalityData, StatesData, LocalGovernmentAreasData } from '../../administration/domain/nationality.data';

@Component({
  selector: 'app-patient.registration',
  templateUrl: './client.registration.component.html',
  providers:[MessageService,ConfirmationService]
 // styleUrls: ['./patient.registration.component.scss']

})
export class ClientRegistrationComponent implements OnInit {
  clinicalregistration = {} as  PersonalData;
  facilityDialog: boolean;
  loading: boolean;

  refferedfromMap: RefferedfromData[];
  selectedRefferedfrom: RefferedfromData;
  religionMap: ReligionData[];
  selectedReligion: ReligionData;
  languageMap: LanguageData[];
  selectedLanguage: LanguageData;
  maritalstatusMap: MaritalStatusData[];
  selectedMaritalStatus: MaritalStatusData[];
  target_group_idMap: TargetGroupData[];
  selectedTargetGroup: TargetGroupData;
  genderMap: GenderData[];
  selectedGender: GenderData;
  occupationMap: OccupationData[];
  selectedOccupation: OccupationData;
  qualificationMap: QualificationData[];
  selectedQualification: QualificationData;
  heirarchyunitsMap: HeirarchyUnitsData[];
  heirarchyunitsTree:any[];
  selectedHeirarchyUnit: HeirarchyUnitsData;
  assessmentTypeMap: AssessmentType[];
  selectedAssessmentType: AssessmentType;
  assessmentTypePreMap: AssessmentType[];
  selectedAssessmentQuestion: AssessmentQuestions;
  nationalityMap:  NationalityData[];
  selectedNationality: NationalityData;
  statesMap: StatesData[];
  selectedStates:StatesData;
  localGovernmentAreasMap: StatesData[];
  selectedLocalGovernmentAreas:LocalGovernmentAreasData;



  assessmentQuestionMap = { assessmentType: {} } as unknown as AssessmentQuestions[];
  assessmentQuestions: AssessmentQuestions[];



  constructor(private router: Router,
   private messageService: MessageService,
    private location: Location,
    private manageclientService:ManageClientService,
    private breadcrumbService: AppBreadcrumbService,
    private metadataConfigService: MetadataConfigService,
    private confirmationService: ConfirmationService) {
    this.breadcrumbService.setItems([
        { label: 'Dashboard', routerLink: ['/dashboard'] },
        { label: 'Register KP', routerLink: ['/registration'] },
        { label: 'View KP Client', routerLink: ['/viewkp'] }
    ]);

}

  ngOnInit(): void {
    if(sessionStorage.getItem('username') == null){
    this.addError("Session Expired.","Your current session has expired. Re-login.");
      this.router.navigate(['']);
    }
    else{
      this.loadConfigMetadata();
    }



  }
   protected loadConfigMetadata(){
    this.metadataConfigService.getGenderList().subscribe(p => {this.genderMap = p});
    this.metadataConfigService.getTargetGroupList().subscribe(p => {this.target_group_idMap = p});
    this.metadataConfigService.getLanguageList().subscribe(p => {this.languageMap = p});
    this.metadataConfigService.getRefferedfromList().subscribe(p => {this.refferedfromMap = p});
    this.metadataConfigService.getReligionList().subscribe(p => {this.religionMap = p});
    this.metadataConfigService.getMaritalStatusList().subscribe(p => {this.maritalstatusMap = p});
    this.metadataConfigService.getOccupationList().subscribe(p => {this.occupationMap = p});
    this.metadataConfigService.getQualificationList().subscribe(p => {this.qualificationMap = p});
   this.metadataConfigService.getHeirarchyUnitsListById(1).subscribe(p => {this.heirarchyunitsMap = p});
   this.metadataConfigService.getAssessmentTypeList().subscribe(p => {this.assessmentTypeMap = p});
   this.metadataConfigService.getAssessmentQuestionList().subscribe(p => {this.assessmentQuestionMap = p});
   this.metadataConfigService.getNationalityList().subscribe(p => {this.nationalityMap = p});
   this.metadataConfigService.getStatesList().subscribe(p => {this.statesMap = p});
   this.metadataConfigService.getLocalGovernmentAreasList().subscribe(p => {this.localGovernmentAreasMap = p});


  }
  loadHeirarchyUnits(){
    this.facilityDialog=true;
    this.buildHeirarchyTree(this.heirarchyunitsMap);

  }

  onAssessmentSelection(){
    this.rsp = 0;
    this.assessmentQuestions = [];
    this.assessmentQuestionMap.filter(p=> {
      if (p.assessment_type_id === this.selectedAssessmentType.assessment_type_id){
        this.assessmentQuestions.push(p);

      }
      })
  }

  rsp: number;

  calculateResponses(){

     this.rsp = 0;
    this.assessmentQuestions.forEach(p=> {

      if(p.default_response){
        this.rsp = this.rsp+1;
      }
    });

  }

  assessmentResponse = {} as AssessmentResponses;
  assessmentResponses: AssessmentResponses[] = [];

  saveResponses(){
    if(this.assessmentQuestions.length > 0){
      this.assessmentResponses = [];
      this.assessmentQuestions.forEach(p=>{
        this.assessmentResponse.client_unique_identifier = ('1231/321/45');
        this.assessmentResponse.assessment_question_id = p.assessment_question_id;
        this.assessmentResponse.value = p.default_response ? 1 : 0;
        this.assessmentResponse.created_by = +sessionStorage.getItem('userid');
        this.assessmentResponse.created_date = Date.now();

        this.assessmentResponses.push(this.assessmentResponse);
        this.assessmentResponse = {} as AssessmentResponses;

      })



    this.manageclientService.createUpdateAssessmentResponses(this.assessmentResponses)
    .subscribe(
      data => {
        this.addSuccess("Success.","Assessment submitted successfully.");
  },
  error => {
    this.addError("Unsuccessful.","Assessment could not be submitted successfully.");
    });
  }
  else{
    this.addError("Unsuccessful.","You must make at least one selection.");
  }


  }
  position: string;
confirmSaveAssessment(position: string){
  this.position = position;
  this.confirmationService.confirm({
    message: 'Do you want to submit the responses for <b>'+this.selectedAssessmentType.name+'?',
    header: 'Submit Assessment',
    icon: 'pi pi-info-circle',
    accept: () => {
      this.saveResponses();
    },
    reject: () => {
      this.addSuccess("Cancelled.","Action cancelled or suspended.");
    },
    key: "positionDialog"
});
}

  heirarchyOnSelect(): void{
   this.clinicalregistration.facility_id = +this.selectedHeirarchyUnit.heirarchyunitid;
   this.clinicalregistration.facility_name = this.selectedHeirarchyUnit.name;
   this.facilityDialog = false;
  }

  roots: TreeNode[] = [];

  private buildHeirarchyTree(list) {
    this.roots = [];
    var map = {}, node, i;

    for (i = 0; i < list.length; i += 1) {
      map[list[i].heirarchyunitid] = i; // initialize the map
      list[i].children = []; // initialize the children
    }

    for (i = 0; i < list.length; i += 1) {
      node = list[i];
      if (node.parentid !== 0) {
        list[map[node.parentid]].children.push(node);
      } else {
        this.roots.push(node);
      }
    }
    return this.roots;
  }


  addClient(){
    this.clinicalregistration.userId = +sessionStorage.getItem('userid');
    this.clinicalregistration.dateRegistration= new Date();
   // this.clinicalregistration.dateBirth=  Date.now();
    this.clinicalregistration.gender_id = this.selectedGender.gender_id;
    this.clinicalregistration.occupation_id = this.selectedOccupation.occupation_id;
    this.clinicalregistration.qualification_id = this.selectedQualification.qualification_id;
    this.clinicalregistration.religion_id = this.selectedReligion.religion_id;
    //this.clinicalregistration.language_id = this.selectedLanguage.language_id;
    this.clinicalregistration.reffered_from_id = this.selectedRefferedfrom.referred_from_id;
    this.clinicalregistration.target_group_id = this.selectedTargetGroup.target_group_id;
    //this.clinicalregistration.marital_status_id = this.selectedMaritalStatus
    //this.clinicalregistration.language_id = this.selectedLanguage.language_id;
    //this.clinicalregistration.referred_from = this.selectedRefferedfrom.reffered_from_id;
    //this.clinicalregistration.marital_status_id = this.selectedMaritalStatus..;
    this.manageclientService.createClient(this.clinicalregistration)
    .subscribe(

    () => {
      console.log(this.clinicalregistration.gender_id);
      this.addSuccess("Success","Client registration successfully.");
      },
    () => {
      console.log(this.clinicalregistration.gender_id);
this.addError("Unsuccessful.","Could not register client.");
    }

    );
    }
    goBack(){
    this.location.back();
    }

    onNationalitySelection(){

      this. nationalityMap = [];
      this.nationalityMap.filter(p => {
        if(p.nationality_id === this.selectedNationality.nationality_id){
          this.statesMap = p.state;
        }
      })

  }

  onStatesSelection(){
    // this.json = {};
    if(this.statesMap){
      this.statesMap.forEach(p=>{
        if(p.state_id === this.selectedStates.state_id){
          // this.json = p.states.json
        }
     
      })

    }
  }

   addSuccess(title:string,message:string) {
      this.messageService.add({severity:'success', summary:title, detail:message});
   }
    addError(title:string,message:string) {
      this.messageService.add({severity:'error', summary:title, detail:message});
   }
}



