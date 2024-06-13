import { Component, OnInit } from '@angular/core';
import { AppBreadcrumbService } from '../../app.breadcrumb.service';
//import { MetadataConfigService } from 'src/app/administration/service/metadata-config.service';
import { HeirarchyUnitsData, hpak } from '../domain/heirarchyunits.data';
import { ManageHeirarchyUnitService } from '../service/manage.heirarchy.unit.service';
import { HeirarchylistComponent } from '../view/heirarchylist.component';
import { ManageHeirarchyService } from '../service/manage.heirarchy.service';
import { MetadataConfigService } from 'src/app/administration/service/metadata-config.service';
import { Location } from '@angular/common';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import {
  MessageService,
  TreeNode,
  TreeDragDropService,
  MenuItem,
} from 'primeng/api';
import { HeirarchyData } from '../domain/heirarchy.data';

@Component({
  selector: 'app-heirarchyunit.list',
  template: `<p-toast position="top-center"></p-toast>
    <div class="p-grid">
      <div class="p-col-6 p-md-6">
        <h5>Heirarchy Selection</h5>
        <div class="card">
          <div class="p-fluid p-formgrid p-grid">
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
        </div>
      </div>
      <div class="p-col-6 p-md-6">
        <h5>Add Heirarchy Units</h5>
        <div class="card">
          <div>
            <button
              id="sB"
              pButton
              pRipple
              label="Save"
              icon="pi pi-plus"
              class="p-mr-2 p-mb-2"
              (click)="addHeirarchyunit()"
            ></button>
            <button
              id="uB"
              pButton
              pRipple
              label="Update"
              icon="pi pi-save"
              class="p-mr-2 p-mb-2"
              (click)="updateHeirarchyunit()"
            ></button>
            <button
              pButton
              pRipple
              label="Import Units"
              icon="pi pi-download"
              class="p-mr-2 p-mb-2"
              (click)="editheirarchyunit()"
            ></button>
            <button
              pButton
              pRipple
              type="button"
              [style]="{ float: 'right' }"
              icon="pi pi-chevron-left"
              label="Back"
              class="p-button-text p-mr-2"
              (click)="goBack()"
            ></button>
          </div>
          <hr />

          <div class="p-fluid">
            <div class="p-field">
              <label for="parentunitname">Parent Unit Name</label>
              <input
                id="parentunitname"
                [(ngModel)]="heirarchyUnitParentName"
                type="text"
                pInputText
                placeholder="Parent root name."
                readonly
              />
              <small>Select the root heirarchy to add units. </small>
            </div>

            <div class="p-grid p-fluid">
              <div class="p-col-12 p-md-8 p-field">
                <label for="sandardname">Standard Name</label>
                <input
                  id="sandardname"
                  [(ngModel)]="heirarchyunit.name"
                  type="text"
                  pInputText
                  placeholder="Enter standard name."
                />
              </div>
              <div class="p-col-12 p-md-4 p-field">
                <label for="shortname">Short Name</label>
                <input
                  id="shortname"
                  [(ngModel)]="heirarchyunit.shortname"
                  type="text"
                  pInputText
                  placeholder="Enter short name."
                />
              </div>
            </div>
            <div class="p-grid p-fluid">
              <div class="p-col-12 p-md-8 p-field">
                <label for="altname"> Alt Name</label>
                <input
                  id="altname"
                  [(ngModel)]="heirarchyunit.altname"
                  type="text"
                  pInputText
                  placeholder="Enter alt name."
                />
                <small id="username-help"
                  >Select the root heirarchy to add units.</small
                >
              </div>
              <div class="p-col-12 p-md-4 p-field">
                <label for="code">code</label>
                <input
                  id="code"
                  [(ngModel)]="heirarchyunit.code"
                  type="text"
                  pInputText
                  placeholder="Enter code."
                />
              </div>
            </div>
            <div class="p-grid p-fluid">
              <div class="p-col-12 p-md-12 p-field">
                <label for="decription">Description</label>
                <textarea
                  id="decription"
                  [(ngModel)]="heirarchyunit.description"
                  rows="5"
                  cols="30"
                  placeholder="Enter description"
                  pInputTextarea
                ></textarea>
              </div>
            </div>

            <div class="p-grid p-fluid">
              <div class="p-col-12 p-md-2 p-field">
                <label for="status"> Status</label>
                <p-toggleButton
                  id="status"
                  [(ngModel)]="heirarchyunit.active"
                  offLabel="Inactive"
                  onLabel="Active"
                  name="basic"
                  >Active</p-toggleButton
                >
              </div>
              <div class="p-col-12 p-md-5 p-field">
                <label for="calendar">Opened date</label>
                <span class="p-float-label">
                  <p-calendar
                    inputId="calendar"
                    [(ngModel)]="heirarchyunit.levelname"
                  ></p-calendar>
                </span>
              </div>
              <div class="p-col-12 p-md-5 p-field">
                <label for="code">Closed date</label>
                <span class="p-float-label">
                  <p-calendar
                    inputId="code"
                    [(ngModel)]="heirarchyunit.code"
                  ></p-calendar>
                </span>
              </div>
            </div>

            <div class="p-grid p-fluid">
              <div class="p-col-12 p-md-4 p-field">
                <label for="areasqm"> Area sqm</label>
                <p-inputNumber
                  inputId="areasqm"
                  [(ngModel)]="heirarchyunit.geoCode"
                  placeholder="0"
                ></p-inputNumber>
              </div>
              <div class="p-col-12 p-md-4 p-field">
                <label for="population">Population</label>
                <p-inputNumber
                  inputId="population"
                  [(ngModel)]="heirarchyunit.description"
                  placeholder="0"
                ></p-inputNumber>
              </div>

              <div class="p-col-12 p-md-4 p-field">
                <label for="featuretype">Feature type</label>
                <input
                  id="code"
                  type="text"
                  pInputText
                  placeholder="Enter feature type"
                />
              </div>
            </div>
            <div class="p-grid p-fluid">
              <div class="p-col-12 p-md-12 p-field">
                <label for="geocode">Geo Code</label>
                <textarea
                  id="geocode"
                  rows="5"
                  cols="30"
                  placeholder="Enter Geo code"
                  pInputTextarea
                ></textarea>
              </div>
            </div>

            <div class="p-grid p-fluid">
              <div class="p-col-12 p-md-6 p-field">
                <label for="coordinates">Coordinates</label>
                <input
                  id="coordinates"
                  type="text"
                  pInputText
                  placeholder="Enter Coordinates"
                />
              </div>
              <div class="p-col-12 p-md-6 p-field">
                <label for="Url">Url</label>
                <input id="Url" type="url" pInputText placeholder="Enter url" />
              </div>
            </div>
            <button
              pButton
              pRipple
              label="Save"
              icon="pi pi-plus"
              class="p-mr-2 p-mb-2"
            ></button>
          </div>

          <p-dialog
            [(visible)]="heirarchyunitDialog"
            [maximizable]="true"
            [style]="{ width: '860px' }"
            header="Import Heirarchy Units"
            [modal]="true"
            styleClass="p-fluid"
          >
            <ng-template pTemplate="content">
              <div class="p-col-12 p-fluid p-formgrid p-grid">
                <div class="card">
                  <div class="p-fluid p-formgrid p-grid">
                    <div class="p-field p-col-12 p-md-6">
                      <label for="parentnaame">Heirarchy Parent Node</label>
                      <input
                        id="parentnaame"
                        type="text"
                        placeholder="Parent node is auto filled here.
                "
                        pInputText
                        readonly
                        [(ngModel)]="heirarchyname"
                      />
                      <small id="username-help"
                        >Parent node is auto filled here.</small
                      >
                    </div>
                    <div class="p-field p-col-12 p-md-6">
                      <label for="heirarchyidentifier"
                        >Heirarchy Identifier</label
                      >
                      <input
                        id="heirarchyidentifier"
                        type="text"
                        placeholder="Heirarchy identifier here
  
                "
                        pInputText
                        readonly
                        [(ngModel)]="heirarchyUnitParentName"
                      />
                      <small id="username-help"
                        >Heirarchy identifier is the name of the
                        structure.</small
                      >
                    </div>
                  </div>

                  <div class="p-fluid p-formgrid p-grid">
                    <div class="p-field p-col-12 p-md-6">
                      <label for="Url">Url</label>
                      <input
                        id="Url"
                        type="url"
                        pInputText
                        placeholder="Enter url"
                        [(ngModel)]="importurl"
                      />
                      <small id="username-help"
                        >Attribute must have minimum of name,id and code.</small
                      >
                    </div>
                    <div class="p-field p-col-12 p-md-6">
                      <label for="format">Supported import format</label>
                      <p-dropdown
                        inputId="format"
                        optionLabel="name"
                        placeholder="JSON"
                      ></p-dropdown>
                      <small id="username-help">Supported import format.</small>
                    </div>
                  </div>
                  <div class="p-field p-col-12 p-md-12">
                    <p-button
                      label="Preview Import"
                      class="p-mr-2 p-mb-2"
                      (click)="importPreview()"
                    ></p-button>
                  </div>
                  <div class="p-field p-col-12 p-md-12">
                    <p-table
                      #dt
                      [columns]=""
                      [rows]="10"
                      [paginator]="true"
                      [value]="importPreviewMap"
                      [globalFilterFields]="[
                        'name',
                        'country.name',
                        'representative.name',
                        'status'
                      ]"
                      [(selection)]="selectedHeirarchyunit"
                      [rowHover]="true"
                      styleClass="p-datatable-customers"
                      currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                      [showCurrentPageReport]="false"
                    >
                      <ng-template pTemplate="caption">
                        <div
                          class="p-d-flex p-flex-column p-flex-md-row p-jc-md-between table-header"
                        >
                          <h5 class="p-m-0">Import Preview</h5>
                          <div
                            class="p-field p-col-8 p-md-8"
                            [style]="{ float: 'right' }"
                          >
                            <span class="p-input-icon-left">
                              <i class="pi pi-search"></i>
                              <input
                                pInputText
                                type="text"
                                (input)="
                                  dt.filterGlobal(
                                    $event.target.value,
                                    'contains'
                                  )
                                "
                                placeholder="Search..."
                              />
                            </span>
                          </div>
                        </div>
                      </ng-template>
                      <ng-template pTemplate="header">
                        <tr>
                          <th>OU Identifier</th>
                          <th>Parent Node</th>
                          <th>Incoming Id</th>
                          <th>Incoming Name</th>
                          <th>OU Identifier</th>
                          <th>Parent Id</th>
                        </tr>
                      </ng-template>
                      <ng-template pTemplate="body" let-ou>
                        <tr>
                          <td>
                            {{ heirarchyname }}
                          </td>
                          <td>
                            {{ heirarchyUnitParentName }}
                          </td>
                          <td>
                            {{ ou.heirarchyunitid }}
                          </td>
                          <td>
                            {{ ou.name ? ou.name : 'N/A' }}
                          </td>
                          <td>
                            {{ heirarchyid }}
                          </td>
                          <td>
                            {{ heirarchyUnitParentId }}
                          </td>
                        </tr>
                      </ng-template>
                    </p-table>
                  </div>

                  <div class="p-grid">
                    <div class="p-field p-col-6 p-md-4">
                      <p-button
                        label="Clear"
                        class="p-mr-2"
                        (click)="clearImportPreview()"
                      ></p-button>
                    </div>
                    <div class="p-field p-col-6">
                      <p-button
                        label="Import List"
                        class="p-mr-2"
                        (click)="importPreviewList()"
                      ></p-button>
                    </div>
                  </div>
                </div>
              </div>
            </ng-template>
          </p-dialog>
        </div>
      </div>
    </div> `,
  styleUrls: ['./heirarchyunit.list.component.scss'],
  providers: [MessageService, TreeDragDropService],
})
export class HeirarchyunitListComponent implements OnInit {
  roots: any[] = [];
  heirarchyunit = {} as HeirarchyUnitsData;
  heirarchyunitsMap = {} as HeirarchyUnitsData[];
  heirarchyunitMap: HeirarchyUnitsData[];
  heirarchyunitDialog: boolean;
  selectedHeirarchyunit: HeirarchyUnitsData;
  heirarchyList: any[];
  heirarchyMap: HeirarchyData[];
  selectedHeirarchy: HeirarchyData;
  selectedHeirarchyunitcontext: MenuItem[];
  items: HeirarchyUnitsData[];
  item: string;
  loading: boolean = false;
  updateOU: boolean = false;

