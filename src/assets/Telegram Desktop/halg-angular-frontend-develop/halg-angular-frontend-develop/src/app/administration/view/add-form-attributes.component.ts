import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ClientPortalService } from 'src/app/client/service/client.portal.service';
import { ManageClientService } from 'src/app/client/service/manage.client.service';
import { ProgramStageData, ProgramsData, ColumnAttrDef } from '../domain/programs.data';
import { FormBuilderService } from '../service/manage.formbuilder.service';
import { MetadataConfigService } from '../service/metadata-config.service';
declare var require: any;

@Component({
  selector: 'app-add-form-attributes',
  template: `<p-toast position="top-center"></p-toast>
  <p-card>
  <ng-template pTemplate="title">
  <div class="p-grid p-justify-between">
     <b>Create Form Attributes</b>
     <div class="p-col-8">
     </div>
     <p-button icon="pi pi-print" iconPos="left"></p-button>
     </div>
  </ng-template>

  <!--ng-template pTemplate="content">
   <div class="p-grid">
    <div class="p-fluid p-formgrid p-grid p-col-12">

    <div class="p-field p-col-4">
    <label for="programs_id"><b>Service Forms</b></label>
      <p-dropdown inputId="programs_id" [options]="programsMap" [(ngModel)]="selectedPrograms"
      optionLabel="name" placeholder="-Select-" (onChange)="onProgramsSelection()"
     ></p-dropdown>
    </div>


    <div class="p-field p-col-4">
    <label for="program_id"><b>Program Stage</b></label>
      <p-dropdown inputId="program_id" [options]="programStageMap"  [(ngModel)]="selectedProgramStage"
      optionLabel="name" placeholder="-Select-" (onChange)="onProgramStageSelection()"></p-dropdown>
    </div>

    <div class="p-field p-col-4">
    
    </div>
    </div>


    <form #f="ngForm" (ngSubmit)="onSubmit(f)" class="p-fluid p-formgrid p-grid p-col-12">
   <div *ngFor="let x of tags; index as i" [ngModelGroup]="i" class="p-fluid p-formgrid p-grid p-col-12">

   <div class="p-field p-col-4">
   <label for="program_id"><b>Attribute Name</b></label>
   <input name="attrname" type="text" pInputText [(ngModel)]="x.attrname">
   </div>

   <div class="p-field p-col-4">
   <label for="program_id"><b>Datatype</b></label>
   <p-dropdown  [options]="apidatatype"  [(ngModel)]="x.datatype" name="datatype"
   optionLabel="name" optionValue="value" placeholder="-Select-"></p-dropdown>
   </div>

   <div class="p-field p-col-4">
   <button pButton pRipple type="button" icon="pi pi-times" class="p-button-rounded p-button-danger "
    (click)="removeNewTag(i)"></button>
   </div>




   </div>
   <div class="p-grid p-jc-between">
   <p-button label="Add more" icon="pi pi-plus" (click)="pushNewTag()"></p-button>
   </div>

   <p-button label="Submit" type="submit" icon="pi pi-plus" (click)="pushNewTag()"></p-button>
   </form>

   </div>

   <pre>
  {{tags|json}}
</pre>

<pre>
  Submitted Object:
  {{formValue|json}}
</pre>

  </ng-template-->
  <ng-template pTemplate="content">
  <div class="p-fluid p-formgrid p-grid p-col-12">
  <div class="p-field p-col-4">
  <label for="program_id"><b>Program Stages</b></label>
    <p-dropdown inputId="program_id" [options]="programStageMap"  [(ngModel)]="selectedProgramStage"
    optionLabel="name" placeholder="-Select-" (onChange)="onChangeProgramStage()"></p-dropdown>
  </div>

  <div class="p-field p-col-2">
  <label><b>DDL Option</b></label>
  <div class="p-field-radiobutton">
    <p-radioButton name="Drop only" value="Drop Only" [(ngModel)]="ddla" inputId="droponly" ></p-radioButton>
    <label for="droponly">Drop Schema Only</label>
</div>
<div class="p-field-radiobutton">
    <p-radioButton name="Drop and Recreate" disabled="true" value="Drop and Recreate" [(ngModel)]="ddla" inputId="droprecreate"></p-radioButton>
    <label for="droprecreate">Drop and Recreate</label>
</div>
<div class="p-field-radiobutton">
    <p-radioButton name="Flush Data" disabled="true" value="Flush Existing Data" [(ngModel)]="ddla" inputId="flushdata"></p-radioButton>
    <label for="droprecreate">Flush Existing Data</label>
</div>
  </div>
  
  <div class="p-field p-col-2">
  <label><b>DDL Action</b></label>
  <p-button label={{ddla}} icon="pi pi-angle-plus" iconPos="right" (click)="DropCreate($event)"></p-button>
  </div>

  </div>
  <formio [form]="formatrr" (submit)="onSubmit($event)" [submission]="programstagecolumnbinder"></formio>
  </ng-template>
  <p-dialog [(visible)]="viewpayloaddialog" [style]="{width: '650px'}"
header="Pay Load" [modal]="true" styleClass="p-fluid">

<div class="p-fluid p-formgrid p-grid p-col-12">
<textarea [rows]="5" [cols]="30" pInputTextarea autoResize="autoResize" [(ngModel)]="payload"></textarea>
</div>
<p-footer>
<div class="p-grid p-nogutter p-justify-end">
        <p-button label="Save"  icon="pi pi-angle-plus" iconPos="right"></p-button>
    </div>
</p-footer>
</p-dialog>
  </p-card>
  `,
  styleUrls: ['./add-form-attributes.component.scss'],
  providers:[MessageService,ConfirmationService]
})
export class AddFormAttributesComponent implements OnInit {
formatrr: any;
viewpayloaddialog: boolean=false;
payload: string ='';
formdata: any[];
formdataheader: any;
token: string;
data: any;
pp: any;
json: any;
programStageMap = {} as ProgramStageData[];
selectedProgramStage: ProgramStageData;
programs: ProgramsData[];
programStageList: ProgramStageData[]= [];
selectedPrograms: ProgramsData;
programsMap = {} as ProgramsData[];
formValue: any;
maxDate: Date;
programstagecolumnbinder: any;
ddla: any = "Drop Only";
apidatatype: any[];

