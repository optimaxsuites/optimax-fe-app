import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { PharmaciesData } from '../domain/pharmacies.data';
import {ManagePharmaciesService} from '../service/manage.pharmacies.service';
import { Location } from '@angular/common';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import {MessageService,Message} from 'primeng/api';

@Component({
  selector: 'app-pharmacieslist',
  templateUrl: './pharmacieslist.component.html',
  styleUrls: ['./pharmacieslist.component.scss'],
  providers: [MessageService]
})
export class PharmacieslistComponent implements OnInit {
  pharmaciesList:any;
  selectedPharmacies: PharmaciesData;
  pharmaciesDialog: boolean;

  
  constructor(private messageService: MessageService,private router: Router,private location: Location,private managepharmaciesService:ManagePharmaciesService, private breadcrumbService: AppBreadcrumbService) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['/dashboard'] },
      { label: 'Metadata', routerLink: ['/metadatalist'] },
      { label: 'List Pharmacies', routerLink: ['/pharmacieslist'] }    ]);

    }

  ngOnInit(): void {
    this.PharmaciesList();
  }

  PharmaciesList():void{
    this.managepharmaciesService.getPharmacciess().subscribe(data => {
      this.pharmaciesList = data;
      console.log(data);
    }
    );
    }

    goToAddPharmacies(){
      this.router.navigate(['addPharmacies']);
    }
    goBack(){
      this.location.back();
    }

    editPharmacies(pharmacies: PharmaciesData){
      this.selectedPharmacies = {...pharmacies};
      this.pharmaciesDialog=true;
     }
     updateUser(){
       this.managepharmaciesService.createPhamarcies(this.selectedPharmacies).subscribe(
        () => {
           this.addSuccess("Success!","Pharmacy updated successfully");
           
           
       }, 
       () => {
       this.addError("Failed!","User creation failed.");
       this.pharmaciesDialog = false;
     });
    }
 
     addSuccess(title:string,message:string) {
       this.messageService.add({severity:'success', summary:title, detail:message});
       
     
     }
     addError(title:string,message:string) {
       this.messageService.add({severity:'error', summary:title, detail:message});
       
     }
 
     hideUserDialog(){
       this.pharmaciesDialog = false;
     }

}
