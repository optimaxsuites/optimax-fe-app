import { Component, OnInit,OnDestroy } from '@angular/core';
import {ClientPortalService} from '../service/client.portal.service';
import {MessageService, MenuItem,LazyLoadEvent} from 'primeng/api';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import {ClientExtendedInfo} from '../domain/client.portal.data';
import { Router } from '@angular/router';
import {  PharmacyInfoData,  LaboratoryInfoData} from 'src/app/administration/domain/consultation.data';




@Component({
  selector: 'app-client-portal-list',
  templateUrl: './client.portal.list.component.html',
  providers: [MessageService]
})
export class ClientPortalListComponent implements OnInit,OnDestroy {

clientExtInfo: ClientExtendedInfo[]=[];
testInfo: LaboratoryInfoData[];
clientExtInfoLazy: ClientExtendedInfo[];
selectedClients: ClientExtendedInfo;
selectedTest: LaboratoryInfoData;
loading: boolean;
totalRecords: number;
cols: any[];
exportColumns: any[];
clientExtInfoActionItems: any[];
swithClientInfo: boolean = true;
selectedClientStatus: any;
clientstatusmap: any[];
regperiodmap: any;
queryBuilderVisibility: boolean =false;
periodInDays: number = 60;
selectedRegDays: any;
distinctClientUniqueIdentifier: string[]=[];
client_unique_identifier:any;
clientClinicalPrograms: any[]=[];
selectedTab: any;

  constructor(private messageService: MessageService,
    private router: Router,
    private clientPortalService:ClientPortalService,
    private breadcrumbService: AppBreadcrumbService) {
      this.breadcrumbService.setItems([
        { label: 'Dashboard', routerLink: ['/dashboard'] },
        { label: 'Client Portal Record', routerLink: ['/cportal'] }
         ]);
    }

