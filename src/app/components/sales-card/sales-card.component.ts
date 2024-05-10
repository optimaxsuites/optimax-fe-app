import { Component } from '@angular/core';
import { SalesCardService } from '../../services/sales-card/sales-card.service';


@Component({
  selector: 'app-sales-card',
  templateUrl: './sales-card.component.html',
  styleUrls: ['./sales-card.component.scss'],
  providers: [
    SalesCardService
  ]
})
export class SalesCardComponent {
  data: any[];

  constructor(private SalesCardService: SalesCardService) {
    this.data = [];
  }

  ngOnInit(): void {
    this.data = this.SalesCardService.initializeSalesCard();
  }
}
