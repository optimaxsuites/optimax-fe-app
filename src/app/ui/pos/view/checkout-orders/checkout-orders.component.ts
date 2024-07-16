import { Component, Input } from '@angular/core';
import { Order, Product } from '../../models/interface';
import { Router } from '@angular/router';
import { NavigationLinksService } from 'src/app/ui/shared/service/navigation-links/navigation-links.service';

@Component({
  selector: 'app-checkout-orders',
  templateUrl: './checkout-orders.component.html',
  styleUrl: './checkout-orders.component.scss'
})
export class CheckoutOrdersComponent {

  orders: Order[] = []
  userInfoRegData: any[] = [];
  userRegData: any = { };
  selectedOrder!: Order;
  
  constructor(
    private router: Router,
   public navigationLink: NavigationLinksService
  ){}

  ngOnInit() {
    this.loadSavedItems();
    this.userInfoRegData = JSON.parse(sessionStorage["userRegData"]);
    this.userRegData = this.userInfoRegData;
  }

  loadSavedItems() {
    const savedItems = localStorage.getItem('savedItems');
    if (savedItems) {
      this.orders = JSON.parse(savedItems);
    }
  }

 

  handleAction(order: Order) {
    console.log('Action for order:', order);
  }

  reOpenCart(order: Order) {
    this.selectedOrder = order;
    const checkoutLink = this.navigationLink.getLink("checkoutLink")
    this.router.navigate([checkoutLink], { state: { order } });
  } 
}
