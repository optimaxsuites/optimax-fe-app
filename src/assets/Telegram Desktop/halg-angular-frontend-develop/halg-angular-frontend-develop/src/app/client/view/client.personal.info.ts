import { Component, OnInit, Input } from '@angular/core';
import { AppBreadcrumbService } from '../../app.breadcrumb.service';
import { Router } from '@angular/router';
//import { ClientExtendedInfo } from '../domain/client.portal.data';
import {
  GenderData,
  ReligionData,
} from '../../administration/domain/gender.data';
import { MetadataConfigService } from '../../administration/service/metadata-config.service';
import { MaritalStatusData } from '../../administration/domain/gender.data';
import { OccupationData } from '../../administration/domain/occupation.data';
import { QualificationData } from '../../administration/domain/occupation.data';
import { HeirarchyUnitsData } from '../../administration/domain/heirarchyunits.data';
import { ConfirmationService } from 'primeng/api';
import { LanguageData } from '../../administration/domain/gender.data';
import { RefferedfromData } from '../../administration/domain/targetgroup.data';
import { ManageClientService } from '../service/manage.client.service';
import { Location } from '@angular/common';
import { MessageService, TreeNode } from 'primeng/api';
import { TargetGroupData } from 'src/app/administration/domain/targetgroup.data';
import { CareEntryPointData } from 'src/app/administration/domain/targetgroup.data';
import { ClientPortalService } from '../service/client.portal.service';
import {
  LocalGovernmentAreasData,
  NationalityData,
  StatesData,
} from 'src/app/administration/domain/nationality.data';

