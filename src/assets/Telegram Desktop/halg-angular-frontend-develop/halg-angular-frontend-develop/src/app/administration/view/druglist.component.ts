import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { DrugData, DoseFrequencyData, UnitData, MedicationLine, RegimenCombo } from '../domain/drug.data';
import {ManageDrugService} from '../service/manage.drug.service';
import { Location } from '@angular/common';
import {MessageService} from 'primeng/api';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { ThrowStmt } from '@angular/compiler';
declare var require: any;


@Component({
  selector: 'app-druglist',
  template: `<p-toast position="top-center"></p-toast>
  <p-tabView [(activeIndex)]="activeindex">
  <p-tabPanel header="Drug" leftIcon="fa fa-pills">
   <div class="p-grid">
  <div class="p-col-12">

      <div class="card">
          <p-toolbar styleClass="p-mb-4">
              <ng-template pTemplate="left">
                  <button pButton pRipple label="Add Drug" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddDrug()"></button>
                  <button pButton pRipple label="Delete Drug" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedDrugs()" [disabled]="!selectedDrugs || !selectedDrugs.length"></button>
              </ng-template>

              <ng-template pTemplate="right">
                  <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importDrug()">
                          </button>
                          <button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
              </ng-template>
          </p-toolbar>
          <p-table #drg [value]="drugList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code','description']"
       [rowHover]="true" dataKey="id"
          styleClass="p-datatable-customers"
          currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

          <ng-template pTemplate="caption">
              <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                  <h5 class="p-m-0">Drug Listing</h5>
                  <span class="p-input-icon-left">
                  <i class="pi pi-search"></i>
                  <input pInputText type="text" (input)="drg.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
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
                  <th pSortableColumn="action">Action <p-sortIcon field="action"></p-sortIcon></th>

              </tr>
          </ng-template>
          <ng-template pTemplate="body" let-drug>
              <tr>
                  <td>
                      <p-tableCheckbox [value]="drug"></p-tableCheckbox>
                  </td>

                  <td>
                      {{drug.name}}
                  </td>
                  <td>
                      {{drug.code}}
                  </td>
                  <td>
                      {{drug.description}}
                  </td>

                  <td>
                      <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editDrug(drug)"></button>
                      <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteProduct(product)"></button>
                  </td>
              </tr>
          </ng-template>
          <ng-template pTemplate="summary">
              <div class="p-d-flex p-ai-center p-jc-between">
                  In total there are {{drugList ? drugList.length : 0 }} Drug.
              </div>
          </ng-template>
      </p-table>

          </div>

          <p-dialog [(visible)]="drugDialog" [style]="{width: '650px'}" header="New Drug" [modal]="true" styleClass="p-fluid">
              <ng-template pTemplate="content">
        <div  class="p-col-12 p-fluid p-formgrid p-grid">
           <div class="p-col-6 p-field">
                  <label for="name">Name</label>
                  <input  type="text" pInputText [(ngModel)]="drugcreatedata.name" aria-describedby="username-help"
                  placeholder="Enter name">

              </div>
         <div class="p-col-6 p-field">
                  <label for="code">Code</label>
                  <input id="code" type="code" pInputText [(ngModel)]="drugcreatedata.code" aria-describedby="password-help" placeholder="Enter code">

              </div>
        </div>

        <div class="p-grid p-formgrid p-fluid">
                  <div class="p-col-12 p-field">
                      <label for="description">Description</label>
                      <textarea rows="5" cols="30" placeholder="Description" pInputTextarea  [(ngModel)]="drugcreatedata.description" placeholder="Enter Description"></textarea>
                  </div>

              </div>


              </ng-template>
              <ng-template pTemplate="footer">
                            <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideDrugDialog()"></button>
                            <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addDrug()"></button>
                        </ng-template>
            </p-dialog>


            <p-dialog [(visible)]="drugEditDialog" [style]="{width: '650px'}" header="Drug Details" [modal]="true" styleClass="p-fluid">

              <ng-template pTemplate="content">
                  <div class="p-col-12 p-fluid p-formgrid p-grid">
                  <div class="p-col-12 p-field">
                      <label for="name">Name</label>
                      <input id="name" type="name" pInputText [(ngModel)]="selectedDrug.name">
                  </div>
                  <div class="p-col-6 p-field">
                      <label for="code">Code</label>
                      <input id="code" type="code" pInputText [(ngModel)]="selectedDrug.code">
                  </div>
                  <div class="p-col-6 p-field">
                      <label for="description"> Description </label>
                      <input id="description" type="description" pInputText [(ngModel)]="selectedDrug.description">
                  </div>
                  <div class="p-col-6 p-field">
                          <label for="created_by">Created_By</label>
                          <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedDrug.created_by">
                      </div>
                      <div class="p-col-6 p-field">
                          <label for="created_date">Created_Date</label>
                          <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedDrug.created_date">
                      </div>

                  </div>
                  </ng-template>

                  <ng-template pTemplate="footer">
                      <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideDrugEditDialog()"></button>
                      <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateDrug()"></button>
                  </ng-template>
                  </p-dialog>


                  <p-dialog [(visible)]="drugImportDialog" [style]="{width: '800px'}" header="Import Drug" [modal]="true" styleClass="p-fluid">

                      <ng-template pTemplate="content">
                                          <div class="p-col-12 p-fluid p-formgrid p-grid">

                                              <div class="card">

                                                  <div class="p-fluid p-formgrid p-grid">

                                                      <div class="p-field p-col-12 p-md-6">
                                                      <label for="import_realm"><b>Import Source / Url*</b></label>
                                                      <p-dropdown [options]="importsource" optionLabel="label" optionValue="value" placeholder="-Select-" [(ngModel)]="selectedImportSource"
                                                      [showTransitionOptions]="'0ms'" [hideTransitionOptions]="'0ms'" required
                                                      #importrealm="ngModel" [ngClass]="{'ng-dirty': (importrealm.invalid) || (importrealm.dirty && importrealm.invalid)}">
                                                      </p-dropdown>
                                                      <small *ngIf="(importrealm.invalid) || (importrealm.dirty && importrealm.invalid)" class="p-error">
                                                    Select to preview</small>
                                                      </div>


                                                      <div class="p-field p-col-12 p-md-6">
                                                          <label for="format">Supported import format</label>
                                                          <p-dropdown inputId="format" optionLabel="name" placeholder="JSON"></p-dropdown>
                                                      </div>
                                                  </div>


                                                  <div class="p-field p-col-12 p-md-12">
                                                      <button pButton pRipple label="Preview Import" class="p-mr-2 p-mb-2" (click)="previewImportData()"></button>
                                                  </div>


                                                  <div class="p-field p-col-12 p-md-12">
                                                      <p-table #dt [value]="drugdatafromlamis" [columns]="" [rows]="10" [paginator]="true" [globalFilterFields]="['itemId','description']"
                                                       [rowHover]="true" dataKey="itemId" [maximizable]="true"
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
                                                                 <th>Unique Name</th>
                                                                 <th>Pack Size </th>
                                                                 <th>Dose Form </th>
                                                                 <th>Frequncy (Morning) </th>
                                                                 <th>Frequncy (Afternoon) </th>
                                                                 <th>Frequncy (Evening) </th>
            
                                                   </tr>
                                                 </ng-template>
                                                 <ng-template pTemplate="body" let-drug>
                                                  <tr>
                                                  <td>{{drug.name}} - {{drug.strength}}</td>
                                                  <td>{{drug.packSize}}</td>
                                                  <td>{{drug.doseform}}</td>
                                                  <td>{{drug.morning}}</td>
                                                  <td>{{drug.afternoon}}</td>
                                                  <td>{{drug.evening}}</td>
                                                  
            
            
                                                  </tr>
                                                  </ng-template>

                                                     </p-table>
                                                  </div>

                                                  <div class="p-grid p-col-12 p-md-12">
                                                      <div class="p-field p-col-12 p-md-3">
                                                          <button pButton pRipple label="remove" class="p-mr-2 p-mb-2"></button>
                                                      </div>
                                                      <div class="p-field p-col-12 p-md-7">
                                                          <button pButton pRipple type="button" icon="pi pi-cloud-download" label="Import List" class="p-mr-2 p-mb-2" (click)="processMigration()"></button>
                                                      </div>
                                                  </div>

                                       </div>

                                       </div>

                                       <p-dialog [(visible)]="processdialog" [style]="{width: '850px'}" 
                               header="Migration Progress" [modal]="true" styleClass="p-fluid" [maximizable]="true">
                             <p-progressBar mode="indeterminate"></p-progressBar>
                              <p>{{msg_scope}}
                              <p-footer>
                            <div class="p-grid p-nogutter p-justify-end">
                           <p-button label="Save Result" icon="pi pi-save" iconPos="left"></p-button>
                           </div>
                        </p-footer>
                        </p-dialog>

                               </ng-template>

      </p-dialog>

      </div>
      </div>
      </p-tabPanel>

      

      <p-tabPanel header="Drug Frequency" leftIcon="fa fa-pills">

      <div class="p-grid">
  <div class="p-col-12">

      <div class="card">
          <p-toolbar styleClass="p-mb-4">
              <ng-template pTemplate="left">
                  <button pButton pRipple label="Add Dose Frequency" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddDoseFrequency()"></button>
                  <button pButton pRipple label="Delete Dose Frequency" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
              </ng-template>

              <ng-template pTemplate="right">
                  <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importDoseFrequency()">
                          </button>
                          <button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
              </ng-template>
          </p-toolbar>
          <p-table #dsfq [value]="doseFrequencyList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code','description']"
       [rowHover]="true" dataKey="id"
          styleClass="p-datatable-customers"
          currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

          <ng-template pTemplate="caption">
              <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                  <h5 class="p-m-0">Dose Frequency Listing</h5>
                  <span class="p-input-icon-left">
                  <i class="pi pi-search"></i>
                  <input pInputText type="text" (input)="dsfq.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
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
                  <th>Action </th>

              </tr>
          </ng-template>
          <ng-template pTemplate="body" let-DoseFrequency>
              <tr>
                  <td>
                      <p-tableCheckbox [value]="DoseFrequency"></p-tableCheckbox>
                  </td>

                  <td>
                      {{DoseFrequency.name}}
                  </td>
                  <td>
                      {{DoseFrequency.code}}
                  </td>
                  <td>
                      {{DoseFrequency.description}}
                  </td>

                  <td>
                      <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editDoseFrequency(DoseFrequency)"></button>
                      <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteProduct(product)"></button>
                  </td>
              </tr>
          </ng-template>
          <ng-template pTemplate="summary">
              <div class="p-d-flex p-ai-center p-jc-between">
                  In total there are {{doseFrequencyList ? doseFrequencyList.length : 0 }} Dose Frequency.
              </div>
          </ng-template>
      </p-table>

          </div>

          <p-dialog [(visible)]="doseFrequencyDialog" [style]="{width: '650px'}" header="New Dose Frequency" [modal]="true" styleClass="p-fluid">
              <ng-template pTemplate="content">
        <div  class="p-col-12 p-fluid p-formgrid p-grid">
           <div class="p-col-6 p-field">
                  <label for="name">Name</label>
                  <input  type="text" pInputText [(ngModel)]="doseFrequencycreatedata.name" aria-describedby="username-help"
                  placeholder="Enter name">

              </div>
         <div class="p-col-6 p-field">
                  <label for="code">Code</label>
                  <input id="code" type="code" pInputText [(ngModel)]="doseFrequencycreatedata.code" aria-describedby="password-help" placeholder="Enter code">

              </div>
        </div>

        <div class="p-grid p-formgrid p-fluid">
                  <div class="p-col-12 p-field">
                      <label for="description">Description</label>
                      <textarea rows="5" cols="30" placeholder="Description" pInputTextarea  [(ngModel)]="doseFrequencycreatedata.description" placeholder="Enter Description"></textarea>
                  </div>

              </div>


              </ng-template>
              <ng-template pTemplate="footer">
                            <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideDoseFrequencyDialog()"></button>
                            <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addDoseFrequency()"></button>
                        </ng-template>
            </p-dialog>


            <p-dialog [(visible)]="doseFrequencyEditDialog" [style]="{width: '650px'}" header="DoseFrequency Details" [modal]="true" styleClass="p-fluid">

              <ng-template pTemplate="content">
                  <div class="p-col-12 p-fluid p-formgrid p-grid">
                  <div class="p-col-12 p-field">
                      <label for="name">Name</label>
                      <input id="name" type="name" pInputText [(ngModel)]="selectedDoseFrequency.name">
                  </div>
                  <div class="p-col-6 p-field">
                      <label for="code">Code</label>
                      <input id="code" type="code" pInputText [(ngModel)]="selectedDoseFrequency.code">
                  </div>
                  <div class="p-col-6 p-field">
                      <label for="description"> Description </label>
                      <input id="description" type="description" pInputText [(ngModel)]="selectedDoseFrequency.description">
                  </div>
                  <div class="p-col-6 p-field">
                          <label for="created_by">Created_By</label>
                          <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedDoseFrequency.created_by">
                      </div>
                      <div class="p-col-6 p-field">
                          <label for="created_date">Created_Date</label>
                          <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedDoseFrequency.created_date">
                      </div>

                  </div>
                  </ng-template>

                  <ng-template pTemplate="footer">
                      <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideDoseFrequencyEditDialog()"></button>
                      <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateDoseFrequency()"></button>
                  </ng-template>
                  </p-dialog>


                  <p-dialog [(visible)]="doseFrequencyImportDialog" [style]="{width: '800px'}" header="Import DoseFrequency" [modal]="true" styleClass="p-fluid">

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

      <p-tabPanel header="Drug Units" leftIcon="fa fa-pills">
      <div class="p-grid">
  <div class="p-col-12">

      <div class="card">
          <p-toolbar styleClass="p-mb-4">
              <ng-template pTemplate="left">
                  <button pButton pRipple label="Add Unit" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddUnit()"></button>
                  <button pButton pRipple label="Delete Unit" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
              </ng-template>

              <ng-template pTemplate="right">
                  <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importUnit()">
                          </button>
                          <button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack1()"></button>
              </ng-template>
          </p-toolbar>
          <p-table #drgun [value]="unitList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code','description']"
       [rowHover]="true" dataKey="id"
          styleClass="p-datatable-customers"
          currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

          <ng-template pTemplate="caption">
              <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                  <h5 class="p-m-0">Unit Listing</h5>
                  <span class="p-input-icon-left">
                  <i class="pi pi-search"></i>
                  <input pInputText type="text" (input)="drgun.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
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
                  <th pSortableColumn="action">Action <p-sortIcon field="action"></p-sortIcon></th>

              </tr>
          </ng-template>
          <ng-template pTemplate="body" let-Unit>
              <tr>
                  <td>
                      <p-tableCheckbox [value]="Unit"></p-tableCheckbox>
                  </td>
                  <td>
                      {{Unit.name}}
                  </td>
                  <td>
                      {{Unit.code}}
                  </td>
                  <td>
                      {{Unit.description}}
                  </td>

                  <td>
                      <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editUnit(Unit)"></button>
                      <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteProduct(product)"></button>
                  </td>
              </tr>
          </ng-template>
          <ng-template pTemplate="summary">
              <div class="p-d-flex p-ai-center p-jc-between">
                  In total there are {{unitList ? unitList.length : 0 }} Unit.
              </div>
          </ng-template>
      </p-table>

          </div>

          <p-dialog [(visible)]="unitDialog" [style]="{width: '650px'}" header="New Unit" [modal]="true" styleClass="p-fluid">
              <ng-template pTemplate="content">
        <div  class="p-col-12 p-fluid p-formgrid p-grid">
           <div class="p-col-6 p-field">
                  <label for="name">Name</label>
                  <input  type="text" pInputText [(ngModel)]="unitcreatedata.name" aria-describedby="username-help"
                  placeholder="Enter name">

              </div>
         <div class="p-col-6 p-field">
                  <label for="code">Code</label>
                  <input id="code" type="code" pInputText [(ngModel)]="unitcreatedata.code" aria-describedby="password-help" placeholder="Enter code">

              </div>
        </div>

        <div class="p-grid p-formgrid p-fluid">
                  <div class="p-col-12 p-field">
                      <label for="description">Description</label>
                      <textarea rows="5" cols="30" placeholder="Description" pInputTextarea  [(ngModel)]="unitcreatedata.description" placeholder="Enter Description"></textarea>
                  </div>

              </div>


              </ng-template>
              <ng-template pTemplate="footer">
                            <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideUnitDialog()"></button>
                            <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addUnit()"></button>
                        </ng-template>
            </p-dialog>


            <p-dialog [(visible)]="unitEditDialog" [style]="{width: '650px'}" header="Unit Details" [modal]="true" styleClass="p-fluid">

              <ng-template pTemplate="content">
                  <div class="p-col-12 p-fluid p-formgrid p-grid">
                  <div class="p-col-12 p-field">
                      <label for="name">Name</label>
                      <input id="name" type="name" pInputText [(ngModel)]="selectedUnit.name">
                  </div>
                  <div class="p-col-6 p-field">
                      <label for="code">Code</label>
                      <input id="code" type="code" pInputText [(ngModel)]="selectedUnit.code">
                  </div>
                  <div class="p-col-6 p-field">
                      <label for="description"> Description </label>
                      <input id="description" type="description" pInputText [(ngModel)]="selectedUnit.description">
                  </div>
                  <div class="p-col-6 p-field">
                          <label for="created_by">Created_By</label>
                          <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedUnit.created_by">
                      </div>
                      <div class="p-col-6 p-field">
                          <label for="created_date">Created_Date</label>
                          <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedUnit.created_date">
                      </div>

                  </div>
                  </ng-template>

                  <ng-template pTemplate="footer">
                      <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideUnitEditDialog()"></button>
                      <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateUnit()"></button>
                  </ng-template>
                  </p-dialog>


                  <p-dialog [(visible)]="unitImportDialog" [style]="{width: '800px'}" header="Import Unit" [modal]="true" styleClass="p-fluid">

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
      <p-tabPanel header="Medication Line" leftIcon="fa fa-pills">
      <div class="p-grid">
     <div class="p-col-12">
   
         <div class="card">
             <p-toolbar styleClass="p-mb-4">
                 <ng-template pTemplate="left">
                     <button pButton pRipple label="Add Medication Line" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddMedLine()"></button>
                     <button pButton pRipple label="Delete" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedMedLine()" [disabled]="!selectedMedLine || !selectedMedLine.length"></button>
                 </ng-template>
   
                 <ng-template pTemplate="right">
                     <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importDrug()">
                             </button>
                             <button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
                 </ng-template>
             </p-toolbar>
             <p-table #mdl [value]="medLineList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code','description']"
          [rowHover]="true" dataKey="medicationline_id" [(selection)]="selectedMedLine"
             styleClass="p-datatable-customers"
             currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">
   
             <ng-template pTemplate="caption">
                 <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                     <h5 class="p-m-0">Medication Line Listing</h5>
                     <span class="p-input-icon-left">
                     <i class="pi pi-search"></i>
                     <input pInputText type="text" (input)="mdl.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
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
                     <th pSortableColumn="action">Action <p-sortIcon field="action"></p-sortIcon></th>
   
                 </tr>
             </ng-template>
             <ng-template pTemplate="body" let-medl>
                 <tr>
                     <td>
                         <p-tableCheckbox [value]="medl"></p-tableCheckbox>
                     </td>
   
                     <td>
                         {{medl.name}}
                     </td>
                     <td>
                         {{medl.code}}
                     </td>
                     <td>
                         {{medl.description}}
                     </td>
   
                     <td>
                         <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editMedLine(medl)"></button>
                         <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteMedLine(medl)"></button>
                     </td>
                 </tr>
             </ng-template>
             <ng-template pTemplate="summary">
                 <div class="p-d-flex p-ai-center p-jc-between">
                     In total there are {{medLineList ? medLineList.length : 0 }} medication lines.
                 </div>
             </ng-template>
         </p-table>
   
             </div>
   
             <p-dialog [(visible)]="medLineDialog" [style]="{width: '650px'}" header="New Medication Line" [modal]="true" styleClass="p-fluid">
                 <ng-template pTemplate="content">
           <div  class="p-col-12 p-fluid p-formgrid p-grid">
              <div class="p-col-6 p-field">
                     <label for="name">Name</label>
                     <input  type="text" pInputText [(ngModel)]="medlinedata.name" aria-describedby="username-help"
                     placeholder="Enter name">
   
                 </div>
            <div class="p-col-6 p-field">
                     <label for="code">Code</label>
                     <input id="code" type="code" pInputText [(ngModel)]="medlinedata.code" aria-describedby="password-help" placeholder="Enter code">
   
                 </div>
           </div>
   
           <div class="p-grid p-formgrid p-fluid">
                     <div class="p-col-12 p-field">
                         <label for="description">Description</label>
                         <textarea rows="5" cols="30" placeholder="Description" pInputTextarea  [(ngModel)]="medlinedata.description" placeholder="Enter Description"></textarea>
                     </div>
   
                 </div>
   
   
                 </ng-template>
                 <ng-template pTemplate="footer">
                               <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideMedLineDialog()"></button>
                               <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addMedLine()"></button>
                           </ng-template>
               </p-dialog>
   
   
               <p-dialog [(visible)]="medLineEditDialog" [style]="{width: '650px'}" header="Drug Details" [modal]="true" styleClass="p-fluid">
   
                 <ng-template pTemplate="content">
                     <div class="p-col-12 p-fluid p-formgrid p-grid">
                     <div class="p-col-12 p-field">
                         <label for="name">Name</label>
                         <input id="name" type="name" pInputText [(ngModel)]="selectedMedLine.name">
                     </div>
                     <div class="p-col-6 p-field">
                         <label for="code">Code</label>
                         <input id="code" type="code" pInputText [(ngModel)]="selectedMedLine.code">
                     </div>
                     <div class="p-col-6 p-field">
                         <label for="description"> Description </label>
                         <input id="description" type="description" pInputText [(ngModel)]="selectedMedLine.description">
                     </div>
                     <div class="p-col-6 p-field">
                             <label for="created_by">Created_By</label>
                             <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedMedLine.created_by">
                         </div>
                         <div class="p-col-6 p-field">
                             <label for="created_date">Created_Date</label>
                             <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedMedLine.created_date">
                         </div>
   
                     </div>
                     </ng-template>
   
                     <ng-template pTemplate="footer">
                         <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideMedEditDialog()"></button>
                         <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateMedLine()"></button>
                     </ng-template>
                     </p-dialog>
   
   
                     <p-dialog [(visible)]="drugImportDialog" [style]="{width: '800px'}" header="Import Drug" [modal]="true" styleClass="p-fluid">
   
                         <ng-template pTemplate="content">
                                             <div class="p-col-12 p-fluid p-formgrid p-grid">
   
                                                 <div class="card">
   
                                                     <div class="p-fluid p-formgrid p-grid">
   
                                                         <div class="p-field p-col-12 p-md-6">
                                                         <label for="import_realm"><b>Import Source / Url*</b></label>
                                                         <p-dropdown [options]="importsource" optionLabel="label" optionValue="value" placeholder="-Select-" [(ngModel)]="selectedImportSource"
                                                         [showTransitionOptions]="'0ms'" [hideTransitionOptions]="'0ms'" required
                                                         #importrealm="ngModel" [ngClass]="{'ng-dirty': (importrealm.invalid) || (importrealm.dirty && importrealm.invalid)}">
                                                         </p-dropdown>
                                                         <small *ngIf="(importrealm.invalid) || (importrealm.dirty && importrealm.invalid)" class="p-error">
                                                       Select to preview</small>
                                                         </div>
   
   
                                                         <div class="p-field p-col-12 p-md-6">
                                                             <label for="format">Supported import format</label>
                                                             <p-dropdown inputId="format" optionLabel="name" placeholder="JSON"></p-dropdown>
                                                         </div>
                                                     </div>
   
   
                                                     <div class="p-field p-col-12 p-md-12">
                                                         <button pButton pRipple label="Preview Import" class="p-mr-2 p-mb-2" (click)="previewImportData()"></button>
                                                     </div>
   
   
                                                     <div class="p-field p-col-12 p-md-12">
                                                         <p-table #dt [value]="drugdatafromlamis" [columns]="" [rows]="10" [paginator]="true" [globalFilterFields]="['itemId','description']"
                                                          [rowHover]="true" dataKey="itemId" [maximizable]="true"
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
                                                                    <th>Unique Name</th>
                                                                    <th>Pack Size </th>
                                                                    <th>Dose Form </th>
                                                                    <th>Frequncy (Morning) </th>
                                                                    <th>Frequncy (Afternoon) </th>
                                                                    <th>Frequncy (Evening) </th>
               
                                                      </tr>
                                                    </ng-template>
                                                    <ng-template pTemplate="body" let-drug>
                                                     <tr>
                                                     <td>{{drug.name}} - {{drug.strength}}</td>
                                                     <td>{{drug.packSize}}</td>
                                                     <td>{{drug.doseform}}</td>
                                                     <td>{{drug.morning}}</td>
                                                     <td>{{drug.afternoon}}</td>
                                                     <td>{{drug.evening}}</td>
                                                     
               
               
                                                     </tr>
                                                     </ng-template>
   
                                                        </p-table>
                                                     </div>
   
                                                     <div class="p-grid p-col-12 p-md-12">
                                                         <div class="p-field p-col-12 p-md-3">
                                                             <button pButton pRipple label="remove" class="p-mr-2 p-mb-2"></button>
                                                         </div>
                                                         <div class="p-field p-col-12 p-md-7">
                                                             <button pButton pRipple type="button" icon="pi pi-cloud-download" label="Import List" class="p-mr-2 p-mb-2" (click)="processMigration()"></button>
                                                         </div>
                                                     </div>
   
                                          </div>
   
                                          </div>
   
                                          <p-dialog [(visible)]="processdialog" [style]="{width: '850px'}" 
                                  header="Migration Progress" [modal]="true" styleClass="p-fluid" [maximizable]="true">
                                <p-progressBar mode="indeterminate"></p-progressBar>
                                 <p>{{msg_scope}}
                                 <p-footer>
                               <div class="p-grid p-nogutter p-justify-end">
                              <p-button label="Save Result" icon="pi pi-save" iconPos="left"></p-button>
                              </div>
                           </p-footer>
                           </p-dialog>
   
                                  </ng-template>
   
         </p-dialog>
   
         </div>
         </div>
         </p-tabPanel>
   <!-- Regimen Section -->
         <p-tabPanel header="Regimen Combo" leftIcon="fa fa-pills">
         <div class="p-grid">
        <div class="p-col-12">
      
            <div class="card">
                <p-toolbar styleClass="p-mb-4">
                    <ng-template pTemplate="left">
                        <button pButton pRipple label="Add Regimen" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddRegimen()"></button>
                        <button pButton pRipple label="Delete Regimen" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedRegimen()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
                    </ng-template>
      
                    <ng-template pTemplate="right">
                        <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importDrug()">
                                </button>
                                <button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
                    </ng-template>
                </p-toolbar>
                <p-table #reg [value]="regimenList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','dosage','freq']"
             [rowHover]="true" dataKey="regimencombo_id" [(selection)]="selectedRegimen"
                styleClass="p-datatable-customers"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">
      
                <ng-template pTemplate="caption">
                    <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                        <h5 class="p-m-0">Regimen Listing</h5>
                        <span class="p-input-icon-left">
                        <i class="pi pi-search"></i>
                        <input pInputText type="text" (input)="reg.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
                    </span>
                    </div>
                </ng-template>
                <ng-template pTemplate="header">
                    <tr>
                        <th style="width: 3rem">
                            <p-tableHeaderCheckbox></p-tableHeaderCheckbox>
                        </th>
                        <th pSortableColumn="name">Medication Line<p-sortIcon field="name"></p-sortIcon></th>
                        <th pSortableColumn="name">Regimen<p-sortIcon field="name"></p-sortIcon></th>
                        <th pSortableColumn="dosage">Dosage <p-sortIcon field="dosage"></p-sortIcon></th>
                        <th pSortableColumn="freq">Frequency <p-sortIcon field="freq"></p-sortIcon></th>
                        <th pSortableColumn="action">Action <p-sortIcon field="action"></p-sortIcon></th>
      
                    </tr>
                </ng-template>
                <ng-template pTemplate="body" let-reg>
                    <tr>
                        <td>
                            <p-tableCheckbox [value]="reg"></p-tableCheckbox>
                        </td>
                        <td>
                        {{reg.medicationline.name}}
                    </td>
                        <td>
                            {{reg.name}}
                        </td>
                        <td>
                            {{reg.dosage}}
                        </td>
                        <td>
                            {{reg.drugUsageFrequency.name}}
                        </td>
      
                        <td>
                            <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editRegimen(reg)"></button>
                            <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteRegimen(reg)"></button>
                        </td>
                    </tr>
                </ng-template>
                <ng-template pTemplate="summary">
                    <div class="p-d-flex p-ai-center p-jc-between">
                        In total there are {{regimenList ? regimenList.length : 0 }} regimen.
                    </div>
                </ng-template>
            </p-table>
      
                </div>
      
                <p-dialog [(visible)]="regimenDialog" [maximizable]="true"
                header="New Regimen Combination" [modal]="true" styleClass="p-fluid">
                    <ng-template pTemplate="content">
              <div  class="p-col-12 p-fluid p-formgrid p-grid">
              <div class="p-field p-col-12">
        <label for="med_line"><b>Medication Line</b></label>
        <p-dropdown inputId="med_line" [options]="medLineList" [(ngModel)]="selectedMedLine.medicationline_id"
        [filter]="true" filterBy="name" optionLabel="name" optionValue="medicationline_id" placeholder="Choose a medication line"></p-dropdown>
        </div>
        <div class="p-grid p-ai-end vertical-container p-col-12">
        <div class="p-field p-col-6">
        <label for="drug_id"><b>Drug</b></label>
        <p-dropdown inputId="drug_id" [options]="drugMap" [(ngModel)]="selectedDropDownDrug" (onChange)="drugCombo()"
        [filter]="true" filterBy="name" optionLabel="name" placeholder="Choose a drug"></p-dropdown>
        
        </div>

        <div class="p-field p-col-1">
        
        <button pButton pRipple label="+"  (click)="addPipe('plus')" class="p-button-text"></button>
        </div>
        <div class="p-field p-col-1">
        <button pButton pRipple label="|"  (click)="addPipe('bar')" class="p-button-text"></button>
        </div>
        </div>
                 
      
              
                        <div class="p-col-12 p-field">
                            <label for="regimencombo">Regimen Combination</label>
                            <textarea rows="3" cols="30" placeholder="Regimen Combination" pInputTextarea  [(ngModel)]="regimencreatedata.name" 
                            placeholder="Regimen combination displayed here..."></textarea>
                        </div>
      
                    

                    <div class="p-col-8 p-field">
                    <label for="dosage">Dosage</label>
                    <input id="dosage"  pInputText [(ngModel)]="regimencreatedata.dosage" aria-describedby="password-help" placeholder="Enter dosage">
  
                </div>

                <div class="p-field p-col-4">
        <label for="drug_freq"><b>Drug Frequency</b></label>
        <p-dropdown inputId="drug_freq" [options]="doseFrequencyList" [(ngModel)]="selectedDoseFrequency.drug_frequency_id"
        [filter]="true" filterBy="name" optionLabel="name" optionValue="drug_frequency_id" placeholder="Choose a drug frequency"></p-dropdown>
        </div>

      </div>
      
                    </ng-template>
                    <ng-template pTemplate="footer">
                                  <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideRegimenComboDialog()"></button>
                                  <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addRegimenCombo()"></button>
                              </ng-template>
                  </p-dialog>
      
      
                  
      
                        <p-dialog [(visible)]="drugImportDialog" [style]="{width: '800px'}" header="Import Drug" [modal]="true" styleClass="p-fluid">
      
                            <ng-template pTemplate="content">
                                                <div class="p-col-12 p-fluid p-formgrid p-grid">
      
                                                    <div class="card">
      
                                                        <div class="p-fluid p-formgrid p-grid">
      
                                                            <div class="p-field p-col-12 p-md-6">
                                                            <label for="import_realm"><b>Import Source / Url*</b></label>
                                                            <p-dropdown [options]="importsource" optionLabel="label" optionValue="value" placeholder="-Select-" [(ngModel)]="selectedImportSource"
                                                            [showTransitionOptions]="'0ms'" [hideTransitionOptions]="'0ms'" required
                                                            #importrealm="ngModel" [ngClass]="{'ng-dirty': (importrealm.invalid) || (importrealm.dirty && importrealm.invalid)}">
                                                            </p-dropdown>
                                                            <small *ngIf="(importrealm.invalid) || (importrealm.dirty && importrealm.invalid)" class="p-error">
                                                          Select to preview</small>
                                                            </div>
      
      
                                                            <div class="p-field p-col-12 p-md-6">
                                                                <label for="format">Supported import format</label>
                                                                <p-dropdown inputId="format" optionLabel="name" placeholder="JSON"></p-dropdown>
                                                            </div>
                                                        </div>
      
      
                                                        <div class="p-field p-col-12 p-md-12">
                                                            <button pButton pRipple label="Preview Import" class="p-mr-2 p-mb-2" (click)="previewImportData()"></button>
                                                        </div>
      
      
                                                        <div class="p-field p-col-12 p-md-12">
                                                            <p-table #dt [value]="drugdatafromlamis" [columns]="" [rows]="10" [paginator]="true" [globalFilterFields]="['itemId','description']"
                                                             [rowHover]="true" dataKey="itemId" [maximizable]="true"
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
                                                                       <th>Unique Name</th>
                                                                       <th>Pack Size </th>
                                                                       <th>Dose Form </th>
                                                                       <th>Frequncy (Morning) </th>
                                                                       <th>Frequncy (Afternoon) </th>
                                                                       <th>Frequncy (Evening) </th>
                  
                                                         </tr>
                                                       </ng-template>
                                                       <ng-template pTemplate="body" let-drug>
                                                        <tr>
                                                        <td>{{drug.name}} - {{drug.strength}}</td>
                                                        <td>{{drug.packSize}}</td>
                                                        <td>{{drug.doseform}}</td>
                                                        <td>{{drug.morning}}</td>
                                                        <td>{{drug.afternoon}}</td>
                                                        <td>{{drug.evening}}</td>
                                                        
                  
                  
                                                        </tr>
                                                        </ng-template>
      
                                                           </p-table>
                                                        </div>
      
                                                        <div class="p-grid p-col-12 p-md-12">
                                                            <div class="p-field p-col-12 p-md-3">
                                                                <button pButton pRipple label="remove" class="p-mr-2 p-mb-2"></button>
                                                            </div>
                                                            <div class="p-field p-col-12 p-md-7">
                                                                <button pButton pRipple type="button" icon="pi pi-cloud-download" label="Import List" class="p-mr-2 p-mb-2" (click)="processMigration()"></button>
                                                            </div>
                                                        </div>
      
                                             </div>
      
                                             </div>
      
                                             <p-dialog [(visible)]="processdialog" [style]="{width: '850px'}" 
                                     header="Migration Progress" [modal]="true" styleClass="p-fluid" [maximizable]="true">
                                   <p-progressBar mode="indeterminate"></p-progressBar>
                                    <p>{{msg_scope}}
                                    <p-footer>
                                  <div class="p-grid p-nogutter p-justify-end">
                                 <p-button label="Save Result" icon="pi pi-save" iconPos="left"></p-button>
                                 </div>
                              </p-footer>
                              </p-dialog>
      
                                     </ng-template>
      
            </p-dialog>
      
            </div>
            </div>
            </p-tabPanel>
      
   
      </p-tabView>
`,
  styleUrls: ['./druglist.component.scss'],
  providers: [MessageService]
})
export class DruglistComponent implements OnInit {

