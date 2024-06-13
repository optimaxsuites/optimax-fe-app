import { Component, OnInit } from '@angular/core';
import {MessageService, MenuItem,LazyLoadEvent, ConfirmationService} from 'primeng/api';
import { NextofKinData, PersonalData } from 'src/app/client/domain/client.data';
import { LocalGovernmentAreasData } from '../domain/nationality.data';
import { ClientPortalService } from 'src/app/client/service/client.portal.service';
import { ManageClientService } from 'src/app/client/service/manage.client.service';
import { InvestigationData } from '../domain/consultation.data';
import { SourceRealm } from '../domain/datamigration.data';
import { GenderData, MaritalStatusData } from '../domain/gender.data';
import { OccupationData } from '../domain/occupation.data';
import { CareEntryPointData, RefferedfromData, TargetGroupData } from '../domain/targetgroup.data';
import { MetadataConfigService } from '../service/metadata-config.service';
declare var require: any;


@Component({
  selector: 'app-data-migration',
  template: `<p-toast position="top-center"></p-toast>
  <p-card>
  <ng-template pTemplate="title">
  <div class="p-grid p-justify-between">
      Data Migration & Import
      <p-button icon="pi pi-print" iconPos="left"></p-button>
  </div>
  </ng-template>
  <ng-template pTemplate="content">
  <div class="p-grid"> 
  <div class="p-fluid p-formgrid p-grid p-col-12">
    <div class="p-field p-col-4">
    <label for="import_realm"><b>Import Realm/Source*</b></label>
      <p-dropdown [options]="importsource" optionLabel="label" optionValue="value" placeholder="-Select-" [(ngModel)]="selectedImportSource"
      [showTransitionOptions]="'0ms'" [hideTransitionOptions]="'0ms'" required
      #importrealm="ngModel" [ngClass]="{'ng-dirty': (importrealm.invalid) || (importrealm.dirty && importrealm.invalid)}">
      </p-dropdown>
      <small *ngIf="(importrealm.invalid) || (importrealm.dirty && importrealm.invalid)" class="p-error">
    Select to preview</small>
    </div>
</div>
    <div class="p-field p-col-8">
    <button pButton pRipple type="button" icon="pi pi-eye" label="Preview Import" class="p-button-outlined p-mr-2 p-col-2" (click)="previewImportData()"></button>
    <button pButton pRipple type="button" icon="pi pi-cloud-download" label="Import" class="p-button-outlined p-mr-2 p-col-2" (click)="processMigration()"></button>

    </div>

    <div class="p-field p-col-12">
    <p-table [value]="patientdatafromlamis" [paginator]="true" [rows]="10" [showCurrentPageReport]="true" 
    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [rowsPerPageOptions]="[10,25,50]">
    <ng-template pTemplate="header">
        <tr>
            <th>patientId</th>
            <th>Hospital No</th>
            <th>Full name</th>
            <th>Gender</th>
            <th>LGA</th>
            <th>Date of Birth</th>
        </tr>
    </ng-template>
    <ng-template pTemplate="body" let-patient>
        <tr>
            <td>{{patient.patientId}}</td>
            <td>{{patient.hospitalNum}}</td>
            <td>{{patient.surname}} {{patient.otherNames}}</td>
            <td>{{patient.gender}}</td>
            <td>{{patient.lgaId}}</td>
            <td>{{patient.dateBirth}}</td>
            
        </tr>
    </ng-template>
</p-table>
</div>
    </div>
    


    </ng-template>

    <p-dialog [(visible)]="processdialog" [style]="{width: '850px'}" 
    header="Migration Progress" [modal]="true" styleClass="p-fluid" [maximizable]="true">
    <p-progressBar mode="indeterminate"></p-progressBar>
    <p>{{msg_scope}}
    <p-footer>
<div class="p-grid p-nogutter p-justify-end">
        <p-button label="Save Result" icon="pi pi-save" iconPos="left"></p-button>
    </div>
</p-footer>
</p-dialog>
  </p-card>
  `
  
  ,
  styleUrls: ['./data-migration.component.scss'],
  providers:[MessageService,ConfirmationService]
})
export class DataMigrationComponent implements OnInit {
patientdatafromlamis: any[];
disabled = true;
genderMap: GenderData[];
occupationMap: OccupationData[];
maritalstatusMap: MaritalStatusData[];
careEntryPointMap: CareEntryPointData[];
targetGroupMap: TargetGroupData[];
lgaMap: LocalGovernmentAreasData[];
refferedfromMap: RefferedfromData[];
importsource: any[];
selectedImportSource: any;


  constructor(
    private clientPortalService: ClientPortalService,
    private metadataConfigService: MetadataConfigService,
    private manageclientService:ManageClientService,
    private messageService: MessageService) { }


  ngOnInit(): void {
    this.loadConfigMetadata();
    
   this.importsource = [
      {
        label: 'LAMIS', value: 'LAMIS'
      },
      {
        label: 'DMEL', value: 'DMEL'
      },
      
    
    ]

    }

