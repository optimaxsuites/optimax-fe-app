import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-expenses',
  templateUrl: './expenses.component.html',
  styleUrls: ['./expenses.component.scss']
})
export class ExpensesComponent {
  selectedTabIndex: number = 0;
  selectedTab: 'expenses' | 'reports' | 'reimbursement' | 'disbursement' = 'expenses';

  onTabChange(index: number) {
    this.selectedTabIndex = index;

    switch(index) {
      case 0:
        this.selectedTab = 'expenses';
        this.onExpensesTabSelected();
        break;
      case 1:
        this.selectedTab = 'reports';
        this.onApprovalReportsTabSelected();
        break;
      case 2:
        this.selectedTab = 'reimbursement';
        this.onReimbursementTabSelected();
        break;
      case 3:
        this.selectedTab = 'disbursement';
        this.onDisbursementTabSelected();
        break;
    }
  }

  onExpensesTabSelected() {
    console.log('Expenses tab selected');
    // load or reset something if needed
  }

  onApprovalReportsTabSelected() {
    console.log('Approval Reports tab selected');
    // call function to load reports etc.
  }

  onReimbursementTabSelected() {
    console.log('Reimbursement tab selected');
    // load or handle reimbursement tab actions
  }

  onDisbursementTabSelected() {
    console.log('Disbursement tab selected');
    // load or handle disbursement tab actions
  }
}
