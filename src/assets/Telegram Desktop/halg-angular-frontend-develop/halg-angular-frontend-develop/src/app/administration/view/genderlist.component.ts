import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { GenderData, MaritalStatusData, RelationshipData, LanguageData, ReligionData } from '../domain/gender.data';
import {ManageGendersService} from '../service/manage.genders.service';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {MessageService} from 'primeng/api';

@Component({
  selector: 'app-genderlist',
  template: `<p-toast position="top-center"></p-toast>
  <p-tabView [(activeIndex)]="activeindex">
  <p-tabPanel header="Gender" leftIcon="fa fa-pills">

<div class="p-grid">
<div class="p-col-12">

  <div class="card">
      <p-toolbar styleClass="p-mb-4">
          <ng-template pTemplate="left">
              <button pButton pRipple label="Add Gender" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddGender(gender)"></button>
              <button pButton pRipple label="Delete Gender" icon="pi pi-trash" class="p-mb-2" (click)="deleteGender(gender)" [disabled]="!selectedProducts || !selectedProducts.length"></button>
          </ng-template>

          <ng-template pTemplate="right">
              <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importGender()">
                      </button>
                      <button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
          </ng-template>
      </p-toolbar>
      <p-table #dt [value]="genderList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code','description']"
   [rowHover]="true" dataKey="gender_id" [(selection)] = "selectedGender"
      styleClass="p-datatable-customers"
      currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

      <ng-template pTemplate="caption">
          <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
              <h5 class="p-m-0">Gender Listing</h5>
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
              <th pSortableColumn="action">Action <p-sortIcon field="action"></p-sortIcon></th>

          </tr>
      </ng-template>
      <ng-template pTemplate="body" let-gender>
          <tr>
              <td>
                  <p-tableCheckbox [value]="gender"></p-tableCheckbox>
              </td>
              <td><span class="p-column-title"></span>
                  {{gender.name}}
              </td>
              <td><span class="p-column-title"></span>
                  {{gender.code}}
              </td>
              <td><span class="p-column-title"></span>
                  {{gender.description}}
              </td>

              <td>
                  <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editGender(gender)"></button>
                  <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteGender(gender)"></button>
              </td>
          </tr>
      </ng-template>
      <ng-template pTemplate="summary">
          <div class="p-d-flex p-ai-center p-jc-between">
              In total there are {{genderList ? genderList.length : 0 }} genders.
          </div>
      </ng-template>
  </p-table>

      </div>

      <p-dialog [(visible)]="genderDialog" [style]="{width: '650px'}" header="New Gender" [modal]="true" styleClass="p-fluid">
          <ng-template pTemplate="content">
    <div  class="p-col-12 p-fluid p-formgrid p-grid">
       <div class="p-col-6 p-field">
              <label for="name">Name</label>
              <input  type="text" pInputText [(ngModel)]="gender.name" aria-describedby="username-help"
              placeholder="Enter name">

          </div>
     <div class="p-col-6 p-field">
              <label for="code">Code</label>
              <input id="code" type="code" pInputText [(ngModel)]="gender.code" aria-describedby="password-help" placeholder="Enter code">

          </div>
    </div>

    <div class="p-grid p-formgrid p-fluid">
              <div class="p-col-12 p-field">
                  <label for="description">Description</label>
                  <textarea rows="5" cols="30" placeholder="Description" pInputTextarea  [(ngModel)]="gender.description"></textarea>
              </div>

          </div>


          </ng-template>
          <ng-template pTemplate="footer">
                        <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideGenderDialog()"></button>
                        <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addGender()"></button>
                    </ng-template>
        </p-dialog>


        <p-dialog [(visible)]="genderEditDialog" [style]="{width: '650px'}" header="Gender Details" [modal]="true" styleClass="p-fluid">

          <ng-template pTemplate="content">
              <div class="p-col-12 p-fluid p-formgrid p-grid">
              <div class="p-col-12 p-field">
                  <label for="name">Name</label>
                  <input id="name" type="name" pInputText [(ngModel)]="selectedGender.name">
              </div>
              <div class="p-col-6 p-field">
                  <label for="code">Code</label>
                  <input id="code" type="code" pInputText [(ngModel)]="selectedGender.code">
              </div>
              <div class="p-col-6 p-field">
                  <label for="description"> Description </label>
                  <input id="description" type="description" pInputText [(ngModel)]="selectedGender.description">
              </div>
              <div class="p-col-6 p-field">
                      <label for="created_by">Created_By</label>
                      <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedGender.created_by" readonly>
                  </div>
                  <div class="p-col-6 p-field">
                      <label for="created_date">Created_Date</label>
                      <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedGender.created_date" readonly>
                  </div>

              </div>
              </ng-template>

              <ng-template pTemplate="footer">
                  <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideGenderEditDialog()"></button>
                  <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateGender()"></button>
              </ng-template>
              </p-dialog>


              <p-dialog [(visible)]="genderImportDialog" [style]="{width: '800px'}" header="Import Gender" [modal]="true" styleClass="p-fluid">

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

<p-tabPanel header="Marital Status" leftIcon="fa fa-frown">

<div class="p-grid">
<div class="p-col-12">

  <div class="card">
      <p-toolbar styleClass="p-mb-4">
          <ng-template pTemplate="left">
              <button pButton pRipple label="Add Marital Status" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddMaritalStatus(maritalstatus)"></button>
              <button pButton pRipple label="Delete Marital Status" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
          </ng-template>

          <ng-template pTemplate="right">
              <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importMaritalStatus(maritalstatus)">
                      </button>
                      <button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
          </ng-template>
      </p-toolbar>
      <p-table #mdt [value]="maritalStatusList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code','description']"
   [rowHover]="true" dataKey="marital_status_id" [(selection)]="selectedMaritalStatus"
      styleClass="p-datatable-customers"
      currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

      <ng-template pTemplate="caption">
          <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
              <h5 class="p-m-0">Marital Status Listing</h5>
              <span class="p-input-icon-left">
              <i class="pi pi-search"></i>
              <input pInputText type="text" (input)="mdt.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
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
      <ng-template pTemplate="body" let-maritalstatus>
          <tr>
              <td>
                  <p-tableCheckbox [value]="maritalstatus"></p-tableCheckbox>
              </td>
              <td><span class="p-column-title"></span>
               {{maritalstatus.name}}
              </td>
              <td><span class="p-column-title"></span>
                  {{maritalstatus.code}}
              </td>
              <td><span class="p-column-title"></span>
                  {{maritalstatus.description}}
              </td>

              <td>
                  <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editMaritalStatus(maritalstatus)"></button>
                  <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteMaritalStatus(maritalstatus)"></button>
              </td>
          </tr>
      </ng-template>
      <ng-template pTemplate="summary">
          <div class="p-d-flex p-ai-center p-jc-between">
              In total there are {{maritalStatusList ? maritalStatusList.length : 0 }} Marital Status.
          </div>
      </ng-template>
  </p-table>

      </div>

      <p-dialog [(visible)]="maritalstatusDialog" [style]="{width: '650px'}" header="New Marital Status" [modal]="true" styleClass="p-fluid">
          <ng-template pTemplate="content">
      <div  class="p-col-12 p-fluid p-formgrid p-grid">
       <div class="p-col-6 p-field">
              <label for="name">Name</label>
              <input id="name" type="name" pInputText [(ngModel)]="maritalstatuscreatedata.name" aria-describedby="username-help"
              placeholder="Enter name">

          </div>
      <div class="p-col-6 p-field">
              <label for="code">Code</label>
              <input id="code" type="code" pInputText [(ngModel)]="maritalstatuscreatedata.code" aria-describedby="password-help" placeholder="Enter code">

          </div>
      </div>

      <div class="p-grid p-formgrid p-fluid">
              <div class="p-col-12 p-field">
                  <label for="description">Description</label>
                  <textarea rows="5" cols="30" placeholder="Description" pInputTextarea  [(ngModel)]="maritalstatuscreatedata.description"></textarea>
              </div>

          </div>


          </ng-template>
          <ng-template pTemplate="footer">
                        <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideMaritalstatusDialog()"></button>
                        <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addmaritalstatus()"></button>
                    </ng-template>
        </p-dialog>


        <p-dialog [(visible)]="maritalstatusEditDialog" [style]="{width: '650px'}" header="Marital Status Details" [modal]="true" styleClass="p-fluid">

          <ng-template pTemplate="content">
              <div class="p-col-12 p-fluid p-formgrid p-grid">
              <div class="p-col-12 p-field">
                  <label for="name">Name</label>
                  <input id="name" pInputText [(ngModel)]="selectedMaritalStatus.name">
              </div>
              <div class="p-col-6 p-field">
                  <label for="code">Code</label>
                  <input id="code" type="code" pInputText [(ngModel)]="selectedMaritalStatus.code">
              </div>
              <div class="p-col-6 p-field">
                  <label for="description">Description </label>
                  <input id="description" type="description" pInputText [(ngModel)]="selectedMaritalStatus.description">
              </div>

              <div class="p-col-6 p-field">
                  <label for="created_by">Created_By</label>
                  <input id="created_by" pInputText [(ngModel)]="selectedMaritalStatus.created_by">
              </div>
              <div class="p-col-6 p-field">
                  <label for="created_date">Created_Date</label>
                  <input id="created_date" pInputText [(ngModel)]="selectedMaritalStatus.created_date">
              </div>
              </div>

              </ng-template>

              <ng-template pTemplate="footer">
                  <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideMaritalstatusEditDialog()"></button>
                  <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateMaritalstatus()"></button>
              </ng-template>
              </p-dialog>



   <p-dialog [(visible)]="maritalstatusImportDialog" [style]="{width: '800px'}" header="Import Marital Status" [modal]="true" styleClass="p-fluid">

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

<p-tabPanel header="Relationship" >

<div class="p-grid">
<div class="p-col-12">

  <div class="card">
      <p-toolbar styleClass="p-mb-4">
          <ng-template pTemplate="left">
              <button pButton pRipple label="Add Relationship" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddRelationship(relationship)"></button>
              <button pButton pRipple label="Delete Relationship" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
          </ng-template>




          <ng-template pTemplate="right">
              <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importRelationship(relationship)">
                      </button>
                      <button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()" ></button>
          </ng-template>
      </p-toolbar>
      <p-table #rdt [value]="relationshipList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code','description']"
   [rowHover]="true" dataKey="relationship_id" [(selection)]="selectedRelationship"
      styleClass="p-datatable-customers"
      currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

      <ng-template pTemplate="caption">
          <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
              <h5 class="p-m-0">Relationship Listing</h5>
              <span class="p-input-icon-left">
              <i class="pi pi-search"></i>
              <input pInputText type="text" (input)="rdt.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
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
      <ng-template pTemplate="body" let-relationship>
          <tr>
              <td>
                  <p-tableCheckbox [value]="relationship"></p-tableCheckbox>
              </td>

              <td><span class="p-column-title"></span>
                  {{relationship.name}}
              </td>
              <td><span class="p-column-title"></span>
                  {{relationship.code}}
              </td>
              <td><span class="p-column-title"></span>
                  {{relationship.description}}
              </td>

              <td>
                  <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editRelationship(relationship)"></button>
                  <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteRelationship(relationship)"></button>
              </td>
          </tr>
      </ng-template>
      <ng-template pTemplate="summary">
          <div class="p-d-flex p-ai-center p-jc-between">
              In total there are {{relationshipList ? relationshipList.length : 0 }} relationships.
          </div>
      </ng-template>
  </p-table>

      </div>

      <p-dialog [(visible)]="relationshipDialog" [style]="{width: '650px'}" header="New Relationship" [modal]="true" styleClass="p-fluid">
          <ng-template pTemplate="content">
              <div  class="p-col-12 p-fluid p-formgrid p-grid">

      <div class="p-col-6 p-field">
          <label for="name">Name</label>
          <input id="name" type="name" pInputText [(ngModel)]="relationship.name" aria-describedby="username-help"
          placeholder="Enter name">

      </div>

      <div class="p-col-6 p-field">
          <label for="code">Code</label>
          <input id="code" type="code" pInputText [(ngModel)]="relationship.code" aria-describedby="password-help" placeholder="Enter code">

      </div>


  </div>

      <div class="p-grid p-formgrid p-fluid">
          <div class="p-col-12 p-field">
              <label for="description">Description</label>
              <textarea rows="5" cols="30" placeholder="Description" pInputTextarea  [(ngModel)]="relationship.description"></textarea>
          </div>

      </div>


          </ng-template>
          <ng-template pTemplate="footer">
                        <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideRelationshipDialog()"></button>
                        <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addRelationship()"></button>
                    </ng-template>
        </p-dialog>


     <p-dialog [(visible)]="relationshipEditDialog" [style]="{width: '650px'}" header="Relationship Details" [modal]="true" styleClass="p-fluid">

      <ng-template pTemplate="content">
          <div class="p-col-12 p-fluid p-formgrid p-grid">
          <div class="p-col-12 p-field">
              <label for="name">Name</label>
              <input id="name" type="name" pInputText [(ngModel)]="selectedRelationship.name">
          </div>
          <div class="p-col-6 p-field">
              <label for="code">Code</label>
              <input id="code" type="code" pInputText [(ngModel)]="selectedRelationship.code">
          </div>
          <div class="p-col-6 p-field">
              <label for="description"> Description </label>
              <input id="description" type="description" pInputText [(ngModel)]="selectedRelationship.description">
          </div>
          <div class="p-col-6 p-field">
                  <label for="created_by">Created_By</label>
                  <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedRelationship.created_by">
              </div>
              <div class="p-col-6 p-field">
                  <label for="created_date">Created_Date</label>
                  <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedRelationship.created_date">
              </div>

          </div>
          </ng-template>

          <ng-template pTemplate="footer">
              <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideRelationshipEditDialog()"></button>
              <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateRelationship()"></button>
          </ng-template>
          </p-dialog>


          <p-dialog [(visible)]="relationshipImportDialog" [style]="{width: '800px'}" header="Import Relationship" [modal]="true" styleClass="p-fluid">

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

<p-tabPanel header="Language" >


<div class="p-grid">
<div class="p-col-12">

  <div class="card">
      <p-toolbar styleClass="p-mb-4">
          <ng-template pTemplate="left">
              <button pButton pRipple label="Add Language" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddLanguage(language)"></button>
              <button pButton pRipple label="Delete Language" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
          </ng-template>

          <ng-template pTemplate="right">
              <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importLanguage(language)">
                      </button>
                      <button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()" ></button>
          </ng-template>
      </p-toolbar>
      <p-table #ldt [value]="languageList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code', 'description']"
   [rowHover]="true" dataKey="language_id" [(selection)]="selectedLanguage"
      styleClass="p-datatable-customers"
      currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

      <ng-template pTemplate="caption">
          <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
              <h5 class="p-m-0">Language Listing</h5>
              <span class="p-input-icon-left">
              <i class="pi pi-search"></i>
              <input pInputText type="text" (input)="ldt.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
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
      <ng-template pTemplate="body" let-language>
          <tr>
              <td>
                  <p-tableCheckbox [value]="language"></p-tableCheckbox>
              </td>

              <td><span class="p-column-title"></span>
                  {{language.name}}
              </td>
              <td><span class="p-column-title"></span>
                  {{language.code}}
              </td>
              <td><span class="p-column-title"></span>
                  {{language.description}}
              </td>

              <td>
                  <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editLanguage(language)"></button>
                  <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteLanguage(language)"></button>
              </td>
          </tr>
      </ng-template>
      <ng-template pTemplate="summary">
          <div class="p-d-flex p-ai-center p-jc-between">
              In total there are {{languageList ? languageList.length : 0 }} language.
          </div>
      </ng-template>
  </p-table>
      </div>

      <p-dialog [(visible)]="languageDialog" [style]="{width: '650px'}" header="New Language" [modal]="true" styleClass="p-fluid">
          <ng-template pTemplate="content">
   <div class="p-grid p-formgrid p-fluid">

      <div class="p-col-6 p-field">
          <label for="name">Language Name</label>
          <input id="name" type="name" pInputText [(ngModel)]="languagecreatedata.name" aria-describedby="name-help"
          placeholder="Enter Name">

      </div>

      <div class="p-col-6 p-field">
          <label for="code">Code </label>
          <input id="code" type="code" pInputText [(ngModel)]="languagecreatedata.code" aria-describedby="code-help"
          placeholder="Enter Code" required>
      </div>

      <div class="p-col-12 p-field">
          <label for="description">Language Description </label>
          <textarea rows="5" cols="30" placeholder="Description" [(ngModel)]="languagecreatedata.description" pInputTextarea ></textarea>
      </div>


  </div>


          </ng-template>
          <ng-template pTemplate="footer">
                        <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideLanguageDialog()"></button>
                        <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addLanguage()"></button>
                    </ng-template>
        </p-dialog>

      <p-dialog [(visible)]="languageEditDialog" [style]="{width: '650px'}" header="Language Details" [modal]="true" styleClass="p-fluid">

          <ng-template pTemplate="content">
              <div class="p-col-12 p-fluid p-formgrid p-grid">
              <div class="p-col-12 p-field">
                  <label for="name">Name</label>
                  <input id="name" type="name" pInputText [(ngModel)]="selectedLanguage.name">
              </div>
              <div class="p-col-6 p-field">
                  <label for="code">Code</label>
                  <input id="code" type="code" pInputText [(ngModel)]="selectedLanguage.code">
              </div>
              <div class="p-col-6 p-field">
                  <label for="description"> Description </label>
                  <input id="description" type="description" pInputText [(ngModel)]="selectedLanguage.description">
              </div>
              <div class="p-col-6 p-field">
                      <label for="created_by">Created_By</label>
                      <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedLanguage.created_by">
                  </div>
                  <div class="p-col-6 p-field">
                      <label for="created_date">Created_Date</label>
                      <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedLanguage.created_date">
                  </div>

              </div>
              </ng-template>

              <ng-template pTemplate="footer">
                  <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideLanguageEditDialog()"></button>
                  <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateLanguage()"></button>
              </ng-template>
              </p-dialog>

              <p-dialog [(visible)]="languageImportDialog" [style]="{width: '800px'}" header="Import Language" [modal]="true" styleClass="p-fluid">

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

<p-tabPanel header="Religion">
  <div class="p-grid">
  <div class="p-col-12">

      <div class="card">
          <p-toolbar styleClass="p-mb-4">
              <ng-template pTemplate="left">
                  <button pButton pRipple label="Add Religion" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddReligion()"></button>
                  <button pButton pRipple label="Delete Religion" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
              </ng-template>

              <ng-template pTemplate="right">
                  <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importReligion()">
                          </button>
                          <button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
              </ng-template>
          </p-toolbar>
          <p-table #dt [value]="religionsList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code','description']"
       [rowHover]="true" dataKey="religion_id" [(selection)]="selectedReligion"
          styleClass="p-datatable-customers"
          currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

          <ng-template pTemplate="caption">
              <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                  <h5 class="p-m-0">Religion Listing</h5>
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
                  <th pSortableColumn="action">Action <p-sortIcon field="action"></p-sortIcon></th>

              </tr>
          </ng-template>
          <ng-template pTemplate="body" let-religion>
              <tr>
                  <td>
                      <p-tableCheckbox [value]="religion"></p-tableCheckbox>
                  </td>
                  <td>
                      {{religion.name}}
                  </td>
                  <td>
                      {{religion.code}}
                  </td>
                  <td>
                      {{religion.description}}
                  </td>

                  <td>
                      <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editReligion(religion)"></button>
                      <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteProduct(product)"></button>
                  </td>
              </tr>
          </ng-template>
          <ng-template pTemplate="summary">
              <div class="p-d-flex p-ai-center p-jc-between">
                  In total there are {{religionsList ? religionsList.length : 0 }} Religion.
              </div>
          </ng-template>
      </p-table>

          </div>

          <p-dialog [(visible)]="religionDialog" [style]="{width: '650px'}" header="New Religion" [modal]="true" styleClass="p-fluid">
              <ng-template pTemplate="content">
        <div  class="p-col-12 p-fluid p-formgrid p-grid">
           <div class="p-col-6 p-field">
                  <label for="name">Name</label>
                  <input  type="text" pInputText [(ngModel)]="religion.name" aria-describedby="username-help"
                  placeholder="Enter name">

              </div>
         <div class="p-col-6 p-field">
                  <label for="code">Code</label>
                  <input id="code" type="code" pInputText [(ngModel)]="religion.code" aria-describedby="password-help" placeholder="Enter code">

              </div>
        </div>

        <div class="p-grid p-formgrid p-fluid">
                  <div class="p-col-12 p-field">
                      <label for="description">Description</label>
                      <textarea rows="5" cols="30" placeholder="Description" pInputTextarea  [(ngModel)]="religion.description" placeholder="Enter Description"></textarea>
                  </div>

              </div>


              </ng-template>
              <ng-template pTemplate="footer">
                            <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideReligionDialog()"></button>
                            <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addReligion()"></button>
                        </ng-template>
            </p-dialog>


            <p-dialog [(visible)]="religionEditDialog" [style]="{width: '650px'}" header="Religion Details" [modal]="true" styleClass="p-fluid">

              <ng-template pTemplate="content">
                  <div class="p-col-12 p-fluid p-formgrid p-grid">
                  <div class="p-col-12 p-field">
                      <label for="name">Name</label>
                      <input id="name" type="name" pInputText [(ngModel)]="selectedReligion.name">
                  </div>
                  <div class="p-col-6 p-field">
                      <label for="code">Code</label>
                      <input id="code" type="code" pInputText [(ngModel)]="selectedReligion.code">
                  </div>
                  <div class="p-col-6 p-field">
                      <label for="description"> Description </label>
                      <input id="description" type="description" pInputText [(ngModel)]="selectedReligion.description">
                  </div>
                  <div class="p-col-6 p-field">
                          <label for="created_by">Created_By</label>
                          <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedReligion.created_by">
                      </div>
                      <div class="p-col-6 p-field">
                          <label for="created_date">Created_Date</label>
                          <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedReligion.created_date">
                      </div>

                  </div>
                  </ng-template>

                  <ng-template pTemplate="footer">
                      <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideReligionEditDialog()"></button>
                      <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateReligion()"></button>
                  </ng-template>
                  </p-dialog>


                  <p-dialog [(visible)]="religionImportDialog" [style]="{width: '800px'}" header="Import Religion" [modal]="true" styleClass="p-fluid">

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
  styleUrls: ['./genderlist.component.scss'],
  providers: [MessageService]
})
export class GenderlistComponent implements OnInit {

  gender = {} as GenderData;
  maritalstatuscreatedata= {} as MaritalStatusData;
  relationship = {} as RelationshipData;
  languagecreatedata = {} as LanguageData;
  religion = {} as ReligionData;



  genderList:any;
  selectedGender: GenderData;
  selectedGenders: any[];
  genderDialog: boolean = false;
  genderEditDialog: boolean;
  genderImportDialog: boolean;

  maritalStatusList:any;
  selectedMaritalStatus:MaritalStatusData;
  maritalstatusDialog: boolean;
  maritalstatusEditDialog: boolean;
  maritalstatusImportDialog: boolean;

  relationshipList:any;
  selectedRelationship: RelationshipData;
  relationshipDialog: boolean;
  relationshipEditDialog: boolean;
  relationshipImportDialog: boolean;

   languageList:any;
  selectedLanguage: LanguageData;
  languageDialog: boolean;
  languageEditDialog: boolean;
  languageImportDialog: boolean;

  religionsList:any;
  selectedReligion: ReligionData;
  religionDialog: boolean;
  religionEditDialog: boolean;
  religionImportDialog: boolean;

  activeindex: number = 0;

  constructor(private messageService: MessageService,
  private router: Router,
  private route:ActivatedRoute,
  private location: Location,
  private managegenderService:ManageGendersService,
  private breadcrumbService: AppBreadcrumbService) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['/dashboard'] },
      { label: 'METADATA', routerLink: ['/metadatalist'] },
      { label: 'GENDER', routerLink: ['/genderlist'] }    ]);
   }

  ngOnInit(): void {
    this.GenderList();
	  this.MaritalStatusList();
	  this.RelationshipList();
    this.LanguageList();
    this.ReligionList();

      this.activeindex = parseInt(this.route.snapshot.paramMap.get('index'));


  }


  //Gender Methods

  addGender(){
    this.gender.created_by = +sessionStorage.getItem('userid');
    this.gender.created_date=  Date.now();
    this.managegenderService.createGender(this.gender).subscribe(
    data => {

        this.addSuccess("Success!","Gender added successfully.");
    },
    error => {
    this.addError("Failed!","Could not add gender."+error.text);
    }

    );
    this.genderDialog=false;
  }



   GenderList():void{
    this.managegenderService.getGenders().subscribe(data => {
      this.genderList = data;
      console.log(this.genderList);
    }
    );
    }

    goToAddGender(gender: GenderData){
      this.router.navigate(['addGender']);
      this.genderDialog=true;
    }


    importGender(gender: GenderData){
      this.router.navigate(['importGender']);
      this.genderImportDialog=true;
    }


    goBack(){
      this.location.back();
    }

   /* deleteGender(): void {
      this.managegenderService.deleteGenders()
        .subscribe(
          response => {
            console.log(response);

          },
          error => {
            console.log(error);
          });
    } */


    deleteGender(gender: GenderData){

      this.selectedGender = {...gender};
     this.selectedGenders = [];
      this.selectedGenders.push(this.selectedGender.gender_id);
      console.log("Got here as "+JSON.stringify(this.selectedGenders));

      this.managegenderService.deleteGender(this.selectedGenders)
        .subscribe(
          data => {
            this.addSuccess("Success!","Gender deleted successfully.");


        },
        error => {
        this.addError("Failed!","Could not delete Gender.");
        }
        );
    }

    editGender(gender: GenderData){
      this.selectedGender = {...gender};
      console.log(this.selectedGender)
      this.genderEditDialog=true;
     }

     updateGender(){
      this.managegenderService.createGender(this.selectedGender).subscribe(
        () => {
           this.addSuccess("Success!","Gender information updated successfully.");

       },
       () => {
         this.addError("Failed!","Could not update Gender information.");
         this.maritalstatusDialog = false;
       });
    }

    hideGenderDialog(){
      this.genderDialog = false;
    }

    hideGenderEditDialog(){
      this.genderEditDialog = false;
    }





  //Maital Status Methods



  addmaritalstatus(){
    this.maritalstatuscreatedata.created_by = +sessionStorage.getItem('userid');
    this.maritalstatuscreatedata.created_date = new Date();
    this.managegenderService.createMaritalStatus(this.maritalstatuscreatedata).subscribe(
    () => {
      this.addSuccess("Success!","Marital Status added successfully.");
      },
    () => {
    this.addError("Failed!","Could not add marital status.");
    }

    );
  }

	  MaritalStatusList():void{
    this.managegenderService.getMaritalStatuss().subscribe(data => {
      this.maritalStatusList = data;
      console.log(data);
    }
    );
    }

    goToAddMaritalStatus(maritalstatus: MaritalStatusData){
      this.router.navigate(['addMaritalstatus']);
      this.maritalstatusDialog=true;
    }


    importMaritalStatus(maritalstatus: MaritalStatusData){
      this.router.navigate(['importmaritalstatus']);
      this.maritalstatusImportDialog=true;
    }

    deleteMaritalStatus(maritalstatus: MaritalStatusData){

        this.selectedMaritalStatus = {...maritalstatus};
        console.log(this.selectedMaritalStatus)
        this.managegenderService.deleteMaritalStatus(this.selectedMaritalStatus.marital_status_id)
          .subscribe(
            data => {
              this.addSuccess("Success!","Marital Status deleted successfully.");


          },
          error => {
          this.addError("Failed!","Could not delete Marital Status.");
          }
          );
      }

    editMaritalStatus(maritalstatus: MaritalStatusData){
      this.selectedMaritalStatus = {...maritalstatus};
      this.maritalstatusEditDialog=true;
     }

     updateMaritalstatus(){
       this.managegenderService.createMaritalStatus(this.selectedMaritalStatus).subscribe(
         () => {
           this.addSuccess("Success!","Marital Status information updated successfully.");

       },
       () => {
         this.addError("Failed!","Could not update Marital Status information.");
         this.maritalstatusDialog = false;
       });

     }

     hideMaritalstatusDialog(){
	  this.maritalstatusDialog = false;
    }

    hideMaritalstatusEditDialog(){
      this.maritalstatusEditDialog = false;
      }



   //Relationship Methods

   addRelationship(){
    this.relationship.created_by = +sessionStorage.getItem('userid');
    this.relationship.created_date= new Date();
    this.managegenderService.createRelationship(this.relationship).subscribe(
    data => {
        this.addSuccess("Success!","Ralationship added successfully.");
    },
    error => {
    this.addError("Failed!","Could not add relationship.");
    }

    );
  }


	 RelationshipList():void{
    this.managegenderService.getRelationship().subscribe(data => {
      this.relationshipList = data;
      console.log(data);
    }
    );
    }

    goToAddRelationship(relationship: RelationshipData){
      this.router.navigate(['addRelationship']);
      this.relationshipDialog=true;
    }

    deleteRelationship(relationship: RelationshipData){

        this.selectedRelationship = {...relationship};
        console.log(this.selectedRelationship)
        this.managegenderService.deleteRelationship(this.selectedRelationship.relationship_id)
          .subscribe(
            data => {
              this.addSuccess("Success!","Relationship deleted successfully.");
          },
          error => {
          this.addError("Failed!","Could not delete Relationship.");
          }
          );
      }

    importRelationship(relationship: RelationshipData){
      this.router.navigate(['importRelationship']);
      this.relationshipImportDialog=true;
    }

    editRelationship(relationship: RelationshipData){
      this.selectedRelationship = {...relationship};
      this.relationshipEditDialog=true;
     }

     updateRelationship(){
      this.managegenderService.createRelationship(this.selectedRelationship).subscribe(
        () => {
           this.addSuccess("Success!","Relationship information updated successfully.");

       },
       () => {
         this.addError("Failed!","Could not update Relationship information.");
         this.relationshipDialog = false;
       });
    }


    hideRelationshipDialog(){
	  this.relationshipDialog = false;
    }

    hideRelationshipEditDialog(){
      this.relationshipEditDialog = false;
      }



    //Language Methods

    addLanguage(){
      this.languagecreatedata.created_by = +sessionStorage.getItem("userid");
      this.languagecreatedata.created_date = Date.now();
      this.managegenderService.createLanguage(this.languagecreatedata).subscribe(
        () => {
          this.addSuccess("Success!","Language added successfully.");
      },
      () => {
      this.addError("Failed!","Could not add Language.");
      }

      );
    }

	  LanguageList():void{
    this.managegenderService.getLanguages().subscribe(data => {
      this.languageList = data;
      console.log(data);
    }
    );
    }
      goToAddLanguage(){
        this.router.navigate(['addLanguage']);
        this.languageDialog=true;
      }

      importLanguage(){
        this.router.navigate(['importLanguage']);
        this.languageImportDialog=true;
      }

      deleteLanguage(language: LanguageData){

        this.selectedLanguage = {...language};
        console.log(this.selectedLanguage)
        this.managegenderService.deleteLanguage(this.selectedLanguage.language_id)
          .subscribe(
            data => {
              this.addSuccess("Success!","Language deleted successfully.");
          },
          error => {
          this.addError("Failed!","Could not delete Language.");
          }
          );
      }
      editLanguage(language: LanguageData){
      this.selectedLanguage = {...language};
      this.languageEditDialog=true;
     }
     updateLanguage(){
       this.managegenderService.createLanguage(this.selectedLanguage).subscribe(
        () => {
          this.addSuccess("Success!","Language information updated successfully.");

       },
       () => {
       this.addError("Failed!","Language creation failed.");
       this.languageDialog = false;
     });
    }


    hideLanguageDialog(){
	  this.languageDialog = false;
    }

    hideLanguageEditDialog(){
      this.languageEditDialog = false;
      }



      // Religion Methods

      addReligion(){
        this.religion.created_by = +sessionStorage.getItem('userid');
        this.religion.created_date= new Date();
        this.managegenderService.createReligion(this.religion).subscribe(
        data => {
            this.addSuccess("Success!","religion added successfully.");
        },
        error => {
        this.addError("Failed!","Could not add religion.");
        }

        );
        }


      ReligionList():void{
        this.managegenderService.getReligion().subscribe(data => {
          this.religionsList = data;
          console.log(data);
        }
        );
        }

        goToAddReligion(religion: ReligionData){
          this.router.navigate(['addReligion']);
          this.religionDialog=true;
        }

        importReligion(religion: ReligionData){
          this.router.navigate(['importReligion']);
          this.religionImportDialog=true;
         }


        editReligion(religion: ReligionData){
          this.selectedReligion = {...religion};
          this.religionEditDialog=true;
         }

         updateReligion(){
          this.managegenderService.createReligion(this.selectedReligion).subscribe(
            () => {
              this.addSuccess("Success!","Religion information updated successfully.");

           },
           () => {
           this.addError("Failed!","Religion creation failed.");
           this.religionDialog = false;
         });
        }

        hideReligionDialog(){
          this.religionDialog = false;
        }

        hideReligionEditDialog(){
          this.religionEditDialog = false;
        }



      // Error Handling
      addSuccess(title:string,message:string) {
        this.messageService.add({severity:'success', summary:title, detail:message});


      }
      addError(title:string,message:string) {
        this.messageService.add({severity:'error', summary:title, detail:message});

      }

}
