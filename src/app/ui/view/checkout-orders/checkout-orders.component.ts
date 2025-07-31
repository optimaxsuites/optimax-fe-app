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
  groupedOrders: { month: string; orders: Order[] }[] = [];
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
    this.userInfoRegData = JSON.parse(sessionStorage['userRegData']);
    this.userRegData = this.userInfoRegData;
    console.log(this.orders)

  }

  loadSavedItems() {
    this.metadataService.orders$.subscribe(data => {
      console.log('RAW ORDERS FROM SERVICE:', JSON.stringify(data, null, 2));
      this.orders = [...data];
      this.sortOrdersByDate();
      this.orders = this.orders.filter(order => order.orderStatus !== 'PAID');
      this.groupOrdersByMonth();
    });
  }

  sortOrdersByDate() {
    this.orders.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  formatDate(parts: any): Date | null {
    if (!parts) {
      return null;
    }
    // Handle array format e.g., [2024, 7, 21, 13, 27, 34]
    if (Array.isArray(parts)) {
      return new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
    }
    // Handle string or Date object
    if (typeof parts === 'string' || parts instanceof Date) {
      const d = new Date(parts);
      // Check if the created date is valid
      return isNaN(d.getTime()) ? null : d;
    }
    return null; // Fallback for any other unexpected format
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
    console.log(order)
    const detailsLink = this.navigationLink.getLink('orderDetails');
    this.router.navigate([detailsLink], { state: { order } });
  }
  closeRegister() {
    this.registerService.triggerCloseRegister();
  }

  groupOrdersByMonth() {
    const groups: { [key: string]: Order[] } = {};
    this.orders.forEach(order => {
      const date = this.formatDate(order.updatedAt);
      if (date) {
        const month = date.toLocaleString('default', { month: 'long' });
        const year = date.getFullYear();
        const key = `${month} ${year}`;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(order);
      }
    });
    // Sort months descending (most recent first)
    this.groupedOrders = Object.entries(groups)
      .map(([month, orders]) => ({ month, orders }))
      .sort((a, b) => {
        const [aMonth, aYear] = a.month.split(' ');
        const [bMonth, bYear] = b.month.split(' ');
        const aDate = new Date(`${aMonth} 1, ${aYear}`);
        const bDate = new Date(`${bMonth} 1, ${bYear}`);
        return bDate.getTime() - aDate.getTime();
      });
  }
}
