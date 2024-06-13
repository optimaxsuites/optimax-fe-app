import { Component, OnInit } from '@angular/core';
import {
  MessageService,
  MenuItem,
  LazyLoadEvent,
  ConfirmationService,
  ConfirmEventType,
} from 'primeng/api';
import { StatesData } from 'src/app/administration/domain/nationality.data';
import {
  ColumnDef,
  ProgramsData,
  ProgramStageData,
} from 'src/app/administration/domain/programs.data';
import { FormBuilderService } from 'src/app/administration/service/manage.formbuilder.service';
import { MetadataConfigService } from 'src/app/administration/service/metadata-config.service';
import { ClientExtendedInfo } from '../domain/client.portal.data';
import { ClientPortalService } from '../service/client.portal.service';
import { ManageClientService } from '../service/manage.client.service';

declare var require: any;

@Component({
  selector: 'app-client-enrolment-entry',
  template: `
    <p-toast position="top-center"></p-toast>
    <p-confirmDialog
      styleClass="p-toast-message-custom"
      rejectButtonStyleClass="p-button-text"
    ></p-confirmDialog>
    <p-panel header="Summary & Stats" [toggleable]="true" [collapsed]="true">
      <ng-template pTemplate="icons">
        <button
          icon="pi pi-cog"
          pButton
          class="p-panel-header-icon p-link"
          (click)="menu.toggle($event)"
        ></button>

        <p-menu
          #menu
          id="config_menu"
          [model]="userActionOptions"
          [popup]="true"
        ></p-menu>
      </ng-template>

      <div class="p-col-12">
        <div class="p-d-flex p-p-3">
          <p class="p-mr-2">
            <strong
              >Hospital No.<mark>{{ viewedClient.hospitalNum }}</mark></strong
            >
          </p>
          <!--p class="p-mr-2"><strong>Client Id.<mark>{{viewedClient.hospital_number}}</mark></strong></p>-->
          <p class="p-mr-2">
            <strong
              >Full Name.
              <mark
                >{{ viewedClient.surname }} {{ viewedClient.firstname }}
                {{ viewedClient.otherNames }}</mark
              >
            </strong>
          </p>
          <p class="p-mr-2">
            <strong>Age.<mark>23</mark></strong>
          </p>
          <p class="p-mr-2">
            <strong>Dependants.<mark>6</mark></strong>
          </p>
          <p class="p-mr-2">
            <strong
              >Email.<mark>{{
                viewedClient.email != null ? viewedClient.email : 'N/A'
              }}</mark></strong
            >
          </p>
          <p class="p-mr-2">
            <strong
              >Phone.<mark>{{
                viewedClient.phone_number != null
                  ? viewedClient.phone_number
                  : 'N/A'
              }}</mark></strong
            >
          </p>
        </div>
      </div>
    </p-panel>
    <br />
    <p-card>
      <ng-template pTemplate="title">
        <div class="p-grid p-justify-between">
          <b>Client Service Enrolment</b>
          <p-button icon="pi pi-print" iconPos="left"></p-button>
        </div>
      </ng-template>
      <ng-template pTemplate="content">
        <div class="p-grid">
          <div class="p-fluid p-formgrid p-grid p-col-12">
            <div class="p-field p-col-4">
              <label for="programs_id"><b>Service Type</b></label>
              <p-dropdown
                inputId="programs_id"
                [options]="clientservices.programsMap"
                [(ngModel)]="selectedPrograms"
                optionLabel="name"
                placeholder="-Select-"
                (onChange)="onProgramsSelection()"
              ></p-dropdown>
            </div>

            <div class="p-field p-col-4">
              <label for="program_id"><b>Service Forms </b></label>
              <p-dropdown
                inputId="program_id"
                [options]="clientservices.programStageMap"
                [(ngModel)]="selectedProgramStage"
                optionLabel="name"
                placeholder="-Select-"
                (onChange)="onProgramStageSelection()"
              ></p-dropdown>
            </div>

            <div class="p-field p-col-4">
              <label for="date_of_report"><b>Date Of Report</b></label>
              <p-calendar
                [monthNavigator]="true"
                [yearNavigator]="true"
                yearRange="2000:{{ curYear }}"
                [maxDate]="maxDate"
                inputId="createddate"
                [showIcon]="true"
                showButtonBar="true"
                [(ngModel)]="created_date"
                dateFormat="dd/mm/yy"
              >
              </p-calendar>
            </div>

            <div class="p-col-4 p-md-2">
              <p-button
                label="Get Form"
                icon="pi pi-angle-right"
                iconPos="right"
                (click)="loadForm()"
              ></p-button>
            </div>
            <div class="p-col-4 p-md-2">
              <p-button
                label="View Data"
                icon="pi pi-angle-right"
                iconPos="right"
                (click)="viewProgramServiceData()"
              ></p-button>
            </div>
          </div>
          <div class="p-col-12" *ngIf="serviceFormRendered">
            <formio
              [form]="customServiceForm"
              [submission]="data"
              (submit)="onEditSubmit($event)"
            ></formio>
          </div>

          <div class="p-col-12" *ngIf="viewForCreateForm" [loading]="loading">
            <formio
              [form]="customServiceForm"
              (submit)="onSubmit($event)"
              [submission]="data"
            ></formio>
          </div>
        </div>

        <div class="p-col-12" *ngIf="viewForUpdateForm">
          <p-table
            #dt
            [columns]="cols"
            [value]="programsServiceData"
            [rows]="10"
            [paginator]="true"
            [globalFilterFields]="cols"
            [rowHover]="true"
            dataKey="id"
            styleClass="p-datatable-customers"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
            [showCurrentPageReport]="true"
          >
            <ng-template pTemplate="caption">
              <div
                class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header"
              >
                <h5 class="p-m-0">
                  <b
                    >Program Service Data for {{ selectedProgramStage.name }}</b
                  >
                </h5>
                <span class="p-input-icon-left">
                  <i class="pi pi-search"></i>
                  <input
                    pInputText
                    type="text"
                    (input)="dt.filterGlobal($event.target.value, 'contains')"
                    placeholder="Search..."
                  />
                </span>
              </div>
            </ng-template>

            <ng-template pTemplate="header">
              <tr>
                <ng-container *ngFor="let col of cols">
                  <th *ngIf="!col.hide">
                    {{ col.header | uppercase }}
                  </th>
                </ng-container>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-rowData>
              <tr>
                <ng-container *ngFor="let col of cols">
                  <td *ngIf="!col.hide">
                    {{ rowData[col.field] }}
                  </td>
                </ng-container>
                <td>
                  <div class="p-d-flex p-ai-center">
                    <button
                      pButton
                      pRipple
                      icon="pi pi-pencil"
                      class="p-button-rounded p-button-success p-mr-2"
                      (click)="editProgramServiceData(rowData)"
                    ></button>
                    <button
                      pButton
                      pRipple
                      icon="pi pi-trash"
                      class="p-button-rounded p-button-trash p-mr-2"
                      (click)="confirmBeforeDelete(rowData)"
                    ></button>
                  </div>
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="summary">
              <div class="p-d-flex p-ai-center p-jc-between">
                In total there are
                {{ programsServiceData ? programsServiceData.length : 0 }} rows
                found.
              </div>
            </ng-template>
          </p-table>
        </div>
      </ng-template>
    </p-card>
  `,
  styles: [
    `:host ::ng-deep {
    .p-toast-message-custom {
        background-color: #E1CFE7;
        border: solid #8A427A;
        border-width: 0 0 0 6px;
        color: #2c1e30;
        .p-toast-icon-close {
            color: #2c1e30;
        }
    }`,
  ],
  providers: [ConfirmationService, MessageService],
})
export class ClientEnrolmentEntryComponent implements OnInit {
  programStageMap = {} as ProgramStageData[];
  stateMap = {} as StatesData[];
  selectedProgramStage: ProgramStageData;
  loading: boolean = false;
  programs: ProgramsData[];
  programStageList: ProgramStageData[] = [];
  selectedPrograms: ProgramsData;

