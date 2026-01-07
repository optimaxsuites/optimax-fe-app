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
  showPrintDropdown = false;
  
  cancellationReason: string = '';
  requireChargeback: boolean = false;
  
  statusOptions: string[] = [];

  private deliveryStatusOptions = [
    'Pending',
    'Processing',
    'Packaged',
    'Out for Delivery',
    'Delivered',
    'Cancelled'
  ];

  private pickupStatusOptions = [
    'Pending',
    'Processing',
    'Ready for Pickup',
    'Picked Up',
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

  private pickupStatusMap: { [key: string]: string } = {
    'Pending': 'PENDING',
    'Processing': 'PROCESSING',
    'Ready for Pickup': 'READY_FOR_PICKUP',
    'Picked Up': 'PICKED_UP',
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
    this.updateStatusOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['order'] && changes['order'].currentValue) {
      this.loading = false;
      this.updateStatusOptions();
    }
  }

  private isPickupOrder(): boolean {
    if (!this.order) return false;
    const hasNoDeliveryInfo = !this.order.deliveryInfo;
    const hasNoDeliveryFee = (this.order as any).deliveryFee === 0;
    const isPickupMethod = this.order.deliveryMethod === 'PICKUP';
    return hasNoDeliveryInfo || hasNoDeliveryFee || isPickupMethod;
  }

  private updateStatusOptions(): void {
    if (this.isPickupOrder()) {
      this.statusOptions = [...this.pickupStatusOptions];
      console.log('📦 Pickup order detected - using pickup status options');
    } else {
      this.statusOptions = [...this.deliveryStatusOptions];
      console.log('🚚 Delivery order detected - using delivery status options');
    }
  }

  fetchCurrentUser(): void {
    const sessionUserInfo = sessionStorage.getItem('userPrimaryInfoRegData');
    if (sessionUserInfo) {
      try {
        const parsed = JSON.parse(sessionUserInfo);
        if (parsed.fullname) {
          this.currentUser = parsed.fullname;
          console.log('👤 Active User (from session info):', this.currentUser);
          return;
        }
      } catch (e) {
        console.warn('Error parsing userPrimaryInfoRegData', e);
      }
    }

    const sessionUsername = sessionStorage.getItem('username');
    if (sessionUsername) {
      this.currentUser = sessionUsername;
      console.log('👤 Active User (from session username):', this.currentUser);
      return;
    }

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
    console.log('👤 Active User (Fallback):', this.currentUser);
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

    const data: any[][] = [];

    data.push(['ORDER DETAILS REPORT']);
    data.push([]);
    data.push(['Order Number:', this.order.orderNumber, '', 'Date:', this.formatDate(this.order.createdDate)]);
    data.push(['Status:', this.order.orderStatus, '', 'Total Amount:', `N${(this.order.totalAmount || 0).toLocaleString()}`]);
    data.push([]);

    data.push(['CUSTOMER INFORMATION', '', '', 'BRANCH INFORMATION']);
    data.push(['Name:', this.order.customer?.name || 'Walk-in', '', 'Branch:', this.order.branch?.name || 'N/A']);
    data.push(['Email:', this.order.customer?.email || 'N/A', '', 'Phone:', this.order.branch?.phoneNo || 'N/A']);
    data.push([]);

    data.push(['ORDER ITEMS']);
    data.push(['Item Name', 'Variant', 'Quantity', 'Unit Price', 'Tax (%)', 'Total']);

    if (this.order.orderItem) {
        this.order.orderItem.forEach((item: any) => {
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

    data.push(['', '', '', '', 'Subtotal:', this.calculateSubtotal()]);
    data.push(['', '', '', '', 'Tax:', this.calculateTax()]);
    data.push(['', '', '', '', 'Discount:', this.calculateDiscount()]);
    data.push(['', '', '', '', 'GRAND TOTAL:', this.calculateTotal()]);

    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data);
    
    ws['!cols'] = [
        { wch: 25 },
        { wch: 20 },
        { wch: 10 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 }
    ];

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Order Details');

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

    const isPickup = this.isPickupOrder();
    const statusMap = isPickup ? this.pickupStatusMap : this.deliveryStatusMap;
    const statusToSend = statusMap[statusLabel] || statusLabel.toUpperCase();
    
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    console.log(`📝 Sending status update request:`, statusToSend);

    this.storeOrderService.updateDeliveryStatus(
      this.order, 
      statusToSend, 
      this.currentUser
    ).subscribe({
      next: (res) => {
        this.successMessage = `Status updated to ${statusLabel}`;
        
        if (this.order) {
           // 1. Update Order Status from response
           if (res && res.orderStatus) {
             this.order.orderStatus = res.orderStatus;
           }
           // 2. Optimistic Update for Delivery Status
           this.order.deliveryStatus = statusToSend; 
           this.order.updatedBy = this.currentUser;

           // 3. ✅ FIXED: Manually update Payment Status if Order is PAID
           // This forces the "Payment Details" section to show "PAID"
           if (this.order.orderStatus === 'PAID' && this.order.payment) {
             this.order.payment.status = 'PAID';
             console.log('💰 Payment status auto-updated to PAID based on order completion');
           }
        }
        
        this.statusUpdated.emit();
        this.loading = false;
        setTimeout(() => { this.successMessage = ''; }, 3000);
      },
      error: (err) => {
        const msg = err.error?.message || err.message || 'Failed to update status';
        this.errorMessage = `Error: ${msg}`;
        this.loading = false;
        setTimeout(() => { this.errorMessage = ''; }, 5000);
      }
    });
  }

  openCancelModal(): void {
    this.errorMessage = '';
    
    // Prevent cancellation if already delivered/picked up
    const isPickup = this.isPickupOrder();
    const completedStatus = isPickup ? 'PICKED_UP' : 'DELIVERED';
    const inTransitStatus = 'OUT_FOR_DELIVERY';
    
    if (this.order?.deliveryStatus === completedStatus || 
        this.order?.deliveryStatus === inTransitStatus) {
      this.errorMessage = `Cannot cancel order that is ${isPickup ? 'picked up' : 'out for delivery or delivered'}.`;
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

  getDeliveryStatusClass(status?: string): string {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    const statusClassMap: { [key: string]: string } = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'PROCESSING': 'bg-blue-100 text-blue-800',
      'READY_FOR_PICKUP': 'bg-purple-100 text-purple-800',
      'OUT_FOR_DELIVERY': 'bg-purple-100 text-purple-800',
      'DELIVERED': 'bg-green-100 text-green-800',
      'PICKED_UP': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800',
      'FAILED': 'bg-red-100 text-red-800',
      'AWAITING_PAYMENT': 'bg-orange-100 text-orange-800'
    };
    
    return statusClassMap[status.toUpperCase()] || 'bg-gray-100 text-gray-800';
  }

  getOrderTypeLabel(): string {
    return this.isPickupOrder() ? 'Pickup Order' : 'Delivery Order';
  }
}