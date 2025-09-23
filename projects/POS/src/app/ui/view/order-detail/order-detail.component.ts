import { Component, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationState } from '../../models/interface';
import { NavigationLinksService } from '../../sharedComponent/service/navigation-links/navigation-links.service';
import JsBarcode from 'jsbarcode';

@Component({
  selector: 'app-order-detail',
  templateUrl: './order-detail.component.html',
  styleUrl: './order-detail.component.scss',
})
export class OrderDetailComponent implements AfterViewInit {
hasCashPayment(): any {
throw new Error('Method not implemented.');
}
  navigationState: NavigationState;

  constructor(
    private router: Router,
    public navigationLink: NavigationLinksService
  ) {
    const navigation = this.router.getCurrentNavigation();
    this.navigationState = navigation?.extras.state as NavigationState;
    if (!this.navigationState) {
      const viewedState = localStorage.getItem('viewedState');
      if (viewedState) {
        this.navigationState = JSON.parse(viewedState);
      }
    } else {
      localStorage.setItem('viewedState', JSON.stringify(this.navigationState));
    }
    console.log(this.navigationState);
  }

  // New getter method to check for cash payments
  get isCashPayment(): boolean {
    return this.navigationState.order.payment?.paymentBreakdown?.some((p: { paymentMethod: string; }) => p.paymentMethod === 'CASH') ?? false;
  }

  getSubtotal(): number {
    return this.navigationState.order.orderItem.reduce((sum: number, item: any) => {
      const quantity = item.quantity;
      const variantPrice = item.productVariant?.price;
      const productPrice = parseFloat(item.product.sellingPrice);
      const subtotal = variantPrice ? variantPrice * quantity : productPrice * quantity;
      return sum + subtotal;
    }, 0);
  }
  
  getTotalTax(): number {
    return this.navigationState.order.orderItem.reduce((sum: number, item: any) => {
      const quantity = item.quantity;
      const variantPrice = item.productVariant?.price;
      const productPrice = parseFloat(item.product.sellingPrice);
      const subtotal = variantPrice ? variantPrice * quantity : productPrice * quantity;
      const taxRate = item.product.tax?.rate || 0;
      const tax = (taxRate / 100) * subtotal;
      return sum + tax;
    }, 0);
  }

  goBack() {
    this.router.lastSuccessfulNavigation?.previousNavigation?.finalUrl
    ? this.router.navigateByUrl(this.router.lastSuccessfulNavigation.previousNavigation.finalUrl.toString())
    : this.router.navigate([this.navigationLink.getLink('checkoutOrderLink')]);
  }
  
  getTotalPrice(): number {
    const subtotal = this.getSubtotal();
    const totalTax = this.getTotalTax();
    const discount = this.navigationState.order.discount ?? 0;
    return subtotal + totalTax - discount;
  }
  
  reOpenCart() {
    const order = this.navigationState.order;
    const checkoutLink = this.navigationLink.getLink('checkoutLink');
    this.router.navigate([checkoutLink], { state: { order } });
  }

  formatDate(parts: any): Date {
    return new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
  }
  
  get changeAmount(): number {
    const tendered = this.navigationState?.order?.amountTendered ?? 0;
    const total = this.getTotalPrice(); 
    
    if (tendered > total) {
      return tendered - total;
    }
    return 0;
  }

  printReciept() {
    const content = document.getElementById('receipt-container')?.outerHTML;
    
    if (content) {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
  
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <html>
          <head>
            <title>Receipt</title>
            <style>
              @media print {
                @page { margin: 0; }
                body { margin: 0; padding: 0; }
                #receipt-container { width: 100%; }
              }
            </style>
          </head>
          <body>
            ${content}
          </body>
          </html>
        `);
        doc.close();
  
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }
    }
  }

  ngAfterViewInit() {
    JsBarcode("#barcode", this.navigationState.order.id, {
      format: "CODE128",
      displayValue: false, 
      width: 2,
      height: 40
    });
  }
}