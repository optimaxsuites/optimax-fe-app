import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { ModeOfHivTestData } from '../domain/modeofhivtest.data';
import {ManageModeOfHivTestService} from '../service/manage.modeofhivtest.service';
import { Location } from '@angular/common';
import {MessageService} from 'primeng/api';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { MetadataConfigService } from 'src/app/administration/service/metadata-config.service';
import { AssessmentTypeData } from 'src/app/administration/domain/assessmenttype.data';



@Component({
  selector: 'app-modeofhivtestlist',
  template: `<p-toast position="top-center"></p-toast>
  <div class="p-grid">
  <div class="p-col-12">

      <div class="card">
          <p-toolbar styleClass="p-mb-4">
              <ng-template pTemplate="left">
                  <button pButton pRipple label="Add Mode Of Hiv Test" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddModeOfHivTest()"></button>
                  <button pButton pRipple label="Delete Mode Of Hiv Test" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
              </ng-template>

              <ng-template pTemplate="right">
                  <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importModeOfHivTest()">
                          </button>
                          <button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
              </ng-template>
          </p-toolbar>
          <p-table #dt [value]="modeOfHivTestList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code','description']"
       [rowHover]="true" dataKey="hiv_test_mode_id" [(selection)]="selectedModeOfHivTest"
          styleClass="p-datatable-customers"
          currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

          <ng-template pTemplate="caption">
              <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                  <h5 class="p-m-0">Mode Of Hiv Test Listing</h5>
                  <span class="p-input-icon-left">
                  <i class="pi pi-search"></i>
                  <input pInputText type="text" (input)="dt.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
              </span>
              </div>
          </ng-template>
          <ng-template pTemplate="header">
              <tr>
                  <th style="width: 3rem">
                      <p-tableHeaderCheckbox></p-tableHeaderCheckbox>
                  </th>
                  <th pSortableColumn="name">Name<p-sortIcon field="name"></p-sortIcon></th>
                  <th pSortableColumn="code">Code <p-sortIcon field="code"></p-sortIcon></th>
                  <th pSortableColumn="description">Description <p-sortIcon field="description"></p-sortIcon></th>
                  <th >Action </th>

              </tr>
          </ng-template>
          <ng-template pTemplate="body" let-modeofhivtest>
              <tr>
                  <td>
                      <p-tableCheckbox [value]="modeofhivtest"></p-tableCheckbox>
                  </td>
                  <td><span class="p-column-title"></span>
                      {{modeofhivtest.name}}
                  </td>
                  <td><span class="p-column-title"></span>
                      {{modeofhivtest.code}}
                  </td>
                  <td><span class="p-column-title"></span>
                      {{modeofhivtest.description}}
                  </td>

                  <td>
                      <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editModeOfHivTest()"></button>
                      <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteProduct(product)"></button>
                  </td>
              </tr>
          </ng-template>
          <ng-template pTemplate="summary">
              <div class="p-d-flex p-ai-center p-jc-between">
                  In total there are {{modeOfHivTestList ? modeOfHivTestList.length : 0 }} Mode Of Hiv Test.
              </div>
          </ng-template>
      </p-table>

          </div>

          <p-dialog [(visible)]="modeOfHivTestDialog" [style]="{width: '650px'}" header="New Mode Of Hiv Test" [modal]="true" styleClass="p-fluid">
              <ng-template pTemplate="content">
        <div  class="p-col-12 p-fluid p-formgrid p-grid">
           <div class="p-col-6 p-field">
                  <label for="name">Name</label>
                  <input  type="text" pInputText [(ngModel)]="modeOfHivTestcreatedata.name" aria-describedby="username-help"
                  placeholder="Enter name">

              </div>
         <div class="p-col-6 p-field">
                  <label for="code">Code</label>
                  <input id="code" type="code" pInputText [(ngModel)]="modeOfHivTestcreatedata.code" aria-describedby="password-help" placeholder="Enter code">

              </div>
        </div>

        <div class="p-grid p-formgrid p-fluid">
                  <div class="p-col-12 p-field">
                      <label for="description">Description</label>
                      <textarea rows="5" cols="30" placeholder="Description" pInputTextarea  [(ngModel)]="modeOfHivTestcreatedata.description" placeholder="Enter code"></textarea>
                  </div>

              </div>


              </ng-template>
              <ng-template pTemplate="footer">
                            <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideModeOfHivTestDialog()"></button>
                            <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addModeOfHivTest()"></button>
                        </ng-template>
            </p-dialog>


            <p-dialog [(visible)]="modeOfHivTestEditDialog" [style]="{width: '650px'}" header="Mode Of Hiv Test Details" [modal]="true" styleClass="p-fluid">

              <ng-template pTemplate="content">
                  <div class="p-col-12 p-fluid p-formgrid p-grid">
                  <div class="p-col-12 p-field">
                      <label for="name">Name</label>
                      <input id="name" type="name" pInputText [(ngModel)]="selectedModeOfHivTest.name">
                  </div>
                  <div class="p-col-6 p-field">
                      <label for="code">Code</label>
                      <input id="code" type="code" pInputText [(ngModel)]="selectedModeOfHivTest.code">
                  </div>
                  <div class="p-col-6 p-field">
                      <label for="description"> Description </label>
                      <input id="description" type="description" pInputText [(ngModel)]="selectedModeOfHivTest.description">
                  </div>
                  <div class="p-col-6 p-field">
                          <label for="created_by">Created_By</label>
                          <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedModeOfHivTest.created_by">
                      </div>
                      <div class="p-col-6 p-field">
                          <label for="created_date">Created_Date</label>
                          <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedModeOfHivTest.created_date">
                      </div>

                  </div>
                  </ng-template>

                  <ng-template pTemplate="footer">
                      <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideModeOfHivTestEditDialog()"></button>
                      <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateModeOfHivTest()"></button>
                  </ng-template>
                  </p-dialog>


                  <p-dialog [(visible)]="modeOfHivTestImportDialog" [style]="{width: '800px'}" header="Import Mode Of Hiv Test" [modal]="true" styleClass="p-fluid">

                      <ng-template pTemplate="content">
                                          <div class="p-col-12 p-fluid p-formgrid p-grid">

                                              <div class="card">

                                                  <div class="p-fluid p-formgrid p-grid">
                                                      <div class="p-field p-col-12 p-md-6">
                                                          <label for="Url">Url</label>
                                                          <input id="Url" type="url" pInputText placeholder="Enter url">
                                                      </div>
                                                      <div class="p-field p-col-12 p-md-6">
                                                          <label for="format">Supported import format</label>
                                                          <p-dropdown inputId="format" optionLabel="name" placeholder="JSON"></p-dropdown>
                                                      </div>
                                                  </div>


                                                  <div class="p-field p-col-12 p-md-12">
                                                      <button pButton pRipple label="Preview input" class="p-mr-2 p-mb-2"></button>
                                                  </div>
                                                  <div class="p-field p-col-12 p-md-12">
                                                      <p-table #dt [value]="heirarchyunit" [columns]="" [rows]="10" [paginator]="true" [globalFilterFields]="['name','country.name','representative.name','status']"
                                                      [(selection)]="selectedHeirarchyunit" [rowHover]="true" dataKey="id"
                                                      styleClass="p-datatable-customers"
                                                      currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="false">
                                                 <ng-template pTemplate="caption">
                                                     <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                                                         <h5 class="p-m-0">Import Preview</h5>
                                                         <div class="p-field p-col-6 p-md-6" [style]="{'float':'right'}">
                                                              <span class="p-input-icon-left">
                                                                  <i class="pi pi-search"></i>
                                                                  <input pInputText type="text" (input)="dt.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
                                                              </span>
                                                         </div>

                                                     </div>
                                                 </ng-template>
                                                 <ng-template pTemplate="header">
                                                     <tr>
                                                         <th style="width: 3rem">
                                                             <p-tableHeaderCheckbox></p-tableHeaderCheckbox>
                                                         </th>
                                                         <th pSortableColumn="id">ID</th>
                                                         <th pSortableColumn="Name">Name</th>
                                                         <th pSortableColumn="code">Code </th>
                                                         <th pSortableColumn="Description">Description</th>
                                                         <th></th>
                                                     </tr>
                                                 </ng-template>
                                                 <ng-template pTemplate="body" let-product>
                                                     <tr>
                                                         <td>
                                                             <p-tableCheckbox [value]="product"></p-tableCheckbox>
                                                         </td>
                                                         <td><span class="p-column-title">Name</span>
                                                             {{product.name}}
                                                         </td>
                                                         <td><span class="p-column-title">Image</span>
                                                             <img [src]="'assets/demo/images/product/' + product.image" [alt]="product.name" width="100" class="p-shadow-4" />
                                                         </td>
                                                         <td><span class="p-column-title">Price</span>
                                                             {{product.price | currency:'USD'}}
                                                         </td>
                                                         <td><span class="p-column-title">Category</span>
                                                             {{product.category}}
                                                         </td>
                                                         <td><span class="p-column-title">Reviews</span>
                                                             <p-rating [ngModel]="product.rating" [readonly]="true" [cancel]="false"></p-rating>
                                                         </td>
                                                         <td><span class="p-column-title">Status</span>
                                                             <span [class]="'product-badge status-' + (product.inventoryStatus ? product.inventoryStatus.toLowerCase() : '')">{{product.inventoryStatus}}</span>
                                                         </td>

                                                             </tr>
                                                         </ng-template>

                                                     </p-table>
                                                  </div>

                                                  <div class="p-grid p-col-12 p-md-12">
                                                      <div class="p-field p-col-12 p-md-3">
                                                          <button pButton pRipple label="remove" class="p-mr-2 p-mb-2"></button>
                                                      </div>
                                                      <div class="p-field p-col-12 p-md-7">
                                                          <button pButton pRipple label="Import List" class="p-mr-2 p-mb-2"></button>
                                                      </div>
                                                  </div>

          </div>

                  </div>
              </ng-template>

      </p-dialog>

      </div>
      </div>
`,
  styleUrls: ['./modeofhivtestlist.component.scss'],
  providers: [MessageService]
})
export class ModeOfHivTestlistComponent implements OnInit {
  modeOfHivTestcreatedata = {} as ModeOfHivTestData;


