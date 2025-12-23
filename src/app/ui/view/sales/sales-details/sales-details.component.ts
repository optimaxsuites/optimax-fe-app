import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Order, DateType } from '../../../models/interface'; 
import { HttpErrorResponse } from '@angular/common/http'; 
import { StoreOrderService } from '../../../service/store-order.service';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';

export interface CancellationEvent {
  orderId: number | string;
  reason: string;
  chargeback: boolean;
}

@Component({
  selector: 'app-sales-details',
  templateUrl: './sales-details.component.html',
  styleUrl: './sales-details.component.scss'
})
export class SalesDetailsComponent implements OnInit, OnChanges {

  @Input() order?: Order;
  @Input() isEstore: boolean = false; 
  @Output() back = new EventEmitter<void>();
  @Output() cancelOrderConfirmed = new EventEmitter<CancellationEvent>(); 
  @Output() statusUpdated = new EventEmitter<void>();
  
  loading = true;
  error = false;
  errorMessage: string = '';
  successMessage: string = '';
  
  showCancelModal = false;
  showStatusDropdown = false;
  showPrintDropdown = false; //toggle for print menu
  
  cancellationReason: string = '';
  requireChargeback: boolean = false;
  
  // Display labels for the dropdown
  statusOptions = [
    'Pending',
    'Processing',
    'Out for Delivery',
    'Delivered',
    'Cancelled'
  ];

  printOptions = [
    { label: 'Export to PDF (Print)', icon: 'fa-file-pdf', action: 'pdf' },
    { label: 'Export to Excel', icon: 'fa-file-excel', action: 'excel' }
  ];

  private deliveryStatusMap: { [key: string]: string } = {
    'Awaiting Payment': 'PENDING',
    'Pending': 'PENDING',
    'Processing': 'PROCESSING',
    'Packaged': 'PROCESSING',
    'Out for Delivery': 'OUT_FOR_DELIVERY',
    'Delivered': 'DELIVERED',
    'Failed Delivery': 'CANCELLED',
    'Cancelled': 'CANCELLED'
  };

