import { Component, OnInit } from '@angular/core';
import {MenuItem, MessageService} from 'primeng/api';
import {PharmacyData, DrugDispenseData, PharmacyDataExt } from '../domain/pharmacy.data';
import {ManagePharmacyService} from '../service/manage.pharmacy.service';
import {  PharmacyInfoData} from 'src/app/administration/domain/consultation.data';
import { ManageDispensingPatternService } from 'src/app/administration/service/manage.dispensingpattern';
import { ManageDrugService } from 'src/app/administration/service/manage.drug.service';
import { DrugData, DoseFrequencyData, UnitData, MedicationLine, RegimenCombo, MedicationLineRegimen, ARVDosage } from 'src/app/administration/domain/drug.data';


@Component({
  selector: 'app-pharmacy-service-dashboard',
  templateUrl: './pharmacy-service-dashboard.component.html',
  styleUrls: ['./pharmacy-service-dashboard.component.scss'],
  providers: [MessageService]
})
export class PharmacyServiceDashboardComponent implements OnInit {
  viewedClient: PharmacyData;
  viewClient: PharmacyData[];
  selectedClients: PharmacyInfoData;
  pharmarcyInfo: PharmacyData[];
  selectedPharmacy:PharmacyInfoData;
  DrugMap: DrugData[];
  DoseFrequencyMap: DoseFrequencyData[];
  UnitDataMap: UnitData[];



  dispensecreateddata = {} as DrugDispenseData;
  events: any[];
  options: any;
  header: any;
  drugDispenseDialog: boolean;
  eventDialog: boolean;
  totalRecords: number;
  changedEvent: any;
  clickedEvent = null;
  medLineMap:MedicationLineRegimen[];
    regimenMap = {} as RegimenCombo[];
    dosageMap: ARVDosage[];
    selectedMedLine: MedicationLineRegimen;
    selectedRegimenCombo: RegimenCombo;
  selectedDosage: ARVDosage;
    arvDrugDispenseList: any;
    arvdispensecreatedata =  {} as any;
    selectedARVDrug = {} as any;
    

  pharmacyDialog: boolean;
  pharmacyDataActionItems: MenuItem[];

  constructor(private messageService: MessageService, private managePharmacyService:ManagePharmacyService,
    private manageDrugService:ManageDrugService,private managedispensingpatternService:ManageDispensingPatternService)
   { }

  userActionOptions: MenuItem[];
  userProgramOptions: MenuItem[];

  ngOnInit(): void {
    this.viewedClient = this.managePharmacyService.selectedClients;
          this.userActionOptions = [
              {
                  label: 'Bio',
                  items: [{
                      label: 'Edit Info',
                      icon: 'pi pi-refresh',
                      command: () => {
                         // this.update();
                      }
                  },
                  {
                      label: 'Inactivate Client',
                      icon: 'pi pi-times',
                      command: () => {
                         // this.delete();
                      }
                  }
              ]},
              {
                  label: 'Programs',
                  items: [{
                      label: 'Active Programs',
                      icon: 'pi pi-external-link',
                     // url: 'http://angular.io'
                  },
                  {
                      label: 'Transfer Client',
                      icon: 'pi pi-upload',
                      routerLink: '/fileupload'
                  }
              ]},
              {
                  label: 'Contact Client',
                  items: [{
                      label: 'SMS',
                      icon: 'pi pi-external-link',
                     // url: 'http://angular.io'
                  },
                  {
                      label: 'Email',
                      icon: 'pi pi-upload',
                      routerLink: '/fileupload'
                  }
              ]}
          ];

          this.userProgramOptions = [
            {
                label: 'Informatics',
                items: [{
                    label: 'View BMI',
                    icon: 'pi pi-refresh',
                    command: () => {
                       // this.update();
                    }
                },
                {
                    label: 'View Temp',
                    icon: 'pi pi-times',
                    command: () => {
                       // this.delete();
                    }
                },
                {
                    label: 'Reactions',
                    icon: 'pi pi-times',
                    command: () => {
                       // this.delete();
                    }
                }

            ]}
        ];


        this.pharmacyDataActionItems =[
          {label: 'Update Prescription', icon:'pi pi-user', routerLink:['']},
          {label: 'View Prescription', icon:'pi pi-user', routerLink:['']},
        ]

    this.changedEvent = {title: '', start: null, end: '', allDay: null};
    this.options = {
     // plugins: [ dayGridPlugin, timeGridPlugin, interactionPlugin ],
      defaultDate: '2017-02-01',
      header: {
          left: 'prev,next',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      editable: true,
      eventClick: (e) => {
          this.eventDialog = true;
          this.clickedEvent = e.event;
          this.changedEvent.title = this.clickedEvent.title;
          this.changedEvent.start = this.clickedEvent.start;
          this.changedEvent.end = this.clickedEvent.end;
          this.manageDrugService.getMedicationLine().subscribe(data => {this.medLineMap = data});
          this.managedispensingpatternService.getDispensingPattern().subscribe(data => {this.dosageMap = data});
          // this.manageDrugService.getARVDrugDispenseByClient(this.viewedClient.hospitalNum).subscribe(data => {this.arvDrugDispenseList = data}


      }
  };

  this.PharmarcyDataInfo();

  }

  viewPharmacy(pharmacy: PharmacyInfoData){
    this.selectedClients = {...pharmacy};
    console.log("selected Drug:", this.selectedClients)

   // this.router.navigate(['/##/cportald']);
  }

  PharmarcyDataInfo() {
    this.managePharmacyService.getPharmarcyInfo(this.viewedClient.client_unique_identifier)
      .subscribe(data => {
        this.pharmarcyInfo = data;
        console.log("data is:", this.pharmarcyInfo)
        this.totalRecords = this.pharmarcyInfo.length;
      }
      );
  }

  DispenseDrug(dispense: DrugDispenseData) {
    this.dispensecreateddata.dispensed_by = +sessionStorage.getItem("userid");
    this.dispensecreateddata.dispensed_date = Date.now()
    //this.specimencreatedata.specimen_number = this.uuid()
    this.dispensecreateddata.clinical_drug_prescription_id = this.selectedClients.clinical_drug_prescription_id
    console.log("result sent:", this.dispensecreateddata)
    this.managePharmacyService.postDispenseDrug(this.dispensecreateddata).subscribe(
      data => {
        this.addSuccess("Success!", "Drug Dispensed successfully.");
      },
      error => {
        this.addError("Failed!", "Could not Drug Dispensed.");
      }

    );

  }


  goToAddDialog(pharmacy: PharmacyInfoData, dialog: string) {
    this.selectedClients = { ...pharmacy };
    console.log(this.selectedClients)

    if (dialog === 'dispenseDrug') {
      this.drugDispenseDialog = true;
      //console.log("selected Test:", this.selectedClients)
    }

  }

  hideDialog(dialog: string) {
    if (dialog === "dispenseDrug") {
      this.drugDispenseDialog = false;
    }

}

addSuccess(title: string, message: string) {
  this.messageService.add({ severity: 'success', summary: title, detail: message });
}
addError(title: string, message: string) {
  this.messageService.add({ severity: 'error', summary: title, detail: message });
}

}
