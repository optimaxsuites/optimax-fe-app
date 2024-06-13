import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { EnrollmentSettingData } from '../domain/enrollmentsetting.data';
import {ManageEnrollmentSettingService} from '../service/manage.enrollmentsetting.service';
import { Location } from '@angular/common';
import {MessageService} from 'primeng/api';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';

@Component({
  selector: 'app-add.enrollmentsetting',
  templateUrl: './add.enrollmentsetting.component.html',
  providers: [MessageService]
})
export class ManageEnrollmentsettingComponent implements OnInit {
  enrollmentsettingcreatedata = {} as EnrollmentSettingData;

  constructor(private router: Router,private messageService: MessageService,private location: Location,private manageenrollmentsettingService:ManageEnrollmentSettingService, private breadcrumbService: AppBreadcrumbService) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['/dashboard'] },
      { label: 'Metadata', routerLink: ['/metadatalist'] },
      { label: 'Add Enrollment Setting', routerLink: ['/addEnrollmentSettinglist'] }    ]);
  }

  ngOnInit(): void {
    if(sessionStorage.getItem('username') == null){
      this.addError("Session Expired.","Your current session has expired. Re-login.");
      this.router.navigate(['']);
    }
  }

addEnrollmentSetting(){
  this.enrollmentsettingcreatedata.created_by = +sessionStorage.getItem("userid");
  this.enrollmentsettingcreatedata.created_date = new Date();
  this.manageenrollmentsettingService.createEnrollmentSetting(this.enrollmentsettingcreatedata).subscribe(
    data => {
      this.addSuccess("Success!","Enrollment Setting added successfully.");
  }, 
  error => {
  this.addError("Failed!","Could not add Enrollment Setting .");
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
  
