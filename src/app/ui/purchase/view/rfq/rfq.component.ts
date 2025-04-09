import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DataService } from 'src/app/ui/crm/service/data.service';
import { v4 as generateUniqueId } from 'uuid';

@Component({
  selector: 'app-rfq',
  templateUrl: './rfq.component.html',
  styleUrl: './rfq.component.scss',

  providers: [ConfirmationService, MessageService],
})
export class RfqComponent implements OnInit {
  rfqList: any[] = [];
  selectedItems: any[] = [];

  constructor(
    private dataService: DataService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.dataService.rfqList$.subscribe((rfqList) => {
      this.rfqList = rfqList;
      console.log('Updated rfqList in component:', this.rfqList);
      this.cdr.detectChanges();
    });

    const storedRfqList = localStorage.getItem('rfqList');
    if (storedRfqList) {
      this.rfqList = JSON.parse(storedRfqList);
    } else {
      this.rfqList = []; // Initialize with an empty array if no data is found
    }
  }

  viewRfq(id: string) {
    this.router.navigate(['/purchase/rfq-modal', id]);
  }

  deleteRfq(id: string): void {
    this.dataService.deleteRfq(id);
    this.cdr.detectChanges();
  }

  duplicateRfq(rfq: any): void {
    this.dataService.duplicateRfq(rfq);
    this.cdr.detectChanges();
  }

  deleteSelectedItems() {
    this.confirmationService.confirm({
      header: 'Confirmation',
      message: 'Are you sure you want to delete the selected product(s)?',
      acceptIcon: 'pi pi-check m-2',
      rejectIcon: 'pi pi-times m-2',
      rejectButtonStyleClass: 'p-button-sm m-2',
      acceptButtonStyleClass: 'p-button-outlined p-button-sm m-2',
      accept: () => {
        this.rfqList = this.rfqList.filter(
          (val) => !this.selectedItems?.includes(val)
        );
        this.selectedItems = [];
        this.messageService.add({
          severity: 'success',
          summary: 'Successful',
          detail: 'Product(s) Deleted',
          life: 3000,
        });
      },
      reject: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Unsuccessful',
          detail: 'Product(s) not Deleted',
          life: 3000,
        });
      },
    });
  }

  getSeverity(status: string) {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'inactive':
        return 'danger';
      default:
        return undefined; // or another default value
    }
  }
}
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  // throw new Error('Function not implemented.');
}
