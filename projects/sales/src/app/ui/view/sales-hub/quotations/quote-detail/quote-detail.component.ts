// src/app/ui/view/sales-hub/quotations/quote-detail/quote-detail.component.ts

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SalesService } from '../../../../service/sales/sales.service';
import { Quote } from '../../../../domain/sales/sales.dto';

@Component({
  selector: 'app-quote-detail',
  templateUrl: './quote-detail.component.html',
  styleUrls: ['./quote-detail.component.scss']
})
export class QuoteDetailComponent implements OnInit {
  quote: Quote | null = null;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private salesService: SalesService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadQuote(id);
    } else {
      this.isLoading = false;
    }
  }

  loadQuote(id: string): void {
    this.isLoading = true;
    this.salesService.getQuoteById(id).subscribe({
      next: (quote: Quote | null) => {
        this.quote = quote;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading quote:', err);
        this.isLoading = false;
      }
    });
  }

  formatCurrency(amount: number): string {
    const currency = this.quote?.currency || 'NGN';
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
      'ACCEPTED': 'status-accepted',
      'DECLINED': 'status-declined',
      'EXPIRED': 'status-expired',
      'CONVERTED': 'status-converted'
    };
    return classes[status] || 'status-draft';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'DRAFT': 'Draft',
      'SENT': 'Sent',
      'ACCEPTED': 'Accepted',
      'DECLINED': 'Declined',
      'EXPIRED': 'Expired',
      'CONVERTED': 'Converted'
    };
    return labels[status] || status;
  }

  sendQuote(): void {
    if (this.quote && confirm(`Send quote ${this.quote.quoteNumber} to ${this.quote.customerName}?`)) {
      this.salesService.updateQuote(this.quote.id, { status: 'SENT' }).subscribe({
        next: (updated: Quote) => {
          this.quote = updated;
          alert(`Quote ${this.quote.quoteNumber} has been sent to ${this.quote.customerName}`);
        },
        error: (err: any) => {
          console.error('Error sending quote:', err);
          alert('Failed to send quote. Please try again.');
        }
      });
    }
  }

  acceptQuote(): void {
    if (this.quote && confirm(`Accept quote ${this.quote.quoteNumber}?`)) {
      this.salesService.updateQuote(this.quote.id, { status: 'ACCEPTED' }).subscribe({
        next: (updated: Quote) => {
          this.quote = updated;
          alert(`Quote ${this.quote.quoteNumber} has been accepted`);
        },
        error: (err: any) => {
          console.error('Error accepting quote:', err);
          alert('Failed to accept quote. Please try again.');
        }
      });
    }
  }

  declineQuote(): void {
    if (this.quote && confirm(`Decline quote ${this.quote.quoteNumber}?`)) {
      this.salesService.updateQuote(this.quote.id, { status: 'DECLINED' }).subscribe({
        next: (updated: Quote) => {
          this.quote = updated;
          alert(`Quote ${this.quote.quoteNumber} has been marked as declined`);
        },
        error: (err: any) => {
          console.error('Error declining quote:', err);
          alert('Failed to decline quote. Please try again.');
        }
      });
    }
  }

  deleteQuote(): void {
    if (this.quote && confirm(`Delete quote ${this.quote.quoteNumber}? This action cannot be undone.`)) {
      this.salesService.updateQuote(this.quote.id, { status: 'EXPIRED' }).subscribe({
        next: () => {
          alert(`Quote ${this.quote!.quoteNumber} deleted successfully`);
          this.goBack();
        },
        error: (err: any) => {
          console.error('Error deleting quote:', err);
          alert('Failed to delete quote. Please try again.');
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/sales/quotes']);
  }
}