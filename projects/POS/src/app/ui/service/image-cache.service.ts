import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ProductData } from '../models/interface';

@Injectable({
  providedIn: 'root',
})
/** Since product iages are sent witht he no-store attribute :p */
export class ImageCacheService {
  private _cache = new Map<string, string>();

  constructor(private http: HttpClient) {}

  getImage(url: string): Observable<string> {
    if (this._cache.has(url)) {
      // Return the cached blob URL
      return of(this._cache.get(url)!);
    } else {
      // Fetch the image as a blob and convert it to an object URL
      return this.http.get(url, { responseType: 'blob' }).pipe(
        switchMap((blob) => {
          const objectUrl = URL.createObjectURL(blob);
          this._cache.set(url, objectUrl);
          return of(objectUrl);
        })
      );
    }
  }

  /**
   * This just serves memory cached image urls instead of refetching data from the server repeatedly
   */
  async getImageAsync(url: string): Promise<string> {
    return await firstValueFrom(this.getImage(url));
  }

  getProductImage(product:ProductData) {
    return this.getImage(`https://be.optimaxsuites.com/x/api/v2/pos/products/images/${product.productImages[0].imgNo}`)
  }
}
