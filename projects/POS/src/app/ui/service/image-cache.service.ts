import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { ProductData } from '../models/interface';

@Injectable({
  providedIn: 'root',
})
export class ImageCacheService {
  private _cache = new Map<string, string>();
  private readonly placeholderImage = 'assets/placeholder-product.jpg';

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
    // Check if product has images and the first image exists with imgNo
    if (!product.productImages || 
        !product.productImages.length || 
        !product.productImages[0]?.imgNo) {
      return of(this.placeholderImage);
    }
    
    const imageUrl = `https://be.optimaxsuites.com/x/api/v2/pos/products/images/${product.productImages[0].imgNo}`;
    return this.getImage(imageUrl);
  }
}