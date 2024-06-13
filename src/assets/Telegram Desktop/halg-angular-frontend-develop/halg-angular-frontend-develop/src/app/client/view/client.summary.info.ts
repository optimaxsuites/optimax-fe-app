import {Component,OnInit} from '@angular/core';
import { Router } from '@angular/router';
import { PersonalData } from '../domain/client.data';
import { ClientPortalService } from '../service/client.portal.service';
import { MessageService } from 'primeng/api';
import { ManageClientService } from '../service/manage.client.service';


@Component({
    template:
    `<p-toast position="top-center"></p-toast>
    <p-card>
    <ng-template pTemplate="title">
    <div class="p-grid p-justify-between">
        Review and Submit
        <p-button icon="pi pi-print" iconPos="left"></p-button>
    </div>
    </ng-template>
    <div class="p-field p-col-12 p-md-12">
    <p-divider align="left" type="dashed">
    <i class="pi pi-user p-mr-2"></i>
        <b>Client Personal Information</b>
    </p-divider>
    </div>

    <ng-template pTemplate="content">
    <div class="p-col-12 p-grid p-jc-start">
    <div class="p-col-4">
    <b>Generated UID: </b>
    <p><b>{{clientUniqueIdentifier}}</b></p>
    </div>
    <div class="p-col-4">
    <b>Full Name: </b>
    <p>{{personaldatasummary.lastname}} {{personaldatasummary.firstname}} {{personaldatasummary.otherNames}}</p>
    </div>

    <div class="p-col-4">
    <b>Date of Registration: </b>
    <p>{{personaldatasummary.dateRegistration ? (personaldatasummary.dateRegistration | date) : 'N/A'}}</p>
    </div>

    <div class="p-col-4">
    <b>Date of Birth: </b>
    <p>{{personaldatasummary.dateBirth ? (personaldatasummary.dateBirth | date) : 'N/A'}}</p>
    </div>
    <div class="p-col-4">
    <b>Gender: </b>
    <p>{{personaldatasummary.selectedGender ? personaldatasummary.selectedGender.name : 'N/A' }}</p>
    </div>
    <div class="p-col-4">
    <b>Marital Status: </b>
    <p>{{personaldatasummary.selectedMaritalStatus ? personaldatasummary.selectedMaritalStatus.name : 'N/A' }}</p>
    </div>

    <div class="p-col-4">
    <b>Email: </b>
    <p>{{personaldatasummary.email ? personaldatasummary.email : 'N/A'}}</p>
    </div>
    <div class="p-col-4">
    <b>Phone: </b>
    <p>{{personaldatasummary.phone_number ? personaldatasummary.phone_number : 'N/A'}}</p>
    </div>
    <div class="p-col-4">
    <b>Alt Phone: </b>
    <p>{{personaldatasummary.alt_phone_number ? personaldatasummary.alt_phone_number : 'N/A'}}</p>
    </div>

    <div class="p-col-4">
    <b>Occupation: </b>
    <p>{{personaldatasummary.selectedOccupation ? personaldatasummary.selectedOccupation.name : 'N/A'}}</p>
    </div>
    <div class="p-col-4">
    <b>Qualification: </b>
    <p>{{personaldatasummary.selectedOccupation ? personaldatasummary.selectedOccupation.name : 'N/A'}}</p>
    </div>
    <div class="p-col-4">
    <b>Nationality: </b>
    <p>{{personaldatasummary.selectedNationality.name ? personaldatasummary.selectedNationality.name : 'N/A'}}</p>
    </div>

    <div class="p-col-4">
    <b>State of Origin: </b>
    <p>{{personaldatasummary.selectedState.name ? personaldatasummary.selectedState.name : 'N/A'}}</p>
    </div>
    <div class="p-col-4">
    <b>Contact Address: </b>
    <p>{{personaldatasummary.address ? personaldatasummary.address : 'N/A'}}</p>
    </div>
    <div class="p-col-4">
    <b>Facility Name: </b>
    <p>{{personaldatasummary.facility_name ? personaldatasummary.facility_name : 'N/A'}}</p>
    </div>

    <div class="p-col-4">
    <b>Referal: </b>
    <p>{{personaldatasummary.selectedRefferedfrom ? personaldatasummary.selectedRefferedfrom.name : 'N/A'}}</p>
    </div>
    <div class="p-col-4">
    <b>Target Group: </b>
    <p>{{personaldatasummary.selectedTargetGroup ? personaldatasummary.selectedTargetGroup.name : 'N/A'}}</p>
    </div>
    <div class="p-col-4">
    <b>Care Entry Point: </b>
    <p>{{personaldatasummary.selectedCareEntryPoint ? personaldatasummary.selectedCareEntryPoint.name : 'N/A'}}</p>
    </div>

    <div class="p-field p-col-12 p-md-12">
    <p-divider align="left" type="dashed">
    <i class="pi pi-user-plus p-mr-2"></i>
        <b>Next of Kin</b>
    </p-divider>
    </div>
    <div class="p-col-10">
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
            <td>{{nok.selectedGender.name}}</td>
            <td>{{nok.selectedOccupation.name}}</td>
            <td>{{nok.selectedRelationship.name}}</td>
        </tr>
    </ng-template>
</p-table>
    </div>

    </div>
    </ng-template>
    <ng-template pTemplate="footer">
    <p-divider type="dashed">
    </p-divider>
    
    <div class="p-grid p-nogutter p-justify-between">
    <p-button label="First Page" (onClick)="firstPage()" icon="pi pi-angle-left"></p-button>
    <div class="p-grid p-fluid">
    <p-button label="Submit Form" icon="pi pi-save" (onClick)="saveNewClient()" iconPos="left"></p-button>
    </div>
    <p-button label="Previous" (onClick)="prevPage()" icon="pi pi-angle-left" iconPos="left"></p-button>
    </div>
</ng-template>
</p-card>`,
providers: [MessageService]

})
export class ClientSummaryInfo implements OnInit{
    personaldatasummary: any;
    personalregistration = {} as any;
    personalregistrationbatch: any[];
    nextofkinsbatch: any[];
    nextofkindata: any[];
    clientUniqueIdentifier: string;
    loading: Boolean;

