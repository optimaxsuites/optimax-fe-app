import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { PharmaciesData } from '../domain/pharmacies.data';
import {ManagePharmaciesService} from '../service/manage.pharmacies.service';
import { Location } from '@angular/common';
import {MessageService} from 'primeng/api';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';


@Component({
  selector: 'app-add.pharmacies',
  templateUrl: './add.pharmacies.component.html',
  providers: [MessageService]
})
export class ManagePharmaciesComponent implements OnInit {
  pharmaciescreatedata = {} as PharmaciesData;

  constructor(private router: Router,private messageService: MessageService, private location: Location, private managephamaciesService:ManagePharmaciesService, private breadcrumbService: AppBreadcrumbService) { 
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['/dashboard'] },
      { label: 'Meta-Data', routerLink: ['/metadata'] },
      { label: 'Add Pharmacies', routerLink: ['/addPharmacies'] }    ]);
  }

  ngOnInit(): void {
    if(sessionStorage.getItem('username') == null){
      this.addError("Session Expired.","Your current session has expired. Re-login.");
      this.router.navigate(['']);
    }
  }

  addPharmacies(){
    this.pharmaciescreatedata.created_by = +sessionStorage.getItem("userid");
  this.pharmaciescreatedata.created_date = new Date();
    this.managephamaciesService.createPhamarcies(this.pharmaciescreatedata).subscribe(
      response => {console.log(response);
        this.addSuccess("Success!","Pharmacies added successfully");
        
    }, 
    error => {console.log(error)});
    this.addError("Failed!","Pharmacies creation failed.");
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
