import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { ClientTypeData } from '../domain/clienttype.data';
import {ManageClientTypeService} from '../service/manage.clienttype.service';
import { Location } from '@angular/common';
import {MessageService} from 'primeng/api';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';


@Component({
  selector: 'app-clienttypelist',
  templateUrl: './clienttype.component.html'    ,

  
  providers: [MessageService]
})
export class ClientTypeComponent  implements OnInit {

  clientTypecreatedata = {} as ClientTypeData;
  clientTypeList:any;
  selectedclientType: ClientTypeData;
  clientTypeDialog: boolean;
  clientTypeEditDialog: boolean;
  clientTypeImportDialog: boolean;


  constructor(private router: Router,private messageService: MessageService,private location: Location,
    private manageclienttypeService:ManageClientTypeService, private breadcrumbService: AppBreadcrumbService) {

     this.breadcrumbService.setItems([
     { label: 'Dashboard', routerLink: ['/dashboard'] },
     { label: 'Metadata', routerLink: ['/metadatalist'] },
     { label: 'List Client Type', routerLink: ['/clienttypelist'] }    ]);
 }

 ngOnInit(): void {
   if(sessionStorage.getItem('username') == null){
     this.addError("Session Expired.","Your current session has expired. Re-login.");
     this.router.navigate(['']);
   } 
   this.ClientTypeList();
 }

 addclientType(){
  this.clientTypecreatedata.created_by = +sessionStorage.getItem("userid");
  this.clientTypecreatedata.created_date= Date.now ();
  this.manageclienttypeService.createClientType(this.clientTypecreatedata).subscribe(
    data => {
      this.addSuccess("Success!","Client Type added successfully.");
  },
  error => {
  this.addError("Failed!","Could not add Client Type.");
  }

  );
  }

  ClientTypeList():void{
    this.manageclienttypeService.getClientType().subscribe(data => {
      this.clientTypeList = data;
      console.log(data);
    }
    );
    }

    goToAddclientType(clientType: ClientTypeData){
      this.router.navigate(['addclientType']);
      this.clientTypeDialog=true;
    }


    importclientType(clientType: ClientTypeData){
      this.router.navigate(['importclinicalStages']);
      this.clientTypeDialog=true;
    }

  goBack(){
    this.location.back();
    }

    editclientType(clienttype: ClientTypeData){
      this.selectedclientType = {...clienttype};
      this.clientTypeEditDialog=true;
     }

     updateclientType(){
      this.manageclienttypeService.createClientType(this.selectedclientType).subscribe(
        () => {
          this.addSuccess("Success!","Client Type information updated successfully.");

       },
       () => {
       this.addError("Failed!","Client Type creation failed.");
       this.clientTypeDialog = false;
     });
    }

    addSuccess(title:string,message:string) {
      this.messageService.add({severity:'success', summary:title, detail:message});


    }
    addError(title:string,message:string) {
      this.messageService.add({severity:'error', summary:title, detail:message});

    }

    hideclientTypeDialog(){
      this.clientTypeDialog = false;
    }

    hideclientTypeEditDialog(){
      this.clientTypeEditDialog = false;
    }

}


