import { Component, OnInit,Input, ViewEncapsulation } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import {ManageClientService} from '../service/manage.client.service';
import {ClientPortalService} from '../service/client.portal.service';
import { ClientExtendedInfo } from '../domain/client.portal.data';
import { GenderData,ReligionData } from '../../administration/domain/gender.data';
import { MaritalStatusData } from 'src/app/administration/domain/gender.data';
import { OccupationData } from 'src/app/administration/domain/occupation.data';
import { QualificationData } from 'src/app/administration/domain/occupation.data';
import { MetadataConfigService } from '../../administration/service/metadata-config.service';
import { LanguageData } from 'src/app/administration/domain/gender.data';
import { RefferedfromData, TargetGroupData, CareEntryPointData} from 'src/app/administration/domain/targetgroup.data';
import { HeirarchyUnitsData } from '../../administration/domain/heirarchyunits.data';
import {MessageService,TreeNode} from 'primeng/api';
import { Location } from '@angular/common';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import {ConfirmationService} from 'primeng/api';
import { PriorArtData } from 'src/app/administration/domain/priorart.data';
import { LocalGovernmentAreasData, NationalityData, StatesData } from 'src/app/administration/domain/nationality.data';
import { ManageNationalityService } from 'src/app/administration/service/manage.nationality.service';

@Component({
  selector: 'app-client-portal-detail',
  styleUrls:['./client-portal-detail.component.scss'],
  providers: [MessageService, ConfirmationService],
  encapsulation: ViewEncapsulation.None,
  templateUrl: 'client-portal-detail.component.html'
})

export class ClientPortalDetailComponent implements OnInit {
  submitted: boolean;
  clientInformationList:any;
 selectedClientInformation: ClientExtendedInfo;
  viewedClient: any;
  refferedfromMap: RefferedfromData[];
  selectedRefferedfrom: RefferedfromData;
  religionMap: ReligionData[];
  selectedReligion: ReligionData;
  languageMap: LanguageData[];
  selectedLanguage: LanguageData;
  maritalstatusMap: MaritalStatusData[];
  selectedMaritalStatus: MaritalStatusData[];
  genderMap: GenderData[];
  selectedGender: GenderData;
  occupationMap: OccupationData[];
  selectedOccupation: OccupationData;
  qualificationMap: QualificationData[];
  selectedQualification: QualificationData;
  targetGroupMap: TargetGroupData[];
  selectedtargetGroup: TargetGroupData;
  priorArtMap: PriorArtData[]
  selectedPriorArt: PriorArtData;
  careEntryPointMap: CareEntryPointData[];
  selectedCareEntryPointMap: CareEntryPointData;
  heirarchyunitsMap: HeirarchyUnitsData[]=[];
  heirarchyunitsTree:any[];
  selectedHeirarchyUnit: HeirarchyUnitsData;
  dest: string='';
  loading: boolean = false;
  dateRegistration: Date;
  dateBirth: Date;
  nationalityMap = {} as NationalityData[];
  statesMap = {} as  StatesData[];
  lgaMap: any[]=[];
  selectedNationality: NationalityData;
  selectedState: StatesData;
  selectedlga = {} as LocalGovernmentAreasData;
  client_code;
  personalregistration: any;
  nextofkindata: any[];

  // personalregistration: any;
  
  


  



   constructor(private router: Router,private messageService: MessageService, private breadcrumbService: AppBreadcrumbService,  private clientPortalService:ClientPortalService,
    private location: Location,  private metadataConfigService: MetadataConfigService, private manageclientService:ManageClientService)


