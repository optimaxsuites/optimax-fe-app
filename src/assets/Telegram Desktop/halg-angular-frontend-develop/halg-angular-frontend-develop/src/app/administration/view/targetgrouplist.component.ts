import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { TargetGroupData, CareEntryPointData, RefferedfromData, DisabilityData  } from '../domain/targetgroup.data';
import {ManageTargetgroupService} from '../service/manage.targetgroup.service';
import { Location } from '@angular/common';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import {MessageService,Message} from 'primeng/api';

@Component({
  selector: 'app-targetgrouplist',
  template: `<p-toast position="top-center"></p-toast>
  <p-tabView [(activeIndex)]="activeindex">
  <p-tabPanel header="Target Group" leftIcon="fa fa-pills">
  <div class="p-grid">
	<div class="p-col-12">

        <div class="card">
			<p-toolbar styleClass="p-mb-4">
				<ng-template pTemplate="left">
					<button pButton pRipple label="Add Target-Group" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddTargetgroup()"></button>
					<button pButton pRipple label="Delete Target-Group" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
				</ng-template>

				<ng-template pTemplate="right">
                    <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importTargetgroup()">
                    </button>
					<button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
				</ng-template>
            </p-toolbar>
            <p-table #trg [value]="targetgroupList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code']"
         [rowHover]="true" dataKey="target_group_id" [(selection)]="selectedTargetgroup"
            styleClass="p-datatable-customers"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

            <ng-template pTemplate="caption">
                <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                    <h5 class="p-m-0">Target-Group Listing</h5>
                    <span class="p-input-icon-left">
                    <i class="pi pi-search"></i>
                    <input pInputText type="text" (input)="trg.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
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
            <ng-template pTemplate="body" let-targetgroup>
                <tr>
                    <td>
                        <p-tableCheckbox [value]="targetgroup"></p-tableCheckbox>
                    </td>
                    <td><span class="p-column-title"></span>
                        {{targetgroup.name}}
                    </td>
                    <td><span class="p-column-title"></span>
                        {{targetgroup.code}}
                    </td>
                    <td><span class="p-column-title"></span>
                        {{targetgroup.description}}
                    </td>

                    <td>
                        <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editTargetgroup(targetgroup)"></button>
                        <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteProduct(product)"></button>
                    </td>
                </tr>
            </ng-template>
            <ng-template pTemplate="summary">
                <div class="p-d-flex p-ai-center p-jc-between">
                    In total there are {{targetgroupList ? targetgroupList.length : 0 }} targetgroup.
                </div>
            </ng-template>
        </p-table>
            </div>

            <p-dialog [(visible)]="targetgroupDialog" [style]="{width: '650px'}" header="New Target Group" [modal]="true" styleClass="p-fluid">
                <ng-template pTemplate="content">
          <div  class="p-col-12 p-fluid p-formgrid p-grid">
             <div class="p-col-6 p-field">
                    <label for="name">Name</label>
                    <input  type="text" pInputText [(ngModel)]="targetgroupcreatedata.name" aria-describedby="username-help"
                    placeholder="Enter name">

                </div>
           <div class="p-col-6 p-field">
                    <label for="code">Code</label>
                    <input id="code" type="code" pInputText [(ngModel)]="targetgroupcreatedata.code" aria-describedby="password-help" placeholder="Enter code">

                </div>
          </div>

          <div class="p-grid p-formgrid p-fluid">
                    <div class="p-col-12 p-field">
                        <label for="description">Description</label>
                        <textarea rows="5" cols="30" placeholder="Description" pInputTextarea  [(ngModel)]="targetgroupcreatedata.description" placeholder="Enter code"></textarea>
                    </div>

                </div>


                </ng-template>
                <ng-template pTemplate="footer">
                              <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideTargetgroupDialog()"></button>
                              <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addTargetgroup()"></button>
                          </ng-template>
              </p-dialog>

              <p-dialog [(visible)]="targetgroupEditDialog" [style]="{width: '650px'}" header="Target Group Details" [modal]="true" styleClass="p-fluid">

                <ng-template pTemplate="content">
                    <div class="p-col-12 p-fluid p-formgrid p-grid">
                    <div class="p-col-12 p-field">
                        <label for="name">Name</label>
                        <input id="name" pInputText [(ngModel)]="selectedTargetgroup.name">
                    </div>
                    <div class="p-col-6 p-field">
                        <label for="code">Code</label>
                        <input id="code" pInputText [(ngModel)]="selectedTargetgroup.code">
                    </div>

            <div class="p-col-6 p-field">
                <label for="description">Description </label>
                <input id="description" type="description" pInputText [(ngModel)]="selectedTargetgroup.description">
            </div>

            <div class="p-col-6 p-field">
                <label for="created_by">Created_By</label>
                <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedTargetgroup.created_by">
            </div>
            <div class="p-col-6 p-field">
                <label for="created_date">Created_Date</label>
                <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedTargetgroup.created_date">
            </div>
                    </div>
                    </ng-template>

                    <ng-template pTemplate="footer">
                        <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideTargetgroupEditDialog()"></button>
                        <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateTargetgroup()"></button>
                    </ng-template>
</p-dialog>


<p-dialog [(visible)]="targetgroupImportDialog" [style]="{width: '800px'}" header="Import Target Group" [modal]="true" styleClass="p-fluid">
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

<p-tabPanel header="Care Entry Point" leftIcon="fa fa-frown">
<div class="p-grid">
    <div class="p-col-12">

          <div class="card">
        <p-toolbar styleClass="p-mb-4">
          <ng-template pTemplate="left">
            <button pButton pRipple label="Add Care Entry Point" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddCareentrypoint()"></button>
            <button pButton pRipple label="Delete Care Entry Point" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
          </ng-template>

          <ng-template pTemplate="right">
                      <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importCareentrypoint()">
                      </button>
            <button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
          </ng-template>
              </p-toolbar>
              <p-table #cep [value]="careentrypointList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code', 'description']"
           [rowHover]="true" dataKey="care_entry_point_id" [(selection)]="selectedCareentrypoint"
              styleClass="p-datatable-customers"
              currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

              <ng-template pTemplate="caption">
                  <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                      <h5 class="p-m-0">Care Entry Point Listing</h5>
                      <span class="p-input-icon-left">
                      <i class="pi pi-search"></i>
                      <input pInputText type="text" (input)="cep.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
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
              <ng-template pTemplate="body" let-careentrypoint>
                  <tr>
                      <td>
                          <p-tableCheckbox [value]="careentrypoint"></p-tableCheckbox>
                      </td>
                      <td><span class="p-column-title"></span>
                          {{careentrypoint.name}}
                      </td>
                      <td><span class="p-column-title"></span>
                          {{careentrypoint.code}}
                      </td>
                      <td><span class="p-column-title"></span>
                          {{careentrypoint.description}}
                      </td>

                      <td>
                          <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editCareentrypoint(careentrypoint)"></button>
                          <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteProduct(product)"></button>
                      </td>
                  </tr>
              </ng-template>
              <ng-template pTemplate="summary">
                  <div class="p-d-flex p-ai-center p-jc-between">
                      In total there are {{careentrypointList ? careentrypointList.length : 0 }} care entry point.
                  </div>
              </ng-template>
          </p-table>
              </div>

              <p-dialog [(visible)]="careentrypointDialog" [style]="{width: '650px'}" header="New Care Entry Point" [modal]="true" styleClass="p-fluid">
                  <ng-template pTemplate="content">
            <div  class="p-col-12 p-fluid p-formgrid p-grid">
               <div class="p-col-6 p-field">
                      <label for="name">Name</label>
                      <input  type="text" pInputText [(ngModel)]="careentrypointcreatedata.name" aria-describedby="username-help"
                      placeholder="Enter name">

                  </div>
             <div class="p-col-6 p-field">
                      <label for="code">Code</label>
                      <input id="code" type="code" pInputText [(ngModel)]="careentrypointcreatedata.code" aria-describedby="password-help" placeholder="Enter code">

                  </div>
            </div>

            <div class="p-grid p-formgrid p-fluid">
                      <div class="p-col-12 p-field">
                          <label for="description">Description</label>
                          <textarea rows="5" cols="30" placeholder="Description" pInputTextarea  [(ngModel)]="careentrypointcreatedata.description" placeholder="Enter code"></textarea>
                      </div>

                  </div>


                  </ng-template>
                  <ng-template pTemplate="footer">
                                <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideCareentrypointDialog()"></button>
                                <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addCareentrypoint()"></button>
                            </ng-template>
                </p-dialog>

              <p-dialog [(visible)]="careentrypointEditDialog" [style]="{width: '650px'}" header="Care Entry Point Details" [modal]="true" styleClass="p-fluid">

                  <ng-template pTemplate="content">
                      <div class="p-col-12 p-fluid p-formgrid p-grid">
                      <div class="p-col-12 p-field">
                          <label for="name">Name</label>
                          <input id="name" pInputText [(ngModel)]="selectedCareentrypoint.name">
                      </div>
                      <div class="p-col-6 p-field">
                          <label for="code">Code</label>
                          <input id="code" pInputText [(ngModel)]="selectedCareentrypoint.code">
                      </div>

              <div class="p-col-6 p-field">
                  <label for="description">Description </label>
                  <input id="description" type="description" pInputText [(ngModel)]="selectedCareentrypoint.description">
              </div>

              <div class="p-col-6 p-field">
                  <label for="created_by">Created_By</label>
                  <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedCareentrypoint.created_by">
              </div>
              <div class="p-col-6 p-field">
                  <label for="created_date">Created_Date</label>
                  <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedCareentrypoint.created_date">
              </div>
                      </div>
                      </ng-template>

                      <ng-template pTemplate="footer">
                          <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideCareentrypointEditDialog()"></button>
                          <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateCareentrypoint()"></button>
                      </ng-template>
                      </p-dialog>


                      <p-dialog [(visible)]="careentrypointImportDialog" [style]="{width: '800px'}" header="Import Care Entry Point" [modal]="true" styleClass="p-fluid">

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

<p-tabPanel header="Reffered From" leftIcon="fa fa-frown">
<div class="p-grid">
	<div class="p-col-12">

        <div class="card">
			<p-toolbar styleClass="p-mb-4">
				<ng-template pTemplate="left">
					<button pButton pRipple label="Add Reffered From" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddRefferedfrom()"></button>
					<button pButton pRipple label="Delete Reffered From" icon="pi pi-trash" class="p-mb-2" (click)="deleteDisability()" [disabled]="!selectedRefferedfrom || !selectedRefferedfrom.length"></button>
				</ng-template>

				<ng-template pTemplate="right">

                    <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importRefferedfrom()">
                    </button>
					<button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
				</ng-template>
            </p-toolbar>
            <p-table #reff [value]="refferedfromList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code']"
         [rowHover]="true" dataKey="referred_from_id" [(selection)]="selectedRefferedfrom"
            styleClass="p-datatable-customers"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

            <ng-template pTemplate="caption">
                <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                    <h5 class="p-m-0">Reffered From Listing</h5>
                    <span class="p-input-icon-left">
                    <i class="pi pi-search"></i>
                    <input pInputText type="text" (input)="reff.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
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
            <ng-template pTemplate="body" let-refferedfrom>
                <tr>
                    <td>
                        <p-tableCheckbox [value]="refferedfrom"></p-tableCheckbox>
                    </td>
                    <td><span class="p-column-title"></span>
                        {{refferedfrom.name}}
                    </td>
                    <td><span class="p-column-title"></span>
                        {{refferedfrom.code}}
                    </td>
                    <td><span class="p-column-title"></span>
                        {{refferedfrom.description}}
                    </td>

                    <td>
                        <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editRefferedfrom(refferedfrom)"></button>
                        <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteProduct(product)"></button>
                    </td>
                </tr>
            </ng-template>
            <ng-template pTemplate="summary">
                <div class="p-d-flex p-ai-center p-jc-between">
                    In total there are {{refferedfromList ? refferedfromList.length : 0 }} reffered from.
                </div>
            </ng-template>
        </p-table>
            </div>

            <p-dialog [(visible)]="refferedfromDialog" [style]="{width: '650px'}" header="New Reffered From" [modal]="true" styleClass="p-fluid">
                <ng-template pTemplate="content">
          <div  class="p-col-12 p-fluid p-formgrid p-grid">
             <div class="p-col-6 p-field">
                    <label for="name">Name</label>
                    <input  type="text" pInputText [(ngModel)]="refferedfromcreatedata.name" aria-describedby="username-help"
                    placeholder="Enter name">

                </div>
           <div class="p-col-6 p-field">
                    <label for="code">Code</label>
                    <input id="code" type="code" pInputText [(ngModel)]="refferedfromcreatedata.code" aria-describedby="password-help" placeholder="Enter code">

                </div>
          </div>

          <div class="p-grid p-formgrid p-fluid">
                    <div class="p-col-12 p-field">
                        <label for="description">Description</label>
                        <textarea rows="5" cols="30" placeholder="Description" pInputTextarea  [(ngModel)]="refferedfromcreatedata.description" placeholder="Enter code"></textarea>
                    </div>

                </div>


                </ng-template>
                <ng-template pTemplate="footer">
                              <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideRefferedfromDialog()"></button>
                              <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addRefferedfrom()"></button>
                          </ng-template>
              </p-dialog>

            <p-dialog [(visible)]="refferedfromEditDialog" [style]="{width: '650px'}" header="Reffered From Details" [modal]="true" styleClass="p-fluid">

                <ng-template pTemplate="content">
                    <div class="p-col-12 p-fluid p-formgrid p-grid">
                    <div class="p-col-12 p-field">
                        <label for="name">Name</label>
                        <input id="name" pInputText [(ngModel)]="selectedRefferedfrom.name">
                    </div>
                    <div class="p-col-6 p-field">
                        <label for="code">Code</label>
                        <input id="code" pInputText [(ngModel)]="selectedRefferedfrom.code">
                    </div>

            <div class="p-col-6 p-field">
                <label for="description">Description </label>
                <input id="description" type="description" pInputText [(ngModel)]="selectedRefferedfrom.description">
            </div>

            <div class="p-col-6 p-field">
                <label for="created_by">Created_By</label>
                <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedRefferedfrom.created_by">
            </div>
            <div class="p-col-6 p-field">
                <label for="created_date">Created_Date</label>
                <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedRefferedfrom.created_date">
            </div>
                    </div>
                    </ng-template>

                    <ng-template pTemplate="footer">
                        <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideRefferedfromEditDialog()"></button>
                        <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateRefferedfrom()"></button>
                    </ng-template>
</p-dialog>

<p-dialog [(visible)]="refferedfromImportDialog" [style]="{width: '800px'}" header="Import Reffered From" [modal]="true" styleClass="p-fluid">

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

<p-tabPanel header="Disability" >
<div class="p-grid">
  <div class="p-col-12">

      <div class="card">
          <p-toolbar styleClass="p-mb-4">
              <ng-template pTemplate="left">
                  <button pButton pRipple label="Add Disability" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddDisability()"></button>
                  <button pButton pRipple label="Delete Disability" icon="pi pi-trash" class="p-mb-2" (click)="deleteDisability()" [disabled]="!selectedDisability || !selectedDisability.length"></button>
              </ng-template>

              <ng-template pTemplate="right">
                  <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importDisability()">
                          </button>
                          <button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
              </ng-template>
          </p-toolbar>
          <p-table #dsb [value]="disabilityList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code','description']"
       [rowHover]="true" dataKey="disability_id" [(selection)]="selectedDisability"
          styleClass="p-datatable-customers"
          currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

          <ng-template pTemplate="caption">
              <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                  <h5 class="p-m-0">Disability Listing</h5>
                  <span class="p-input-icon-left">
                  <i class="pi pi-search"></i>
                  <input pInputText type="text" (input)="dsb.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
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
          <ng-template pTemplate="body" let-disability>
              <tr>
                  <td>
                      <p-tableCheckbox [value]="disability"></p-tableCheckbox>
                  </td>
                  <td><span class="p-column-title"></span>
                      {{disability.name}}
                  </td>
                  <td><span class="p-column-title"></span>
                      {{disability.code}}
                  </td>
                  <td><span class="p-column-title"></span>
                      {{disability.description}}
                  </td>

                  <td>
                      <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editDisability(disability)"></button>
                      <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteDisability(disability)" ></button>
                  </td>
              </tr>
          </ng-template>
          <ng-template pTemplate="summary">
              <div class="p-d-flex p-ai-center p-jc-between">
                  In total there are {{disabilityList ? disabilityList.length : 0 }} Disability.
              </div>
          </ng-template>
      </p-table>

          </div>

          <p-dialog [(visible)]="disabilityDialog" [style]="{width: '650px'}" header="New Disability" [modal]="true" styleClass="p-fluid">
              <ng-template pTemplate="content">
        <div  class="p-col-12 p-fluid p-formgrid p-grid">
           <div class="p-col-6 p-field">
                  <label for="name">Name</label>
                  <input  type="text" pInputText [(ngModel)]="disabilitycreatedata.name" aria-describedby="username-help"
                  placeholder="Enter name">

              </div>
         <div class="p-col-6 p-field">
                  <label for="code">Code</label>
                  <input id="code" type="code" pInputText [(ngModel)]="disabilitycreatedata.code" aria-describedby="password-help" placeholder="Enter code">

              </div>
        </div>

        <div class="p-grid p-formgrid p-fluid">
                  <div class="p-col-12 p-field">
                      <label for="description">Description</label>
                      <textarea rows="5" cols="30" placeholder="Description" pInputTextarea  [(ngModel)]="disabilitycreatedata.description" placeholder="Enter code"></textarea>
                  </div>

              </div>


              </ng-template>
              <ng-template pTemplate="footer">
                            <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideDisabilityDialog()"></button>
                            <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addDisability()"></button>
                        </ng-template>
            </p-dialog>


            <p-dialog [(visible)]="disabilityEditDialog" [style]="{width: '650px'}" header="Disability Details" [modal]="true" styleClass="p-fluid">

              <ng-template pTemplate="content">
                  <div class="p-col-12 p-fluid p-formgrid p-grid">
                  <div class="p-col-12 p-field">
                      <label for="name">Name</label>
                      <input id="name" type="name" pInputText [(ngModel)]="selectedEditDisability.name">
                  </div>
                  <div class="p-col-6 p-field">
                      <label for="code">Code</label>
                      <input id="code" type="code" pInputText [(ngModel)]="selectedEditDisability.code">
                  </div>
                  <div class="p-col-6 p-field">
                      <label for="description"> Description </label>
                      <input id="description" type="description" pInputText [(ngModel)]="selectedEditDisability.description">
                  </div>
                  <div class="p-col-6 p-field">
                          <label for="created_by">Created_By</label>
                          <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedEditDisability.created_by">
                      </div>
                      <div class="p-col-6 p-field">
                          <label for="created_date">Created_Date</label>
                          <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedEditDisability.created_date">
                      </div>

                  </div>
                  </ng-template>

                  <ng-template pTemplate="footer">
                      <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideDisabilityEditDialog()"></button>
                      <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateDisability()"></button>
                  </ng-template>
                  </p-dialog>


                  <p-dialog [(visible)]="disabilityImportDialog" [style]="{width: '800px'}" header="Import Disability" [modal]="true" styleClass="p-fluid">

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
   <p-tabView >
`,
  styleUrls: ['./targetgrouplist.component.scss'],
  providers: [MessageService]
})
export class TargetgrouplistComponent implements OnInit {
  targetgroupcreatedata = {} as TargetGroupData;
  careentrypointcreatedata = {} as CareEntryPointData;
  refferedfromcreatedata = {} as RefferedfromData;
  disabilitycreatedata = {} as DisabilityData;

