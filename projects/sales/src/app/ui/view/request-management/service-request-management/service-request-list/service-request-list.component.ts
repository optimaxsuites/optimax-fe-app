import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ServiceRequestService } from '../../../../service/procurement-request-management/service-request-management/service-request.service';
import { ServiceRequest, ServiceType, ServiceRequestStatus, ServiceTypeLabels, RateTypeLabels, LocationTypeLabels } from '../../../../domain/procurement-request/service-requests/service-requests.dto';
import { TableAction, TableColumn } from '../../../../shared-component/view/table/table.component';

@Component({
  selector: 'app-service-request-list',
  templateUrl: './service-request-list.component.html',
  styleUrls: ['./service-request-list.component.scss']
})
export class ServiceRequestListComponent implements OnInit {
  Math = Math;
  tableColumns: TableColumn<ServiceRequest>[] = [];
  tableActions: TableAction<ServiceRequest>[] = [];
  selectedRequests: ServiceRequest[] = [];
  
  serviceRequests: ServiceRequest[] = [];
  isLoading = true;
  
  // Filters
  filters = {
    status: 'ALL',
    serviceType: 'ALL',
    searchTerm: '',
    dateFrom: '',
    dateTo: ''
  };
  
  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  
  // Options for dropdowns
  serviceTypeOptions = Object.entries(ServiceTypeLabels).map(([value, label]) => ({ value, label }));
  statusOptions: { value: ServiceRequestStatus | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'All Status' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'VENDORS_QUOTING', label: 'Vendors Quoting' },
    { value: 'VENDOR_SELECTED', label: 'Vendor Selected' },
    { value: 'CONTRACT_SIGNED', label: 'Contract Signed' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ];

