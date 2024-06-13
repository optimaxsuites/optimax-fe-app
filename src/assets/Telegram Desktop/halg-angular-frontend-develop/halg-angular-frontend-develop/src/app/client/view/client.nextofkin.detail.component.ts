import { Component, OnInit } from '@angular/core';
import { Route } from '@angular/compiler/src/core';
import { Router } from '@angular/router';
import { ClientPortalService } from '../service/client.portal.service';
import { PersonalData } from '../domain/client.data';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { MetadataConfigService } from 'src/app/administration/service/metadata-config.service';
import { GenderData, RelationshipData } from 'src/app/administration/domain/gender.data';
import { OccupationData } from 'src/app/administration/domain/occupation.data';

@Component({
    template:
    `<p-card>
    <ng-template pTemplate="title">
        Next of Kin
    </ng-template>

    <ng-template pTemplate="content">
   
    <div class="p-grid p-jc-center p-md-12">

    <div class="p-fluid p-formgrid p-grid">
    <div class="p-field p-col-4">
    <label for="lastname"><b>Lastname</b></label>
    <input id="lastname" type="text" pInputText>
    </div>

    <div class="p-field p-col-4">
    <label for="next_of_kin_surname"><b>Firstname</b></label>
    <input id="firstname" type="text" pInputText>
    </div>
    <div class="p-field p-col-4">
    <label for="othername"><b>Othername</b></label>
    <input id="othername" type="text" pInputText>
    </div>
    <div class="p-field p-col-4">
    <label for="othername"><b>Gender</b></label>
    <p-dropdown optionValue="name"
  optionLabel="name" placeholder="-Select-"></p-dropdown>
    </div>

    <div class="p-field p-col-4">
    

    <label for="nextofkinphone"><b>Phone Number</b></label>
    <input id="nextofkinphone" type="text" pInputText>
    </div>
    <div class="p-field p-col-4">
    <label for="nextofkinaltphone"><b>Alt. Phone Number</b></label>
    <input id="nextofkinaltphone" type="text" pInputText>
    </div>

    <div class="p-field p-col-4">
    <label for="nextofkinrelationship"><b>Relationship</b></label>
    <p-dropdown optionValue="name"
  optionLabel="name" placeholder="-Select-"></p-dropdown>
    </div>

    <div class="p-field p-col-4">
    <label for="nextofkinoccupation"><b>Occupation</b></label>
    <p-dropdown optionValue="name"
  optionLabel="name" placeholder="-Select-"></p-dropdown>
    </div>
    <div class="p-field p-col-4">
    </div>

    <div class="p-field p-col-12">
    <label for="contactaddress"><b>Contact Address</b></label>
    <textarea id="contactaddress" pInputText required rows="3" cols="20"></textarea>
    </div>

    </div>
    
    <div class="p-grid p-nogutter p-justify-between">
    <p-button label="Add another next of kin" icon="pi pi-plus"></p-button>
    </div>


    </div>
   
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
            <td>{{nok.lastname}}</td>
            <td>{{nok.firstname}}</td>
            <td>{{nok.selectedGender}}</td>
            <td>{{nok.selectedOccupation}}</td>
            <td>{{nok.selectedRelationship}}</td>



        </tr>
    </ng-template>
</p-table>

    </ng-template>



    <ng-template pTemplate="footer">
    <p-divider type="dashed">
    </p-divider>
    <div class="p-grid p-nogutter p-justify-between">
    <p-button label="Back" (click)="prevPage()" icon="pi pi-angle-left"></p-button>
        <p-button label="Next" (click)="nextPage()" icon="pi pi-angle-right" iconPos="right"></p-button>
    </div>
</ng-template>
</p-card>`

})
export class ClientNextofkinDetailComponent implements OnInit{
  // personaldata = {} as  PersonalData;
  nextofkindata: any[];
  nextofkinfb: FormGroup;
  nextofkins: FormArray;
  showB: boolean=false;
  nextofkinregistration: PersonalData;
  genderMap: GenderData[];
  selectedGender: GenderData;
  occupationMap: OccupationData[];
  selectedOccupation: OccupationData;
  relationshipMap: RelationshipData[];
  selectedRelationship: RelationshipData;


    constructor(private formbuilder: FormBuilder, private router: Router, private metadataConfigService: MetadataConfigService,
      private clientPortalService:ClientPortalService){}
    ngOnInit() {
      this.loadConfigMetadata();   
      this.nextofkindata = this.clientPortalService.nextofkindata;
      console.log("Got ehre as "+this.nextofkindata.length);
      this.nextofkinfb = this.formbuilder.group({
        nextofkins: this.formbuilder.array([this.newNextofkin()])
      });


    }
    protected loadConfigMetadata(){
      this.metadataConfigService.getGenderList().subscribe(p => {this.genderMap = p});
      this.metadataConfigService.getOccupationList().subscribe(p => {this.occupationMap = p});
      this.metadataConfigService.getRelationshipList().subscribe(p=> {this.relationshipMap = p})
    }
    nextPage() {
     // this.nextofkindata = this.nextofkinfb.get('enextofkins').value;
        this.router.navigate(['eReg/ebiometric']);
        return;
    }

    prevPage() {
        this.router.navigate(['eReg/ebasic']);


    }
    newNextofkin(): FormGroup {
      return this.formbuilder.group({
        firstname: '',
        lastname:'',
        selectedGender: '',
        selectedRelationship:'',
        selectedOccupation: ''

      })

    }
}
