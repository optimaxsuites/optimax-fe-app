import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { FormGroup, FormArray, FormControl, FormBuilder } from '@angular/forms';
import {
  LaboratoryTestData,
  LaboratoryTesttypeData,
} from 'src/app/administration/domain/laboratorytest.data';
import { MessageService, ConfirmationService } from 'primeng/api';
import {
  AllergiesData,
  AllergensData,
  SeverityData,
} from 'src/app/administration/domain/allergies.data';
import {
  DrugData,
  DoseFrequencyData,
  UnitData,
  MedicationLine,
  RegimenCombo,
  MedicationLineRegimen,
  ARVDosage,
} from 'src/app/administration/domain/drug.data';
import { MetadataConfigService } from 'src/app/administration/service/metadata-config.service';
import { DiagnosisConditionsData } from 'src/app/administration/domain/diagnosisconditions.data';
import {
  InvestigationData,
  VitalSignData,
  PharmacyInfoData,
  AllergysData,
  LaboratoryInfoData,
  ARVDisenseInfoData,
} from 'src/app/administration/domain/consultation.data';
//import { ConditionData } from 'src/app/administration/domain/condition.data';
import { MenuItem } from 'primeng/api';
import { ClientPortalService } from '../service/client.portal.service';
import { ClientExtendedInfo, ClientVisit } from '../domain/client.portal.data';
import { ManageAllergiesService } from '../../administration/service/manage.allergies.service';
//import { CalendarView, CalendarModule, CalendarEvent } from 'angular-calendar';
//import {DatePickerComponent} from 'ng2-date-picker';
import { CalendarModule } from 'primeng/calendar';
//import { Console } from 'console';
import { PersonalData } from '../domain/client.data';
import { CalendarOptions } from '@fullcalendar/angular'; // useful for typechecking
import { ResultData } from 'src/app/laboratory/domain/laboratory.data';
import { ManageLaboratoryService } from '../../laboratory/service/manage.laboratory.service';
import {
  EventSettingsModel,
  DayService,
  WeekService,
  WorkWeekService,
  MonthService,
  AgendaService,
} from '@syncfusion/ej2-angular-schedule';
import { ManageDrugService } from 'src/app/administration/service/manage.drug.service';
import { ManageDispensingPatternService } from 'src/app/administration/service/manage.dispensingpattern';
import { TagModule } from 'primeng/tag';
import { ManageClinicalStagesService } from 'src/app/administration/service/manage.clinical-stages.service';
import { ClinicalStagesData } from 'src/app/administration/domain/clinicalstage.data';
import { ManageFunctionalStatusService } from 'src/app/administration/service/manage.functionalstatus.service';
import { FunctionalStatusData } from 'src/app/administration/domain/functionalstatus.data';
import { ManageStatusService } from 'src/app/administration/service/manage.status.service';
import { StatusData } from 'src/app/administration/domain/status.data';
import { ManagePregnancyService } from 'src/app/administration/service/manage.pregnancy.service';
import { ManageClientService } from '../service/manage.client.service';
import { ManageOppInfectionsService } from 'src/app/administration/service/manage.opp-infections.service';
import { OppInfectionsData } from 'src/app/administration/domain/oppinfections.data';
import { LevelofAdherenceData } from 'src/app/administration/domain/levelofadherence.data';
import { ManageLevelofAdherenceService } from 'src/app/administration/service/manage.levelof-adherence.service';

@Component({
  selector: 'app-client-service-dashboard',
  templateUrl: './client-service-dashboard.component.html',
  styleUrls: ['./client-service-dashboard.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [
    DayService,
    WeekService,
    WorkWeekService,
    MonthService,
    AgendaService,
    MessageService,
    ConfirmationService,
  ],
})
export class ClientServiceDashboardComponent implements OnInit, OnDestroy {
  /* @ViewChild('dayPicker') datePicker: DatePickerComponent;
    open() { this.datePicker.api.open(); }
    close() { this.datePicker.api.close(); }   */