  programsMap = {} as ProgramsData[];
  programsServiceData: any[];

  viewedClient: ClientExtendedInfo;
  userActionOptions: MenuItem[];
  userProgramOptions: MenuItem[];
  customServiceForm: any;
  serviceForms: MenuItem[];
  programStage: MenuItem[];
  data: any;
  pp: any;
  viewForCreateForm: boolean = false;
  serviceFormRendered: boolean = false;
  viewForUpdateForm: boolean = false;
  json: any;

  clientservices: any;

  created_date: Date;
  maxDate: Date;
  minDate: string;
  curYear: string;
  cols: ColumnDef[];
  constructor(
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private manageclientService: ManageClientService,
    private metadataConfigService: MetadataConfigService,
    private clientPortalService: ClientPortalService,
    private formbuilderservice: FormBuilderService
  ) {}
  
  data2 = {
    
      "derivativefinancialinstruments": "23",
      "derivativefinancialinstruments1": "23",
      "propertyplantandequipmentppe": "34",
      "incometaxpayable": "23",
      "filing_period": "2020",
      "totalequityliabilities": "669",
      "researchcosts": "34",
      "advancepaymentstosubsidiarycompanies": "344",
      "deferredtaxliability": "23",
      "othercurrentliabilities": "23",
      "tradeandotherreceivables": "54",
      "inventories": "34",
      "grossprofit": "46",
      "totalnoncurrentassets": "2731",
      "id": "23",
      "authorizedsharecapital": "23",
      "longtermloansandborrowings": "23",
      "rightofuseassets": "34",
      "othernoncurrentassets": "23",
      "tradeandotherpayables": "23",
      "noncurrentassetsheldforsale": "23",
      "currenttaxassets": "12",
      "investmentsinsubsidiaries": "34",
      "shorttermleaseliabilities": "23",
      "created_by": "1",
      "salesandmarketingcosts": "23",
      "biologicalassets": "34",
      "profitlossfortheyearfromcontinuingoperations": "-79",
      "directorsnote1": "Gbuji",
      "amountduefromgroupentitiesnet": "23",
      "longtermleaseliabilities": "23",
      "totalassets": "889",
      "sharebasedpaymentsreserve": "23",
      "cashandcashequivalents": "23",
      "otherincome": "23",
      "totalequity": "370",
      "othernoncurrentliabilities": "23",
      "generalandadministrativecosts": "34",
      "marginaccountswithbrokers": "34",
      "marginaccountswithbrokers1": "23",
      "creditlosses": "34",
      "netassets": "20000000",
      "investmentsinassociatesandjointventure": "34",
      "operatingprofitloss": "-125",
      "client_unique_identifier": "RC1123336",
      "retainedearnings": "23",
      "noncontrollinginterests": "23",
      "shareofresultsfromjointventuresandassociates": "23",
      "costofsales": "23",
      "netlossgainfromchangesinfairvalueofbiologicalassets": "23",
      "totalcurrentassets": "616",
      "foreigncurrencytranslationreserve": "23",
      "amountduetogroupentitiesnet": "23",
      "profitlossfortheyear": "-102",
      "otherexpenses": "23",
      "financeincome": "23",
      "deferredtaxassets": "23",
      "shorttermloansandborrowings": "23",
      "depreciationandamortization": "23",
      "assetrevaluationreserve": "23",
      "intangibleassets": "34",
      "advancepaymentstosuppliers": "23",
      "othercurrentassets": "23",
      "provisionsforemployeebenefits": "23",
      "financecosts": "23",
      "totalnoncurrentliabilities": "92",
      "incometaxexpense": "23",
      "paidupcapital": "232",
      "longterminvestment": "23",
      "totalcurrentliabilities": "207",
      "lossaftertaxfortheyearfromdiscontinuedoperations": "23",
      "created_date": "2020-12-31 23:00:00",
      "companysemailaddress": "test@test.com",
      "profitlossbeforetaxfromcontinuingoperations": "-56",
      "revenueturnover": "23",
      "iherebycertifythetruthfulnessandfairnessoftheauditedfinancialst": "t"
  
  }

