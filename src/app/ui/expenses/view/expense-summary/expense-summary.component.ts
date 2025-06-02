import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-expense-summary',
  templateUrl: './expense-summary.component.html',
  styleUrls: ['./expense-summary.component.scss']
})
export class ExpenseSummaryComponent {
  expenseSummary: any;

  constructor(private router: Router) {
    const navigation = this.router.getCurrentNavigation();
    this.expenseSummary = navigation?.extras?.state?.['expenseSummary'];
  }
}
