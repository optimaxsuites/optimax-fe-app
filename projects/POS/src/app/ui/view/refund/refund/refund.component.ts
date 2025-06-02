import { Component, HostListener, ViewChild } from '@angular/core';
import { MenuItem, MessageService } from 'primeng/api';
import { ChangeDetectorRef } from '@angular/core';
import { Menu, MenuModule } from 'primeng/menu';

import { OverlayPanel, OverlayPanelModule } from 'primeng/overlaypanel';
import { Refund, RefundMethod, RefundStatus } from '../../../models/interface';
import { MetadataService } from '../../../service/metadata.service';






@Component({
  selector: 'app-refund',
  templateUrl: './refund.component.html',
  styleUrl: './refund.component.scss'
})



export class RefundComponent {
  
  @ViewChild('op') op!: OverlayPanel;  // Reference to the Overlay Panel
  selectedDate: Date | null = null;
  searchQuery: string = '';
  dropdownIndex: number | null = null;
  isModalOpen: boolean = false;
  selectedRefund: Refund | null = null; // Store the selected refund
  cashierList: string[] = [];
  selectedCashier: string  | null= null;
  selectedStatus: string | null = null;
  startDate: any;
  endDate: any;
  selectedDay: string | null = null;
  daysOfWeek: string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  isDatePickerOpen = false;
  dateRange: Date[] = [];
  items: any[] = [];
  statuses: string[] = Object.keys(RefundStatus)
  refundList: Refund[] = []
  filteredRefundList: Refund[] = [...this.refundList];
  returnReasons = [
    { label: 'Defective Product', value: 'DEFECTIVE' },
    { label: 'Wrong Item Received', value: 'WRONG_ITEM' },
    { label: 'Changed Mind', value: 'CHANGED_MIND' },
    { label: 'Size/Fit Issue', value: 'SIZE_ISSUE' },
    { label: 'Item Not As Described', value: 'NOT_AS_DESCRIBED' },
    { label: 'Others', value: 'OTHERS' }
  ]
  adminComment: string = ''
  refundDetails = [
    { label: 'Customer', value: this.selectedRefund?.name },
    { label: 'Amount Requested', value: '₦' + this.selectedRefund?.refundableAmount },
    // { label: 'Reason Type', value: this.getRefundReasonLabel(this.selectedRefund?.reason) },
    { label: 'Return Mode', value: this.selectedRefund?.refundReason },
    { label: 'Customer Phone', value: this.selectedRefund?.phoneNumber },
    { label: 'Payment ID', value: this.selectedRefund?.orderId },
    { label: 'Royalty Account ID', value: this.selectedRefund?.royaltyAccountId },
    { label: 'Requested Date', value: this.formatDate(this.selectedRefund?.createdAt) }
  ];
    
 constructor(

  private messageService: MessageService,
  private cdr: ChangeDetectorRef,
  private metadataService: MetadataService
) {}

  ngOnInit() {
    this.loadRefund()
    // this.getCashierList();
    // this.filterTable();
  }

  isMenuOpen = false;

toggleMenu(event: Event) {
  event.stopPropagation();
  this.isMenuOpen = !this.isMenuOpen;
}


// Close menu when clicking outside
@HostListener('document:click')
closeMenu() {
  this.isMenuOpen = false;
}

loadRefund(){
  this.metadataService.returns$.subscribe(value => {
    console.log(value)
    this.refundList = value
    this.filteredRefundList = [...value]
  })
}



// getCashierList() {
//   this.cashierList = [...new Set(this.refundList.map(refund => refund.cashier))];
// }
toggleDatePicker() {
  this.isDatePickerOpen = !this.isDatePickerOpen;
}

closeOverlay() {
  if (this.op) {
    this.op.hide();
  }
}

filterTable() {
  // Reset the filtered list
  this.filteredRefundList = [...this.refundList];

  // Apply search filter
  if (this.searchQuery) {
    const query = this.searchQuery.toLowerCase();
    this.filteredRefundList = this.filteredRefundList.filter(refund =>
      refund.orderId.toLowerCase().includes(query) ||
      // refund.cashier.toLowerCase().includes(query) ||
      refund.refundReason.toLowerCase().includes(query) ||
      refund.status.toLowerCase().includes(query) ||
      refund.createdAt.toLowerCase().includes(query)
    );
  }

  if (this.dateRange && this.dateRange.length === 2) {
    this.startDate = this.dateRange[0];
    this.endDate = this.dateRange[1];
    
    console.log("Filtering from", this.startDate, "to", this.endDate);
  }
  // Apply cashier filter
  // if (this.selectedCashier) {
  //   this.filteredRefundList = this.filteredRefundList.filter(refund => refund.cashier === this.selectedCashier);
  // }

  // Apply status filter
  if (this.selectedStatus) {
    this.filteredRefundList = this.filteredRefundList.filter(refund => refund.status === this.selectedStatus);
  }
   // Filter by selected weekday
   if (this.selectedDay) {
    this.filteredRefundList = this.filteredRefundList.filter(refund => {
      return this.getDayOfWeek(refund.createdAt) === this.selectedDay;
    });
  }

  // Apply date range filter
  if (this.startDate && this.endDate) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);

