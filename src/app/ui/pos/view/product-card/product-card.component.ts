import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-product-card',
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss'
})
export class ProductCardComponent {
  @Input() product: any;
  @Output() addToCart = new EventEmitter<void>();
  onAddToCart() {
    this.addToCart.emit();
  }
}