    protected loadConfigMetadata(){

      this.metadataConfigService.getGenderList().subscribe(p => {this.genderMap = p});
      this.metadataConfigService.getOccupationList().subscribe(p => {this.occupationMap = p});
      this.metadataConfigService.getMaritalStatusList().subscribe(p => {this.maritalstatusMap = p});
      this.metadataConfigService.getCareEntryPointList().subscribe(p => {this.careEntryPointMap = p});
      this.metadataConfigService.getTargetGroupList().subscribe(p => {this.targetGroupMap = p});
      this.metadataConfigService.getRefferedfromList().subscribe(p => {this.refferedfromMap = p});
      this.metadataConfigService.getLocalGovernmentList().subscribe(p => {this.lgaMap = p});
    }
  previewImportData(){
    this.clientPortalService.getImportData('patient')
   .subscribe(p=> {this.patientdatafromlamis=p})
    //this.patientdatafromlamis = require('./patient.json');
    //if(this.patientdatafromlamis.length > 0){
      //this.disabled = false;
    //}

  }
 
  processMigration(){
   this.processClinicalRegistrationMigration();

//Posting registration data
if(this.personaldata){
  console.log("Got here as "+JSON.stringify(this.personaldata));
   this.manageclientService.createClient(this.personaldata)
        .subscribe(
        data => {
          this.addSuccess("Success","New client added successfully.");
          },
        error => {
        this.addError("Unsuccessful.","Failed to add new client. "+error.message);
            console.error(error);
        });
      }

  }

  personaldata: PersonalData[];
  nextofkindata: NextofKinData[];
  _personaldata = {} as any;
  _nextofkindata = {} as any;
  processdialog: boolean = false;
  msg_scope: string;
  count: number=0;
  
  processClinicalRegistrationMigration(){
    console.log("Migrating clinical registration...");
    this.msg_scope = "Migrating clinical registration...";
    this.personaldata = [];
    if(this.patientdatafromlamis.length > 0){
     this.processdialog = true;
      this.patientdatafromlamis.forEach(t => {

        //fetching personal data from lamis endpoint

        this._personaldata.hospitalNum = t.hospitalNum;
        this._personaldata.patientId = t.patientId;
        this._personaldata.surname = t.surname;
        this._personaldata.firstname = t.surname;
        this._personaldata.maidenname = t.otherNames;
        this._personaldata.otherNames = t.otherNames;
        this._personaldata.dateBirth = new Date(t.dateBirth.substr(0,t.dateBirth.lastIndexOf('[UTC]'))).getTime();
        this._personaldata.phone_number = t.phone;
        this._personaldata.address = t.address;
        this._personaldata.facility_id = t.facilityId;
        this._personaldata.dateRegistration = new Date(t.dateRegistration.substr(0,t.dateRegistration.lastIndexOf('[UTC]'))).getTime();
        this._personaldata.userId = t.userId;
        this._personaldata.idUuid = t.uuid;
        this._personaldata.lga = t.lgaId;
      
      
        if(this.genderMap){
        this.genderMap.map(p => { if(p.name == t.gender){this._personaldata.gender_id = p.gender_id}});
        }
        if(this.occupationMap){
       this.occupationMap.map(p => { if(p.name == t.occupation){this._personaldata.occupation_id = p.occupation_id}});
        }
        if(this.maritalstatusMap){
        this.maritalstatusMap.map(p => {if(p.name == t.maritalStatus){this._personaldata.marital_status_id = p.marital_status_id}});
        }
        if(this.careEntryPointMap){
        this.careEntryPointMap.map(p => { if(p.name == t.entryPoint){this._personaldata.care_entry_point_id = p.care_entry_point_id}});
      }
      if(this.targetGroupMap){
        this.targetGroupMap.map(p => { if(p.name == t.targetGroup){this._personaldata.target_group_id = p.target_group_id}});
      }
      if(this.refferedfromMap){
      this.refferedfromMap.map(p => { if(p.name == t.sourceReferral){this._personaldata.reffered_from_id = p.referred_from_id}});
      }
    
        
        this.personaldata.push(this._personaldata);
        this._personaldata = {} as any;

        //fetching next of kin from lamis endpoint
        this._nextofkindata.surname = t.nextKin;
        this._nextofkindata.address = t.addressKin;
        this._nextofkindata.phoneno = t.phoneKin;
       
        if(this.nextofkindata){
        this.nextofkindata.push(this._nextofkindata);
        }

        this.count = this.count+1;
      })
    //  console.log(JSON.stringify(this.personaldata));
      

    }
    this.msg_scope="\nCompleted migrating scope "+this.count;
    setTimeout(() => {
      this.msg_scope="\nSending scope to back end for processing...";
      this.processNextOfKinMigration();
    },5000)

  }
  processNextOfKinMigration(){
    setTimeout(()=> {
      this.msg_scope = "\n Migrating next of kin...";
    },3000)
  }


  addSuccess(title:string,message:string) {
    this.messageService.add({severity:'success', summary:title, detail:message});
 }
  addError(title:string,message:string) {
    this.messageService.add({severity:'error', summary:title, detail:message});
 }

}
