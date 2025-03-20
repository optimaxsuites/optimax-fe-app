import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';

@Component({
  selector: 'app-sale-summary',
  templateUrl: './sale-summary.component.html',
  styleUrls: ['./sale-summary.component.scss'],
})
export class SaleSummaryComponent implements OnInit {
  @Input() selectedTransaction: any;
  @Output() back = new EventEmitter();

  taxRate: number = 7.5; // Default tax rate

  // Sample items to display if none are provided in the transaction
  sampleItems = [
    {
      id: 'ITEM001',
      name: 'Product A',
      quantity: 2,
      price: 25.99,
      discount: 0,
    },
    {
      id: 'ITEM002',
      name: 'Product B',
      quantity: 1,
      price: 49.99,
      discount: 10,
    },
    { id: 'ITEM003', name: 'Product C', quantity: 3, price: 15.5, discount: 0 },
  ];

  constructor() {}

  ngOnInit(): void {
    console.log('Transaction details:', this.selectedTransaction);

    if (!this.selectedTransaction?.items) {
      this.selectedTransaction = {
        ...this.selectedTransaction,
        items: this.sampleItems,
        paymentMethod: 'Credit Card',
      };
    }
  }

  goBack(): void {
    this.back.emit();
  }

  formatDate(date: Date): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatCurrency(amount: number): string {
    if (amount === undefined || amount === null) return '0.00';
    return amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  }

  calculateItemTotal(item: any): number {
    const priceAfterDiscount = item.price * (1 - item.discount / 100);
    return priceAfterDiscount * item.quantity;
  }

  calculateSubtotal(): number {
    if (!this.selectedTransaction?.items) return 0;
    return this.selectedTransaction.items.reduce(
      (sum: number, item: any) => sum + this.calculateItemTotal(item),
      0
    );
  }

  calculateTax(): number {
    const subtotal = this.calculateSubtotal();
    return subtotal * (this.taxRate / 100);
  }

  printReceipt(): void {
    const printWindow = window.open('', '_blank');

    if (printWindow) {
      const saleSummaryContainer = document.querySelector(
        '.sale-summary-container'
      );

      // Get your current styles
      const styles = Array.from(document.styleSheets)
        .map((styleSheet) => {
          try {
            return Array.from(styleSheet.cssRules)
              .map((rule) => rule.cssText)
              .join('\n');
          } catch (e) {
            return '';
          }
        })
        .join('\n');

      // Build the content to print
      let contentToPrint = '';

      // Add title at the top of the printed receipt
      contentToPrint +=
        '<div class="print-header"><h1 class="text-3xl font-bold mb-4">Receipt</h1></div>';

      // Add timestamp
      const now = new Date();
      contentToPrint += `<div class="print-date mb-4">Generated on: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}</div>`;

      // Add the sale summary content
      if (saleSummaryContainer)
        contentToPrint += saleSummaryContainer.outerHTML;

      // Print CSS
      const printCSS = `
        @media print {
          body { font-family: Arial, sans-serif; }
          .print-header { text-align: center; margin-bottom: 20px; }
          .print-date { text-align: right; font-style: italic; color: #666; }
          .sale-summary-container { break-inside: avoid; }
          .transaction-summary { break-inside: avoid; }
          .sale-items { break-before: always; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; }
          th { background-color: #f2f2f2 !important; color: #333 !important; }
          .sale-items table { width: 100%; }
          .sale-items th, .sale-items td { padding: 8px; }
        }
      `;

      // Setup the print window
      printWindow.document.open();
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt</title>
            <style>${styles}\n${printCSS}</style>
          </head>
          <body>
            ${contentToPrint}
          </body>
        </html>
      `);
      printWindow.document.close();

      // Print after everything has loaded
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 1000);
    }
  }
}