  private myForm: FormGroup;
  private myForm_1: FormGroup;
  private myForm_2: FormGroup;
  private myArray_2: FormArray;
  laboratoryData: any[];
  investigationcreatedata = {} as InvestigationData;
  investigationcreatedatas: InvestigationData[] = [];
  vitalsigncreatedata = {} as VitalSignData;
  vitalsigncreatedatas: VitalSignData[] = [];
  viewDate: Date = new Date();
  // view: CalendarView = CalendarView.Month;
  // CalendarView = CalendarView;
  laboratoryTesttypeMap = {} as LaboratoryTesttypeData[];
  laboratoryTesttype: LaboratoryTesttypeData;
  selectedLabTesttype: LaboratoryTesttypeData;
  laboratoryTestMap = {} as LaboratoryTestData[];
  laboratorycreatedata = {} as LaboratoryInfoData;
  laboratorycreatedatas: LaboratoryInfoData[] = [];
  prescriptioncreatedata = {} as PharmacyInfoData;
  prescriptioncreatedatas: PharmacyInfoData[] = [];
  allergiescreatedata = {} as AllergysData;
  allergiescreatedatas: AllergysData[] = [];
  selectedAllergies: AllergiesData;
  selectedAllergens: AllergensData;
  selectedSeverity: SeverityData;
  selectedPharmacy: PharmacyInfoData;
  severityMap: SeverityData[];
  allergyMap: AllergiesData[];
  allergensMap: AllergiesData[];
  vitalsignMap: VitalSignData[];
  diagnosisconditionsMap: DiagnosisConditionsData[];
  DrugMap: DrugData[];
  DoseFrequencyMap: DoseFrequencyData[];
  UnitDataMap: UnitData[];
  viewedClient: any;
  selectedresult: ResultData;
  selectedClients: LaboratoryInfoData;
  options: any;
  header: any;
  eventDialog: boolean;
  changedEvent: any;
  clickedEvent = null;
  allergyDialog: boolean;
  vitalSignDialog: boolean;
  updateVitalSignDialog: boolean;
  investigationDialog: boolean;
  updateInvestigationDialog: boolean;
  recommendationDialog: boolean;
  pharmacyDialog: boolean;
  updatePharmacyDialog: boolean;
  laborastoryDialog: boolean;
  updateLaboratoryDialog: boolean;
  viewLaboratoryDialog: boolean;
  resultDialog: boolean;
  arvdispensedialog: boolean;
  allergyselectedDate: any;
  investigationselectedDate: any;
  labselectedDate: any;
  selectedTab: number = 0;
  investlist: any;
  labList: any;
  drugList: any;
  allergiesList: any;
  Value1: any;
  value2: any;
  value3: any;
  labStatus: string[] = ['Ordered', 'Sample Collected', 'Result Reported'];
  maxDate: Date;
  minDate: string;
  curYear: string;
  clientAge;

  medLineMap: MedicationLineRegimen[];
  regimenMap = {} as RegimenCombo[];
  dosageMap: ARVDosage[];
  selectedMedLine: MedicationLineRegimen;
  selectedRegimenCombo: RegimenCombo;
  selectedDosage: ARVDosage;
  arvDrugDispenseList: any;
  arvdispensecreatedata = {} as any;
  selectedARVDrug = {} as any;

  clinicvisit = {} as ClientVisit;

  selectedClinicalStage = {} as any;
  clinicalStagesMap: ClinicalStagesData[] = [];
  functionalStatusMap: FunctionalStatusData[] = [];
  selectedFunctionalStatus = {} as any;
  selectedTBStatus = {} as any;
  tBStatusMap: StatusData[] = [];
  pregnancyStatusMap: any[] = [];
  oppInfectionsMap: OppInfectionsData[] = [];

  levelofAdherenceMap: LevelofAdherenceData[] = [];

  public data: object[] = [
    {
      TravelId: 2,
      TravelSummary: 'Paris',
      DepartureTime: new Date(2018, 1, 15, 10, 0),
      ArrivalTime: new Date(2018, 1, 15, 12, 30),
      FullDay: false,
      Source: 'London',
      Comments: 'Summer vacation planned for outstation.',
      Origin: 'Asia/Yekaterinburg',
      Destination: 'Asia/Yekaterinburg',
    },
  ];
  public selectedDate: Date = new Date(2021, 1, 15);
  public eventSettings: EventSettingsModel = {
    dataSource: this.data,
    fields: {
      id: 'TravelId',
      subject: { name: 'TravelSummary' },
      isAllDay: { name: 'FullDay' },
      location: { name: 'Source' },
      description: { name: 'Comments' },
      startTime: { name: 'DepartureTime' },
      endTime: { name: 'ArrivalTime' },
      startTimezone: { name: 'Origin' },
      endTimezone: { name: 'Destination' },
    },
  };

