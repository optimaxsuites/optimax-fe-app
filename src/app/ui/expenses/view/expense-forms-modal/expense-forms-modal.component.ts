import { Component } from '@angular/core';
import { ExpenseData } from '../../domain/expense.data';

@Component({
  selector: 'app-expense-forms-modal',
  templateUrl: './expense-forms-modal.component.html',
  styleUrl: './expense-forms-modal.component.scss',
})
export class ExpenseFormsModalComponent {
  currentStage: string = 'to-submit'; // Initial stage
  showModal: boolean = false; // Modal visibility control

  // Object to store form summary data
  expenseSummary = {
    amount: '',
    merchant: '',
    expenseDate: '',
    category: '',
    taxRate: '',
    taxPercentage: '',
    taxAmount: '',
    payMethod: '',
    project: '',
    comments: ''
  };

  // Method to set the current stage of the form
  setStage(stage: string) {
    this.currentStage = stage;
  }

  // Method to proceed to the next stage based on the current stage
  nextStage() {
    switch (this.currentStage) {
      case 'to-submit':
        this.currentStage = 'submitted';
        break;
      case 'submitted':
        this.currentStage = 'approved';
        break;
      case 'approved':
        this.currentStage = 'paid';
        break;
    }
  }

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

  // Method to handle form submission
  submitForm() {
    // Capture form data for summary display
    this.expenseSummary.amount = (document.getElementById('amount') as HTMLInputElement).value;
    this.expenseSummary.merchant = (document.getElementById('merchant') as HTMLInputElement).value;
    this.expenseSummary.expenseDate = (document.getElementById('expense-date') as HTMLInputElement).value;
    this.expenseSummary.category = (document.getElementById('category') as HTMLSelectElement).value;
    this.expenseSummary.taxRate = (document.getElementById('tax-rate') as HTMLSelectElement).value;
    this.expenseSummary.taxPercentage = (document.getElementById('tax-percentage') as HTMLInputElement).value;
    this.expenseSummary.taxAmount = (document.getElementById('tax-amount') as HTMLInputElement).value;
    this.expenseSummary.payMethod = (document.getElementById('pay-method') as HTMLSelectElement).value;
    this.expenseSummary.project = (document.getElementById('project') as HTMLSelectElement).value;
    this.expenseSummary.comments = (document.getElementById('comments') as HTMLTextAreaElement).value;

    // Show the summary modal
    this.showModal = true;
  }

  // Method to save the form
  saveForm() {
    console.log('Form saved');
  }

  // Method to cancel the form process
  cancelForm() {
    console.log('Form cancelled');
    this.setStage('to-submit');
  }

  // Method to close the summary modal
  closeSummaryModal() {
    this.showModal = false;
  }

  
}
