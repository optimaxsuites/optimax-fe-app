import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExpenseService, Expense } from '../../service/expense.service';
import { CommonModule } from '@angular/common';
import { Injectable } from '@angular/core';


@Component({
  selector: 'app-expense-approval',
  templateUrl: './expense-approval.component.html',
  styleUrls: ['./expense-approval.component.scss'],
})
export class ExpenseApprovalComponent implements OnInit {
  
  expense: any; 
  expenses: Expense[] = []; // This will hold the array of expenses

  expenseId: string | null = null;

  dropdownOpen = false; 
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private expenseService: ExpenseService
  ) {}


  
  ngOnInit(): void {
    const expenseId = this.route.snapshot.paramMap.get('id');
    console.log('Route param id:', expenseId);

    if (expenseId) {
      this.expenseId = expenseId;
      this.fetchExpenseById(expenseId);
    }
  }
  fetchExpenseById(id: string): void {
    // Get expenses from local storage
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');

    // Find the expense by ID
    this.expense = expenses.find((exp: { id: string }) => exp.id === id);

    if (this.expense) {
      console.log('Fetched expense from local storage:', this.expense);
    } else {
      console.log('Expense not found in local storage');
    }
  }
  goBack(){
    this.router.navigate(['/admin/expenses/:uuid']);
  }
  
  approveExpense(): void {
    if (this.expense) {
      this.expense.status = 'Approved';
      this.expenseService.updateExpense(this.expense.id, this.expense);
      this.router.navigate(['/expenses']); 
    }
  }

  rejectExpense(): void {
    if (this.expense) {
      this.expense.status = 'Rejected';
      this.expenseService.updateExpense(this.expense.id, this.expense);
      this.router.navigate(['/expenses']);
    }
  }

  downloadExpense(): void {
    // Implement download logic here (e.g., convert to PDF and download)
  }

  emailExpense(): void {
    // Implement email logic here (e.g., send the expense as an attachment)
  }

  exportExpense(): void {
    // Implement export logic here (e.g., export the expense details as a PDF)
  }

  editExpense(): void {
    if (this.expense) {
      this.router.navigate(['/expensesForm'], {
        queryParams: { id: this.expense.id }
      });
    }
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  downloadFile(fileName: string | undefined): void {
    if (!fileName) return;
    
    // Logic to download the file, e.g., creating a URL or triggering a download
    console.log(`Downloading file: ${fileName}`);
    // You could use FileSaver.js or a similar library to handle the download.
  }
  
}
