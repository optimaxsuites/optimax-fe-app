import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { ProgramsData, ProgramStageData } from '../domain/programs.data';
import {ManageProgramsService} from '../service/manage.programs.service';
import { Location } from '@angular/common';
import {MessageService} from 'primeng/api';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { MetadataConfigService } from 'src/app/administration/service/metadata-config.service';



@Component({
  selector: 'app-programslist',
  template: `
  <p-toast  position="top-center"></p-toast>
  <p-tabView [(activeIndex)]="activeindex">
  <p-tabPanel header="Programs" leftIcon="fa fa-pills">
  <div class="p-grid">
  <div class="p-col-12">

      <div class="card">
          <p-toolbar styleClass="p-mb-4">
              <ng-template pTemplate="left">
                  <button pButton pRipple label="Add Programs" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddPrograms()"></button>
                  <button pButton pRipple label="Delete Programs" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
              </ng-template>

              <ng-template pTemplate="right">
                  <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importPrograms()">
                          </button>
                          <button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
              </ng-template>
          </p-toolbar>
          <p-table #pglist [value]="programsList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code','description']"
       [rowHover]="true" dataKey="program_id" [(selection)]="selectedPrograms"
          styleClass="p-datatable-customers"
          currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

          <ng-template pTemplate="caption">
              <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                  <h5 class="p-m-0">Programs Listing</h5>
                  <span class="p-input-icon-left">
                  <i class="pi pi-search"></i>
                  <input pInputText type="text" (input)="pglist.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
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
                  <th pSortableColumn="icon">Icon <p-sortIcon field="icon"></p-sortIcon></th>
                  <th pSortableColumn="action">Action <p-sortIcon field="action"></p-sortIcon></th>

              </tr>
          </ng-template>
          <ng-template pTemplate="body" let-Programs>
              <tr>
                  <td>
                      <p-tableCheckbox [value]="Programs"></p-tableCheckbox>
                  </td>

                  <td>
                      {{Programs.name}}
                  </td>
                  <td>
                      {{Programs.code}}
                  </td>
                  <td>
                      {{Programs.description}}
                  </td>
                  <td>
                      {{Programs.icon}}
                  </td>

                  <td>
                      <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editPrograms(Programs)"></button>
                      <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteProduct(product)"></button>
                  </td>
              </tr>
          </ng-template>
          <ng-template pTemplate="summary">
              <div class="p-d-flex p-ai-center p-jc-between">
                  In total there are {{programsList ? programsList.length : 0 }} Programs.
              </div>
          </ng-template>
      </p-table>

          </div>

          <p-dialog [(visible)]="programsDialog" [style]="{width: '650px'}" header="New Programs" [modal]="true" styleClass="p-fluid">
              <ng-template pTemplate="content">
        <div  class="p-col-12 p-fluid p-formgrid p-grid">
           <div class="p-col-6 p-field">
                  <label for="name">Name</label>
                  <input  type="text" pInputText [(ngModel)]="programscreatedata.name" aria-describedby="username-help"
                  placeholder="Enter name">

              </div>
         <div class="p-col-6 p-field">
                  <label for="code">Code</label>
                  <input id="code" type="code" pInputText [(ngModel)]="programscreatedata.code" aria-describedby="password-help" placeholder="Enter code">

              </div>
        </div>

        <div class="p-grid p-formgrid p-fluid">
                  <div class="p-col-12 p-field">
                      <label for="description">Description</label>
                      <textarea rows="5" cols="30" placeholder="Description" pInputTextarea  [(ngModel)]="programscreatedata.description" placeholder="Enter Description"></textarea>
                  </div>

                  <div class="p-col-6 p-field">
                      <label for="icon">Icon Rep</label>
                      <input id="icon" type="icon" pInputText [(ngModel)]="programscreatedata.icon" aria-describedby="password-help" placeholder="Enter icon">
                      </div>

              </div>


              </ng-template>
              <ng-template pTemplate="footer">
                            <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideProgramsDialog()"></button>
                            <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addPrograms()"></button>
                        </ng-template>
            </p-dialog>


            <p-dialog [(visible)]="programsEditDialog" [style]="{width: '650px'}" header="Programs Details" [modal]="true" styleClass="p-fluid">

              <ng-template pTemplate="content">
                  <div class="p-col-12 p-fluid p-formgrid p-grid">
                  <div class="p-col-12 p-field">
                      <label for="name">Name</label>
                      <input id="name" type="name" pInputText [(ngModel)]="selectedPrograms.name">
                  </div>
                  <div class="p-col-6 p-field">
                      <label for="code">Code</label>
                      <input id="code" type="code" pInputText [(ngModel)]="selectedPrograms.code">
                  </div>
                  
                  <div class="p-col-6 p-field">
                      <label for="description"> Description </label>
                      <input id="description" type="description" pInputText [(ngModel)]="selectedPrograms.description">
                  </div>

                  <div class="p-col-6 p-field">
                      <label for="icon"> Icon Rep </label>
                      <input id="icon" type="icon" pInputText [(ngModel)]="selectedPrograms.icon">
                  </div>

                  <div class="p-col-6 p-field">
                          <label for="created_by">Created_By</label>
                          <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedPrograms.created_by">
                      </div>
                      <div class="p-col-6 p-field">
                          <label for="created_date">Created_Date</label>
                          <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedPrograms.created_date">
                      </div>

                  </div>
                  </ng-template>

                  <ng-template pTemplate="footer">
                      <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideProgramsEditDialog()"></button>
                      <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updatePrograms()"></button>
                  </ng-template>
                  </p-dialog>


                  <p-dialog [(visible)]="programsImportDialog" [style]="{width: '800px'}" header="Import Programs" [modal]="true" styleClass="p-fluid">

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


<p-tabPanel header="Program Stage" leftIcon="fa fa-pills">

<div class="p-grid">
	<div class="p-col-12">

        <div class="card">
			<p-toolbar styleClass="p-mb-4">
				<ng-template pTemplate="left">
					<button pButton pRipple label="Add Program Stage" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddProgramStage()"></button>
					<button pButton pRipple label="Delete Program Stage" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
				</ng-template>

				<ng-template pTemplate="right">
                    <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importProgramStage()">
                    </button>
					<button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="go1Back()"></button>
				</ng-template>
            </p-toolbar>
            <p-table #prgmstg [value]="programStageList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code', 'description']"
         [rowHover]="true" dataKey="program_stage_id" [(selection)]="selectedProgramStage"
            styleClass="p-datatable-customers"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

            <ng-template pTemplate="caption">
                <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                    <h5 class="p-m-0">Program Stage Listing</h5>
                    <span class="p-input-icon-left">
                    <i class="pi pi-search"></i>
                    <input pInputText type="text" (input)="prgmstg.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
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
                    <th pSortableColumn="tbl_identifier "> TBL Identifier <p-sortIcon field="form_stage_db_identifier"></p-sortIcon></th>
                    <th pSortableColumn="description">  Description <p-sortIcon field="description"></p-sortIcon></th>

                    <th>Action</th>
                </tr>
            </ng-template>
            <ng-template pTemplate="body" let-programStage>
                <tr>
                    <td>
                        <p-tableCheckbox [value]="programStage"></p-tableCheckbox>
                    </td>
                    <td><span class="p-column-title"></span>
                        {{programStage.name}}
                    </td>

                    <td><span class="p-column-title"></span>
                        {{programStage.code}}
                    </td>
                    <td><span class="p-column-title"></span>
                        {{programStage.form_stage_db_identifier}}
                    </td>
                    <td><span class="p-column-title"></span>
                        {{programStage.description}}
                    </td>

                    <td>
                        <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editProgramStage(programStage)"></button>
                        <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteProduct(product)"></button>
                    </td>
                </tr>
            </ng-template>
            <ng-template pTemplate="summary">
                <div class="p-d-flex p-ai-center p-jc-between">
                    In total there are {{programStageList ? programStageList.length : 0 }} Program Stage.
                </div>
            </ng-template>
        </p-table>
            </div>


            <p-dialog [(visible)]="programStageDialog" [style]="{width: '650px'}" header="New Program Stage" [modal]="true" styleClass="p-fluid">
                <ng-template pTemplate="content">
                    <div class="p-grid p-formgrid p-fluid">



                  <div class="p-col-6 p-field">
                    <label for="programs_id">Programs </label>
                    <p-dropdown inputId="programs_id" [options]="programsMap" [(ngModel)]="selectedPrograms"
                    optionLabel="name" placeholder="Choose a Program"></p-dropdown>

                </div>

                  <div class="p-col-6 p-field">
                    <label for="name">Program Stage Name</label>
                    <input id="name" type="name" pInputText [(ngModel)]="programStagecreatedata.name" aria-describedby="name-help"
                    placeholder="Enter Name">

                </div>

              </div>
              <div class="p-col-12 p-field">
                        <label for="code">Program Stage DB Identifier</label>
                        <input id="code" pInputText [(ngModel)]="programStagecreatedata.form_stage_db_identifier">
                    </div>

              <div class="p-grid p-formgrid p-fluid">
                        <div class="p-col-12 p-field">
                            <label for="code">Code </label>
                            <input id="code" type="code" pInputText [(ngModel)]="programStagecreatedata.code" aria-describedby="code-help"
                            placeholder="Enter  Code" required>
                        </div>

                        <div class="p-col-12 p-field">
                            <label for="description">Program Stage Description </label>
                            <textarea rows="5" cols="30" placeholder="Enter  Description" [(ngModel)]="programStagecreatedata.description" pInputTextarea ></textarea>
                        </div>


                    </div>

                </ng-template>
                <ng-template pTemplate="footer">
                              <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideProgramStageDialog()"></button>
                              <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addProgramStage()"></button>
                          </ng-template>
              </p-dialog>

            <p-dialog [(visible)]="programStageEditDialog" [style]="{width: '750px'}" header="Program Stage Details" [modal]="true" styleClass="p-fluid">

                <ng-template pTemplate="content">
                    <div class="p-col-12 p-fluid p-formgrid p-grid">
                    <div class="p-col-12 p-field">
                        <label for="name">Name</label>
                        <input id="name" pInputText [(ngModel)]="selectedProgramStage.name">
                    </div>

                    <div class="p-col-6 p-field">
                    <label for="programs_id">Programs </label>
                    <p-dropdown inputId="programs_id" [options]="programsMap" [(ngModel)]="selectedProgramStage.program_id"
                    optionLabel="name" optionValue="program_id" placeholder="Choose a Program"></p-dropdown>

                </div>

                    <div class="p-col-6 p-field">
                        <label for="code">Code</label>
                        <input id="code" pInputText [(ngModel)]="selectedProgramStage.code">
                    </div>

                    <div class="p-col-12 p-field">
                        <label for="code">Program Stage DB Identifier</label>
                        <input id="code" pInputText readonly [(ngModel)]="selectedProgramStage.form_stage_db_identifier">
                    </div>

                    <div class="p-col-6 p-field">
                <label for="created_date">Created_Date</label>
                <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedProgramStage.created_date">
            </div>



            <div class="p-col-6 p-field">
                <label for="created_by">Created_By</label>
                <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedProgramStage.created_by">
            </div>

            <div class="p-col-12 p-field">
                <label for="description">Description </label>
                <textarea id="description" pInputText [(ngModel)]="selectedProgramStage.description" required rows="3" cols="20"></textarea>
            </div>

                    </div>
                    </ng-template>

                    <ng-template pTemplate="footer">
                        <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideProgramStageEditDialog()"></button>
                        <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateProgramStage()"></button>
                    </ng-template>
                    </p-dialog>


                    <p-dialog [(visible)]="programStageImportDialog" [style]="{width: '800px'}" header="Import ProgramStage" [modal]="true" styleClass="p-fluid">
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
                                                        <p-table #dt [value]="heirarchyunit" [columns]="" [rows]="10" [paginator]="true" [globalFilterFields]="['name','country.name','representative.name','ProgramStage']"
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
                                                           <td><span class="p-column-title">ProgramStage</span>
                                                               <span [class]="'product-badge ProgramStage-' + (product.inventoryProgramStage ? product.inventoryProgramStage.toLowerCase() : '')">{{product.inventoryProgramStage}}</span>
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

  </p-tabView>`,
  styleUrls: ['./programslist.component.scss'],
  providers: [MessageService]
})
export class ProgramslistComponent implements OnInit {