    this.filteredRefundList = this.filteredRefundList.filter(refund => {
      const refundDate = new Date(refund.createdAt);
      return refundDate >= start && refundDate <= end;
    });
  }
}

// Helper function to get the day of the week from a date
getDayOfWeek(dateString: string): string {
  const date = new Date(dateString);
  return this.daysOfWeek[date.getDay()];
}

  toggleDropdown(index: number) {
    this.dropdownIndex = this.dropdownIndex === index ? null : index;
  }

  viewRefund(refund: any) {
    this.selectedRefund = refund;
    this.isModalOpen = true;
    this.dropdownIndex = null;
    this.refundDetails = [
      { label: 'Customer', value: this.selectedRefund?.name },
      { label: 'Amount Requested', value: '₦' + this.selectedRefund?.refundableAmount },
      { label: 'Reason Type', value: this.reason(this.selectedRefund?.reason) },
      { label: 'Return Mode', value: this.selectedRefund?.refundReason },
      { label: 'Customer Phone', value: this.selectedRefund?.phoneNumber },
      { label: 'Payment ID', value: this.selectedRefund?.orderId },
      { label: 'Royalty Account ID', value: this.selectedRefund?.royaltyAccountId },
      { label: 'Requested Date', value: this.formatDate(this.selectedRefund?.createdAt) }
    ]; // Close the dropdown
  }

  selectRefund(refund: Refund) {
    this.selectedRefund = refund; // Set the selected refund
  }

  acceptRefund(refund: any) {
    if (!refund) {
      console.error("Refund is null or undefined");
      return;
    }
    console.log("Accepted:", refund);
    refund.refundStatus = 'Accepted'; // Update the status of the specific refund
    if (this.selectedRefund) {
      this.selectedRefund.status = 'Accepted';
      console.log(this.selectedRefund);
    }
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Accepted refund request successful',
      life: 3000,
      key: 'tg'
    });
    this.sortRefunds();
    this.closeModal();
    this.dropdownIndex = null; // Close the dropdown
  }

  rejectRefund(refund: any) {
    if (!refund) {
      console.error("Refund is null");
      return;
    }
    console.log("Rejected:", refund);
  refund.refundStatus = 'Rejected'; // Ensure status is updated correctly

    if (this.selectedRefund) {
      this.selectedRefund.status = 'Rejected';
    }
    this.messageService.add({
      severity: 'sucess',
      summary: 'Sucess',
      detail: 'Rejected refund request successful',
      life: 3000,
      key: 'tg'
    });
    this.sortRefunds();
    this.closeModal();
    this.dropdownIndex = null; // Close the dropdown
  }
  closeModal() {
    this.isModalOpen = false;
    this.selectedRefund = null;
  }
  sortRefunds() {
    const statusOrder: Record<string, number> = { 'Pending': 1, 'Rejected': 2, 'Accepted': 3 };
  
    this.filteredRefundList = [...this.filteredRefundList.sort((a, b) => {
      return (statusOrder[a.status as keyof typeof statusOrder] || 4) - 
             (statusOrder[b.status as keyof typeof statusOrder] || 4);
    })];
  
    this.cdr.detectChanges(); // Force UI update
  }
  
  formatDate(dateArray: any[]): string {
    if (!dateArray || dateArray.length < 3) return 'N/A';
    
    const [year, month, day, hour, minute, second] = dateArray;
    const date = new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
    
    return date.toLocaleString();
  }

  get selectedReturnReasonLabel(): string | undefined {
    return this.returnReasons.find(r => r.value === this.selectedRefund?.reason)?.label;
  }

   reason(reason: string){
    return this.returnReasons.find(r => r.value === reason)?.label;

  }  
  getStatusIcon(status?: string): string {
    switch (status) {
      case 'Processing':
        return 'pi-clock';
      case 'Accepted':
        return 'pi-check-circle';
      case 'Rejected':
        return 'pi-times-circle';
      default:
        return 'pi-info-circle';
    }
  }
  getRefundStatusClass(status?: string): string {
    switch (status) {
      case 'Pending':
        return 'text-yellow-500 bg-yellow-100';
      case 'Approved':
        return 'text-green-600 bg-green-100';
      case 'Rejected':
        return 'text-red-600 bg-red-100';
      case 'Processing':
        return 'text-blue-500 bg-blue-100';
      case 'Canceled':
        return 'text-gray-500 bg-gray-100';
      case 'Expired':
        return 'text-orange-600 bg-orange-100';
      case 'UnderReview':
        return 'text-purple-600 bg-purple-100';
      case 'Chargeback':
        return 'text-pink-600 bg-pink-100';
      default:
        return 'text-gray-800 bg-gray-200';
    }
  }
  
}
