import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Order } from '../../../models/interface';

@Component({
  selector: 'app-sales-details',
  templateUrl: './sales-details.component.html',
  styleUrl: './sales-details.component.scss'
})
export class SalesDetailsComponent {

  @Input() order?: Order;
  @Output() back = new EventEmitter<void>();
  
  loading = true;
  error = false;
  parseInt = parseInt;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    // private orderService: OrderService
  ) { }

  ngOnInit(): void {
    // this.loadOrder();
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
    return this.order.orderItem.reduce((total: any, item: { quantity: any; }) => total + item.quantity, 0);
  }

  calculateSubtotal(): number {
    if (!this.order?.orderItem) return 0;
    return this.order.orderItem.reduce((total: any, item: { totalPrice: any; }) => total + item.totalPrice, 0);
  }

  calculateDiscount(): number {
    // In a real application, this would calculate discounts
    return 0;
  }

  calculateTax(): number {
    // In a real application, this would calculate tax
    // For now, we'll assume 5% tax on all items
    return this.calculateSubtotal() * 0.05;
  }

  calculateTotal(): number {
    return this.calculateSubtotal() + this.calculateTax() - this.calculateDiscount();
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