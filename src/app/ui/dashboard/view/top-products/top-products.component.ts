import { Component, OnInit } from '@angular/core';
import { TopProductService } from '../../service/top-product/top-product.service';

@Component({
  selector: 'app-top-products',
  templateUrl: './top-products.component.html',
  styleUrls: ['./top-products.component.scss']
})
export class TopProductsComponent implements OnInit {
  tableData: any[] = [];
  isLoading = false;

  constructor(private topProductsService: TopProductService) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.topProductsService.getTopProducts(10).subscribe({
      next: (data) => {
        this.tableData = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }
}
