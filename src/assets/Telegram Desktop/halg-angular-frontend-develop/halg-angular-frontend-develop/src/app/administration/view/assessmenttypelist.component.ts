import { Component, OnInit } from '@angular/core';
import { AppBreadcrumbService } from '../../app.breadcrumb.service';
import { AssessmentTypeData, AssessmentQuestionsData } from '../domain/assessmenttype.data';
import { ManageAssessmentTypeService } from '../service/manage.assessmenttype.service';
import { Location } from '@angular/common';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { MessageService, Message } from 'primeng/api';
import { MetadataConfigService } from 'src/app/administration/service/metadata-config.service';


@Component({
  selector: 'app-assessmenttypelist',
  template: `<p-toast position="top-center"></p-toast>
  <p-tabView [(activeIndex)]="activeindex">
  <p-tabPanel header="Assessment Type" leftIcon="fa fa-pills">
  <div class="p-grid">
  <div class="p-col-12">

      <div class="card">
          <p-toolbar styleClass="p-mb-4">
              <ng-template pTemplate="left">
                <button pButton pRipple label="Add Assessment Type" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddAssessmentType()"></button>
                <button pButton pRipple label="Delete Assessment Type" icon="pi pi-trash" class="p-mb-2"
                      (click)="deleteSelectedProducts()"
                      [disabled]="!selectedProducts || !selectedProducts.length"></button>
              </ng-template>

              <ng-template pTemplate="right">
                <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importAssessmentType()">
                </button>
                  <button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2"
                      (click)="goBack()"></button>
              </ng-template>
          </p-toolbar>
          <p-table #asstyp [value]="assessmentTypeList" [rows]="10" [paginator]="true"
              [globalFilterFields]="['name','code','description']" [rowHover]="true" dataKey="id"
              styleClass="p-datatable-customers"
              currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
              [showCurrentPageReport]="true">

              <ng-template pTemplate="caption">
                  <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                      <h5 class="p-m-0">Assessment Type Listing</h5>
                      <span class="p-input-icon-left">
                          <i class="pi pi-search"></i>
                          <input pInputText type="text" (input)="asstyp.filterGlobal($event.target.value, 'contains')"
                              placeholder="Search..." />
                      </span>
                  </div>
              </ng-template>
              <ng-template pTemplate="header">
                  <tr>
                      <th style="width: 3rem">
                          <p-tableHeaderCheckbox></p-tableHeaderCheckbox>
                      </th>

                      <th pSortableColumn="name">Name<p-sortIcon field="name"></p-sortIcon>
                      </th>
                      <th pSortableColumn="code">Code <p-sortIcon field="code"></p-sortIcon>
                      </th>
                      <th pSortableColumn="flag">Flag <p-sortIcon field="flag"></p-sortIcon>
                      </th>
                      <th pSortableColumn="description">Description <p-sortIcon field="description"></p-sortIcon>
                      </th>
                      <th pSortableColumn="action">Action <p-sortIcon field="action"></p-sortIcon>
                      </th>

                  </tr>
              </ng-template>
              <ng-template pTemplate="body" let-assessmenttype>
                  <tr>
                      <td>
                          <p-tableCheckbox [value]="assessmenttype"></p-tableCheckbox>
                      </td>

                      <td><span class="p-column-title"></span>
                          {{assessmenttype.name}}
                      </td>
                      <td><span class="p-column-title"></span>
                          {{assessmenttype.code}}
                      </td>
                      <td><span class="p-column-title"></span>
                        {{assessmenttype.flag}}
                    </td>
                      <td><span class="p-column-title"></span>
                        {{assessmenttype.description}}
                    </td>

                      <td>
                          <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2"
                              (click)="editAssessmentType(assessmenttype)"></button>
                          <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning"
                              (click)="deleteAssessmentType(assessmenttype)"></button>
                      </td>
                  </tr>
              </ng-template>
              <ng-template pTemplate="summary">
                  <div class="p-d-flex p-ai-center p-jc-between">
                      In total there are {{assessmentTypeList ? assessmentTypeList.length : 0 }} Assessment Type.
                  </div>
              </ng-template>
          </p-table>

      </div>


      <p-dialog [(visible)]="assessmentTypeDialog" [style]="{width: '650px'}" header="New Assessment Type" [modal]="true" styleClass="p-fluid">
        <ng-template pTemplate="content">
  <div  class="p-col-12 p-fluid p-formgrid p-grid">
     <div class="p-col-6 p-field">
            <label for="name">Name</label>
            <input  type="text" pInputText [(ngModel)]="assessmentType.name" aria-describedby="username-help"
            placeholder="Enter name">

        </div>
   <div class="p-col-6 p-field">
            <label for="code">Code</label>
            <input id="code" type="code" pInputText [(ngModel)]="assessmentType.code" aria-describedby="password-help" placeholder="Enter code">

        </div>

        <div class="p-col-6 p-field">
          <label for="flag">Flag</label>
          <input id="flag" type="flag" pInputText [(ngModel)]="assessmentType.flag" aria-describedby="password-help" placeholder="Enter Flag">

      </div>
  </div>

  <div class="p-grid p-formgrid p-fluid">
            <div class="p-col-12 p-field">
                <label for="description">Description</label>
                <textarea rows="5" cols="30" placeholder="Description" pInputTextarea  [(ngModel)]="assessmentType.description" placeholder="Enter code"></textarea>
            </div>

        </div>


        </ng-template>
        <ng-template pTemplate="footer">
                      <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideAssessmentTypeDialog()"></button>
                      <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addAssessmentType()"></button>
                  </ng-template>
      </p-dialog>

      <p-dialog [(visible)]="assessmentTypeEditDialog" [style]="{width: '650px'}" header="Assessment Type Details" [modal]="true" styleClass="p-fluid">

        <ng-template pTemplate="content">
            <div class="p-col-12 p-fluid p-formgrid p-grid">
            <div class="p-col-12 p-field">
                <label for="name">Name</label>
                <input id="name" type="name" pInputText [(ngModel)]="selectedAssessmentType.name">
            </div>
            <div class="p-col-6 p-field">
                <label for="code">Code</label>
                <input id="code" type="code" pInputText [(ngModel)]="selectedAssessmentType.code">
            </div>
            <div class="p-col-6 p-field">
                <label for="description"> Description </label>
                <input id="description" type="description" pInputText [(ngModel)]="selectedAssessmentType.description">
            </div>
            <div class="p-col-6 p-field">
                          <label for="created_by">Created_By</label>
                          <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedAssessmentType.created_by">
                      </div>
                      <div class="p-col-6 p-field">
                          <label for="created_date">Created_Date</label>
                          <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedAssessmentType.created_date">
                      </div>
            </div>
            </ng-template>

            <ng-template pTemplate="footer">
                <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideAssessmentTypeEditDialog()"></button>
                <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateAssessmentType()"></button>
            </ng-template>
            </p-dialog>

  </div>
</div>
</p-tabPanel>

  <p-tabPanel header="Assessment Questions">

  <p-toast position="top-center"></p-toast>
  <div class="p-grid">
  <div class="p-col-12">

      <div class="card">
          <p-toolbar styleClass="p-mb-4">
              <ng-template pTemplate="left">
                  <button pButton pRipple label="Add Assessment questions" icon="pi pi-plus" class="p-mr-2 p-mb-2" (click)="goToAddAssessmentQuestions()"></button>
                  <button pButton pRipple label="Delete Assessmentquestions" icon="pi pi-trash" class="p-mb-2" (click)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length"></button>
              </ng-template>

              <ng-template pTemplate="right">
                  <button pButton pRipple type="button" icon="pi pi-download" label="Import" class="p-button-text p-mr-2" (click)="importAssessmentQuestions()">
                          </button>
                          <button pButton pRipple label="Back" icon="pi pi-chevron-left" class="p-button-help p-mb-2" (click)="goBack()"></button>
              </ng-template>
          </p-toolbar>
          <p-table #assq [value]="assessmentQuestionsList" [rows]="10" [paginator]="true" [globalFilterFields]="['name','code','description']"
       [rowHover]="true" dataKey="assessmentquestions_id" [(selection)]="selectedAssessmentquestions"
          styleClass="p-datatable-customers"
          currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries" [showCurrentPageReport]="true">

          <ng-template pTemplate="caption">
              <div class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header">
                  <h5 class="p-m-0">Assessment Questions Listing</h5>
                  <span class="p-input-icon-left">
                  <i class="pi pi-search"></i>
                  <input pInputText type="text" (input)="assq.filterGlobal($event.target.value, 'contains')" placeholder="Search..." />
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
          <ng-template pTemplate="body" let-assessmentquestions>
              <tr>
                  <td>
                      <p-tableCheckbox [value]="assessmentquestions"></p-tableCheckbox>
                  </td>
                  <td>
                      {{assessmentquestions.name}}
                  </td>
                  <td>
                      {{assessmentquestions.code}}
                  </td>
                  <td>
                      {{assessmentquestions.description}}
                  </td>

                  <td>
                      <button pButton pRipple icon="pi pi-pencil" class="p-button-rounded p-button-success p-mr-2" (click)="editAssessmentQuestions(assessmentquestions)"></button>
                      <button pButton pRipple icon="pi pi-trash" class="p-button-rounded p-button-warning" (click)="deleteAssessmentQuestions()"></button>
                  </td>
              </tr>
          </ng-template>
          <ng-template pTemplate="summary">
              <div class="p-d-flex p-ai-center p-jc-between">
                  In total there are {{assessmentQuestionsList ? assessmentQuestionsList.length : 0 }} Assessment Questions.
              </div>
          </ng-template>
      </p-table>

          </div>

          <p-dialog [(visible)]="assessmentquestionsDialog" [style]="{width: '650px'}" header="New Assessment Questions" [modal]="true" styleClass="p-fluid">
              <ng-template pTemplate="content">
        <div  class="p-col-12 p-fluid p-formgrid p-grid">

        <div class="p-col-6 p-field">
                <label for="assessment_type_id">Assessment Type</label>
                <p-dropdown inputId="assessment_type_id" [options]="assessmentTypeMap" [(ngModel)]="selectedAssessmentType"
                optionLabel="name" placeholder="Choose a Assessment Type"></p-dropdown>

            </div>
           <div class="p-col-6 p-field">
                  <label for="name">Name</label>
                  <input  type="text" pInputText [(ngModel)]="assessmentquestionscreatedata.name" aria-describedby="username-help"
                  placeholder="Enter name">

              </div>
         <div class="p-col-12 p-field">
                  <label for="code">Code</label>
                  <input id="code" type="code" pInputText [(ngModel)]="assessmentquestionscreatedata.code" aria-describedby="password-help" placeholder="Enter code">

              </div>
        </div>

        <div class="p-grid p-formgrid p-fluid">
                  <div class="p-col-12 p-field">
                      <label for="description">Description</label>
                      <textarea rows="5" cols="30" placeholder="Description" pInputTextarea  [(ngModel)]="assessmentquestionscreatedata.description" placeholder="Enter Description"></textarea>
                  </div>

              </div>


              </ng-template>
              <ng-template pTemplate="footer">
                            <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideAssessmentQuestionsDialog()"></button>
                            <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="addAssessmentQuestions()"></button>
                        </ng-template>
            </p-dialog>


            <p-dialog [(visible)]="assessmentquestionsEditDialog" [style]="{width: '650px'}" header="Assessment Questions Details" [modal]="true" styleClass="p-fluid">

              <ng-template pTemplate="content">
                  <div class="p-col-12 p-fluid p-formgrid p-grid">
                  <div class="p-col-12 p-field">
                      <label for="name">Name</label>
                      <input id="name" type="name" pInputText [(ngModel)]="selectedAssessmentquestions.name">
                  </div>
                  <div class="p-col-6 p-field">
                    <label for="assessment_type_id">Assesssment Type</label>
                    <p-dropdown inputId="assessment_type_id" [options]="assessmentTypeMap" [(ngModel)]="selectedAssessmentquestions.assessment_type_id"
                    optionLabel="name" optionValue="assessment_type_id" placeholder="Choose a Assessment Type"></p-dropdown>

                </div>

                  <div class="p-col-6 p-field">
                      <label for="code">Code</label>
                      <input id="code" type="code" pInputText [(ngModel)]="selectedAssessmentquestions.code">
                  </div>
                  <div class="p-col-6 p-field">
                      <label for="description"> Description </label>
                      <input id="description" type="description" pInputText [(ngModel)]="selectedAssessmentquestions.description">
                  </div>
                  <div class="p-col-6 p-field">
                          <label for="created_by">Created_By</label>
                          <input id="created_by" type="created_by" pInputText [(ngModel)]="selectedAssessmentquestions.created_by">
                      </div>
                      <div class="p-col-6 p-field">
                          <label for="created_date">Created_Date</label>
                          <input id="created_date" type="created_date" pInputText [(ngModel)]="selectedAssessmentquestions.created_date">
                      </div>

                  </div>
                  </ng-template>

                  <ng-template pTemplate="footer">
                      <button pButton pRipple label="Cancel" icon="pi pi-times" class="p-button-text" (click)="hideAssessmentQuestionsEditDialog()"></button>
                      <button pButton pRipple label="Save" icon="pi pi-check" class="p-button-text" (click)="updateAssessmentQuestions()"></button>
                  </ng-template>
                  </p-dialog>


                  <p-dialog [(visible)]="assessmentquestionsImportDialog" [style]="{width: '800px'}" header="Import Assessment Questions" [modal]="true" styleClass="p-fluid">

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
  styleUrls: ['./assessmenttypelist.component.scss'],
  providers: [MessageService]
})
export class AssessmentTypelistComponent implements OnInit {
  assessmentType = {} as AssessmentTypeData;
  assessmentquestionscreatedata = {} as AssessmentQuestionsData;


  assessmentTypeMap: AssessmentTypeData[];



  assessmentTypeList: any;
 selectedAssessmentType: AssessmentTypeData;
  assessmentTypeDialog: boolean;
  assessmentTypeEditDialog: boolean;
  assessmentTypeImportDialog: boolean;

  assessmentQuestionsList:any;
  selectedAssessmentquestions: AssessmentQuestionsData;
  assessmentquestionsDialog: boolean;
  assessmentquestionsEditDialog: boolean;
  assessmentquestionsImportDialog: boolean;

  activeindex: number = 0;


  constructor(private messageService: MessageService, private router: Router, private location: Location,
    private metadataConfigService: MetadataConfigService, private route:ActivatedRoute,
    private manageAssessmentTypeservice: ManageAssessmentTypeService, private breadcrumbService: AppBreadcrumbService) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['/dashboard'] },
      { label: 'Meta-data', routerLink: ['/metadatalist'] },
      { label: 'Assessment Type', routerLink: ['/assessmentypelist'] }]);
  }
  ngOnInit(): void {
    this.AssessmentQuestionsList();
  this.loadConfigMetadata();
    this.AssessmentTypeList();

    this.activeindex = parseInt(this.route.snapshot.paramMap.get('index'));

  }

  protected loadConfigMetadata(){

    this.metadataConfigService.getAssessmentTypeList().subscribe(p => {this.assessmentTypeMap = p});
  }

    addAssessmentType() {
    this.assessmentType.created_by = +sessionStorage.getItem('userid');
    this.assessmentType.created_date = Date.now();
    this.manageAssessmentTypeservice.createAssessmentType(this.assessmentType).subscribe(
      data => {
        this.addSuccess("Success!", "Next of kin added successfully.");
      },
      error => {
        this.addError("Failed!", "Could not add Next of kin.");
      }

    );
  }

  AssessmentTypeList(): void {
    this.manageAssessmentTypeservice.getAssessmentType().subscribe(data => {
      this.assessmentTypeList = data;
      console.log(data);
    }
    );
  }
  goToAddAssessmentType() {
    this.router.navigate(['addAssessmentType']);
    this.assessmentTypeDialog = true;
  }
  goBack() {
    this.location.back();
  }

  importAssessmentType() {
    this.router.navigate(['importAssessmentType']);
    this.assessmentTypeImportDialog = true;
  }

  editAssessmentType(assessmenttype: AssessmentTypeData) {
  this.selectedAssessmentType = { ...assessmenttype };
    this.assessmentTypeEditDialog = true;
  }

  deleteAssessmentType(assessmenttype: AssessmentTypeData){

    this.selectedAssessmentType = {...assessmenttype};
    console.log(this.selectedAssessmentType)
    this.manageAssessmentTypeservice.deleteAssessmentType(this.selectedAssessmentType.assessment_type_id)
      .subscribe(
        data => {
          this.addSuccess("Success!","Assessment Type deleted successfully.");


      },
      error => {
      this.addError("Failed!","Could not delete Assessment Type.");
      }
      );
  }
  updateAssessmentType() {
   this.manageAssessmentTypeservice.createAssessmentType(this.selectedAssessmentType).subscribe(
    () => {
        this.addSuccess("Success!", "Assessment Type information updated successfully.");

      },
      () => {
        this.addError("Failed!", "Assessment Type creation failed.");
        this.assessmentTypeDialog = false;
      });
  }


  hideAssessmentTypeDialog() {
    this.assessmentTypeDialog = false;
  }

  hideAssessmentTypeEditDialog() {
    this.assessmentTypeEditDialog = false;
  }


  // Assessment Questions

  addAssessmentQuestions(){
    this.assessmentquestionscreatedata.created_by = +sessionStorage.getItem("userid");
    this.assessmentquestionscreatedata.assessment_type_id = this.selectedAssessmentType.assessment_type_id;
    this.assessmentquestionscreatedata.created_date = new Date ();
    this.manageAssessmentTypeservice.createAssessmentQuestions(this.assessmentquestionscreatedata).subscribe(
      data => {
        this.addSuccess("Success!","Assessment Questions added successfully.");
    },
    error => {
    this.addError("Failed!","Could not add Assessment Questions.");
    }

    );
    }

    AssessmentQuestionsList():void{
      this.manageAssessmentTypeservice.getAssessmentQuestionss().subscribe(data => {
        this.assessmentQuestionsList = data;
        console.log(data);
      }
      );
      }

      goToAddAssessmentQuestions(assessmentQuestions: AssessmentQuestionsData){
        this.router.navigate(['addAssessmentQuestions']);
        this.assessmentquestionsDialog=true;
      }


      importAssessmentQuestions(assessmentQuestions: AssessmentQuestionsData){
        this.router.navigate(['importAssessmentQuestions']);
        this.assessmentquestionsImportDialog=true;
      }


      editAssessmentQuestions(assessmentQuestions: AssessmentQuestionsData){
        this.selectedAssessmentquestions = {...assessmentQuestions};
        this.assessmentquestionsEditDialog=true;
       }

       deleteAssessmentQuestions(assessmentQuestions: AssessmentQuestionsData){

        this.selectedAssessmentquestions = {...assessmentQuestions};
        console.log(this.selectedAssessmentquestions)
        this.manageAssessmentTypeservice.deleteAssessmentQuestions(this.selectedAssessmentquestions.assessment_question_id)
          .subscribe(
            data => {
              this.addSuccess("Success!","Assessment Questions deleted successfully.");


          },
          error => {
          this.addError("Failed!","Could not delete Assessment Questions.");
          }
          );
      }

       updateAssessmentQuestions(){
        this.manageAssessmentTypeservice.createAssessmentQuestions(this.selectedAssessmentquestions).subscribe(
          () => {
            this.addSuccess("Success!","Assessment Questions information updated successfully.");

         },
         () => {
         this.addError("Failed!","Assessment Questions creation failed.");
         this.assessmentquestionsDialog = false;
       });
      }



      hideAssessmentQuestionsDialog(){
        this.assessmentquestionsDialog = false;
      }

      hideAssessmentQuestionsEditDialog(){
        this.assessmentquestionsEditDialog = false;
      }


      addSuccess(title:string,message:string) {
        this.messageService.add({severity:'success', summary:title, detail:message});


      }
      addError(title:string,message:string) {
        this.messageService.add({severity:'error', summary:title, detail:message});

      }

}