  modeOfHivTestList:any;
  selectedModeOfHivTest: ModeOfHivTestData;
  modeOfHivTestDialog: boolean;
  modeOfHivTestEditDialog: boolean;
  modeOfHivTestImportDialog: boolean;

  constructor(private router: Router,private messageService: MessageService,private location: Location,
    private manageModeOfHivTestService:ManageModeOfHivTestService,
     private breadcrumbService: AppBreadcrumbService) {

     this.breadcrumbService.setItems([
     { label: 'Dashboard', routerLink: ['/dashboard'] },
     { label: 'Metadata', routerLink: ['/metadatalist'] },
     { label: 'List Mode Of Hiv Test', routerLink: ['/modeofhivtestlist'] }    ]);
 }

 ngOnInit(): void {
  if(sessionStorage.getItem('username') == null){
    this.addError("Session Expired.","Your current session has expired. Re-login.");
    this.router.navigate(['']);
  }
  this.ModeOfHivTestList();

}

addModeOfHivTest(){
  this.modeOfHivTestcreatedata.created_by = +sessionStorage.getItem("userid");
  this.modeOfHivTestcreatedata.created_date = new Date ();
  this.manageModeOfHivTestService.createModeOfHivTest(this.modeOfHivTestcreatedata).subscribe(
    data => {
      this.addSuccess("Success!","Mode Of Hiv Test added successfully.");
  },
  error => {
  this.addError("Failed!","Could not add Mode Of Hiv Test.");
  }

  );
  }