@Component({
  template: `<p-toast position="top-center"></p-toast>
    <p-card>
      <ng-template pTemplate="content">
        <div class="p-col-12 p-grid">
          <div class="p-col-6">
            <div class="p-fluid p-formgrid p-grid">
              <div class="p-field p-col-12 p-md-12">
                <p-divider align="left" type="dashed">
                  <i class="pi pi-user-plus p-mr-2"></i>
                  <b>Client Personal Information</b>
                </p-divider>
              </div>

              <div class="p-field p-col-4">
                <label for="clientcode"><b>Client Code/Card No*</b></label>
                <input
                  type="number"
                  pInputText
                  [(ngModel)]="personalregistration.clientcode"
                  required
                  #clientcode="ngModel"
                  [ngClass]="{
                    'ng-dirty':
                      (clientcode.invalid && submitted) ||
                      (clientcode.dirty && clientcode.invalid)
                  }"
                />
                <small
                  *ngIf="
                    (clientcode.invalid && submitted) ||
                    (clientcode.dirty && clientcode.invalid)
                  "
                  class="p-error"
                >
                  Client code is required</small
                >
              </div>

              <div class="p-field p-col-8">
                <label for="dor"><b>Date Of Registration*</b></label>
                <p-calendar
                  [monthNavigator]="true"
                  [yearNavigator]="true"
                  yearRange="1920:{{ curYear }}"
                  [(ngModel)]="personalregistration.dateRegistration"
                  #dor="ngModel"
                  inputId="navigators"
                  [showIcon]="true"
                  showButtonBar="true"
                  required
                  [ngClass]="{
                    'ng-dirty':
                      (dor.invalid && submitted) || (dor.dirty && dor.invalid)
                  }"
                >
                </p-calendar>
                <small
                  *ngIf="
                    (dor.invalid && submitted) || (dor.dirty && dor.invalid)
                  "
                  class="p-error"
                >
                  Date of registration is required</small
                >
              </div>
            </div>

            <div class="p-fluid p-formgrid p-grid">
              <div class="p-field p-col-4">
                <label for="lastname"><b>Lastname</b></label>
                <input
                  #lastname="ngModel"
                  id="lastname"
                  type="text"
                  pInputText
                  [(ngModel)]="personalregistration.lastname"
                  required
                  [ngClass]="{
                    'ng-dirty':
                      (lastname.invalid && submitted) ||
                      (lastname.dirty && lastname.invalid)
                  }"
                />
                <small
                  *ngIf="
                    (lastname.invalid && submitted) ||
                    (lastname.dirty && lastname.invalid)
                  "
                  class="p-error"
                >
                  Lastname is required</small
                >
              </div>

              <div class="p-field p-col-4">
                <label for="firstname"><b>Firstname</b></label>
                <input
                  #firstname="ngModel"
                  id="firstname"
                  type="text"
                  pInputText
                  [(ngModel)]="personalregistration.firstname"
                  required
                  [ngClass]="{
                    'ng-dirty':
                      (firstname.invalid && submitted) ||
                      (firstname.dirty && firstname.invalid)
                  }"
                />
                <small
                  *ngIf="
                    (firstname.invalid && submitted) ||
                    (firstname.dirty && firstname.invalid)
                  "
                  class="p-error"
                >
                  Firstname is required</small
                >
              </div>
              <div class="p-field p-col-4">
                <label for="othername"><b>Othername</b></label>
                <input
                  id="othername"
                  type="text"
                  pInputText
                  [(ngModel)]="personalregistration.otherNames"
                />
              </div>
            </div>

            <div class="p-fluid p-formgrid p-grid">
              <div class="p-field p-col-5">
                <label for="dob"><b>Date of Birth</b></label>
                <p-calendar
                  [monthNavigator]="true"
                  [yearNavigator]="true"
                  yearRange="1960:{{ minDate }}"
                  inputId="navigators"
                  [showIcon]="false"
                  showButtonBar="false"
                  [maxDate]="maxDOBDate"
                  [(ngModel)]="personalregistration.dateBirth"
                  dateFormat="dd/mm/yy"
                  (onSelect)="getAgeIn()"
                >
                </p-calendar>
              </div>

              <div class="p-field p-col-3">
                <label for="years"><b>Years</b></label>
                <p-inputNumber
                  mode="decimal"
                  inputId="withoutgrouping"
                  [useGrouping]="false"
                  [(ngModel)]="year"
                  disabled="true"
                >
                </p-inputNumber>
              </div>

              <div class="p-field p-col-2">
                <label for="months"><b>Months</b></label>
                <p-inputNumber
                  mode="decimal"
                  inputId="withoutgrouping"
                  [useGrouping]="false"
                  [(ngModel)]="month"
                  disabled="true"
                >
                </p-inputNumber>
              </div>

              <div class="p-field p-col-2">
                <label for="days"><b>Days</b></label>
                <p-inputNumber
                  mode="decimal"
                  inputId="withoutgrouping"
                  [useGrouping]="false"
                  [(ngModel)]="days"
                  disabled="true"
                >
                </p-inputNumber>
              </div>
            </div>

            <div class="p-fluid p-formgrid p-grid">
              <div class="p-field p-col-6">
                <label for="gender_id"><b>Gender</b></label>
                <p-dropdown
                  inputId="gender_id"
                  [options]="personalregistration.genderMap"
                  [(ngModel)]="personalregistration.selectedGender"
                  [filter]="true"
                  filterBy="name"
                  [showClear]="true"
                  optionLabel="name"
                  placeholder="-Select-"
                ></p-dropdown>
              </div>

              <div class="p-field p-col-6">
                <label for="username"><b>Marital Status</b></label>
                <p-dropdown
                  inputId="marital_status_id"
                  [filter]="true"
                  filterBy="name"
                  [showClear]="true"
                  [options]="personalregistration.maritalstatusMap"
                  [(ngModel)]="personalregistration.selectedMaritalStatus"
                  optionLabel="name"
                  placeholder="-Select-"
                ></p-dropdown>
              </div>
            </div>

            <div class="p-fluid p-formgrid p-grid">
              <div class="p-field p-col-6">
                <label for="email"><b>Email</b></label>
                <input
                  id="email"
                  type="email"
                  [email]="true"
                  pInputText
                  [(ngModel)]="personalregistration.email"
                />
              </div>

              <div class="p-field p-col-3">
                <label for="phonenum"><b>Phone No</b></label>
                <p-inputMask
                  id="phonenum"
                  [(ngModel)]="personalregistration.phone_number"
                  placeholder="(801) 2234-5678"
                  mask="(999) 9999-9999"
                ></p-inputMask>
              </div>
              <div class="p-field p-col-3">
                <label for="altphonenum"><b>Alt Phone Num</b></label>
                <p-inputMask
                  id="altphonenum"
                  [(ngModel)]="personalregistration.alt_phone_number"
                  placeholder="(701) 3234-5678"
                  mask="(999) 9999-9999"
                ></p-inputMask>
              </div>
            </div>

            <div class="p-fluid p-formgrid p-grid">
              <div class="p-field p-col-6">
                <label for="nationality"><b>Nationality</b></label>
                <p-dropdown
                  inputId="nationality"
                  [options]="personalregistration.nationalityMap"
                  [(ngModel)]="personalregistration.selectedNationality"
                  [filter]="true"
                  filterBy="name"
                  [showClear]="true"
                  (onChange)="onNationalitySelection()"
                  optionLabel="name"
                  placeholder="-Select-"
                ></p-dropdown>
              </div>

              <div class="p-field p-col-6">
                <label for="state_id"><b>State/Province</b></label>
                <p-dropdown
                  inputId="state_id"
                  [options]="personalregistration.stateMap"
                  [(ngModel)]="personalregistration.selectedState"
                  [filter]="true"
                  filterBy="name"
                  [showClear]="true"
                  (onChange)="onStateSelection()"
                  optionLabel="name"
                  placeholder="-Select-"
                ></p-dropdown>
              </div>

              <div class="p-field p-col-12">
                <label for="lgaoforigin"><b>Local Government Area</b></label>
                <p-dropdown
                  inputId="lga_id"
                  [options]="personalregistration.lgaMap"
                  [(ngModel)]="personalregistration.selectedlga"
                  [filter]="true"
                  filterBy="name"
                  [showClear]="true"
                  optionLabel="name"
                  placeholder="-Select-"
                ></p-dropdown>
              </div>

              <div class="p-field p-col-12">
                <label for="contactaddress"><b>Contact Address</b></label>
                <textarea
                  id="contactaddress"
                  pInputText
                  required
                  rows="3"
                  cols="20"
                  [(ngModel)]="personalregistration.address"
                ></textarea>
              </div>
            </div>

            <div class="p-fluid p-formgrid p-grid">
              <div class="p-field p-col-6">
                <label for="language_id"><b>Spoken Language</b></label>
                <p-dropdown
                  [options]="personalregistration.languageMap"
                  [filter]="true"
                  filterBy="name"
                  [showClear]="true"
                  [(ngModel)]="personalregistration.selectedLanguage"
                  optionLabel="name"
                  placeholder="-Select-"
                ></p-dropdown>
              </div>

              <div class="p-field p-col-6">
                <label for="religion_id"><b>Religion</b></label>
                <p-dropdown
                  [options]="personalregistration.religionMap"
                  [filter]="true"
                  filterBy="name"
                  [showClear]="true"
                  [(ngModel)]="personalregistration.selectedReligion"
                  optionValue="name"
                  optionLabel="name"
                  placeholder="-Select-"
                ></p-dropdown>
              </div>
            </div>

            <div class="p-fluid p-formgrid p-grid">
              <div class="p-field p-col-6">
                <label for="occupation_id"><b>Occupation</b></label>
                <p-dropdown
                  [options]="personalregistration.occupationMap"
                  [filter]="true"
                  filterBy="name"
                  [showClear]="true"
                  [(ngModel)]="personalregistration.selectedOccupation"
                  optionLabel="name"
                  placeholder="-Select-"
                ></p-dropdown>
              </div>

              <div class="p-field p-col-6">
                <label for="qualification_id"><b>Qualification</b></label>
                <p-dropdown
                  [options]="personalregistration.qualificationMap"
                  [filter]="true"
                  filterBy="name"
                  [showClear]="true"
                  [(ngModel)]="personalregistration.selectedQualification"
                  optionLabel="name"
                  placeholder="-Select-"
                ></p-dropdown>
              </div>
            </div>
          </div>
          <div>
            <p-divider layout="vertical"> </p-divider>
          </div>

          <div class="p-col-5">
            <div class="p-fluid p-formgrid p-grid">
              <div class="p-field p-col-12 p-md-12">
                <p-divider align="left" type="dashed">
                  <i class="fa fa-stethoscope p-mr-2"></i>
                  <b>Client Hospital Information</b>
                </p-divider>
              </div>
              <div class="p-field p-col-12 p-md-12">
                <label for="facilityname"><b>Facility Name</b></label>
                <input
                  readonly
                  #facilityname
                  [(ngModel)]="personalregistration.facility_name"
                  id="facilityname"
                  type="text"
                  pInputText
                  [ngClass]="{
                    'ng-dirty':
                      (facilityname.invalid && submitted) ||
                      (facilityname.dirty && facilityname.invalid)
                  }"
                />
                <small
                  *ngIf="
                    (facilityname.invalid && submitted) ||
                    (facilityname.dirty && facilityname.invalid)
                  "
                  class="p-error"
                >
                  Invalid selection...</small
                >
                <button
                  pButton
                  pRipple
                  type="button"
                  type="button"
                  class="p-button-text p-mr-2 p-mb-2"
                  label="Choose..."
                  (click)="loadHeirarchyUnits(1)"
                ></button>
              </div>
            </div>

            <div class="p-fluid p-formgrid p-grid">
              <div class="p-field p-col-12 p-md-6">
                <label for="referral_id"><b>Referral</b></label>
                <p-dropdown
                  inputId="referral_id"
                  [options]="personalregistration.refferedfromMap"
                  [filter]="true"
                  filterBy="name"
                  [showClear]="true"
                  [(ngModel)]="personalregistration.selectedRefferedfrom"
                  optionLabel="name"
                  placeholder="-Select-"
                ></p-dropdown>
              </div>

              <div class="p-field p-col-12 p-md-6">
                <label for="target_group_id"><b>Target Group</b></label>
                <p-dropdown
                  inputId="target_group_id"
                  [options]="personalregistration.targetGroupMap"
                  [(ngModel)]="personalregistration.selectedTargetGroup"
                  optionLabel="name"
                  placeholder="-Select-"
                ></p-dropdown>
              </div>
            </div>

            <div class="p-fluid p-formgrid p-grid">
              <div class="p-field p-col-12 p-md-6">
                <label for="care_entry_id"><b>Care Entry Point</b></label>
                <p-dropdown
                  inputId="care_entry_id"
                  [options]="personalregistration.careEntryPointMap"
                  [(ngModel)]="personalregistration.selectedCareEntryPoint"
                  optionLabel="name"
                  placeholder="-Select-"
                ></p-dropdown>
              </div>

              <!--div class="p-field p-col-12 p-md-6">
        <label for="target_group_id"><b>Prior ART</b></label>
        <p-dropdown inputId="target_group_id"
        optionLabel="name" placeholder="-Select-"></p-dropdown>
        </div-->
            </div>
          </div>
        </div>
      </ng-template>

      <ng-template pTemplate="footer">
        <p-divider type="dashed"> </p-divider>
        <div class="p-grid p-nogutter p-justify-end">
          <p-button
            label="Next"
            (click)="nextPage()"
            icon="pi pi-angle-right"
            iconPos="right"
          ></p-button>
        </div>
      </ng-template>

      <p-dialog
        [(visible)]="facilityDialog"
        [style]="{ width: '650px' }"
        [maximizable]="true"
        header="OU List"
        [modal]="true"
        styleClass="p-fluid"
      >
        <p-tree
          [value]="clientPortalService.rootFromService"
          selectionMode="single"
          scrollHeight="600px"
          [loading]="loading"
          (onNodeSelect)="onNodeSelect($event)"
          [(selection)]="selectedHeirarchyUnit"
          [filter]="true"
          filterMode="strict"
          filterBy="name"
        >
          <ng-template let-node pTemplate="default">
            <b>{{ node.name }}</b>
          </ng-template>
        </p-tree>
        <p-footer>
          <div class="p-grid p-nogutter p-justify-end">
            <p-button
              label="Set {{
                selectedHeirarchyUnit ? selectedHeirarchyUnit.name : ''
              }}"
              (onClick)="heirarchyOnSet()"
              icon="pi pi-angle-right"
              iconPos="right"
            ></p-button>
          </div>
        </p-footer>
      </p-dialog>
    </p-card>`,
  providers: [MessageService, ConfirmationService],
})
export class ClientPersonalInfo implements OnInit {
  submitted: boolean;
  refferedfromMap = {} as RefferedfromData[];
  selectedRefferedfrom = {} as RefferedfromData;
  religionMap: ReligionData[];
  selectedReligion: ReligionData;
  languageMap: LanguageData[];
  selectedLanguage: LanguageData;
  maritalstatusMap: MaritalStatusData[];
  selectedMaritalStatus: MaritalStatusData[];
  genderMap: GenderData[];
  selectedGender: GenderData;
  occupationMap: OccupationData[];
  selectedOccupation: OccupationData;
  qualificationMap = {} as QualificationData[];
  selectedQualification = {} as QualificationData;
  heirarchyunitsMap: HeirarchyUnitsData[] = [];
  heirarchyunitsTree: any[];
  selectedHeirarchyUnit: HeirarchyUnitsData;
  selectedTargetGroup: TargetGroupData;
  selectedCareEntryPoint: CareEntryPointData;
  targetGroupMap: TargetGroupData[];
  careEntryPointMap: CareEntryPointData[];
  nationalityMap = {} as NationalityData[];
  stateMap = {} as StatesData[];
  lgaMap = {} as LocalGovernmentAreasData[];
  selectedNationality: any;
  selectedState: StatesData;
  selectedlga = {} as LocalGovernmentAreasData;