  drugcreatedata = {} as DrugData;
  doseFrequencycreatedata = {} as DoseFrequencyData;
  unitcreatedata = {} as UnitData;
  medlinedata = {} as MedicationLine;
  regimencreatedata = {} as RegimenCombo;

 

  drugList:any;
  selectedDrug: DrugData;
  selectedDropDownDrug = {} as DrugData;
  drugMap: DrugData[];
  drugDialog: boolean;
  drugEditDialog: boolean;
  drugImportDialog: boolean;

  medLineList:any;
  selectedMedLine = {} as any;
  medLineDialog: boolean;
  medLineEditDialog: boolean;
  medListImportDialog: boolean;
  medlinedatas : MedicationLine[];

  regimenList:any;
  selectedRegimen: any;
  regimenDialog: boolean;
  regimenEditDialog: boolean;
  
  

  doseFrequencyList:DoseFrequencyData[];
  selectedDoseFrequency = {} as DoseFrequencyData;
  doseFrequencyDialog: boolean;
  doseFrequencyEditDialog: boolean;
  doseFrequencyImportDialog: boolean;

  unitList:any;
  selectedUnit: UnitData;
  unitDialog: boolean;
  unitEditDialog: boolean;
  unitImportDialog: boolean;

  activeindex: number = 0;

