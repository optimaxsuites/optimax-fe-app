import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { MenuItem, LazyLoadEvent, ConfirmationService } from 'primeng/api';
import {
  CalculatedFieldService,
  ConditionalFormattingService,
  DisplayOption,
  FieldListService,
  IDataSet,
  NumberFormattingService,
  PivotView,
  ToolbarItems,
  ToolbarService,
  DrillThroughService
} from '@syncfusion/ej2-angular-pivotview';
import { GridSettings } from '@syncfusion/ej2-pivotview/src/pivotview/model/gridsettings';
import { MessageService } from 'primeng/api';
import { KPDatavisualization } from '../service/kpdatavisualization.service';
import { ChartSettings } from '@syncfusion/ej2-pivotview/src/pivotview/model/chartsettings';
import { Location } from '@angular/common';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';

import { ILoadedEventArgs, ChartTheme } from '@syncfusion/ej2-charts';
import { MetadataConfigService } from 'src/app/administration/service/metadata-config.service';
import { ManageHeirarchyUnitService } from 'src/app/administration/service/manage.heirarchy.unit.service';
import { ManageHeirarchyService } from 'src/app/administration/service/manage.heirarchy.service';
import { AppBreadcrumbService } from 'src/app/app.breadcrumb.service';
import { HeirarchyUnitsData } from 'src/app/administration/domain/heirarchyunits.data';
import { HeirarchyData } from 'src/app/administration/domain/heirarchy.data';
import { ManageClientService } from 'src/app/client/service/manage.client.service';
import { ProgramsData, ProgramStageData } from 'src/app/administration/domain/programs.data';

@Component({
  selector: 'app-kpdatavisualization',
  templateUrl: './kpdatavisualization.component.html',
  styleUrls: ['./kpdatavisualization.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [
    MessageService,
    CalculatedFieldService,
    ToolbarService,
    ConditionalFormattingService,
    FieldListService,
    NumberFormattingService,
    DrillThroughService
  ],
})
export class KPDataVisualizationComponent implements OnInit {
  kpquerybuilder;
  pivotReport: any;
  periodInDays: number = 90;
  clientExtInfo: any[] = [];
  clinicalRegistrationPVTData: any[] = [];
  toolbarOptions: ToolbarItems[];
  chartSettings: ChartSettings;
  displayOption: DisplayOption;
  loading: Boolean = false;
  regperiodmap: any;
  dvtdata: any;
  dateFrom: Date;
  dateTo: Date;
  maxDate: Date;
  curYear: string;
  selecteddvtdata: any;
  serviceformdisplay: Boolean = false;
  selectedperiod: any;
  datebetweendisplay: boolean = false;

  roots: any[] = [];
  selectedHeirarchyunit: HeirarchyUnitsData;
  heirarchyunit = {} as HeirarchyUnitsData;
  heirarchyunitsMap = {} as HeirarchyUnitsData[];
  heirarchyunitMap: HeirarchyUnitsData[];
  heirarchyMap: HeirarchyData[];
  selectedHeirarchyunitcontext: MenuItem[];
  selectedHeirarchy: HeirarchyData;
  clientservices: any;

  selectedProgramStage: ProgramStageData;
  selectedPrograms: ProgramsData;

  @ViewChild('pivotview')
  public kpdvt: PivotView;

  constructor(
    private kpdatavisualization: KPDatavisualization,
    private messageService: MessageService,
    private manageclientService:ManageClientService,
    private router: Router,
    private location: Location,
    private metadataConfigService: MetadataConfigService,
    private manageheirarchyunitservice: ManageHeirarchyUnitService,
    private manageheirarchyservice: ManageHeirarchyService,
    private breadcrumbService: AppBreadcrumbService
  ) {}

  public dataSourceSettings: any;
  public gridSettings: GridSettings;

  ngOnInit(): void {
    this.initDVTOptions();
    this.maxDate = new Date();
    this.curYear = new Date().getFullYear().toString();
    if(!this.clientservices){
      this.loadConfigMetadata();
     }
    
      this.clientservices = this.manageclientService

    this.dvtdata = [
      {
        name: 'Clinical Registrations',
        value: 'cr',
      },
      {
        name: 'Service/Program Data',
        value: 'sp',
      }
    ];
    this.regperiodmap = [
      {
        name: 'Last 30 days',
        value: 30,
      },
      {
        name: 'Last 60 days',
        value: 60,
      },
      {
        name: 'Last 90 days',
        value: 90,
      },
      {
        name: 'Last 180 days',
        value: 180,
      },
      {
        name: 'Last 1 year',
        value: 365,
      },
      {
        name: 'Date Between',
        value: 0,
      },
    ];
    if (sessionStorage.getItem('username') == null) {
      this.addError(
        'Session Expired.',
        'Your current session has expired. Re-login.'
      );
      this.router.navigate(['']);
    } 
   
      this.loadHeirarchyUnits();

     
    
  //  this.getClientServiceProgramsInfo();
  }
  initDVTOptions() {
    this.displayOption = { view: 'Both' } as DisplayOption;
    this.gridSettings = {
      columnWidth: 140,
    } as GridSettings;

    this.toolbarOptions = [
      'New',
      'Save',
      'SaveAs',
      'Rename',
      'Remove',
      'Load',
      'Grid',
      'Chart',
      'Export',
      'SubTotal',
      'GrandTotal',
      'Formatting',
      'FieldList',
    ] as ToolbarItems[];

    this.chartSettings = {
      title: 'DVT Analysis',
      chartSeries: { type: 'Column' },
      // load: (args: ILoadedEventArgs) => {
      //     let selectedTheme: string = location.hash.split('/')[1];
      //     selectedTheme = selectedTheme ? selectedTheme : 'Material';
      //     args.chart.theme = (selectedTheme.charAt(0).toUpperCase() +
      //         selectedTheme.slice(1)) as ChartTheme;
      // }
    } as ChartSettings;
  }
  _clinicalRegistrationPVTData: any = {};

