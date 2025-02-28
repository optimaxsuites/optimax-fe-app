import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Cart, ProductData, VariantDTO } from '../../models/interface';

@Component({
  selector: 'app-product-card',
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
})
export class ProductCardComponent {
  //@ts-ignore
  @Input() product: ProductData;
  //@ts-ignore
  @Input() cartItems: ProductData[] | undefined;
  @Output() updateItem = new EventEmitter<number>();
  @Output() addToCart = new EventEmitter<string>();

  onAddToCart() {
    if (this.product.variants.length > 0) {
      // If the product has variants, open the modal and send the chosen variant's id
      this.updateItem.emit(this.product.id);
    } else {
      // Emit the chosen variant to the parent component
      this.addToCart.emit();
    }
  }
  get amountOfProductInCart() {
    return (
      this.cartItems?.find((item) => item.id === this.product.id)?.count ?? 0
    );
  }
}
