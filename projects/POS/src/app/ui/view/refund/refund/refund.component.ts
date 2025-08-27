import { Component, HostListener, ViewChild, OnInit } from '@angular/core';
import { MenuItem, MessageService } from 'primeng/api';
import { ChangeDetectorRef } from '@angular/core';
import { Menu, MenuModule } from 'primeng/menu';
import { OverlayPanel, OverlayPanelModule } from 'primeng/overlaypanel';
import { Refund, RefundMethod, RefundStatus } from '../../../models/interface';
import { MetadataService } from '../../../service/metadata.service';
import { getUserPermissionsFor, isSuperUser } from '../../../../shared/pipes/helper';

@Component({
  selector: 'app-refund',
  templateUrl: './refund.component.html',
  styleUrl: './refund.component.scss'
})
export class RefundComponent implements OnInit {
  @ViewChild('op') op!: OverlayPanel;  // Reference to the Overlay Panel
  selectedDate: Date | null = null;
  searchQuery: string = '';
  dropdownIndex: number | null = null;
  isModalOpen: boolean = false;
  selectedRefund: Refund | null = null; // Store the selected refund
  cashierList: string[] = [];
  selectedCashier: string | null = null;
  selectedStatus: string | null = null;
  startDate: any;
  endDate: any;
  selectedDay: string | null = null;
  daysOfWeek: string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  isDatePickerOpen = false;
  dateRange: Date[] = [];
  items: any[] = [];
  statuses: string[] = Object.values(RefundStatus);
  refundList: Refund[] = [];
  filteredRefundList: Refund[] = [];
  returnReasons = [
    { label: 'Defective Product', value: 'DEFECTIVE' },
    { label: 'Wrong Item Received', value: 'WRONG_ITEM' },
    { label: 'Changed Mind', value: 'CHANGED_MIND' },
    { label: 'Size/Fit Issue', value: 'SIZE_ISSUE' },
    { label: 'Item Not As Described', value: 'NOT_AS_DESCRIBED' },
    { label: 'Others', value: 'OTHERS' }
  ];
    
  refundPermission = {
  canView: false,
  canEdit: false,
  canDelete: false,
  canCreate: false,
  }; 

  adminComment: string = '';
  refundDetails: any[] = [];

  constructor(
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
    private metadataService: MetadataService
  ) {}

