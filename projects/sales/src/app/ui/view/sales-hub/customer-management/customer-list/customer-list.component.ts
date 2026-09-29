// src/app/ui/view/sales-module/customer-list/customer-list.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Router, ActivatedRoute } from '@angular/router';
import { SalesService } from '../../../../service/sales/sales.service';
import { Customer } from '../../../../domain/sales/sales.dto';
import { formatApiDate } from '../../../../service/sales/date.util';

import { SharedOverlayModule } from '../../../../../shared-overlay.module';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    SharedOverlayModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './customer-list.component.html',
  styleUrls: ['./customer-list.component.scss']
})
export class CustomerListComponent implements OnInit, OnDestroy {
  
  Math = Math;
  customers: any[] = [];
  isLoading = true;
  selectedCustomerIds: any[] = [];

  showDeleteModal = false;
  pendingDeleteCustomerName = '';
  private pendingDeleteCustomer?: Customer;

  openCustomerModal(customer?: Customer): void {
    let uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid === 'edit') {
      uuid = null;
    }
    if (customer) {
      if (uuid) {
        this.router.navigate(['/admin/sales/customers', customer.id, 'edit', uuid]);
      } else {
        this.router.navigate(['/admin/sales/customers', customer.id, 'edit']);
      }
    } else {
      if (uuid) {
        this.router.navigate(['/admin/sales/customers/new', uuid]);
      } else {
        this.router.navigate(['/admin/sales/customers/new']);
      }
    }
  }

  openCustomerDetails(customer: Customer): void {
    let uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid === 'edit') {
      uuid = null;
    }
    if (uuid) {
      this.router.navigate(['/admin/sales/customers', customer.id, uuid]);
    } else {
      this.router.navigate(['/admin/sales/customers', customer.id]);
    }
  }

  filters = {
    status: 'ALL',
    searchTerm: '',
    dateFrom: '',
    dateTo: '',
    page: 0,
    size: 10
  };
  
  currentPage = 0;
  totalElements = 0;
  totalPages = 0;

  get pageSize(): number { return this.filters.size; }
  set pageSize(v: number) { this.filters.size = v; }
  
  stats = {
    total: 0,
    active: 0,
    inactive: 0,
    blacklisted: 0
  };
  
  statusOptions = [
    { value: 'ALL', label: 'All Customers', color: 'gray' },
    { value: 'ACTIVE', label: 'Active', color: 'green' },
    { value: 'INACTIVE', label: 'Inactive', color: 'gray' },
    { value: 'BLACKLISTED', label: 'Blacklisted', color: 'red' }
  ];
  
  private destroy$ = new Subject<void>();

  constructor(
    private messageService: MessageService,
    private salesService: SalesService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadCustomers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Guards against a stale response landing after a newer one — the search box fires
  // applyFilters()/loadCustomers() on every keystroke with no debounce and no cancellation of
  // the previous in-flight request, so fast typing could let an earlier search term's response
  // resolve after a later one and overwrite the table with results for a term that no longer
  // matches what's in the search box.
  private loadRequestId = 0;

  loadCustomers(): void {
    this.isLoading = true;
    const requestId = ++this.loadRequestId;

    this.salesService.getCustomers(this.filters).subscribe({
      next: (response: any) => {
        if (requestId !== this.loadRequestId) return;
        this.customers = response.data;
        this.totalElements = response.total;
        this.totalPages = Math.ceil(response.total / this.filters.size);
        this.currentPage = this.filters.page;
        this.calculateStats(response);
        this.isLoading = false;
      },
      error: (error: any) => {
        if (requestId !== this.loadRequestId) return;
        console.error('Error loading customers:', error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load customers. Please try again.' });
        this.calculateStats(null);
        this.isLoading = false;
      }
    });
  }

  // totalSpent/avgOrderValue used to be computed here too, from this.customers — but that's only
  // the current page (≤pageSize rows), so it would have been a page-scoped aggregate masquerading
  // as a whole-book figure had it ever been wired up to the template (it wasn't — dead
  // computation). Removed rather than left as a trap for later.
  private calculateStats(response?: any): void {
    this.stats = {
      total: this.totalElements,
      active: response?.totalActive ?? this.customers.filter(c => c.status === 'ACTIVE').length,
      inactive: response?.totalInactive ?? this.customers.filter(c => c.status === 'INACTIVE').length,
      blacklisted: response?.totalBlacklisted ?? this.customers.filter(c => c.status === 'BLACKLISTED').length
    };
  }

  applyFilters(): void {
    this.filters.page = 0;
    this.loadCustomers();
  }

  resetFilters(): void {
    this.filters = {
      status: 'ALL',
      searchTerm: '',
      dateFrom: '',
      dateTo: '',
      page: 0,
      size: 10
    };
    this.loadCustomers();
  }

  onPageChange(page: number): void {
    this.filters.page = page;
    this.currentPage = page;
    this.loadCustomers();
  }

  onPageSizeChange(size: number): void {
    this.filters.size = size;
    this.filters.page = 0;
    this.currentPage = 0;
    this.loadCustomers();
  }

  toggleSelection(customerId: any, event: any): void {
    if (event.target.checked) {
      this.selectedCustomerIds.push(customerId);
    } else {
      this.selectedCustomerIds = this.selectedCustomerIds.filter(id => String(id) !== String(customerId));
    }
  }

  toggleSelectAll(event: any): void {
    // Was keyed on c.customerId (a separate string field, not the same value as c.id) while
    // every row checkbox's own toggleSelection()/isSelected() are keyed on c.id — "Select All"
    // populated selectedCustomerIds with values that could never match any row's own checkbox
    // state, so the header checkbox and bulk bar showed everything selected while no row did.
    if (event.target.checked) {
      this.selectedCustomerIds = this.customers.map(c => c.id);
    } else {
      this.selectedCustomerIds = [];
    }
  }

  isSelected(customerId: any): boolean {
    return this.selectedCustomerIds.includes(customerId);
  }

  isAllSelected(): boolean {
    return this.customers.length > 0 && this.selectedCustomerIds.length === this.customers.length;
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      'ACTIVE': 'status-active',
      'INACTIVE': 'status-inactive',
      'BLACKLISTED': 'status-blacklisted'
    };
    return classes[status] || 'status-active';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'ACTIVE': 'Active',
      'INACTIVE': 'Inactive',
      'BLACKLISTED': 'Blacklisted'
    };
    return labels[status] || status;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  }

  formatDate(date: Date): string {
    return formatApiDate(date);
  }

  isBulkDeleting = false;

  // Had no (click) handler at all — selecting customers and clicking this did nothing.
  bulkDeleteCustomers(): void {
    if (this.selectedCustomerIds.length === 0 || this.isBulkDeleting) return;
    if (!confirm(`Delete ${this.selectedCustomerIds.length} customer(s)? This cannot be undone.`)) return;

    this.isBulkDeleting = true;
    const ids = [...this.selectedCustomerIds];
    const requests = ids.map(id => this.salesService.deleteCustomer(id).pipe(
      map(() => ({ ok: true as const })),
      catchError(() => of({ ok: false as const }))
    ));

    forkJoin(requests).subscribe(results => {
      this.isBulkDeleting = false;
      this.selectedCustomerIds = [];
      this.loadCustomers();
      const failed = results.filter(r => !r.ok).length;
      if (failed > 0) {
        this.messageService.add({ severity: 'warn', summary: 'Partial failure', detail: `${results.length - failed} of ${results.length} customers were deleted; ${failed} failed.` });
      } else {
        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `${results.length} customer(s) deleted successfully.` });
      }
    });
  }

  deleteCustomer(customer: Customer): void {
    this.pendingDeleteCustomer = customer;
    this.pendingDeleteCustomerName = customer.name;
    this.showDeleteModal = true;
  }

  confirmDeleteCustomer(): void {
    const customer = this.pendingDeleteCustomer;
    if (!customer) {
      this.showDeleteModal = false;
      return;
    }

    this.salesService.deleteCustomer(customer.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: `Customer ${customer.name} deleted successfully` });
        this.showDeleteModal = false;
        this.pendingDeleteCustomer = undefined;
        this.loadCustomers();
      },
      error: (error: any) => {
        console.error('Error deleting customer:', error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete customer. Please try again.' });
        this.showDeleteModal = false;
        this.pendingDeleteCustomer = undefined;
      }
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

  // Removed UUID and buildLink
  createQuote(customer: Customer): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    const path = uuid ? ['/admin/sales/quotes/new', uuid] : ['/admin/sales/quotes/new'];
    this.router.navigate(path, { queryParams: { customerId: customer.id } });
  }

}
