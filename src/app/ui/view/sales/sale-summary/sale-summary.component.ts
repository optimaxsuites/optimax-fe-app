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

  printReceipt(): void {
    console.log('Printing receipt for:', this.selectedTransaction);
    // Implement print functionality here
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
}