  ngOnInit() {
    this.viewedClient = this.clientPortalService.selectedClients;
    this.data = {};

    this.maxDate = new Date();
    this.curYear = new Date().getFullYear().toString();
    this.minDate = (+this.curYear - 18).toString();

    if (!this.clientservices) {
      this.loadConfigMetadata();
    }

    this.clientservices = this.manageclientService;

    this.userActionOptions = [
      {
        label: 'Bio',
        items: [
          {
            label: 'Edit Info',
            icon: 'pi pi-refresh',
            command: () => {
              // this.update();
            },
          },
          {
            label: 'Inactivate Client',
            icon: 'pi pi-times',
            command: () => {
              // this.delete();
            },
          },
        ],
      },
      {
        label: 'Programs',
        items: [
          {
            label: 'Active Programs',
            icon: 'pi pi-external-link',
            url: 'http://centrifugegroup.com',
          },
          {
            label: 'Transfer Client',
            icon: 'pi pi-upload',
            routerLink: '/',
          },
        ],
      },
      {
        label: 'Contact Client',
        items: [
          {
            label: 'SMS',
            icon: 'pi pi-external-link',
            url: 'http://centrifugegroup.com',
          },
          {
            label: 'Email',
            icon: 'pi pi-upload',
            routerLink: '/',
          },
        ],
      },
    ];

    this.userProgramOptions = [
      {
        label: 'Informatics',
        items: [
          {
            label: 'View BMI',
            icon: 'pi pi-refresh',
            command: () => {
              // this.dami();
            },
          },
          {
            label: 'View Temp',
            icon: 'pi pi-times',
            command: () => {
              // this.dami();
            },
          },
          {
            label: 'Reactions',
            icon: 'pi pi-times',
            command: () => {
              // this.dami();
            },
          },
        ],
      },
    ];
  }
  onRender(event) {
    this.viewedClient = this.clientPortalService.selectedClients;
  }
  ppp: any[] = [];
  p: any = {};
  test() {
    // this.ppp = this.data.data.data;
    // console.log(JSON.stringify(this.ppp));
    this.data.data.data.forEach((p) => {
      if (!p.id) {
        this.p = p;
        this.ppp.push(this.p);
        this.p = {};
      }
    });
    //   console.log(JSON.stringify(this.ppp));
  }

