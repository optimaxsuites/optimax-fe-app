import { Component,OnInit, EventEmitter, Input, Output } from '@angular/core';
import { Cart, ProductData, VariantDTO } from '../../models/interface';
import { ImageCacheService } from '../../service/image-cache.service';

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
  @Input() isOutOfStock: boolean = false; // This line is correct and necessary
  @Output() updateItem = new EventEmitter<number>();
  @Output() addToCart = new EventEmitter<string>();

  imageUrl!: string;
  constructor(private imageCacheService: ImageCacheService) {}

  ngOnInit(): void {
    const remoteImageUrl = `https://be.optimaxsuites.com/x/api/v2/pos/products/images/${this.product.productImages[0].imgNo}`;
    this.imageCacheService.getImage(remoteImageUrl).subscribe((url) => {
      this.imageUrl = url;
    });
  }

  onAddToCart() {
    // Note: The logic to prevent adding out-of-stock items is in the parent component (pos-checkout-page.component.ts)
    // but the card should only respond to a click if it's NOT out of stock.
    if (this.isOutOfStock) {
        return; 
    }
    
    if (this.product.variants.length > 0) {
      // If the product has variants, open the modal and send the chosen variant's id
      this.updateItem.emit(this.product.id);
    } else {
      // Emit the chosen variant to the parent component
      this.addToCart.emit();
    }
  }
  get amountOfProductInCart() {
    const cartItem = this.cartItems?.find(
      (item) => item.id === this.product.id
    );
    if (!cartItem) return 0;
    const selectedVariantsQuantity = cartItem.selectedVariants?.length
      ? cartItem.selectedVariants.reduce(
          (sum, variant) => sum + (variant.selectedQuantity ?? 0),
          0
        )
      : 0;
    return (cartItem.count ?? 0) + selectedVariantsQuantity;
  }
}