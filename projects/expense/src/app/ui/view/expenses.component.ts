import { Component } from '@angular/core';

@Component({
  selector: 'app-expenses',
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.scss'
})
export class ExpensesComponent {
  selectedTabIndex = 0;

  onTabChange(index: number) {
    this.selectedTabIndex = index;
  
    if (index === 0) {
      this.onExpensesTabSelected();
    } else if (index === 1) {
      this.onApprovalReportsTabSelected();
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
  
}
