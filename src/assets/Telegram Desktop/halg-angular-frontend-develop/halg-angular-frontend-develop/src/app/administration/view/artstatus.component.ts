import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { ArtStatusData } from '../domain/artstatus.data';
import {ManageArtStatusService} from '../service/manage.art-status.service';
import { Location } from '@angular/common';
import {MessageService} from 'primeng/api';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';


@Component({
  selector: 'app-artstatuslist',
  templateUrl: './artstatus.component.html'    ,

  
  providers: [MessageService]
})
export class ArtStatusComponent  implements OnInit {

  artStatuscreatedata = {} as ArtStatusData;
  artStatusList:any;
  selectedartStatus: ArtStatusData;
  artStatusDialog: boolean;
  artStatusEditDialog: boolean;
  artStatusImportDialog: boolean;


  constructor(private router: Router,private messageService: MessageService,private location: Location,
    private manageartstatusService:ManageArtStatusService, private breadcrumbService: AppBreadcrumbService) {

     this.breadcrumbService.setItems([
     { label: 'Dashboard', routerLink: ['/dashboard'] },
     { label: 'Metadata', routerLink: ['/metadatalist'] },
     { label: 'List Art Status', routerLink: ['/artstatuslist'] }    ]);
 }

 ngOnInit(): void {
   if(sessionStorage.getItem('username') == null){
     this.addError("Session Expired.","Your current session has expired. Re-login.");
     this.router.navigate(['']);
   } 
   this.ArtStatusList();
 }

 addartStatus(){
  this.artStatuscreatedata.created_by = +sessionStorage.getItem("userid");
  this.artStatuscreatedata.created_date= Date.now ();
  this.manageartstatusService.createArtStatus(this.artStatuscreatedata).subscribe(
    data => {
      this.addSuccess("Success!","Art Status added successfully.");
  },
  error => {
  this.addError("Failed!","Could not add Art Status.");
  }

  );
  }

  ArtStatusList():void{
    this.manageartstatusService.getArtStatus().subscribe(data => {
      this.artStatusList = data;
      console.log(data);
    }
    );
    }

    goToAddartStatus(artstatus: ArtStatusData){
      this.router.navigate(['addartstatus']);
      this.artStatusDialog=true;
    }


    importartStatus(artstatus: ArtStatusData){
      this.router.navigate(['importartStatus']);
      this.artStatusDialog=true;
    }

  goBack(){
    this.location.back();
    }

    editartStatus(artstatus: ArtStatusData){
      this.selectedartStatus = {...artstatus};
      this.artStatusEditDialog=true;
     }

     updateartStatus(){
      this.manageartstatusService.createArtStatus(this.selectedartStatus).subscribe(
        () => {
          this.addSuccess("Success!","Art Status information updated successfully.");

       },
       () => {
       this.addError("Failed!","Art Status creation failed.");
       this.artStatusDialog = false;
     });
    }

    addSuccess(title:string,message:string) {
      this.messageService.add({severity:'success', summary:title, detail:message});


    }
    addError(title:string,message:string) {
      this.messageService.add({severity:'error', summary:title, detail:message});

    }

    hideartStatusDialog(){
      this.artStatusDialog = false;
    }

    hideartStatusEditDialog(){
      this.artStatusEditDialog = false;
    }

}



