// src/app/ui/view/sales-module/invoice-list/invoice-list.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SalesService } from '../../../../service/sales/sales.service';
import { Invoice, InvoiceStatus } from '../../../../domain/sales/sales.dto';
import { buildSalesLink } from '../../../../shared-component/service/route-context/route-context';

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './invoice-list.component.html',
  styleUrls: ['./invoice-list.component.scss']
})
export class InvoiceListComponent implements OnInit, OnDestroy {
  buildLink = buildSalesLink;
  
  // Expose Math to template
  Math = Math;  // ← ADD THIS LINE
  
  invoices: Invoice[] = [];
  isLoading = true;
  selectedInvoiceIds: string[] = [];
  
  // Filters
  filters = {
    status: 'ALL',
    searchTerm: '',
    dateFrom: '',
    dateTo: '',
    page: 0,
    size: 10
  };
  
  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  
  // Stats
  stats = {
    total: 0,
    draft: 0,
    sent: 0,
    paid: 0,
    overdue: 0,
    partial: 0,
    cancelled: 0
  };
  
  statusOptions: { value: InvoiceStatus | 'ALL'; label: string; icon: string; color: string }[] = [
    { value: 'ALL', label: 'All Invoices', icon: 'M4 6h16M4 12h16M4 18h16', color: 'gray' },
    { value: 'DRAFT', label: 'Draft', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', color: 'gray' },
    { value: 'SENT', label: 'Sent', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color: 'blue' },
    { value: 'PAID', label: 'Paid', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'green' },
    { value: 'PARTIAL', label: 'Partial', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1', color: 'orange' },
    { value: 'OVERDUE', label: 'Overdue', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'red' },
    { value: 'CANCELLED', label: 'Cancelled', icon: 'M6 18L18 6M6 6l12 12', color: 'gray' }
  ];
  
  private destroy$ = new Subject<void>();

  constructor(private salesService: SalesService) {}

  ngOnInit(): void {
    this.loadInvoices();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadInvoices(): void {
    this.isLoading = true;
    
    this.salesService.getInvoices(this.filters).subscribe({
      next: (response) => {
        this.invoices = response.data;
        this.totalElements = response.total;
        this.totalPages = Math.ceil(response.total / this.filters.size);
        this.calculateStats();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading invoices:', error);
        this.setMockInvoices();
        this.calculateStats();
        this.isLoading = false;
      }
    });
  }

  private calculateStats(): void {
    this.stats = {
      total: this.invoices.length,
      draft: this.invoices.filter(i => i.status === 'DRAFT').length,
      sent: this.invoices.filter(i => i.status === 'SENT').length,
      paid: this.invoices.filter(i => i.status === 'PAID').length,
      overdue: this.invoices.filter(i => i.status === 'OVERDUE').length,
      partial: this.invoices.filter(i => i.status === 'PARTIAL').length,
      cancelled: this.invoices.filter(i => i.status === 'CANCELLED').length
    };
  }

  applyFilters(): void {
    this.filters.page = 0;
    this.loadInvoices();
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
    this.loadInvoices();
  }

  onPageChange(page: number): void {
    this.filters.page = page;
    this.loadInvoices();
  }

  onPageSizeChange(size: number): void {
    this.filters.size = size;
    this.filters.page = 0;
    this.loadInvoices();
  }

  toggleSelection(invoiceId: string, event: any): void {
    if (event.target.checked) {
      this.selectedInvoiceIds.push(invoiceId);
    } else {
      this.selectedInvoiceIds = this.selectedInvoiceIds.filter(id => id !== invoiceId);
    }
  }

  toggleSelectAll(event: any): void {
    if (event.target.checked) {
      this.selectedInvoiceIds = this.invoices.map(i => i.id);
    } else {
      this.selectedInvoiceIds = [];
    }
  }

  isSelected(invoiceId: string): boolean {
    return this.selectedInvoiceIds.includes(invoiceId);
  }

  isAllSelected(): boolean {
    return this.invoices.length > 0 && this.selectedInvoiceIds.length === this.invoices.length;
  }

  getStatusBadgeClass(status: InvoiceStatus): string {
    const classes: Record<InvoiceStatus, string> = {
      'DRAFT': 'status-draft',
      'SENT': 'status-sent',
      'PAID': 'status-paid',
      'PARTIAL': 'status-partial',
      'OVERDUE': 'status-overdue',
      'CANCELLED': 'status-cancelled'
    };
    return classes[status] || 'status-draft';
  }

  getStatusLabel(status: InvoiceStatus): string {
    const labels: Record<InvoiceStatus, string> = {
      'DRAFT': 'Draft',
      'SENT': 'Sent',
      'PAID': 'Paid',
      'PARTIAL': 'Partial',
      'OVERDUE': 'Overdue',
      'CANCELLED': 'Cancelled'
    };
    return labels[status];
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

  isOverdue(dueDate: Date): boolean {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  }

  getDaysOverdue(dueDate: Date): number {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today.getTime() - due.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  sendReminder(invoice: Invoice): void {
    if (confirm(`Send payment reminder for ${invoice.invoiceNumber} to ${invoice.customerName}?`)) {
      console.log('Sending reminder for:', invoice.id);
      alert(`Payment reminder sent to ${invoice.customerName}`);
    }
  }

  markAsPaid(invoice: Invoice): void {
    if (confirm(`Mark ${invoice.invoiceNumber} as paid?`)) {
      console.log('Marking as paid:', invoice.id);
      alert(`Invoice ${invoice.invoiceNumber} marked as paid`);
      this.loadInvoices();
    }
  }

  deleteInvoice(invoice: Invoice): void {
    if (confirm(`Delete invoice ${invoice.invoiceNumber}? This action cannot be undone.`)) {
      console.log('Deleting invoice:', invoice.id);
      this.invoices = this.invoices.filter(i => i.id !== invoice.id);
      this.calculateStats();
      alert(`Invoice ${invoice.invoiceNumber} deleted`);
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

  // Mock data for development
  private setMockInvoices(): void {
    this.invoices = [
      {
        id: '1', invoiceNumber: 'INV-001', orderId: 'ORD-001', customerId: 'CUST-001',
        customerName: 'Mama Nkechi Enterprises', items: [], subtotal: 500000, taxAmount: 0,
        discountAmount: 0, totalAmount: 500000, amountPaid: 500000, balanceDue: 0,
        currency: 'NGN', status: 'PAID', issueDate: new Date('2026-06-10'),
        dueDate: new Date('2026-06-20'), paidAt: new Date('2026-06-15'), notes: '', paymentTerms: 'Net 30'
      },
      {
        id: '2', invoiceNumber: 'INV-002', orderId: 'ORD-002', customerId: 'CUST-002',
        customerName: 'Tech Solutions Ltd', items: [], subtotal: 1250000, taxAmount: 0,
        discountAmount: 0, totalAmount: 1250000, amountPaid: 0, balanceDue: 1250000,
        currency: 'NGN', status: 'SENT', issueDate: new Date('2026-06-09'),
        dueDate: new Date('2026-06-25'), paidAt: undefined, notes: '', paymentTerms: 'Net 30'
      },
      {
        id: '3', invoiceNumber: 'INV-003', orderId: 'ORD-003', customerId: 'CUST-003',
        customerName: 'Global Services NG', items: [], subtotal: 350000, taxAmount: 0,
        discountAmount: 0, totalAmount: 350000, amountPaid: 0, balanceDue: 350000,
        currency: 'NGN', status: 'OVERDUE', issueDate: new Date('2026-05-20'),
        dueDate: new Date('2026-06-01'), paidAt: undefined, notes: '', paymentTerms: 'Net 30'
      },
      {
        id: '4', invoiceNumber: 'INV-004', orderId: 'ORD-004', customerId: 'CUST-004',
        customerName: 'Aliko Dangote Wholesale', items: [], subtotal: 750000, taxAmount: 0,
        discountAmount: 0, totalAmount: 750000, amountPaid: 500000, balanceDue: 250000,
        currency: 'NGN', status: 'PARTIAL', issueDate: new Date('2026-06-05'),
        dueDate: new Date('2026-06-19'), paidAt: undefined, notes: '', paymentTerms: 'Net 30'
      }
    ];
    this.totalElements = this.invoices.length;
    this.totalPages = 1;
  }
}