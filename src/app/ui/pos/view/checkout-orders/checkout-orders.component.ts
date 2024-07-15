import { Component, Input } from '@angular/core';
import { Order } from '../../models/interface';

@Component({
  selector: 'app-checkout-orders',
  templateUrl: './checkout-orders.component.html',
  styleUrl: './checkout-orders.component.scss'
})
export class CheckoutOrdersComponent {
  orders: Order[] = []

  ngOnInit() {
    this.loadSavedItems();
  }

  loadSavedItems() {
    const savedItems = localStorage.getItem('savedItems');
    if (savedItems) {
      this.orders = JSON.parse(savedItems);
    }
  }

}
