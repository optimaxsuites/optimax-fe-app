import { Component, HostListener, ViewChild, OnInit } from '@angular/core';
import { MenuItem, MessageService } from 'primeng/api';
import { ChangeDetectorRef } from '@angular/core';
import { Menu, MenuModule } from 'primeng/menu';
import { OverlayPanel, OverlayPanelModule } from 'primeng/overlaypanel';
import { Refund, RefundMethod, RefundStatus } from '../../../models/interface';
import { MetadataService } from '../../../service/metadata.service';
import { PosServiceService } from '../../../service/pos-service.service';
import { CustomerService } from '../../../service/customer.service';
import { getUserPermissionsFor, isSuperUser } from '../../../../shared/pipes/helper';
import { Router } from '@angular/router';
import { finalize, forkJoin, of, catchError, map } from 'rxjs';

interface EnrichedReturnItem {
  productId?: string;
  variantId?: string;
  quantity: number;
  totalPricePaid: string | number;
  product?: any;
  productVariant?: any;
  [key: string]: any;
}

@Component({
  selector: 'app-refund',
  templateUrl: './refund.component.html',
  styleUrl: './refund.component.scss'
})
export class RefundComponent implements OnInit {
  @ViewChild('op') op!: OverlayPanel;
  
  // UI State
  selectedDate: Date | null = null;
  searchQuery: string = '';
  dropdownIndex: number | null = null;
  isModalOpen: boolean = false;
  isProcessing = false;
  isLoading = true;
  selectedDay: string | null = null;
  selectedStatus: string | null = null;
  isDatePickerOpen = false;
  dateRange: Date[] = [];
  
