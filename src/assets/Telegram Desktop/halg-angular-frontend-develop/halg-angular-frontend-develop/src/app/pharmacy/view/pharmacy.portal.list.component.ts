import { Component, OnInit, OnDestroy } from '@angular/core';
import { ManagePharmacyService } from '../service/manage.pharmacy.service';
import { MessageService, MenuItem, LazyLoadEvent } from 'primeng/api';
import { AppBreadcrumbService } from '../../app.breadcrumb.service';
import { PharmacyInfoData } from 'src/app/administration/domain/consultation.data';
import { PharmacyData } from '../domain/pharmacy.data';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pharmacy.portal.list',
  templateUrl: './pharmacy.portal.list.component.html',
  styles: [
    `
      :host ::ng-deep .custom-scrolltop {
        width: 2rem;
        height: 2rem;
        border-radius: 4px;
        background-color: var(--primary-color);

        &:hover {
          background-color: var(--primary-color);
        }

        .p-scrolltop-icon {
          font-size: 1rem;
          color: var(--primary-color-text);
        }
      }
    `,
  ],
  providers: [MessageService],
})
export class PharmacyPortalListComponent implements OnInit, OnDestroy {
  pharmarcyInfo: PharmacyData[] = [];
  pharmarcyInfos: PharmacyData[] = [];
  pharmacyDataLazy: PharmacyData;
  selectedPharmacys: PharmacyData;
  loading: boolean;
  totalRecords: number;
  cols: any[];
  exportColumns: any[];
  pharmacyDataActionItems: any[];
  swithClientInfo: boolean = true;

  regperiodmap: any;
  selectedRegDays: any;
  periodInDays: number = 30;
  client_unique_identifier: any;
  selectedClients: PharmacyData;

  constructor(
    private messageService: MessageService,
    private router: Router,
    private managePharmacyService: ManagePharmacyService,
    private breadcrumbService: AppBreadcrumbService
  ) {
    this.breadcrumbService.setItems([
      { label: 'Dashboard', routerLink: ['/dashboard'] },
      { label: 'Pharmacy', routerLink: ['/prescription'] },
    ]);
  }

  ngOnInit() {
    if (sessionStorage.getItem('username') == null) {
      this.router.navigate(['']);
    }

    this.pharmacyDataActionItems = [
      {
        label: 'View Prescription',
        icon: 'pi pi-user',
        routerLink: ['/viewPrescription'],
      },
      {
        label: 'Pharmacy Order Form',
        icon: 'pi pi-user',
        routerLink: ['/pharmacyorders'],
      },
    ];

    if (this.managePharmacyService.pharmarcyInfoService.length === 0) {
      // this.loading = true;
      this.PharmacyDataInfo();
      this.addSuccess(
        'Pre',
        'Data calls for the first time might take a while...'
      );
    } else {
      this.pharmarcyInfo = this.managePharmacyService.pharmarcyInfoService;
    }

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

    this.PharmacyDataInfo();
  }

  clientInfoByDays() {
    this.periodInDays = this.selectedRegDays.value;
    this.PharmacyDataInfo();
  }

  PharmacyDataInfo() {
    this.loading = true;
    setTimeout(() => {
      this.managePharmacyService.getPharmacyExtendedInfo('userid').subscribe(
        (data) => {
          this.pharmarcyInfo = data;
          this.totalRecords = this.pharmarcyInfo.length;
          console.log('pharmacy data:', this.pharmarcyInfo);
          this.distinctById();
          this.loading = false;
        },
        (error) => {
          if (error.toString() == '403') {
            this.addError(
              'Session Timeout.',
              'Your current session has timed out. Please logout'
            );
          } else if (error.toString() == '0') {
            this.addError(
              'Connection Issue',
              'Poor or no internet connection identified.'
            );
          }
          this.loading = false;
        }
      );
    }, 1000);
  }

  PharmacyDataInfoss() {
    setTimeout(() => {
      this.managePharmacyService.getPharmacyExtendedInfo('userid').subscribe(
        (data) => {
          this.pharmarcyInfo = data;
          console.log('pharmacy data:', this.pharmarcyInfo);
          this.totalRecords = this.pharmarcyInfo.length;
          this.loading = false;
        },
        (error) => {
          this.addError('Failure', 'Poor network connectivity discovered...');
          this.loading = false;
        }
      );
    }, 1000);
  }

  loadClientDataLazily(event: LazyLoadEvent) {
    this.loading = true;

    setTimeout(() => {
      if (this.pharmarcyInfo) {
        this.pharmarcyInfo = this.pharmarcyInfo.slice(
          event.first,
          event.first + event.rows
        );
        this.loading = false;
      }
    }, 1000);
  }

  distinctById() {
    this.pharmarcyInfo = this.pharmarcyInfo.filter(
      (p, i, a) =>
        a.findIndex(
          (t) => t.client_unique_identifier === p.client_unique_identifier
        ) === i
    );
  }

  ngOnDestroy() {
    this.managePharmacyService.selectedClients = this.selectedPharmacys;
    this.managePharmacyService.pharmarcyInfoService = this.pharmarcyInfos;
  }

  viewPharmacy(pharmarcy: PharmacyData) {
    this.selectedPharmacys = { ...pharmarcy };
    console.log('this is the selected client', this.selectedPharmacys);
    // this.router.navigate(['/##/cportald']);
  }

  exportExcel() {
    import('xlsx').then((xlsx) => {
      const worksheet = xlsx.utils.json_to_sheet(this.pharmarcyInfo);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const excelBuffer: any = xlsx.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      });
      this.saveAsExcelFile(excelBuffer, 'clientExtendedInfo');
    });
  }

  saveAsExcelFile(buffer: any, fileName: string): void {
    import('file-saver').then((FileSaver) => {
      let EXCEL_TYPE =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
      let EXCEL_EXTENSION = '.xlsx';
      const data: Blob = new Blob([buffer], {
        type: EXCEL_TYPE,
      });
      FileSaver.saveAs(
        data,
        fileName + '_export_' + new Date().getTime() + EXCEL_EXTENSION
      );
    });
  }
  exportPdf() {
    this.cols = [
      { field: 'code', header: 'Code' },
      { field: 'name', header: 'Name' },
      { field: 'category', header: 'Category' },
      { field: 'quantity', header: 'Quantity' },
    ];
    this.exportColumns = this.cols.map((col) => ({
      title: col.header,
      dataKey: col.field,
    }));
    console.log(this.exportColumns);
    import('jspdf').then((jsPDF) => {
      import('jspdf-autotable').then(() => {
        const doc = new jsPDF.default('p', 'pt');
        // doc.autoTable(this.exportColumns, this.clientExtInfo);
        doc.save('clientExtendedInfo.pdf');
      });
    });
  }
  switchClientExtInfo(): boolean {
    console.log(this.swithClientInfo);
    return this.swithClientInfo
      ? (this.swithClientInfo = false)
      : (this.swithClientInfo = true);
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
