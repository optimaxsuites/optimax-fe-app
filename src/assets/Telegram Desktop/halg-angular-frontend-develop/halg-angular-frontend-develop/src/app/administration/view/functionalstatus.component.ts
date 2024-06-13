import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { FunctionalStatusData } from '../domain/functionalstatus.data';
import {ManageFunctionalStatusService} from '../service/manage.functionalstatus.service';
import { Location } from '@angular/common';
import {MessageService} from 'primeng/api';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';


@Component({
  selector: 'app-functionalstatuslist',
  templateUrl:'./functionalstatus.component.html'    ,

  
  providers: [MessageService]
})
export class FunctionalStatusComponent  implements OnInit {

  functionalStatuscreatedata = {} as FunctionalStatusData;
  functionalStatusList:any;
  selectedfunctionalStatus: FunctionalStatusData;
  functionalStatusDialog: boolean;
  functionalStatusEditDialog: boolean;
  functionalStatusImportDialog: boolean;


  constructor(private router: Router,private messageService: MessageService,private location: Location,
    private managefunctionalstatusService:ManageFunctionalStatusService, private breadcrumbService: AppBreadcrumbService) {

     this.breadcrumbService.setItems([
     { label: 'Dashboard', routerLink: ['/dashboard'] },
     { label: 'Metadata', routerLink: ['/metadatalist'] },
     { label: 'List Functional Status', routerLink: ['/functionalstatuslist'] }    ]);
 }

 ngOnInit(): void {
   if(sessionStorage.getItem('username') == null){
     this.addError("Session Expired.","Your current session has expired. Re-login.");
     this.router.navigate(['']);
   } 
   this.FunctionalStatusList();
 }

 addfunctionalStatus(){
  this.functionalStatuscreatedata.created_by = +sessionStorage.getItem("userid");
  this.functionalStatuscreatedata.created_date= Date.now ();
  this.managefunctionalstatusService.createFunctionalStatus(this.functionalStatuscreatedata).subscribe(
    data => {
      this.addSuccess("Success!","Functional Status added successfully.");
      
  },
  error => {
  this.addError("Failed!","Could not add Functional Status.");
  }

  );
  }

  FunctionalStatusList():void{
    this.managefunctionalstatusService.getFunctionalStatus().subscribe(data => {
      this.functionalStatusList = data;
     
    }
    );
    }

    goToAddfunctionalStatus(functionalstatus: FunctionalStatusData){
      this.router.navigate(['addfunctionalStatus']);
      this.functionalStatusDialog=true;
    }


    importfunctionalStatus(functionalstatus: FunctionalStatusData){
      this.router.navigate(['importfunctionalStatus']);
      this.functionalStatusDialog=true;
    }

  goBack(){
    this.location.back();
    }

    editfunctionalStatus(functionalstatus: FunctionalStatusData){
      this.selectedfunctionalStatus = {...functionalstatus};
      this.functionalStatusEditDialog=true;
     }

     updatefunctionalStatus(){
      this.managefunctionalstatusService.createFunctionalStatus(this.selectedfunctionalStatus).subscribe(
        () => {
          this.addSuccess("Success!","Functional Status information updated successfully.");

       },
       () => {
       this.addError("Failed!","Functional Status creation failed.");
       this.functionalStatusDialog = false;
     });
    }

    addSuccess(title:string,message:string) {
      this.messageService.add({severity:'success', summary:title, detail:message});


    }
    addError(title:string,message:string) {
      this.messageService.add({severity:'error', summary:title, detail:message});

    }

    hidefunctionalStatusDialog(){
      this.functionalStatusDialog = false;
    }

    hidefunctionalStatusEditDialog(){
      this.functionalStatusEditDialog = false;
    }

}



