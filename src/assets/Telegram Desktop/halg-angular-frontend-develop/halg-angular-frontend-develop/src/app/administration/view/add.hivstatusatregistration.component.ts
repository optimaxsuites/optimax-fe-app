import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { HivStatusAtRegistrationData } from '../domain/hivstatusatregistration.data';
import {ManageHivstatusatregistrationService} from '../service/manage.hivstatusatregistration.service';
import { Location } from '@angular/common';
import {MessageService} from 'primeng/api';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';

@Component({
  selector: 'app-add.hivstatusatregistration',
  templateUrl: './add.hivstatusatregistration.component.html',
  providers: [MessageService]
})
export class ManageHivstatusatregistrationComponent implements OnInit {

  hivstatusatregistrationcreatedata = {} as HivStatusAtRegistrationData;

  constructor(private router: Router,private messageService: MessageService,private location: Location,private managehivstatusatregistrationService:ManageHivstatusatregistrationService, private breadcrumbService: AppBreadcrumbService) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['/dashboard'] },
      { label: 'Metadata', routerLink: ['/metadatalist'] },
      { label: 'Add Hiv Status At Registration', routerLink: ['/addHivstatusatregistrationlist'] }    ]);
  }

  ngOnInit(): void {
    if(sessionStorage.getItem('username') == null){
      this.addError("Session Expired.","Your current session has expired. Re-login.");
      this.router.navigate(['']);
    }
  }

addHivstatusatregistration(){
  this.hivstatusatregistrationcreatedata.created_by = +sessionStorage.getItem("userid");
  this.hivstatusatregistrationcreatedata.created_date = new Date();
  this.managehivstatusatregistrationService.createHivStatusAtRegistration(this.hivstatusatregistrationcreatedata).subscribe(
    () => {
      this.addSuccess("Success!","Hiv Status At Registration added successfully.");
  }, 
  () => {
  this.addError("Failed!","Could not add Hiv Status At Registration.");
  }
  
  );
}
  
  goBack(){
  this.location.back();
  }
  
  addSuccess(title:string,message:string) {
    this.messageService.add({severity:'success', summary:title, detail:message});
    
  
  }
  addError(title:string,message:string) {
    this.messageService.add({severity:'error', summary:title, detail:message});
    
  }
  
  
  }
  