    constructor(private messageService: MessageService,
        private router: Router,
        private clientPortalService:ClientPortalService,
        private manageclientService:ManageClientService,
        ){}
    ngOnInit() {
 
        this.personaldatasummary = this.clientPortalService;
        this.clientUniqueIdentifier = 
        this.personaldatasummary.implementing_partner_code+'/'+ //IPs
        this.personaldatasummary.state_code+'/'+ //State Code
        this.personaldatasummary.lga_code+'/'+ //LGA COde
        this.personaldatasummary.selectedTargetGroup.code+'/'+ //TG Code
        this.personaldatasummary.oss_code+ //OSS Code
        this.personaldatasummary.selectedCareEntryPoint.code+'/'+
        this.personaldatasummary.clientcode;

        this.nextofkindata = this.clientPortalService.nextofkindata;


    }

    firstPage() {
        this.router.navigate(['sReg/basic']);
    }

    prevPage() {
        this.router.navigate(['sReg/biometric']);
    }

    saveNewClient(){
this.loading = true;
       setTimeout(() => {
        this.extractPeronalDataFromSummary();
        this.extractNextofKinsFromSummary();
        console.log(JSON.stringify(this.personalregistrationbatch));
        this.manageclientService.createClient(this.personalregistrationbatch)
        .subscribe(
        data => {
            if(data){
                this.manageclientService.createNextOfKin(this.nextofkinsbatch).subscribe(
                data => {
                    if(data){
                        this.addSuccess("Success","New client added successfully.");
                    }
                }
                )

                
            }
          
        this.loading=false;
          },
        error => {
        this.addError("Unsuccessful.","Failed to add new client. "+error.message);
            console.error(error);
            this.loading=false;
        }

         );
         
        },2000)



    }

