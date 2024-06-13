import { Component, OnInit } from '@angular/core';
import { MenuItem, MessageService, ConfirmationService } from 'primeng/api';
import { LaboratoryData } from '../domain/laboratory.data';
import { ManageLaboratoryService } from '../service/manage.laboratory.service';
import { MetadataConfigService } from 'src/app/administration/service/metadata-config.service';
import { SpecimenTypeData, SpecimenCollectionModeData } from 'src/app/administration/domain/specimentype.data';
import { TooltipModule } from 'primeng/tooltip';
import { SelectItem } from 'primeng/api';
import { SpecimenData, LaboratoryResultData, ResultData, ResultVerificationData } from 'src/app/laboratory/domain/laboratory.data';
import { InvestigationData, VitalSignData, PharmacyInfoData, AllergysData, LaboratoryInfoData } from 'src/app/administration/domain/consultation.data';

// import { ClientExtendedInfo } from 'src/app/domain/client.portal.data';
// import { ClientPortalService } from 'src/app/client/service/client.portal.service';

@Component({
  selector: 'app-laboratory-service-dashboard',
  templateUrl: './laboratory-service-dashboard.component.html',
  styleUrls: ['./laboratory-service-dashboard.component.scss'],
  providers: [MessageService]
})
export class LaboratoryServiceDashboardComponent implements OnInit {

  viewedClient: LaboratoryData;
  viewClient: LaboratoryData[];
  selectedClients: LaboratoryInfoData;
  laboratoryInfo: LaboratoryData[];
  specimenTypeMap: SpecimenTypeData[];
  specimenCollectionModeMap: SpecimenCollectionModeData[];
  selectedspecimentype: SpecimenData;

  laboratoryResult: LaboratoryResultData;
  selectedspecimenmode: SpecimenData;
  specimencreatedata = {} as SpecimenData;
  resultcreatedata = {} as ResultData;
  verificationcreatedata = {} as ResultVerificationData;

  selectedresult: ResultData;
  selectedverification: ResultVerificationData;
  result: SelectItem[];
  events: any[];
  options: any;
  header: any;
  eventDialog: boolean;
  totalRecords: number;
  changedEvent: any;
  clickedEvent = null;
  dialog: any;
  addSpecimenDialog: boolean;
  verifySpecimenDialog: boolean;
  resultReportingDialog: boolean;
  resultVerificationDialog: boolean;
  laboaratoryDialog: boolean;
  laboaratoryyDataActionItems: MenuItem[];


  constructor(private messageService: MessageService, private manageLaboratoryService: ManageLaboratoryService, private metadataConfigService: MetadataConfigService) { }


  userActionOptions: MenuItem[];
  userProgramOptions: MenuItem[];

