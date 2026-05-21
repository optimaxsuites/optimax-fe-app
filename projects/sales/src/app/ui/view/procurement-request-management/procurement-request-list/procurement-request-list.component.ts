// src/app/modules/commerce/submodule-a-procurement-request/components/procurement-request-list/procurement-request-list.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ProcurementRequestService } from '../../../service/procurement-request-management/procurement-request.service';
import { ProcurementRequest, RequestFilters, RequestStatus, PaginatedResponse } from '../../../domain/procurement-request/procurement-request.dto';
import { TableAction, TableColumn } from '../../../shared-component/view/table/table.component';

@Component({
  selector: 'app-procurement-request-list',
  templateUrl: './procurement-request-list.component.html',
  styleUrls: ['./procurement-request-list.component.scss']
})
export class ProcurementRequestListComponent implements OnInit, OnDestroy {
  Math = Math;
  tableColumns: TableColumn<ProcurementRequest>[] = [];
  tableActions: TableAction<ProcurementRequest>[] = [];

  showCancelDialog = false;
  showViewDialog = false;
  selectedRequest: ProcurementRequest | null = null;
  viewRequestDetails: ProcurementRequest | null = null;
  isLoadingDetails = false;
  cancellationReason: string = '';

  readonly statusClassMap: Record<RequestStatus, string> = {
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

  openCancelModal(request: ProcurementRequest): void {
    this.selectedRequest = request;
    this.cancellationReason = '';
    this.showCancelDialog = true;
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
    private router: Router
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
        header: 'Product',
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
        id: 'cancel',
        label: 'Cancel',
        icon: 'bi bi-x-circle',
        className: 'action-cancel',
        visible: (row) => this.canCancel(row)
      }
    ];
  }

  ngOnInit(): void {
    this.loadRequests();
    this.setupFilterSubscriptions();
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

    this.procurementRequestService.getRequests(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaginatedResponse<ProcurementRequest>) => {
          this.requests = response.data;
          this.totalElements = response.totalElements;
          this.totalPages = response.totalPages;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading requests:', error);
          this.isLoading = false;
        }
      });
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

  getStatusClass(status: RequestStatus): string {
    return this.statusClassMap[status] || 'status-chip status-pending';
  }

  getStatusLabel(status: RequestStatus): string {
    const labels: Record<RequestStatus, string> = {
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

  onActionClick(event: { actionId: string; row: ProcurementRequest }): void {
    if (event.actionId === 'view') {
      this.openViewModal(event.row);
      return;
    }

    if (event.actionId === 'cancel') {
      this.openCancelModal(event.row);
    }
  }

  openViewModal(request: ProcurementRequest): void {
    this.viewRequestDetails = null;
    this.isLoadingDetails = true;
    this.showViewDialog = true;
    // Simulate async fetch; replace with real service if needed
    this.procurementRequestService.getRequestById(request.id).subscribe({
      next: (details) => {
        this.viewRequestDetails = details ?? null;
        this.isLoadingDetails = false;
      },
      error: () => {
        this.isLoadingDetails = false;
      }
    });
  }

  closeViewModal(): void {
    this.showViewDialog = false;
    this.viewRequestDetails = null;
  }

  private truncate(value: string | undefined, limit: number): string {
    if (!value) return '';
    return value.length > limit ? `${value.slice(0, limit)}...` : value;
  }

  private formatDate(value: string | Date | undefined): string {
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