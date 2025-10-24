import { Component } from '@angular/core';
import { Navigation, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Cart, NavigationState } from '../../models/interface';
import { NavigationLinksService } from '../../sharedComponent/service/navigation-links/navigation-links.service';
import JsBarcode from 'jsbarcode';
import { BehaviorSubject, take } from 'rxjs';
@Component({
  selector: 'app-order-detail',
  templateUrl: './order-detail.component.html',
  styleUrl: './order-detail.component.scss',
})
export class OrderDetailComponent {
  navigationState: NavigationState;
  // receiptID: string = Math.floor(100000 + Math.random() * 900000).toString(); 
  public userPrimaryInfoRegData: any; 
  public shopName: string = '';
  public cashierName: string = '';
  public shopAddress: string = '';
  public industry: string = '';
  
  constructor(
    private router: Router,
    public navigationLink: NavigationLinksService
  ) //  private messageService: MessageService
  {
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
    console.log(this.navigationState)
    // this.buildCartFromOrders(this.navigationState.order)
    // console.log(this.navigationState)
    
  }
 ngOnInit() {
    this.fetchUserInfo();
  }

  // order-detail.component.ts

  fetchUserInfo() {
    const userDataString = sessionStorage.getItem('userBranchInfoRegData'); 
    
    if (userDataString) {
      this.userPrimaryInfoRegData = JSON.parse(userDataString);
      
      // Shop Name (ClientType as requested)
      this.shopName = this.userPrimaryInfoRegData.clientType || 'POS System';
      
      // Shop Address (Combining address, city, state)
      this.shopAddress = (this.userPrimaryInfoRegData.address || '') + 
                         (this.userPrimaryInfoRegData.city ? ', ' + this.userPrimaryInfoRegData.city : '') +
                         (this.userPrimaryInfoRegData.state ? ', ' + this.userPrimaryInfoRegData.state : '');
      
      // Cashier Name (from nested 'user' object)
      this.cashierName = this.userPrimaryInfoRegData.user?.username || 'Cashier';
    }
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

  goBack(){
    this.router.lastSuccessfulNavigation?.previousNavigation?.finalUrl
    ? this.router.navigateByUrl(this.router.lastSuccessfulNavigation.previousNavigation.finalUrl.toString())
    : this.router.navigate([this.navigationLink.getLink('checkoutOrderLink')]);
  }
  
  getTotalPrice(): number {
    return this.getSubtotal() + this.getTotalTax();
  }
  
  buildCartFromOrders(orders: any): any {
    const groupedCartItems: any[] = [];
  
    orders.orderItem.forEach((item: any) => {
      if (!item.productVariant) {
        // Only match variants with the same product.id
        const variants = orders.orderItem.filter((v: any) =>
          v.productVariant &&
          item.product &&
          v.product.id === item.product.id
        );
    
        const selectedVariants = variants.map((v: any) => ({
          ...v.productVariant,
          selectedQuantity: v.count,
        }));
    
        const variantTotal = selectedVariants.reduce(
          (sum: number, variant: any) => sum + (variant.price * variant.selectedQuantity),
          0
        );
    
        const itemTotal = parseFloat(item.sellingPrice) * item.count;
        const cartPriceTotal = itemTotal + variantTotal;
    
        groupedCartItems.push({
          ...item,
          selectedVariants,
          cartPriceTotal: cartPriceTotal.toString(),
        });
      }
    });
    
    // Declare the paymentMethods variable before using it
    const paymentMethods = this.navigationState.order.payment?.paymentBreakdown?.map((payment: any) => payment.paymentMethod) || [];

    const subtotal = groupedCartItems.reduce(
      (sum, item) => sum + parseFloat(item.cartPriceTotal),
      0
    );
  
    const taxRate = 0.1; // example: 10%
    const tax = subtotal * taxRate;
    const discount = 0;
    const total = subtotal + tax;
  
    this.navigationState.order = 
{
  ...this.navigationState.order,
  cart: groupedCartItems,
  discount,
  paymentModes: paymentMethods, 
  subtotal,
  tax,
  total
} as any

    console.log( this.navigationState.order.cart)
  }
  
  reOpenCart() {
    const order = this.navigationState.order;
    const checkoutLink = this.navigationLink.getLink('checkoutLink');
    this.router.navigate([checkoutLink], { state: { order } });
  }


  formatDate(parts: any): Date {
    // const parts = raw.split(',').map(Number);
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
  JsBarcode("#barcode", this.navigationState.order.orderNumber, {
    format: "CODE128",
    displayValue: false, 
    width: 2,
    height: 40
  });
}

}