  drugdatafromlamis: any[];
  disabled = true;
  importsource: any[];
  selectedImportSource: any;


  constructor(private router: Router,private messageService: MessageService, private route:ActivatedRoute, private location: Location,
    private manageDrugService:ManageDrugService, private breadcrumbService: AppBreadcrumbService) {

     this.breadcrumbService.setItems([
     { label: 'Dashboard', routerLink: ['/dashboard'] },
     { label: 'Metadata', routerLink: ['/metadatalist'] },
     { label: 'List Drug', routerLink: ['/druglist'] }    ]);
 }

 ngOnInit(): void {
   if(sessionStorage.getItem('username') == null){
     this.addError("Session Expired.","Your current session has expired. Re-login.");
     this.router.navigate(['']);
   } 
   this.DrugList();
   this.DoseFrequencyList();
   this.UnitList();
   this.MedicationLineList();
   this.RegimenComboList();

   this.activeindex = parseInt(this.route.snapshot.paramMap.get('index'));

   this.importsource = [
    {
      label: 'LAMIS', value: 'LAMIS'
    },
    {
      label: 'DMEL', value: 'DMEL'
    },
  ]

 }

 drugCombo(){
  /*   if(this.regimencreatedata.name.indexOf('|') == 0 && this.regimencreatedata.name.indexOf('+') == 0 ){
     this.regimencreatedata.name = this.selectedDropDownDrug.name;
     }*/
     if(!this.regimencreatedata.name){
        this.regimencreatedata.name = this.selectedDropDownDrug.name;
     }
     else{
        this.regimencreatedata.name += this.selectedDropDownDrug.name;
     }
 }
 addPipe(chartype){
if(chartype == 'plus'){
    this.regimencreatedata.name = this.regimencreatedata.name + ' + '
}
if(chartype == 'bar'){
    this.regimencreatedata.name = this.regimencreatedata.name + ' | '
}
 }
 addDrug(){
  this.drugcreatedata.createdBy = +sessionStorage.getItem("userid");
  this.drugcreatedata.created_date = Date.now ();
  this.manageDrugService.createDrug(this.drugcreatedata).subscribe(
    data => {
      this.addSuccess("Success!","Drug added successfully.");
  },
  error => {
  this.addError("Failed!","Could not add Drug.");
  }

  );
  }

