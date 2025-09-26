import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Order } from '../../../models/interface';

@Component({
  selector: 'app-sales-details',
  templateUrl: './sales-details.component.html',
  styleUrl: './sales-details.component.scss'
})
export class SalesDetailsComponent implements OnInit, OnChanges {

  @Input() order?: Order;
  @Output() back = new EventEmitter<void>();
  
  loading = true;
  error = false;
  parseInt = parseInt;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loading = false;
    console.log('Sales details initialized with order:', this.order);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['order'] && changes['order'].currentValue) {
      console.log('Order data changed:', changes['order'].currentValue);
      this.loading = false;
    }
  }

  goBack(): void {
    this.back.emit();
  }
  
  formatDate(dateArray: any[]): string {
    if (!dateArray || dateArray.length < 3) return 'N/A';
    
    const [year, month, day, hour, minute, second] = dateArray;
    const date = new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
    
    return date.toLocaleString();
  }

  calculateTotalItems(): number {
    if (!this.order?.orderItem) return 0;
    return this.order.orderItem.reduce((total: number, item: any) => total + (item.quantity || 0), 0);
  }

  calculateSubtotal(): number {
    if (!this.order?.orderItem) return this.order?.totalAmount || 0;
    return this.order.orderItem.reduce((total: number, item: any) => {
      const quantity = item.quantity || 0;
      const unitPrice = this.getItemUnitPrice(item);
      return total + (unitPrice * quantity);
    }, 0);
  }

 calculateDiscount(): number {
    // In a real application, this would calculate discounts
    return 0;
  }
  calculateTax(): number {
    if (!this.order?.orderItem) return 0;
    return this.order.orderItem.reduce((totalTax: number, item: any) => {
      const quantity = item.quantity || 0;
      const unitPrice = this.getItemUnitPrice(item);
      const subtotal = unitPrice * quantity;
      const taxRate = this.getItemTaxRate(item);
      const itemTax = (taxRate / 100) * subtotal;
      return totalTax + itemTax;
    }, 0);
  }

  calculateTotal(): number {
    return this.calculateSubtotal() + this.calculateTax() - this.calculateDiscount();
  }

  // Helper method to get unit price for an item
  getItemUnitPrice(item: any): number {
    if (!item) return 0;
    const variantPrice = item.productVariant?.price;
    const productPrice = parseFloat(item.product?.sellingPrice || '0');
    return variantPrice || productPrice;
  }

  // Helper method to get tax rate for an item
  getItemTaxRate(item: any): number {
    if (!item?.product?.tax?.rate) return 5; // Default 5% tax
    return item.product.tax.rate;
  }

  // Print functionality
  printOrderDetails(): void {
    const printContent = document.getElementById('print-container');
    const windowUrl = 'about:blank';
    const uniqueName = new Date().getTime();
    const windowName = 'Print' + uniqueName;
    
    if (printContent) {
      const printWindow = window.open(windowUrl, windowName, 'left=500,top=100,width=900,height=600');
      
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Order</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f9f9f9; }
                @media print {
                  body { margin: 0; padding: 0; }
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        
        // Wait for content to load before printing
        setTimeout(() => {
          printWindow.print();
          // printWindow.close(); // Uncomment to automatically close after printing
        }, 250);
      }
    }
  }
}