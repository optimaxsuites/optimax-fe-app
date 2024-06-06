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
  rfqData: any[] = [];
  constructor(private router: Router, private rfqDataService: DataService) {}

  editRFQ(id: any): void {
    console.log('RFQ ID:', id);
    this.router.navigate(['/purchase/rfq-modal', { rfqId: id }]);
    // this.router.navigate(['/rfq-modal']);
  }

  ngOnInit(): void {
    this.rfqData = JSON.parse(localStorage.getItem('rfqData') || '[]');
  }
}