  addMedLine(){
      
    this.medlinedata.created_by = +sessionStorage.getItem("userid");
    this.medlinedata.created_date = new Date();
    this.medlinedatas = [];
    this.medlinedatas.push(this.medlinedata);
    this.medlinedata = {} as MedicationLine;
    this.manageDrugService.createMedicationLine(this.medlinedatas).subscribe(
      data => {
        this.addSuccess("Success!","Medication Line added successfully.");
        this.MedicationLineList();
    },
    error => {
    this.addError("Failed!","Could not add Medication Line.");
    }
  
    );
    }

    addRegimenCombo(){
    this.regimencreatedata.created_by = +sessionStorage.getItem("userid");
    this.regimencreatedata.created_date = new Date();
    this.regimencreatedata.medicationline_id = this.selectedMedLine.medicationline_id;
    this.regimencreatedata.drug_frequency_id = this.selectedDoseFrequency.drug_frequency_id
    this.manageDrugService.createRegimenCombo([this.regimencreatedata]).subscribe(
      data => {
        this.addSuccess("Success!","Regimen Combo added successfully.");
        this.RegimenComboList();
    },
    error => {
    this.addError("Failed!","Could not add Regimen Combo.");
    }
  
    );
    }
    
  DrugList():void{
    this.manageDrugService.getDrugs().subscribe(data => {
      this.drugList = data;
      this.drugMap = data;
      
    }
    );
    }