    _nextofkin = {} as any;
    extractNextofKinsFromSummary(){
        this.nextofkinsbatch = [];
        if(this.nextofkindata){
     this.nextofkindata.forEach(p=> {
     this._nextofkin.client_unique_identifier = this.clientUniqueIdentifier;
     this._nextofkin.lastname = p.lastname;
     this._nextofkin.firstname = p.firstname;
     this._nextofkin.othername = p.othername;
     this._nextofkin.phoneno = p.nextofkinphone;
     this._nextofkin.dateofbirth = p.dateofbirth;
     this._nextofkin.alternate_phone_no = p.nextofkinaltphone;
     this._nextofkin.streetaddress = p.contactaddress;
     this._nextofkin.genderid = p.selectedGender.gender_id;
     this._nextofkin.relationshipid = p.selectedRelationship.relationship_id;
     this._nextofkin.occupationid = p.selectedOccupation.occupation_id;
     this._nextofkin.email = p.email;
     this._nextofkin.maritalstatusid = p.selectedMaritalStatus.marital_status_id;
     this._nextofkin.created_date = Date.now();
     this._nextofkin.created_by = +sessionStorage.getItem("userid");
    
     
     this.nextofkinsbatch.push(this._nextofkin);
     this._nextofkin = {} as any;
    }
    )
    console.log("Got here as "+JSON.stringify(this.nextofkinsbatch));
    }
    }

    extractPeronalDataFromSummary(){
        this.personalregistrationbatch = [];

        this.personalregistration.hospitalNum=this.clientUniqueIdentifier;
        this.personalregistration.client_code=this.personaldatasummary.clientcode;
        this.personalregistration.dateRegistration = new Date(this.personaldatasummary.dateRegistration).getTime();
        this.personalregistration.dateBirth = new Date(this.personaldatasummary.dateBirth).getTime();
        this.personalregistration.firstname = this.personaldatasummary.firstname;
        this.personalregistration.surname = this.personaldatasummary.lastname;
        this.personalregistration.otherNames= this.personaldatasummary.otherNames;
        this.personalregistration.maidenname = this.personaldatasummary.maidenname;
        this.personalregistration.marital_status_id = this.personaldatasummary.selectedMaritalStatus.marital_status_id;
        this.personalregistration.gender_id = this.personaldatasummary.selectedGender.gender_id;
        this.personalregistration.email = this.personaldatasummary.email;
        this.personalregistration.address = this.personaldatasummary.address;
        this.personalregistration.phone_number = this.personaldatasummary.phone_number;
        this.personalregistration.alt_phone_number = this.personaldatasummary.alt_phone_number;
        this.personalregistration.occupation_id = this.personaldatasummary.selectedOccupation.occupation_id;
        this.personalregistration.qualification_id = this.personaldatasummary.selectedQualification.qualification_id;
        this.personalregistration.facility_id = this.personaldatasummary.facility_id;
        this.personalregistration.heirarchyunitid = this.personaldatasummary.facility_id;
        this.personalregistration.language_id = this.personaldatasummary.selectedLanguage.language_id;
        this.personalregistration.referred_from_id = this.personaldatasummary.selectedRefferedfrom.referred_from_id;
        this.personalregistration.target_group_id = this.personaldatasummary.selectedTargetGroup.target_group_id;
        this.personalregistration.nationality_id = this.personaldatasummary.selectedNationality.nationality_id;
        this.personalregistration.lga_id = this.personaldatasummary.selectedState.lga_id;
        this.personalregistration.religion_id = this.personaldatasummary.selectedReligion.religion_id;
        this.personalregistration.care_entry_point_id = this.personaldatasummary.selectedCareEntryPoint.care_entry_point_id;
        this.personalregistration.local_government_area_id = this.personaldatasummary.selectedlga.local_government_area_id;
        this.personalregistration.userId = +sessionStorage.getItem("userid");

        this.personalregistrationbatch.push(this.personalregistration);



    }

    addSuccess(title: string, message: string) {
    this.messageService.add({ severity: 'success', summary: title, detail: message });


  }
  addError(title: string, message: string) {
    this.messageService.add({ severity: 'error', summary: title, detail: message });

  }
}
