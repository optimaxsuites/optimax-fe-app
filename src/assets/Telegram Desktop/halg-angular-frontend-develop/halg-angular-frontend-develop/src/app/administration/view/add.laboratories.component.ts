import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { LaboratoriesData } from '../domain/laboratories.data';
import {ManageLaboratoriesService} from '../service/manage.laboratories.service';
import { Location } from '@angular/common';
import {MessageService} from 'primeng/api';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';

@Component({
  selector: 'app-add.laboratories',
  templateUrl: './add.laboratories.component.html',
  providers: [MessageService]
})
export class ManageLaboratoriesComponent implements OnInit {

  laboratoriescreatedata: LaboratoriesData = {
    name: '',
    code: '',
    description: '',
    contact_phone_number: '',
    created_by: 0,
    created_date: null,
    
  };


  constructor(private router: Router, private messageService: MessageService, private location: Location, private managelaboratoriesService:ManageLaboratoriesService, private breadcrumbService: AppBreadcrumbService) { 
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['/dashboard'] },
      { label: 'Meta-Data', routerLink: ['/metadata'] },
      { label: 'Add Laboratories', routerLink: ['/addLaboratories'] }    ]);
  }

  ngOnInit(): void {
    if(sessionStorage.getItem('username') == null){
      this.addError("Session Expired.","Your current session has expired. Re-login.");
      this.router.navigate(['']);
    }
  }

  addLaboratories(){
  
    this.laboratoriescreatedata.created_by  = +sessionStorage.getItem('userid');
   // this.laboratoriescreatedata.created_date= new Date();
    this.managelaboratoriesService.createLaboratories(this.laboratoriescreatedata).subscribe(
      data => {
        this.addSuccess("Success!","Laboratory added successfully.");
    }, 
    error => {
    this.addError("Failed!","Could not add Laboratory.");
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