  targetgroupList:any;
  selectedTargetgroup: TargetGroupData;
  targetgroupDialog: boolean;
  targetgroupEditDialog: boolean;
  targetgroupImportDialog: boolean;

  careentrypointList:any;
  selectedCareentrypoint: CareEntryPointData;
  careentrypointDialog: boolean;
  careentrypointEditDialog: boolean;
  careentrypointImportDialog: boolean;

  refferedfromList:any;
  selectedRefferedfrom: RefferedfromData;
  refferedfromDialog: boolean;
  refferedfromEditDialog: boolean;
  refferedfromImportDialog: boolean;

  disabilityList:any;
  selectedDisability: DisabilityData[];
  selectedEditDisability: DisabilityData;
  holdDisabilityId: any[];
  disabilityDialog: boolean;
  disabilityEditDialog: boolean;
  disabilityImportDialog: boolean;

  activeindex: number = 0;

  constructor(private messageService: MessageService,private router: Router,
    private route:ActivatedRoute,
    private location: Location,
    private managetargetgroupService:ManageTargetgroupService,
    private breadcrumbService: AppBreadcrumbService) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['/dashboard'] },
      { label: 'Metadata', routerLink: ['/metadatalist'] },
      { label: 'List Target Group', routerLink: ['/targetgrouplist'] }    ]);
   }

  ngOnInit(): void {
    this.TargetgroupList();
    this.DisabilityList();
    this.CareentrypointList();
    this.RefferedfromList();

    this.activeindex = parseInt(this.route.snapshot.paramMap.get('index'));


  }


  addTargetgroup(){
    this.targetgroupcreatedata.created_by = +sessionStorage.getItem("userid");
    this.targetgroupcreatedata.created_date = new Date();
    this.managetargetgroupService.createTargetgroup(this.targetgroupcreatedata).subscribe(
      data => {
        this.addSuccess("Success!","Target-Group added successfully.");
    },
    error => {
    this.addError("Failed!","Could not add Target-Group.");
    }

    );
  }

  TargetgroupList():void{
    this.managetargetgroupService.getTargetgroups().subscribe(data => {
      this.targetgroupList = data;
      console.log(data);
    }
    );
    }


    goToAddTargetgroup(targetgroup: TargetGroupData){
      this.router.navigate(['addTargetgroup']);
      this.targetgroupDialog=true;
    }

    importTargetgroup(){
      this.router.navigate(['importTargetGroup']);
      this.targetgroupImportDialog=true;
    }

    goBack(){
      this.location.back();
    }
    editTargetgroup(targetgroup: TargetGroupData){
    this.selectedTargetgroup = {...targetgroup};
    this.targetgroupEditDialog=true;
   }
   updateTargetgroup(){
     this.managetargetgroupService.createTargetgroup(this.selectedTargetgroup).subscribe(
      () => {
        this.addSuccess("Success!","Target-Group information updated successfully.");

     },
     () => {
     this.addError("Failed!","Target-Group creation failed.");
     this.targetgroupDialog = false;
   });
  }

   addSuccess(title:string,message:string) {
     this.messageService.add({severity:'success', summary:title, detail:message});


   }
   addError(title:string,message:string) {
     this.messageService.add({severity:'error', summary:title, detail:message});

   }

   hideUserDialog(){
     this.targetgroupDialog = false;
   }

   hideTargetgroupDialog(){
    this.targetgroupDialog = false;
  }

  hideTargetgroupEditDialog(){
    this.targetgroupEditDialog = false;
  }



  // Care Entry Point

