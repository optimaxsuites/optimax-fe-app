import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { AllergiesData,AllergensData, SeverityData, PriorityData } from '../domain/allergies.data';
import {ManageAllergiesService} from '../service/manage.allergies.service';
import { Location } from '@angular/common';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import {MessageService,Message} from 'primeng/api';

@Component({
  selector: 'app-allergieslist',
  template: `<p-toast position="top-center"></p-toast>
  <p-tabView [(activeIndex)]="activeindex">
  <p-tabPanel header="Allergies" leftIcon="fa fa-pills">

<div class="p-grid">
<div class="p-col-12">

  <div class="card">
<p-toolbar styleClass="p-mb-4">
  <ng-template pTemplate="left">
    <button pButton pRipple label="Add Allergies" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddAllergies(allergies)"></button>
    <button pButton pRipple label="Delete Allergies" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
  </ng-template>

  <ng-template pTemplate="right">
          <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importAllergies(allergies)">
                  </button>
    <button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
  </ng-template>
      </p-toolbar>
      <p-table #alrg [value]="allergiesList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code','description']"
   [rowHover]="true" dataKey="allergy_id" [(selection)]="selectedAllergies"
      styleClass="p-datatable-customers"
      currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

      <ng-template pTemplate="caption">
          <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
              <h5 class="p-m-0">Allergies Listing</h5>
              <span class="p-input-icon-left">
              <i class="pi pi-search"></i>
              <input pInputText type="text" (input)="alrg.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
          </span>
          </div>
      </ng-template>
      <ng-template pTemplate="header">
          <tr>
              <th style="width: 3rem">
                  <p-tableHeaderCheckbox></p-tableHeaderCheckbox>
              </th>
               <th pSortableColumn="name"> Name<p-sortIcon field="name"></p-sortIcon></th>
              <th pSortableColumn="code "> Code <p-sortIcon field="code"></p-sortIcon></th>
              <th pSortableColumn="description">  Description <p-sortIcon field="description"></p-sortIcon></th>

              <th>Action</th>
          </tr>
      </ng-template>
      <ng-template pTemplate="body" let-allergies>
          <tr>
              <td>
                  <p-tableCheckbox [value]="allergies"></p-tableCheckbox>
              </td>

              <td><span class="p-column-title"></span>
                  {{allergies.name}}
              </td>
              <td><span class="p-column-title"></span>
                  {{allergies.code}}
              </td>
              <td><span class="p-column-title"></span>
                  {{allergies.description}}
              </td>

              <td>
                  <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editAllergies(allergies)"></button>
                  <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteAllergies(allergies)"></button>
              </td>
          </tr>
      </ng-template>
      <ng-template pTemplate="summary">
          <div class="p-d-flex p-ai-center p-jc-between">
              In total there are {{allergiesList ? allergiesList.length : 0 }} allergies.
          </div>
      </ng-template>
  </p-table>
      </div>

      <p-dialog [(visible)]="allergiesDialog" [style]="{width: '650px'}" header="New Allergy" [modal]="true" styleClass="p-fluid">
          <ng-template pTemplate="content">
    <div class="p-grid p-formgrid p-fluid">

      <div class="p-col-6 p-field">
          <label for="name">Allergy Name</label>
          <input id="name" type="name" pInputText [(ngModel)]="allergiescreatedata.name" aria-describedby="name-help"
          placeholder="Allergy Name">

      </div>

      <div class="p-col-6 p-field">
          <label for="code">Code </label>
          <input id="code" type="code" pInputText [(ngModel)]="allergiescreatedata.code" aria-describedby="code-help"
          placeholder="Allergy Code" required>
      </div>

      <div class="p-col-12 p-field">
          <label for="description">Allergy Description </label>
          <textarea rows="5" cols="30" placeholder="Allergies Description" [(ngModel)]="allergiescreatedata.description" pInputTextarea ></textarea>
      </div>


  </div>



          </ng-template>
          <ng-template pTemplate="footer">
                        <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideAllergiesDialog()"></button>
                        <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addAllergies()"></button>
                    </ng-template>
        </p-dialog>

      <p-dialog [(visible)]="allergiesEditDialog" [style]="{width: '650px'}" header="Allergies Details" [modal]="true" styleClass="p-fluid">

          <ng-template pTemplate="content">
              <div class="p-col-12 p-fluid p-formgrid p-grid">
              <div class="p-col-12 p-field">
                  <label for="name">Name</label>
                  <input id="name" type="name" pInputText [(ngModel)]="selectedAllergies.name">
              </div>
              <div class="p-col-6 p-field">
                  <label for="code">Code</label>
                  <input id="code" type="code" pInputText [(ngModel)]="selectedAllergies.code">
              </div>
              <div class="p-col-6 p-field">
                  <label for="description"> Description </label>
                  <input id="description" type="description" pInputText [(ngModel)]="selectedAllergies.description">
              </div>
              <div class="p-col-6 p-field">
                      <label for="created_by">Created_By</label>
                      <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedAllergies.created_by">
                  </div>
                  <div class="p-col-6 p-field">
                      <label for="created_date">Created_Date</label>
                      <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedAllergies.created_date" >
                  </div>

              </div>
              </ng-template>


              <ng-template pTemplate="footer">
                  <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideAllergiesEditDialog()"></button>
                  <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateAllergies()"></button>
              </ng-template>
              </p-dialog>

              <p-dialog [(visible)]="allergiesImportDialog" [style]="{width: '800px'}" header="Import Allergies" [modal]="true" styleClass="p-fluid">

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
<p-tabPanel header="Allergens" leftIcon="fa fa-frown">

<div class="p-grid">
  <div class="p-col-12">

      <div class="card">
          <p-toolbar styleClass="p-mb-4">
              <ng-template pTemplate="left">
                  <button pButton pRipple label="Add Allergens" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddAllergens(allergens)"></button>
                  <button pButton pRipple label="Delete Allergens" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
              </ng-template>

              <ng-template pTemplate="right">
                  <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importAllergens(allergens)"></button>
                  <button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
              </ng-template>
          </p-toolbar>
          <p-table #alrgn [value]="allergensList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code']"
       [rowHover]="true" dataKey="allergen_id" [(selection)]="selectedAllergens"
          styleClass="p-datatable-customers"
          currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

          <ng-template pTemplate="caption">
              <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                  <h5 class="p-m-0">Allergens Listing</h5>
                  <span class="p-input-icon-left">
                  <i class="pi pi-search"></i>
                  <input pInputText type="text" (input)="alrgn.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
              </span>
              </div>
          </ng-template>
          <ng-template pTemplate="header">
              <tr>
                  <th style="width: 3rem">
                      <p-tableHeaderCheckbox></p-tableHeaderCheckbox>
                  </th>
                     <th pSortableColumn="name"> Name<p-sortIcon field="name"></p-sortIcon></th>
                  <th pSortableColumn="code "> Code <p-sortIcon field="code"></p-sortIcon></th>
                  <th pSortableColumn="description">  Description <p-sortIcon field="description"></p-sortIcon></th>

                  <th>Action</th>
              </tr>
          </ng-template>
          <ng-template pTemplate="body" let-allergens>
              <tr>
                  <td>
                      <p-tableCheckbox [value]="allergens"></p-tableCheckbox>
                  </td>

                  <td><span class="p-column-title"></span>
                      {{allergens.name}}
                  </td>
                  <td><span class="p-column-title"></span>
                      {{allergens.code}}
                  </td>
                  <td><span class="p-column-title"></span>
                      {{allergens.description}}
                  </td>

                  <td>
                      <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editAllergens(allergens)"></button>
                      <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteAllergens(allergens)"></button>
                  </td>
              </tr>
          </ng-template>
          <ng-template pTemplate="summary">
              <div class="p-d-flex p-ai-center p-jc-between">
                  In total there are {{allergensList ? allergensList.length : 0 }} Allergens.
              </div>
          </ng-template>
      </p-table>
          </div>

          <p-dialog [(visible)]="allergensDialog" [style]="{width: '650px'}" header="New Allergens" [modal]="true" styleClass="p-fluid">
              <ng-template pTemplate="content">
                  <div class="p-grid p-formgrid p-fluid">

                      <div class="p-col-6 p-field">
                          <label for="name">Allergens Name</label>
                          <input id="name" type="name" pInputText [(ngModel)]="allergenscreatedata.name" aria-describedby="name-help"
                          placeholder="Allergens Name">

                      </div>

                      <div class="p-col-6 p-field">
                          <label for="code">Code </label>
                          <input id="code" type="code" pInputText [(ngModel)]="allergenscreatedata.code" aria-describedby="code-help"
                          placeholder="Allergens Code" required>
                      </div>

                      <div class="p-col-12 p-field">
                          <label for="description">Allergens Description </label>
                          <textarea rows="5" cols="30" placeholder="Allergens Description" [(ngModel)]="allergenscreatedata.description" pInputTextarea ></textarea>
                      </div>


                  </div>


              </ng-template>
              <ng-template pTemplate="footer">
                            <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideAllergensDialog()"></button>
                            <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addAllergens()"></button>
                        </ng-template>
            </p-dialog>

          <p-dialog [(visible)]="allergensEditDialog" [style]="{width: '650px'}" header="Allergens Details" [modal]="true" styleClass="p-fluid">

              <ng-template pTemplate="content">
                  <div class="p-col-12 p-fluid p-formgrid p-grid">
                  <div class="p-col-12 p-field">
                      <label for="name">Name</label>
                      <input id="name" type="name" pInputText [(ngModel)]="selectedAllergens.name">
                  </div>
                  <div class="p-col-6 p-field">
                      <label for="code">Code</label>
                      <input id="code" type="code" pInputText [(ngModel)]="selectedAllergens.code">
                  </div>
                  <div class="p-col-6 p-field">
                      <label for="description"> Description </label>
                      <input id="description" type="description" pInputText [(ngModel)]="selectedAllergens.description">
                  </div>
                  <div class="p-col-6 p-field">
                          <label for="created_by">Created_By</label>
                          <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedAllergens.created_by">
                      </div>
                      <div class="p-col-6 p-field">
                          <label for="created_date">Created_Date</label>
                          <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedAllergens.created_date">
                      </div>

                  </div>
                  </ng-template>



                  <ng-template pTemplate="footer">
                      <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideAllergensEditDialog()"></button>
                      <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateAllergens()"></button>
                  </ng-template>
                  </p-dialog>


                  <p-dialog [(visible)]="allergensImportDialog" [style]="{width: '800px'}" header="Import Allergens" [modal]="true" styleClass="p-fluid">

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

<p-tabPanel header="Severity" >

<div class="p-grid">
  <div class="p-col-12">

      <div class="card">
          <p-toolbar styleClass="p-mb-4">
              <ng-template pTemplate="left">
                  <button pButton pRipple label="Add Severity" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddSeverity(severity)"></button>
                  <button pButton pRipple label="Delete Severity" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
              </ng-template>

              <ng-template pTemplate="right">
                  <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importSeverity(severity)"></button>
                  <button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
              </ng-template>
          </p-toolbar>
          <p-table #svr [value]="severityList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code', 'description']"
       [rowHover]="true" dataKey="severity_id" [(selection)]="selectedSeverity"
          styleClass="p-datatable-customers"
          currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

          <ng-template pTemplate="caption">
              <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                  <h5 class="p-m-0">Severity Listing</h5>
                  <span class="p-input-icon-left">
                  <i class="pi pi-search"></i>
                  <input pInputText type="text" (input)="svr.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
              </span>
              </div>
          </ng-template>
          <ng-template pTemplate="header">
              <tr>
                  <th style="width: 3rem">
                      <p-tableHeaderCheckbox></p-tableHeaderCheckbox>
                  </th>
                  <th pSortableColumn="name"> Name<p-sortIcon field="name"></p-sortIcon></th>
                  <th pSortableColumn="code "> Code <p-sortIcon field="code"></p-sortIcon></th>
                  <th pSortableColumn="description">  Description <p-sortIcon field="description"></p-sortIcon></th>

                  <th>Action</th>
              </tr>
          </ng-template>
          <ng-template pTemplate="body" let-severity>
              <tr>
                  <td>
                      <p-tableCheckbox [value]="severity"></p-tableCheckbox>
                  </td>

                  <td><span class="p-column-title"></span>
                      {{severity.name}}
                  </td>
                  <td><span class="p-column-title"></span>
                      {{severity.code}}
                  </td>
                  <td><span class="p-column-title"></span>
                      {{severity.description}}
                  </td>

                  <td>
                      <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editSeverity(severity)"></button>
                      <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteSeverity(severity)"></button>
                  </td>
              </tr>
          </ng-template>
          <ng-template pTemplate="summary">
              <div class="p-d-flex p-ai-center p-jc-between">
                  In total there are {{severityList ? severityList.length : 0 }} Severity.
              </div>
          </ng-template>
      </p-table>
          </div>

          <p-dialog [(visible)]="severityDialog" [style]="{width: '650px'}" header="New Severity" [modal]="true" styleClass="p-fluid">
              <ng-template pTemplate="content">
                  <div class="p-grid p-formgrid p-fluid">

                      <div class="p-col-6 p-field">
                          <label for="name">Severity Name</label>
                          <input id="name" type="name" pInputText [(ngModel)]="severitycreatedata.name" aria-describedby="name-help"
                          placeholder="Severity Name">

                      </div>

                      <div class="p-col-6 p-field">
                          <label for="code">Code </label>
                          <input id="code" type="code" pInputText [(ngModel)]="severitycreatedata.code" aria-describedby="code-help"
                          placeholder="Severity Code" required>
                      </div>

                      <div class="p-col-12 p-field">
                          <label for="description">Severity Description </label>
                          <textarea rows="5" cols="30" placeholder="Severity Description" [(ngModel)]="severitycreatedata.description" pInputTextarea ></textarea>
                      </div>


                  </div>


              </ng-template>
              <ng-template pTemplate="footer">
                            <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideSeverityDialog()"></button>
                            <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addSeverity()"></button>
                        </ng-template>
            </p-dialog>

          <p-dialog [(visible)]="severityEditDialog" [style]="{width: '650px'}" header="Severity Details" [modal]="true" styleClass="p-fluid">

              <ng-template pTemplate="content">
                  <div class="p-col-12 p-fluid p-formgrid p-grid">
                  <div class="p-col-12 p-field">
                      <label for="name">Name</label>
                      <input id="name" type="name" pInputText [(ngModel)]="selectedSeverity.name">
                  </div>
                  <div class="p-col-6 p-field">
                      <label for="code">Code</label>
                      <input id="code" type="code" pInputText [(ngModel)]="selectedSeverity.code">
                  </div>
                  <div class="p-col-6 p-field">
                      <label for="description"> Description </label>
                      <input id="description" type="description" pInputText [(ngModel)]="selectedSeverity.description">
                  </div>
                  <div class="p-col-6 p-field">
                          <label for="created_by">Created_By</label>
                          <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedSeverity.created_by">
                      </div>
                      <div class="p-col-6 p-field">
                          <label for="created_date">Created_Date</label>
                          <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedSeverity.created_date">
                      </div>

                  </div>
                  </ng-template>

                  <ng-template pTemplate="footer">
                      <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideSeverityEditDialog()"></button>
                      <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateSeverity()"></button>
                  </ng-template>
                  </p-dialog>


                  <p-dialog [(visible)]="severityImportDialog" [style]="{width: '800px'}" header="Import Severity" [modal]="true" styleClass="p-fluid">

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
<p-tabPanel header="Priority" >
  <div class="p-grid">
	<div class="p-col-12">

        <div class="card">
			<p-toolbar styleClass="p-mb-4">
				<ng-template pTemplate="left">
					<button pButton pRipple label="Add Priority" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddPriority()"></button>
					<button pButton pRipple label="Delete Priority" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
				</ng-template>

				<ng-template pTemplate="right">
                    <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importPriority(priority)">
                    </button>
					<button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
				</ng-template>
            </p-toolbar>
            <p-table #prt [value]="priorityList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code']"
         [rowHover]="true" dataKey="priority_id" [(selection)]="selectedPriority"
            styleClass="p-datatable-customers"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

            <ng-template pTemplate="caption">
                <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                    <h5 class="p-m-0">Priority Listing</h5>
                    <span class="p-input-icon-left">
                    <i class="pi pi-search"></i>
                    <input pInputText type="text" (input)="prt.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
                </span>
                </div>
            </ng-template>
            <ng-template pTemplate="header">
                <tr>
                    <th style="width: 3rem">
                        <p-tableHeaderCheckbox></p-tableHeaderCheckbox>
                    </th>
                    <th pSortableColumn="name"> Name<p-sortIcon field="name"></p-sortIcon></th>
                    <th pSortableColumn="code "> Code <p-sortIcon field="code"></p-sortIcon></th>
                    <th pSortableColumn="description">  Description <p-sortIcon field="description"></p-sortIcon></th>

                    <th>Action</th>
                </tr>
            </ng-template>
            <ng-template pTemplate="body" let-priority>
                <tr>
                    <td>
                        <p-tableCheckbox [value]="priority"></p-tableCheckbox>
                    </td>
                    <td><span class="p-column-title"></span>
                        {{priority.name}}
                    </td>
                    <td><span class="p-column-title"></span>
                        {{priority.code}}
                    </td>
                    <td><span class="p-column-title"></span>
                        {{priority.description}}
                    </td>

                    <td>
                        <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editPriority(priority)"></button>
                        <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteProduct(product)"></button>
                    </td>
                </tr>
            </ng-template>
            <ng-template pTemplate="summary">
                <div class="p-d-flex p-ai-center p-jc-between">
                    In total there are {{priorityList ? priorityList.length : 0 }} Priority.
                </div>
            </ng-template>
        </p-table>
            </div>

            <p-dialog [(visible)]="priorityDialog" [style]="{width: '650px'}" header="New Priority" [modal]="true" styleClass="p-fluid">
                <ng-template pTemplate="content">

                    <div class="p-grid p-formgrid p-fluid">

                        <div class="p-col-6 p-field">
                            <label for="name">Priority Name</label>
                            <input id="name" type="name" pInputText [(ngModel)]="prioritycreatedata.name" aria-describedby="name-help"
                            placeholder="Enter Name">

                        </div>

                        <div class="p-col-6 p-field">
                            <label for="code">Code </label>
                            <input id="code" type="code" pInputText [(ngModel)]="prioritycreatedata.code" aria-describedby="code-help"
                            placeholder="Enter Code" required>
                        </div>

                        <div class="p-col-12 p-field">
                            <label for="description">Test Group Description </label>
                            <textarea rows="5" cols="30" placeholder=" Description" [(ngModel)]="prioritycreatedata.description" pInputTextarea ></textarea>
                        </div>


                    </div>



                </ng-template>
                <ng-template pTemplate="footer">
                              <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hidePriorityDialog()"></button>
                              <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addPriority()"></button>
                          </ng-template>
              </p-dialog>

            <p-dialog [(visible)]="priorityEditDialog" [style]="{width: '650px'}" header="Priority Details" [modal]="true" styleClass="p-fluid">

                <ng-template pTemplate="content">
                    <div class="p-col-12 p-fluid p-formgrid p-grid">
                    <div class="p-col-12 p-field">
                        <label for="name">Name</label>
                        <input id="name" pInputText [(ngModel)]="selectedPriority.name">
                    </div>
                    <div class="p-col-6 p-field">
                        <label for="code">Code</label>
                        <input id="code" pInputText [(ngModel)]="selectedPriority.code">
                    </div>

                    <div class="p-col-6 p-field">
                        <label for="description"> Description </label>
                        <input id="description" type="description" pInputText [(ngModel)]="selectedPriority.description">
                    </div>
                    <div class="p-col-6 p-field">
                            <label for="created_by">Created_By</label>
                            <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedPriority.created_by">
                        </div>
                        <div class="p-col-6 p-field">
                            <label for="created_date">Created_Date</label>
                            <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedPriority.created_date">
                        </div>

                    </div>
                    </ng-template>

                    <ng-template pTemplate="footer">
                        <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hidePriorityEditDialog()"></button>
                        <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updatePriority()"></button>
                    </ng-template>
                    </p-dialog>


                    <p-dialog [(visible)]="priorityImportDialog" [style]="{width: '800px'}" header="Import Priority" [modal]="true" styleClass="p-fluid">

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
</p-tabView >


`,
  styleUrls: ['./allergieslist.component.scss'],
  providers: [MessageService]
})
export class AllergieslistComponent implements OnInit {

