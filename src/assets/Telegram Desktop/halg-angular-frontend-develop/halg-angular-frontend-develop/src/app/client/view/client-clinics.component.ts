import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AppBreadcrumbService } from 'src/app/app.breadcrumb.service';
import { ClientPortalService } from '../service/client.portal.service';
import { ClinicvisitComponent } from './client.clinicvisit.component';

@Component({
  selector: 'app-client-clinics',
  templateUrl: './client-clinics.component.html',
  styleUrls: ['./client-clinics.component.scss'],
  providers: [MessageService]
})
export class ClientClinicsComponent implements OnInit {
  loading: boolean;
  clientclinicservices: any[];
  totalRecords: number;
  clinicperiodmap: any;
  periodInDays = 30;
  selectedClinicPeriod: any;
  selectedClinicVisit: ClinicvisitComponent[];
  selectedClinicClient: any;
  

  constructor(private messageService: MessageService,
    private router: Router,
    private clientPortalService:ClientPortalService,
    private breadcrumbService: AppBreadcrumbService) {
      this.breadcrumbService.setItems([
        { label: 'Dashboard', routerLink: ['/dashboard'] },
        { label: 'Client Portal Record', routerLink: ['/cportal'] }
         ]);
     }


  ngOnInit(): void {
    if(this.clientPortalService.clientclinicservices.length === 0){
    this.getClientClinicalServices();
    }
    else{
      this.clientclinicservices = this.clientPortalService.clientclinicservices 
      this.clinicalservices_as_is = this.clientPortalService.clinicalservices_as_is;
    }



    this.clinicperiodmap =[
      {
        "name": "Last 30 days",
        value: 30
      },
      {
        "name": "Last 60 days",
        value: 60
      },
      {
        name: "Last 90 days",
        value: 90
      },
      {
        name: "Last 180 days",
        value: 180
      }
      ,
      {
        name: "Last 1 year",
        value: 365
      }
    ]
  
  }
  clinicalservices_as_is: any[] =[];

  getClientClinicalServices(){
    this.loading = true;
  setTimeout(() => {
    this.clientPortalService.getClinicalServicesByPeriod(this.periodInDays)
    .subscribe(
      data => {
      this.clientclinicservices = data;
      this.clinicalservices_as_is = this.clientclinicservices
      this.totalRecords = this.clientclinicservices.length;
      this.loading = false;
      this.clientclinicservices.sort((a,b) => b.date_of_last_visit - a.date_of_last_visit);
      this.distinctById();
    },
    error =>{
      if(error.toString() == '403'){
        this.addError("Session Timeout.","Your current session has timed out. Please logout");
      }
      else if(error.toString() == '0'){
        this.addError("Connection Issue","Could not establish connection to the backend. \nCheck if the services are up and you can connect.");
      }
      this.loading = false;
    }
    );
  },1000);


  }


  gotoClinicVisit(client){
    this.selectedClinicClient = {...client};
    this.router.navigate(['./clinicvisit']);  // define your component where you want to go
}

 
  distinctById(){
    this.clientclinicservices = this.clientclinicservices.filter(
      (p, i, a) => a.findIndex(t => t.client_unique_identifier === p.client_unique_identifier) === i
    );
     
  }
  visitcount: number = 0;
  countVisits(cud){
    this.visitcount = this.clinicalservices_as_is.filter(x=> x.client_unique_identifier === cud).length;
  }

  clinicInfoByDays(){
    this.periodInDays = this.selectedClinicPeriod.value;
    this.getClientClinicalServices();
  }
  
  clientVisitHistory: any[] = [];
  clientVisitHistoryDialog: Boolean = false;
  visitHistoryById(cud){
  this.clientVisitHistoryDialog = true;
  this.clientVisitHistory = this.clinicalservices_as_is.filter(x => x.client_unique_identifier === cud)
  this.clientVisitHistory.sort((a,b) => b.date_of_last_visit - a.date_of_last_visit);

  }

  


  ngOnDestroy(){
    this.clientPortalService.clientclinicservices = this.clientclinicservices;
    this.clientPortalService.clinicalservices_as_is = this.clinicalservices_as_is;
    this.clientPortalService.selectedClinicClient = this.selectedClinicClient;

  }


  addSuccess(title:string,message:string) {
    this.messageService.add({severity:'success', summary:title, detail:message});
  }
  addError(title:string,message:string) {
    this.messageService.add({severity:'error', summary:title, detail:message});
  }
}