  onSubmit(event) {
    event.data.client_unique_identifier = this.viewedClient.hospitalNum;
   // event.data.party_id = this.viewedClient.hospitalNum;
    event.data.created_date = new Date(this.created_date);
    event.data.created_by = +sessionStorage.getItem('userid');
    event.data.formName = this.selectedProgramStage.form_stage_db_identifier;
    //event.data.program_id = this.selectedProgramStage.program_id;
    //console.log(JSON.stringify(event.data));
    this.manageclientService.createGenericInstance(event.data).subscribe(
      (data) => {
        this.addSuccess('Success', 'New service data added successfully.');
      },
      (error) => {
        console.error(error);
        if (error.toString() == '502') {
          this.addError(
            'Backend Error!',
            'There is a technical error preventing this action. The error code is ' +
              error
          );
        } else {
          this.addError('Unsuccessful.', 'Failed to add new client. ' + error);
          //  console.error(error);
        }
      }
    );
  }

  protected loadConfigMetadata() {
    this.metadataConfigService.getProgramsList().subscribe((p) => {
      this.clientservices.programsMap = p;
    });
  }
  col: any;
  viewProgramServiceData() {
    this.cols = [];
    this.col = {};
    // this.loading = true;

    // setTimeout(() => {

    this.manageclientService
      .getProgramServiceData(
        this.viewedClient.hospitalNum,
        this.selectedProgramStage.form_stage_db_identifier
      )
      .subscribe((p) => {
        this.programsServiceData = p;

        if (this.programsServiceData.length < 1) {
          this.addError(
            'Info',
            'No ' +
              this.selectedProgramStage.name +
              ' record found for this client...'
          );
        }
        if (this.programsServiceData.length > 0) {
          for (let key of Object.keys(this.programsServiceData[0]).slice(
            0,
            5
          )) {
            //retrieve max of db columns

            this.col.field = key;
            this.col.header = key;
            if (
              this.col.header == 'id' ||
              this.col.header == 'client_unique_identifier' ||
              this.col.header == 'created_date'
            ) {
              this.col.hide = false;
            } else {
              this.col.hide = true;
            }
            this.cols.push(this.col);
            this.col = {};
            //  this.loading = false;
          }

          this.viewForUpdateForm = true;
          this.viewForCreateForm = false;
          this.customServiceForm = false;
          this.serviceFormRendered = false;

          // }, 1000);
        }
        //  else{
        //  this.addError("Info","Service form "+ this.selectedProgramStage.name+ " not properly set up. Contact developer");
        //}
      });
  }

  onEditSubmit(event) {

    event.data.client_unique_identifier = this.viewedClient.hospitalNum;
   // event.data.party_id = this.viewedClient.hospitalNum;
    //   event.data.created_date = new Date(this.created_date);
    event.data.formName = this.selectedProgramStage.form_stage_db_identifier;

    this.manageclientService.updateGenericInstance(event.data).subscribe(
      (data) => {
        this.addSuccess('Success', 'Client updated successfully.');
      },
      (error) => {
        this.addError(
          'Unsuccessful.',
          'Failed to update client. ' + error + ' ' + error.statusText
        );
        console.error(error);
      }
    );
  }