  currentUser: string = 'System'; 

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storeOrderService: StoreOrderService
  ) { }

  ngOnInit(): void {
    this.loading = false;
    this.fetchCurrentUser();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['order'] && changes['order'].currentValue) {
      this.loading = false;
    }
  }

  fetchCurrentUser(): void {
    const userStr = localStorage.getItem('user') || localStorage.getItem('currentUser');
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        this.currentUser = userObj.name || userObj.username || userObj.email || 'Admin';
      } catch (e) {
        this.currentUser = userStr; 
      }
    } else {
        this.currentUser = 'Admin';
    }
  }

  goBack(): void {
    this.back.emit();
  }
  
  toggleStatusDropdown(): void {
    this.showStatusDropdown = !this.showStatusDropdown;
    this.showPrintDropdown = false;
  }

  togglePrintDropdown(): void {
    this.showPrintDropdown = !this.showPrintDropdown;
    this.showStatusDropdown = false;
  }

  handlePrintAction(action: string): void {
    this.showPrintDropdown = false;
    if (action === 'pdf') {
      this.printToPdf();
    } else if (action === 'excel') {
      this.exportToExcel();
    }
  }

  printToPdf(): void {
    window.print();
  }

  exportToExcel(): void {
    if (!this.order) return;

    // 1. Prepare Data for Excel Structure
    // We create an Array of Arrays (AOA) to manually layout the Excel sheet
    const data: any[][] = [];

    // Header
    data.push(['ORDER DETAILS REPORT']);
    data.push([]); // Empty row
    data.push(['Order Number:', this.order.orderNumber, '', 'Date:', this.formatDate(this.order.createdDate)]);
    data.push(['Status:', this.order.orderStatus, '', 'Total Amount:', `N${(this.order.totalAmount || 0).toLocaleString()}`]);
    data.push([]);

    // Customer & Branch Section
    data.push(['CUSTOMER INFORMATION', '', '', 'BRANCH INFORMATION']);
    data.push(['Name:', this.order.customer?.name || 'Walk-in', '', 'Branch:', this.order.branch?.name || 'N/A']);
    data.push(['Email:', this.order.customer?.email || 'N/A', '', 'Phone:', this.order.branch?.phoneNo || 'N/A']);
    data.push([]);

    // Items Header
    data.push(['ORDER ITEMS']);
    data.push(['Item Name', 'Variant', 'Quantity', 'Unit Price', 'Tax (%)', 'Total']);

    // Items Rows
    if (this.order.orderItem) {
        this.order.orderItem.forEach((item: { product: { name: any; }; productVariant: { name: any; }; quantity: any; totalPrice: any; }) => {
            data.push([
                item.product?.name || 'N/A',
                item.productVariant?.name || 'Standard',
                item.quantity || 0,
                this.getItemUnitPrice(item),
                this.getItemTaxRate(item),
                item.totalPrice || 0
            ]);
        });
    }
    data.push([]);

    // Summary Section
    data.push(['', '', '', '', 'Subtotal:', this.calculateSubtotal()]);
    data.push(['', '', '', '', 'Tax:', this.calculateTax()]);
    data.push(['', '', '', '', 'Discount:', this.calculateDiscount()]);
    data.push(['', '', '', '', 'GRAND TOTAL:', this.calculateTotal()]);

    // 2. Create Workbook
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data);
    
    // Optional: Set column widths for better readability
    ws['!cols'] = [
        { wch: 25 }, // Col A
        { wch: 20 }, // Col B
        { wch: 10 }, // Col C
        { wch: 20 }, // Col D
        { wch: 15 }, // Col E
        { wch: 15 }  // Col F
    ];

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Order Details');

    // 3. Save File
    const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    this.saveAsExcelFile(excelBuffer, `order_${this.order.orderNumber || 'details'}`);
  }

  private saveAsExcelFile(buffer: any, fileName: string): void {
    const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    const EXCEL_EXTENSION = '.xlsx';
    const data: Blob = new Blob([buffer], { type: EXCEL_TYPE });
    FileSaver.saveAs(data, fileName + '_export_' + new Date().getTime() + EXCEL_EXTENSION);
  }

  updateStatus(statusLabel: string): void {
    this.showStatusDropdown = false;
    
    if(!this.order || !this.order.id) return;

    const backendStatus = this.deliveryStatusMap[statusLabel] || statusLabel.toUpperCase();
    
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    this.storeOrderService.updateDeliveryStatus(this.order, backendStatus, this.currentUser).subscribe({
      next: (res) => {
        this.successMessage = `Order status updated to ${statusLabel}`;
        
        if(this.order) {
           this.order.deliveryStatus = backendStatus;
           this.order.updatedBy = this.currentUser; 
           if (res && res.orderStatus) {
               this.order.orderStatus = res.orderStatus;
           }
        }
        
        this.statusUpdated.emit();
        this.loading = false;
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (err) => {
        const msg = err.error?.message || err.message || 'Failed to update status';
        this.errorMessage = `Error: ${msg}`;
        this.loading = false;
        
        // Clear error message after 5 seconds
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
      }
    });
  }

  openCancelModal(): void {
    this.errorMessage = '';
    if (this.order?.deliveryStatus === 'OUT_FOR_DELIVERY' || this.order?.deliveryStatus === 'DELIVERED') {
        this.errorMessage = 'Cannot cancel order that is Out for Delivery or Delivered.';
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
        return;
    }

    this.cancellationReason = '';
    this.requireChargeback = false;
    this.showCancelModal = true;
  }
  
  confirmCancellation(): void {
    if (!this.order || !this.cancellationReason || !this.order.id) {
      this.errorMessage = 'Order ID or reason is missing. Cannot proceed with cancellation.';
      setTimeout(() => {
        this.errorMessage = '';
      }, 5000);
      return;
    }

    this.cancelOrderConfirmed.emit({
      orderId: this.order.id, 
      reason: this.cancellationReason,
      chargeback: this.requireChargeback
    });
    
    if (this.order) {
        this.order.updatedBy = this.currentUser;
    }

    this.showCancelModal = false;
    this.cancellationReason = '';
    this.successMessage = 'Order cancellation requested.';
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
  }

  formatDate(date: DateType): string {
    if (!date) return 'N/A';
    if (typeof date === 'string') return new Date(date).toLocaleString();
    if (Array.isArray(date) && date.length >= 3) {
      const [year, month, day, hour, minute, second] = date;
      const dateObj = new Date(Number(year), Number(month) - 1, Number(day), Number(hour) || 0, Number(minute) || 0, Number(second) || 0);
      return dateObj.toLocaleString();
    }
    return 'N/A';
  }

  calculateTotalItems(): number {
    if (!this.order?.orderItem) return 0;
    return this.order.orderItem.reduce((total: number, item: any) => total + (item.quantity || 0), 0);
  }

  calculateSubtotal(): number {
    if (!this.order?.orderItem) return this.order?.totalAmount || 0;
    return this.order.orderItem.reduce((total: number, item: any) => {
      const quantity = item.quantity || 0;
      const unitPrice = this.getItemUnitPrice(item);
      return total + (unitPrice * quantity);
    }, 0);
  }

  calculateDiscount(): number {
    return 0;
  }
  calculateTax(): number {
    if (!this.order?.orderItem) return 0;
    return this.order.orderItem.reduce((totalTax: number, item: any) => {
      const quantity = item.quantity || 0;
      const unitPrice = this.getItemUnitPrice(item);
      const subtotal = unitPrice * quantity;
      const taxRate = this.getItemTaxRate(item);
      const itemTax = (taxRate / 100) * subtotal;
      return totalTax + itemTax;
    }, 0);
  }

  calculateTotal(): number {
    return this.calculateSubtotal() + this.calculateTax() - this.calculateDiscount();
  }

  getItemUnitPrice(item: any): number {
    if (!item) return 0;
    const variantPrice = item.productVariant?.price;
    const productPrice = parseFloat(item.product?.sellingPrice || '0');
    return variantPrice || productPrice;
  }

  getItemTaxRate(item: any): number {
    if (!item?.product?.tax?.rate) return 5; 
    return item.product.tax.rate;
  }

  // Fixed: Added getDeliveryStatusClass method with proper type handling
  getDeliveryStatusClass(status?: string): string {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    const statusClassMap: { [key: string]: string } = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'PROCESSING': 'bg-blue-100 text-blue-800',
      'OUT_FOR_DELIVERY': 'bg-purple-100 text-purple-800',
      'DELIVERED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800',
      'FAILED': 'bg-red-100 text-red-800',
      'AWAITING_PAYMENT': 'bg-orange-100 text-orange-800'
    };
    
    return statusClassMap[status.toUpperCase()] || 'bg-gray-100 text-gray-800';
  }
}