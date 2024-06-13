import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { TbstatusData } from '../domain/tbstatus.data';
import {ManageTbstatusService} from '../service/manage.tbstatus.service';
import { Location } from '@angular/common';
import {MessageService} from 'primeng/api';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';

@Component({
  selector: 'app-add.tbstatus',
  templateUrl: './add.tbstatus.component.html',
  providers: [MessageService]
})
export class ManageTbstatusComponent implements OnInit {

  tbstatuscreatedata = {} as TbstatusData;

  

  constructor(private router: Router,private messageService: MessageService,private location: Location,private managetbstatusService:ManageTbstatusService, private breadcrumbService: AppBreadcrumbService) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['/dashboard'] },
      { label: 'Metadata', routerLink: ['/metadatalist'] },
      { label: 'Add Tbstatus', routerLink: ['/addTbstatuslist'] }    ]);
  }

  ngOnInit(): void {
    if(sessionStorage.getItem('username') == null){
      this.addError("Session Expired.","Your current session has expired. Re-login.");
      this.router.navigate(['']);
    }
  }

addTbstatus(){
  this.tbstatuscreatedata.created_by = +sessionStorage.getItem("userid");
  this.tbstatuscreatedata.created_date = new Date();
  this.managetbstatusService.createTbstatus(this.tbstatuscreatedata).subscribe(
    data => {
      this.addSuccess("Success!","TB Status added successfully.");
  }, 
  error => {
  this.addError("Failed!","Could not add TB Status.");
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
  

