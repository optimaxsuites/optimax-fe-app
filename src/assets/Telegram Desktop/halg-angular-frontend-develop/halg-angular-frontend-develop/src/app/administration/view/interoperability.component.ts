import { Component, OnInit } from '@angular/core';
import {
  MessageService,
  MenuItem,
  LazyLoadEvent,
  ConfirmationService,
} from 'primeng/api';
import { NextofKinData, PersonalData } from 'src/app/client/domain/client.data';
import { LocalGovernmentAreasData } from '../domain/nationality.data';
import { ClientPortalService } from 'src/app/client/service/client.portal.service';
import { ManageClientService } from 'src/app/client/service/manage.client.service';
import { InvestigationData } from '../domain/consultation.data';
import { SourceRealm } from '../domain/datamigration.data';
import { GenderData, MaritalStatusData } from '../domain/gender.data';
import { OccupationData } from '../domain/occupation.data';
import {
  CareEntryPointData,
  RefferedfromData,
  TargetGroupData,
} from '../domain/targetgroup.data';
import { MetadataConfigService } from '../service/metadata-config.service';
import { HeirarchyData } from '../domain/heirarchy.data';
import { HeirarchyUnitsData } from '../domain/heirarchyunits.data';
import { Location } from '@angular/common';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { ManageHeirarchyUnitService } from '../service/manage.heirarchy.unit.service';
import { ManageHeirarchyService } from '../service/manage.heirarchy.service';
import { AppBreadcrumbService } from 'src/app/app.breadcrumb.service';

declare var require: any;

