import { Component, OnInit } from '@angular/core';
import { Route } from '@angular/compiler/src/core';
import { Router } from '@angular/router';
import { ClientPortalService } from '../service/client.portal.service';
import { NextofKinData, PersonalData } from '../domain/client.data';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { MetadataConfigService } from 'src/app/administration/service/metadata-config.service';
import {
  GenderData,
  MaritalStatusData,
  RelationshipData,
} from 'src/app/administration/domain/gender.data';
import { OccupationData } from 'src/app/administration/domain/occupation.data';

@Component({
  template: `<p-card>
    <ng-template pTemplate="title"> Next of Kin </ng-template>

    <ng-template pTemplate="content">
      <form [formGroup]="nextofkinfb">
        <div class="p-grid p-fluid p-formgrid p-jc-center p-md-12">
          <div
            class="p-fluid p-formgrid p-grid"
            formArrayName="nextofkins"
            *ngFor="
              let nextofkin of nextofkinfb.get('nextofkins')['controls'];
              let i = index
            "
          >
            <ng-container [formGroupName]="i">
              <div class="p-field p-col-4">
                <label for="lastname"><b>Lastname</b></label>
                <input
                  id="lastname"
                  type="text"
                  pInputText
                  formControlName="lastname"
                />
              </div>
              <!--Exposed item name: {{ nextofkinfb.controls.nextofkins.controls[i].controls.lastname.value }}-->
              <div class="p-field p-col-4">
                <label for="firstname"><b>Firstname</b></label>
                <input
                  id="firstname"
                  type="text"
                  pInputText
                  formControlName="firstname"
                />
              </div>
              <div class="p-field p-col-4">
                <label for="othername"><b>Othername</b></label>
                <input
                  id="othername"
                  type="text"
                  pInputText
                  formControlName="othername"
                />
              </div>
              <div class="p-field p-col-4">
                <label for="dor"><b>Date of birth</b></label>
                <p-calendar
                  [monthNavigator]="true"
                  [yearNavigator]="true"
                  yearRange="1920:{{ curYear }}"
                  [maxDate]="maxDate"
                  formControlName="dateofbirth"
                  inputId="navigators"
                  [showIcon]="true"
                  showButtonBar="true"
                  placeholder="Enter date of birth"
                >
                </p-calendar>
              </div>

              <div class="p-field p-col-4">
                <label for="gender"><b>Gender</b></label>
                <p-dropdown
                  optionLabel="name"
                  [options]="personalregistration.genderMap"
                  formControlName="selectedGender"
                  placeholder="-Select-"
                ></p-dropdown>
              </div>

              <div class="p-field p-col-4">
                <label for="nextofkinphone"><b>Phone Number</b></label>
                <p-inputMask
                  id="nextofkinphone"
                  placeholder="(801) 2234-5678"
                  mask="(999) 9999-9999"
                  formControlName="nextofkinphone"
                ></p-inputMask>
              </div>
              <div class="p-field p-col-4">
                <label for="nextofkinaltphone"><b>Alt. Phone Number</b></label>
                <p-inputMask
                  id="nextofkinaltphone"
                  placeholder="(701) 2234-5678"
                  mask="(999) 9999-9999"
                  formControlName="nextofkinaltphone"
                ></p-inputMask>
              </div>

              <div class="p-field p-col-4">
                <label for="email"><b>Email</b></label>
                <input
                  id="email"
                  type="email"
                  [email]="true"
                  pInputText
                  formControlName="email"
                />
              </div>

              <div class="p-field p-col-4">
                <label for="maritalstatus"><b>Marital Status</b></label>
                <p-dropdown
                  [options]="personalregistration.maritalstatusMap"
                  formControlName="selectedMaritalStatus"
                  optionLabel="name"
                  placeholder="-Select-"
                ></p-dropdown>
              </div>

              <div class="p-field p-col-4">
                <label for="nextofkinrelationship"><b>Relationship</b></label>
                <p-dropdown
                  [options]="personalregistration.relationshipMap"
                  formControlName="selectedRelationship"
                  optionLabel="name"
                  placeholder="-Select-"
                ></p-dropdown>
              </div>

              <div class="p-field p-col-4">
                <label for="nextofkinoccupation"><b>Occupation</b></label>
                <p-dropdown
                  [options]="personalregistration.occupationMap"
                  formControlName="selectedOccupation"
                  optionLabel="name"
                  placeholder="-Select-"
                ></p-dropdown>
              </div>
              <div class="p-field p-col-4"></div>

              <div class="p-field p-col-12">
                <label for="contactaddress"><b>Contact Address</b></label>
                <textarea
                  id="contactaddress"
                  pInputText
                  required
                  rows="3"
                  cols="20"
                  formControlName="contactaddress"
                ></textarea>
              </div>
              <div class="p-grid p-jc-between">
                <button
                  pButton
                  pRipple
                  type="button"
                  icon="pi pi-times"
                  class="p-button-rounded p-button-danger "
                  (click)="removeNextofkin(i)"
                ></button>
              </div>
            </ng-container>
          </div>

          <div class="p-grid p-jc-between">
            <p-button
              label="Add another next of kin"
              icon="pi pi-plus"
              (click)="addNextOfKin()"
            ></p-button>
          </div>
        </div>
      </form>
      <p-table [value]="nextofkindata">
        <ng-template pTemplate="header">
          <tr>
            <th>Lastname</th>
            <th>Firstname</th>
            <th>Gender</th>
            <th>Occupation</th>
            <th>Relationship</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-nok>
          <tr>
            <td>{{ nok.lastname }}</td>
            <td>{{ nok.firstname }}</td>
            <td>{{ nok.selectedGender.name }}</td>
            <td>{{ nok.selectedOccupation.name }}</td>
            <td>{{ nok.selectedRelationship.name }}</td>
          </tr>
        </ng-template>
      </p-table>
    </ng-template>

    <ng-template pTemplate="footer">
      <p-divider type="dashed"> </p-divider>
      <div class="p-grid p-nogutter p-justify-between">
        <p-button
          label="Back"
          (click)="prevPage()"
          icon="pi pi-angle-left"
        ></p-button>
        <p-button
          label="Next"
          (click)="nextPage()"
          icon="pi pi-angle-right"
          iconPos="right"
        ></p-button>
      </div>
    </ng-template>
  </p-card>`,
})
export class ClientNextOfKinInfo implements OnInit {
  nextofkindata: any[];
  nextofkinfb: FormGroup;
  nextofkins: FormArray;
  showB: boolean = false;
  nextofkinregistration: PersonalData;
  genderMap: GenderData[];
  selectedGender: GenderData;
  genp: GenderData;
  occupationMap: OccupationData[];
  selectedOccupation: OccupationData;
  selectedMaritalStatus: MaritalStatusData;
  maritalstatusMap: MaritalStatusData[];
  relationshipMap: RelationshipData[];
  selectedRelationship: RelationshipData;
  maxDate: Date;
  minDate: string;
  curYear: string;
  personalregistration: any;

