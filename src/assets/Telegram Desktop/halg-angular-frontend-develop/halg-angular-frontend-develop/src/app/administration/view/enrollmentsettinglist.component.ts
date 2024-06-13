import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { EnrollmentSettingData } from '../domain/enrollmentsetting.data';
import {ManageEnrollmentSettingService} from '../service/manage.enrollmentsetting.service';
import { Location } from '@angular/common';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import {MessageService,Message} from 'primeng/api';

@Component({
  selector: 'app-enrollmentsettinglist',
  templateUrl: './enrollmentsettinglist.component.html',
  styleUrls: ['./enrollmentsettinglist.component.scss'],
  providers: [MessageService]
})
export class EnrollmentsettinglistComponent implements OnInit {
  
  enrollmentsettingList:any;
  selectedEnrollmentSetting: EnrollmentSettingData;
  enrollmentsettingDialog: boolean;

  
  constructor(private messageService: MessageService,private router: Router,private location: Location,private manageenrollmentsettingService:ManageEnrollmentSettingService, private breadcrumbService: AppBreadcrumbService) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['/dashboard'] },
      { label: 'Metadata', routerLink: ['/metadatalist'] },
      { label: 'List Enrollment Setting', routerLink: ['/enrollmentsettinglist'] }    ]);
   }

  ngOnInit(): void {
    this.EnrollmentSettingList();
  }

  EnrollmentSettingList():void{
    this.manageenrollmentsettingService.getEnrollmentSettings().subscribe(data => {
      this.EnrollmentSettingList = data;
      console.log(data);
    }
    );
    }
      goToAddEnrollmentSetting(){
        this.router.navigate(['addEnrollmentSetting']);
      }
      goBack(){
        this.location.back();
      }
      editEnrollmentSetting(enrollmentsetting: EnrollmentSettingData){
      this.selectedEnrollmentSetting = {...enrollmentsetting};
      this.enrollmentsettingDialog=true;
     }
     updateEnrollmentSetting(){
       this.manageenrollmentsettingService.createEnrollmentSetting(this.selectedEnrollmentSetting).subscribe(
        () => {
          this.addSuccess("Success!","Enrollment Setting information updated successfully.");
             
       }, 
       () => {
       this.addError("Failed!","Enrollment Setting creation failed.");
       this.enrollmentsettingDialog = false;
     });
    }
 
     addSuccess(title:string,message:string) {
       this.messageService.add({severity:'success', summary:title, detail:message});
       
     
     }
     addError(title:string,message:string) {
       this.messageService.add({severity:'error', summary:title, detail:message});
       
     }
 
     hideUserDialog(){
       this.enrollmentsettingDialog = false;
     }
  

}


  