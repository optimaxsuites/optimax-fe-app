import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SalesService } from '../../../../service/sales/sales.service';
import { Quote, Invoice, SalesandTransactions, AdditionalQuoteOptions } from '../../../../domain/sales/sales.dto';

import { CommonModule } from '@angular/common';
import { BackButtonComponent } from '../../../../shared-component/view/back-button/back-button.component';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-quote-detail',
  standalone: true,
  imports: [CommonModule, BackButtonComponent],
  templateUrl: './quote-detail.component.html',
  styleUrls: ['./quote-detail.component.scss']
})
export class QuoteDetailComponent implements OnInit {
  @Input() detailId?: string;
  @Output() closed = new EventEmitter<void>();
  @Output() edit = new EventEmitter<string>();

  quote: Quote | null = null;
  isLoading = true;
  isDownloading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private salesService: SalesService
  ) {}

  get additionalOpts(): AdditionalQuoteOptions | undefined {
    if (!this.quote?.additionalOptions) return undefined;
    return Array.isArray(this.quote.additionalOptions) ? this.quote.additionalOptions[0] : (this.quote.additionalOptions as any);
  }

  ngOnInit(): void {
    const id = this.detailId || this.route.snapshot.paramMap.get('id');
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

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'DRAFT': 'draft',
      'SENT': 'sent',
      'ACCEPTED': 'accepted',
      'DECLINED': 'declined',
      'EXPIRED': 'expired',
      'CONVERTED': 'converted'
    };
    return classes[status] || 'draft';
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

  isExpiringSoon(validUntil: Date | string): boolean {
    if (!validUntil) return false;
    const validDate = new Date(validUntil);
    const today = new Date();
    const diffTime = validDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  }

  getTotalQuantity(): number {
    if (!this.quote || !this.quote.items) return 0;
    return this.quote.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }

  getTotalInWords(amount: number): string {
    // Simple number to words conversion - you can expand this
    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (amount === 0) return 'Zero';
    
    const currency = this.quote?.currency || 'NGN';
    const currencySymbol = currency === 'NGN' ? 'Naira' : currency;
    
    const naira = Math.floor(amount);
    const kobo = Math.round((amount - naira) * 100);
    
    if (naira === 0) return `${kobo} Kobo`;
    
    let words = this.numberToWords(naira) + ' ' + currencySymbol;
    if (kobo > 0) {
      words += ` and ${this.numberToWords(kobo)} Kobo`;
    }
    return words;
  }

  private numberToWords(num: number): string {
    if (num === 0) return 'Zero';
    
    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const thousands = ['', 'Thousand', 'Million', 'Billion'];
    
    if (num < 10) return units[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) {
      const t = Math.floor(num / 10);
      const u = num % 10;
      return tens[t] + (u > 0 ? ' ' + units[u] : '');
    }
    if (num < 1000) {
      const h = Math.floor(num / 100);
      const r = num % 100;
      return units[h] + ' Hundred' + (r > 0 ? ' and ' + this.numberToWords(r) : '');
    }
    
    let result = '';
    let remaining = num;
    let group = 0;
    
    while (remaining > 0) {
      const chunk = remaining % 1000;
      if (chunk > 0) {
        const chunkWords = this.numberToWords(chunk);
        result = chunkWords + (thousands[group] ? ' ' + thousands[group] : '') + (result ? ' ' + result : '');
      }
      remaining = Math.floor(remaining / 1000);
      group++;
    }
    
    return result;
  }

  showSendQuoteModal = false;
  showAcceptQuoteModal = false;
  showDeclineQuoteModal = false;
  showDeleteQuoteModal = false;
  
  pendingQuoteNumber = '';
  pendingCustomerName = '';

  sendQuote(): void {
    if (!this.quote) return;
    const custName = (this.quote.customerName as any)?.name || this.quote.customerName || 'Customer';
    this.pendingQuoteNumber = this.quote.quoteNumber || '';
    this.pendingCustomerName = custName;
    this.showSendQuoteModal = true;
  }

  confirmSendQuote(): void {
    if (!this.quote) return;
    this.showSendQuoteModal = false;
    this.salesService.updateQuote(String(this.quote.id), { status: 'SENT' }).subscribe({
      next: (updated: Quote) => {
        this.quote = updated;
      },
      error: (err: any) => {
        console.error('Error sending quote:', err);
      }
    });
  }

  acceptQuote(): void {
    if (!this.quote) return;
    const custName = (this.quote.customerName as any)?.name || this.quote.customerName || 'Customer';
    this.pendingQuoteNumber = this.quote.quoteNumber || '';
    this.pendingCustomerName = custName;
    this.showAcceptQuoteModal = true;
  }

  confirmAcceptQuote(): void {
    if (!this.quote) return;
    this.showAcceptQuoteModal = false;
    this.salesService.updateQuote(String(this.quote.id), { status: 'CONVERTED' }).subscribe({
      next: (updated: Quote) => {
        this.quote = updated;
        
        const addOpts = Array.isArray(updated.additionalOptions) ? updated.additionalOptions[0] : (updated.additionalOptions as any);
        const orderData: Partial<SalesandTransactions> = {
          quoteId: updated,
          customerId: updated.customerId,
          customerName: updated.customerName,
          items: updated,
          subtotal: updated.subtotal,
          taxAmount: updated.taxAmount,
          discountAmount: updated.discountAmount,
          totalAmount: updated.totalAmount,
          currency: updated.currency,
          status: 'QUOTE_ACCEPTED',
          orderDate: new Date(),
          customerNotes: addOpts?.notes || '',
          billingAddress: addOpts?.address || '',
          shippingAddress: addOpts?.address || '',
          PaymentTerms: {
            id: 1,
            customerId: updated.customerId,
            customerName: updated.customerName,
            paymentPeriod: 30,
            amount: updated.totalAmount,
            balanceDue: updated.totalAmount,
            installmentNumber: 1,
            completedInstallments: 0
          }
        };

        this.salesService.createSalesandTransactions(orderData).subscribe({
          next: (createdTx) => {
            const uuid = this.route.snapshot.paramMap.get('uuid');
            if (uuid) {
              this.router.navigate(['/admin/sales/orders', createdTx.id, uuid]);
            } else {
              this.router.navigate(['/admin/sales/orders', createdTx.id]);
            }
          },
          error: (orderErr: any) => {
            console.error('Error creating sales order from quote:', orderErr);
          }
        });
      },
      error: (err: any) => {
        console.error('Error accepting quote:', err);
      }
    });
  }

  declineQuote(): void {
    if (!this.quote) return;
    const custName = (this.quote.customerName as any)?.name || this.quote.customerName || 'Customer';
    this.pendingQuoteNumber = this.quote.quoteNumber || '';
    this.pendingCustomerName = custName;
    this.showDeclineQuoteModal = true;
  }

  confirmDeclineQuote(): void {
    if (!this.quote) return;
    this.showDeclineQuoteModal = false;
    this.salesService.updateQuote(String(this.quote.id), { status: 'DECLINED' }).subscribe({
      next: (updated: Quote) => {
        this.quote = updated;
      },
      error: (err: any) => {
        console.error('Error declining quote:', err);
      }
    });
  }

  deleteQuote(): void {
    if (!this.quote) return;
    const custName = (this.quote.customerName as any)?.name || this.quote.customerName || 'Customer';
    this.pendingQuoteNumber = this.quote.quoteNumber || '';
    this.pendingCustomerName = custName;
    this.showDeleteQuoteModal = true;
  }

  confirmDeleteQuote(): void {
    if (!this.quote) return;
    this.showDeleteQuoteModal = false;
    this.salesService.updateQuote(String(this.quote.id), { status: 'EXPIRED' }).subscribe({
      next: () => {
        this.goBack();
      },
      error: (err: any) => {
        console.error('Error deleting quote:', err);
      }
    });
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

  goToQuotesList(): void {
    const sessionStorageKey = 'dashboard-catalog-quotes-invoices-orders-customers-transactions';
    sessionStorage.setItem(sessionStorageKey, 'Quotes');

    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate(['/admin/sales/sales-hub', uuid]);
    } else {
      this.router.navigate(['/admin/sales/sales-hub']);
    }
  }

  editQuote(): void {
    if (this.edit.observed) {
      this.edit.emit(String(this.quote!.id));
    } else {
      const uuid = this.route.snapshot.paramMap.get('uuid');
      if (uuid) {
        this.router.navigate(['/admin/sales/quotes', String(this.quote!.id), 'edit', uuid]);
      } else {
        this.router.navigate(['/admin/sales/quotes', String(this.quote!.id), 'edit']);
      }
    }
  }

  viewCustomer(): void {
    if (this.quote && this.quote.customerId) {
      const uuid = this.route.snapshot.paramMap.get('uuid');
      if (uuid) {
        this.router.navigate(['/admin/sales/customers', this.quote.customerId.customerId, uuid]);
      } else {
        this.router.navigate(['/admin/sales/customers', this.quote.customerId.customerId]);
      }
    }
  }

  downloadPDF(): void {
    const element = document.getElementById('quote-detail-sheet');
    if (element) {
      this.isDownloading = true;
      element.classList.add('pdf-printing-active');
      
      setTimeout(() => {
        html2canvas(element, { 
          scale: 2, 
          useCORS: true, 
          allowTaint: true,
          backgroundColor: '#ffffff'
        }).then((canvas) => {
          element.classList.remove('pdf-printing-active');
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const imgWidth = 210; // A4 size width
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
          pdf.save(`Quote-${this.quote?.quoteNumber || 'Detail'}.pdf`);
          this.isDownloading = false;
        }).catch(err => {
          element.classList.remove('pdf-printing-active');
          console.error('Error generating PDF:', err);
          this.isDownloading = false;
          alert('Failed to generate PDF. Printing window instead.');
          window.print();
        });
      }, 50);
    } else {
      alert('Could not find element to export. Printing window instead.');
      window.print();
    }
  }
}