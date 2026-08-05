// src/app/ui/view/sales-module/customer-list/customer-list.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { SalesService } from '../../../../service/sales/sales.service';
import { Customer } from '../../../../domain/sales/sales.dto';
import { formatApiDate } from '../../../../service/sales/date.util';

import { SharedOverlayModule } from '../../../../../shared-overlay.module';
import { CustomerFormComponent } from '../customer-form/customer-form.component';
import { QuoteFormComponent } from '../../quotations/quote-form/quote-form.component';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    SharedOverlayModule,
    CustomerFormComponent,
    QuoteFormComponent
  ],
  templateUrl: './customer-list.component.html',
  styleUrls: ['./customer-list.component.scss']
})
export class CustomerListComponent implements OnInit, OnDestroy {
  
  Math = Math;
  customers: any[] = [];
  isLoading = true;
  selectedCustomerIds: any[] = [];

  showCustomerModal = false;
  showCustomerDetails = false;
  showQuoteModal = false;
  selectedCustomerId?: string;
  selectedCustomerForEdit?: Customer;
  selectedCustomerDetail?: Customer;

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

  closeCustomerModal(): void {
    this.showCustomerModal = false;
    this.selectedCustomerForEdit = undefined;
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

  closeCustomerDetails(): void {
    this.showCustomerDetails = false;
    this.selectedCustomerDetail = undefined;
  }

  onCustomerSaved(): void {
    this.closeCustomerModal();
    this.loadCustomers();
  }

  closeQuoteModal(): void {
    this.showQuoteModal = false;
    this.selectedCustomerId = undefined;
  }

  onQuoteSaved(): void {
    this.closeQuoteModal();
    this.loadCustomers();
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
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  
  stats = {
    total: 0,
    active: 0,
    inactive: 0,
    blacklisted: 0,
    totalSpent: 0,
    avgOrderValue: 0
  };
  
  statusOptions = [
    { value: 'ALL', label: 'All Customers', color: 'gray' },
    { value: 'ACTIVE', label: 'Active', color: 'green' },
    { value: 'INACTIVE', label: 'Inactive', color: 'gray' },
    { value: 'BLACKLISTED', label: 'Blacklisted', color: 'red' }
  ];
  
  private destroy$ = new Subject<void>();

  constructor(
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

  loadCustomers(): void {
    this.isLoading = true;
    
    this.salesService.getCustomers(this.filters).subscribe({
      next: (response: any) => {
        this.customers = response.data;
        this.totalElements = response.total;
        this.totalPages = Math.ceil(response.total / this.filters.size);
        this.calculateStats();
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading customers:', error);
        this.calculateStats();
        this.isLoading = false;
      }
    });
  }

  private calculateStats(): void {
    const active = this.customers.filter(c => c.status === 'ACTIVE').length;
    const inactive = this.customers.filter(c => c.status === 'INACTIVE').length;
    const blacklisted = this.customers.filter(c => c.status === 'BLACKLISTED').length;
    const totalSpent = this.customers.reduce((sum, c) => sum + c.totalSpent, 0);
    
    this.stats = {
      total: this.customers.length,
      active: active,
      inactive: inactive,
      blacklisted: blacklisted,
      totalSpent: totalSpent,
      avgOrderValue: this.customers.length > 0 ? totalSpent / this.customers.length : 0
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
    this.loadCustomers();
  }

  onPageSizeChange(size: number): void {
    this.filters.size = size;
    this.filters.page = 0;
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
    if (event.target.checked) {
      this.selectedCustomerIds = this.customers.map(c => c.customerId || String(c.id));
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

  deleteCustomer(customer: Customer): void {
    if (confirm(`Delete customer ${customer.name}? This action cannot be undone.`)) {
      this.salesService.deleteCustomer(customer.id).subscribe({
        next: () => {
          alert(`Customer ${customer.name} deleted successfully`);
          this.loadCustomers();
        },
        error: (error: any) => {
          console.error('Error deleting customer:', error);
          alert('Failed to delete customer. Please try again.');
        }
      });
    }
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
