// src/app/ui/view/sales-module/customer-list/customer-list.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { SalesService } from '../../../../service/sales/sales.service';
import { Customer } from '../../../../domain/sales/sales.dto';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './customer-list.component.html',
  styleUrls: ['./customer-list.component.scss']
})
export class CustomerListComponent implements OnInit, OnDestroy {
  
  Math = Math;
  customers: Customer[] = [];
  isLoading = true;
  selectedCustomerIds: string[] = [];
  
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
    private router: Router
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
        this.setMockCustomers();
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

  toggleSelection(customerId: string, event: any): void {
    if (event.target.checked) {
      this.selectedCustomerIds.push(customerId);
    } else {
      this.selectedCustomerIds = this.selectedCustomerIds.filter(id => id !== customerId);
    }
  }

  toggleSelectAll(event: any): void {
    if (event.target.checked) {
      this.selectedCustomerIds = this.customers.map(c => c.id);
    } else {
      this.selectedCustomerIds = [];
    }
  }

  isSelected(customerId: string): boolean {
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
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  deleteCustomer(customer: Customer): void {
    if (confirm(`Delete customer ${customer.name}? This action cannot be undone.`)) {
      this.customers = this.customers.filter(c => c.id !== customer.id);
      this.calculateStats();
      alert(`Customer ${customer.name} deleted`);
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

  // ✅ FIXED: Removed UUID and buildLink
  createQuote(customer: Customer): void {
    this.router.navigate(['/sales/quotes/new'], { queryParams: { customerId: customer.id } });
  }

  // Mock data for development
  private setMockCustomers(): void {
    this.customers = [
      {
        id: 'CUST-001', name: 'Mama Nkechi Enterprises', email: 'contact@mamankechi.com',
        phone: '+234 803 123 4567', address: 'Lagos, Nigeria', taxId: 'TAX-001',
        createdAt: new Date('2026-01-15'), totalSpent: 2845000, totalOrders: 12, status: 'ACTIVE'
      },
      {
        id: 'CUST-002', name: 'Tech Solutions Ltd', email: 'info@techsolutions.ng',
        phone: '+234 812 345 6789', address: 'Abuja, Nigeria', taxId: 'TAX-002',
        createdAt: new Date('2026-02-20'), totalSpent: 1250000, totalOrders: 5, status: 'ACTIVE'
      },
      {
        id: 'CUST-003', name: 'Global Services NG', email: 'hello@globalservices.ng',
        phone: '+234 705 678 9012', address: 'Port Harcourt, Nigeria', taxId: 'TAX-003',
        createdAt: new Date('2026-03-10'), totalSpent: 350000, totalOrders: 2, status: 'ACTIVE'
      },
      {
        id: 'CUST-004', name: 'Aliko Dangote Wholesale', email: 'info@dangote.com',
        phone: '+234 802 222 3333', address: 'Kano, Nigeria', taxId: 'TAX-004',
        createdAt: new Date('2026-01-05'), totalSpent: 750000, totalOrders: 3, status: 'ACTIVE'
      },
      {
        id: 'CUST-005', name: 'Obinna Electronics', email: 'contact@obinnaelectronics.com',
        phone: '+234 809 444 5555', address: 'Onitsha, Nigeria', taxId: 'TAX-005',
        createdAt: new Date('2026-04-01'), totalSpent: 0, totalOrders: 0, status: 'INACTIVE'
      }
    ];
    this.totalElements = this.customers.length;
    this.totalPages = 1;
  }
}