  allergiescreatedata = {} as AllergiesData;
  allergenscreatedata = {} as AllergensData;
  severitycreatedata = {} as SeverityData;
  prioritycreatedata = {} as PriorityData;


  allergiesList:any;
  selectedAllergies: AllergiesData;
  allergiesDialog: boolean;
  allergiesEditDialog: boolean;
  allergiesImportDialog: boolean;

  allergensList:any;
  selectedAllergens: AllergensData;
  allergensDialog: boolean;
  allergensEditDialog: boolean;
  allergensImportDialog: boolean;

  severityList:any;
  selectedSeverity: SeverityData;
  severityDialog: boolean;
  severityEditDialog: boolean;
  severityImportDialog: boolean;

  priorityList:any;
  selectedPriority: PriorityData;
  priorityDialog: boolean;
  priorityEditDialog: boolean;
  priorityImportDialog: boolean;

  activeindex: number = 0;

  constructor(private messageService: MessageService,private router: Router, private route:ActivatedRoute, private location: Location,private manageallergiesService:ManageAllergiesService, private breadcrumbService: AppBreadcrumbService) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['/dashboard'] },
      { label: 'METADATA', routerLink: ['/metadatalist'] },
      { label: 'List Allergies', routerLink: ['/allergieslist'] }    ]);
   }

  ngOnInit(): void {
    this.AllergiesList();
    this.AllergensList();
    this.SeverityList();
    this.PriorityList();

    this.activeindex = parseInt(this.route.snapshot.paramMap.get('index'));

  }


  addAllergies(){
    this.allergiescreatedata.created_by = +sessionStorage.getItem("userid");
    this.allergiescreatedata.created_date = Date.now();
    this.manageallergiesService.createAllergies(this.allergiescreatedata).subscribe(
      data => {
        this.addSuccess("Success!","Allergy added successfully.");
    },
    error => {
    this.addError("Failed!","Could not add Allergy.");
    }

    );
  }

  AllergiesList():void{
    this.manageallergiesService.getAllergiess().subscribe(data => {
      this.allergiesList = data;
      console.log(data);
    }
    );
    }
      goToAddAllergies(allergies: AllergiesData){
        this.router.navigate(['addAllergies']);
        this.allergiesDialog=true;
      }

      importAllergies(allergies: AllergiesData){
        this.router.navigate(['importAllergies']);
        this.allergiesImportDialog=true;
      }


      deleteAllergies(allergies: AllergiesData){

        this.selectedAllergies = {...allergies};
        console.log(this.selectedAllergies)
        this.manageallergiesService.deleteAllergies(this.selectedAllergies.allergy_id)
          .subscribe(
            data => {
              this.addSuccess("Success!","Allergies deleted successfully.");


          },
          error => {
          this.addError("Failed!","Could not delete Allergies.");
          }
          );
      }

      goBack(){
        this.location.back();
      }
      editAllergies(allergies: AllergiesData){
      this.allergiescreatedata.created_date = Date.now();
      this.selectedAllergies = {...allergies};
      this.allergiesEditDialog=true;
     }
     updateAllergies(){
       this.manageallergiesService.createAllergies(this.selectedAllergies).subscribe(
        () => {
          this.addSuccess("Success!","Allergies information updated successfully.");

       },
       () => {
       this.addError("Failed!","Allergy creation failed.");
       this.allergiesDialog = false;
     });
    }

     addSuccess(title:string,message:string) {
       this.messageService.add({severity:'success', summary:title, detail:message});


     }
     addError(title:string,message:string) {
       this.messageService.add({severity:'error', summary:title, detail:message});

     }

     hideAllergiesDialog(){
       this.allergiesDialog = false;

     }

     hideAllergiesEditDialog(){
      this.allergiesEditDialog = false;

    }

     //Allergens


     addAllergens(){
      this.allergenscreatedata.created_by = +sessionStorage.getItem("userid");
      this.allergenscreatedata.created_date = new Date();
      this.manageallergiesService.createAllergens(this.allergenscreatedata).subscribe(
        data => {
          this.addSuccess("Success!","Allergens added successfully.");
      },
      error => {
      this.addError("Failed!","Could not add Allergens.");
      }

      );
    }

     AllergensList():void{
      this.manageallergiesService.getAllergenss().subscribe(data => {
        this.allergensList = data;
        console.log(data);
      }
      );
      }
        goToAddAllergens(allergens: AllergensData){
          this.router.navigate(['addAllergens']);
          this.allergensDialog=true;
        }


        importAllergens(allergens: AllergensData){
          this.router.navigate(['importAllergens']);
          this.allergensImportDialog=true;
        }


        deleteAllergens(allergens: AllergensData){

          this.selectedAllergens = {...allergens};
          console.log(this.selectedAllergens)
          this.manageallergiesService.deleteAllergens(this.selectedAllergens.allergen_id)
            .subscribe(
              data => {
                this.addSuccess("Success!","Allergens deleted successfully.");


            },
            error => {
            this.addError("Failed!","Could not delete Allergens.");
            }
            );
        }



        editAllergens(allergens: AllergensData){
        this.selectedAllergens = {...allergens};
        this.allergensEditDialog=true;
       }
       updateAllergens(){
         this.manageallergiesService.createAllergens(this.selectedAllergens).subscribe(
          () => {
            this.addSuccess("Success!","Allergens information updated successfully.");

         },
         () => {
         this.addError("Failed!","Allergens creation failed.");
         this.allergensDialog = false;
       });
      }

      hideAllergensDialog(){
        this.allergensDialog = false;
      }

      hideAllergensEditDialog(){
        this.allergensEditDialog = false;
      }

       // Severity


       addSeverity(){
        this.severitycreatedata.created_by = +sessionStorage.getItem("userid");
        this.severitycreatedata.created_date = new Date();
        this.manageallergiesService.createSeverity(this.severitycreatedata).subscribe(
          data => {
            this.addSuccess("Success!","Severity added successfully.");
        },
        error => {
        this.addError("Failed!","Could not add Severity.");
        }

        );
      }

       SeverityList():void{
    this.manageallergiesService.getSeveritys().subscribe(data => {
      this.severityList = data;
      console.log(data);
    }
    );
    }
      goToAddSeverity(severity: SeverityData){
        this.router.navigate(['addSeverity']);
        this.severityDialog=true;
      }

      deleteSeverity(severity: SeverityData){

        this.selectedSeverity = {...severity};
        console.log(this.selectedSeverity)
        this.manageallergiesService.deleteSeverity(this.selectedSeverity.severity_id)
          .subscribe(
            data => {
              this.addSuccess("Success!","Severity deleted successfully.");


          },
          error => {
          this.addError("Failed!","Could not delete Severity.");
          }
          );
      }

      importSeverity(severity: SeverityData){
        this.router.navigate(['importSeverity']);
        this.severityImportDialog=true;
      }

      editSeverity(severity: SeverityData){
      this.selectedSeverity = {...severity};
      this.severityEditDialog=true;
     }
     updateSeverity(){
       this.manageallergiesService.createSeverity(this.selectedSeverity).subscribe(
        () => {
          this.addSuccess("Success!","Severity information updated successfully.");

       },
       () => {
       this.addError("Failed!","Severity creation failed.");
       this.severityDialog = false;
     });
    }

    hideSeverityDialog(){
      this.severityDialog = false;
    }

    hideSeverityEditDialog(){
      this.severityEditDialog = false;
    }


    //Priority Methods

    addPriority(){
      this.prioritycreatedata.created_by = +sessionStorage.getItem("userid");
      this.prioritycreatedata.created_date = new Date();
      this.manageallergiesService.createPriority(this.prioritycreatedata).subscribe(
        data => {
          this.addSuccess("Success!","Priority added successfully.");
      },
      error => {
      this.addError("Failed!","Could not add Priority.");
      }

      );
    }

    PriorityList():void{
      this.manageallergiesService.getPrioritys().subscribe(data => {
        this.priorityList = data;
        console.log(data);
      }
      );
      }
        goToAddPriority(priority: PriorityData){
          this.router.navigate(['addPriority']);
          this.priorityDialog=true;
        }

        importPriority(priority: PriorityData){
          this.router.navigate(['importPriority']);
          this.priorityImportDialog=true;
        }

        editPriority(priority: PriorityData){
        this.selectedPriority = {...priority};
        this.priorityEditDialog=true;
       }
       updatePriority(){
         this.manageallergiesService.createPriority(this.selectedPriority).subscribe(
          () => {
            this.addSuccess("Success!","Priority information updated successfully.");

         },
         () => {
         this.addError("Failed!","Priority creation failed.");
         this.priorityDialog = false;
       });
      }

       hidePriorityDialog(){
         this.priorityDialog = false;
       }
       hidePriorityEditDialog(){
        this.priorityEditDialog = false;
      }


}
