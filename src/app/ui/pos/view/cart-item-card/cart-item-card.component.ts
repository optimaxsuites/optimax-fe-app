import { Component } from '@angular/core';

@Component({
  selector: 'app-cart-item-card',
  templateUrl: './cart-item-card.component.html',
  styleUrl: './cart-item-card.component.scss'
})
export class CartItemCardComponent {
 count = 0

  decreaseCount() {
  this.count--
 }
 increaseCount() {
  this.count++
 }
}