  protected loadConfigMetadata(){
    this.metadataConfigService.getProgramsList().subscribe(p => {this.clientservices.programsMap = p});

   }

   showDateBetween(){
if(this.selectedperiod.value == 0){
this.datebetweendisplay = true;
}
else{
  this.datebetweendisplay = false;
}
   }
  
   showServiceForms(){
     if(this.selecteddvtdata.value=='cr'){
       this.serviceformdisplay = false;
     }
     else{
      this.serviceformdisplay = true;
     }
   }

  getClientExtendedInfo() {
    setTimeout(() => {
      this.loading = true;
      this.kpdatavisualization
        .getClientExtendedInfo(this.periodInDays)
        .subscribe(
          (data) => {
            this.clientExtInfo = data;

            if (!this.clientExtInfo) {
              this.addError('Failure', 'No clinical registration yet...');
            } else {
              this.clientExtInfo.forEach((p) => {
                this._clinicalRegistrationPVTData.gender = p.genders.name;
                this._clinicalRegistrationPVTData.religion = p.religions.name;
                this._clinicalRegistrationPVTData.language = p.languages.name;
                this._clinicalRegistrationPVTData.occupation =
                  p.occupations.name;
                this._clinicalRegistrationPVTData.qualification =
                  p.qualifications.name;
                this._clinicalRegistrationPVTData.maritalstatus =
                  p.maritalstatus.name;
                this._clinicalRegistrationPVTData.disability =
                  p.disabilities.name;
                this._clinicalRegistrationPVTData.targetgroup =
                  p.targetgroups.name;
                this._clinicalRegistrationPVTData.lga =
                  p.localGovernmentArea.name;
                this._clinicalRegistrationPVTData.facility =
                  p.heirarchyunits.name;
                this._clinicalRegistrationPVTData.hospitalNum = p.hospitalNum;
                this._clinicalRegistrationPVTData.dateofbirth = p.dateBirth;
                this._clinicalRegistrationPVTData.dateofregistration =
                  p.dateRegistration;
                this._clinicalRegistrationPVTData.careentrypoint =
                  p.careentrypoint.name;
                this._clinicalRegistrationPVTData.priorart = p.priorart.name;
                this._clinicalRegistrationPVTData.referredfrom =
                  p.referredfrom.name;

                this.clinicalRegistrationPVTData.push(
                  this._clinicalRegistrationPVTData
                );
                this._clinicalRegistrationPVTData = {};
              });
            }
            
            this.dataSourceSettings = {
              enableSorting: true,
              columns: [
                { name: 'facility', caption: 'OSS' },
                { name: 'gender', caption: 'Gender' },
              ],
              values: [{ name: 'hospitalNum', caption: 'Values' }],
              dataSource: this.clinicalRegistrationPVTData,
              rows: [{ name: 'targetgroup', caption: 'Target Group' }],
              formatSettings: [{ name: 'Amount', format: 'C0' }],
              expandAll: true,
              filters: [],
            };


            this.loading = false;
          },
          (error) => {
            this.addError('Failure', 'Poor network connectivity discovered...');
          }
        );
    }, 5000);
  }


  getClientServiceProgramsInfo() {
    setTimeout(() => {
      this.loading = true;
      this.kpdatavisualization
        .getProgramServiceDataDVT(this.form_identifier)
        .subscribe(
          (data) => {
            this.clinicalRegistrationPVTData = data;

            this.dataSourceSettings = {
              enableSorting: true,
              columns: [
                { name: 'facility', caption: 'OSS' },
                { name: 'gender', caption: 'Gender' },
              ],
              values: [{ name: 'hospitalNum', caption: 'Values' }],
              dataSource: this.clinicalRegistrationPVTData,
              rows: [{ name: 'targetgroup', caption: 'Target Group' }],
              formatSettings: [{ name: 'Amount', format: 'C0' }],
              expandAll: true,
              filters: [],
            };
           this.loading = false;
          },
          (error) => {
            this.addError('Failure', 'Poor network connectivity discovered...');
          }
        );
    },2000)
    
  }