@Component({
  selector: 'app-interoperability',
  template: `<p-toast position="top-center"></p-toast>
    <p-card>
      <ng-template pTemplate="title">
        <div class="p-grid p-justify-between">
          Interoperability
          <p-button icon="pi pi-print" iconPos="left"></p-button>
        </div>
      </ng-template>
      <ng-template pTemplate="content">
        <div class="p-grid">
          <div class="p-fluid p-formgrid p-grid p-col-12">
            <div class="p-field p-col-4">
              <label for="source"><b>Source*</b></label>
              <p-dropdown
                [options]="importsource"
                optionLabel="label"
                optionValue="value"
                placeholder="-Select-"
                [(ngModel)]="selectedImportSource"
                [showTransitionOptions]="'0ms'"
                [hideTransitionOptions]="'0ms'"
                required
                #importrealm="ngModel"
                [ngClass]="{
                  'ng-dirty':
                    importrealm.invalid ||
                    (importrealm.dirty && importrealm.invalid)
                }"
              >
              </p-dropdown>
            </div>
            <div class="p-field p-col-4">
              <label for="destination"><b>Destination*</b></label>
              <p-dropdown
                [options]="importsource"
                optionLabel="label"
                optionValue="value"
                placeholder="-Select-"
                [(ngModel)]="selectedImportSource"
                [showTransitionOptions]="'0ms'"
                [hideTransitionOptions]="'0ms'"
                required
                #importrealm="ngModel"
                [ngClass]="{
                  'ng-dirty':
                    importrealm.invalid ||
                    (importrealm.dirty && importrealm.invalid)
                }"
              >
              </p-dropdown>
            </div>
            <div class="p-field p-col-4">
              <label for="export domain"><b>Export Domain*</b></label>
              <p-dropdown
                [options]="importsource"
                optionLabel="label"
                optionValue="value"
                placeholder="-Select-"
                [(ngModel)]="selectedImportSource"
                [showTransitionOptions]="'0ms'"
                [hideTransitionOptions]="'0ms'"
                required
                #importrealm="ngModel"
                [ngClass]="{
                  'ng-dirty':
                    importrealm.invalid ||
                    (importrealm.dirty && importrealm.invalid)
                }"
              >
              </p-dropdown>
            </div>

            <div class="p-field p-col-4">
              <label for="Data"><b>Period (days)</b></label>
              <p-dropdown
                [filter]="true"
                filterBy="name"
                [showClear]="true"
                [options]="regperiodmap"
                optionLabel="name"
                optionValue="clinical_stages_id"
                placeholder="-Select-"
              ></p-dropdown>
            </div>

            <div class="p-field p-col-4">
              <label for="dor"><b>Date From: *</b></label>
              <p-calendar
                [monthNavigator]="true"
                [yearNavigator]="true"
                yearRange="2000:{{ curYear }}"
                [maxDate]="maxDate"
                [(ngModel)]="dateFrom"
                inputId="navigators"
                [showIcon]="true"
                showButtonBar="true"
                required
                placeholder="Date From"
              >
              </p-calendar>
            </div>
            <div class="p-field p-col-4">
              <label for="dor"><b>Date To: *</b></label>
              <p-calendar
                [monthNavigator]="true"
                [yearNavigator]="true"
                yearRange="2000:{{ curYear }}"
                [maxDate]="maxDate"
                [(ngModel)]="dateTo"
                inputId="navigators"
                [showIcon]="true"
                showButtonBar="true"
                required
                placeholder="Date To"
              >
              </p-calendar>
            </div>
            <!---- <div class="p-col-4  p-field">
              <label for="facilityname"><b>Facility Name</b></label>
              <input
                readonly
                #facilityname
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
            </div> --->

            <!--- heirarchyUnits --->
            <div class="p-field p-col-12 p-md-12">
              <label for="heirarchyname">Heirarchy Name</label>
              <div class="p-fluid p-formgrid p-grid">
                <div class="p-col-12">
                  <p-dropdown
                    [options]="heirarchyMap"
                    [(ngModel)]="selectedHeirarchy"
                    optionLabel="name"
                    [filter]="true"
                    filterBy="name"
                    [showClear]="true"
                    placeholder="Select OU"
                    (onChange)="onOUSelect()"
                  >
                  </p-dropdown>
                </div>
                <!--div class="p-col-4">	
        <button pButton pRipple type="button" icon="pi pi-refresh" label="Refresh" class="p-button-outlined p-mr-2 p-mb-2" (click)="refreshHeirarchyUnitsById()"></button>
      </div-->
              </div>
              <small id="username-help">
                Select the root heirarchy to add units.
              </small>
            </div>

            <div class="p-field p-col-12 p-md-12">
              <label for="firstname1">Heirarchy Units</label>
              <p-tree
                [value]="roots"
                selectionMode="single"
                scrollHeight="600px"
                [contextMenu]="shuc"
                [(selection)]="selectedHeirarchyunit"
                [draggableNodes]="true"
                [droppableNodes]="true"
                draggableScope="self"
                droppableScope="self"
                key="selectedHeirarchyunit.heirarchyunitid"
                (onNodeSelect)="heirarchyOnSelect($event)"
                (onNodeDrop)="moveHeirarchyunit($event)"
                [filter]="true"
                filterMode="strict"
                filterBy="name"
                filterPlaceholder="Search for OU in list"
                indetation="0.5"
                [loading]="loading"
              >
                <ng-template let-node pTemplate="default">
                  <b>{{ node.name }}</b>
                </ng-template>
              </p-tree>

              <p-contextMenu
                #shuc
                [model]="selectedHeirarchyunitcontext"
              ></p-contextMenu>

              <small>Selected heirarchy units will be displayed here..</small>
            </div>
          </div>

          <div class="p-field p-col-8">
            <button
              pButton
              pRipple
              type="button"
              icon="pi pi-eye"
              label="Preview"
              class="p-button-outlined p-mr-2 p-col-2"
              (click)="previewImportData()"
            ></button>
            <button
              pButton
              pRipple
              type="button"
              icon="pi pi-cloud-download"
              label="Push"
              class="p-button-outlined p-mr-2 p-col-2"
              (click)="processMigration()"
            ></button>
          </div>

          <div class="p-field p-col-12">
            <p-table
              [value]="patientdatafromlamis"
              [paginator]="true"
              [rows]="10"
              [showCurrentPageReport]="true"
              currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
              [rowsPerPageOptions]="[10, 25, 50]"
            >
              <ng-template pTemplate="header">
                <tr>
                  <th>patientId</th>
                  <th>Hospital No</th>
                  <th>Full name</th>
                  <th>Gender</th>
                  <th>LGA</th>
                  <th>Date of Birth</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-patient>
                <tr>
                  <td>{{ patient.patientId }}</td>
                  <td>{{ patient.hospitalNum }}</td>
                  <td>{{ patient.surname }} {{ patient.otherNames }}</td>
                  <td>{{ patient.gender }}</td>
                  <td>{{ patient.lgaId }}</td>
                  <td>{{ patient.dateBirth }}</td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        </div>
      </ng-template>

      <p-dialog
        [(visible)]="processdialog"
        [style]="{ width: '850px' }"
        header="Migration Progress"
        [modal]="true"
        styleClass="p-fluid"
        [maximizable]="true"
      >
        <p-progressBar mode="indeterminate"></p-progressBar>
        <p>
          <!-- {{ msg_scope }} -->
          <p-footer>
            <div class="p-grid p-nogutter p-justify-end">
              <p-button
                label="Save Result"
                icon="pi pi-save"
                iconPos="left"
              ></p-button>
            </div>
          </p-footer></p
      ></p-dialog>
    </p-card> `,

  styleUrls: ['./data-migration.component.scss'],
  providers: [MessageService],
})
export class InteroperabilityComponent implements OnInit {
  roots: any[] = [];
  heirarchyunit = {} as HeirarchyUnitsData;
  heirarchyMap: HeirarchyData[];
  selectedHeirarchy: HeirarchyData;
  heirarchyunitsMap = {} as HeirarchyUnitsData[];
  heirarchyunitMap: HeirarchyUnitsData[];
  selectedHeirarchyunit: HeirarchyUnitsData;
  selectedHeirarchyunitcontext: MenuItem[];
  loading: boolean = false;
  processdialog: boolean = false;

