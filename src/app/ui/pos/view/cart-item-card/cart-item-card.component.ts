import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-cart-item-card',
  templateUrl: './cart-item-card.component.html',
  styleUrl: './cart-item-card.component.scss'
})
export class CartItemCardComponent {
  @Input() delete!: () => void;
 count = 1
 price = 100

  decreaseCount() {
  this.count--
 }
 increaseCount() {
  this.count++
 }
}
