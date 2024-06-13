import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { HivStatusAtRegistrationData } from '../domain/hivstatusatregistration.data';
import {ManageHivstatusatregistrationService} from '../service/manage.hivstatusatregistration.service';
import { Location } from '@angular/common';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import {MessageService,Message} from 'primeng/api';

@Component({
  selector: 'app-hivstatusatregistrationlist',
  templateUrl: './hivstatusatregistrationlist.component.html',
  styleUrls: ['./hivstatusatregistrationlist.component.scss'],
  providers: [MessageService]
})
export class HivStatusAtRegistrationlistComponent implements OnInit {
  hivstatusatregistrationList:any;
  selectedHivstatusatregistration: HivStatusAtRegistrationData;
  hivstatusatregistrationDialog: boolean;

  constructor(private messageService: MessageService,private router: Router,private location: Location,private managehivstatusatregistrationService:ManageHivstatusatregistrationService, private breadcrumbService: AppBreadcrumbService) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['/dashboard'] },
      { label: 'Metadata', routerLink: ['/metadatalist'] },
      { label: 'List Hiv Status At Registration', routerLink: ['/hivstatusatregistrationlist'] }    ]);
   }

  ngOnInit(): void {
    this.HivstatusatregistrationList();
  }

  HivstatusatregistrationList():void{
    this.managehivstatusatregistrationService.getHivStatusAtRegistrations().subscribe(data => {
      this.hivstatusatregistrationList = data;
      console.log(data);
    }
    );
    }
      goToAddHivstatusatregistration(){
        this.router.navigate(['addHivstatusatregistration']);
      }
      goBack(){
        this.location.back();
      }
      editHivstatusatregistration(hivstatusatregistration: HivStatusAtRegistrationData){
      this.selectedHivstatusatregistration = {...hivstatusatregistration};
      this.hivstatusatregistrationDialog=true;
     }
     updateHivstatusatregistration(){
       this.managehivstatusatregistrationService.createHivStatusAtRegistration(this.selectedHivstatusatregistration).subscribe(
        () => {
          this.addSuccess("Success!","Hiv Status At Registration information updated successfully.");
             
       }, 
       () => {
       this.addError("Failed!","Hiv Status At Registration creation failed.");
       this.hivstatusatregistrationDialog = false;
     });
    }
 
     addSuccess(title:string,message:string) {
       this.messageService.add({severity:'success', summary:title, detail:message});
       
     
     }
     addError(title:string,message:string) {
       this.messageService.add({severity:'error', summary:title, detail:message});
       
     }
 
     hideUserDialog(){
       this.hivstatusatregistrationDialog = false;
     }
  

}
