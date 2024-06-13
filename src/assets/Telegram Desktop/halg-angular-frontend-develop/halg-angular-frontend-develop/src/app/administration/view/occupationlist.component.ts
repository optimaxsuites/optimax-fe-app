import { Component, OnInit } from '@angular/core';
import {AppBreadcrumbService} from '../../app.breadcrumb.service';
import { OccupationData, QualificationData } from '../domain/occupation.data';
import {ManageOccupationService} from '../service/manage.occupation.service';
import { Location } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import {MessageService} from 'primeng/api';


@Component({
  selector: 'app-occupationlist',
  template: `<p-toast position="top-center"></p-toast>
  <p-tabView [(activeIndex)]="activeindex">
  <p-tabPanel header="Occupation" leftIcon="fa fa-pills">
      <div class="p-grid">
          <div class="p-col-12">

              <div class="card">
                  <p-toolbar styleClass="p-mb-4">
                      <ng-template pTemplate="left">
                          <button pButton pRipple label="Add Occupation" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddOccupation(occupation)"></button>
                          <button pButton pRipple label="Delete Occupation" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
                      </ng-template>

                      <ng-template pTemplate="right">
                          <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importOccupation(occupation)"></button>
                          <button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
                      </ng-template>
                  </p-toolbar>
                  <p-table #occu [value]="occupationList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code','description']"
               [rowHover]="true" dataKey="occupation_id" [(selection)]="selectedOccupation"
                  styleClass="p-datatable-customers"
                  currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

                  <ng-template pTemplate="caption">
                      <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                          <h5 class="p-m-0">Occupation Listing</h5>
                          <span class="p-input-icon-left">
                          <i class="pi pi-search"></i>
                          <input pInputText type="text" (input)="occu.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
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
                  <ng-template pTemplate="body" let-occupation>
                      <tr>
                          <td>
                              <p-tableCheckbox [value]="occupation"></p-tableCheckbox>
                          </td>
                          <td><span class="p-column-title"></span>
                              {{occupation.name}}
                          </td>
                          <td><span class="p-column-title"></span>
                              {{occupation.code}}
                          </td>
                          <td><span class="p-column-title"></span>
                              {{occupation.description}}
                          </td>

                          <td>
                              <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editOccupation(occupation)"></button>
                              <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteProduct(product)"></button>
                          </td>
                      </tr>
                  </ng-template>
                  <ng-template pTemplate="summary">
                      <div class="p-d-flex p-ai-center p-jc-between">
                          In total there are {{occupationList ? occupationList.length : 0 }} occupation.
                      </div>
                  </ng-template>
              </p-table>

                  </div>

                  <p-dialog [(visible)]="occupationDialog" [style]="{width: '650px'}" header="New Occupation" [modal]="true" styleClass="p-fluid">
                      <ng-template pTemplate="content">
               <div class="p-grid p-formgrid p-fluid">

                  <div class="p-col-6 p-field">
                      <label for="name"> Name</label>
                      <input id="name" type="name" pInputText [(ngModel)]="occupationcreateddata.name" aria-describedby="name-help"
                      placeholder=" Enter Name">

                  </div>

                  <div class="p-col-6 p-field">
                      <label for="code">Code </label>
                      <input id="code" type="code" pInputText [(ngModel)]="occupationcreateddata.code" aria-describedby="code-help"
                      placeholder="Enter Code" required>
                  </div>

                  <div class="p-col-12 p-field">
                      <label for="description"> Description </label>
                      <textarea rows="5" cols="30" placeholder=" Description" [(ngModel)]="occupationcreateddata.description" pInputTextarea ></textarea>
                  </div>


              </div>


                      </ng-template>
                      <ng-template pTemplate="footer">
                                    <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideOccupationDialog()"></button>
                                    <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addOccupation()"></button>
                                </ng-template>
                    </p-dialog>


                 <p-dialog [(visible)]="occupationEditDialog" [style]="{width: '650px'}" header="Occupation Details" [modal]="true" styleClass="p-fluid">

                  <ng-template pTemplate="content">
                      <div class="p-col-12 p-fluid p-formgrid p-grid">
                      <div class="p-col-12 p-field">
                          <label for="name">Name</label>
                          <input id="name" type="name" pInputText [(ngModel)]="selectedOccupation.name">
                      </div>
                      <div class="p-col-6 p-field">
                          <label for="code">Code</label>
                          <input id="code" type="code" pInputText [(ngModel)]="selectedOccupation.code">
                      </div>
                      <div class="p-col-6 p-field">
                          <label for="description"> Description </label>
                          <input id="description" type="description" pInputText [(ngModel)]="selectedOccupation.description">
                      </div>
                      <div class="p-col-6 p-field">
                              <label for="created_by">Created_By</label>
                              <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedOccupation.created_by">
                          </div>
                          <div class="p-col-6 p-field">
                              <label for="created_date">Created_Date</label>
                              <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedOccupation.created_date">
                          </div>

                      </div>
                      </ng-template>

                      <ng-template pTemplate="footer">
                          <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideOccupationEditDialog()"></button>
                          <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateOccupation()"></button>
                      </ng-template>
                      </p-dialog>


                      <p-dialog [(visible)]="occupationImportDialog" [style]="{width: '800px'}" header="Import Occupation" [modal]="true" styleClass="p-fluid">

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

  <p-tabPanel header="Qualification">
      <div class="p-grid">
          <div class="p-col-12">

              <div class="card">
                  <p-toolbar styleClass="p-mb-4">
                      <ng-template pTemplate="left">
                          <button pButton pRipple label="Add Qualification" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddQualification(qualification)"></button>
                          <button pButton pRipple label="Delete Qualification" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
                      </ng-template>

                      <ng-template pTemplate="right">
                          <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importQualification(qualification)"></button>
                          <button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
                      </ng-template>
                  </p-toolbar>
                  <p-table #qualf [value]="qualificationList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code']"
               [rowHover]="true" dataKey="qualification_id" [(selection)]="selectedQualification"
                  styleClass="p-datatable-customers"
                  currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

                  <ng-template pTemplate="caption">
                      <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                          <h5 class="p-m-0">Qualification Listing</h5>
                          <span class="p-input-icon-left">
                          <i class="pi pi-search"></i>
                          <input pInputText type="text" (input)="qualf.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
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
                  <ng-template pTemplate="body" let-qualification>
                      <tr>
                          <td>
                              <p-tableCheckbox [value]="qualification"></p-tableCheckbox>
                          </td>
                          <td><span class="p-column-title"></span>
                              {{qualification.name}}
                          </td>
                          <td><span class="p-column-title"></span>
                              {{qualification.code}}
                          </td>
                          <td><span class="p-column-title"></span>
                              {{qualification.description}}
                          </td>

                          <td>
                              <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editQualification(qualification)"></button>
                              <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteProduct(product)"></button>
                          </td>
                      </tr>
                  </ng-template>
                  <ng-template pTemplate="summary">
                      <div class="p-d-flex p-ai-center p-jc-between">
                          In total there are {{qualificationList ? qualificationList.length : 0 }} qualification.
                      </div>
                  </ng-template>
              </p-table>
                  </div>

                  <p-dialog [(visible)]="qualificationDialog" [style]="{width: '650px'}" header="New Qualification" [modal]="true" styleClass="p-fluid">
                      <ng-template pTemplate="content">
               <div class="p-grid p-formgrid p-fluid">

                  <div class="p-col-6 p-field">
                      <label for="name"> Name</label>
                      <input id="name" type="name" pInputText [(ngModel)]="qualificationcreatedata.name" aria-describedby="name-help"
                      placeholder="Enter Name">

                  </div>

                  <div class="p-col-6 p-field">
                      <label for="code">Code </label>
                      <input id="code" type="code" pInputText [(ngModel)]="qualificationcreatedata.code" aria-describedby="code-help"
                      placeholder="Enter Code" required>
                  </div>

                  <div class="p-col-12 p-field">
                      <label for="description"> Description </label>
                      <textarea rows="5" cols="30" placeholder=" Description" [(ngModel)]="qualificationcreatedata.description" pInputTextarea ></textarea>
                  </div>


              </div>


                      </ng-template>
                      <ng-template pTemplate="footer">
                                    <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideQualificationDialog()"></button>
                                    <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addQualification()"></button>
                                </ng-template>
                    </p-dialog>

                  <p-dialog [(visible)]="qualificationEditDialog" [style]="{width: '650px'}" header="Qualification Details" [modal]="true" styleClass="p-fluid">

                      <ng-template pTemplate="content">
                          <div class="p-col-12 p-fluid p-formgrid p-grid">
                          <div class="p-col-12 p-field">
                              <label for="name">Name</label>
                              <input id="name" type="name" pInputText [(ngModel)]="selectedQualification.name">
                          </div>
                          <div class="p-col-6 p-field">
                              <label for="code">Code</label>
                              <input id="code" type="code" pInputText [(ngModel)]="selectedQualification.code">
                          </div>
                          <div class="p-col-6 p-field">
                              <label for="description"> Description </label>
                              <input id="description" type="description" pInputText [(ngModel)]="selectedQualification.description">
                          </div>
                          <div class="p-col-6 p-field">
                                  <label for="created_by">Created_By</label>
                                  <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedQualification.created_by">
                              </div>
                              <div class="p-col-6 p-field">
                                  <label for="created_date">Created_Date</label>
                                  <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedQualification.created_date">
                              </div>

                          </div>
                          </ng-template>

                          <ng-template pTemplate="footer">
                              <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideQualificationEditDialog()"></button>
                              <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateQualification()"></button>
                          </ng-template>


      </p-dialog>

      <p-dialog [(visible)]="qualificationImportDialog" [style]="{width: '800px'}" header="Import Qualification" [modal]="true" styleClass="p-fluid">

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
  //styleUrls: ['./languagelist.component.scss'],
  providers: [MessageService]
})
export class OccupationlistComponent implements OnInit {

  occupationcreateddata = {} as OccupationData;
qualificationcreatedata = {} as QualificationData;


  occupationList:any;
  selectedOccupation: OccupationData;
  occupationDialog: boolean;
  occupationEditDialog: boolean;
  occupationImportDialog: boolean;
  products: OccupationData[];
  occupation: OccupationData[];


  qualificationList:any;
  selectedQualification: QualificationData;
  qualificationDialog: boolean;
  qualificationEditDialog: boolean;
  qualificationImportDialog: boolean;

  activeindex: number = 0;


  constructor(private messageService: MessageService,
    private router: Router,   private route:ActivatedRoute, private location: Location,
    private manageoccupationService:ManageOccupationService,
    private breadcrumbService: AppBreadcrumbService) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['/dashboard'] },
      { label: 'Meta-data', routerLink: ['/metadatalist'] },
      { label: 'List Occupation', routerLink: ['/occupationlist'] }    ]);
    }

  ngOnInit(): void {
    this.OccupationList();
    this.QualificationList();

    this.activeindex = parseInt(this.route.snapshot.paramMap.get('index'));

  }


  addOccupation(){
    this.occupationcreateddata.created_by = +sessionStorage.getItem("userid");
    this.occupationcreateddata.created_date = new Date();
    this.manageoccupationService.createOccupation(this.occupationcreateddata).subscribe(
      data => {
        this.addSuccess("Success!","Occupation added successfully.");
    },
    error => {
    this.addError("Failed!","Could not add Occupation.");
    }

    );
  }

  OccupationList():void{
    this.manageoccupationService.getOccupations().subscribe(data => {
      this.occupationList = data;
      console.log(data);
    }
    );
    }
      goToAddOccupation(occupation: OccupationData){
        this.router.navigate(['addOccupation']);
        this.occupationDialog=true;
      }

      importOccupation(occupation: OccupationData){
        this.router.navigate(['importOccupation']);
        this.occupationImportDialog=true;
      }

      goBack(){
        this.location.back();
      }
      editOccupation(occupation: OccupationData){
      this.selectedOccupation = {...occupation};
      this.occupationEditDialog=true;
     }



       updateOccupation(){
      this.manageoccupationService.createOccupation(this.selectedOccupation).subscribe(
        () => {
          this.addSuccess("Success!","Occupation information updated successfully.");

       },
       () => {
       this.addError("Failed!","Occupation creation failed.");
       this.occupationDialog = false;
     });
    }
    hideOccupationDialog(){
      this.occupationDialog = false;
    }

    hideOccupationEditDialog(){
      this.occupationEditDialog = false;
    }



    // Qualification Method

    addQualification(){
      this.qualificationcreatedata.created_by = +sessionStorage.getItem("userid");
      this.qualificationcreatedata.created_date = new Date();
      this.manageoccupationService.createQualification(this.qualificationcreatedata).subscribe(
        () => {
          this.addSuccess("Success!","Qualification added successfully.");
      },
      () => {
      this.addError("Failed!","Could not add Qualification.");
      }

      );
    }

    QualificationList():void{
      this.manageoccupationService.getQualifications().subscribe(data => {
        this.qualificationList = data;
        console.log(data);
      }
      );
      }


      goToAddQualification(qualification: QualificationData){
        this.router.navigate(['/addQualification']);
        this.qualificationDialog=true;
      }


      importQualification(qualification: QualificationData){
        this.router.navigate(['importQualification']);
        this.qualificationImportDialog=true;
      }

      editQualification(qualification: QualificationData){
      this.selectedQualification = {...qualification};
      this.qualificationEditDialog=true;
     }
     updateQualification(){
       this.manageoccupationService.createQualification(this.selectedQualification).subscribe(
        () => {
          this.addSuccess("Success!","Qualification information updated successfully.");

       },
       () => {
       this.addError("Failed!","Qualification creation failed.");
       this.qualificationDialog = false;
     });
    }



     addSuccess(title:string,message:string) {
       this.messageService.add({severity:'success', summary:title, detail:message});


     }
     addError(title:string,message:string) {
       this.messageService.add({severity:'error', summary:title, detail:message});

     }

     hideQualificationDialog(){
       this.qualificationDialog = false;
     }

     hideQualificationEditDialog(){
      this.qualificationEditDialog = false;
    }


}



