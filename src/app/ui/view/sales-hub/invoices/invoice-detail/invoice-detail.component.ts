// src/app/ui/view/sales-module/invoice-detail/invoice-detail.component.ts

import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SalesService } from '../../../../service/sales/sales.service';
import { Invoice } from '../../../../domain/sales/sales.dto';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invoice-detail.component.html',
  styleUrls: ['./invoice-detail.component.scss']
})
export class InvoiceDetailComponent implements OnInit {
  @Input() detailId?: string;
  @Output() closed = new EventEmitter<void>();
  @Output() edit = new EventEmitter<string>();

  invoice: Invoice | null = null;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private salesService: SalesService
  ) {}

  ngOnInit(): void {
    const id = this.detailId || this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadInvoice(id);
    } else {
      this.isLoading = false;
    }
  }

  loadInvoice(id: string): void {
    this.isLoading = true;
    this.salesService.getInvoiceById(id).subscribe({
      next: (invoice: Invoice | null) => {
        this.invoice = invoice;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading invoice:', err);
        this.isLoading = false;
      }
    });
  }

  formatCurrency(amount: number): string {
    const currency = this.invoice?.currency || 'NGN';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(amount);
  }

  formatDate(date: any): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      'DRAFT': 'status-draft',
      'SENT': 'status-sent',
      'PAID': 'status-paid',
      'PARTIAL': 'status-partial',
      'OVERDUE': 'status-overdue',
      'CANCELLED': 'status-cancelled'
    };
    return classes[status] || 'status-draft';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'DRAFT': 'Draft',
      'SENT': 'Sent',
      'PAID': 'Paid',
      'PARTIAL': 'Partial',
      'OVERDUE': 'Overdue',
      'CANCELLED': 'Cancelled'
    };
    return labels[status] || status;
  }

  markAsPaid(): void {
    if (this.invoice && confirm(`Mark invoice ${this.invoice.invoiceNumber} as paid?`)) {
      this.salesService.updateInvoice(this.invoice.id, { 
        status: 'PAID', 
        amountPaid: this.invoice.totalAmount, 
        balanceDue: 0,
        paidAt: new Date()
      }).subscribe({
        next: (updated: Invoice) => {
          this.invoice = updated;
          alert(`Invoice ${this.invoice.invoiceNumber} has been marked as paid`);
        },
        error: (err: any) => {
          console.error('Error marking invoice as paid:', err);
          alert('Failed to mark invoice as paid. Please try again.');
        }
      });
    }
  }

  goBack(): void {
    if (this.closed.observed) {
      this.closed.emit();
    } else {
      const uuid = this.route.snapshot.paramMap.get('uuid');
      if (uuid) {
        this.router.navigate(['/admin/sales/sales-hub', uuid]);
      } else {
        this.router.navigate(['/admin/sales/sales-hub']);
      }
    }
  }

  editInvoice(): void {
    if (this.edit.observed) {
      this.edit.emit(this.invoice!.id);
    } else {
      const uuid = this.route.snapshot.paramMap.get('uuid');
      if (uuid) {
        this.router.navigate(['/admin/sales/invoices', this.invoice!.id, 'edit', uuid]);
      } else {
        this.router.navigate(['/admin/sales/invoices', this.invoice!.id, 'edit']);
      }
    }
  }
}