  loadHeirarchyUnits() {
   /// if(this.heirarchyunitMap){
    setTimeout(() => {
      this.loading = true;
      this.metadataConfigService.getHeirarchyUnitsListById(1).subscribe(
        (p) => {
          this.heirarchyunitMap = p;
          this.buildHeirarchyTree(this.heirarchyunitMap);
          console.log("Got here "+this.heirarchyunit)
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
 // }
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




  loadData() {
   
    this.clinicalRegistrationPVTData = [];
      if(this.selecteddvtdata.value == 'cr'){
        this.getClientExtendedInfo();
      }
      if(this.selecteddvtdata.value == 'sp'){
      this.getClientServiceProgramsInfo()
      }
    

    
  }

  onProgramsSelection(){

    this.clientservices.programStageMap = [];
    this.clientservices.programsMap.filter(p => {
      if(p.program_id === this.selectedPrograms.program_id){
        this.clientservices.programStageMap = p.programstages;
      }
    })

}
form_identifier
onProgramStageSelection(){
 
  if(this.clientservices.programStageMap){
    this.clientservices.programStageMap.forEach(p=>{
      if(p.program_stage_id === this.selectedProgramStage.program_stage_id){
       this.form_identifier = p.form_stage_db_identifier;
      }
    })

  }
}

  saveReport(args: any) {
    let reports = [];
    let isSaved: boolean = false;
    if (localStorage.pivotviewReports && localStorage.pivotviewReports !== '') {
      reports = JSON.parse(localStorage.pivotviewReports);
    }
    if (args.report && args.reportName && args.reportName !== '') {
      reports.map(function (item: any): any {
        if (args.reportName === item.reportName) {
          item.report = args.report;
          isSaved = true;
        }
      });
      if (!isSaved) {
        reports.push(args);
      }
      localStorage.pivotviewReports = JSON.stringify(reports);
    }
  }

  fetchReport(args: any) {
    let reportCollection: string[] = [];
    let reeportList: string[] = [];
    if (localStorage.pivotviewReports && localStorage.pivotviewReports !== '') {
      reportCollection = JSON.parse(localStorage.pivotviewReports);
    }
    reportCollection.map(function (item: any): void {
      reeportList.push(item.reportName);
    });
    args.reportName = reeportList;
  }

  loadReport(args: any) {
    let reportCollection: string[] = [];
    if (localStorage.pivotviewReports && localStorage.pivotviewReports !== '') {
      reportCollection = JSON.parse(localStorage.pivotviewReports);
    }
    reportCollection.map(function (item: any): void {
      if (args.reportName === item.reportName) {
        args.report = item.report;
      }
    });
    if (args.report) {
      this.kpdvt.dataSourceSettings = JSON.parse(
        args.report
      ).dataSourceSettings;
    }
  }

  removeReport(args: any) {
    let reportCollection: any[] = [];
    if (localStorage.pivotviewReports && localStorage.pivotviewReports !== '') {
      reportCollection = JSON.parse(localStorage.pivotviewReports);
    }
    for (let i: number = 0; i < reportCollection.length; i++) {
      if (reportCollection[i].reportName === args.reportName) {
        reportCollection.splice(i, 1);
      }
    }
    if (localStorage.pivotviewReports && localStorage.pivotviewReports !== '') {
      localStorage.pivotviewReports = JSON.stringify(reportCollection);
    }
  }
  renameReport(args: any) {
    let reportsCollection: any[] = [];
    if (localStorage.pivotviewReports && localStorage.pivotviewReports !== '') {
      reportsCollection = JSON.parse(localStorage.pivotviewReports);
    }
    if (args.isReportExists) {
      for (let i: number = 0; i < reportsCollection.length; i++) {
        if (reportsCollection[i].reportName === args.rename) {
          reportsCollection.splice(i, 1);
        }
      }
    }
    reportsCollection.map(function (item: any): any {
      if (args.reportName === item.reportName) {
        item.reportName = args.rename;
      }
    });
    if (localStorage.pivotviewReports && localStorage.pivotviewReports !== '') {
      localStorage.pivotviewReports = JSON.stringify(reportsCollection);
    }
  }

  newReport() {
    this.kpdvt.setProperties(
      {
        dataSourceSettings: { columns: [], rows: [], values: [], filters: [] },
      },
      false
    );
  }

  beforeToolbarRender(args: any) {
    args.customToolbar.splice(6, 0, {
      type: 'Separator',
    });
    args.customToolbar.splice(9, 0, {
      type: 'Separator',
    });
  }

  ngOnDestroy() {
    this.kpdatavisualization.clinicalRegistrationPVTData =
      this.clinicalRegistrationPVTData;
      this.manageclientService = this.clientservices;
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
