import { Component, OnInit } from '@angular/core';
import { TopProductService } from '../../services/top-product/top-product.service';
import { DataService } from '../../data.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-rfq',
  templateUrl: './rfq.component.html',
  styleUrl: './rfq.component.scss',
  providers: [TopProductService],
})
export class RfqComponent implements OnInit {
  savedRfqData: any;
  rfqList: any[] = [];

  constructor(
    private router: Router,
    private rfqDataService: DataService
  ) {}

  ngOnInit(): void {
    this.loadRfqList();
    this.rfqDataService.currentRfqData.subscribe((rfqData) => {
      if (rfqData) {
        this.savedRfqData = rfqData;
      }
    });
  }

  loadRfqList(): void {
    this.rfqList = this.rfqDataService.getRfqList();
  }

  navigateToRfqModal(rfqId: number): void {
    this.router.navigate(['/purchase/rfq-modal', rfqId]);
  }

  duplicateRfq(index: number): void {
    const rfqToDuplicate = this.rfqList[index];
    const clonedRfq = { ...rfqToDuplicate };
    this.rfqList.push(clonedRfq);

    this.rfqDataService.updateRfqList();
  }

  deleteRfq(index: number): void {
    if (confirm('Are you sure you want to delete this RFQ?')) {
      this.rfqList.splice(index, 1); // Remove RFQ data from the list
      this.rfqDataService.updateRfqList(); // Save updated RFQ list
    }
  }
}