  ngOnInit() {
    if(sessionStorage.getItem('username') == null){
      this.router.navigate(['']);
    }
    this.clientExtInfoActionItems =[
      {label: 'View & Edit', icon:'pi pi-user-edit', routerLink:['/eReg/ebasic']},
      {label: 'Add Visit', icon:'pi pi-user-plus',routerLink:['/##/sportal'],command: () => {
        this.selectedTab = 1;
    }},
      {label: 'Enrol Program (HTS)', icon:'pi pi-refresh',routerLink:['/cPEnrolment']},
      {label: 'Dashboard', icon:'pi pi-id-card', routerLink:['/##/sportal']},
      {label: 'Programs & Services', icon:'pi pi-slack',routerLink:['/cEnrolment']}

    ]

   
    //this.clientPortalService.getClientExtendedInfox().then(d => {this.clientExtInfoLazy = d});
    if(this.clientPortalService.clientExtInfoService.length == 0){
      this.getClientExtendedInfo();
      this.addSuccess("Pre","Data calls for the first time might take a while...");
      
    }
    else{
      this.clientExtInfo = this.clientPortalService.clientExtInfoService;
    }
    
    if(this.clientPortalService.clinicalRegistrationCount == 0){
      this.getClinicalRegistrationsProgramCount();
    }
    else{
      this.clinicalRegCount = this.clientPortalService.clinicalRegistrationCount;
    }
    
    //if(this.clientPortalService.clientClinicalPrograms.length == 0){
      this.getClientClinicalProgram();
    //}
  //  else{
    //  this.clientClinicalPrograms = this.clientPortalService.clientClinicalPrograms;
    //}

    this.regperiodmap =[
      {
        name: "Last 30 days",
        value: 30
      },
      {
        name: "Last 60 days",
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

    this.clientstatusmap = [
      {
        label: 'Ever Enrolled', value: 'EverEnrolled'
      },
      {
        label: 'Currently on ART', value: 'CurrentlyONART'
      },
      {
        label: 'Lost/Dead', value: 'LostOrDead'
      },
      {
        label: 'Missed Appointments', value: 'Missed Appointments'
      },
      {
        label: 'On ART Restart in the last 30days', value: 'ONARTRestart'
      }

    ]

    document.getElementById('qB').style.display = 'none';

  }

  clinicalRegCount: number = 0;
  clinicalProgCount: number = 0;
  getClinicalRegistrationsProgramCount(){
    this.clientPortalService.getClinicalRegistrationsCount().subscribe(data => {this.clinicalRegCount = data});
  }

  getClientClinicalProgram(){
    this.clientPortalService.getClientClinicalPrograms().subscribe(data => {this.clientClinicalPrograms = data});
  }
 
  clientClinicalProgramCount = 0;
  getClientClinicalProgramCount(client_unique_identifier) {
    this.clientClinicalProgramCount = this.clientClinicalPrograms.filter(p => p.client_unique_identifier === client_unique_identifier).length
  }

  clientClinicalProgram: any[] = [];
  clientEnromentDetailDialog: Boolean = false;
  xx: any;
  getClientClinicalProgramById(client_unique_identifier) {
    this.clientEnromentDetailDialog = true;
    this.clientClinicalProgram = this.clientClinicalPrograms.filter(p => p.client_unique_identifier === client_unique_identifier);
    //this.clientClinicalProgram.map(p => console.log(p.clie))
   // this.xx = this.clientClinicalPrograms.filter(p => p.client_unique_identifier === client_unique_identifier 
     // && p.programstages.program_stage_id===ps);
  }


  getClientInfoByHospitalNum(){
    this.loading = true;
    setTimeout(() => {
      this.clientPortalService.getClientInfoByHospitalNum(this.client_unique_identifier)
      .subscribe(
        data => {
        this.clientExtInfo = data;
        console.log('client data:', this.clientExtInfo);
        this.totalRecords = this.clientExtInfo.length;
        this.loading = false;
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
 

  getClientExtendedInfo(){
    this.loading = true;
  setTimeout(() => {
    this.clientPortalService.getClientExtendedInfo(this.periodInDays)
    .subscribe(
      data => {
      this.clientExtInfo = data;
      console.log('client data:', this.clientExtInfo);
      this.totalRecords = this.clientExtInfo.length;
      this.loading = false;
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
  clientInfoByDays(){
    this.periodInDays = this.selectedRegDays.value;
    this.getClientExtendedInfo();
  }

  getClientExtendedInfopp(){
    
    setTimeout(() => {
    this.clientPortalService.getClientExtendedInfo(this.periodInDays)
    .subscribe(
      data => {
      this.clientExtInfo = data
      this.totalRecords = this.clientExtInfo.length;
      this.loading = false;
    },
    error =>{
      this.addError("Failure","Poor network connectivity discovered...");
      this.loading = false;
    }
    );
  },1000);

  }




  loadClientDataLazily(event: LazyLoadEvent) {
    this.loading = true;

    setTimeout(() => {
        if (this.clientExtInfoLazy) {
            this.clientExtInfo = this.clientExtInfo.slice(event.first, (event.first + event.rows));
            this.loading = false;
        }
    }, 1000);
}

 onClickQueryBuilder(){
    if(this.queryBuilderVisibility == false){
    document.getElementById('qB').style.display = 'inline';
    this.queryBuilderVisibility = true;
    }
 else{
  document.getElementById('qB').style.display = 'none';
  this.queryBuilderVisibility = false;
 }

 }

  ngOnDestroy() {
    this.clientPortalService.selectedClients = this.selectedClients;
    this.clientPortalService.clientExtInfoService = this.clientExtInfo;
    this.clientPortalService.clinicalRegistrationCount = this.clinicalRegCount;
    this.clientPortalService.clientClinicalPrograms = this.clientClinicalPrograms;
    this.clientPortalService.selectedTab = this.selectedTab;
   
  }

 

  viewClient(client: ClientExtendedInfo){
    this.selectedClients = {...client};
   // console.log(this.selectedClients)
  }

  exportExcel() {
    import("xlsx").then(xlsx => {
        const worksheet = xlsx.utils.json_to_sheet(this.clientExtInfo);
        const workbook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };
        const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
        this.saveAsExcelFile(excelBuffer, "clientExtendedInfo");
    });
}

saveAsExcelFile(buffer: any, fileName: string): void {
    import("file-saver").then(FileSaver => {
        let EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
        let EXCEL_EXTENSION = '.xlsx';
        const data: Blob = new Blob([buffer], {
            type: EXCEL_TYPE
        });
        FileSaver.saveAs(data, fileName + '_export_' + new Date().getTime() + EXCEL_EXTENSION);
    });
}
exportPdf() {

  this.cols = [
    { field: 'code', header: 'Code' },
    { field: 'name', header: 'Name' },
    { field: 'category', header: 'Category' },
    { field: 'quantity', header: 'Quantity' }
];
this.exportColumns = this.cols.map(col => ({title: col.header, dataKey: col.field})); console.log(this.exportColumns)
  import("jspdf").then(jsPDF => {
      import("jspdf-autotable").then(() => {
          const doc = new jsPDF.default('p','pt');
         // doc.autoTable(this.exportColumns, this.clientExtInfo);
          doc.save('clientExtendedInfo.pdf');
      })
  })
}

switchClientExtInfo(): boolean{
  return this.swithClientInfo ? this.swithClientInfo=false : this.swithClientInfo=true;
}


addSuccess(title:string,message:string) {
  this.messageService.add({severity:'success', summary:title, detail:message});
}
addError(title:string,message:string) {
  this.messageService.add({severity:'error', summary:title, detail:message});
}

}
