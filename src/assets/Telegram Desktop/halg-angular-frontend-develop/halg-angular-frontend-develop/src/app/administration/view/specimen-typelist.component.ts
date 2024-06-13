import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { SpecimenTypeData, SpecimenCollectionModeData } from '../domain/specimentype.data';
import {ManageSpecimenTypeService} from '../service/manage.specimen-type.service';
import { Location } from '@angular/common';
import {MessageService} from 'primeng/api';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';


@Component({
  selector: 'app-specimen-typelist',
  template: `
      <p-toast position="top-center"></p-toast>
 <p-tabView [(activeIndex)]="activeindex">
  <p-tabPanel header="Specimen Type ">
  <div class="p-grid">
  <div class="p-col-12">

      <div class="card">
          <p-toolbar styleClass="p-mb-4">
              <ng-template pTemplate="left">
                  <button pButton pRipple label="Add Specimen Type" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddSpecimenType()"></button>
                  <button pButton pRipple label="Delete Specimen Type" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
              </ng-template>

              <ng-template pTemplate="right">
                  <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importSpecimenType()">
                          </button>
                          <button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
              </ng-template>
          </p-toolbar>
          <p-table #sptyp [value]="specimenTypeList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code','description']"
       [rowHover]="true" dataKey="id"
          styleClass="p-datatable-customers"
          currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

          <ng-template pTemplate="caption">
              <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                  <h5 class="p-m-0">Specimen Type Listing</h5>
                  <span class="p-input-icon-left">
                  <i class="pi pi-search"></i>
                  <input pInputText type="text" (input)="sptyp.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
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
                  <th>Action</th>

              </tr>
          </ng-template>
          <ng-template pTemplate="body" let-SpecimenType>
              <tr>
                  <td>
                      <p-tableCheckbox [value]="SpecimenType"></p-tableCheckbox>
                  </td>
                  <td>
                      {{SpecimenType.name}}
                  </td>
                  <td>
                      {{SpecimenType.code}}
                  </td>
                  <td>
                      {{SpecimenType.description}}
                  </td>

                  <td>
                      <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editSpecimenType(SpecimenType)"></button>
                      <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteProduct(product)"></button>
                  </td>
              </tr>
          </ng-template>
          <ng-template pTemplate="summary">
              <div class="p-d-flex p-ai-center p-jc-between">
                  In total there are {{specimenTypeList ? specimenTypeList.length : 0 }} Specimen Type.
              </div>
          </ng-template>
      </p-table>

          </div>

          <p-dialog [(visible)]="specimenTypeDialog" [style]="{width: '650px'}" header="New SpecimenType" [modal]="true" styleClass="p-fluid">
              <ng-template pTemplate="content">
        <div  class="p-col-12 p-fluid p-formgrid p-grid">
           <div class="p-col-6 p-field">
                  <label for="name">Name</label>
                  <input  type="text" pInputText [(ngModel)]="specimenTypecreatedata.name" aria-describedby="username-help"
                  placeholder="Enter name">

              </div>
         <div class="p-col-6 p-field">
                  <label for="code">Code</label>
                  <input id="code" type="code" pInputText [(ngModel)]="specimenTypecreatedata.code" aria-describedby="password-help" placeholder="Enter code">

              </div>
        </div>

        <div class="p-grid p-formgrid p-fluid">
                  <div class="p-col-12 p-field">
                      <label for="description">Description</label>
                      <textarea rows="5" cols="30" placeholder="Description" pInputTextarea  [(ngModel)]="specimenTypecreatedata.description" placeholder="Enter Description"></textarea>
                  </div>

              </div>


              </ng-template>
              <ng-template pTemplate="footer">
                            <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideSpecimenTypeDialog()"></button>
                            <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addSpecimenType()"></button>
                        </ng-template>
            </p-dialog>


            <p-dialog [(visible)]="specimenTypeEditDialog" [style]="{width: '650px'}" header="SpecimenType Details" [modal]="true" styleClass="p-fluid">

              <ng-template pTemplate="content">
                  <div class="p-col-12 p-fluid p-formgrid p-grid">
                  <div class="p-col-12 p-field">
                      <label for="name">Name</label>
                      <input id="name" type="name" pInputText [(ngModel)]="selectedSpecimenType.name">
                  </div>
                  <div class="p-col-6 p-field">
                      <label for="code">Code</label>
                      <input id="code" type="code" pInputText [(ngModel)]="selectedSpecimenType.code">
                  </div>
                  <div class="p-col-6 p-field">
                      <label for="description"> Description </label>
                      <input id="description" type="description" pInputText [(ngModel)]="selectedSpecimenType.description">
                  </div>
                  <div class="p-col-6 p-field">
                          <label for="created_by">Created_By</label>
                          <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedSpecimenType.created_by">
                      </div>
                      <div class="p-col-6 p-field">
                          <label for="created_date">Created_Date</label>
                          <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedSpecimenType.created_date">
                      </div>

                  </div>
                  </ng-template>

                  <ng-template pTemplate="footer">
                      <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideSpecimenTypeEditDialog()"></button>
                      <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateSpecimenType()"></button>
                  </ng-template>
                  </p-dialog>


                  <p-dialog [(visible)]="specimenTypeImportDialog" [style]="{width: '800px'}" header="Import SpecimenType" [modal]="true" styleClass="p-fluid">

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

  </p-tabPanel>

  <p-tabPanel header="Specimen Collection Mode ">
  <div class="p-grid">
  <div class="p-col-12">

      <div class="card">
          <p-toolbar styleClass="p-mb-4">
              <ng-template pTemplate="left">
                  <button pButton pRipple label="Add Specimen Collection Mode" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddSpecimenCollectionMode()"></button>
                  <button pButton pRipple label="Delete Specimen Collection Mode" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
              </ng-template>

              <ng-template pTemplate="right">
                  <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importSpecimenCollectionMode()">
                          </button>
                          <button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
              </ng-template>
          </p-toolbar>
          <p-table #spt [value]="specimenCollectionModeList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code','description']"
       [rowHover]="true" dataKey="id"
          styleClass="p-datatable-customers"
          currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

          <ng-template pTemplate="caption">
              <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                  <h5 class="p-m-0">Specimen Collection Mode Listing</h5>
                  <span class="p-input-icon-left">
                  <i class="pi pi-search"></i>
                  <input pInputText type="text" (input)="spt.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
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
                  <th>Action</th>

              </tr>
          </ng-template>
          <ng-template pTemplate="body" let-SpecimenCollectionMode>
              <tr>
                  <td>
                      <p-tableCheckbox [value]="SpecimenCollectionMode"></p-tableCheckbox>
                  </td>

                  <td>
                      {{SpecimenCollectionMode.name}}
                  </td>
                  <td>
                      {{SpecimenCollectionMode.code}}
                  </td>
                  <td>
                      {{SpecimenCollectionMode.description}}
                  </td>

                  <td>
                      <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editSpecimenCollectionMode(SpecimenCollectionMode)"></button>
                      <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteProduct(product)"></button>
                  </td>
              </tr>
          </ng-template>
          <ng-template pTemplate="summary">
              <div class="p-d-flex p-ai-center p-jc-between">
                  In total there are {{specimenCollectionModeList ? specimenCollectionModeList.length : 0 }} Specimen Collection Mode.
              </div>
          </ng-template>
      </p-table>

          </div>

          <p-dialog [(visible)]="specimenCollectionModeDialog" [style]="{width: '650px'}" header="New Specimen Collection Mode" [modal]="true" styleClass="p-fluid">
              <ng-template pTemplate="content">
        <div  class="p-col-12 p-fluid p-formgrid p-grid">
           <div class="p-col-6 p-field">
                  <label for="name">Name</label>
                  <input  type="text" pInputText [(ngModel)]="specimenCollectionModecreatedata.name" aria-describedby="username-help"
                  placeholder="Enter name">

              </div>
         <div class="p-col-6 p-field">
                  <label for="code">Code</label>
                  <input id="code" type="code" pInputText [(ngModel)]="specimenCollectionModecreatedata.code" aria-describedby="password-help" placeholder="Enter code">

              </div>
        </div>

        <div class="p-grid p-formgrid p-fluid">
                  <div class="p-col-12 p-field">
                      <label for="description">Description</label>
                      <textarea rows="5" cols="30" placeholder="Description" pInputTextarea  [(ngModel)]="specimenCollectionModecreatedata.description" placeholder="Enter Description"></textarea>
                  </div>

              </div>


              </ng-template>
              <ng-template pTemplate="footer">
                            <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideSpecimenCollectionModeDialog()"></button>
                            <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addSpecimenCollectionMode()"></button>
                        </ng-template>
            </p-dialog>


            <p-dialog [(visible)]="specimenCollectionModeEditDialog" [style]="{width: '650px'}" header="Specimen Collection Mode Details" [modal]="true" styleClass="p-fluid">

              <ng-template pTemplate="content">
                  <div class="p-col-12 p-fluid p-formgrid p-grid">
                  <div class="p-col-12 p-field">
                      <label for="name">Name</label>
                      <input id="name" type="name" pInputText [(ngModel)]="selectedSpecimenCollectionMode.name">
                  </div>
                  <div class="p-col-6 p-field">
                      <label for="code">Code</label>
                      <input id="code" type="code" pInputText [(ngModel)]="selectedSpecimenCollectionMode.code">
                  </div>
                  <div class="p-col-6 p-field">
                      <label for="description"> Description </label>
                      <input id="description" type="description" pInputText [(ngModel)]="selectedSpecimenCollectionMode.description">
                  </div>
                  <div class="p-col-6 p-field">
                          <label for="created_by">Created_By</label>
                          <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedSpecimenCollectionMode.created_by">
                      </div>
                      <div class="p-col-6 p-field">
                          <label for="created_date">Created_Date</label>
                          <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedSpecimenCollectionMode.created_date">
                      </div>

                  </div>
                  </ng-template>

                  <ng-template pTemplate="footer">
                      <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideSpecimenCollectionModeEditDialog()"></button>
                      <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateSpecimenCollectionMode()"></button>
                  </ng-template>
                  </p-dialog>


                  <p-dialog [(visible)]="specimenCollectionModeImportDialog" [style]="{width: '800px'}" header="Import SpecimenCollectionMode" [modal]="true" styleClass="p-fluid">

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
  </p-tabPanel>
      </p-tabView>
      `,
  styleUrls: ['./specimen-typelist.component.scss'],
  providers: [MessageService]
})
export class SpecimenTypelistComponent implements OnInit {
  specimenTypecreatedata = {} as SpecimenTypeData;
  specimenCollectionModecreatedata = {} as SpecimenCollectionModeData;