  constructor(
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private clientPortalService: ClientPortalService,
    private _fb: FormBuilder,
    private manageLaboratoryService: ManageLaboratoryService,
    private manageclinicalstagesService: ManageClinicalStagesService,
    private metadataConfigService: MetadataConfigService,
    private manageAllergiesService: ManageAllergiesService,
    private manageDrugService: ManageDrugService,
    private managedispensingpatternService: ManageDispensingPatternService,
    private managestatusService: ManageStatusService,
    private managefunctionalstatusService: ManageFunctionalStatusService,
    private manageoppinfectionsService: ManageOppInfectionsService,
    private managelevelofadherenceService: ManageLevelofAdherenceService,
    private managepregnancyService: ManagePregnancyService,
    private manageclientService: ManageClientService
  ) {}
  userActionOptions: MenuItem[];
  userProgramOptions: MenuItem[];

  ngOnInit(): void {
    this.viewedClient = this.clientPortalService.selectedClients;
    this.maxDate = new Date();
    this.curYear = new Date().getFullYear().toString();
    this.selectedTab = this.clientPortalService.selectedTab;
    // this.minDate = (+this.curYear).toString();

    this.clientAge =
      this.clientPortalService.getDateIn(
        this.viewedClient.dateBirth,
        new Date()
      ).year +
      'y,' +
      this.clientPortalService.getDateIn(
        this.viewedClient.dateBirth,
        new Date()
      ).month +
      'm,' +
      this.clientPortalService.getDateIn(
        this.viewedClient.dateBirth,
        new Date()
      ).days +
      'd';

    this.visitByClient();
    this.loadConfigMetadata();
    this.userActionOptions = [
      {
        label: 'Bio',
        items: [
          {
            label: 'Edit Info',
            icon: 'pi pi-refresh',
            command: () => {
              // this.update();
            },
          },
          {
            label: 'Inactivate Client',
            icon: 'pi pi-times',
            command: () => {
              // this.delete();
            },
          },
        ],
      },
      {
        label: 'Programs',
        items: [
          {
            label: 'Active Programs',
            icon: 'pi pi-external-link',
            // url: 'http://angular.io'
          },
          {
            label: 'Transfer Client',
            icon: 'pi pi-upload',
            routerLink: '/fileupload',
          },
        ],
      },
      {
        label: 'Contact Client',
        items: [
          {
            label: 'SMS',
            icon: 'pi pi-external-link',
            // url: 'http://angular.io'
          },
          {
            label: 'Email',
            icon: 'pi pi-upload',
            routerLink: '/fileupload',
          },
        ],
      },
    ];

    this.userProgramOptions = [
      {
        label: 'Informatics',
        items: [
          {
            label: 'View BMI',
            icon: 'pi pi-refresh',
            command: () => {
              // this.update();
            },
          },
          {
            label: 'View Temp',
            icon: 'pi pi-times',
            command: () => {
              // this.delete();
            },
          },
          {
            label: 'Reactions',
            icon: 'pi pi-times',
            command: () => {
              // this.delete();
            },
          },
        ],
      },
    ];

    //this.clientPortalService.getEvents().then(events => {this.events = events;});
    // this.options = {
    //     plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    //     defaultDate: '2017-02-01',
    //     header: {
    //         left: 'prev,next',
    //         center: 'title',
    //         right: 'dayGridMonth,timeGridWeek,timeGridDay'
    //     },
    //     editable: true
    // };

    // setTimeout(() => {
    //     $("#calendar").fullCalendar({
    //                     header: {
    //                         left   : 'prev,next today',
    //                         center : 'title',
    //                         right  : 'month,agendaWeek,agendaDay'
    //                     },
    //                     navLinks   : true,
    //                     editable   : true,
    //                     eventLimit : true,
    //                     events: [
    //                         {
    //                             title : 'This is your',
    //                             start : '2019-03-03T12:30:00',
    //                             color : '#f9c66a' // override!
    //                         },
    //                         {
    //                             title : 'Your meeting with john',
    //                             start : '2019-03-07T12:30:00',
    //                             end   : '2019-03-09',
    //                             color : "#019efb"
    //                         },
    //                         {
    //                             title  : 'This is Today',
    //                             start  : '2019-03-12T12:30:00',
    //                             allDay : false, // will make the time show,
    //                             color  : "#57cd5f"
    //                         }
    //                     ],  // request to load current events
    //                 });
    //  }, 100);

    this.myForm = this._fb.group({
      myArray: this._fb.array([this.initInvestigation()]),
    });

    this.myForm_1 = this._fb.group({
      myArray_1: this._fb.array([this.initPharmacy()]),
    });

    this.laboratoryData = this.clientPortalService.laboratoryData;
    this.myForm_2 = this._fb.group({
      myArray_2: this._fb.array([this.initLaboratory()]),
    });

    // this.myForm_2 = new FormGroup({
    //     myArray_2: this._fb.array([
    //         this.initLaboratory(),
    //     ])
    // });

    this.investigationlist();
    this.laboratorylist();
    this.Pharmacylist();
    this.vitalSignlist();
    this.Allergieslist();

    this.LaboratoryResult();
  }
  loadConfigMetadata() {
    this.manageAllergiesService.getAllergiess().subscribe((p) => {
      this.allergyMap = p;
    });
    this.metadataConfigService.getSeverityList().subscribe((p) => {
      this.severityMap = p;
    });
    this.metadataConfigService.getDiagnosisConditionsList().subscribe((p) => {
      this.diagnosisconditionsMap = p;
    });
    this.metadataConfigService.getDrugList().subscribe((p) => {
      this.DrugMap = p;
    });
    this.metadataConfigService.getFrequencyList().subscribe((p) => {
      this.DoseFrequencyMap = p;
    });
    this.metadataConfigService.getUnitList().subscribe((p) => {
      this.UnitDataMap = p;
    });
    this.manageAllergiesService.getAllergenss().subscribe((p) => {
      this.allergensMap = p;
    });
    this.metadataConfigService.getLaboratoryTest().subscribe((p) => {
      this.laboratoryTestMap = p;
    });
    this.metadataConfigService.getLaboratoryTestType().subscribe((p) => {
      this.laboratoryTesttypeMap = p;
    });
    this.manageDrugService.getMedicationLine().subscribe((data) => {
      this.medLineMap = data;
    });
    this.managedispensingpatternService
      .getDispensingPattern()
      .subscribe((data) => {
        this.dosageMap = data;
      });
    this.manageDrugService
      .getARVDrugDispenseByClient(this.viewedClient.hospitalNum)
      .subscribe((data) => {
        this.arvDrugDispenseList = data;
      });
    this.manageclinicalstagesService.getClinicalStage().subscribe((data) => {
      this.clinicalStagesMap = data;
    });
    this.managefunctionalstatusService
      .getFunctionalStatus()
      .subscribe((data) => {
        this.functionalStatusMap = data;
      });
    this.managestatusService.getStatuss().subscribe((data) => {
      this.tBStatusMap = data;
    });
    this.managepregnancyService.getPregnancys().subscribe((data) => {
      this.pregnancyStatusMap = data;
    });
    this.manageoppinfectionsService.getOppInfections().subscribe((data) => {
      this.oppInfectionsMap = data;
    });
    this.managelevelofadherenceService
      .getLevelofAdherence()
      .subscribe((data) => {
        this.levelofAdherenceMap = data;
      });
  }

