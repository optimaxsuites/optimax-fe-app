import { Component } from '@angular/core';
import { ExpenseData } from '../../domain/expense.data';

@Component({
  selector: 'app-expense-forms-modal',
  templateUrl: './expense-forms-modal.component.html',
  styleUrl: './expense-forms-modal.component.scss',
})
export class ExpenseFormsModalComponent {
  expenseList: ExpenseData = {
    id: '',
    eTitle: '',
    eProduct: '',
  };
}
