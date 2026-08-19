import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class SalesCardService {
  private baseUrl = (environment as any).apiBaseUrl + '/x/api/v2/commerce/dashboard';

  constructor(private http: HttpClient) {}

  getSalesSummary(): Observable<{ salesno: string; title: string; icon: string }[]> {
    return this.http.get<any>(`${this.baseUrl}/sales-summary`).pipe(
      map(s => [
        { salesno: String(s.totalOrders ?? 0),    title: 'Orders',   icon: 'fas fa-shopping-bag' },
        { salesno: String(s.totalInvoices ?? 0),  title: 'Invoices', icon: 'fas fa-wallet' },
        { salesno: String(s.activeProducts ?? 0), title: 'Products', icon: 'fas fa-boxes' },
        { salesno: this.formatCurrency(s.totalRevenue), title: 'Revenue', icon: 'fas fa-chart-line' },
      ])
    );
  }

  private formatCurrency(value: number): string {
    if (!value) return '₦0';
    if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `₦${(value / 1_000).toFixed(1)}k`;
    return `₦${value}`;
  }
}