  datediff: number;
  DateDiff(d1: Date): number {
    this.datediff =
      (new Date(d1).valueOf() - new Date().valueOf()) / (1000 * 60 * 60 * 24);
    return Math.floor(this.datediff);
  }

  arvdispensecreatedatas: any[] = [];
  arvpickupdate: Date;
  AddARVToReview() {
    if (
      !this.arvdispensecreatedata.next_arv_pick_up_date &&
      !this.arvdispensecreatedata.regimen
    ) {
      this.addError('Missing fields ', 'All fields are required...');
    } else {
      this.arvdispensecreatedata.created_by = +sessionStorage.getItem('userid');
      this.arvdispensecreatedata.created_date = new Date();
      this.arvdispensecreatedata.client_unique_identifier =
        this.viewedClient.hospitalNum;
      this.arvdispensecreatedata.arv_dispense_date = this.arvpickupdate;
      this.arvdispensecreatedata.medicationline = this.selectedMedLine.name;
      this.arvdispensecreatedata.regimen = this.selectedRegimenCombo.name;
      this.arvdispensecreatedata.regimencombo_id =
        this.selectedRegimenCombo.regimencombo_id;
      this.arvdispensecreatedata.dosage = this.selectedDosage.name;
      this.arvdispensecreatedata.dosage_duration_id =
        this.selectedDosage.drugdispensepattern_id;
      this.arvdispensecreatedata.arv_next_appointment_date =
        this.arvdispensecreatedata.next_arv_pick_up_date;
      this.arvdispensecreatedatas.push(this.arvdispensecreatedata);
      this.arvdispensecreatedata = {} as any;
    }
  }

