import { Component, OnInit } from '@angular/core';
import { TopProductService } from '../../services/top-product/top-product.service';
import { DataService } from '../../data.service';

@Component({
  selector: 'app-rfq',
  templateUrl: './rfq.component.html',
  styleUrl: './rfq.component.scss',
  providers: [TopProductService],
})
export class RfqComponent implements OnInit {
  savedRfqData: any;
  tableData: any[];

  constructor(
    private topProductsService: TopProductService,
    private rfqDataService: DataService
  ) {
    this.tableData = [];
  }



  ngOnInit(): void {
    this.tableData = this.topProductsService.initializeTopProduct();
    this.rfqDataService.currentRfqData.subscribe((data) => {
      if (data) {
        this.savedRfqData = data;
      }
    });
  }
}
