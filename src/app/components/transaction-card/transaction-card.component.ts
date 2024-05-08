import { Component } from '@angular/core';
import { TransactionCardService } from '../../services/transaction-card/transaction-card.service';

@Component({
  selector: 'app-transaction-card',
  templateUrl: './transaction-card.component.html',
  styleUrls: ['./transaction-card.component.scss'],
  providers: [
    TransactionCardService
  ]
})
export class TransactionCardComponent {
  titles: string[] = [];
  times: string[] = [];
  contents: string[] = [];

  constructor(private transactionCardServices: TransactionCardService) {}

  ngOnInit(): void {
    const transactionData = this.transactionCardServices.initializeTransactionCard();
    this.titles = [transactionData.title1, transactionData.title2, transactionData.title3];
    this.times = [transactionData.time1, transactionData.time2, transactionData.time3];
    this.contents = [transactionData.content1, transactionData.content2, transactionData.content3];

  }
}
