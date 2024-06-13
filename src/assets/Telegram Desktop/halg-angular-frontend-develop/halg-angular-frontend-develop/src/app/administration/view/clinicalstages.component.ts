import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { ClinicalStagesData } from '../domain/clinicalstage.data';
import {ManageClinicalStagesService} from '../service/manage.clinical-stages.service';
import { Location } from '@angular/common';
import {MessageService} from 'primeng/api';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';


@Component({
  selector: 'app-clinicalstageslist',
  templateUrl: './clinicalstages.component.html'    ,

  
  providers: [MessageService]
})
export class ClinicalStagesComponent  implements OnInit {

  clinicalStagescreatedata = {} as ClinicalStagesData;
  clinicalStagesList:any;
  selectedclinicalStages: ClinicalStagesData;
  clinicalStagesDialog: boolean;
  clinicalStagesEditDialog: boolean;
  clinicalStagesImportDialog: boolean;


  constructor(private router: Router,private messageService: MessageService,private location: Location,
    private manageclinicalstagesService:ManageClinicalStagesService, private breadcrumbService: AppBreadcrumbService) {

     this.breadcrumbService.setItems([
     { label: 'Dashboard', routerLink: ['/dashboard'] },
     { label: 'Metadata', routerLink: ['/metadatalist'] },
     { label: 'List Clinical Stages', routerLink: ['/clinicalstageslist'] }    ]);
 }

 ngOnInit(): void {
   if(sessionStorage.getItem('username') == null){
     this.addError("Session Expired.","Your current session has expired. Re-login.");
     this.router.navigate(['']);
   } 
   this.ClinicalStagesList();
 }

 addclinicalStages(){
  this.clinicalStagescreatedata.created_by = +sessionStorage.getItem("userid");
  this.clinicalStagescreatedata.created_date= Date.now ();
  this.manageclinicalstagesService.createClinicalStage(this.clinicalStagescreatedata).subscribe(
    data => {
      this.addSuccess("Success!","Clinical Stage added successfully.");
  },
  error => {
  this.addError("Failed!","Could not add Clinical Stage.");
  }

  );
  }

  ClinicalStagesList():void{
    this.manageclinicalstagesService.getClinicalStage().subscribe(data => {
      this.clinicalStagesList = data;
     }
    );
    }

    goToAddclinicalStages(clinicalStage: ClinicalStagesData){
      this.router.navigate(['addclinicalStages']);
      this.clinicalStagesDialog=true;
    }


    importclinicalStages(clinicalStage: ClinicalStagesData){
      this.router.navigate(['importclinicalStages']);
      this.clinicalStagesDialog=true;
    }

  goBack(){
    this.location.back();
    }

    editclinicalStages(clinicalstages: ClinicalStagesData){
      this.selectedclinicalStages = {...clinicalstages}; 
      this.clinicalStagesEditDialog=true;
     }

     updateclinicalStages(){
      this.manageclinicalstagesService.createClinicalStage(this.selectedclinicalStages).subscribe(
        () => {
          this.addSuccess("Success!","Clinical Stage information updated successfully.");

       },
       () => {
       this.addError("Failed!","Clinical Stage creation failed.");
       this.clinicalStagesDialog = false;
     });
    }

    addSuccess(title:string,message:string) {
      this.messageService.add({severity:'success', summary:title, detail:message});


    }
    addError(title:string,message:string) {
      this.messageService.add({severity:'error', summary:title, detail:message});

    }

    hideclinicalStagesDialog(){
      this.clinicalStagesDialog = false;
    }

    hideclinicalStagesEditDialog(){
      this.clinicalStagesEditDialog = false;
    }

}


