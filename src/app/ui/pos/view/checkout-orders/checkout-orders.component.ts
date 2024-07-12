import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-checkout-orders',
  templateUrl: './checkout-orders.component.html',
  styleUrl: './checkout-orders.component.scss'
})
export class CheckoutOrdersComponent {
  @Input() orders: any ;

}
