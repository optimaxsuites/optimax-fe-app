import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { StatusData, StatusTypeData } from '../domain/status.data';
import {ManageStatusService} from '../service/manage.status.service';
import { Location } from '@angular/common';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import {MessageService,Message} from 'primeng/api';
import { MetadataConfigService } from 'src/app/administration/service/metadata-config.service';





@Component({
  selector: 'app-statuslist',
  template: `<p-toast position="top-center"></p-toast>
 <p-tabView [(activeIndex)]="activeindex">
  <p-tabPanel header="Status Type">
  <div class="p-grid">
	<div class="p-col-12">

        <div class="card">
			<p-toolbar styleClass="p-mb-4">
				<ng-template pTemplate="left">
					<button pButton pRipple label="Add Status Type" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddStatusType()"></button>
					<button pButton pRipple label="Delete Status Type" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
				</ng-template>

				<ng-template pTemplate="right">
                    <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importStatusType()">
                    </button>
					<button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
				</ng-template>
            </p-toolbar>
            <p-table #ststype [value]="statustypeList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code','description']"
         [rowHover]="true" dataKey="id"
            styleClass="p-datatable-customers"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

            <ng-template pTemplate="caption">
                <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                    <h5 class="p-m-0">Status Type Listing</h5>
                    <span class="p-input-icon-left">
                    <i class="pi pi-search"></i>
                    <input pInputText type="text" (input)="ststype.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
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
            <ng-template pTemplate="body" let-statustype>
                <tr>
                    <td>
                        <p-tableCheckbox [value]="statustype"></p-tableCheckbox>
                    </td>
                    <td><span class="p-column-title"></span>
                        {{statustype.name}}
                    </td>
                    <td><span class="p-column-title"></span>
                        {{statustype.code}}
                    </td>
                    <td><span class="p-column-title"></span>
                        {{statustype.description}}
                    </td>

                    <td>
                        <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editStatusType(statustype)"></button>
                        <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteProduct(product)"></button>
                    </td>
                </tr>
            </ng-template>
            <ng-template pTemplate="summary">
                <div class="p-d-flex p-ai-center p-jc-between">
                    In total there are {{statustypeList ? statustypeList.length : 0 }} Status Types.
                </div>
            </ng-template>
        </p-table>

            </div>

            <p-dialog [(visible)]="staustypeDialog" [style]="{width: '650px'}" header="New Status" [modal]="true" styleClass="p-fluid">
                <ng-template pTemplate="content">
                    <div class="p-grid p-formgrid p-fluid">

                        <div class="p-col-6 p-field">
                            <label for="name">Name</label>
                            <input id="name" type="name" pInputText [(ngModel)]="statustype.name" aria-describedby="username-help"
                            placeholder="Enter name">

                        </div>

                        <div class="p-col-6 p-field">
                            <label for="code">Code</label>
                            <input id="code" type="code" pInputText [(ngModel)]="statustype.code" aria-describedby="password-help" placeholder="Enter code">

                        </div>


                    </div>

                        <div class="p-grid p-formgrid p-fluid">
                            <div class="p-col-12 p-field">
                                <label for="description">Description</label>
                                <textarea rows="5" cols="30" placeholder="Description" pInputTextarea  [(ngModel)]="statustype.description"></textarea>
                            </div>

                        </div>

                </ng-template>
                <ng-template pTemplate="footer">
                              <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideStatusTypeDialog()"></button>
                              <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addStatusType()"></button>
                          </ng-template>
              </p-dialog>


           <p-dialog [(visible)]="staustypeEditDialog" [style]="{width: '650px'}" header="Statustype Details" [modal]="true" styleClass="p-fluid">

            <ng-template pTemplate="content">
				<div class="p-col-12 p-fluid p-formgrid p-grid">
				<div class="p-col-12 p-field">
					<label for="name">Name</label>
					<input id="name" type="name" pInputText [(ngModel)]="selectedStatusType.name">
                </div>
                <div class="p-col-6 p-field">
					<label for="code">Code</label>
					<input id="code" type="code" pInputText [(ngModel)]="selectedStatusType.code">
                </div>
                <div class="p-col-6 p-field">
					<label for="description"> Description </label>
					<input id="description" type="description" pInputText [(ngModel)]="selectedStatusType.description">
                </div>
                <div class="p-col-6 p-field">
                        <label for="created_by">Created_By</label>
                        <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedStatusType.created_by">
                    </div>
                    <div class="p-col-6 p-field">
                        <label for="created_date">Created_Date</label>
                        <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedStatusType.created_date">
                    </div>

                </div>
                </ng-template>

                <ng-template pTemplate="footer">
                    <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideStatusTypeEditDialog()"></button>
                    <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateStatusType()"></button>
                </ng-template>
                </p-dialog>


                <p-dialog [(visible)]="staustypeImportDialog" [style]="{width: '800px'}" header="Import Status Type" [modal]="true" styleClass="p-fluid">
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
                                                    <div style="align: center" class="p-field p-col-12 p-md-4">
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

<p-tabPanel header="Status">
<div class="p-grid">
	<div class="p-col-12">

        <div class="card">
			<p-toolbar styleClass="p-mb-4">
				<ng-template pTemplate="left">
					<button pButton pRipple label="Add Status" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddStatus()"></button>
					<button pButton pRipple label="Delete Status" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
				</ng-template>

				<ng-template pTemplate="right">
                    <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importStatus()">
                    </button>
					<button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
				</ng-template>
            </p-toolbar>
            <p-table #sts [value]="statusList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code', 'description']"
         [rowHover]="true" dataKey="id"
            styleClass="p-datatable-customers"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

            <ng-template pTemplate="caption">
                <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                    <h5 class="p-m-0">Status Listing</h5>
                    <span class="p-input-icon-left">
                    <i class="pi pi-search"></i>
                    <input pInputText type="text" (input)="sts.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
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
            <ng-template pTemplate="body" let-status>
                <tr>
                    <td>
                        <p-tableCheckbox [value]="status"></p-tableCheckbox>
                    </td>

                    <td><span class="p-column-title"></span>
                        {{status.name}}
                    </td>
                    <td><span class="p-column-title"></span>
                        {{status.code}}
                    </td>
                    <td><span class="p-column-title"></span>
                        {{status.description}}
                    </td>

                    <td>
                        <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editStatus(status)"></button>
                        <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteProduct(product)"></button>
                    </td>
                </tr>
            </ng-template>
            <ng-template pTemplate="summary">
                <div class="p-d-flex p-ai-center p-jc-between">
                    In total there are {{statusList ? statusList.length : 0 }} Status.
                </div>
            </ng-template>
        </p-table>
            </div>


            <p-dialog [(visible)]="statusDialog" [style]="{width: '650px'}" header="New Status" [modal]="true" styleClass="p-fluid">
                <ng-template pTemplate="content">
                    <div class="p-grid p-formgrid p-fluid">

                    <div class="p-col-4 p-field">
                      <label for="status_type_id">Status Type</label>
                      <p-dropdown inputId="status_type_id" [options]="statustypeMap" [(ngModel)]="selectedStatusType"
                      optionLabel="name" placeholder="Choose a Status Type"></p-dropdown>

                  </div>

                        <div class="p-col-4 p-field">
                            <label for="name">Status Name</label>
                            <input id="name" type="name" pInputText [(ngModel)]="statuscreatedata.name" aria-describedby="name-help"
                            placeholder="Enter Status Name">

                        </div>

                        <div class="p-col-4 p-field">
                            <label for="code">Code </label>
                            <input id="code" type="code" pInputText [(ngModel)]="statuscreatedata.code" aria-describedby="code-help"
                            placeholder="Enter Status Code" required>
                        </div>

                        <div class="p-col-12 p-field">
                            <label for="description">Status Description </label>
                            <textarea rows="5" cols="30" placeholder="Enter Status Description" [(ngModel)]="statuscreatedata.description" pInputTextarea ></textarea>
                        </div>


                    </div>

                </ng-template>
                <ng-template pTemplate="footer">
                              <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideStatusDialog()"></button>
                              <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addStatus()"></button>
                          </ng-template>
              </p-dialog>

            <p-dialog [(visible)]="statusEditDialog" [style]="{width: '650px'}" header="Status Details" [modal]="true" styleClass="p-fluid">

                <ng-template pTemplate="content">
                    <div class="p-col-12 p-fluid p-formgrid p-grid">
                    <div class="p-col-12 p-field">
                        <label for="name">Name</label>
                        <input id="name" pInputText [(ngModel)]="selectedStatus.name">
                    </div>

                    <div class="p-col-6 p-field">
                    <label for="status_type_id">Status Type </label>
                    <p-dropdown inputId="status_type_id" [options]="statustypeMap" [(ngModel)]="selectedStatus.status_type_id"
                    optionLabel="name" optionValue="status_type_id" placeholder="Choose a Status Type"></p-dropdown>

                </div>


                    <div class="p-col-6 p-field">
                        <label for="code">Code</label>
                        <input id="code" pInputText [(ngModel)]="selectedStatus.code">
                    </div>
                    <div class="p-col-6 p-field">
                <label for="created_by">Created_By</label>
                <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedStatus.created_by">
            </div>
            <div class="p-col-6 p-field">
                <label for="created_date">Created_Date</label>
                <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedStatus.created_date">
            </div>

            <div class="p-col-12 p-field">
                <label for="description">Description </label>
                <textarea id="description" pInputText [(ngModel)]="selectedStatus.description" required rows="3" cols="20"></textarea>
            </div>


                    </div>
                    </ng-template>

                    <ng-template pTemplate="footer">
                        <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideStatusEditDialog()"></button>
                        <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateStatus()"></button>
                    </ng-template>
                    </p-dialog>


                    <p-dialog [(visible)]="statusImportDialog" [style]="{width: '800px'}" header="Import Status" [modal]="true" styleClass="p-fluid">
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
  styleUrls: ['./statuslist.component.scss'],
  providers: [MessageService]
})

export class StatuslistComponent implements OnInit {

  statuscreatedata = {} as StatusData;

  statustypeMap: StatusTypeData[];
  selectedStatusType: StatusTypeData;

  statusList:any;
  selectedStatus: StatusData;
  statusDialog: boolean;
  statusImportDialog: boolean;
  statusEditDialog: boolean;


  statustype = {} as StatusTypeData;
  statustypeList:any;
  staustypeDialog: boolean;
  staustypeEditDialog: boolean;
  staustypeImportDialog: boolean;

  activeindex: number = 0;

  constructor(private messageService: MessageService,private router: Router, private route:ActivatedRoute, private location: Location,private managestatusService:ManageStatusService,
    private metadataConfigService: MetadataConfigService, private breadcrumbService: AppBreadcrumbService) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['/dashboard'] },
      { label: 'Metadata', routerLink: ['/metadatalist'] },
      { label: 'List Status', routerLink: ['/statuslist'] }    ]);
   }

  ngOnInit(): void {
    this.StatusList();
    this.StatusTypeList();
    this.loadConfigMetadata();

    this.activeindex = parseInt(this.route.snapshot.paramMap.get('index'));

  }

  protected loadConfigMetadata(){

    this.metadataConfigService.getStatusTypeList().subscribe(p => {this.statustypeMap = p});
  }

  addStatus(){
    this.statuscreatedata.created_by = +sessionStorage.getItem("userid");
    this.statuscreatedata.created_date = Date.now();
    this.statuscreatedata.status_type_id = this.selectedStatusType.status_type_id;
    this.managestatusService.createStatus(this.statuscreatedata).subscribe(
      data => {
        this.addSuccess("Success!","Status added successfully.");
    },
    error => {
    this.addError("Failed!","Could not add Status.");
    }

    );
    }

  StatusList():void{
    this.managestatusService.getStatuss().subscribe(data => {
      this.statusList = data;
      
    }
    );
    }
      goToAddStatus(status: StatusData){
        this.router.navigate(['addStatus']);
        this.statusDialog=true;
      }

      importStatus(status: StatusData){
        this.router.navigate(['importStatus']);
        this.statusImportDialog=true;
      }
      goBack(){
        this.location.back();
      }
      editStatus(status: StatusData){
      this.selectedStatus = {...status};
      this.statusEditDialog=true;
     }
     updateStatus(){
       this.managestatusService.createStatus(this.selectedStatus).subscribe(
        () => {
          this.addSuccess("Success!","Status information updated successfully.");

       },
       () => {
       this.addError("Failed!","Status creation failed.");
       this.statusDialog = false;
     });
    }

     addSuccess(title:string,message:string) {
       this.messageService.add({severity:'success', summary:title, detail:message});


     }
     addError(title:string,message:string) {
       this.messageService.add({severity:'error', summary:title, detail:message});

     }

     hideStatusDialog(){
       this.statusDialog = false;
     }

     hideStatusEditDialog(){
      this.statusEditDialog = false;
    }


    //Status Type
    addStatusType(){
      this.statustype.created_by = +sessionStorage.getItem("userid");
      this.statustype.created_date = new Date ();
      this.managestatusService.createStatustype(this.statustype).subscribe(
        data => {
          this.addSuccess("Success!","StatusType added successfully.");
      },
      error => {
      this.addError("Failed!","Could not add StatusType.");
      }

      );
      }
    StatusTypeList():void{
      this.managestatusService.getStatustype().subscribe(data => {
        this.statustypeList = data;
        console.log(data);
      }
      );
      }

      goToAddStatusType(statustype: StatusTypeData){
        this.router.navigate(['addStatusType']);
        this.staustypeDialog=true;
      }

      importStatusType(statustype: StatusTypeData){
        this.router.navigate(['importStatusType']);
        this.staustypeImportDialog=true;
      }



      editStatusType(statustype: StatusTypeData){
        this.selectedStatusType = {...statustype};
        this.staustypeEditDialog=true;
       }

       updateStatusType(){
        this.managestatusService.createStatustype(this.selectedStatusType).subscribe(
          () => {
            this.addSuccess("Success!","Status Type information updated successfully.");

         },
         () => {
         this.addError("Failed!","Status Type creation failed.");
         this.staustypeDialog = false;
       });
      }

      hideStatusTypeDialog(){
        this.staustypeDialog = false;
      }

      hideStatusTypeEditDialog(){
        this.staustypeEditDialog = false;
      }

}
