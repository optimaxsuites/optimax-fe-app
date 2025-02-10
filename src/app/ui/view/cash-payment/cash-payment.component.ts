import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Cart, NavigationState } from '../../models/interface';
import { MessageService } from 'primeng/api';
import { NavigationLinksService } from '../../sharedComponent/service/navigation-links/navigation-links.service';
import { RandomTokenService } from '../../sharedComponent/service/random-token/random-token.service';
import { NavigationLinks } from '../../models/enums';

@Component({
  selector: 'app-cash-payment',
  templateUrl: './cash-payment.component.html',
  styleUrl: './cash-payment.component.scss',
  providers: [MessageService],
})
export class CashPaymentComponent implements OnInit {
  navigationState: NavigationState;
  cart: Cart = {} as any; // It's going to be filled in ngOnInit
  priceOptions: any[] = [];
  priceValue = 0.0;
  orders: any;
  changeOffered: number = 0.0;
  changeOfferedModal: boolean = false;
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

    this.initializePriceOptions();
  }
  ngOnInit(): void {
    this.cart = this.navigationState?.cart;
  }

  initializePriceOptions() {
    this.priceOptions = [
      { label: 'Exact', value: this.cart?.total || 0 },
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
      this.router.navigate([checkoutLink], { state: { order } });
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
      id: this.randomTokenService.getRandomToken(),
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
}
