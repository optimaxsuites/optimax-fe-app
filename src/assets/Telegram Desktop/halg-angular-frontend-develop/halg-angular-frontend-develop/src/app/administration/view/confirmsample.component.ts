import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { ConfirmSampleData } from '../domain/confirmsampledata.data';
import {ManageConfirmsampleService} from '../service/manage.confirmSample.service';
import { Location } from '@angular/common';
import {MessageService} from 'primeng/api';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';


@Component({
  selector: 'app-confirmsample',
  templateUrl: './confirmsample.component.html',
  providers: [MessageService]
})
export class ConfirmsampleComponent implements OnInit {

  confirmSamplecreatedata = {} as ConfirmSampleData;
  confirmSampleList:any;
  selectedconfirmSample: ConfirmSampleData;
  confirmSampleDialog: boolean;
  confirmSampleEditDialog: boolean;
  confirmSampleImportDialog: boolean;


  constructor(private router: Router,private messageService: MessageService,private location: Location,
    private manageconfirmsampleService:ManageConfirmsampleService, private breadcrumbService: AppBreadcrumbService) {

     this.breadcrumbService.setItems([
     { label: 'Dashboard', routerLink: ['/dashboard'] },
     { label: 'Metadata', routerLink: ['/metadatalist'] },
     { label: 'List Confirm Sample', routerLink: ['/confirmsamplelist'] }    ]);
 }

 ngOnInit(): void {
  /* if(sessionStorage.getItem('username') == null){
     this.addError("Session Expired.","Your current session has expired. Re-login.");
     this.router.navigate(['']);
   } */
   this.confirmSampleList();
 }

 addconfirmSample(){
  this.confirmSamplecreatedata.created_by = +sessionStorage.getItem("userid");
  this.confirmSamplecreatedata.created_date = Date.now ();
  this.manageconfirmsampleService.createConfirmSample(this.confirmSamplecreatedata).subscribe(
    data => {
      this.addSuccess("Success!","Confirm Sample added successfully.");
  },
  error => {
  this.addError("Failed!","Could not add Confirm Sample.");
  }

  );
  }

  ConfirmSampleList():void{
    this.manageconfirmsampleService.getConfirmSamples().subscribe(data => {
      this.confirmSampleList = data;
      console.log(data);
    }
    );
    }

    goToAddconfirmSample(confirmSample: ConfirmSampleData){
      this.router.navigate(['addconfirmSample']);
      this.confirmSampleDialog=true;
    }


    importconfirmSample(confirmSample: ConfirmSampleData){
      this.router.navigate(['importconfirmSample']);
      this.confirmSampleImportDialog=true;
    }

  goBack(){
    this.location.back();
    }

    editconfirmSample(confirmSample: ConfirmSampleData){
      this.selectedconfirmSample = {...confirmSample};
      this.confirmSampleEditDialog=true;
     }

     updateconfirmSample(){
      this.manageconfirmsampleService.createConfirmSample(this.selectedconfirmSample).subscribe(
        () => {
          this.addSuccess("Success!","Confirm Sample information updated successfully.");

       },
       () => {
       this.addError("Failed!","Confirm Sample creation failed.");
       this.confirmSampleDialog = false;
     });
    }

    addSuccess(title:string,message:string) {
      this.messageService.add({severity:'success', summary:title, detail:message});


    }
    addError(title:string,message:string) {
      this.messageService.add({severity:'error', summary:title, detail:message});

    }

    hideconfirmSampleDialog(){
      this.confirmSampleDialog = false;
    }

    hideconfirmSampleEditDialog(){
      this.confirmSampleEditDialog = false;
    }

}


