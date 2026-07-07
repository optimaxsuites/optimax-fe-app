import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SalesService } from '../../../../service/sales/sales.service';
import { Quote, Invoice, SalesOrder } from '../../../../domain/sales/sales.dto';

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

  sendQuote(): void {
    if (this.quote && confirm(`Send quote ${this.quote.quoteNumber} to ${this.quote.customerName}?`)) {
      this.salesService.updateQuote(this.quote.id, { status: 'SENT' }).subscribe({
        next: (updated: Quote) => {
          this.quote = updated;
          alert(`Quote ${this.quote!.quoteNumber} has been sent to ${this.quote!.customerName}`);
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
      this.salesService.updateQuote(this.quote.id, { status: 'CONVERTED' }).subscribe({
        next: (updated: Quote) => {
          this.quote = updated;
          
          const orderData: Partial<SalesOrder> = {
            quoteId: updated.id,
            customerId: updated.customerId,
            customerName: updated.customerName,
            items: updated.items.map(item => ({
              id: Math.random().toString(36).substr(2, 9),
              productId: item.productId,
              productName: item.productName,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount || 0,
              total: item.total
            })),
            subtotal: updated.subtotal,
            taxAmount: updated.taxAmount,
            discountAmount: updated.discountAmount,
            totalAmount: updated.totalAmount,
            currency: updated.currency,
            status: 'PENDING',
            orderDate: new Date(),
            notes: updated.notes
          };

          this.salesService.createSalesOrder(orderData).subscribe({
            next: (createdOrder: SalesOrder) => {
              alert(`Quote ${updated.quoteNumber} accepted. Sales Order ${createdOrder.orderNumber} has been created.`);
              const uuid = this.route.snapshot.paramMap.get('uuid');
              if (uuid) {
                this.router.navigate(['/admin/sales/orders', createdOrder.id, uuid]);
              } else {
                this.router.navigate(['/admin/sales/orders', createdOrder.id]);
              }
            },
            error: (orderErr: any) => {
              console.error('Error creating sales order from quote:', orderErr);
              alert('Quote was accepted, but failed to create sales order.');
            }
          });
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
          alert(`Quote ${this.quote!.quoteNumber} has been marked as declined`);
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

  editQuote(): void {
    if (this.edit.observed) {
      this.edit.emit(this.quote!.id);
    } else {
      const uuid = this.route.snapshot.paramMap.get('uuid');
      if (uuid) {
        this.router.navigate(['/admin/sales/quotes', this.quote!.id, 'edit', uuid]);
      } else {
        this.router.navigate(['/admin/sales/quotes', this.quote!.id, 'edit']);
      }
    }
  }

  viewCustomer(): void {
    if (this.quote && this.quote.customerId) {
      const uuid = this.route.snapshot.paramMap.get('uuid');
      if (uuid) {
        this.router.navigate(['/admin/sales/customers', this.quote.customerId, uuid]);
      } else {
        this.router.navigate(['/admin/sales/customers', this.quote.customerId]);
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