  // Data
  selectedRefund: Refund | null = null;
  cashierList: string[] = [];
  selectedCashier: string | null = null;
  startDate: any;
  endDate: any;
  items: any[] = [];
  daysOfWeek: string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  statuses: string[] = Object.values(RefundStatus);
  refundList: Refund[] = [];
  filteredRefundList: Refund[] = [];
  enrichedReturnItems: EnrichedReturnItem[] = [];
  
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
    private metadataService: MetadataService,
    private posService: PosServiceService,
    private customerService: CustomerService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.setupPermissions();
    this.loadRefund();
  }

  private setupPermissions() {
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
    console.log('Refund permissions:', this.refundPermission);
  }

  isMenuOpen = false;

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.isMenuOpen = !this.isMenuOpen;
  }

  @HostListener('document:click')
  closeMenu() {
    this.isMenuOpen = false;
  }

  loadRefund() {
    this.isLoading = true;
    
    this.metadataService.returns$.subscribe({
      next: (value) => {
        console.log('Refund data loaded:', value);
        this.refundList = value;
        this.filteredRefundList = [...value];
        this.updateRefundDetails();
        this.isLoading = false;
        
        // Add a small delay for smooth appearance
        setTimeout(() => {
          this.cdr.detectChanges();
        }, 100);
      },
      error: (error) => {
        console.error('Error loading refunds:', error);
        this.isLoading = false;
        this.messageService.add({
          key: 'tl',
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load refund data',
          life: 5000
        });
      }
    });
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
    this.filteredRefundList = [...this.refundList];

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

    if (this.selectedStatus) {
      this.filteredRefundList = this.filteredRefundList.filter(refund => 
        refund.refundStatus === this.selectedStatus
      );
    }

    if (this.selectedDay) {
      this.filteredRefundList = this.filteredRefundList.filter(refund => {
        return this.getDayOfWeek(refund.createdAt) === this.selectedDay;
      });
    }

    if (this.dateRange && this.dateRange.length === 2) {
      const start = new Date(this.dateRange[0]);
      const end = new Date(this.dateRange[1]);
      end.setHours(23, 59, 59, 999);

      this.filteredRefundList = this.filteredRefundList.filter(refund => {
        const refundDate = new Date(refund.createdAt);
        return refundDate >= start && refundDate <= end;
      });
    }
  }

  getDayOfWeek(dateString: string): string {
    const date = new Date(dateString);
    return this.daysOfWeek[date.getDay()];
  }

  toggleDropdown(index: number) {
    this.dropdownIndex = this.dropdownIndex === index ? null : index;
  }

  closeAllDropdowns() {
    this.dropdownIndex = null;
  }

  updateRefundDetails() {
    if (this.selectedRefund) {
      this.refundDetails = [
        { 
          label: 'Customer', 
          value: this.selectedRefund.name || this.selectedRefund.customerName || 'N/A' 
        },
        { 
          label: 'Amount Requested', 
          value: '₦' + (this.selectedRefund.refundableAmount?.toString() || '0') 
        },
        { 
          label: 'Reason Type', 
          value: this.reason(this.selectedRefund.reason) || 'N/A' 
        },
        { 
          label: 'Return Mode', 
          value: this.selectedRefund.refundReason || this.selectedRefund.refundMethod || 'N/A' 
        },
        { 
          label: 'Customer Phone', 
          value: this.selectedRefund.phoneNumber || 'N/A' 
        },
        { 
          label: 'Order ID', 
          value: this.selectedRefund.orderId?.toString() || this.selectedRefund.orderNumber?.toString() || 'N/A' 
        },
        { 
          label: 'Royalty Account ID', 
          value: this.selectedRefund.royaltyAccountId?.toString() || 'N/A' 
        },
        { 
          label: 'Requested Date', 
          value: this.formatDate(this.selectedRefund.createdAt) 
        }
      ];
      
      // Load enriched product details when a refund is selected
      this.loadProductDetails();
    } else {
      this.refundDetails = [];
      this.enrichedReturnItems = [];
    }
  }

  loadProductDetails() {
    if (!this.selectedRefund?.returnItems || !Array.isArray(this.selectedRefund.returnItems)) {
      this.enrichedReturnItems = [];
      return;
    }

    // Create observables to fetch product details for each return item
    const productRequests = this.selectedRefund.returnItems.map((returnItem: any) => {
      if (!returnItem.productId) {
        return of({
          ...returnItem,
          product: null,
          productVariant: null
        });
      }

      return this.posService.getProductById(returnItem.productId).pipe(
        map((product: any) => {
          // Find the specific variant if variantId exists
          let productVariant = null;
          if (returnItem.variantId && product.productVariants) {
            productVariant = product.productVariants.find(
              (variant: any) => variant.id === returnItem.variantId
            );
          }

          return {
            ...returnItem,
            product: product,
            productVariant: productVariant
          };
        }),
        catchError((error) => {
          console.error(`Error fetching product ${returnItem.productId}:`, error);
          return of({
            ...returnItem,
            product: null,
            productVariant: null
          });
        })
      );
    });

    // Execute all requests and store the results
    forkJoin(productRequests).subscribe({
      next: (enrichedItems) => {
        this.enrichedReturnItems = enrichedItems as EnrichedReturnItem[];
        console.log('Enriched return items:', this.enrichedReturnItems);
      },
      error: (error) => {
        console.error('Error loading product details:', error);
        this.enrichedReturnItems = this.selectedRefund?.returnItems || [];
      }
    });
  }

  selectRefund(refund: Refund) {
    this.selectedRefund = refund; 
    this.updateRefundDetails();
  }

  canProcessRefund(refund: Refund): boolean {
    return refund?.refundStatus === 'Processing' && 
           this.adminComment?.trim()?.length > 0 && 
           !this.isProcessing;
  }

  clearForm(): void {
    this.adminComment = '';
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedRefund = null;
    this.enrichedReturnItems = [];
    this.clearForm();
    this.updateRefundDetails();
  }

  sortRefunds() {
    const statusOrder: Record<string, number> = { 'Pending': 1, 'Rejected': 2, 'Accepted': 3 };
  
    this.filteredRefundList = [...this.filteredRefundList.sort((a, b) => {
      return (statusOrder[a.refundStatus as keyof typeof statusOrder] || 4) - 
             (statusOrder[b.refundStatus as keyof typeof statusOrder] || 4);
    })];
  
    this.cdr.detectChanges();
  }
  
  formatDate(dateInput: any): string {
    if (!dateInput) {
      return 'N/A';
    }

    try {
      if (dateInput instanceof Date) {
        return dateInput.toLocaleString();
      }

      if (typeof dateInput === 'string') {
        return new Date(dateInput).toLocaleString();
      }

      if (Array.isArray(dateInput) && dateInput.length >= 3) {
        const [year, month, day, hour, minute, second] = dateInput;
        const date = new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
        return date.toLocaleString();
      }

      return 'Invalid Date';
    } catch (error) {
      console.error('Error formatting date:', error, dateInput);
      return 'Invalid Date';
    }
  }

  get selectedReturnReasonLabel(): string | undefined {
    return this.returnReasons.find(r => r.value === this.selectedRefund?.reason)?.label;
  }

  reason(reason: string): string | undefined {
    return this.returnReasons.find(r => r.value === reason)?.label;
  }  

  getStatusIcon(status?: string): string {
    switch (status) {
      case RefundStatus.PROCESSING:
        return 'pi-clock';
      case RefundStatus.APPROVED:
        return 'pi-check-circle';
      case RefundStatus.REJECTED:
        return 'pi-times-circle';
      case RefundStatus.PENDING:
        return 'pi-hourglass';
      case RefundStatus.CANCELED:
        return 'pi-ban';
      case RefundStatus.EXPIRED:
        return 'pi-calendar-times';
      case RefundStatus.UNDER_REVIEW:
        return 'pi-eye';
      case RefundStatus.CHARGEBACK:
        return 'pi-undo';
      default:
        return 'pi-info-circle';
    }
  }

  getRefundStatusClass(status?: string): string {
    switch (status) {
      case RefundStatus.PENDING:
        return 'text-yellow-800 bg-yellow-100';
      case RefundStatus.APPROVED:
        return 'text-green-800 bg-green-100';
      case RefundStatus.REJECTED:
        return 'text-red-800 bg-red-100';
      case RefundStatus.PROCESSING:
        return 'text-blue-800 bg-blue-100';
      case RefundStatus.CANCELED:
        return 'text-gray-800 bg-gray-100';
      case RefundStatus.EXPIRED:
        return 'text-orange-800 bg-orange-100';
      case RefundStatus.UNDER_REVIEW:
        return 'text-purple-800 bg-purple-100';
      case RefundStatus.CHARGEBACK:
        return 'text-pink-800 bg-pink-100';
      default:
        return 'text-gray-800 bg-gray-200';
    }
  }

  navigateToRequestDetails(refund: Refund) {
    const navigationData = {
      id: refund.id,
      orderId: refund.orderId,
      orderNumber: refund.orderNumber,
      royaltyAccountId: refund.royaltyAccountId,
      loyaltyId: refund.loyaltyId,
      
      // Customer information
      name: refund.name,
      customerName: refund.customerName,
      emailAddress: refund.emailAddress,
      email: refund.emailAddress,
      phoneNumber: refund.phoneNumber,
      customerPhone: refund.phoneNumber, 
      
      // Refund details
      refundStatus: refund.refundStatus,
      status: refund.status,
      reason: refund.reason,
      refundReason: refund.refundReason,
      refundableAmount: refund.refundableAmount,
      refundMeans: refund.refundMeans,
      
      // Date information
      createdAt: refund.createdAt,
      timestamp: refund.timestamp,
      orderDate: refund.createdAt, 
      
      // Items and comments
      returnItems: refund.returnItems,
      selectedItems: refund.selectedItems,
      items: refund.selectedItems, 
      cashierComment: refund.cashierComment,
      comment: refund.cashierComment, 
      
      bankName: refund.bankName,
      accountNumber: refund.accountNumber,
      accountHolder: refund.accountHolder
    };

    console.log('Navigating with data:', navigationData);
    this.router.navigate(['/request-details'], { 
      state: { selectedRequest: navigationData }
    });
  }

  viewRefund(refund: Refund) {
    this.selectedRefund = refund;
    this.isModalOpen = true;
    this.dropdownIndex = null;
    this.updateRefundDetails();
  }

  viewRefundDetails(refund: Refund) {
    this.navigateToRequestDetails(refund);
  }

  // Quick approve without detailed modal
  quickApproveRefund(refund: Refund) {
    if (!refund || this.isProcessing) {
      return;
    }

    // Set a default admin comment for quick approval
    const tempComment = this.adminComment;
    this.adminComment = 'Quick approval - No additional comment';
    
    this.acceptRefund(refund).finally(() => {
      if (!tempComment) {
        this.adminComment = '';
      } else {
        this.adminComment = tempComment;
      }
    });
  }

  // Quick reject without detailed modal
  quickRejectRefund(refund: Refund) {
    if (!refund || this.isProcessing) {
      return;
    }

    // Set a default admin comment for quick rejection
    const tempComment = this.adminComment;
    this.adminComment = 'Quick rejection - No additional comment';
    
    this.rejectRefund(refund).finally(() => {
      if (!tempComment) {
        this.adminComment = '';
      } else {
        this.adminComment = tempComment;
      }
    });
  }

  acceptRefund(refund: Refund): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!refund || this.isProcessing) {
        console.error("Refund is null, undefined, or already processing");
        reject(new Error("Invalid refund or processing"));
        return;
      }

      if (!this.adminComment?.trim()) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Warning', 
          detail: 'Admin comment is required for approval',
          life: 3000
        });
        reject(new Error("Admin comment required"));
        return;
      }

      if (!refund.id) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Invalid refund data - missing ID',
          life: 3000
        });
        reject(new Error("Missing refund ID"));
        return;
      }

      this.isProcessing = true;
      
      const refundLogId = Number(refund.id);
      const customerName = refund.name || refund.customerName || 'Unknown Customer';

      this.metadataService.approveRefund(refundLogId, customerName, this.adminComment)
        .pipe(
          finalize(() => this.isProcessing = false)
        )
        .subscribe({
          next: (response) => {
            console.log('Refund approved successfully:', response);
            
            this.updateRefundInLists(refund.id, 'Approved');

            this.messageService.add({
              key: 'tl',
              severity: 'success',
              summary: 'Success',
              detail: 'Refund request approved successfully',
              life: 3000
            });

            this.clearFormAndCloseModal();
            resolve();
          },
          error: (error) => {
            console.error('Error approving refund:', error);
            this.messageService.add({
              key: 'tl',
              severity: 'error',
              summary: 'Error',
              detail: error.message || 'Failed to approve refund',
              life: 5000
            });
            reject(error);
          }
        });
    });
  }

  rejectRefund(refund: Refund): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!refund || this.isProcessing) {
        reject(new Error("Invalid refund or processing"));
        return;
      }

      if (!this.adminComment?.trim()) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Warning', 
          detail: 'Admin comment is required for rejection',
          life: 3000
        });
        reject(new Error("Admin comment required"));
        return;
      }

      this.isProcessing = true;
      const refundLogId = Number(refund.id);
      const customerName = refund.name || refund.customerName || 'Unknown';

      this.metadataService.rejectRefund(refundLogId, customerName, this.adminComment)
        .pipe(finalize(() => this.isProcessing = false))
        .subscribe({
          next: () => {
            this.updateRefundInLists(refund.id, 'Rejected');
            
            this.messageService.add({
              key: 'tl',
              severity: 'success',
              summary: 'Rejected',
              detail: 'Refund rejected successfully.'
            });

            this.clearFormAndCloseModal();
            resolve();
          },
          error: (err) => {
            this.messageService.add({
              key: 'tl',
              severity: 'error',
              summary: 'Error',
              detail: err?.error?.message || 'Failed to reject refund'
            });
            console.error(err);
            reject(err);
          }
        });
    });
  }

  private updateRefundInLists(refundId: any, newStatus: string) {
    const updateRefund = (refund: Refund) => ({
      ...refund,
      refundStatus: newStatus,
      adminComment: this.adminComment
    });

    const filteredIndex = this.filteredRefundList.findIndex(r => r.id === refundId);
    if (filteredIndex !== -1) {
      this.filteredRefundList[filteredIndex] = updateRefund(this.filteredRefundList[filteredIndex]);
    }

    const mainIndex = this.refundList.findIndex(r => r.id === refundId);
    if (mainIndex !== -1) {
      this.refundList[mainIndex] = updateRefund(this.refundList[mainIndex]);
    }

    this.cdr.detectChanges();
  }

  private clearFormAndCloseModal() {
    this.adminComment = '';
    this.closeModal();
    this.dropdownIndex = null;
  }

  // Methods for enriched return items display (similar to request-details component)
  getReturnItems(): EnrichedReturnItem[] {
    return this.enrichedReturnItems;
  }

  getTotalRefundableAmount(): number {
    if (this.selectedRefund?.refundableAmount !== undefined) {
      return parseFloat(this.selectedRefund.refundableAmount.toString()) || 0;
    }

    return this.enrichedReturnItems.reduce((total: number, item: EnrichedReturnItem) => {
      return total + (parseFloat(item.totalPricePaid.toString()) || 0);
    }, 0);
  }

  getItemName(item: EnrichedReturnItem): string {
    if (item?.product?.name) {
      return item.product.name;
    }
    
    if (item?.productId) {
      return `Product ID: ${item.productId}`;
    }
    
    return 'Unknown Product';
  }

  getItemNameWithVariant(item: EnrichedReturnItem): string {
    const baseName = this.getItemName(item);
    
    if (item?.productVariant?.name) {
      return `${baseName} - ${item.productVariant.name}`;
    }
    
    return baseName;
  }

  getItemPrice(item: EnrichedReturnItem): number {
    // Check variant price first
    if (item?.productVariant?.price !== undefined) {
      return parseFloat(item.productVariant.price.toString()) || 0;
    }
    
    // Then check product selling price
    if (item?.product?.sellingPrice !== undefined) {
      return parseFloat(item.product.sellingPrice.toString()) || 0;
    }
    
    // Calculate from total if available
    if (item?.totalPricePaid !== undefined && item?.quantity > 0) {
      return parseFloat(item.totalPricePaid.toString()) / item.quantity;
    }
    
    return 0;
  }

  getItemQuantity(item: EnrichedReturnItem): number {
    return parseInt(item?.quantity?.toString()) || 0;
  }

  getItemDiscount(item: EnrichedReturnItem): number {
    return 0; // Can be implemented based on business logic
  }

  getItemTotal(item: EnrichedReturnItem): number {
    if (item?.totalPricePaid !== undefined) {
      return parseFloat(item.totalPricePaid.toString()) || 0;
    }
    
    const price = this.getItemPrice(item);
    const quantity = this.getItemQuantity(item);
    const discount = this.getItemDiscount(item);
    
    return Math.max(0, (price * quantity) - discount);
  }

  getCashierComment(): string {
    return this.selectedRefund?.cashierComment || 
           this.selectedRefund?.cashierComment || 
           'No comment provided';
  }

  // Legacy method for backward compatibility
  getProductName(item: any): string {
    return this.getItemName(item);
  }
}