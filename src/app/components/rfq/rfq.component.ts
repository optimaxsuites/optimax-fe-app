import { Component } from '@angular/core';
import { TopProductService } from '../../services/top-product/top-product.service';

@Component({
  selector: 'app-rfq',
  templateUrl: './rfq.component.html',
  styleUrl: './rfq.component.scss',
  providers: [TopProductService],
})
export class RfqComponent {
  savedRfqData: any;
  tableData: any[];
  rfqModalComponent: any;

  constructor(private topProductsService: TopProductService) {
    this.tableData = [];
  }

  ngOnInit(): void {
    this.tableData = this.topProductsService.initializeTopProduct();
  }

  ngAfterViewInit() {
    if (this.rfqModalComponent) {
      this.rfqModalComponent.rfqDataSaved.subscribe((data: any) => {
        this.savedRfqData = data;
      });
    }
  }
}