  programscreatedata = {} as ProgramsData;
  programStagecreatedata = {} as ProgramStageData;

  programsMap: ProgramsData[];


  programsList:any;
  selectedPrograms= {} as ProgramsData;
  programsDialog: boolean;
  programsEditDialog: boolean;
  programsImportDialog: boolean;

  programStageList:any;
  selectedProgramStage: ProgramStageData;
  programStageDialog: boolean;
  programStageImportDialog: boolean;
  programStageEditDialog: boolean;

  activeindex: number = 0;

  constructor(private router: Router,private messageService: MessageService,private location: Location,
    private metadataConfigService: MetadataConfigService, private route:ActivatedRoute,
    private manageProgramsService:ManageProgramsService, private breadcrumbService: AppBreadcrumbService) {

     this.breadcrumbService.setItems([
     { label: 'Dashboard', routerLink: ['/dashboard'] },
     { label: 'Metadata', routerLink: ['/metadatalist'] },
     { label: 'List Programs', routerLink: ['/programslist'] }    ]);
 }

 ngOnInit(): void {
   if(sessionStorage.getItem('username') == null){
     this.addError("Session Expired.","Your current session has expired. Re-login.");
     this.router.navigate(['']);
   }
   else{

    this.loadConfigMetadata();
    this.activeindex = parseInt(this.route.snapshot.paramMap.get('index'));

}
 }

