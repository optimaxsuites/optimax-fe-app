import { Component, Input } from '@angular/core';
import { Order, ProductJSONFormat } from '../../models/interface';
import { Router } from '@angular/router';
import { RegisterService } from '../../service/register.service';
import { NavigationLinksService } from '../../sharedComponent/service/navigation-links/navigation-links.service';
import { MetadataService } from '../../service/metadata.service';

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
    private registerService: RegisterService,
    private metadataService: MetadataService
  ) {}

  ngOnInit() {
    this.metadataService.fetchMetaData()
    this.loadSavedItems();
    this.sortOrdersByTimestamp();
    this.userInfoRegData = JSON.parse(sessionStorage['userRegData']);
    this.userRegData = this.userInfoRegData;
    console.log(this.orders)

  }

  loadSavedItems() {
    this.metadataService.orders$.subscribe(data => {
      this.orders = [...data]
      console.log(this.orders)

    })
    // const savedItems = localStorage.getItem('savedItems');
    // if (savedItems) {
    //   this.orders = JSON.parse(savedItems);
    // }
  }

  sortOrdersByTimestamp() {
    this.orders.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  formatDate(parts: any): Date {
    // const parts = raw.split(',').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
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
    const detailsLink = this.navigationLink.getLink('orderDetails');
    this.router.navigate([detailsLink], { state: { order } });
  }
  closeRegister() {
    this.registerService.triggerCloseRegister();
  }
}