    goToAddDrug(drug: DrugData){
      this.router.navigate(['addDrug']);
      this.drugDialog=true;
    }

    goToAddMedLine(medlist: MedicationLine){
       // this.router.navigate(['addDrug']);
        this.medLineDialog=true;
      }
      goToAddRegimen(){
        this.regimencreatedata = {} as RegimenCombo; 
        this.regimenDialog=true;
      }


    importDrug(){
      this.router.navigate(['importDrug']);
      this.drugImportDialog=true;
    }

  goBack(){
    this.location.back();
    }

    editMedLine(medline: MedicationLine){
        this.selectedMedLine = {...medline};
        this.medLineEditDialog=true;
       }

    editDrug(drug: DrugData){
      this.selectedDrug = {...drug};
      this.drugEditDialog=true;
     }

     editRegimen(regimen: RegimenCombo){
        // this.selectedRegimen={...regimen};
        this.selectedMedLine.medicationline_id = regimen.medicationline_id;
        this.selectedDoseFrequency.drug_frequency_id = regimen.drug_frequency_id;
         this.regimencreatedata = {...regimen};
         this.regimenDialog = true;
     }

     updateMedLine(){
        this.manageDrugService.createMedicationLine([this.selectedMedLine]).subscribe(
          () => {
            this.addSuccess("Success!","Medication line information updated successfully.");
                this.MedicationLineList();
         },
         () => {
         this.addError("Failed!","Medication line creation failed.");
         this.medLineDialog = false;
       });
      }