  specimenTypeList:any;
  selectedSpecimenType: SpecimenTypeData;
  specimenTypeDialog: boolean;
  specimenTypeEditDialog: boolean;
  specimenTypeImportDialog: boolean;

  specimenCollectionModeList:any;
  selectedSpecimenCollectionMode: SpecimenCollectionModeData;
  specimenCollectionModeDialog: boolean;
  specimenCollectionModeEditDialog: boolean;
  specimenCollectionModeImportDialog: boolean;

  activeindex: number = 0;
  constructor(private router: Router,private messageService: MessageService,private location: Location, private route:ActivatedRoute,
    private manageSpecimenTypeService:ManageSpecimenTypeService, private breadcrumbService: AppBreadcrumbService) {

     this.breadcrumbService.setItems([
     { label: 'Dashboard', routerLink: ['/dashboard'] },
     { label: 'Metadata', routerLink: ['/metadatalist'] },
     { label: 'List Specimen Type', routerLink: ['/specimentypelist'] }    ]);
 }

 ngOnInit(): void {
  /* if(sessionStorage.getItem('username') == null){
     this.addError("Session Expired.","Your current session has expired. Re-login.");
     this.router.navigate(['']);
   } */
   this.SpecimenTypeList();
   this.SpecimenCollectionModeList();
   this.activeindex = parseInt(this.route.snapshot.paramMap.get('index'));

 }