 protected loadConfigMetadata(){
this.ProgramsList();
this.ProgramStageList();
  this.metadataConfigService.getProgramsList().subscribe(p => {this.programsMap = p});
}

 addPrograms(){
  this.programscreatedata.created_by = +sessionStorage.getItem("userid");
  this.programscreatedata.created_date = Date.now ();
  this.manageProgramsService.createPrograms(this.programscreatedata).subscribe(
    data => {
      this.addSuccess("Success!","Programs added successfully.");
  },
  error => {
  this.addError("Failed!","Could not add Programs.");
  }

  );
  }

  ProgramsList():void{
    this.manageProgramsService.getProgramss().subscribe(data => {
      this.programsList = data;

    }
    );
    }

    goToAddPrograms(programs: ProgramsData){
      this.router.navigate(['addPrograms']);
      this.programsDialog=true;
    }


    importPrograms(programs: ProgramsData){
      this.router.navigate(['importPrograms']);
      this.programsImportDialog=true;
    }

  goBack(){
    this.location.back();
    }

    editPrograms(programs: ProgramsData){
      this.selectedPrograms = {...programs};
      this.programsEditDialog=true;
     }

     updatePrograms(){
      this.manageProgramsService.createPrograms(this.selectedPrograms).subscribe(
        () => {
          this.addSuccess("Success!","Programs information updated successfully.");

       },
       () => {
      this.addError("Failed!","Programs creation failed.");

      this.programsDialog = false;
    });
    }