  visitsByClient: any[] = [];
  visitByClient() {
    this.clientPortalService
      .getClinicalServicesByClient(this.viewedClient.hospitalNum)
      .subscribe((data) => {
        this.visitsByClient = data;
      });
  }

  PostClinicVisit() {
    if (this.clinicvisit) {
      this.clinicvisit.created_by = +sessionStorage.getItem('userid');
      this.clinicvisit.created_date = Date.now();
      this.clinicvisit.client_unique_identifier = this.viewedClient.hospitalNum;
      this.clinicvisit.date_of_last_visit =
        this.clinicvisit.date_of_first_visit;
      this.manageclientService.createclinicvisit([this.clinicvisit]).subscribe(
        (data) => {
          this.addSuccess('Success!', 'Client visit saved successfully.');
          this.visitByClient();
        },
        (error) => {
          this.addError('Failed!', 'Client visit cannot be saved');
        }
      );
    }
  }

  SaveARVDrugDispense(saveclear) {
    if (saveclear === 'clear') {
      this.arvdispensecreatedatas = [];
    }
    if (saveclear === 'save') {
      if (this.arvdispensecreatedatas) {
        this.manageDrugService
          .createARVDrugDispense(this.arvdispensecreatedatas)
          .subscribe(
            () => {
              this.addSuccess(
                'Success!',
                'ARV Drug(s) dispensed  successfully.'
              );
              this.manageDrugService
                .getARVDrugDispenseByClient(this.viewedClient.hospitalNum)
                .subscribe((data) => {
                  this.arvDrugDispenseList = data;
                });
            },
            () => {
              this.addError('Failed!', 'ARV Drug(s) dispensed unsuccessfully');
            }
          );
      }
    }
  }
  CalculateNextAppointmentDate() {
    if (this.selectedDosage.tablet_no) {
      this.arvdispensecreatedata.next_arv_pick_up_date = new Date(
        this.arvpickupdate.getTime() +
          this.selectedDosage.tablet_no * 1000 * 60 * 60 * 24
      );
    }
  }
  onMedLineChange() {
    this.regimenMap = [];
    this.medLineMap.filter((p) => {
      if (p.medicationline_id === this.selectedMedLine.medicationline_id) {
        this.regimenMap = p.regimen;
      }
    });
  }

  initInvestigation() {
    return this._fb.group({
      diagnosed_condition_id: new FormControl(''),
      severity_id: new FormControl(''),
      clinical_note: new FormControl(''),
      onsetdate: new FormControl(''),
    });
  }
  initPharmacy() {
    return this._fb.group({
      prescription_date: new FormControl(''),
      drug_id: new FormControl(''),
      dose: new FormControl(''),
      drug_frequency_id: new FormControl(''),
      drug_unit_id: new FormControl(''),
      prescription_note: new FormControl(''),
    });
  }
  initLaboratory() {
    return this._fb.group({
      prescription_date: new FormControl(''),
      prescribed_by_id: new FormControl(''),
      patient_id: new FormControl(''),
      laboratory_test_id: new FormControl(''),
      laboratory_test_type_id: new FormControl(''),
      test_note: new FormControl(''),
    });
  }

