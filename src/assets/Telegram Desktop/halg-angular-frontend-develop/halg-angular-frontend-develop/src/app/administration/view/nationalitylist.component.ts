import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { NationalityData, StatesData, LocalGovernmentAreasData } from '../domain/nationality.data';
import {ManageNationalityService} from '../service/manage.nationality.service';
import { Location } from '@angular/common';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import {MessageService,Message} from 'primeng/api';
import { MetadataConfigService } from 'src/app/administration/service/metadata-config.service';


@Component({
  selector: 'app-nationalitylist',
  template: `<p-toast position="top-center"></p-toast>
  <p-tabView [(activeIndex)]="activeindex">
  <p-tabPanel header="Nationality">
  <div class="p-grid">
  <div class="p-col-12">

      <div class="card">
          <p-toolbar styleClass="p-mb-4">
              <ng-template pTemplate="left">
                  <button pButton pRipple label="Add Nationality" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddNationality()"></button>
                  <button pButton pRipple label="Delete Nationality" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
              </ng-template>

              <ng-template pTemplate="right">
                  <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importNationality()">
                          </button>
                          <button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
              </ng-template>
          </p-toolbar>
          <p-table #nat [value]="nationalityList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code','description']"
       [rowHover]="true" dataKey="nationality_id" [(selection)]="selectedNationality"
          styleClass="p-datatable-customers"
          currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

          <ng-template pTemplate="caption">
              <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                  <h5 class="p-m-0">Nationality Listing</h5>
                  <span class="p-input-icon-left">
                  <i class="pi pi-search"></i>
                  <input pInputText type="text" (input)="nat.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
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
          <ng-template pTemplate="body" let-Nationality>
              <tr>
                  <td>
                      <p-tableCheckbox [value]="Nationality"></p-tableCheckbox>
                  </td>

                  <td>
                      {{Nationality.name}}
                  </td>
                  <td>
                      {{Nationality.code}}
                  </td>
                  <td>
                      {{Nationality.description}}
                  </td>

                  <td>
                      <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editNationality(Nationality)"></button>
                      <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteProduct(product)"></button>
                  </td>
              </tr>
          </ng-template>
          <ng-template pTemplate="summary">
              <div class="p-d-flex p-ai-center p-jc-between">
                  In total there are {{nationalityList ? nationalityList.length : 0 }} Nationality.
              </div>
          </ng-template>
      </p-table>

          </div>

          <p-dialog [(visible)]="nationalityDialog" [style]="{width: '650px'}" header="New Nationality" [modal]="true" styleClass="p-fluid">
              <ng-template pTemplate="content">
        <div  class="p-col-12 p-fluid p-formgrid p-grid">
           <div class="p-col-6 p-field">
                  <label for="name">Name</label>
                  <input  type="text" pInputText [(ngModel)]="nationalitycreatedata.name" aria-describedby="username-help"
                  placeholder="Enter name">

              </div>
         <div class="p-col-6 p-field">
                  <label for="code">Code</label>
                  <input id="code" type="code" pInputText [(ngModel)]="nationalitycreatedata.code" aria-describedby="password-help" placeholder="Enter code">

              </div>
        </div>

        <div class="p-grid p-formgrid p-fluid">
                  <div class="p-col-12 p-field">
                      <label for="description">Description</label>
                      <textarea rows="5" cols="30" placeholder="Description" pInputTextarea  [(ngModel)]="nationalitycreatedata.description" placeholder="Enter Description"></textarea>
                  </div>

              </div>


              </ng-template>
              <ng-template pTemplate="footer">
                            <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideNationalityDialog()"></button>
                            <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addNationality()"></button>
                        </ng-template>
            </p-dialog>


            <p-dialog [(visible)]="nationalityEditDialog" [style]="{width: '650px'}" header="Nationality Details" [modal]="true" styleClass="p-fluid">

              <ng-template pTemplate="content">
                  <div class="p-col-12 p-fluid p-formgrid p-grid">
                  <div class="p-col-12 p-field">
                      <label for="name">Name</label>
                      <input id="name" type="name" pInputText [(ngModel)]="selectedNationality.name">
                  </div>
                  <div class="p-col-6 p-field">
                      <label for="code">Code</label>
                      <input id="code" type="code" pInputText [(ngModel)]="selectedNationality.code">
                  </div>
                  <div class="p-col-6 p-field">
                      <label for="description"> Description </label>
                      <input id="description" type="description" pInputText [(ngModel)]="selectedNationality.description">
                  </div>
                  <div class="p-col-6 p-field">
                          <label for="created_by">Created_By</label>
                          <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedNationality.created_by">
                      </div>
                      <div class="p-col-6 p-field">
                          <label for="created_date">Created_Date</label>
                          <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedNationality.created_date">
                      </div>

                  </div>
                  </ng-template>

                  <ng-template pTemplate="footer">
                      <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideNationalityEditDialog()"></button>
                      <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateNationality()"></button>
                  </ng-template>
                  </p-dialog>


                  <p-dialog [(visible)]="nationalityImportDialog" [style]="{width: '800px'}" header="Import Nationality" [modal]="true" styleClass="p-fluid">

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

<p-tabPanel header="State">
<div class="p-grid">
	<div class="p-col-12">

        <div class="card">
			<p-toolbar styleClass="p-mb-4">
				<ng-template pTemplate="left">
					<button pButton pRipple label="Add States" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddStates()"></button>
					<button pButton pRipple label="Delete States" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
				</ng-template>

				<ng-template pTemplate="right">
                    <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importStates()">
                    </button>
					<button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
				</ng-template>
            </p-toolbar>
            <p-table #sta [value]="statesList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code', 'description']"
         [rowHover]="true" dataKey="state_id" [(selection)]="selectedStates"
            styleClass="p-datatable-customers"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

            <ng-template pTemplate="caption">
                <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                    <h5 class="p-m-0">States Listing</h5>
                    <span class="p-input-icon-left">
                    <i class="pi pi-search"></i>
                    <input pInputText type="text" (input)="sta.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
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
            <ng-template pTemplate="body" let-States>
                <tr>
                    <td>
                        <p-tableCheckbox [value]="States"></p-tableCheckbox>
                    </td>

                    <td><span class="p-column-title"></span>
                        {{States.name}}
                    </td>
                    <td><span class="p-column-title"></span>
                        {{States.code}}
                    </td>
                    <td><span class="p-column-title"></span>
                        {{States.description}}
                    </td>

                    <td>
                        <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editStates(States)"></button>
                        <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteProduct(product)"></button>
                    </td>
                </tr>
            </ng-template>
            <ng-template pTemplate="summary">
                <div class="p-d-flex p-ai-center p-jc-between">
                    In total there are {{statesList ? statesList.length : 0 }} States.
                </div>
            </ng-template>
        </p-table>
            </div>


            <p-dialog [(visible)]="statesDialog" [style]="{width: '650px'}" header="New States" [modal]="true" styleClass="p-fluid">
                <ng-template pTemplate="content">
                    <div class="p-grid p-formgrid p-fluid">

                    <div class="p-col-4 p-field">
                      <label for="nationality_id">Nationality</label>
                      <p-dropdown inputId="nationality_id" [options]="nationalityMap" [(ngModel)]="selectedNationality"
                      optionLabel="name" placeholder="Choose a Nationality"></p-dropdown>

                  </div>

                        <div class="p-col-4 p-field">
                            <label for="name">States Name</label>
                            <input id="name" type="name" pInputText [(ngModel)]="statescreatedata.name" aria-describedby="name-help"
                            placeholder="Enter State Name">

                        </div>

                        <div class="p-col-4 p-field">
                            <label for="code">Code </label>
                            <input id="code" type="code" pInputText [(ngModel)]="statescreatedata.code" aria-describedby="code-help"
                            placeholder="Enter State Code" required>
                        </div>

                        <div class="p-col-12 p-field">
                            <label for="description">States Description </label>
                            <textarea rows="5" cols="30" placeholder="Enter State Description" [(ngModel)]="statescreatedata.description" pInputTextarea ></textarea>
                        </div>


                    </div>

                </ng-template>
                <ng-template pTemplate="footer">
                              <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideStatesDialog()"></button>
                              <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addStates()"></button>
                          </ng-template>
              </p-dialog>

            <p-dialog [(visible)]="statesEditDialog" [style]="{width: '650px'}" header="States Details" [modal]="true" styleClass="p-fluid">

                <ng-template pTemplate="content">
                    <div class="p-col-12 p-fluid p-formgrid p-grid">
                    <div class="p-col-12 p-field">
                        <label for="name">Name</label>
                        <input id="name" pInputText [(ngModel)]="selectedStates.name">
                    </div>

                    <div class="p-col-6 p-field">
                    <label for="nationality_id">States Type </label>
                    <p-dropdown inputId="nationality_id" [options]="nationalityMap" [(ngModel)]="selectedStates.nationality_id"
                    optionLabel="name" optionValue="nationality_id" placeholder="Choose a Nationality"></p-dropdown>

                </div>


                    <div class="p-col-6 p-field">
                        <label for="code">Code</label>
                        <input id="code" pInputText [(ngModel)]="selectedStates.code">
                    </div>
                    <div class="p-col-6 p-field">
                <label for="created_by">Created_By</label>
                <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedStates.created_by">
            </div>
            <div class="p-col-6 p-field">
                <label for="created_date">Created_Date</label>
                <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedStates.created_date">
            </div>

            <div class="p-col-12 p-field">
                <label for="description">Description </label>
                <textarea id="description" pInputText [(ngModel)]="selectedStates.description" required rows="3" cols="20"></textarea>
            </div>


                    </div>
                    </ng-template>

                    <ng-template pTemplate="footer">
                        <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideStatesEditDialog()"></button>
                        <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateStates()"></button>
                    </ng-template>
                    </p-dialog>


                    <p-dialog [(visible)]="statesImportDialog" [style]="{width: '800px'}" header="Import States" [modal]="true" styleClass="p-fluid">
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
                                                        <p-table #dt [value]="heirarchyunit" [columns]="" [rows]="10" [paginator]="true" [globalFilterFields]="['name','country.name','representative.name','States']"
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
                                                           <td><span class="p-column-title">States</span>
                                                               <span [class]="'product-badge States-' + (product.inventoryStates ? product.inventoryStates.toLowerCase() : '')">{{product.inventoryStates}}</span>
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

<p-tabPanel header="Local Government Area">
<div class="p-grid">
	<div class="p-col-12">

        <div class="card">
			<p-toolbar styleClass="p-mb-4">
				<ng-template pTemplate="left">
					<button pButton pRipple label="Add Local Government Areas" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddLocalGovernmentAreas()"></button>
					<button pButton pRipple label="Delete Local Government Areas" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
				</ng-template>

				<ng-template pTemplate="right">
                    <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importLocalGovernmentAreas()">
                    </button>
					<button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
				</ng-template>
            </p-toolbar>
            <p-table #lga [value]="localGovernmentAreasList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code', 'description']"
         [rowHover]="true" dataKey="local_government_area_id" [(selection)]="selectedLocalGovernmentAreas"
            styleClass="p-datatable-customers"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

            <ng-template pTemplate="caption">
                <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                    <h5 class="p-m-0">Local Government Areas Listing</h5>
                    <span class="p-input-icon-left">
                    <i class="pi pi-search"></i>
                    <input pInputText type="text" (input)="lga.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
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
            <ng-template pTemplate="body" let-LocalGovernmentAreas>
                <tr>
                    <td>
                        <p-tableCheckbox [value]="LocalGovernmentAreas"></p-tableCheckbox>
                    </td>

                    <td><span class="p-column-title"></span>
                        {{LocalGovernmentAreas.name}}
                    </td>
                    <td><span class="p-column-title"></span>
                        {{LocalGovernmentAreas.code}}
                    </td>
                    <td><span class="p-column-title"></span>
                        {{LocalGovernmentAreas.description}}
                    </td>

                    <td>
                        <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editLocalGovernmentAreas(LocalGovernmentAreas)"></button>
                        <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteProduct(product)"></button>
                    </td>
                </tr>
            </ng-template>
            <ng-template pTemplate="summary">
                <div class="p-d-flex p-ai-center p-jc-between">
                    In total there are {{localGovernmentAreasList ? localGovernmentAreasList.length : 0 }} LocalGovernmentAreas.
                </div>
            </ng-template>
        </p-table>
            </div>


            <p-dialog [(visible)]="localGovernmentAreasDialog" [style]="{width: '650px'}" header="New Local Government Areas" [modal]="true" styleClass="p-fluid">
                <ng-template pTemplate="content">
                    <div class="p-grid p-formgrid p-fluid">

                    <div class="p-col-4 p-field">
                      <label for="state_id">States</label>
                      <p-dropdown inputId="state_id" [options]="statesMap" [(ngModel)]="selectedStates"
                      optionLabel="name" placeholder="Choose a State"></p-dropdown>

                  </div>

                        <div class="p-col-4 p-field">
                            <label for="name">Local Government Area Name</label>
                            <input id="name" type="name" pInputText [(ngModel)]="localGovernmentAreascreatedata.name" aria-describedby="name-help"
                            placeholder="Enter Name">

                        </div>

                        <div class="p-col-4 p-field">
                            <label for="code">Local Government Area Code </label>
                            <input id="code" type="code" pInputText [(ngModel)]="localGovernmentAreascreatedata.code" aria-describedby="code-help"
                            placeholder="Enter Code" required>
                        </div>

                        <div class="p-col-12 p-field">
                            <label for="description">Local Government Area Description </label>
                            <textarea rows="5" cols="30" placeholder="Enter Description" [(ngModel)]="localGovernmentAreascreatedata.description" pInputTextarea ></textarea>
                        </div>


                    </div>

                </ng-template>
                <ng-template pTemplate="footer">
                              <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideLocalGovernmentAreasDialog()"></button>
                              <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addLocalGovernmentAreas()"></button>
                          </ng-template>
              </p-dialog>

            <p-dialog [(visible)]="localGovernmentAreasEditDialog" [style]="{width: '650px'}" header="Local Government Areas Details" [modal]="true" styleClass="p-fluid">

                <ng-template pTemplate="content">
                    <div class="p-col-12 p-fluid p-formgrid p-grid">
                    <div class="p-col-12 p-field">
                        <label for="name">Name</label>
                        <input id="name" pInputText [(ngModel)]="selectedLocalGovernmentAreas.name">
                    </div>

                    <div class="p-col-6 p-field">
                    <label for="state_id">Local Government Areas </label>
                    <p-dropdown inputId="state_id" [options]="statesMap" [(ngModel)]="selectedLocalGovernmentAreas.state_id"
                    optionLabel="name" optionValue="state_id" placeholder="Choose a State"></p-dropdown>

                </div>


                    <div class="p-col-6 p-field">
                        <label for="code">Code</label>
                        <input id="code" pInputText [(ngModel)]="selectedLocalGovernmentAreas.code">
                    </div>
                    <div class="p-col-6 p-field">
                <label for="created_by">Created_By</label>
                <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedLocalGovernmentAreas.created_by">
            </div>
            <div class="p-col-6 p-field">
                <label for="created_date">Created_Date</label>
                <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedLocalGovernmentAreas.created_date">
            </div>

            <div class="p-col-12 p-field">
                <label for="description">Description </label>
                <textarea id="description" pInputText [(ngModel)]="selectedLocalGovernmentAreas.description" required rows="3" cols="20"></textarea>
            </div>


                    </div>
                    </ng-template>

                    <ng-template pTemplate="footer">
                        <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideLocalGovernmentAreasEditDialog()"></button>
                        <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateLocalGovernmentAreas()"></button>
                    </ng-template>
                    </p-dialog>


                    <p-dialog [(visible)]="localGovernmentAreasImportDialog" [style]="{width: '800px'}" header="Import LocalGovernmentAreas" [modal]="true" styleClass="p-fluid">
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
                                                        <p-table #dt [value]="heirarchyunit" [columns]="" [rows]="10" [paginator]="true" [globalFilterFields]="['name','country.name','representative.name','LocalGovernmentAreas']"
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
                                                           <td><span class="p-column-title">LocalGovernmentAreas</span>
                                                               <span [class]="'product-badge LocalGovernmentAreas-' + (product.inventoryLocalGovernmentAreas ? product.inventoryLocalGovernmentAreas.toLowerCase() : '')">{{product.inventoryLocalGovernmentAreas}}</span>
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
  styleUrls: ['./nationalitylist.component.scss'],
  providers: [MessageService]
})
export class NationalitylistComponent implements OnInit {
  nationalitycreatedata = {} as NationalityData;
  statescreatedata = {} as StatesData;
  localGovernmentAreascreatedata = {} as LocalGovernmentAreasData;


  nationalityMap: NationalityData[];
  statesMap: StatesData[];


  nationalityList:any;
  selectedNationality: NationalityData;
  nationalityDialog: boolean;
  nationalityEditDialog: boolean;
  nationalityImportDialog: boolean;

  statesList:any;
  selectedStates: StatesData;
  statesDialog: boolean;
  statesImportDialog: boolean;
  statesEditDialog: boolean;

  localGovernmentAreasList:any;
  selectedLocalGovernmentAreas: LocalGovernmentAreasData;
  localGovernmentAreasDialog: boolean;
  localGovernmentAreasImportDialog: boolean;
  localGovernmentAreasEditDialog: boolean;

  activeindex: number = 0;

  constructor(private messageService: MessageService,private router: Router,private location: Location,
    private metadataConfigService: MetadataConfigService, private route:ActivatedRoute, private managenationalityService:ManageNationalityService, private breadcrumbService: AppBreadcrumbService) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['/dashboard'] },
      { label: 'Metadata', routerLink: ['/metadatalist'] },
      { label: 'List Nationality', routerLink: ['/nationalitylist'] }    ]);
   }

  ngOnInit(): void {
    this.NationalityList();
    this.LocalGovernmentAreasList();
    this.StatesList();
    this.loadConfigMetadata();

    this.activeindex = parseInt(this.route.snapshot.paramMap.get('index'));

  }

  protected loadConfigMetadata(){

    this.metadataConfigService.getNationalityList().subscribe(p => {this.nationalityMap = p});
    this.metadataConfigService.getStatesList().subscribe(p => {this.statesMap = p});
  }

  addNationality(){
  this.nationalitycreatedata.created_by = +sessionStorage.getItem("userid");
  this.nationalitycreatedata.created_date = new Date ();
  this.managenationalityService.createNationality(this.nationalitycreatedata).subscribe(
    data => {
      this.addSuccess("Success!","Nationality added successfully.");
  },
  error => {
  this.addError("Failed!","Could not add Nationality.");
  }

  );
  }

  NationalityList():void{
    this.managenationalityService.getNationalitys().subscribe(data => {
      this.nationalityList = data;
      console.log(data);
    }
    );
    }

    goToAddNationality(Nationality: NationalityData){
      this.router.navigate(['addNationality']);
      this.nationalityDialog=true;
    }


    importNationality(Nationality: NationalityData){
      this.router.navigate(['importNationality']);
      this.nationalityImportDialog=true;
    }

  goBack(){
    this.location.back();
    }

    editNationality(nationality: NationalityData){
      this.selectedNationality = {...nationality};
      this.nationalityEditDialog=true;
     }

     updateNationality(){
      this.managenationalityService.createNationality(this.selectedNationality).subscribe(
        () => {
          this.addSuccess("Success!","Nationality information updated successfully.");

       },
       () => {
       this.addError("Failed!","Nationality creation failed.");
       this.nationalityDialog = false;
     });
    }



    hideNationalityDialog(){
      this.nationalityDialog = false;
    }

    hideNationalityEditDialog(){
      this.nationalityEditDialog = false;
    }


    // States Methods

    addStates(){
      this.statescreatedata.created_by = +sessionStorage.getItem("userid");
      this.statescreatedata.created_date = Date.now();
      this.statescreatedata.nationality_id = this.selectedNationality.nationality_id;
      this.managenationalityService.createStates(this.statescreatedata).subscribe(
        data => {
          this.addSuccess("Success!","States added successfully.");
      },
      error => {
      this.addError("Failed!","Could not add States.");
      }

      );
      }

    StatesList():void{
      this.managenationalityService.getStatess().subscribe(data => {
        this.statesList = data;
        console.log(data);
      }
      );
      }
        goToAddStates(states: StatesData){
          this.router.navigate(['addStates']);
          this.statesDialog=true;
        }

        importStates(){
          this.router.navigate(['importStates']);
          this.statesImportDialog=true;
        }

        editStates(states: StatesData){
        this.selectedStates = {...states};
        this.statesEditDialog=true;
       }
       updateStates(){
         this.managenationalityService.createStates(this.selectedStates).subscribe(
          () => {
            this.addSuccess("Success!","States information updated successfully.");

         },
         () => {
         this.addError("Failed!","States creation failed.");
         this.statesDialog = false;
       });
      }

       hideStatesDialog(){
         this.statesDialog = false;
       }

       hideStatesEditDialog(){
        this.statesEditDialog = false;
      }


      //Local Government Methods
      addLocalGovernmentAreas(){
        this.localGovernmentAreascreatedata.created_by = +sessionStorage.getItem("userid");
        this.localGovernmentAreascreatedata.created_date = Date.now();
        this.localGovernmentAreascreatedata.state_id = this.selectedStates.state_id;
        this.managenationalityService.createLocalGovernmentArea(this.localGovernmentAreascreatedata).subscribe(
          data => {
            this.addSuccess("Success!","Local Government Areas added successfully.");
        },
        error => {
        this.addError("Failed!","Could not add Local Government Areas.");
        }

        );
        }

      LocalGovernmentAreasList():void{
        this.managenationalityService.getLocalGovernmentAreas().subscribe(data => {
          this.localGovernmentAreasList = data;
          console.log(data);
        }
        );
        }
          goToAddLocalGovernmentAreas(LocalGovernmentAreas: LocalGovernmentAreasData){
            this.router.navigate(['addLocalGovernmentAreas']);
            this.localGovernmentAreasDialog=true;
          }

          importLocalGovernmentAreas(){
            this.router.navigate(['importLocalGovernmentAreas']);
            this.localGovernmentAreasImportDialog=true;
          }

          editLocalGovernmentAreas(LocalGovernmentAreas: LocalGovernmentAreasData){
          this.selectedLocalGovernmentAreas = {...LocalGovernmentAreas};
          this.localGovernmentAreasEditDialog=true;
         }
         updateLocalGovernmentAreas(){
           this.managenationalityService.createLocalGovernmentArea(this.selectedLocalGovernmentAreas).subscribe(
            () => {
              this.addSuccess("Success!","Local Government Areas information updated successfully.");

           },
           () => {
           this.addError("Failed!","Local Government Areas creation failed.");
           this.localGovernmentAreasDialog = false;
         });
        }

         hideLocalGovernmentAreasDialog(){
           this.localGovernmentAreasDialog = false;
         }

         hideLocalGovernmentAreasEditDialog(){
          this.localGovernmentAreasEditDialog = false;
        }

    //Errors Handling
    addSuccess(title:string,message:string) {
      this.messageService.add({severity:'success', summary:title, detail:message});


    }
    addError(title:string,message:string) {
      this.messageService.add({severity:'error', summary:title, detail:message});

    }
}