  ngOnInit(): void {
    this.viewedClient = this.manageLaboratoryService.selectedClients;
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
        ]
      },
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
        ]
      },
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
        ]
      }
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

        ]
      }
    ];


    this.laboaratoryyDataActionItems = [
      { label: 'sample collection ', icon: 'pi pi-user', routerLink: [''] },
      { label: 'sample verification ', icon: 'pi pi-user', routerLink: [''] },
      { label: 'result reporting ', icon: 'pi pi-user', routerLink: [''] },
    ]

    this.changedEvent = { title: '', start: null, end: '', allDay: null };
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
      }
    };
    this.metadataConfigService.getSpecimenTypeList().subscribe(p => { this.specimenTypeMap = p });
    this.metadataConfigService.getSpecimenCollectionModeList().subscribe(p => { this.specimenCollectionModeMap = p });



    this.LaboratoryTestDataInfo();
    this.LaboratoryResult();

    this.result = [
      { label: 'Result Approved', value: { id: 1} },
      { label: 'Result Rejected', value: { id: 2 } }

    ];
  }

  viewLaboratory(lab: LaboratoryInfoData) {
    this.selectedClients = { ...lab };
    console.log("selected Test:", this.selectedClients)
    // this.router.navigate(['/##/cportald']);
  }


  LaboratoryTestDataInfo() {
    this.manageLaboratoryService.getLaboratoryTestInfo(this.viewedClient.client_unique_identifier)
      .subscribe(data => {
        this.laboratoryInfo = data;
        console.log("data is:", this.laboratoryInfo)
        this.totalRecords = this.laboratoryInfo.length;
      }
      );
  }

  LaboratoryResult() {
    this.manageLaboratoryService.getLaboratoryResult(this.selectedClients.clinical_lab_test_id)
      .subscribe(data => {
        this.selectedresult = data;
        console.log("result data for verification is:", this.selectedresult)
        this.totalRecords = this.selectedresult.clinical_lab_test_result_id;
      }
      );
  }


  AddSpecimen() {
    this.specimencreatedata.collected_by = +sessionStorage.getItem("userid");
    this.specimencreatedata.collected_date = Date.now()
    this.specimencreatedata.clinical_lab_test_id = this.selectedClients.clinical_lab_test_id
    this.specimencreatedata.specimen_collection_mode_id = this.selectedspecimenmode.specimen_collection_mode_id
    this.specimencreatedata.specimen_number = this.uuid()
    this.specimencreatedata.specimen_type_id = this.selectedspecimentype.specimen_type_id
    console.log("specimen collected:"+ JSON.stringify(this.specimencreatedata))
    this.manageLaboratoryService.postSpecimen(this.specimencreatedata).subscribe(
      data => {
        this.addSuccess("Success!", "Specimen added successfully.");
      },
      error => {
        this.addError("Failed!", "Could not add Specimen.");
      }

    );

  }


  AddResult(result: ResultData) {
    this.resultcreatedata.reported_by = +sessionStorage.getItem("userid");
    this.resultcreatedata.created_date = Date.now()
    //this.specimencreatedata.specimen_number = this.uuid()
    this.resultcreatedata.clinical_lab_test_id = this.selectedClients.clinical_lab_test_id
    console.log("result sent:", this.resultcreatedata)
    this.manageLaboratoryService.postLaboratoryResult(this.resultcreatedata).subscribe(
      data => {
        this.addSuccess("Success!", "Result Recorded successfully.");
      },
      error => {
        this.addError("Failed!", "Could not Record Result.");
      }

    );

  }


  AddVerification(verification: ResultVerificationData) {
    this.verificationcreatedata.verified_by = +sessionStorage.getItem("userid");
    this.verificationcreatedata.verified_date = Date.now()
    this.verificationcreatedata.clinical_lab_test_result_id = this.selectedresult.clinical_lab_test_result_id
    console.log("verification data sent:", this.verificationcreatedata)
    this.manageLaboratoryService.postResultVerification(this.verificationcreatedata).subscribe(
      data => {
        this.addSuccess("Success!", "Result Verified successfully.");
      },
      error => {
        this.addError("Failed!", "Could not Verify Result.");
      }

    );

  }

  uuid() {
    let gen = Date.now()
    let hold = gen.toString()
    return Number(hold.slice(hold.length - 4))

  }


  verifySpecimen() {
    this.specimencreatedata.collected_by = +sessionStorage.getItem("userid");
    this.specimencreatedata.collected_date = Date.now()
    //       //console.log("specimen collected:", this.specimencreatedata)
    //       this.manageLaboratoryService.getSpecimen(this.specimencreatedata).subscribe(
    //         data => {
    //           this.addSuccess("Success!","Specimen Verified.");
    //       },
    //       error => {
    //       this.addError("Failed!","Specimen Not  Verified.");
    //       }

    //       );

  }




  goToAddDialog(lab: LaboratoryInfoData, dialog: string) {
      this.selectedClients = { ...lab };
      console.log(this.selectedClients)


    if (dialog === 'addSpecimen') {
      this.addSpecimenDialog = true;
      //console.log("selected Test:", this.selectedClients)
    }
    if (dialog === 'resultVerification') {
      this.LaboratoryResult()
      this.resultVerificationDialog = true;

    }
    if (dialog === 'resultReporting') {
      this.resultReportingDialog = true;
    }


  }

  hideDialog(dialog: string) {
    if (dialog === "addSpecimen") {
      this.addSpecimenDialog = false;
    }
    if (dialog === "resultVerification") {
      this.resultVerificationDialog = false;
    }
    if (dialog === "resultReporting") {
      this.resultReportingDialog = false;
    }
  }

  addSuccess(title: string, message: string) {
    this.messageService.add({ severity: 'success', summary: title, detail: message });
  }
  addError(title: string, message: string) {
    this.messageService.add({ severity: 'error', summary: title, detail: message });
  }
}