  personalregistration: any;
  //personaldata = {} as  PersonalData;
  dateRegistration: Date;
  loading: boolean = false;

  dest: string = '';

  maxDate: Date = new Date();
  minDate: string;
  curYear: string;
  maxDOBDate: Date;

  constructor(
    private router: Router,
    private messageService: MessageService,
    private location: Location,
    private manageclientService: ManageClientService,
    private metadataConfigService: MetadataConfigService,
    private confirmationService: ConfirmationService,
    public clientPortalService: ClientPortalService
  ) {}

  ngOnInit() {
    if (sessionStorage.getItem('username') == null) {
      this.addError(
        'Session Expired.',
        'Your current session has expired. Re-login.'
      );
      this.router.navigate(['']);
    } else {
      if (!this.personalregistration) {
        this.loadConfigMetadata();
      }

      this.personalregistration = this.clientPortalService;
    }

    var maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - 18);
    this.maxDOBDate = maxDate;

    this.curYear = new Date().getFullYear().toString();
    this.minDate = (+this.curYear - 18).toString();
  }

  nextPage() {
    if (this.personalregistration.firstname) {
      this.router.navigate(['sReg/nextofkin']);
      return;
    }
    this.submitted = true;
  }

  protected loadConfigMetadata() {
    this.metadataConfigService.getGenderList().subscribe((p) => {
      this.personalregistration.genderMap = p;
    });
    this.metadataConfigService.getLanguageList().subscribe((p) => {
      this.personalregistration.languageMap = p;
    });
    this.metadataConfigService.getRefferedfromList().subscribe((p) => {
      this.personalregistration.refferedfromMap = p;
    });
    this.metadataConfigService.getReligionList().subscribe((p) => {
      this.personalregistration.religionMap = p;
    });
    this.metadataConfigService.getMaritalStatusList().subscribe((p) => {
      this.personalregistration.maritalstatusMap = p;
    });
    this.metadataConfigService.getOccupationList().subscribe((p) => {
      this.personalregistration.occupationMap = p;
    });
    this.metadataConfigService.getQualificationList().subscribe((p) => {
      this.personalregistration.qualificationMap = p;
    });
    this.metadataConfigService.getTargetGroupList().subscribe((p) => {
      this.personalregistration.targetGroupMap = p;
    });
    this.metadataConfigService.getCareEntryPointList().subscribe((p) => {
      this.personalregistration.careEntryPointMap = p;
    });
    this.metadataConfigService.getNationalityList().subscribe((p) => {
      this.personalregistration.nationalityMap = p;
    });
    this.metadataConfigService.getRelationshipList().subscribe((p) => {
      this.personalregistration.relationshipMap = p;
    });
  }

  onNationalitySelection() {
    this.stateMap = [];
    this.personalregistration.nationalityMap.filter((p) => {
      if (
        p.nationality_id ===
        this.personalregistration.selectedNationality.nationality_id
      ) {
        this.personalregistration.stateMap = p.state;
      }
    });
  }
  onStateSelection() {
    this.lgaMap = [];
    this.personalregistration.stateMap.filter((p) => {
      if (p.state_id === this.personalregistration.selectedState.state_id) {
        this.personalregistration.lgaMap = p.localgovernmentarea;
      }
    });
  }

  facilityDialog: boolean;
  loadHeirarchyUnits(heirarchyid: number) {
    this.facilityDialog = true;
    if (!this.clientPortalService.rootFromService) {
      setTimeout(() => {
        this.loading = true;
        this.metadataConfigService
          .getHeirarchyUnitsListById(heirarchyid)
          .subscribe(
            (p) => {
              this.heirarchyunitsMap = p;
              this.buildHeirarchyTree(this.heirarchyunitsMap);
              this.loading = false;
            },
            (error) => {
              this.addError(
                'Failure',
                'Poor network connectivity detected. Try again.'
              );
              this.loading = false;
            }
          );
      }, 1000);
    }
  }

  onNodeSelect(event) {
    this.personalregistration.state_code = event.node.parent.parent.parent.code;
    this.personalregistration.oss_code = event.node.parent.parent.code;
    this.personalregistration.lga_code = event.node.parent.code;
  }

  heirarchyOnSet(): void {
    if (!this.personalregistration.state_code) {
      this.addError(
        'OSS Selection',
        'You have selected wrong OSS level. Select the correct OSS.'
      );
      this.personalregistration.facility_name = '';
    } else {
      this.personalregistration.facility_id =
        +this.selectedHeirarchyUnit.heirarchyunitid;
      this.personalregistration.facility_name = this.selectedHeirarchyUnit.name;
      this.personalregistration.facility_code = this.selectedHeirarchyUnit.code;
    }

    this.facilityDialog = false;
  }

  addSuccess(title: string, message: string) {
    this.messageService.add({
      severity: 'success',
      summary: title,
      detail: message,
    });
  }
  addError(title: string, message: string) {
    this.messageService.add({
      severity: 'error',
      summary: title,
      detail: message,
    });
  }

  //This will be put int util soon
  roots: TreeNode[] = [];
  private buildHeirarchyTree(list) {
    this.roots = [];
    var map = {},
      node,
      i;

    for (i = 0; i < list.length; i += 1) {
      map[list[i].heirarchyunitid] = i; //Dami... initialize the map
      list[i].children = []; // Dami... initialize the children
    }

    for (i = 0; i < list.length; i += 1) {
      node = list[i];
      if (node.parentid !== 0) {
        list[map[node.parentid]].children.push(node);
      } else {
        this.roots.push(node);
      }
    }
    this.clientPortalService.rootFromService = this.roots;
    return this.clientPortalService.rootFromService;
  }

  getAgeIn() {
    this.getDateIn(this.personalregistration.dateBirth, new Date());
  }

  year: number = 0;
  month: number = 0;
  days: number = 0;
  getDateIn(fromdate: Date, todate) {
    if (todate) todate = new Date(todate);
    else todate = new Date();

    var age = [],
      fromdate = new Date(fromdate),
      y = [todate.getFullYear(), fromdate.getFullYear()],
      ydiff = y[0] - y[1],
      m = [todate.getMonth(), fromdate.getMonth()],
      mdiff = m[0] - m[1],
      d = [todate.getDate(), fromdate.getDate()],
      ddiff = d[0] - d[1];

    if (mdiff < 0 || (mdiff === 0 && ddiff < 0)) --ydiff;
    if (mdiff < 0) mdiff += 12;
    if (ddiff < 0) {
      fromdate.setMonth(m[1] + 1, 0);
      ddiff = fromdate.getDate() - d[1] + d[0];
      --mdiff;
    }
    if (ydiff > 0) this.year = ydiff;
    if (mdiff > 0) this.month = mdiff;
    if (ddiff > 0) this.days = ddiff;
  }
  ngOnDestroy() {
    this.personalregistration.implementing_partner_code = 'HAN';
    this.clientPortalService = this.personalregistration;
  }
}