  addConsultation(dialog: string, i: number) {
    if (dialog == 'investigationDialog') {
      const control = <FormArray>this.myForm.controls['myArray'];
      control.push(this.initInvestigation());
    } else if (dialog == 'pharmacyDialog') {
      const control = <FormArray>this.myForm_1.controls['myArray_1'];
      control.push(this.initPharmacy());
    } else if (dialog == 'laborastoryDialog') {
      // const control = <FormArray>this.myForm_2.controls['myArray_2'];
      //  control.push(this.initLaboratory());
      //new onTesttypeSelection();

      //this.metadataConfigService.getLaboratoryTestTypeList().subscribe(p => { this.laboratoryTesttypeMap = p });
      this.laboratoryData = this.myForm_2.get('myArray_2').value;
      this.myArray_2 = this.myForm_2.get('myArray_2') as FormArray;
      this.myArray_2.push(this.initLaboratory());
    } else {
      null;
    }
  }

  removeConsultation(i: number, dialog: string) {
    if (i > 0 && dialog == 'investigationDialog') {
      const control = <FormArray>this.myForm.controls['myArray'];
      control.removeAt(i);
    } else if (i > 0 && dialog == 'pharmacyDialog') {
      const control = <FormArray>this.myForm_1.controls['myArray_1'];
      control.removeAt(i);
    } else if (i > 0 && dialog == 'laborastoryDialog') {
      const control = <FormArray>this.myForm_2.controls['myArray_2'];
      control.removeAt(i);
    } else {
      null;
    }
  }

