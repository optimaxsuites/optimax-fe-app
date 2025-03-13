import { Component, ViewChild } from '@angular/core';
import { MenuItem, MessageService } from 'primeng/api';
import { ChangeDetectorRef } from '@angular/core';
import { Menu, MenuModule } from 'primeng/menu';

import { OverlayPanel, OverlayPanelModule } from 'primeng/overlaypanel';




interface Refund {
  orderId: string;
  cashier: string;
  Amount_Requested: number;
  reasonType: string;
  status: string;
  returnmode: string;
  Date: string;
  TransactionId: string ;
  RequestedDate: string;
  cashierComment: string;
  returnedItems: { itemName: string; quantity: number }[]; 
}

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
  selectedCashier: string = '';
  selectedStatus: string = '';
  startDate: any;
  endDate: any;
  selectedDay: string = '';
  daysOfWeek: string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  isDatePickerOpen = false;
  dateRange: Date[] = [];
  items: any[] = [];

 


  ngOnInit() {
    this.getCashierList();
    this.filterTable();
  }

  openMenu(event: Event, menu: Menu, refund: Refund) {
    this.selectedRefund = refund; // Store the selected refund
    this.items = [
      { 
        label: 'View', 
        icon: 'pi pi-eye text-gray-600 text-xl', 
        command: () => this.viewRefund(refund)
      },
      { 
        label: 'Accept', 
        icon: 'pi pi-check-circle text-green-500 text-xl', 
        command: () => this.acceptRefund(refund)
      },
      { 
        label: 'Reject', 
        icon: 'pi pi-times-circle text-red-500 text-xl', 
        command: () => this.rejectRefund(refund)
      }
    ];
    menu.toggle(event); // Show menu
  }

  
 constructor(

   private messageService: MessageService,
   private cdr: ChangeDetectorRef
 ) {}
  


  refundList: Refund[] = [
    { orderId: 'R001', TransactionId: 'ORD9988776655', cashier: 'John Doe', Amount_Requested: 5000, reasonType: 'Product Defect', status: 'Pending', Date: '2025-03-10', returnmode: 'Cash', returnedItems: [
      { itemName: 'Phone Case', quantity: 2 },
      { itemName: 'Screen Protector', quantity: 1 }
    ],  RequestedDate: '2025-03-09', cashierComment: 'Item damaged on arrival', },
    { orderId: 'R002', TransactionId: 'ORD9988442233', cashier: 'Jane Smith', Amount_Requested: 7550, reasonType: 'Late Delivery', status: 'Pending', Date: '2025-03-09', returnmode: 'Card', returnedItems: [
      { itemName: 'Gaming Keyboard', quantity: 1 },
      { itemName: 'RGB Mouse Pad', quantity: 1 }
    ],   RequestedDate: '2025-03-08',  cashierComment: 'Delayed shipping caused return', },
    { orderId: 'R003', TransactionId: 'ORD9988115599', cashier: 'Emily Johnson', Amount_Requested: 3025, reasonType: 'Wrong Item', status: 'Pending', Date: '2025-03-08', returnmode: 'Exchange' ,   returnedItems: [
      { itemName: 'Office Chair', quantity: 1 }
    ],     RequestedDate: '2025-03-07', cashierComment: 'Wrong color sent',  },
    { orderId: 'R004', TransactionId: 'ORD9988001243', cashier: 'Michael Brown', Amount_Requested: 12000, reasonType: 'Customer Dissatisfaction', status: 'Pending', Date: '2025-03-07' , returnmode:'gift card', returnedItems: [
      { itemName: 'Bluetooth Speaker', quantity: 1 },
      { itemName: 'Headphones', quantity: 2 },
      { itemName: 'Portable Power Bank', quantity: 1 }
    ],     RequestedDate: '2025-03-06',cashierComment: 'Customer unhappy with product quality',  },
    { orderId: 'R005',TransactionId: 'ORD99889923541', cashier: 'Sarah Wilson', Amount_Requested: 9575, reasonType: 'Duplicate Order', status: 'Pending', Date: '2025-03-06' , returnmode:'cash', returnedItems: [
      { itemName: 'Gaming Keyboard', quantity: 1 },
      { itemName: 'RGB Mouse Pad', quantity: 2 },
      { itemName: 'Mechanical Keyboard', quantity: 1 },
      { itemName: 'Gaming Mouse', quantity: 1 }
    ],     RequestedDate: '2025-03-05',   cashierComment: 'Customer ordered twice by mistake', },
  ];
  filteredRefundList: Refund[] = [...this.refundList];


getCashierList() {
  this.cashierList = [...new Set(this.refundList.map(refund => refund.cashier))];
}
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
      refund.cashier.toLowerCase().includes(query) ||
      refund.reasonType.toLowerCase().includes(query) ||
      refund.status.toLowerCase().includes(query) ||
      refund.Date.toLowerCase().includes(query)
    );
  }

  if (this.dateRange && this.dateRange.length === 2) {
    this.startDate = this.dateRange[0];
    this.endDate = this.dateRange[1];
    
    console.log("Filtering from", this.startDate, "to", this.endDate);
  }
  // Apply cashier filter
  if (this.selectedCashier) {
    this.filteredRefundList = this.filteredRefundList.filter(refund => refund.cashier === this.selectedCashier);
  }

  // Apply status filter
  if (this.selectedStatus) {
    this.filteredRefundList = this.filteredRefundList.filter(refund => refund.status === this.selectedStatus);
  }
   // Filter by selected weekday
   if (this.selectedDay) {
    this.filteredRefundList = this.filteredRefundList.filter(refund => {
      return this.getDayOfWeek(refund.Date) === this.selectedDay;
    });
  }

  // Apply date range filter
  if (this.startDate && this.endDate) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);

    this.filteredRefundList = this.filteredRefundList.filter(refund => {
      const refundDate = new Date(refund.Date);
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
    this.dropdownIndex = null; // Close the dropdown
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
    refund.status = 'Accepted'; // Update the status of the specific refund
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
  refund.status = 'Rejected'; // Ensure status is updated correctly

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
  
  
}
