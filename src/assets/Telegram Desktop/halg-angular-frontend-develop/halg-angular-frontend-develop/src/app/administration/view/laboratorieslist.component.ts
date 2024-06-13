import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { LaboratoriesData } from '../domain/laboratories.data';
import {ManageLaboratoriesService} from '../service/manage.laboratories.service';
import { Location } from '@angular/common';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import {MessageService,Message} from 'primeng/api';

@Component({
  selector: 'app-laboratorieslist',
  templateUrl: './laboratorieslist.component.html',
  styleUrls: ['./laboratorieslist.component.scss'],
  providers: [MessageService]
})
export class LaboratorieslistComponent implements OnInit {
  laboratoriesList:any;
  selectedLaboratories: LaboratoriesData;
  laboratoriesDialog: boolean;


 
  constructor(private messageService: MessageService,private router: Router,private location: Location,private managelaboratoriesService:ManageLaboratoriesService, private breadcrumbService: AppBreadcrumbService) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['/dashboard'] },
      { label: 'Metadata', routerLink: ['/metadatalist'] },
      { label: 'List Laboratories', routerLink: ['/laboratorieslist'] }    ]);

    }



  ngOnInit(): void {
    this.LaboratoriesList();
  }

  LaboratoriesList():void{
    this.managelaboratoriesService.getLaboratoriess().subscribe(data => {
      this.LaboratoriesList = data;
      console.log(data);
    }
    );
    }

    goToAddLaboratories(){
      this.router.navigate(['addLaboratories']);
    }
    goBack(){
      this.location.back();
    }

    editLaboratories(laboratories: LaboratoriesData){
      this.selectedLaboratories = {...laboratories};
      this.laboratoriesDialog=true;
     }
     updateLaboratories(){
       this.managelaboratoriesService.createLaboratories(this.selectedLaboratories).subscribe(
         response => {console.log(response);
           this.laboratoriesList.push(this.selectedLaboratories);
           this.ngOnInit();
           this.addSuccess("Success!","Laboratory updated successfully");
           
           
       }, 
       error => {console.log(error)});
       this.addError("Failed!","Laboratory creation failed.");
 
       this.laboratoriesDialog = false;
     }
 
     addSuccess(title:string,message:string) {
       this.messageService.add({severity:'success', summary:title, detail:message});
       
     
     }
     addError(title:string,message:string) {
       this.messageService.add({severity:'error', summary:title, detail:message});
       
     }
 
     hideUserDialog(){
       this.laboratoriesDialog = false;
     }

}