addCareentrypoint(){
  this.careentrypointcreatedata.created_by = +sessionStorage.getItem("userid");
  this.careentrypointcreatedata.created_date = new Date();
  this.managetargetgroupService.createCareEntryPoint(this.careentrypointcreatedata).subscribe(
    () => {
      this.addSuccess("Success!","Care Entry Point added successfully.");
  },
  () => {
  this.addError("Failed!","Could not add Care Entry Point.");
  }

  );
}

CareentrypointList():void{
  this.managetargetgroupService.getCareEntryPoints().subscribe(data => {
    this.careentrypointList = data;
    console.log(data);
  }
  );
  }
    goToAddCareentrypoint(careentrypoint: CareEntryPointData){
      this.router.navigate(['addCareentrypoint']);
      this.careentrypointDialog=true;
    }

    importCareentrypoint(careentrypoint: CareEntryPointData){
      this.router.navigate(['importCareentrypoint']);
      this.careentrypointImportDialog=true;
    }

    editCareentrypoint(careentrypoint: CareEntryPointData){
    this.selectedCareentrypoint = {...careentrypoint};
    this.careentrypointEditDialog=true;
   }
   updateCareentrypoint(){
     this.managetargetgroupService.createCareEntryPoint(this.selectedCareentrypoint).subscribe(
      () => {
        this.addSuccess("Success!","Care Entry Point information updated successfully.");

     },
     () => {
     this.addError("Failed!","Care Entry Point creation failed.");
     this.careentrypointDialog = false;
   });
  }


   hideCareentrypointDialog(){
     this.careentrypointDialog = false;
   }

   hideCareentrypointEditDialog(){
    this.careentrypointEditDialog = false;
  }



  // Reffered From

  addRefferedfrom(){
    this.refferedfromcreatedata.created_by = +sessionStorage.getItem("userid");
    this.refferedfromcreatedata.created_date = new Date();
    this.managetargetgroupService.createRefferedfrom(this.refferedfromcreatedata).subscribe(
      () => {
        this.addSuccess("Success!","Reffered From added successfully.");
    },
    () => {
    this.addError("Failed!","Could not add Reffered From.");
    }

    );
  }


  RefferedfromList():void{
    this.managetargetgroupService.getRefferedfroms().subscribe(data => {
      this.refferedfromList = data;
      console.log(data);
    }
    );
    }


    goToAddRefferedfrom(refferedfrom: RefferedfromData){
      this.router.navigate(['/addRefferedfrom']);
      this.refferedfromDialog=true;
    }

    importRefferedfrom(refferedfrom: RefferedfromData){
      this.router.navigate(['/importRefferedfrom']);
      this.refferedfromImportDialog=true;
    }
    editRefferedfrom(refferedfrom: RefferedfromData){
    this.selectedRefferedfrom = {...refferedfrom};
    this.refferedfromEditDialog=true;
   }
   updateRefferedfrom(){
     this.managetargetgroupService.createRefferedfrom(this.selectedRefferedfrom).subscribe(
      () => {
        this.addSuccess("Success!","Reffered From information updated successfully.");

     },
     () => {
     this.addError("Failed!","Reffered From  creation failed.");
     this.refferedfromDialog = false;
   });
  }

   hideRefferedfromDialog(){
     this.refferedfromDialog = false;
   }

   hideRefferedfromEditDialog(){
    this.refferedfromEditDialog = false;
  }



  // Disability
  addDisability(){
    this.disabilitycreatedata.created_by = +sessionStorage.getItem("userid");
    this.disabilitycreatedata.created_date = new Date ();
    this.managetargetgroupService.createDisability(this.disabilitycreatedata).subscribe(
      data => {
        this.addSuccess("Success!","Disability added successfully.");
    },
    error => {
    this.addError("Failed!","Could not add Disability.");
    }

    );
    }

    DisabilityList():void{
      this.managetargetgroupService.getDisabilitys().subscribe(data => {
        this.disabilityList = data;
        console.log(data);
      }
      );
      }


     deleteDisability(disability: DisabilityData[]){
        this.selectedDisability = {...disability};
        console.log("selectedDisability value:", this.selectedDisability)
        this.selectedDisability.filter(p => {
          if(p.disability_id){
            this.holdDisabilityId.push(p.disability_id);
          }
        })
        console.log("holdDisability value:",this.holdDisabilityId)
        this.managetargetgroupService.deleteDisability(this.holdDisabilityId)
          .subscribe(
            data => {
              this.addSuccess("Success!","Disability deleted successfully.");


          },
          error => {
          this.addError("Failed!","Could not delete Disability.");
          }
          );
      }
      goToAddDisability(disability: DisabilityData){
        this.router.navigate(['addDisability']);
        this.disabilityDialog=true;
      }


      importDisability(disability: DisabilityData){
        this.router.navigate(['importDisability']);
        this.disabilityImportDialog=true;
      }


      editDisability(Disability: DisabilityData){
        this.selectedEditDisability = {...Disability};
        this.disabilityEditDialog=true;
       }

       updateDisability(){
        this.managetargetgroupService.createDisability(this.selectedEditDisability).subscribe(
          () => {
            this.addSuccess("Success!","Disability information updated successfully.");

         },
         () => {
         this.addError("Failed!","Disability creation failed.");
         this.disabilityDialog = false;
       });
      }


      hideDisabilityDialog(){
        this.disabilityDialog = false;
      }

      hideDisabilityEditDialog(){
        this.disabilityEditDialog = false;
      }


}
