import { Component, ElementRef, OnInit, ViewChild,EventEmitter } from '@angular/core';
import { FormioRefreshValue } from 'angular-formio/core';
import { ProgramsData,ProgramStageData } from '../domain/programs.data';
import { FormBuilderService } from '../service/manage.formbuilder.service';
import { MetadataConfigService } from '../service/metadata-config.service';
import {MessageService} from 'primeng/api';
import { FormBuilderData } from '../domain/formbuilder.data';
import { Router } from '@angular/router';

@Component({
  selector: 'app-form-builder',
  template: `
  <p-toast position="top-center"></p-toast>
  <form-builder [form]="form" (change)="onChange($event)">
  </form-builder>
  <br/>
  <p-card>
  <ng-template pTemplate="title">
  
  This how your form will appear
  
  </ng-template>
  <ng-template pTemplate="content">
  <div class="p-jc-center">
  <div class="well jsonviewer">
    <formio [form]="form" [refresh]="refreshForm"></formio>
  </div>
  </div>
  </ng-template>
  </p-card>
  <br/>
  <p-card>
  <ng-template pTemplate="title">
  <div class="p-grid p-justify-between">
  Your code goes here
  <button pButton pRipple type="button" label="Assign Form To Program Stage" class="p-button-outlined 
  p-mr-2" 
  (click)="copySave()"></button>
  <button pButton pRipple type="button" label="Update Program Stage Form" class="p-button-outlined 
  p-mr-2" (click)="copyUpdate()"></button>
  <p-button icon="pi pi-save" iconPos="left" (click)="copyUpdate()"></p-button>
   </div>
  </ng-template>
  <ng-template pTemplate="content">
  <div class="p-jc-center">
  <div class="well jsonviewer">
    <pre id="json"><code class="language-json" #json></code></pre>
  </div>
  </div>
  </ng-template>
  <p-dialog [(visible)]="savejsondialog" [style]="{width: '650px'}" [maximizable]="true"
header="Save Form" [modal]="true" styleClass="p-fluid">

<div class="p-fluid p-formgrid p-grid p-col-12">
    <div class="p-field p-col-6">
    <label for="program_stage"><b>Active Program*</b></label>
      <p-dropdown [options]="programsMap" 
      optionLabel="name" placeholder="-Select-" [(ngModel)]="selectedPrograms"
      [showTransitionOptions]="'0ms'" [hideTransitionOptions]="'0ms'" required (onChange)="onProgramsSelection()"
      #programs="ngModel" [ngClass]="{'ng-dirty': (programs.invalid) || (programs.dirty && programs.invalid)}">
      </p-dropdown>
      <small *ngIf="(programs.invalid) || (programs.dirty && programs.invalid)" class="p-error">
    Select program to continue</small>
    </div>

    <div class="p-field p-col-6">
    <label for="program_stage"><b>Program Stage*</b></label>
      <p-dropdown id="program_stage" [options]="programStageMap"  [(ngModel)]="selectedProgramStage"
      optionLabel="name" placeholder="-Select-"
      [showTransitionOptions]="'0ms'" [hideTransitionOptions]="'0ms'" required
      #programstage="ngModel" [ngClass]="{'ng-dirty': (programstage.invalid) || (programstage.dirty && programstage.invalid)}">
      </p-dropdown>
      <small *ngIf="(programstage.invalid) || (programstage.dirty && programstage.invalid)" class="p-error">
    Select program stage to continue</small>
    </div>



<textarea [rows]="5" [cols]="30" pInputTextarea autoResize="autoResize" [(ngModel)]="json"></textarea>
</div>
<p-footer>
<div class="p-grid p-nogutter p-justify-end">
        <p-button label="Save"  (click)="saveFormProgramStage()" icon="pi pi-plus" iconPos="right"></p-button>
    </div>
</p-footer>
</p-dialog>

<p-dialog [(visible)]="updatejsondialog" [style]="{width: '650px'}" [maximizable]="true"
header="Save Form" [modal]="true" styleClass="p-fluid">

<div class="p-fluid p-formgrid p-grid p-col-12">
    <div class="p-field p-col-6">
    <label for="program_stage"><b>Active Program*</b></label>
      <p-dropdown [options]="programsMap" 
      optionLabel="name" placeholder="-Select-" [(ngModel)]="selectedPrograms"
      [showTransitionOptions]="'0ms'" [hideTransitionOptions]="'0ms'" required (onChange)="onProgramsSelection()"
      #programs="ngModel" [ngClass]="{'ng-dirty': (programs.invalid) || (programs.dirty && programs.invalid)}">
      </p-dropdown>
      <small *ngIf="(programs.invalid) || (programs.dirty && programs.invalid)" class="p-error">
    Select program to continue</small>
    </div>

    <div class="p-field p-col-6">
    <label for="program_stage"><b>Program Stage*</b></label>
      <p-dropdown id="program_stage" [options]="programStageMap"  [(ngModel)]="selectedProgramStage"
      optionLabel="name" placeholder="-Select-" (onChange)="onProgramStageSelection()"
      [showTransitionOptions]="'0ms'" [hideTransitionOptions]="'0ms'" required
      #programstage="ngModel" [ngClass]="{'ng-dirty': (programstage.invalid) || (programstage.dirty && programstage.invalid)}">
      </p-dropdown>
      <small *ngIf="(programstage.invalid) || (programstage.dirty && programstage.invalid)" class="p-error">
    Select program stage to continue</small>
    </div>



<textarea [rows]="5" [cols]="30" pInputTextarea autoResize="autoResize" [(ngModel)]="json"></textarea>
</div>
<p-footer>
<div class="p-grid p-nogutter p-justify-end">
        <p-button label="Update"  (click)="updateFormProgramStage()" icon="pi pi-plus" iconPos="right"></p-button>
    </div>
</p-footer>
</p-dialog>

  </p-card>
  `,
  styleUrls: ['./form-builder.component.scss'],
  providers: [MessageService]
})
export class FormBuilderComponent implements OnInit {
  @ViewChild('json') jsonElement?: ElementRef;
  public refreshForm: EventEmitter<FormioRefreshValue> = new EventEmitter();
  json: string;
  savejsondialog: boolean=false;
  updatejsondialog: boolean = false;
  enrolmentPrograms: any[];
  programsMap = {} as ProgramsData[];

