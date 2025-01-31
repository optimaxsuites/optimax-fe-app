import { Component, Input } from '@angular/core';
import { Order, ProductJSONFormat } from '../../models/interface';
import { Router } from '@angular/router';
import { RegisterService } from '../../service/register.service';
import { NavigationLinksService } from '../../sharedComponent/service/navigation-links/navigation-links.service';

@Component({
  selector: 'app-checkout-orders',
  templateUrl: './checkout-orders.component.html',
  styleUrl: './checkout-orders.component.scss',
})
export class CheckoutOrdersComponent {
  orders: Order[] = [];
  userInfoRegData: any[] = [];
  userRegData: any = {};
  selectedOrder!: Order;

  constructor(
    private router: Router,
    public navigationLink: NavigationLinksService,
    private registerService: RegisterService
  ) {}

  ngOnInit() {
    this.loadSavedItems();
    this.sortOrdersByTimestamp();
    this.userInfoRegData = JSON.parse(sessionStorage['userRegData']);
    this.userRegData = this.userInfoRegData;
  }

  loadSavedItems() {
    const savedItems = localStorage.getItem('savedItems');
    if (savedItems) {
      this.orders = JSON.parse(savedItems);
    }
  }

  sortOrdersByTimestamp() {
    this.orders.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  handleAction(order: Order) {
    console.log('Action for order:', order);
  }

  reOpenCart(order: Order) {
    this.selectedOrder = order;
    const checkoutLink = this.navigationLink.getLink('checkoutLink');
    this.router.navigate([checkoutLink], { state: { order } });
  }

  orderDetails(order: Order) {
    this.selectedOrder = order;
    const checkoutLink = this.navigationLink.getLink('orderDetails');
    this.router.navigate([checkoutLink], { state: { order } });
  }
  closeRegister() {
    this.registerService.triggerCloseRegister();
  }
}
