import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class TopProductService {
  private baseUrl = (environment as any).apiBaseUrl + '/x/api/v2/commerce/dashboard';

  constructor(private http: HttpClient) {}

  getTopProducts(limit = 10): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/top-products?limit=${limit}`);
  }

  initializeTopProduct(): any[] {
    return [];
  }
}
