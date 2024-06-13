import { Component, OnInit, OnDestroy } from '@angular/core';
import {LaboratoryData} from '../domain/laboratory.data';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { Router } from '@angular/router';
import {MessageService, MenuItem,LazyLoadEvent} from 'primeng/api';
import { ManageLaboratoryService } from '../service/manage.laboratory.service';


@Component({
  selector: 'app-laboaratory-portal-list',
  templateUrl: './laboaratory-portal-list.component.html',
  styles: [`
  :host ::ng-deep .custom-scrolltop{
    width: 2rem;
    height: 2rem;
    border-radius: 4px;
    background-color: var(--primary-color);

    &:hover {
        background-color: var(--primary-color);
    }

    .p-scrolltop-icon {
        font-size: 1rem;
        color: var(--primary-color-text);
    }
}`],
  providers: [MessageService]
})
export class LaboaratoryPortalListComponent implements OnInit, OnDestroy {


  laboratoryDataActionItems: MenuItem[];
  cols: any[];
  exportColumns: any[];
  laboratoryInfo: LaboratoryData[];
  laboratoryInfos: LaboratoryData[]=[];
  laboratoryDataLazy: LaboratoryData;
  selectedLaboratorys: LaboratoryData;
  loading: boolean;
  totalRecords: number;
  swithClientInfo: boolean = true;

  constructor(private messageService: MessageService,
    private router: Router,
    private manageLaboratoryService:ManageLaboratoryService,
    private breadcrumbService: AppBreadcrumbService) {
      this.breadcrumbService.setItems([
        { label: 'Dashboard', routerLink: ['/dashboard'] },
        { label: 'Laboratory', routerLink: ['/cLabtest'] }
         ]);
    }

  ngOnInit() {
    if(sessionStorage.getItem('username') == null){
    this.router.navigate(['']);
  }


  this.laboratoryDataActionItems =[
    {label: 'View Test', icon:'pi pi-user', routerLink:['/cOrderedtest']},
    {label: 'Laboratory Order Form', icon:'pi pi-user', routerLink:['/laboratoryorders']},
  ]

  if(this.manageLaboratoryService.laboratoryInfoService.length == 0){
    this.loading = true;
    this.LaboratoryDataInfo();
    this.addSuccess("Pre","Data calls for the first time might take a while...");
    
  }
  else{
    this.laboratoryInfos = this.manageLaboratoryService.laboratoryInfoService;
  }

    // this.LaboratoryDataInfo();

}



LaboratoryDataInfo(){
  setTimeout(() => {
  this.manageLaboratoryService.getLaboratoryExtendedInfo(sessionStorage.getItem("userid"))
 .subscribe(data => {
   this.laboratoryInfo = data;
   console.log("la portal:", this.laboratoryInfo)
   this.totalRecords = this.laboratoryInfo.length;
   this.loading = false;
 },
 error =>{
  if(error.toString() == '403'){
    this.addError("Session Timeout.","Your current session has timed out. Please logout");
  }
  else if(error.toString() == '0'){
    this.addError("Connection Issue","Poor or no internet connection identified.");
  }
  this.loading = false;
}
);
},1000);

}

LaboratoryDataInfos(){
  setTimeout(() => {
  this.manageLaboratoryService.getLaboratoryExtendedInfo(("userid"))
 .subscribe(data => {
   this.laboratoryInfo = data;
   console.log("pharmacy data:", this.laboratoryInfo)
   this.totalRecords = this.laboratoryInfo.length;
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
      if (this.laboratoryInfo) {
          this.laboratoryInfo = this.laboratoryInfo.slice(event.first, (event.first + event.rows));
          this.loading = false;
      }
  }, 1000);
}

ngOnDestroy() {
  this.manageLaboratoryService.selectedClients = this.selectedLaboratorys;
  this.manageLaboratoryService.laboratoryInfoService = this.laboratoryInfo;
}

viewLaboratory(lab: LaboratoryData){
  this.selectedLaboratorys = {...lab};
  console.log("this is the selected client", this.selectedLaboratorys)
  // this.router.navigate(['/##/cportald']);
  }

exportExcel() {
  import("xlsx").then(xlsx => {
      const worksheet = xlsx.utils.json_to_sheet(this.laboratoryInfo);
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
        doc.save('laboratoryInfo.pdf');
    })
})
}



switchClientExtInfo(): boolean{
  console.log(this.swithClientInfo);
  return this.swithClientInfo ? this.swithClientInfo=false : this.swithClientInfo=true;
}
addSuccess(title:string,message:string) {
  this.messageService.add({severity:'success', summary:title, detail:message});
}
addError(title:string,message:string) {
  this.messageService.add({severity:'error', summary:title, detail:message});
}

}
