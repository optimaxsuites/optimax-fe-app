import { Component } from '@angular/core';

@Component({
  selector: 'app-pos-checkout-page',
  templateUrl: './pos-checkout-page.component.html',
  styleUrl: './pos-checkout-page.component.scss'
})
export class PosCheckoutPageComponent {

  products = Array(10).fill(null); 

  cartItems = Array<any>(); 

  addToCart(product: any) {
    this.cartItems.push(product); 
  }
}