  constructor(
    private messageService: MessageService,
    private router: Router,
    private location: Location,
    private metadataConfigService: MetadataConfigService,
    private manageheirarchyunitservice: ManageHeirarchyUnitService,
    private manageheirarchyservice: ManageHeirarchyService,
    private breadcrumbService: AppBreadcrumbService
  ) {}

  ngOnInit(): void {
    if (sessionStorage.getItem('username') == null) {
      this.addError(
        'Session Expired.',
        'Your current session has expired. Re-login.'
      );
      this.router.navigate(['']);
    } else {
      this.metadataConfigService.getHeirarchyList().subscribe((p) => {
        this.heirarchyMap = p;
      });
      this.loadHeirarchyUnits();
      this.selectedHeirarchyunitcontext = [
        {
          label: 'Edit',
          icon: 'pi pi-search',
          command: (event) =>
            this.viewHeirarchyunit(this.selectedHeirarchyunit),
        },
        {
          label: 'Delete',
          icon: 'pi pi-times',
          command: (event) => this.updateHeirarchyunit(),
        },
      ];
    }
    document.getElementById('uB').style.display = 'none';
  }

  heirarchyname: string;
  heirarchyid: number;
  onOUSelect() {
    this.heirarchyunitsMap = [];
    if (this.heirarchyunitMap) {
      this.heirarchyunitMap.filter((p) => {
        if (p.heirarchyid === this.selectedHeirarchy.heirarchyid) {
          this.heirarchyunitsMap.push(p);
        }
      });
    }
    this.heirarchyid = this.selectedHeirarchy.heirarchyid;
    this.heirarchyname = this.selectedHeirarchy.name;
    this.buildHeirarchyTree(this.heirarchyunitsMap);
  }

  loadHeirarchyUnits() {
    setTimeout(() => {
      this.loading = true;
      this.metadataConfigService.getHeirarchyUnitsList().subscribe(
        (p) => {
          this.heirarchyunitMap = p;
          this.loading = false;
        },
        (error) => {
          this.addError(
            'Failed!',
            'Failed to load heirarchyunits. Check your network connection.'
          );
          this.loading = false;
        }
      );
    }, 1000);
  }

  heirarchyUnitParentName: string;
  heirarchyUnitParentId: number;
  _parentIdAbs: number = 0;
  heirarchyOnSelect(event): void {
    document.getElementById('sB').style.display = 'inline';
    document.getElementById('uB').style.display = 'none';
    this.heirarchyunit = {} as HeirarchyUnitsData;
    this._parentIdAbs = event.node.parent.heirarchyunitid;
    this.heirarchyUnitParentName = this.selectedHeirarchyunit.name;
    this.selectedHeirarchyunit.parentid =
      this.selectedHeirarchyunit.heirarchyunitid;
    this.heirarchyUnitParentId = this.selectedHeirarchyunit.heirarchyunitid;
  }