 addSpecimenType(){
  this.specimenTypecreatedata.created_by = +sessionStorage.getItem("userid");
  this.specimenTypecreatedata.created_date = new Date ();
  this.manageSpecimenTypeService.createSpecimenType(this.specimenTypecreatedata).subscribe(
    data => {
      this.addSuccess("Success!","Specimen Type added successfully.");
  },
  error => {
  this.addError("Failed!","Could not add Specimen Type.");
  }

  );
  }

  SpecimenTypeList():void{
    this.manageSpecimenTypeService.getSpecimenTypes().subscribe(data => {
      this.specimenTypeList = data;
      console.log(data);
    }
    );
    }

    goToAddSpecimenType(specimenType: SpecimenTypeData){
      this.router.navigate(['addSpecimenType']);
      this.specimenTypeDialog=true;
    }


    importSpecimenType(specimenType: SpecimenTypeData){
      this.router.navigate(['importSpecimenType']);
      this.specimenTypeImportDialog=true;
    }

  goBack(){
    this.location.back();
    }

    editSpecimenType(specimenType: SpecimenTypeData){
      this.selectedSpecimenType = {...specimenType};
      this.specimenTypeEditDialog=true;
     }

     updateSpecimenType(){
      this.manageSpecimenTypeService.createSpecimenType(this.selectedSpecimenType).subscribe(
        () => {
          this.addSuccess("Success!","Specimen Type information updated successfully.");

       },
       () => {
       this.addError("Failed!","Specimen Type creation failed.");
       this.specimenTypeDialog = false;
     });
    }