  constructor(
    private serviceRequestService: ServiceRequestService,
    private router: Router
  ) {
    this.tableColumns = [
      { header: 'Request ID', field: 'id', sortable: true, className: 'col-id' },
      {
        header: 'Service',
        field: 'serviceName',
        sortable: true,
        className: 'col-service'
      },
      {
        header: 'Type',
        formatter: (row) => this.getServiceTypeLabel(row.serviceType),
        className: 'col-type'
      },
      {
        header: 'Budget',
        formatter: (row) => this.formatCurrency(row.estimatedTotal, row.currency),
        align: 'right',
        className: 'col-budget'
      },
      {
        header: 'Duration',
        formatter: (row) => this.formatDuration(row.estimatedDuration, row.durationUnit),
        className: 'col-duration'
      },
      {
        header: 'Location',
        formatter: (row) => LocationTypeLabels[row.locationType] || row.locationType,
        className: 'col-location'
      },
      {
        header: 'Status',
        formatter: (row) => this.getStatusLabel(row.status),
        badgeClass: (row) => this.getStatusBadgeClass(row.status),
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
        id: 'edit',
        label: 'Edit',
        icon: 'bi bi-pencil',
        className: 'action-edit',
        visible: (row) => this.canEdit(row)
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
    this.loadServiceRequests();
  }

  loadServiceRequests(): void {
    this.isLoading = true;
    
    this.serviceRequestService.getServiceRequests({
      ...this.filters,
      page: this.currentPage,
      size: this.pageSize
    }).subscribe({
      next: (response) => {
        this.serviceRequests = response.data;
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.selectedRequests = this.selectedRequests.filter((selected) =>
          this.serviceRequests.some((request) => request.id === selected.id)
        );
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading service requests:', error);
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 0;
    this.loadServiceRequests();
  }

  resetFilters(): void {
    this.filters = {
      status: 'ALL',
      serviceType: 'ALL',
      searchTerm: '',
      dateFrom: '',
      dateTo: ''
    };
    this.currentPage = 0;
    this.loadServiceRequests();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadServiceRequests();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 0;
    this.loadServiceRequests();
  }

  get selectedRequestIds(): string[] {
    return this.selectedRequests.map((request) => request.id);
  }

  onSelectionChange(selection: ServiceRequest[] | ServiceRequest): void {
    if (Array.isArray(selection)) {
      this.selectedRequests = selection;
      return;
    }

    this.selectedRequests = selection ? [selection] : [];
  }

  onActionClick(event: { actionId: string; row: ServiceRequest }): void {
    if (event.actionId === 'view') {
      this.router.navigate(['/admin/sales/commerce/service-requests', event.row.id]);
      return;
    }

    if (event.actionId === 'edit') {
      this.router.navigate(['/admin/sales/commerce/service-requests', event.row.id, 'edit']);
      return;
    }

    if (event.actionId === 'cancel') {
      // TODO: hook up cancellation dialog/workflow when available
      console.log('Cancel service request:', event.row.id);
    }
  }

  onCreateRequest(): void {
    this.router.navigate(['/admin/sales/commerce/service-requests/new']);
  }

  getServiceTypeLabel(type: ServiceType): string {
    return ServiceTypeLabels[type] || type;
  }

  getRateTypeLabel(rateType: string): string {
    return RateTypeLabels[rateType as keyof typeof RateTypeLabels] || rateType;
  }

  getStatusBadgeClass(status: ServiceRequestStatus): string {
    const classes: Record<ServiceRequestStatus, string> = {
      'DRAFT': 'status-draft',
      'PENDING': 'status-pending',
      'VENDORS_QUOTING': 'status-quoting',
      'VENDOR_SELECTED': 'status-selected',
      'CONTRACT_SIGNED': 'status-contract',
      'IN_PROGRESS': 'status-progress',
      'MILESTONE_1_COMPLETE': 'status-progress',
      'MILESTONE_2_COMPLETE': 'status-progress',
      'MILESTONE_3_COMPLETE': 'status-progress',
      'COMPLETED': 'status-completed',
      'CANCELLED': 'status-cancelled'
    };
    return `status-badge ${classes[status] || 'status-pending'}`;
  }

  getStatusLabel(status: ServiceRequestStatus): string {
    const labels: Record<ServiceRequestStatus, string> = {
      'DRAFT': 'Draft',
      'PENDING': 'Pending',
      'VENDORS_QUOTING': 'Vendors Quoting',
      'VENDOR_SELECTED': 'Vendor Selected',
      'CONTRACT_SIGNED': 'Contract Signed',
      'IN_PROGRESS': 'In Progress',
      'MILESTONE_1_COMPLETE': 'Milestone 1 Complete',
      'MILESTONE_2_COMPLETE': 'Milestone 2 Complete',
      'MILESTONE_3_COMPLETE': 'Milestone 3 Complete',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled'
    };
    return labels[status];
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  }

  formatDuration(duration: number, unit: string): string {
    const unitLabels: Record<string, string> = {
      'HOURS': 'hrs',
      'DAYS': 'days',
      'WEEKS': 'wks',
      'MONTHS': 'mos'
    };
    return `${duration} ${unitLabels[unit] || unit.toLowerCase()}`;
  }

  private formatDate(value: string | Date | undefined): string {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  canEdit(request: ServiceRequest): boolean {
    return request.status === 'PENDING';
  }

  canCancel(request: ServiceRequest): boolean {
    const nonCancellableStatuses: ServiceRequestStatus[] = ['COMPLETED', 'CANCELLED'];
    return !nonCancellableStatuses.includes(request.status);
  }

  getStats(): {
    total: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  } {
    return {
      total: this.totalElements,
      inProgress: this.serviceRequests.filter(r => 
        ['PENDING', 'VENDORS_QUOTING', 'VENDOR_SELECTED', 'CONTRACT_SIGNED', 'IN_PROGRESS'].includes(r.status)
      ).length,
      completed: this.serviceRequests.filter(r => r.status === 'COMPLETED').length,
      cancelled: this.serviceRequests.filter(r => r.status === 'CANCELLED').length
    };
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