    hideProgramsDialog(){
      this.programsDialog = false;
    }

    hideProgramsEditDialog(){
      this.programsEditDialog = false;
    }


    //Programs Stage Methods

    addProgramStage(){
      this.programStagecreatedata.created_by = +sessionStorage.getItem("userid");
      this.programStagecreatedata.created_date = Date.now();
      this.programStagecreatedata.program_id = this.selectedPrograms.program_id;
      this.manageProgramsService.createProgramStage(this.programStagecreatedata).subscribe(
        data => {
          this.addSuccess("Success!","Program Stage added successfully.");
      },
      error => {
      this.addError("Failed!","Could not add Program Stage.");
      }

      );
      }

    ProgramStageList():void{
      this.manageProgramsService.getProgramStages().subscribe(data => {
        this.programStageList = data;

      }
      );
      }
        goToAddProgramStage(programStage: ProgramStageData){
          this.router.navigate(['addProgramStage']);
          this.programStageDialog=true;
        }

        importProgramStage(programStage: ProgramStageData){
          this.router.navigate(['importProgramStage']);
          this.programStageImportDialog=true;
        }
        go1Back(){
          this.location.back();
        }
        editProgramStage(ProgramStage: ProgramStageData){
        this.selectedProgramStage = {...ProgramStage};
        this.selectedProgramStage.form_stage_db_identifier = this.selectedProgramStage.name.replace(/\s/g, '_');
        this.programStageEditDialog=true;
       }
       updateProgramStage(){
         this.manageProgramsService.createProgramStage(this.selectedProgramStage).subscribe(
          (data) => {
            this.addSuccess("Success!","Program Stage information updated successfully.");

         },
         () => {
         this.addError("Failed!","Program Stage creation failed.");
         this.programStageEditDialog = false;
       });
      }



       hideProgramStageDialog(){
         this.programStageDialog = false;
       }

       hideProgramStageEditDialog(){
        this.programStageEditDialog = false;
      }



      // Errors Handling
      addSuccess(title:string,message:string) {
        this.messageService.add({severity:'success', summary:title, detail:message});


      }
      addError(title:string,message:string) {
        this.messageService.add({severity:'error', summary:title, detail:message});

      }

}
