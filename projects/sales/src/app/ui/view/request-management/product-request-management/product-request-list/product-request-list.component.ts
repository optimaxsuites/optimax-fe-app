// src/app/modules/commerce/submodule-a-procurement-request/components/procurement-request-list/procurement-request-list.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, forkJoin, filter } from 'rxjs';
import { saveAs } from 'file-saver';
import { ProcurementRequestService } from '../../../../service/procurement-request-management/product-request-management/procurement-request.service';
import { ProcurementRequest, RequestFilters, RequestStatus, PaginatedResponse, MasterOrder } from '../../../../domain/procurement-request/product-requests/product-requests.dto';
import { TableAction, TableColumn } from '../../../../shared-component/view/table/table.component';
import { ExportService } from '../../../../service/procurement-request-management/product-request-management/export.service';

@Component({
  selector: 'app-product-request-list',
  templateUrl: './product-request-list.component.html',
  styleUrls: ['./product-request-list.component.scss']
})
export class ProductRequestListComponent implements OnInit, OnDestroy {
  Math = Math;

  readonly newRequestLink = '/admin/sales/commerce/requests/new/' + uuidV4();
  readonly draftsLink = '/admin/sales/commerce/requests/drafts/' + uuidV4();
  readonly multiOrderLink = '/admin/sales/commerce/orders/new/' + uuidV4();
  tableColumns: TableColumn<any>[] = [];
  tableActions: TableAction<any>[] = [];
  selectedRequests: ProcurementRequest[] = [];
  allRows: any[] = [];
  isSubmittingCancel = false;
  exportingRow: any = null;
  sortField = 'createdAt';
  sortAsc = false;

  formatBudget(row: any): string {
    return `${row.currency} ${Number(row.budget || 0).toLocaleString()}`;
  }

