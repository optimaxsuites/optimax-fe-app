import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { LaboratoryTestData, LaboratoryTesttypeData } from '../domain/laboratorytest.data';
import {ManageLaboratoryTestService} from '../service/manage.laboratorytest.service';
import { Location } from '@angular/common';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import {MessageService,Message} from 'primeng/api';
import { MetadataConfigService } from 'src/app/administration/service/metadata-config.service';


@Component({
  selector: 'app-laboratorytestlist',
  template: `<p-toast position="top-center"></p-toast>
 <p-tabView [(activeIndex)]="activeindex">
  <p-tabPanel header="Laboratory Test Type">
  <div class="p-grid">
	<div class="p-col-12">

        <div class="card">
			<p-toolbar styleClass="p-mb-4">
				<ng-template pTemplate="left">
					<button pButton pRipple label="Add Laboratory Test Type" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddLaboratoryTestType()"></button>
					<button pButton pRipple label="Delete Laboratory Test Type" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
				</ng-template>

				<ng-template pTemplate="right">
                    <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importLaboratoryTestType()">
                    </button>
					<button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
				</ng-template>
            </p-toolbar>
            <p-table #lbtt [value]="laboratoryTestTypeList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code','description']"
         [rowHover]="true" dataKey="laboratory_test_type_id" [(selection)]="selectedLaboratoryTestType"
            styleClass="p-datatable-customers"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

            <ng-template pTemplate="caption">
                <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                    <h5 class="p-m-0">Laboratory Test Type Listing</h5>
                    <span class="p-input-icon-left">
                    <i class="pi pi-search"></i>
                    <input pInputText type="text" (input)="lbtt.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
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
            <ng-template pTemplate="body" let-LaboratoryTestType>
                <tr>
                    <td>
                        <p-tableCheckbox [value]="LaboratoryTestType"></p-tableCheckbox>
                    </td>
                    <td><span class="p-column-title"></span>
                        {{LaboratoryTestType.name}}
                    </td>
                    <td><span class="p-column-title"></span>
                        {{LaboratoryTestType.code}}
                    </td>
                    <td><span class="p-column-title"></span>
                        {{LaboratoryTestType.description}}
                    </td>

                    <td>
                        <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editLaboratoryTestType(LaboratoryTestType)"></button>
                        <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteProduct(product)"></button>
                    </td>
                </tr>
            </ng-template>
            <ng-template pTemplate="summary">
                <div class="p-d-flex p-ai-center p-jc-between">
                    In total there are {{laboratoryTestTypeList ? laboratoryTestTypeList.length : 0 }} Laboratory Test Types.
                </div>
            </ng-template>
        </p-table>

            </div>

            <p-dialog [(visible)]="laboratoryTestDialog" [style]="{width: '650px'}" header="New Laboratory Test Type" [modal]="true" styleClass="p-fluid">
                <ng-template pTemplate="content">
                    <div class="p-grid p-formgrid p-fluid">

                        <div class="p-col-6 p-field">
                            <label for="name">Name</label>
                            <input id="name" type="name" pInputText [(ngModel)]="laboratoryTestType.name" aria-describedby="username-help"
                            placeholder="Enter name">

                        </div>

                        <div class="p-col-6 p-field">
                            <label for="code">Code</label>
                            <input id="code" type="code" pInputText [(ngModel)]="laboratoryTestType.code" aria-describedby="password-help" placeholder="Enter code">

                        </div>


                    </div>

                        <div class="p-grid p-formgrid p-fluid">
                            <div class="p-col-12 p-field">
                                <label for="description">Description</label>
                                <textarea rows="5" cols="30" placeholder="Description" pInputTextarea  [(ngModel)]="laboratoryTestType.description"></textarea>
                            </div>

                        </div>

                </ng-template>
                <ng-template pTemplate="footer">
                              <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideLaboratoryTestTypeDialog()"></button>
                              <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addLaboratoryTestType()"></button>
                          </ng-template>
              </p-dialog>


           <p-dialog [(visible)]="laboratoryTestEditDialog" [style]="{width: '650px'}" header="Laboratory Test Type Details" [modal]="true" styleClass="p-fluid">

            <ng-template pTemplate="content">
				<div class="p-col-12 p-fluid p-formgrid p-grid">
				<div class="p-col-12 p-field">
					<label for="name">Name</label>
					<input id="name" type="name" pInputText [(ngModel)]="selectedLaboratoryTestType.name">
                </div>
                <div class="p-col-6 p-field">
					<label for="code">Code</label>
					<input id="code" type="code" pInputText [(ngModel)]="selectedLaboratoryTestType.code">
                </div>
                <div class="p-col-6 p-field">
					<label for="description"> Description </label>
					<input id="description" type="description" pInputText [(ngModel)]="selectedLaboratoryTestType.description">
                </div>
                <div class="p-col-6 p-field">
                        <label for="created_by">Created_By</label>
                        <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedLaboratoryTestType.created_by">
                    </div>
                    <div class="p-col-6 p-field">
                        <label for="created_date">Created_Date</label>
                        <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedLaboratoryTestType.created_date">
                    </div>

                </div>
                </ng-template>

                <ng-template pTemplate="footer">
                    <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideLaboratoryTestTypeEditDialog()"></button>
                    <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateLaboratoryTestType()"></button>
                </ng-template>
                </p-dialog>


                <p-dialog [(visible)]="laboratoryTestImportDialog" [style]="{width: '800px'}" header="Import Status Type" [modal]="true" styleClass="p-fluid">
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

<p-tabPanel header="Laboratory Test">
<div class="p-grid">
	<div class="p-col-12">

        <div class="card">
			<p-toolbar styleClass="p-mb-4">
				<ng-template pTemplate="left">
					<button pButton pRipple label="Add Laboratory Test" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddLaboratoryTest()"></button>
					<button pButton pRipple label="Delete Laboratory Test" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
				</ng-template>

				<ng-template pTemplate="right">
					<button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
				</ng-template>
            </p-toolbar>
            <p-table #lbt [value]="laboratoryTestList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code']"
         [rowHover]="true" dataKey="laboratory_test_id" [(selection)]="selectedLaboratoryTest"
            styleClass="p-datatable-customers"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

            <ng-template pTemplate="caption">
                <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                    <h5 class="p-m-0">LaboratoryTest Listing</h5>
                    <span class="p-input-icon-left">
                    <i class="pi pi-search"></i>
                    <input pInputText type="text" (input)="lbt.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
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
            <ng-template pTemplate="body" let-LaboratoryTest>
                <tr>
                    <td>
                        <p-tableCheckbox [value]="LaboratoryTest"></p-tableCheckbox>
                    </td>
                    <td><span class="p-column-title"></span>
                        {{LaboratoryTest.name}}
                    </td>
                    <td><span class="p-column-title"></span>
                        {{LaboratoryTest.code}}
                    </td>
                    <td><span class="p-column-title"></span>
                        {{LaboratoryTest.description}}
                    </td>

                    <td>
                        <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editLaboratoryTest(LaboratoryTest)"></button>
                        <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteProduct(product)"></button>
                    </td>
                </tr>
            </ng-template>
            <ng-template pTemplate="summary">
                <div class="p-d-flex p-ai-center p-jc-between">
                    In total there are {{laboratoryTestList ? laboratoryTestList.length : 0 }} Laboratory Test.
                </div>
            </ng-template>
        </p-table>
            </div>

            <p-dialog [(visible)]="laboratoryTestDialog" [style]="{width: '650px'}" header="New Laboratory Test" [modal]="true" styleClass="p-fluid">
                <ng-template pTemplate="content">

                    <div class="p-grid p-formgrid p-fluid">


                    <div class="p-col-4 p-field">
                            <label for="laboratory_test_type_id">Laboratory Test Type</label>
                            <p-dropdown inputId="laboratory_test_type_id" [options]="laboratoryTesttypeMap" [(ngModel)]="selectedLaboratoryTestType"
                            optionLabel="name" placeholder="Choose a Laboratory Test Type"></p-dropdown>

                        </div>

                        <div class="p-col-4 p-field">
                            <label for="name">Laboratory Test Name</label>
                            <input id="name" type="name" pInputText [(ngModel)]="laboratoryTestcreatedata.name" aria-describedby="name-help"
                            placeholder="Enter Laboratory Test Name">

                        </div>

                        <div class="p-col-4 p-field">
                            <label for="code">Code </label>
                            <input id="code" type="code" pInputText [(ngModel)]="laboratoryTestcreatedata.code" aria-describedby="code-help"
                            placeholder="Enter Laboratory Test Code" required>
                        </div>

                        <div class="p-col-12 p-field">
                            <label for="description">Laboratory Test Description </label>
                            <textarea rows="5" cols="30" placeholder="Enter Laboratory Test Description" [(ngModel)]="laboratoryTestcreatedata.description" pInputTextarea ></textarea>
                        </div>


                    </div>

                </ng-template>
                <ng-template pTemplate="footer">
                              <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideLaboratoryTestDialog()"></button>
                              <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addLaboratoryTest()"></button>
                          </ng-template>
              </p-dialog>

            <p-dialog [(visible)]="laboratoryTestEditDialog" [style]="{width: '650px'}" header="Laboratory Test Details" [modal]="true" styleClass="p-fluid">

                <ng-template pTemplate="content">
                    <div class="p-col-12 p-fluid p-formgrid p-grid">
                    <div class="p-col-12 p-field">
                        <label for="name">Name</label>
                        <input id="name" pInputText [(ngModel)]="selectedLaboratoryTest.name">
                    </div>

                    <div class="p-col-6 p-field">
                    <label for="laboratory_test_type_id">Laboratory Test Type </label>
                    <p-dropdown inputId="laboratory_test_type_id" [options]="laboratoryTesttypeMap" [(ngModel)]="selectedLaboratoryTest.laboratory_test_type_id"
                    optionLabel="name" optionValue="laboratory_test_type_id" placeholder="Choose a Program"></p-dropdown>

                </div>
                    <div class="p-col-6 p-field">
                        <label for="code">Code</label>
                        <input id="code" pInputText [(ngModel)]="selectedLaboratoryTest.code">
                    </div>

                    <div class="p-col-6 p-field">
                <label for="created_date">Created_Date</label>
                <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedLaboratoryTest.created_date">
            </div>



            <div class="p-col-6 p-field">
                <label for="created_by">Created_By</label>
                <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedLaboratoryTest.created_by">
            </div>

            <div class="p-col-12 p-field">
                <label for="description">Description </label>
                <textarea id="description" pInputText [(ngModel)]="selectedLaboratoryTest.description" required rows="3" cols="20"></textarea>
            </div>
                    </div>
                    </ng-template>

                    <ng-template pTemplate="footer">
                        <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideLaboratoryTestEditDialog()"></button>
                        <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateLaboratoryTest()"></button>
                    </ng-template>
                    </p-dialog>


                    <p-dialog [(visible)]="laboratoryTestImportDialog" [style]="{width: '800px'}" header="Import LaboratoryTest" [modal]="true" styleClass="p-fluid">
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
  styleUrls: ['./laboratorytestlist.component.scss'],
  providers: [MessageService]
})
export class LaboratorytestlistComponent implements OnInit {

  laboratoryTestcreatedata = {} as LaboratoryTestData;

laboratoryTesttypeMap: LaboratoryTesttypeData[];
selectedLaboratoryTestType: LaboratoryTesttypeData;

  laboratoryTestList:any;
  selectedLaboratoryTest: LaboratoryTestData;
  laboratoryTestDialog: boolean;
  laboratoryTestEditDialog: boolean;
  laboratoryTestImportDialog: boolean;

  laboratoryTestType = {} as LaboratoryTesttypeData;
  laboratoryTestTypeList:any;
  laboratoryTestTypeDialog: boolean;
  laboratoryTestTypeEditDialog: boolean;
  laboratoryTestTypeImportDialog: boolean;

  activeindex: number = 0;

  constructor(private messageService: MessageService,private router: Router, private route:ActivatedRoute, private location: Location,private manageLaboratoryTestService:ManageLaboratoryTestService,
    private metadataConfigService: MetadataConfigService, private breadcrumbService: AppBreadcrumbService) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['/dashboard'] },
      { label: 'Metadata', routerLink: ['/metadatalist'] },
      { label: 'List Laboratory Test', routerLink: ['/laboratorytestlist'] }    ]);
   }

   ngOnInit(): void {
    if(sessionStorage.getItem('username') == null){
      this.addError("Session Expired.","Your current session has expired. Re-login.");
     this.router.navigate(['']);
   } else
    {

      this.LaboratoryTestList();
      this.LaboratoryTestTypeList();
      this.loadConfigMetadata();

      this.activeindex = parseInt(this.route.snapshot.paramMap.get('index'));

   }
  }


 protected loadConfigMetadata(){

   this.metadataConfigService.getLaboratoryTestType().subscribe(p => {this.laboratoryTesttypeMap = p});
}


  addLaboratoryTest(){
    this.laboratoryTestcreatedata.created_by = +sessionStorage.getItem("userid");
    this.laboratoryTestcreatedata.created_date = new Date();
    this.laboratoryTestcreatedata.laboratory_test_type_id = this.selectedLaboratoryTestType.laboratory_test_type_id;
    this.manageLaboratoryTestService.createLaboratoryTest(this.laboratoryTestcreatedata).subscribe(
      data => {
        this.addSuccess("Success!","Laboratory Test added successfully.");
    },
    error => {
    this.addError("Failed!","Could not add Laboratory Test.");
    }

    );
    }

  LaboratoryTestList():void{
    this.manageLaboratoryTestService.getLaboratoryTests().subscribe(data => {
      this.laboratoryTestList = data;
    }
    );
    }
      goToAddLaboratoryTest(laboratoryTest: LaboratoryTestData){
        this.router.navigate(['addLaboratoryTest']);
        this.laboratoryTestDialog=true;

      }


      importLaboratoryTest(laboratoryTest: LaboratoryTestData){
        this.router.navigate(['importLaboratoryTest']);
        this.laboratoryTestImportDialog=true;
      }
      goBack(){
        this.location.back();
      }
      editLaboratoryTest(LaboratoryTest: LaboratoryTestData){
      this.selectedLaboratoryTest = {...LaboratoryTest};
      this.laboratoryTestEditDialog=true;
     }
     updateLaboratoryTest(){
      this.manageLaboratoryTestService.createLaboratoryTest(this.selectedLaboratoryTest).subscribe(
        () => {
          this.addSuccess("Success!","Laboratory Test information updated successfully.");

       },
       () => {
       this.addError("Failed!","Laboratory Test creation failed.");
       this.laboratoryTestDialog = false;
     });
    }

     addSuccess(title:string,message:string) {
       this.messageService.add({severity:'success', summary:title, detail:message});


     }
     addError(title:string,message:string) {
       this.messageService.add({severity:'error', summary:title, detail:message});

     }

     hideLaboratoryTestDialog(){
       this.laboratoryTestDialog = false;
     }

     hideLaboratoryTestEditDialog(){
      this.laboratoryTestEditDialog = false;
    }

/// Laboratory Test Type
addLaboratoryTestType(){
  this.laboratoryTestType.created_by = +sessionStorage.getItem("userid");
  this.laboratoryTestType.created_date = new Date ();
  this.manageLaboratoryTestService.createLaboratoryTesttype(this.laboratoryTestType).subscribe(
    data => {
      this.addSuccess("Success!","Laboratory Test Type added successfully.");
  },
  error => {
  this.addError("Failed!","Could not add Laboratory Test Type.");
  }

  );
  }
LaboratoryTestTypeList():void{
  this.manageLaboratoryTestService.getLaboratoryTesttypes().subscribe(data => {
    this.laboratoryTestTypeList = data;
    console.log(data);
  }
  );
  }

  goToAddLaboratoryTestType(laboratoryTestType: LaboratoryTesttypeData){
    this.router.navigate(['addLaboratoryTestType']);
    this.laboratoryTestDialog=true;
  }

  importLaboratoryTestType(laboratoryTestType: LaboratoryTesttypeData){
    this.router.navigate(['importLaboratoryTestType']);
    this.laboratoryTestImportDialog=true;
  }



  editLaboratoryTestType(LaboratoryTestType: LaboratoryTesttypeData){
    this.selectedLaboratoryTestType = {...LaboratoryTestType};
    this.laboratoryTestEditDialog=true;
   }

   updateLaboratoryTestType(){
    this.manageLaboratoryTestService.createLaboratoryTesttype(this.selectedLaboratoryTestType).subscribe(
      () => {
        this.addSuccess("Success!","Laboratory Test information updated successfully.");

     },
     () => {
     this.addError("Failed!","Laboratory Test creation failed.");
     this.laboratoryTestDialog = false;
   });
  }



  hideLaboratoryTestTypeDialog(){
    this.laboratoryTestDialog = false;
  }

  hideLaboratoryTestTypeEditDialog(){
    this.laboratoryTestEditDialog = false;
  }

}