  confirm(dialog: string) {
    this.confirmationService.confirm({
      message: 'Are you sure that you want to proceed?',
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        if (dialog == 'investigationDialog') {
          this.submitInvestigation();
          this.updateInvestigationDialog = false;
          this.investigationlist();
          //this.messageService.add({ severity: 'info', summary: 'Confirmed', detail: 'Successful' });
        } else if (dialog == 'pharmacyDialog') {
          this.submitPharmacy();
          //this.messageService.add({ severity: 'info', summary: 'Confirmed', detail: 'Successful' });
        } else if (dialog == 'laborastoryDialog') {
          this.submitLaboratory();
          //this.messageService.add({ severity: 'info', summary: 'Confirmed', detail: 'Successful' });
        } else if (dialog == 'vitalSignDialog') {
          this.submitVitalSigns();
          //this.messageService.add({ severity: 'info', summary: 'Confirmed', detail: 'Successful' });
        } else if (dialog == 'allergyDialog') {
          this.submitAllergies();
          //this.messageService.add({ severity: 'info', summary: 'Confirmed', detail: 'Successful' });
        } else {
          null;
        }
      },
      reject: () => {
        this.messageService.add({
          severity: 'info',
          summary: 'Rejected',
          detail: 'Failed',
        });
      },
    });
  }

  submitInvestigation() {
    this.myForm.controls.myArray.value.forEach((p) => {
      this.investigationcreatedata.diagnosed_by_id =
        +sessionStorage.getItem('userid');
      this.investigationcreatedata.diagnosed_date = Date.parse(
        this.investigationselectedDate
      );
      this.investigationcreatedata.client_unique_identifier =
        this.viewedClient.hospitalNum;
      this.investigationcreatedata.clinical_note = p.clinical_note;
      this.investigationcreatedata.onset_date = Date.parse(p.onsetdate);
      this.investigationcreatedata.diagnosed_condition_id =
        p.diagnosed_condition_id.diagnosis_condition_id;
      this.investigationcreatedata.severity_id = p.severity_id.severity_id;
      this.investigationcreatedatas.push(this.investigationcreatedata);
      this.investigationcreatedata = {} as InvestigationData;
      this.myForm.reset();
    });
    this.clientPortalService
      .createInvestigation(this.investigationcreatedatas)
      .subscribe(
        () => {
          this.addSuccess('Success!', 'Investigation added successfully.');
        },
        () => {
          this.addError('Failed!', 'Could not add Investigation.');
        }
      );
  }

  submitPharmacy() {
    this.myForm_1.controls.myArray_1.value.forEach((p) => {
      this.prescriptioncreatedata.prescribed_by_id =
        +sessionStorage.getItem('userid');
      this.prescriptioncreatedata.client_unique_identifier =
        this.viewedClient.hospitalNum;
      this.prescriptioncreatedata.prescription_date =
        this.prescriptioncreatedata.prescription_date;
      this.prescriptioncreatedata.prescription_note = p.prescription_note;

      this.prescriptioncreatedata.drug_unit_id = p.drug_unit_id.drug_unit_id;
      this.prescriptioncreatedata.drug_frequency_id =
        p.drug_frequency_id.drug_frequency_id;
      this.prescriptioncreatedata.dose = p.dose;
      this.prescriptioncreatedata.drug_id = p.drug_id.drug_id;
      this.prescriptioncreatedatas.push(this.prescriptioncreatedata);
      this.prescriptioncreatedata = {} as PharmacyInfoData;
      this.myForm_1.reset();
    });
    this.clientPortalService
      .createPrescription(this.prescriptioncreatedatas)
      .subscribe(
        () => {
          this.addSuccess('Success!', 'Investigation added successfully.');
        },
        () => {
          this.addError('Failed!', 'Could not add Investigation.');
        }
      );
  }

  submitLaboratory() {
    this.myForm_2.controls.myArray_2.value.forEach((p) => {
      this.laboratorycreatedata.ordered_by_id =
        +sessionStorage.getItem('userid');
      this.laboratorycreatedata.client_unique_identifier =
        this.viewedClient.hospitalNum;
      this.laboratorycreatedata.ordered_date = Date.parse(this.labselectedDate);
      this.laboratorycreatedata.laboratory_test_note = p.test_note;
      this.laboratorycreatedata.laboratory_test_status = this.labStatus[0];
      this.laboratorycreatedata.laboratory_test_id =
        p.laboratory_test_id.laboratory_test_id;
      this.laboratorycreatedata.laboratory_test_type_id =
        p.laboratory_test_type_id.laboratory_test_type_id;
      this.laboratorycreatedatas.push(this.laboratorycreatedata);
      this.laboratorycreatedata = {} as LaboratoryInfoData;
      this.myForm_2.reset();
    });
    this.clientPortalService
      .createlabLaboratory(this.laboratorycreatedatas)
      .subscribe(
        () => {
          this.addSuccess('Success!', 'Laboratory added successfully.');
        },
        () => {
          this.addError('Failed!', 'Could not add Laboratory.');
        }
      );
  }

  submitVitalSigns() {
    this.vitalsigncreatedata.client_unique_identifier =
      this.viewedClient.hospitalNum;
    //this.vitalsigncreatedata.created_date = this.vitalsigncreatedata.created_date;
    this.vitalsigncreatedata.created_by = +sessionStorage.getItem('userid');
    this.clientPortalService
      .createVitalSign(this.vitalsigncreatedata)
      .subscribe(
        (data) => {
          this.addSuccess('Success!', 'VitalSign added successfully.');
        },
        (error) => {
          this.addError('Failed!', 'Could not add VitalSign.');
        }
      );
  }

  submitAllergies() {
    this.allergiescreatedata.created_by = +sessionStorage.getItem('userid');
    this.allergiescreatedata.client_unique_identifier =
      this.viewedClient.hospitalNum;
    this.allergiescreatedata.created_date = Date.parse(
      this.allergyselectedDate
    );
    this.allergiescreatedata.allergen_id = this.selectedAllergens.allergen_id;
    this.allergiescreatedata.allergy_id = this.selectedAllergies.allergy_id;
    this.allergiescreatedata.severity_id = this.selectedSeverity.severity_id;
    //this.allergiescreatedata.observation = this.allergiescreatedata.observation;
    // this.allergiescreatedata.symptoms = this.allergiescreatedata.symptoms;

    //console.log(JSON.stringify("Got json as "+this.allergiescreatedata));
    this.clientPortalService
      .createAllergies(this.allergiescreatedata)
      .subscribe(
        (data) => {
          this.addSuccess('Success!', 'Allergies added successfully.');
        },
        (error) => {
          this.addError('Failed!', 'Could not add Allergies.');
        }
      );
  }

  hideVitalSignDialog() {
    this.vitalSignDialog = false;
  }

  hideallergyDialog() {
    this.allergyDialog = false;
  }
  hideARVDispenseDialog() {
    this.arvdispensedialog = false;
  }

  goToAddDialog(dialog: string) {
    if (dialog === 'allergy') {
      this.allergyDialog = true;
    }
    if (dialog === 'vitalsign') {
      this.vitalSignDialog = true;
    }
    if (dialog === 'investigation') {
      this.investigationDialog = true;
    }
    if (dialog === 'recommendation') {
      this.recommendationDialog = true;
    }
    if (dialog === 'pharmacy') {
      this.pharmacyDialog = true;
    }
    if (dialog === 'laboratory') {
      this.laborastoryDialog = true;
    }
    if (dialog === 'result') {
      this.resultDialog = true;
    }
    if (dialog === 'arvdrug') {
      this.arvdispensedialog = true;
    }
  }

  goToUpdateDialog(drug: PharmacyInfoData, dialog: string) {
    this.selectedPharmacy = { ...drug };
    if (dialog === 'vitalsign') {
      this.updateVitalSignDialog = true;
    }
    if (dialog === 'pharmacy') {
      this.updatePharmacyDialog = true;
    }
    if (dialog === 'investigation') {
      this.updateInvestigationDialog = true;
    }
    if (dialog === 'laboratory') {
      this.updateLaboratoryDialog = true;
    }
  }

  // viewPharmacy(drug: PharmacyData){
  //     this.selectedPharmacy = {...drug};
  //     console.log(this.selectedPharmacy);
  // }

  investigationlist(): void {
    this.clientPortalService
      .getInvestigation(this.viewedClient.hospitalNum)
      .subscribe((data) => {
        this.investlist = data;
      });
  }

  laboratorylist(): void {
    this.clientPortalService
      .getLaboratory(this.viewedClient.hospitalNum)
      .subscribe((data) => {
        this.labList = data;
      });
  }

  LaboratoryResult(): void {
    this.clientPortalService
      .getLaboratoryResult(this.selectedClients.clinical_lab_test_id)
      .subscribe((data) => {
        this.selectedresult = data;
        //console.log("result data for verification is:", this.selectedresult)
        //this.totalRecords = this.selectedresult.length;
      });
  }

  vitalSignlist(): void {
    this.clientPortalService
      .getVitalSign(this.viewedClient.hospitalNum)
      .subscribe((data) => {
        this.vitalsignMap = data;
      });
  }

  Pharmacylist(): void {
    this.clientPortalService
      .getPrescription(this.viewedClient.hospitalNum)
      .subscribe((data) => {
        this.drugList = data;
      });
  }

  Allergieslist(): void {
    this.clientPortalService
      .getAllergies(this.viewedClient.hospitalNum)
      .subscribe((data) => {
        this.allergiesList = data;
      });
  }

  // onTesttypeSelection(i:number){
  //     console.log(i);
  //     this.laboratoryTestMap   = [];
  //     console.log(this.laboratoryTesttypeMap)
  //     //console.log("selected",this.selectedTesttype)
  //     this.laboratoryTesttypeMap.filter(p => {
  //       if(p.laboratory_test_type_id  === this.selectedLabTesttype.laboratory_test_type_id){
  //           //console.log(this.selectedTesttype)
  //         this.laboratoryTestMap = this.selectedLabTesttype.laboratorytests;
  //         //console.log(this.laboratoryTestMap)
  //       }
  //     })
  // }

  // setView(view: CalendarView) {
  //     this.view = view;
  //     console.log(this.view)
  //   }

  handleChange(e) {
    // console.log(e)
  }

  change() {
    if (this.selectedTab < 7) this.selectedTab = 7;
    else this.selectedTab = 0;
  }

  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    dateClick: this.handleDateClick.bind(this), // bind is important!
    events: [
      { title: 'event 1', date: '2021-06-09' },
      { title: 'Next Appointment', date: '2021-06-15' },
    ],
  };
  handleDateClick(arg) {
    //alert('date click! ' + arg.dateStr)
  }

  ngOnDestroy() {
    this.clientPortalService.selectedPharmacy = this.selectedPharmacy;
    this.clientPortalService.nextofkindata = this.laboratoryData;
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
