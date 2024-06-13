import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { OppInfectionsData } from '../domain/oppinfections.data';
import { ManageOppInfectionsService } from '../service/manage.opp-infections.service';
import { Location } from '@angular/common';
import {MessageService} from 'primeng/api';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';


@Component({
  selector: 'app-oppinfectionslist',
  templateUrl: './oppinfections.component.html',


  providers: [MessageService]
})
export class OppInfectionsComponent  implements OnInit {

  oppInfectionscreatedata = {} as OppInfectionsData;
  oppInfectionsList:any;
  selectedoppInfections: OppInfectionsData;
  oppInfectionsDialog: boolean;
  oppInfectionsEditDialog: boolean;
  oppInfectionsImportDialog: boolean;


  constructor(private router: Router,private messageService: MessageService,private location: Location,
    private manageoppinfectionsService:ManageOppInfectionsService, private breadcrumbService: AppBreadcrumbService) {

     this.breadcrumbService.setItems([
     { label: 'Dashboard', routerLink: ['/dashboard'] },
     { label: 'Metadata', routerLink: ['/metadatalist'] },
     { label: 'List Opportunistic Infections', routerLink: ['/oppinfectionslist'] }]);
 }

 ngOnInit(): void {
   if(sessionStorage.getItem('username') == null){
     this.addError("Session Expired.","Your current session has expired. Re-login.");
     this.router.navigate(['']);
   }
   this.OppInfectionsList();
 }

 addoppInfections(){
  this.oppInfectionscreatedata.created_by = +sessionStorage.getItem("userid");
  this.oppInfectionscreatedata.created_date= Date.now ();
  this.manageoppinfectionsService.createOppInfections(this.oppInfectionscreatedata).subscribe(
    data => {
      this.addSuccess("Success!","Opportunistic infections added successfully.");
  },
  error => {
  this.addError("Failed!","Could not add Opportunistic infections.");
  }

  );
  }

  OppInfectionsList():void{
    this.manageoppinfectionsService.getOppInfections().subscribe(data => {
      this.oppInfectionsList = data;
      console.log(data);
    }
    );
    }

    goToAddoppInfections(oppinfections: OppInfectionsData){
      this.router.navigate(['addoppinfections']);
      this.oppInfectionsDialog=true;
    }


    importoppInfections(oppinfections: OppInfectionsData){
      this.router.navigate(['importoppInfections']);
      this.oppInfectionsDialog=true;
    }

  goBack(){
    this.location.back();
    }

    editoppInfections(oppinfections: OppInfectionsData){
      this.selectedoppInfections = {...oppinfections};
      this.oppInfectionsEditDialog=true;
     }

     updateoppInfections(){
      this.manageoppinfectionsService.createOppInfections(this.selectedoppInfections).subscribe(
        () => {
          this.addSuccess("Success!","Opportunistic infections information updated successfully.");

       },
       () => {
       this.addError("Failed!","Opportunistic infections creation failed.");
       this.oppInfectionsDialog = false;
     });
    }

    addSuccess(title:string,message:string) {
      this.messageService.add({severity:'success', summary:title, detail:message});


    }
    addError(title:string,message:string) {
      this.messageService.add({severity:'error', summary:title, detail:message});

    }

    hideaoppInfectionsDialog(){
      this.oppInfectionsDialog = false;
    }

    hideaoppInfectionsEditDialog(){
      this.oppInfectionsEditDialog = false;
    }

}