    addSuccess(title:string,message:string) {
      this.messageService.add({severity:'success', summary:title, detail:message});


    }
    addError(title:string,message:string) {
      this.messageService.add({severity:'error', summary:title, detail:message});

    }

    hideSpecimenTypeDialog(){
      this.specimenTypeDialog = false;
    }

    hideSpecimenTypeEditDialog(){
      this.specimenTypeEditDialog = false;
    }


    ///Specimen Collection Methods

    addSpecimenCollectionMode(){
      this.specimenCollectionModecreatedata.created_by = +sessionStorage.getItem("userid");
      this.specimenCollectionModecreatedata.created_date = new Date ();
      this.manageSpecimenTypeService.createSpecimenCollectionMode(this.specimenCollectionModecreatedata).subscribe(
        data => {
          this.addSuccess("Success!","Specimen Collection Mode added successfully.");
      },
      error => {
      this.addError("Failed!","Could not add Specimen Collection Mode.");
      }

      );
      }

      SpecimenCollectionModeList():void{
        this.manageSpecimenTypeService.getSpecimenCollectionModes().subscribe(data => {
          this.specimenCollectionModeList = data;
          console.log(data);
        }
        );
        }

        goToAddSpecimenCollectionMode(specimenCollectionMode: SpecimenCollectionModeData){
          this.router.navigate(['addSpecimenCollectionMode']);
          this.specimenCollectionModeDialog=true;
        }


        importSpecimenCollectionMode(specimenCollectionMode: SpecimenCollectionModeData){
          this.router.navigate(['importSpecimenCollectionMode']);
          this.specimenCollectionModeImportDialog=true;
        }


        editSpecimenCollectionMode(SpecimenCollectionMode: SpecimenCollectionModeData){
          this.selectedSpecimenCollectionMode = {...SpecimenCollectionMode};
          this.specimenCollectionModeEditDialog=true;
         }

         updateSpecimenCollectionMode(){
          this.manageSpecimenTypeService.createSpecimenCollectionMode(this.selectedSpecimenCollectionMode).subscribe(
            () => {
              this.addSuccess("Success!","Specimen Collection Mode information updated successfully.");

           },
           () => {
           this.addError("Failed!","Specimen Collection Mode creation failed.");
           this.specimenCollectionModeDialog = false;
         });
        }



        hideSpecimenCollectionModeDialog(){
          this.specimenCollectionModeDialog = false;
        }

        hideSpecimenCollectionModeEditDialog(){
          this.specimenCollectionModeEditDialog = false;
        }

}
