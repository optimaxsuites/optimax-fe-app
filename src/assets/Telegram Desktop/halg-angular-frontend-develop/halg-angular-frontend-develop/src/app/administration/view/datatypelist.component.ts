import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { DataTypeData } from '../domain/dataType.data';
import {ManageDataTypeService} from '../service/manage.data-type.service';
import { Location } from '@angular/common';
import {MessageService} from 'primeng/api';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';



@Component({
  selector: 'app-datatypelist',
  templateUrl: './datatypelist.component.html',
  styleUrls: ['./datatypelist.component.scss'],
  providers: [MessageService]
})
export class DatatypelistComponent implements OnInit {

  dataTypecreatedata = {} as DataTypeData;


  dataTypeList:any;
  selectedDataType: DataTypeData;
  dataTypeDialog: boolean;
  dataTypeEditDialog: boolean;
  dataTypeImportDialog: boolean;

  constructor(private router: Router,private messageService: MessageService,private location: Location,
    private manageDataTypeService:ManageDataTypeService, private breadcrumbService: AppBreadcrumbService) {

     this.breadcrumbService.setItems([
     { label: 'Dashboard', routerLink: ['/dashboard'] },
     { label: 'Metadata', routerLink: ['/metadatalist'] },
     { label: 'List DataType', routerLink: ['/datatypelist'] }    ]);
 }

 ngOnInit(): void {
  /* if(sessionStorage.getItem('username') == null){
     this.addError("Session Expired.","Your current session has expired. Re-login.");
     this.router.navigate(['']);
   } */
   this.DataTypeList();
 }

 addDataType(){
  this.dataTypecreatedata.created_by = +sessionStorage.getItem("userid");
  this.dataTypecreatedata.created_date = new Date ();
  this.manageDataTypeService.createDataType(this.dataTypecreatedata).subscribe(
    data => {
      this.addSuccess("Success!","Data Type added successfully.");
  },
  error => {
  this.addError("Failed!","Could not add Data Type.");
  }

  );
  }

  DataTypeList():void{
    this.manageDataTypeService.getDataTypes().subscribe(data => {
      this.dataTypeList = data;
      console.log(data);
    }
    );
    }

    goToAddDataType(dataType: DataTypeData){
      this.router.navigate(['addDataType']);
      this.dataTypeDialog=true;
    }


    importDataType(dataType: DataTypeData){
      this.router.navigate(['importDataType']);
      this.dataTypeImportDialog=true;
    }

  goBack(){
    this.location.back();
    }

    editDataType(dataType: DataTypeData){
      this.selectedDataType = {...dataType};
      this.dataTypeEditDialog=true;
     }

     updateDataType(){
      this.manageDataTypeService.createDataType(this.selectedDataType).subscribe(
        response => {console.log(response);
          this.dataTypeList.push(this.selectedDataType);
          this.ngOnInit();
          this.addSuccess("Success!","Data Type updated successfully");


      },

     error => {console.log(error)});
      this.addError("Failed!","Data Type creation failed.");

      this.dataTypeDialog = false;
    }

    addSuccess(title:string,message:string) {
      this.messageService.add({severity:'success', summary:title, detail:message});


    }
    addError(title:string,message:string) {
      this.messageService.add({severity:'error', summary:title, detail:message});

    }

    hideDataTypeDialog(){
      this.dataTypeDialog = false;
    }

    hideDataTypeEditDialog(){
      this.dataTypeEditDialog = false;
    }

}
