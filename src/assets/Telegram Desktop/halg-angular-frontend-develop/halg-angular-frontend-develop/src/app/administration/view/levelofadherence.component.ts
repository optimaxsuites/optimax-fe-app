import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { LevelofAdherenceData } from '../domain/levelofadherence.data';
import { ManageLevelofAdherenceService } from '../service/manage.levelof-adherence.service';
import { Location } from '@angular/common';
import {MessageService} from 'primeng/api';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';


@Component({
  selector: 'app-levelofadherencelist',
  templateUrl: './levelofadherence.component.html',

  
  providers: [MessageService]
})
export class LevelofAdherenceComponent  implements OnInit {

  levelofAdherencecreatedata = {} as LevelofAdherenceData;
  levelofAdherenceList:any;
  selectedlevelofAdherence: LevelofAdherenceData;
  levelofAdherenceDialog: boolean;
  levelofAdherenceEditDialog: boolean;
  levelofAdherenceImportDialog: boolean;


  constructor(private router: Router,private messageService: MessageService,private location: Location,
    private managelevelofadherenceService:ManageLevelofAdherenceService, private breadcrumbService: AppBreadcrumbService) {

     this.breadcrumbService.setItems([
     { label: 'Dashboard', routerLink: ['/dashboard'] },
     { label: 'Metadata', routerLink: ['/metadatalist'] },
     { label: 'List Level Of Adherence', routerLink: ['/levelofadherencelist'] }    ]);
 }

 ngOnInit(): void {
   if(sessionStorage.getItem('username') == null){
     this.addError("Session Expired.","Your current session has expired. Re-login.");
     this.router.navigate(['']);
   } 
   this.LevelofAdherenceList();
 }

 addlevelofAdherence(){
  this.levelofAdherencecreatedata.created_by = +sessionStorage.getItem("userid");
  this.levelofAdherencecreatedata.created_date= Date.now ();
  this.managelevelofadherenceService.createLevelofAdherence(this.levelofAdherencecreatedata).subscribe(
    data => {
      this.addSuccess("Success!","Level Of Adherence added successfully.");
  },
  error => {
  this.addError("Failed!","Could not add Level Of Adherence.");
  }

  );
  }

  LevelofAdherenceList():void{
    this.managelevelofadherenceService.getLevelofAdherence().subscribe(data => {
      this.levelofAdherenceList = data;
      console.log(data);
    }
    );
    }

    goToAddlevelofAdherence(levelofadherence: LevelofAdherenceData){
      this.router.navigate(['addlevelofadherence']);
      this.levelofAdherenceDialog=true;
    }


    importlevelofAdherence(levelofadherence: LevelofAdherenceData){
      this.router.navigate(['importlevelofAdherence']);
      this.levelofAdherenceDialog=true;
    }

  goBack(){
    this.location.back();
    }

    editlevelofAdherence(levelofadherence: LevelofAdherenceData){
      this.selectedlevelofAdherence = {...levelofadherence};
      this.levelofAdherenceEditDialog=true;
     }

     updatelevelofAdherence(){
      this.managelevelofadherenceService.createLevelofAdherence(this.selectedlevelofAdherence).subscribe(
        () => {
          this.addSuccess("Success!","Level Of Adherence information updated successfully.");

       },
       () => {
       this.addError("Failed!","Level Of Adherence creation failed.");
       this.levelofAdherenceDialog = false;
     });
    }

    addSuccess(title:string,message:string) {
      this.messageService.add({severity:'success', summary:title, detail:message});


    }
    addError(title:string,message:string) {
      this.messageService.add({severity:'error', summary:title, detail:message});

    }

    hidelevelofAdherenceDialog(){
      this.levelofAdherenceDialog = false;
    }

    hidelevelofAdherenceEditDialog(){
      this.levelofAdherenceEditDialog = false;
    }

}




