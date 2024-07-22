import { Component } from '@angular/core';
import { ExpenseData } from '../../domain/expense.data';

@Component({
  selector: 'app-expense-forms-modal',
  templateUrl: './expense-forms-modal.component.html',
  styleUrl: './expense-forms-modal.component.scss',
})
export class ExpenseFormsModalComponent {
  checked: boolean = false;
  expenseList: ExpenseData = {
    id: '',
    eTitle: '',
    eProduct: '',
    eUnitPrice: 0,
    eQuantity: 0,
    eTaxes: 0,
    eEmployment: '',
    eCompany: '',
    employeeArray: [] || null,
    eDate: Date || '',
    eEmployee: '',
    eJournal: '',
    productArray: undefined,
    journalArray: undefined,
    taxesArray: undefined,
    eNote: '',
  };
}