  constructor(
    private formbuilder: FormBuilder,
    private router: Router,
    private metadataConfigService: MetadataConfigService,
    private clientPortalService: ClientPortalService
  ) {}

  ngOnInit() {
    this.personalregistration = this.clientPortalService;
    // this.loadConfigMetadata();
    this.nextofkindata = this.clientPortalService.nextofkindata;
    // if(!this.nextofkindata){
    this.nextofkinfb = this.formbuilder.group({
      nextofkins: this.formbuilder.array([this.newNextofkin()]),
    });
    //}

    this.maxDate = new Date();
    this.curYear = new Date().getFullYear().toString();
  }

  /*protected loadConfigMetadata() {
    this.metadataConfigService.getGenderList().subscribe(p => { this.genderMap = p });
    this.metadataConfigService.getOccupationList().subscribe(p => { this.occupationMap = p });
    this.metadataConfigService.getRelationshipList().subscribe(p => { this.relationshipMap = p })
    this.metadataConfigService.getMaritalStatusList().subscribe(p => {this.maritalstatusMap = p});
  }*/

  addNextOfKin() {
    this.nextofkindata = this.nextofkinfb.get('nextofkins').value;
    this.nextofkins = this.nextofkinfb.get('nextofkins') as FormArray;
    this.nextofkins.push(this.newNextofkin());
  }

  newNextofkin(): FormGroup {
    return this.formbuilder.group({
      firstname: '',
      lastname: '',
      othername: '',
      nextofkinphone: '',
      nextofkinaltphone: '',
      contactaddress: '',
      selectedGender: '',
      selectedRelationship: '',
      selectedOccupation: '',
      selectedMaritalStatus: '',
      email: '',
      dateofbirth: '',
    });
  }

  removeNextofkin(i: number) {
    if (i > 0) {
      this.nextofkins.removeAt(i);
    }
  }

  nextPage() {
    this.nextofkindata = this.nextofkinfb.get('nextofkins').value;
    this.router.navigate(['sReg/biometric']);
  }

  prevPage() {
    this.nextofkindata = this.nextofkinfb.get('nextofkins').value;
    this.router.navigate(['sReg/basic']);
  }

  ngOnDestroy() {
    this.clientPortalService.nextofkindata = this.nextofkindata;
  }
}