     updateDrug(){
      this.manageDrugService.createDrug(this.selectedDrug).subscribe(
        () => {
          this.addSuccess("Success!","Drug information updated successfully.");

       },
       () => {
       this.addError("Failed!","Drug creation failed.");
       this.drugDialog = false;
     });
    }



    hideDrugDialog(){
      this.drugDialog = false;
    }

    hideDrugEditDialog(){
      this.drugEditDialog = false;
    }

    hideDrugImportDialog(){
        this.drugImportDialog = false;
      }

    //Drug Import 


    previewImportData(){
       
       this.manageDrugService.getImportData('drug')
        .subscribe(p=> {this.drugdatafromlamis=p
            if(this.drugdatafromlamis.length > 0){
          this.disabled = false;
        }
    })
    
      }
    
      processMigration(){
        this.processDrugRegistrationMigration();
     
     //Posting registration data
     if(this.drugdata){
       console.log("Got here as "+JSON.stringify(this.drugdata));
        this.manageDrugService.createDrug(this.drugdata)
             .subscribe(
             data => {
               this.addSuccess("Success","New client added successfully.");
               },
             error => {
             this.addError("Unsuccessful.","Failed to add new client. "+error.message);
                 console.error(error);
             });
           }
     
       }
    
       drugdata: DrugData[];
      