  ngOnInit() {
    this.loadRefund();
    // this.getCashierList();
    // this.filterTable();
    if (isSuperUser()) {
          this.refundPermission = {
            canView: true,
            canEdit: true,
            canDelete: true,
            canCreate: true,
          };
     } else {
           this.refundPermission = getUserPermissionsFor('POS_RFND');
      }
    console.log(Object(this.refundPermission));
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

  loadRefund() {
    this.metadataService.returns$.subscribe(value => {
      console.log(value);
      this.refundList = value;
      this.filteredRefundList = [...value];
      this.updateRefundDetails();
    });
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
    // Start with the full list
    this.filteredRefundList = [...this.refundList];

    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      this.filteredRefundList = this.filteredRefundList.filter(refund =>
        (refund.id && refund.id.toLowerCase().includes(query)) ||
        (refund.name && refund.name.toLowerCase().includes(query)) ||
        (refund.orderId && refund.orderId.toLowerCase().includes(query)) ||
        (refund.refundReason && refund.refundReason.toLowerCase().includes(query)) ||
        (refund.refundStatus && refund.refundStatus.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (this.selectedStatus) {
      this.filteredRefundList = this.filteredRefundList.filter(refund => 
        refund.refundStatus === this.selectedStatus
      );
    }

    // Filter by selected weekday
    if (this.selectedDay) {
      this.filteredRefundList = this.filteredRefundList.filter(refund => {
        return this.getDayOfWeek(refund.createdAt) === this.selectedDay;
      });
    }

    // Apply date range filter
    if (this.dateRange && this.dateRange.length === 2) {
      const start = new Date(this.dateRange[0]);
      const end = new Date(this.dateRange[1]);
      end.setHours(23, 59, 59, 999); // Include the entire end date

      this.filteredRefundList = this.filteredRefundList.filter(refund => {
        const refundDate = new Date(refund.createdAt);
        return refundDate >= start && refundDate <= end;
      });
    }

    // Apply cashier filter (commented out)
    // if (this.selectedCashier) {
    //   this.filteredRefundList = this.filteredRefundList.filter(refund => refund.cashier === this.selectedCashier);
    // }
  }

  // Helper function to get the day of the week from a date
  getDayOfWeek(dateString: string): string {
    const date = new Date(dateString);
    return this.daysOfWeek[date.getDay()];
  }

  toggleDropdown(index: number) {
    this.dropdownIndex = this.dropdownIndex === index ? null : index;
  }

  viewRefund(refund: Refund) {
    this.selectedRefund = refund;
    this.isModalOpen = true;
    this.dropdownIndex = null;
    this.updateRefundDetails();
  }

  updateRefundDetails() {
    if (this.selectedRefund) {
      this.refundDetails = [
        { label: 'Customer', value: this.selectedRefund.name || 'N/A' },
        { label: 'Amount Requested', value: '₦' + (this.selectedRefund.refundableAmount || '0') },
        { label: 'Reason Type', value: this.reason(this.selectedRefund.reason) || 'N/A' },
        { label: 'Return Mode', value: this.selectedRefund.refundReason || 'N/A' },
        { label: 'Customer Phone', value: this.selectedRefund.phoneNumber || 'N/A' },
        { label: 'Payment ID', value: this.selectedRefund.orderId || 'N/A' },
        { label: 'Royalty Account ID', value: this.selectedRefund.royaltyAccountId || 'N/A' },
        { label: 'Requested Date', value: this.formatDate(this.selectedRefund.createdAt) || 'N/A' }
      ];
    } else {
      this.refundDetails = [];
    }
  }

  selectRefund(refund: Refund) {
    this.selectedRefund = refund; // Set the selected refund
    this.updateRefundDetails();
  }

  acceptRefund(refund: Refund) {
    if (!refund) {
      console.error("Refund is null or undefined");
      return;
    }
    console.log("Accepted:", refund);
    refund.refundStatus = 'Accepted'; // Update the status of the specific refund
    
    // Update the status in the main list
    const index = this.refundList.findIndex(r => r.id === refund.id);
    if (index !== -1) {
      this.refundList[index].refundStatus = 'Accepted';
    }
    
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Accepted refund request successful',
      life: 3000,
      key: 'tg'
    });
    
    this.filterTable(); // Reapply filters
    this.closeModal();
    this.dropdownIndex = null; // Close the dropdown
  }

  rejectRefund(refund: Refund) {
    if (!refund) {
      console.error("Refund is null");
      return;
    }
    console.log("Rejected:", refund);
    refund.refundStatus = 'Rejected'; // Ensure status is updated correctly

    // Update the status in the main list
    const index = this.refundList.findIndex(r => r.id === refund.id);
    if (index !== -1) {
      this.refundList[index].refundStatus = 'Rejected';
    }
    
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Rejected refund request successful',
      life: 3000,
      key: 'tg'
    });
    
    this.filterTable(); // Reapply filters
    this.closeModal();
    this.dropdownIndex = null; // Close the dropdown
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedRefund = null;
    this.updateRefundDetails();
  }

  sortRefunds() {
    const statusOrder: Record<string, number> = { 'Pending': 1, 'Rejected': 2, 'Accepted': 3 };
  
    this.filteredRefundList = [...this.filteredRefundList.sort((a, b) => {
      return (statusOrder[a.refundStatus as keyof typeof statusOrder] || 4) - 
             (statusOrder[b.refundStatus as keyof typeof statusOrder] || 4);
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

  reason(reason: string): string | undefined {
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