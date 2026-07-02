import { Injectable } from '@angular/core';
import { ProductData, ProductImageDTO } from '../models/interface';

@Injectable({
  providedIn: 'root',
})
export class OptimizedImageService {
  private readonly placeholderImage = 'assets/placeholder-product.jpg';
  private readonly baseUrl = 'https://be.optimaxsuites.com/x/api/v2/pos/products/images/';

  constructor() {}

  /**
   * Returns the direct URL for the product image.
   * This allows the browser to handle caching natively and avoids
   * the overhead of manually downloading Blobs.
   */
  getProductImage(product: ProductData): string {
    if (!product.productImages || !product.productImages.length || !product.productImages[0]?.imgNo) {
      return this.placeholderImage;
    }

    return `${this.baseUrl}${product.productImages[0].imgNo}`;
  }

  /**
   * Returns the URL for a specific image index
   */
  getProductImageByIndex(product: ProductData, index: number = 0): string {
    if (!product.productImages || 
        !product.productImages.length || 
        !product.productImages[index]?.imgNo) {
      return this.placeholderImage;
    }

    return `${this.baseUrl}${product.productImages[index].imgNo}`;
  }

  getImageUrlFromDTO(image: ProductImageDTO): string {
    if (!image?.imgNo) {
      return this.placeholderImage;
    }
    return `${this.baseUrl}${image.imgNo}`;
  }
}
