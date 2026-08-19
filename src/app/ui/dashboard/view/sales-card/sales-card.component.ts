import { Component, OnInit } from '@angular/core';
import { SalesCardService } from '../../service/sales-card/sales-card.service';

@Component({
  selector: 'app-sales-card',
  templateUrl: './sales-card.component.html',
  styleUrls: ['./sales-card.component.scss']
})
export class SalesCardComponent implements OnInit {
  data: any[] = [];

  constructor(private salesCardService: SalesCardService) {}

  ngOnInit(): void {
    this.salesCardService.getSalesSummary().subscribe({
      next: (cards) => { this.data = cards; },
      error: () => {
        this.data = [
          { salesno: '—', title: 'Orders',   icon: 'fas fa-shopping-bag' },
          { salesno: '—', title: 'Invoices', icon: 'fas fa-wallet' },
          { salesno: '—', title: 'Products', icon: 'fas fa-boxes' },
          { salesno: '—', title: 'Revenue',  icon: 'fas fa-chart-line' },
        ];
      }
    });
  }
}