  moveHeirarchyunit(event) {
    this.heirarchyunit.name = event.dragNode.name;
    this.heirarchyunit.shortname = event.dragNode.shortname;
    this.heirarchyunit.heirarchyunitid = event.dragNode.heirarchyunitid;
    this.heirarchyunit.heirarchyid = event.dragNode.heirarchyid;
    this.heirarchyunit.population = event.dragNode.population;
    this.heirarchyunit.areasqm = event.dragNode.areasqm;
    this.heirarchyunit.levelname = event.dragNode.levelname;
    this.heirarchyunit.altname = event.dragNode.altname;
    this.heirarchyunit.code = event.dragNode.code;
    this.heirarchyunit.geoCode = event.dragNode.geoCode;
    this.heirarchyunit.featureType = event.dragNode.featureType;
    this.heirarchyunit.coordinates = event.dragNode.coordinates;
    this.heirarchyunit.url = event.dragNode.url;
    this.heirarchyunit.description = event.dragNode.description;
    this.heirarchyunit.address = event.dragNode.address;
    this.heirarchyunit.phone_number = event.dragNode.phone_number;
    this.heirarchyunit.active = event.dragNode.active;
    this.heirarchyunit.openingdate = event.dragNode.openingdate;
    this.heirarchyunit.closeddate = event.dragNode.closeddate;
    this.heirarchyunit.created_by = event.dragNode.created_by;
    this.heirarchyunit.created_date = event.dragNode.created_date;
    this.heirarchyunit.parentid = event.dropNode.heirarchyunitid;
    this.updateHeirarchyunit();
    this.loadHeirarchyUnits();
    this.onOUSelect();
  }
  viewHeirarchyunit(s: HeirarchyUnitsData) {
    document.getElementById('uB').style.display = 'inline';
    document.getElementById('sB').style.display = 'none';
    this.heirarchyunit.name = s.name;
    this.heirarchyunit.shortname = s.shortname;
    this.heirarchyunit.heirarchyunitid = s.heirarchyunitid;
    this.heirarchyunit.heirarchyid = s.heirarchyid;
    this.heirarchyunit.population = s.population;
    this.heirarchyunit.areasqm = s.areasqm;
    this.heirarchyunit.levelname = s.levelname;
    this.heirarchyunit.altname = s.altname;
    this.heirarchyunit.code = s.code;
    this.heirarchyunit.geoCode = s.geoCode;
    this.heirarchyunit.featureType = s.featureType;
    this.heirarchyunit.coordinates = s.coordinates;
    this.heirarchyunit.url = s.url;
    this.heirarchyunit.description = s.description;
    this.heirarchyunit.address = s.address;
    this.heirarchyunit.phone_number = s.phone_number;
    this.heirarchyunit.active = s.active;
    this.heirarchyunit.openingdate = s.openingdate;
    this.heirarchyunit.closeddate = s.closeddate;
    this.heirarchyunit.created_by = s.created_by;
    this.heirarchyunit.created_date = s.created_date;
    this.heirarchyunit.parentid = this._parentIdAbs;
  }

  updateHeirarchyunit() {
    if (this.heirarchyunit) {
      this.heirarchyunits = [];
      this.heirarchyunits.push(this.heirarchyunit);
      setTimeout(() => {
        this.manageheirarchyunitservice
          .createHeirachyunit(this.heirarchyunits)
          .subscribe(
            (data) => {
              this.addSuccess(
                'Success!',
                'Heirarchy unit updated successfully.'
              );
              this.loadHeirarchyUnits();
              this.onOUSelect();
            },
            (response) => {
              this.addError('Failed!', 'Could not update heirarchy unit.');
            }
          );
      }, 1000);
    }
  }

  deleteHeirarchyunit() {}
  heirarchyunits: any[];
  addHeirarchyunit() {
    this.heirarchyunits = [];
    this.heirarchyunit.heirarchyid = this.selectedHeirarchy.heirarchyid;
    //this.heirarchyunit.created_by = +sessionStorage.getItem('userid');
    //this.heirarchyunit.created_date= Date.now();
    if (this.selectedHeirarchyunit) {
      this.heirarchyunit.parentid = this.selectedHeirarchyunit.parentid;
    } else {
      this.heirarchyunit.parentid = 0;
    }
    this.heirarchyunits.push(this.heirarchyunit);
    this.manageheirarchyunitservice
      .createHeirachyunit(this.heirarchyunits)
      .subscribe(
        (data) => {
          this.loadHeirarchyUnits();
          // this.onOUSelect();
          // this.buildHeirarchyTree(this.heirarchyunitsMap);
          this.addSuccess('Success!', 'Heirarchy unit added successfully.');
        },
        (error) => {
          this.addError(
            'Failed!',
            'Could not add heirarchy unit.' + error.errorText
          );
        }
      );
  }

  private buildHeirarchyTree(list) {
    this.roots = [];
    if (list.length > 0) {
      var map = {},
        node,
        i;
      for (i = 0; i < list.length; i += 1) {
        map[list[i].heirarchyunitid] = i; // initialize the map here dami
        list[i].children = []; // initialize the children here dami
      }
      for (i = 0; i < list.length; i += 1) {
        node = list[i];
        if (node.parentid !== 0) {
          //dami oooo set the parentid here as 0
          list[map[node.parentid]].children.push(node);
        } else {
          this.roots.push(node);
          this.roots.sort();
        }
      }
    }
    return this.roots;
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
}