  programStageMap = {} as ProgramStageData[];
  selectedProgramStage: ProgramStageData;

  programs: ProgramsData[];
  selectedPrograms: ProgramsData;
  


  public form: Object = {
    components: []
  };

  constructor(private router: Router,
    private metadataConfigService: MetadataConfigService,
    private formbuilderservice: FormBuilderService,
    private messageService: MessageService) { 
    this.form = {components: []};
  }

  ngOnInit(): void {
    if(sessionStorage.getItem('username') == null){
      this.addError("Session Expired.","Your current session has expired. Re-login.");
        this.router.navigate(['']);
      }
      
  }

  onChange(event) {
    this.jsonElement.nativeElement.innerHTML = '';
    this.jsonElement.nativeElement.appendChild(document.createTextNode(JSON.stringify(event.form, null, 4)));
    this.refreshForm.emit({
      property: 'form',
      value: event.form
    });

   
  }
  copySave(){
    this.json = this.jsonElement.nativeElement.innerHTML;
    if(this.json){
    this.loadConfigMetadata();
    this.savejsondialog = true;

    }
  }

  copyUpdate(){
    this.json = this.jsonElement.nativeElement.innerHTML;
    this.loadConfigMetadata();
    this.updatejsondialog = true;

    
  }

  protected loadConfigMetadata(){
    setTimeout(() => {
      this.metadataConfigService.getProgramsList().subscribe(
        p => {
          this.programsMap = p
        },
        error => {
          this.addError("Failure","Metadata not loaded. Poor/Slow network connectivity detected...\n Try again.");
        }
        );
    },1000)
    
    
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
  this.json = '';
  if(this.programStageMap){
    this.programStageMap.forEach(p=>{
      if(p.program_stage_id === this.selectedProgramStage.program_stage_id){
        this.json = p.programstageform.json
      }
    })
    
  }
}

 formbuilderdata: FormBuilderData;
saveFormProgramStage(){
this.formbuilderdata = {} as FormBuilderData;
this.formbuilderdata.program_stage_id = this.selectedProgramStage.program_stage_id;
this.formbuilderdata.json = this.jsonElement.nativeElement.innerHTML;
this.formbuilderdata.created_by = +sessionStorage.getItem('userid');
this.formbuilderdata.created_date =  Date.now();

setTimeout(() => {
 // console.log("Got here "+this.json+" "+JSON.stringify(this.formbuilderdata));
  this.formbuilderservice.saveFormProgramStage(this.formbuilderdata)
        .subscribe(
        () => {
          this.addSuccess("Success","Form linked to program stage successfully.");

          },
        error => {
    this.addError("Unsuccessful.","Failed to link form to program stage. "+error.statusText);
            console.error(error);
        }

         );
      },1000);
}

updateFormProgramStage(){
  this.formbuilderdata = {} as FormBuilderData;
  this.formbuilderdata.program_stage_id = this.selectedProgramStage.program_stage_id;
  this.formbuilderdata.json = this.json;
  this.formbuilderdata.program_stage_form_id=0;
  if(this.formbuilderdata.json){
    this.formbuilderdata.program_stage_form_id = this.selectedProgramStage.programstageform.program_stage_form_id;
  }
  this.formbuilderdata.created_by = +sessionStorage.getItem('userid');
  this.formbuilderdata.created_date =  Date.now();
  console.log(JSON.stringify(this.formbuilderdata));
  setTimeout(() => {
    this.formbuilderservice.saveFormProgramStage(this.formbuilderdata)
          .subscribe(
          () => {
            this.addSuccess("Success","Form linked to program stage successfully.");
  
            },
          error => {
      this.addError("Unsuccessful.","Failed to link form to program stage. "+error.statusText);
              console.error(error);
          }
  
           );
        },1000);
  }

addSuccess(title: string, message: string) {
  this.messageService.add({sticky: true, severity: 'success', summary: title, detail: message });


}
addError(title: string, message: string) {
  this.messageService.add({ sticky: true, severity: 'error', summary: title, detail: message });

}
}




