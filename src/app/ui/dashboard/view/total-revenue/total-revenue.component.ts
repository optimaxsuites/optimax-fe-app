import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';

@Component({
  selector: 'app-total-revenue',
  templateUrl: './total-revenue.component.html',
  styleUrls: ['./total-revenue.component.scss']
})
export class TotalRevenueComponent implements OnInit {
  displayRevenue = '...';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const url = (environment as any).apiBaseUrl + '/x/api/v2/commerce/dashboard/sales-summary';
    this.http.get<any>(url).subscribe({
      next: (s) => { this.displayRevenue = this.format(s.totalRevenue); },
      error: () => { this.displayRevenue = '—'; }
    });
  }

  private format(value: number): string {
    if (!value) return '₦0';
    if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `₦${(value / 1_000).toFixed(1)}k`;
    return `₦${value}`;
  }
}