      _drugdata = {} as any;
      processdialog: boolean = false;
      msg_scope: string;
      count: number=0;
    
      processDrugRegistrationMigration(){
        console.log("Migrating clinical registration...");
        this.msg_scope = "Migrating clinical registration...";
        this.drugdata = [];
        if(this.drugdatafromlamis.length > 0){
         this.processdialog = true;
          this.drugdatafromlamis.forEach(t => {
    
            //fetching personal data from lamis endpoint
    
            this._drugdata.itemId = t.itemId;

            this._drugdata.name = t.name;
            this._drugdata.description = t.name;
            this._drugdata.code = t.name.substring(0,4) as string + this._drugdata.itemId as string
            this._drugdata.created_by = +sessionStorage.getItem("userid");
            this._drugdata.created_date = Date.now();
            console.log("code " + t.name.substring(0,4) + t.itemId);
            //console.log();
            
            
            this.drugdata.push(this._drugdata);
            this._drugdata = {} as any;
    
            //fetching next of kin from lamis endpoint
            
            this.count = this.count+1;
          })
        //  console.log(JSON.stringify(this.personaldata));
          
    
        }
        this.msg_scope="\nCompleted migrating scope "+this.count;
        setTimeout(() => {
          this.msg_scope="\nSending scope to back end for processing...";
        },5000)
    
      }
    


