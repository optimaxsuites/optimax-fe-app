import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ImageCacheService {
  private cache = new Map<string, string>();

  constructor(private http: HttpClient) {}

  getImage(url: string): Observable<string> {
    if (this.cache.has(url)) {
      // Return the cached blob URL
      return of(this.cache.get(url)!);
    } else {
      // Fetch the image as a blob and convert it to an object URL
      return this.http.get(url, { responseType: 'blob' }).pipe(
        switchMap((blob) => {
          const objectUrl = URL.createObjectURL(blob);
          this.cache.set(url, objectUrl);
          return of(objectUrl);
        })
      );
    }
  }

  /**
   * This just serves memory cached image urls instead of refetching dat from the server repeatedly
   */
  async getImageAsync(url: string): Promise<string> {
    return await firstValueFrom(this.getImage(url));
  }
}
