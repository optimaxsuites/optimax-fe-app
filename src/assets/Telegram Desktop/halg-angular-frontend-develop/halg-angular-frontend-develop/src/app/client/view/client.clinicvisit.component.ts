import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ClinicalStagesData } from 'src/app/administration/domain/clinicalstage.data';
import { FunctionalStatusData } from 'src/app/administration/domain/functionalstatus.data';
import { LevelofAdherenceData } from 'src/app/administration/domain/levelofadherence.data';
import { OppInfectionsData } from 'src/app/administration/domain/oppinfections.data';
import { StatusData } from 'src/app/administration/domain/status.data';
import { ManageClinicalStagesService } from 'src/app/administration/service/manage.clinical-stages.service';
import { ManageFunctionalStatusService } from 'src/app/administration/service/manage.functionalstatus.service';
import { ManageLevelofAdherenceService } from 'src/app/administration/service/manage.levelof-adherence.service';
import { ManageOppInfectionsService } from 'src/app/administration/service/manage.opp-infections.service';
import { ManagePregnancyService } from 'src/app/administration/service/manage.pregnancy.service';
import { ManageStatusService } from 'src/app/administration/service/manage.status.service';
import { AppBreadcrumbService } from 'src/app/app.breadcrumb.service';
import { ClientExtendedInfo, ClientVisit } from '../domain/client.portal.data';
import { ClientPortalService } from '../service/client.portal.service';

@Component({
  selector: 'app-clinicvisit',
  templateUrl: './client.clinicvisit.component.html',
  styleUrls: ['./client.clinicvisit.component.scss'],
  providers: [MessageService],
})
export class ClinicvisitComponent implements OnInit {
  viewedClient: any;
  manageclientService: any;
  selectedTab: number = 1;
  clinicvisit = {} as ClientVisit;

  selectedClinicalStage = {} as any;
  clinicalStagesMap: ClinicalStagesData[] = [];
  functionalStatusMap: FunctionalStatusData[] = [];
  oppInfectionsMap: OppInfectionsData[] = [];
  levelofAdherenceMap: LevelofAdherenceData[] = [];
  selectedFunctionalStatus = {} as any;
  selectedTBStatus = {} as any;
  tBStatusMap: StatusData[] = [];
  pregnancyStatusMap: any[] = [];
  maxDate: Date;
  curYear: string;

  PostClinicVisitDialog: boolean;

  constructor(
    private messageService: MessageService,
    private router: Router,
    private manageclinicalstagesService: ManageClinicalStagesService,
    private managefunctionalstatusService: ManageFunctionalStatusService,
    private managestatusService: ManageStatusService,
    private managepregnancyService: ManagePregnancyService,
    private manageoppinfectionsService: ManageOppInfectionsService,
    private managelevelofadherenceService: ManageLevelofAdherenceService,
    private clientPortalService: ClientPortalService,
    private breadcrumbService: AppBreadcrumbService
  ) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['/dashboard'] },
      { label: 'Client Visit Record', routerLink: ['/cclinics'] },
    ]);
  }

  ngOnInit(): void {
    this.viewedClient = this.clientPortalService.selectedClinicClient;
    this.maxDate = new Date();
    this.curYear = new Date().getFullYear().toString();
    this.selectedTab = this.clientPortalService.selectedTab;

    this.loadConfigMetadata();
  }

  loadConfigMetadata() {
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

  addSuccess(arg0: string, arg1: string) {
    throw new Error('Method not implemented.');
  }
  addError(arg0: string, arg1: string) {
    throw new Error('Method not implemented.');
  }
}