    // Drug Frequency Methods....

    addDoseFrequency(){
      this.doseFrequencycreatedata.created_by = +sessionStorage.getItem("userid");
      this.doseFrequencycreatedata.created_date = new Date ();
      this.manageDrugService.createDoseFrequency(this.doseFrequencycreatedata).subscribe(
        data => {
          this.addSuccess("Success!","Dose Frequency added successfully.");
      },
      error => {
      this.addError("Failed!","Could not add Dose Frequency.");
      }

      );
      }

      DoseFrequencyList():void{
        this.manageDrugService.getDoseFrequencys().subscribe(data => {
          this.doseFrequencyList = data;
         
        }
        );
        }

        goToAddDoseFrequency(doseFrequency: DoseFrequencyData){
          this.router.navigate(['addDoseFrequency']);
          this.doseFrequencyDialog=true;
        }


        importDoseFrequency(doseFrequency: DoseFrequencyData){
          this.router.navigate(['importDoseFrequency']);
          this.doseFrequencyImportDialog=true;
        }



        editDoseFrequency(doseFrequency: DoseFrequencyData){
          this.selectedDoseFrequency = {...doseFrequency};
          this.doseFrequencyEditDialog=true;
         }

         updateDoseFrequency(){
          this.manageDrugService.createDoseFrequency(this.selectedDoseFrequency).subscribe(
            () => {
              this.addSuccess("Success!","Dose Frequency information updated successfully.");

           },
           () => {
           this.addError("Failed!","Dose Frequency creation failed.");
           this.doseFrequencyDialog = false;
         });
        }

        hideDoseFrequencyDialog(){
          this.doseFrequencyDialog = false;
        }

        hideDoseFrequencyEditDialog(){
          this.doseFrequencyEditDialog = false;
        }


    // Units Methods...
    addUnit(){
      this.unitcreatedata.created_by = +sessionStorage.getItem("userid");
      this.unitcreatedata.created_date = new Date ();
      this.manageDrugService.createUnit(this.unitcreatedata).subscribe(
        data => {
          this.addSuccess("Success!","Unit added successfully.");
      },
      error => {
      this.addError("Failed!","Could not add Unit.");
      }

      );
      }

      UnitList():void{
        this.manageDrugService.getUnits().subscribe(data => {
          this.unitList = data;
          
        }
        );
        }

        MedicationLineList():void{
            this.manageDrugService.getMedicationLine().subscribe(data => {
              this.medLineList = data;
              
            }
            );
            }

            RegimenComboList():void{
                this.manageDrugService.getRegimenCombo().subscribe(data => {
                  this.regimenList = data;
                  
                }
                );
                }
        goToAddUnit(unit: UnitData){
          this.router.navigate(['addUnit']);
          this.unitDialog=true;
        }


        importUnit(unit: UnitData){
          this.router.navigate(['importUnit']);
          this.unitImportDialog=true;
        }

      goBack1(){
        this.location.back();
        }

        editUnit(unit: UnitData){
          this.selectedUnit = {...unit};
          this.unitEditDialog=true;
         }

         updateUnit(){
          this.manageDrugService.createUnit(this.selectedUnit).subscribe(
            () => {
              this.addSuccess("Success!","Unit information updated successfully.");

           },
           () => {
           this.addError("Failed!","Unit creation failed.");
           this.unitDialog = false;
         });
        }

        hideUnitDialog(){
          this.unitDialog = false;
        }

        hideUnitEditDialog(){
          this.unitEditDialog = false;
        }






    //Error Exceptions
    addSuccess(title:string,message:string) {
      this.messageService.add({severity:'success', summary:title, detail:message});


    }
    addError(title:string,message:string) {
      this.messageService.add({severity:'error', summary:title, detail:message});

    }

}