  setSort(field: string): void {
    if (this.sortField === field) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortField = field;
      this.sortAsc = true;
    }
    this.sortAllRows();
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) {
      return 'fa-sort';
    }
    return this.sortAsc ? 'fa-sort-up' : 'fa-sort-down';
  }

  sortAllRows(): void {
    if (!this.sortField) return;
    this.allRows.sort((a, b) => {
      let valA = a[this.sortField];
      let valB = b[this.sortField];

      // Handle nulls/undefined
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return this.sortAsc ? -1 : 1;
      if (valA > valB) return this.sortAsc ? 1 : -1;
      return 0;
    });
  }

  showCancelDialog = false;
  showViewDialog = false;
  showCreateOptions = false;
  selectedRequest: ProcurementRequest | null = null;
  viewRequestDetails: ProcurementRequest | null = null;
  isLoadingDetails = false;
  cancellationReason: string = '';

  get showCancelModal(): boolean {
    return this.showCancelDialog;
  }

  readonly statusClassMap: Record<RequestStatus, string> = {
    'DRAFT': 'status-chip status-draft',
    'PENDING_APPROVAL': 'status-chip status-pending-approval',
    'REJECTED': 'status-chip status-rejected',
    'PENDING': 'status-chip status-pending',
    'VENDORS_QUOTING': 'status-chip status-quoting',
    'VENDOR_SELECTED': 'status-chip status-selected',
    'LPO_ISSUED': 'status-chip status-lpo',
    'PAYMENT_PENDING': 'status-chip status-payment-pending',
    'PAYMENT_CONFIRMED': 'status-chip status-payment-confirmed',
    'DELIVERY_IN_PROGRESS': 'status-chip status-delivery',
    'DELIVERED': 'status-chip status-delivered',
    'CANCELLED': 'status-chip status-cancelled'
  };

  isDeadlineSoon(deadline: Date | string | undefined): boolean {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diff = deadlineDate.getTime() - now.getTime();
    // 3 days in ms
    return diff < 3 * 24 * 60 * 60 * 1000 && diff > 0;
  }

  toggleCreateOptions(): void {
    this.showCreateOptions = !this.showCreateOptions;
  }

  openCancelModal(request: ProcurementRequest): void {
    const reason = window.prompt(`Please provide a cancellation reason for ${request.id}:`, 'No longer required');
    if (reason === null) {
      return;
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      window.alert('Cancellation reason is required.');
      return;
    }

    this.isLoading = true;
    this.procurementRequestService.cancelRequest(request.id, trimmedReason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadRequests();
        },
        error: (error) => {
          console.error('Error cancelling request:', error);
          this.isLoading = false;
        }
      });
  }

  closeCancelModal(): void {
    this.showCancelDialog = false;
    this.selectedRequest = null;
    this.cancellationReason = '';
  }

  confirmCancel(): void {
    if (!this.selectedRequest) return;
    this.closeCancelModal();
    this.loadRequests();
  }
  
  requests: ProcurementRequest[] = [];
  isLoading = false;
  totalElements = 0;
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;

  filterForm: FormGroup;
  statusOptions: { value: RequestStatus | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'All Requests' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'VENDORS_QUOTING', label: 'Vendors Quoting' },
    { value: 'VENDOR_SELECTED', label: 'Vendor Selected' },
    { value: 'LPO_ISSUED', label: 'LPO Issued' },
    { value: 'PAYMENT_PENDING', label: 'Payment Pending' },
    { value: 'PAYMENT_CONFIRMED', label: 'Payment Confirmed' },
    { value: 'DELIVERY_IN_PROGRESS', label: 'Delivery in Progress' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private procurementRequestService: ProcurementRequestService,
    private fb: FormBuilder,
    private router: Router,
    private exportService: ExportService
  ) {
    this.filterForm = this.fb.group({
      status: ['ALL'],
      searchTerm: [''],
      dateFrom: [''],
      dateTo: ['']
    });

    this.tableColumns = [
      { header: 'Request ID', field: 'id', sortable: true, className: 'col-id' },
      {
        header: 'Type',
        formatter: (row: any) => row._rowType === 'ORDER' ? `Order (${row._itemCount} items)` : 'Single',
        badgeClass: (row: any) => row._rowType === 'ORDER' ? 'status-chip status-quoting' : 'status-chip status-delivered',
        className: 'col-type'
      },
      {
        header: 'Product / Order Name',
        sortable: true,
        sortField: 'productName',
        formatter: (row) => this.truncate(row.productName, 30),
        className: 'col-product'
      },
      { header: 'Qty', field: 'quantity', align: 'right', sortable: true, className: 'col-qty' },
      {
        header: 'Budget',
        sortable: true,
        sortField: 'budget',
        formatter: (row) => `${row.currency} ${Number(row.budget || 0).toLocaleString()}`,
        align: 'right',
        className: 'col-budget'
      },
      {
        header: 'Delivery',
        formatter: (row) => this.truncate(row.deliveryLocation, 24),
        className: 'col-delivery'
      },
      {
        header: 'Deadline',
        sortable: true,
        sortField: 'deliveryDeadline',
        formatter: (row) => this.formatDate(row.deliveryDeadline),
        className: 'col-deadline'
      },
      {
        header: 'Status',
        formatter: (row) => this.getStatusLabel(row.status),
        badgeClass: (row) => this.getStatusClass(row.status),
        className: 'col-status'
      },
      {
        header: 'Ratings',
        formatter: (row) => this.getRatingDisplay(row),
        className: 'col-rating',
        align: 'center'
      },
      {
        header: 'Created',
        sortable: true,
        sortField: 'createdAt',
        formatter: (row) => this.formatDate(row.createdAt),
        className: 'col-created'
      }
    ];


    this.tableActions = [
      {
        id: 'view',
        label: 'View',
        icon: 'bi bi-eye',
        className: 'action-view'
      },
      {
        id: 'edit',
        label: 'Edit',
        icon: 'bi bi-pencil',
        className: 'action-edit',
        visible: (row: any) => row._rowType !== 'ORDER' && this.canEdit(row)
      },
      {
        id: 'cancel',
        label: 'Cancel',
        icon: 'bi bi-x-circle',
        className: 'action-cancel',
        visible: (row: any) => row._rowType !== 'ORDER' && this.canCancel(row)
      },
      {
        id: 'export',
        label: 'Download',
        icon: 'bi bi-download',
        className: 'action-export'
      }
    ];
  }


  ngOnInit(): void {
    this.loadRequests();
    this.setupFilterSubscriptions();

    // Reload list whenever the user navigates back to this view
    // (e.g. after submitting a multi-item order form)
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        filter(e => e.urlAfterRedirects === '/commerce/requests'),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.loadRequests());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFilterSubscriptions(): void {
    this.filterForm.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.currentPage = 0;
        this.loadRequests();
      });
  }

  loadRequests(): void {
    this.isLoading = true;
    
    const filters: RequestFilters = {
      status: this.filterForm.get('status')?.value,
      searchTerm: this.filterForm.get('searchTerm')?.value,
      dateFrom: this.filterForm.get('dateFrom')?.value ? new Date(this.filterForm.get('dateFrom')?.value) : undefined,
      dateTo: this.filterForm.get('dateTo')?.value ? new Date(this.filterForm.get('dateTo')?.value) : undefined,
      page: this.currentPage,
      size: this.pageSize
    };

    forkJoin({
      page: this.procurementRequestService.getRequests(filters),
      orders: this.procurementRequestService.getOrders()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ page, orders }) => {
          this.requests = page.data;
          this.totalElements = page.totalElements;
          this.totalPages = page.totalPages;
          this.selectedRequests = this.selectedRequests.filter((selected) =>
            this.requests.some((request) => request.id === selected.id)
          );
          const orderRows = orders.map((o) => this.mapOrderToRow(o));
          this.allRows = [...orderRows, ...this.requests];
          this.sortAllRows();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading requests:', error);
          this.isLoading = false;
        }
      });
  }

  private mapOrderToRow(order: MasterOrder): any {
    return {
      id: order.id,
      productName: order.orderName,
      quantity: order.items.reduce((s, i) => s + i.quantity, 0),
      budget: order.totalBudget,
      currency: order.currency,
      deliveryLocation: order.masterDeliveryLocation,
      deliveryDeadline: order.masterDeliveryDeadline,
      status: 'PENDING' as RequestStatus,
      attachments: [],
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      customerId: order.customerId,
      customerName: order.customerName,
      _rowType: 'ORDER',
      _itemCount: order.items.length
    };
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadRequests();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 0;
    this.loadRequests();
  }

  get selectedRequestIds(): string[] {
    return this.selectedRequests.map((request) => request.id);
  }

  onSelectionChange(selection: ProcurementRequest[] | ProcurementRequest): void {
    if (Array.isArray(selection)) {
      this.selectedRequests = selection;
      return;
    }

    this.selectedRequests = selection ? [selection] : [];
  }

  toggleSelectAll(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.selectedRequests = target.checked ? [...this.requests] : [];
  }

  isAllSelected(): boolean {
    return this.requests.length > 0 && this.selectedRequests.length === this.requests.length;
  }

  isSomeSelected(): boolean {
    return this.selectedRequests.length > 0 && this.selectedRequests.length < this.requests.length;
  }

  toggleSelection(requestId: string, event: Event): void {
    const target = event.target as HTMLInputElement;

    if (target.checked) {
      const request = this.requests.find((item) => item.id === requestId);
      if (request && !this.isSelected(requestId)) {
        this.selectedRequests = [...this.selectedRequests, request];
      }
      return;
    }

    this.selectedRequests = this.selectedRequests.filter((request) => request.id !== requestId);
  }

  isSelected(requestId: string): boolean {
    return this.selectedRequests.some((request) => request.id === requestId);
  }

  onRequestsExported(_blob: Blob): void {
    // Reset selected rows after successful bulk export.
    this.selectedRequests = [];
  }

  onExportComplete(blob: Blob): void {
    this.onRequestsExported(blob);
  }

  getStatusClass(status: RequestStatus): string {
    return this.statusClassMap[status] || 'status-chip status-pending';
  }

  getStatusLabel(status: RequestStatus): string {
    const labels: Record<RequestStatus, string> = {
      'DRAFT': 'Draft',
      'PENDING_APPROVAL': 'Pending Approval',
      'REJECTED': 'Rejected',
      'PENDING': 'Pending',
      'VENDORS_QUOTING': 'Vendors Quoting',
      'VENDOR_SELECTED': 'Vendor Selected',
      'LPO_ISSUED': 'LPO Issued',
      'PAYMENT_PENDING': 'Payment Pending',
      'PAYMENT_CONFIRMED': 'Payment Confirmed',
      'DELIVERY_IN_PROGRESS': 'Delivery in Progress',
      'DELIVERED': 'Delivered',
      'CANCELLED': 'Cancelled'
    };

    return labels[status] || status;
  }

  getStatusBadgeClass(status: RequestStatus): string {
  const classes: Record<RequestStatus, string> = {
    'DRAFT': 'px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-800',
    'PENDING_APPROVAL': 'px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800',
    'REJECTED': 'px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800',
    'PENDING': 'px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800',
    'VENDORS_QUOTING': 'px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800',
    'VENDOR_SELECTED': 'px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800',
    'LPO_ISSUED': 'px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800',
    'PAYMENT_PENDING': 'px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800',
    'PAYMENT_CONFIRMED': 'px-2 py-1 text-xs font-medium rounded-full bg-teal-100 text-teal-800',
    'DELIVERY_IN_PROGRESS': 'px-2 py-1 text-xs font-medium rounded-full bg-cyan-100 text-cyan-800',
    'DELIVERED': 'px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800',
    'CANCELLED': 'px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800'
  };
  return classes[status] || classes['PENDING'];
}

formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
}

getRatingDisplay(request: ProcurementRequest): string {
  const rating = this.procurementRequestService.getSavedVendorRating(request.id, request.selectedVendorId);
  if (!rating) {
    return request.status === 'DELIVERED' ? 'Not rated' : 'Pending';
  }

  return `${rating.overallRating}/5 ${'★'.repeat(Math.floor(rating.overallRating))}`;
}

getInProgressCount(): number {
  const inProgressStatuses = ['PENDING', 'VENDORS_QUOTING', 'VENDOR_SELECTED', 'LPO_ISSUED', 'PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'DELIVERY_IN_PROGRESS'];
  return this.requests.filter(r => inProgressStatuses.includes(r.status)).length;
}

getDeliveredCount(): number {
  return this.requests.filter(r => r.status === 'DELIVERED').length;
}

  getCancelledCount(): number {
    return this.requests.filter(r => r.status === 'CANCELLED').length;
  }

  canEdit(request: ProcurementRequest): boolean {
    // Only allow editing if not delivered or cancelled
    const nonEditableStatuses: RequestStatus[] = ['DELIVERED', 'CANCELLED'];
    return !nonEditableStatuses.includes(request.status);
  }
  canCancel(request: ProcurementRequest): boolean {
    const nonCancellableStatuses: RequestStatus[] = ['DELIVERED', 'CANCELLED', 'DELIVERY_IN_PROGRESS'];
    return !nonCancellableStatuses.includes(request.status);
  }

  resetFilters(): void {
    this.filterForm.reset({
      status: 'ALL',
      searchTerm: '',
      dateFrom: '',
      dateTo: ''
    });
  }

  onActionClick(event: { actionId: string; row: any }): void {
    if (event.actionId === 'export') {
      this.exportingRow = event.row;
      return;
    }
    if (event.actionId === 'view') {
      if (event.row._rowType === 'ORDER') {
        this.router.navigate(['/commerce/orders', event.row.id]);
      } else {
        this.router.navigate(['/commerce/requests', event.row.id]);
      }
      return;
    }
    if (event.row._rowType === 'ORDER') return;
    if (event.actionId === 'edit') {
      this.router.navigate(['/commerce/requests', event.row.id, 'edit']);
      return;
    }
    if (event.actionId === 'cancel') {
      this.openCancelModal(event.row);
    }
  }

  openViewModal(request: ProcurementRequest): void {
    this.router.navigate(['/commerce/requests', request.id]);
  }

  exportRowAs(format: 'PDF' | 'EXCEL' | 'CSV'): void {
    if (!this.exportingRow) return;
    const row = this.exportingRow;
    this.exportingRow = null;

    const isOrder = row._rowType === 'ORDER';
    let ext: string;
    let obs$;

    if (isOrder) {
      if (format === 'PDF') {
        obs$ = this.exportService.exportOrderToPDF(row.id, row);
        ext = 'pdf';
      } else {
        obs$ = this.exportService.exportOrdersToExcel([row.id], { format });
        ext = format === 'EXCEL' ? 'xlsx' : 'csv';
      }
    } else {
      if (format === 'PDF') {
        obs$ = this.exportService.exportRequestToPDF(row.id, { format }, row);
        ext = 'pdf';
      } else {
        obs$ = this.exportService.exportRequestsToExcel([row.id], { format });
        ext = format === 'EXCEL' ? 'xlsx' : 'csv';
      }
    }

    const prefix = isOrder ? 'order' : 'request';
    const fileName = `${prefix}_${row.id}_${new Date().toISOString().slice(0, 10)}.${ext}`;

    obs$.subscribe({
      next: (blob: Blob) => saveAs(blob, fileName),
      error: (err: Error) => console.error('Export failed', err)
    });
  }

  closeViewModal(): void {
    this.showViewDialog = false;
    this.viewRequestDetails = null;
  }

  truncate(value: string | undefined, limit: number): string {
    if (!value) return '';
    return value.length > limit ? `${value.slice(0, limit)}...` : value;
  }

  formatDate(value: string | Date | undefined): string {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  getPageNumbers(): number[] {
    const maxVisible = 5;
    let start = Math.max(0, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible);
    
    if (end - start < maxVisible) {
      start = Math.max(0, end - maxVisible);
    }
    
    return Array.from({ length: end - start }, (_, i) => start + i);
  }

  
}