  ModeOfHivTestList():void{
    this.manageModeOfHivTestService.getModeOfHivTests().subscribe(data => {
      this.modeOfHivTestList = data;
      console.log(data);
    }
    );
    }

    goToAddModeOfHivTest(modeOfHivTest: ModeOfHivTestData){
      this.router.navigate(['addModeOfHivTest']);
      this.modeOfHivTestDialog=true;
    }


    importModeOfHivTest(modeOfHivTest: ModeOfHivTestData){
      this.router.navigate(['importModeOfHivTest']);
      this.modeOfHivTestImportDialog=true;
    }

  goBack(){
    this.location.back();
    }

    editModeOfHivTest(modeOfHivTest: ModeOfHivTestData){
      this.selectedModeOfHivTest = {...modeOfHivTest};
      this.modeOfHivTestEditDialog=true;
     }

     updateModeOfHivTest(){
      this.manageModeOfHivTestService.createModeOfHivTest(this.selectedModeOfHivTest).subscribe(
        () => {
          this.addSuccess("Success!","Mode Of Hiv Test information updated successfully.");

       },
       () => {
       this.addError("Failed!","Mode Of Hiv Test creation failed.");
       this.modeOfHivTestDialog = false;
     });
    }

    addSuccess(title:string,message:string) {
      this.messageService.add({severity:'success', summary:title, detail:message});


    }
    addError(title:string,message:string) {
      this.messageService.add({severity:'error', summary:title, detail:message});

    }

    hideModeOfHivTestDialog(){
      this.modeOfHivTestDialog = false;
    }

    hideModeOfHivTestEditDialog(){
      this.modeOfHivTestEditDialog = false;
    }

 }

