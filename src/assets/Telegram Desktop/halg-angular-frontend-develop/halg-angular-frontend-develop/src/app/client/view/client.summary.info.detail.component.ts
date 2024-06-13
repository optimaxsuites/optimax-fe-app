import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ClientExtendedInfo } from '../domain/client.portal.data';
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
  <p>{{personaldatasummary.implementing_partner_code}}/AKS/{{personaldatasummary.facility_code ? personaldatasummary.facility_code : 'NA'}}/{{personaldatasummary.selectedTargetGroup.code}}/B7/{{personaldatasummary.client_code}}</p>
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
  <p>Nigeria</p>
  </div>

  <div class="p-col-4">
  <b>State of Origin: </b>
  <p>Ogun</p>
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
  <p-table >
  <ng-template pTemplate="header">
      <tr>
          <th>Full Name</th>
          <th>Gender</th>
          <th>Phone No/Alt. Phone</th>
          <th>Relationship</th>
          <th>Occupation</th>
          <th>Address</th>
      </tr>
  </ng-template>
  <ng-template pTemplate="body" let-product>
      <tr>
          <td>{{product.code}}</td>
          <td>{{product.name}}</td>
          <td>{{product.category}}</td>
          <td>{{product.quantity}}</td>
          <td>{{product.category}}</td>
          <td>{{product.quantity}}</td>
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
  <p-button label="Submit Form" icon="pi pi-save" (onClick)="updateClientInformation()" iconPos="left"></p-button>
  </div>
  <p-button label="Previous" (onClick)="prevPage()" icon="pi pi-angle-left" iconPos="left"></p-button>
  </div>
</ng-template>
</p-card>`,
providers: [MessageService]

})
export class ClientSummaryInfoDetailComponent implements OnInit {

  personaldatasummary: any;
  personalregistration = {} as any;
  personalregistrationbatch: any[];
  selectedClientInformation: ClientExtendedInfo;

  constructor(private messageService: MessageService,
      private router: Router,
      private clientPortalService:ClientPortalService,
      private manageclientService:ManageClientService,){}
  ngOnInit() {

      this.personaldatasummary = this.clientPortalService;

  }

  firstPage() {
      this.router.navigate(['eReg/ebasic']);
  }

  prevPage() {
      this.router.navigate(['eReg/ebiometric']);
  }

  updateClientInformation(){
    this.manageclientService.createClient(this.selectedClientInformation).subscribe(
     () => {
       this.addSuccess("Success!","Client's information updated successfully.");

    },
    () => {
    this.addError("Failed!","Client's creation failed.");

  });
 }

  extractPeronalDataFromSummary(){
      this.personalregistrationbatch = [];

      this.personalregistration.hospitalNum=
      this.personaldatasummary.implementing_partner_code+'/AKS/'+this.personaldatasummary.facility_code+'/'+this.personaldatasummary.selectedTargetGroup.code+'/B7/'+this.personaldatasummary.client_code;
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
      this.personalregistration.language_id = this.personaldatasummary.selectedLanguage.language_id;
      this.personalregistration.referred_from = this.personaldatasummary.selectedRefferedfrom.reffered_from_id;
      this.personalregistration.target_group_id = this.personaldatasummary.selectedTargetGroup.target_group_id;
     // this.personalregistration.nationality_id = this.personaldatasummary.selectedNationality.nationality_id;
     // this.personalregistration.state_of_origin = this.personaldatasummary.state_of_origin;
      this.personalregistration.religion_id = this.personaldatasummary.selectedReligion.religion_id;
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