     {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['/dashboard'] },
      { label: 'Client Portal Record', routerLink: ['/cportal'] },
      { label: 'Client Portal Detail', routerLink: ['/##/cportald'] }
       ]);
  } 

  ngOnInit(): void {
    if(!this.personalregistration){
      this.loadConfigMetadata();
    }
    this.personalregistration = this.clientPortalService


    
    this.viewedClient = this.clientPortalService.selectedClients;
    
    this.client_code =  this.viewedClient.hospitalNum.slice(this.viewedClient.hospitalNum.lastIndexOf('/')+1);
    this.dateRegistration = new Date(this.viewedClient.dateRegistration);
    this.dateBirth = new Date(this.viewedClient.dateBirth);
    this.getAgeIn();
    //this.loadConfigMetadata();
   
    this.lgaMap.push(this.viewedClient.localGovernmentArea);
    this.viewedClient.lga_id = this.viewedClient.localGovernmentArea.local_government_area_id;
    this.personalregistration.nextofkindata = this.viewedClient.nextofkin;  
  }



  protected async loadConfigMetadata(){

    try {
    this.metadataConfigService.getGenderList().subscribe(p => {this.personalregistration.genderMap = p});
    this.metadataConfigService.getLanguageList().subscribe(p => {this.personalregistration.languageMap = p});
    this.metadataConfigService.getRefferedfromList().subscribe(p => {this.personalregistration.refferedfromMap = p});
    this.metadataConfigService.getReligionList().subscribe(p => {this.personalregistration.religionMap = p});
    this.metadataConfigService.getMaritalStatusList().subscribe(p => {this.personalregistration.maritalstatusMap = p});
    this.metadataConfigService.getOccupationList().subscribe(p => {this.personalregistration.occupationMap = p});
    this.metadataConfigService.getQualificationList().subscribe(p => {this.personalregistration.qualificationMap = p});
    this.metadataConfigService.getTargetGroupList().subscribe(p => {this.personalregistration.targetGroupMap = p});
    this.metadataConfigService.getCareEntryPointList().subscribe(p => {this.personalregistration.careEntryPointMap = p});
    this.metadataConfigService.getPriorArtList().subscribe(p => {this.personalregistration.priorArtMap = p});
    this.metadataConfigService.getNationalityList().subscribe(p => {this.personalregistration.nationalityMap = p});
  //   this.metadataConfigService.getStatesList().subscribe(p => {this.statesMap = p});
  //  this.metadataConfigService.getLocalGovernmentAreasList().subscribe(p => {this.lgaMap = p});


  } catch (error) {
      console.log("Got here as "+error);
  }
  }
  
  facilityDialog: boolean;
  loadHeirarchyUnits(heirarchyid: number,dest: string){
    this.facilityDialog=true;
    if(this.dest != dest){
      this.roots=[];
      this.heirarchyunitsMap = [];
      this.dest = dest;
    }
    if(this.heirarchyunitsMap.length === 0){
    setTimeout(() => {
      this.loading=true;
    this.metadataConfigService.getHeirarchyUnitsListById(heirarchyid).subscribe(p => {
      this.heirarchyunitsMap = p;
      this.buildHeirarchyTree(this.heirarchyunitsMap);
      this.loading=false;
    },
      error=>{
        this.addError("Failure","Poor network connectivity detected. Try again.");
        this.loading=false;
      }
    );

    },1000);
  }
  }
  _state_of_origin: string;

  onNodeSelect(event){
    if(this.dest == 'fac'){
      this.clientInformationList.state_code = event.node.parent.parent.parent.code;
      this.clientInformationList.oss_code = event.node.parent.parent.code;
      this.clientInformationList.lga_code = event.node.parent.code;
    }
    this._state_of_origin = event.node.parent.name;
  }
  ClientInformationList():void{
    this.manageclientService.getClient().subscribe(data => {
      this.clientInformationList = data;
      console.log(this.ClientInformationList);
    }
    );
    }

    goBack(){
      this.location.back();
    }
    editClientInformation(
      viewclient: ClientExtendedInfo){
      this.selectedClientInformation = {...viewclient};
      console.log(this.selectedClientInformation);
     }

     nextPage(){
      if(this.viewedClient.hospitalNum){
        this.router.navigate(['eReg/enextofkin']);
      return;
      }
      this.submitted = true;
    }


     updateClientInformation(){
      this.manageclientService.createClient(this.selectedClientInformation).subscribe(
       () => {
         this.addSuccess("Success!","Client's information updated successfully.");

      },
      () => {
      this.addError("Failed!","Client's creation failed.");

    });
   }
   addSuccess(title:string,message:string) {
    this.messageService.add({severity:'success', summary:title, detail:message});
  }
  addError(title:string,message:string) {
    this.messageService.add({severity:'error', summary:title, detail:message});
  }


  heirarchyOnSet(): void{
    //You can add as many dest... src
    if(this.dest === 'fac'){
    this.clientInformationList.facility_id = +this.selectedHeirarchyUnit.heirarchyunitid;
    this.clientInformationList.facility_name = this.selectedHeirarchyUnit.name;
    this.clientInformationList.facility_code = this.selectedHeirarchyUnit.code;



    }
    if(this.dest === 'nat'){
      this.clientInformationList.nationality_id = +this.selectedHeirarchyUnit.heirarchyunitid;
      this.clientInformationList.nationality_name = this.selectedHeirarchyUnit.name;
      this.clientInformationList.nationality_code = this.selectedHeirarchyUnit.code;
      }
      if(this.dest === 'lga'){
        this.clientInformationList.lga_id = +this.selectedHeirarchyUnit.heirarchyunitid;
        this.clientInformationList.lga_of_origin = this.selectedHeirarchyUnit.name;
        this.clientInformationList.lga_code = this.selectedHeirarchyUnit.code;
        this.clientInformationList.state_of_origin = this._state_of_origin;
        }

    this.facilityDialog = false;
    //console.log(event.event.node.parent.name);

   }

   //This will be put int util soon
 roots: TreeNode[] = [];
 private buildHeirarchyTree(list) {
  this.roots = [];
  var map = {}, node, i;

  for (i = 0; i < list.length; i += 1) {
    map[list[i].heirarchyunitid] = i; //Dami... initialize the map
    list[i].children = []; // Dami... initialize the children
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

getAgeIn(){
  var ai = {} as any;
   ai = this.clientPortalService.getDateIn(this.dateBirth, new Date())
  this.year = ai.year;
  this.month = ai.month;
  this.days = ai.days;
}

year: number=0; month: number=0; days: number=0;
getDateIn(fromdate: Date, todate){
 if(todate) todate= new Date(todate);
 else todate= new Date();

 var age= [], fromdate= new Date(fromdate),
 y= [todate.getFullYear(), fromdate.getFullYear()],
 ydiff= y[0]-y[1],
 m= [todate.getMonth(), fromdate.getMonth()],
 mdiff= m[0]-m[1],
 d= [todate.getDate(), fromdate.getDate()],
 ddiff= d[0]-d[1];

 if(mdiff < 0 || (mdiff=== 0 && ddiff<0))--ydiff;
 if(mdiff<0) mdiff+= 12;
 if(ddiff<0){
     fromdate.setMonth(m[1]+1, 0);
     ddiff= fromdate.getDate()-d[1]+d[0];
     --mdiff;
 }
 if(ydiff > 0) this.year=ydiff;
 if(mdiff> 0) this.month=mdiff;
 if(ddiff> 0) this.days=ddiff;

}

onNationalitySelection(){
  this.statesMap = [];
  this.personalregistration.nationalityMap.filter(p => {
    if(p.nationality_id === this.viewedClient.nationality_id){
      this.personalregistration.statesMap = p.state;
    }
  })
}
onStatesSelection(){
  this.lgaMap = [];
  this.personalregistration.statesMap.filter(p => {
    if(p.state_id === this.viewedClient.state_id){
      this.lgaMap = p.localgovernmentarea;
    }
  })

}

ngOnDestroy() {
  this.clientPortalService = this.personalregistration;
}

}


// onStateSelectionEdit(){

//   this.lgaMap = [];
 
//   this.statesMap.filter(p => {
//     if(p.state_id ){
//       this.lgaMap = p.localgovernmentarea;
//     }
//   })
  
//   }


// onStatesSelection(){
//   // this.json = {};
//   this .lgaMap =[];
//   // this .statesMap.filter(p =>{
//   if(this.statesMap){
//     this.statesMap.forEach(p=>{
//       if(p.state_id === this.personalregistration.selectedStates.state_id){
//         // this.json = p.states.json
//       }
   
//     })

//   }
// }


// onLocalGovernmentAreasSelection(){

//   this.lgaMap = [];
//   this.lgaMap.filter(p => {
//     if(p.local_government_area_id === this.viewedClient.lga_id){
//       // this.lgaMap = p.localgovernmentarea;

//     }
//   })
  
//   }