  constructor(
    private messageService: MessageService,
    private router: Router,
    private location: Location,
    private metadataConfigService: MetadataConfigService,
    private manageheirarchyunitservice: ManageHeirarchyUnitService,
    private manageheirarchyservice: ManageHeirarchyService,
    private breadcrumbService: AppBreadcrumbService
  ) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['/dashboard'] },
      { label: 'METADATA', routerLink: ['/metadatalist'] },
      { label: 'MANAGE HEIRARCHY', routerLink: ['/heirarchylist'] },
    ]);
  }

  ngOnInit() {
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

  importPreviewMap: any[];
  importurl: string;
  importPreview() {
    //this.importPreviewMap = [];
    this.manageheirarchyunitservice.getImport(this.importurl).subscribe((p) => {
      this.importPreviewMap = p;
    });
  }

  clearImportPreview() {
    this.importPreviewMap = [];
  }

  _importPreviewMap = {} as any;
  importList: any[];
  importPreviewList() {
    this.importList = [];
    if (this.importPreviewMap.length > 0) {
      this.importPreviewMap.forEach((p) => {
        this._importPreviewMap.heirarchyid = this.heirarchyid;
        this._importPreviewMap.parentid = this.heirarchyUnitParentId
          ? this.heirarchyUnitParentId
          : 0;
        this._importPreviewMap.name = p.name;
        this._importPreviewMap.heirarchyunitid = p.heirarchyunitid;
        this._importPreviewMap.active = 1;

        this.importList.push(this._importPreviewMap);
        this._importPreviewMap = {} as any;
      });
    }

    this.manageheirarchyunitservice
      .createHeirachyunit(this.importList)
      .subscribe(
        (data) => {
          this.loadHeirarchyUnits();
          this.addSuccess('Success!', 'Heirarchy unit imported successfully.');
        },
        (error) => {
          this.addError(
            'Failed!',
            'Could not add heirarchy unit. ' + error.errorText
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

  editheirarchyunit() {
    this.heirarchyunitDialog = true;
  }

  goBack() {
    this.location.back();
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