  tags: any = [
    { attrname: "", datatype:"" }

  ]


  constructor(private formbuilderservice: FormBuilderService,
    private messageService: MessageService,
    private manageclientService:ManageClientService,
    private metadataConfigService: MetadataConfigService,
    private clientPortalService: ClientPortalService) { }

  ngOnInit(): void {

    this.formatrr = require('./jsons/formattr.json');
    this.token = localStorage.getItem('token2');
    this.loadConfigMetadata();
    this.maxDate = new Date();

    this.apidatatype = [
      {
          "name": "Text",
          "value": "varchar"
      },
      {
          "name": "Boolean",
          "value": "boolean"
      },
      {
          "name": "Integer",
          "value": "integer"
      },
      {
          "name": "Date",
          "value": "timestamp"
      }
  ];


  }

  onSub(f: NgForm) {
    let tags = Object.keys(f.value).map(item => {
      return f.value[item];
    });
    this.formValue = tags;
    console.log(tags);

  }

  pushNewTag() {
    this.tags.push({})
  }

  removeNewTag(i:number) {
    console.log("Got "+i);
        if(i>0){
        this.tags.splice(i);
        }
      }

  onProgramsSelection(){

    this.programStageMap = [];
    this.programsMap.filter(p => {
      if(p.program_id === this.selectedPrograms.program_id){
        this.programStageMap = p.programstages;
      }
    })

}



onProgramStageSelection(){
  this.json = {};
  if(this.programStageMap){
    this.programStageMap.forEach(p=>{
      if(p.program_stage_id === this.selectedProgramStage.program_stage_id){
        this.json = p.programstageform.json
      }
    });

  }
}

 tag: any = {};
 dbAttributes = {};
onChangeProgramStage(){

  setTimeout(() => { 
  this.dbAttributes = {};
   var colAttrDef = [];
    this.formbuilderservice.listFormProgramAttribute(this.selectedProgramStage.form_stage_db_identifier)
          .subscribe(p => {this.dbAttributes = p
      
      for (let key of Object.keys(this.dbAttributes)){
        if(key != 'id'){
        this.tag.attrname = key;
        this.tag.dataType = this.dbAttributes[key];
        colAttrDef.push(this.tag);
        this.tag = {};
        }
      }
     
    
    this.programstagecolumnbinder = {
      data : {
        formelement : colAttrDef
      }
    }
  })
},1000);
  
  
}

onSubmit(event){
  this.data = {"data": { token1: this.token}};
  // this.viewpayloaddialog = true;

  this.formdata = [];
  this.formdataheader = {};
  this.formdata = event.data.formelement;
  let formdatamap = new Map();

  this.formdata.forEach(p=> {
     formdatamap.set(p.attrname,p.dataType);
  })
  let jsonobj = {};
 // jsonobj["formName"] = event.data.formName;//.replace(/\s/g, '_'); //remove all spaces

  jsonobj["formName"] = this.selectedProgramStage.form_stage_db_identifier;
  formdatamap.forEach((value,key) => {jsonobj[key] = value});
 this.payload = JSON.stringify(jsonobj);
  //this.viewpayloaddialog = true
setTimeout(() => {
  
  this.formbuilderservice.saveFormAttribute(this.payload)
        .subscribe(
        () => {
          this.addSuccess("Success","Form table created successfully.");

          },
        error => {
    this.addError("Unsuccessful.","Failed to create form table. "+error.statusText);
            console.error(error);
        }

         );
      },1000);

}

DropCreate(event){
  if(this.dbAttributes){
  if(this.ddla == "Drop Only"){
    this.formbuilderservice.dropcreateFormProgramAttribute(this.selectedProgramStage.form_stage_db_identifier)
    .subscribe(
      (data) => {
        this.addSuccess("Success","Form table dropped successfully.");
      },
      error => {
        this.addError("Unsuccessful","Form table could not be dropped.");
        console.log("Error code "+error);
      }
    )
  }
  if(this.ddla == "Drop and Recreate"){
    this.formbuilderservice.dropcreateFormProgramAttribute(this.selectedProgramStage.form_stage_db_identifier)
    .subscribe(
      () => {
        this.onSubmit(event);
        this.addSuccess("Success","Form table dropped/created successfully... Recreating, pls wait...");
        

      },
      error => {
        this.addError("Unsuccessful","Form table action failed...");
        console.log("Error code "+error);
      }
    )
  }
}
else{
  this.addError("Error","Form table does not have associated attributes saved. Create one first.");
}
}
 
protected loadConfigMetadata(){
 //this.metadataConfigService.getProgramsList().subscribe(p => {this.programsMap = p});
   
 this.metadataConfigService.getProgramstageList().subscribe(p=>{this.programStageMap=p});

 }
 
addSuccess(title: string, message: string) {
  this.messageService.add({sticky: true, severity: 'success', summary: title, detail: message });


}
addError(title: string, message: string) {
  this.messageService.add({ sticky: true, severity: 'error', summary: title, detail: message });

}

}