  testCACData(){
    this.viewForCreateForm = false;
    this.viewForUpdateForm = false;
    this.serviceFormRendered = true;
    this.customServiceForm = {};
    if (this.json) {
      this.customServiceForm = JSON.parse(this.json);
    }

    this.data = {
      data: this.data2,
    }
  }
  editProgramServiceData(rowData) {
    this.viewForCreateForm = false;
    this.viewForUpdateForm = false;
    this.serviceFormRendered = true;
    this.customServiceForm = {};
    if (this.json) {
      this.customServiceForm = JSON.parse(this.json);
    }
    //console.log(JSON.stringify(rowData));
    // this.loading = true;
    // setTimeout(() => {

    this.data = {
      data: rowData,
    };
    // this.loading = false;
    // },500);
  }
  confirmBeforeDelete(rowData) {
    this.confirmationService.confirm({
      message: 'Are you sure that you want to delete this record?',
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.deleteProgramServiceData(rowData);
        // this.messageService.add({severity:'info', summary:'Confirmed', detail:'Deleted successfully'});
      },
      reject: (type) => {
        switch (type) {
          case ConfirmEventType.REJECT:
            this.messageService.add({
              severity: 'error',
              summary: 'Rejected',
              detail: 'You have rejected this request',
            });
            break;
          case ConfirmEventType.CANCEL:
            this.messageService.add({
              severity: 'warn',
              summary: 'Cancelled',
              detail: 'You have cancelled this request',
            });
            break;
        }
      },
    });
  }
  deleteParam: any = {};
  deleteProgramServiceData(rowData) {
    this.deleteParam.client_unique_identifier = this.viewedClient.hospitalNum;
   // this.deleteParam.party_id = this.viewedClient.hospitalNum;
    
    this.deleteParam.id = rowData.id;
    this.deleteParam.formName =
      this.selectedProgramStage.form_stage_db_identifier;
    // console.log(JSON.stringify(this.deleteParam));
    this.manageclientService
      .removeGenericInstance(JSON.stringify(this.deleteParam))
      .subscribe(
        () => {
          this.addSuccess('Success', 'Client removed successfully.');
          this.programsServiceData = this.programsServiceData.filter(
            (p) => p.id !== rowData.id
          );
        },
        (error) => {
          this.addError(
            'Unsuccessful.',
            'Failed to remove client. ' + error + ' ' + error.statusText
          );
          console.error(error);
        }
      );
  }

  onProgramsSelection() {
    this.clientservices.programStageMap = [];
    this.clientservices.programsMap.filter((p) => {
      if (p.program_id === this.selectedPrograms.program_id) {
        this.clientservices.programStageMap = p.programstages;
      }
    });
  }

  onProgramStageSelection() {
    this.json = {};
    if (this.clientservices.programStageMap) {
      this.clientservices.programStageMap.forEach((p) => {
        if (p.program_stage_id === this.selectedProgramStage.program_stage_id) {
          this.json = p.programstageform.json;
        }
      });
    }
  }
  _data: any[];
  loadForm() {
    this.viewForUpdateForm = false;
    this.serviceFormRendered = false;
    this.customServiceForm = {};
    if (this.json) {
      this.customServiceForm = JSON.parse(this.json);
      this.viewForCreateForm = true;
    }
    /* this.pp = {

    name: 'Moyo',
    code: 'daughter'

 }
 this.data = {
   data: this.pp
 }*/
    //this.pp = this.programsMap;
    /*this.pp = [
{
  name: 'Moyo',
  code: 'daughter'
},
{
  name: 'Debola',
  code: 'Wife'
}
]*/
    //this.loadConfigMetadata();

    /*this.formbuilderservice.listFormProgramAttribute("Hiv_Recency_Testing")
          .subscribe(p => {this._data = p});

          
          this.data = {
               data : {
                 data : this._data
               }
             }*/

    /*this.data = {
  data: {
      data: this.programsMap
    }
}*/
  }

  /*programChange(event){
  console.log(event);
  this.programStageList = [];
  this.clientPortalService.getProgramStages().subscribe(p => {
  this.programStageMap = p;

  for(let i=1; i<=this.programStageMap.length; i++) {

      if (i<= this.programStageMap.length && this.programStageMap[i].program_id ==event.program_id){

          this.programStageList.push(this.programStageMap[i]);
          console.log(this.programStageList);

      }
      else{
        null
      }
  }
  }
  );
 }*/

  ngOnDestroy() {
    this.manageclientService = this.clientservices;
  }

  addSuccess(title: string, message: string) {
    this.messageService.add({
      severity: 'success',
      summary: title,
      detail: message,
    });
  }
  addError(title: string, message: string) {
    this.messageService.add({
      severity: 'error',
      summary: title,
      detail: message,
    });
  }
}
