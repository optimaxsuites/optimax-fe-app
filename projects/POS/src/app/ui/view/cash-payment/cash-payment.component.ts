import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Cart, NavigationState } from '../../models/interface';
import { MessageService } from 'primeng/api';
import { NavigationLinksService } from '../../sharedComponent/service/navigation-links/navigation-links.service';
import { RandomTokenService } from '../../sharedComponent/service/random-token/random-token.service';
import { NavigationLinks } from '../../models/enums';
import JsBarcode from 'jsbarcode';

@Component({
  selector: 'app-cash-payment',
  templateUrl: './cash-payment.component.html',
  styleUrl: './cash-payment.component.scss',
  providers: [MessageService],
})
export class CashPaymentComponent implements OnInit {
  navigationState: NavigationState;
  cart: Cart = {} as any;
  priceOptions: any[] = [];
  priceValue = 0.0;
  orders: any;
  changeOffered: number = 0.0;
  changeOfferedModal: boolean = false;
  receiptID: string = Math.floor(100000 + Math.random() * 900000).toString();
  token: string = ''
  paymentValues = {
    cash: 0,
    card: 0,
    loyalty: 0
  };
  
  constructor(
    private router: Router,
    public navigationLink: NavigationLinksService,
    private messageService: MessageService,
    private randomTokenService: RandomTokenService
  ) {
    const navigation = this.router.getCurrentNavigation();
    this.navigationState = navigation?.extras.state as NavigationState;
    if (!this.navigationState) {
      const savedState = localStorage.getItem('navigationState');
      if (savedState) {
        this.navigationState = JSON.parse(savedState);
      }
    } else {
      localStorage.setItem(
        'navigationState',
        JSON.stringify(this.navigationState)
      );
    }
  }
  ngOnInit(): void {
    this.cart = this.navigationState?.cart;
    this.initializePriceOptions();
    this.token = this.randomTokenService.getRandomToken()
  }
  get totalPaid() {
    return this.paymentValues.cash + this.paymentValues.card + this.paymentValues.loyalty;
  }
  
  get balanceLeft() {
    return Math.max(0, this.cart.total - this.totalPaid);
  }
  
  getPriceOptions(method: string) {
    return [
      { label: 'Exact', value: this.balanceLeft },
      { label: '100', value: 100 },
      { label: '200', value: 200 },
    ];
  }

  // selectPrice(method: string, value: number) {
  //   this.priceValues[method] = value;
  //   this.paymentValues[method] = value;
  // }
  

  initializePriceOptions() {
    this.priceOptions = [
      { label: 'Exact', value: this.balanceLeft },
      { label: '100', value: 100 },
      { label: '200', value: 200 },
    ];
  }
  processCashPayment() {
    if (this.priceValue < this.cart?.total) {
      console.log(this.priceValue);
      this.messageService.add({
        severity: 'warn',
        summary: 'Error',
        detail: 'Wrong amount tendered',
        key: 'tl',
        life: 3000,
      });
    } else {
      this.saveCurrentCartItem();
      const order: any[] = [];
      const checkoutLink = this.navigationLink.getLink('checkoutLink');
      this.router.navigate([checkoutLink]);
      this.printReceipt();
    }
  }

  saveCurrentCartItem() {
    const paidCart = {
      name: 'fulfilled',
      cart: this.cart?.cartItems.map((item) => ({ ...item })),
      cartDiscount: this.cart?.discount,
      tax: this.cart?.tax,
      subtotal: this.cart?.subtotal,
      state: 'Paid',
      total: this.cart?.total,
      paymentMethod: 'cash',
      priceTender: this.priceValue,
      changeOffered: this.priceValue - this.cart?.total,
      id: this.token,
      timestamp: new Date().toLocaleString(),
    };
    const savedItems = localStorage.getItem('savedItems');
    this.orders = savedItems ? JSON.parse(savedItems) : [];

    this.orders.push(paidCart);
    localStorage.setItem('savedItems', JSON.stringify(this.orders));
  }

  navigateBackToCheckout() {
    const checkoutLink = this.navigationLink.getLink(NavigationLinks.CHECKOUT);
    const cart = this.cart;
    this.router.navigate([checkoutLink], { state: { cart } });
  }

  get approximateCartTotal() {
    return Math.round(this.cart?.total * 100) / 100;
  }

  printReceipt() {
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
                body { margin: 0; font-size: 14px; }
                #receipt-container { width: 100%; }
              }
            </style>
          </head>
          <body onload="window.print();">
            ${content}
          </body>
          </html>
        `);
        doc.close();
      }

      setTimeout(() => document.body.removeChild(iframe), 5000);
    }
  }

  ngAfterViewInit() {
    JsBarcode('#barcode', this.token, {
      format: 'CODE128',
      displayValue: false,
      width: 2,
      height: 40,
    });
  }
}
