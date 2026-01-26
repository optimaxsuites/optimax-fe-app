import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { ProductData, ProductImageDTO } from '../models/interface';

@Injectable({
  providedIn: 'root',
})
export class ImageCacheService {
  private _cache = new Map<string, string>();
  private readonly placeholderImage = 'assets/placeholder-product.jpg'; 
  private readonly baseUrl = 'https://be.optimaxsuites.com/x/api/v2/pos/products/images/';

  constructor(private http: HttpClient) {}

  getImage(url: string): Observable<string> {
    if (this._cache.has(url)) {
      return of(this._cache.get(url)!);
    } else {
      return this.http.get(url, { responseType: 'blob' }).pipe(
        switchMap((blob) => {
          const objectUrl = URL.createObjectURL(blob);
          this._cache.set(url, objectUrl);
          return of(objectUrl);
        }),
        catchError((error) => {
          console.error('Error loading image:', error);
          return of(this.placeholderImage);
        })
      );
    }
  }

  async getImageAsync(url: string): Promise<string> {
    return await firstValueFrom(this.getImage(url));
  }

  getProductImage(product: ProductData): Observable<string> {
    if (!product.productImages || !product.productImages.length || !product.productImages[0]?.imgNo) {
      return of(this.placeholderImage);
    }
    
    const imageUrl = `${this.baseUrl}${product.productImages[0].imgNo}`;
    return this.getImage(imageUrl);
  }

  // Get specific product image by index
  getProductImageByIndex(product: ProductData, index: number = 0): Observable<string> {
    if (!product.productImages || 
        !product.productImages.length || 
        !product.productImages[index]?.imgNo) {
      return of(this.placeholderImage);
    }
    
    const imageUrl = `${this.baseUrl}${product.productImages[index].imgNo}`;
    return this.getImage(imageUrl);
  }

  // Simple preload method
  preloadProductImages(product: ProductData): void {
    if (product?.productImages) {
      product.productImages.forEach((image: ProductImageDTO) => {
        if (image.imgNo) {
          const imageUrl = `${this.baseUrl}${image.imgNo}`;
          const img = new Image();
          img.src = imageUrl;
        }
      });
    }
  }

  preloadRelatedProductsImages(products: ProductData[]): void {
    products.forEach(product => this.preloadProductImages(product));
  }

  getImageUrlFromDTO(image: ProductImageDTO): string {
    if (!image?.imgNo) {
      return this.placeholderImage;
    }
    return `${this.baseUrl}${image.imgNo}`;
  }

  // Clear cache if needed (useful for memory management)
  clearCache(): void {
    this._cache.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    this._cache.clear();
  }

  // Get cache size for debugging
  getCacheSize(): number {
    return this._cache.size;
  }
}