import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Cart, CustomerDTO, NavigationState } from '../../models/interface';
import { MessageService } from 'primeng/api';
import { NavigationLinksService } from '../../sharedComponent/service/navigation-links/navigation-links.service';
import { RandomTokenService } from '../../sharedComponent/service/random-token/random-token.service';
import { NavigationLinks } from '../../models/enums';
import JsBarcode from 'jsbarcode';
import { CustomerService } from '../../service/customer.service';

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
  paymentValues: { [key: string]: number|null } = {
    cash: null,
    card: null,
    loyalty: null,
  };
  customers: CustomerDTO[] = [
    { id: 1, name: "John Doe", phone: "08012345678", loyaltyPoints: 500 },
    { id: 2, name: "Jane Smith", phone: "08087654321", loyaltyPoints: 300 },
  ];
  customerSearch: string = "";  
  customerFound: CustomerDTO | null = null
  customerNotFound: boolean = false;
  showCreateCustomerModal: boolean = false;
  newCustomer: CustomerDTO = {
    id: 0,
    name: '',
    phone: '',
    email: '',
    loyaltyPoints: 0
  };
  
  constructor(
    private router: Router,
    public navigationLink: NavigationLinksService,
    private messageService: MessageService,
    private customerService: CustomerService,
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
    return (this.paymentValues['cash'] ?? 0) + 
         (this.paymentValues['card'] ?? 0) + 
         (this.paymentValues['loyalty'] ?? 0);

  }
  
  get balanceLeft() {
    return Math.max(0, this.cart.total - this.totalPaid);
  }
  getLoyaltyMax(mode: string): number | null {
    return mode === 'loyalty' && this.customerFound?.loyaltyPoints != null
      ? this.customerFound.loyaltyPoints
      : null;
  }
  
  getPriceOptions(method: string) {
    return [
      { label: 'Balance', value: this.balanceLeft },
      { label: '10000', value: 10000 },
      { label: '20000', value: 20000 },
    ];
  }
  getPaymentLabel(mode: string): string {
    const labels:{ [key: string]: string } = {
      cash: "Cash Tendered",
      card: "Amount Charged to Card",
      loyalty: "Loyalty Charge",
    };
    return labels[mode] || "Payment Amount";
  }

  findCustomer() {
    const customer = this.customers.find(c => c.phone === this.customerSearch);
    if (customer) {
      this.customerFound = customer;
      this.customerNotFound = false
      // this.paymentValues['loyalty'] = customer.loyaltyPoints || null;
    } else {
      this.customerFound = null;
      this.customerNotFound = true

      console.log("Customer not found!");
    }

  }


  openCreateCustomerModal(): void {
    this.showCreateCustomerModal = true;
    // Pre-fill phone number from search
    this.newCustomer = {
      id: 0,
      name: '',
      phone: this.customerSearch,
      email: '',
      loyaltyPoints: 0
    };
  }
  
  
  createCustomer(): void {
    if (!this.newCustomer.name || !this.newCustomer.phone) {
      // this.toastr.warning('Name and phone number are required');
      return;
    }
  
    this.customerService.createCustomer(this.newCustomer).subscribe(
      (customer) => {
        this.customerFound = customer;
        this.customerNotFound = false;
        this.showCreateCustomerModal = false;
        // this.toastr.success('Customer created successfully');
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Customer created successfully',
          key: 'tl',
          life: 3000,
        });

      },
      (error) => {
        // this.toastr.error('Failed to create customer');
        this.messageService.add({
          severity: 'warn',
          summary: 'Error',
          detail: 'Failed to create customer',
          key: 'tl',
          life: 3000,
        });
        console.error('Customer creation error:', error);
      }
    );
  }
  
  

  initializePriceOptions() {
    this.priceOptions = [
      { label: 'Exact', value: this.balanceLeft },
      { label: '100', value: 100 },
      { label: '200', value: 200 },
    ];
  }
  processCashPayment() {
    if (this.totalPaid < this.cart?.total) {
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



