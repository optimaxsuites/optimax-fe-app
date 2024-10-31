import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExpenseService, Expense } from '../../service/expense.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-expense-approval',
  templateUrl: './expense-approval.component.html',
  styleUrls: ['./expense-approval.component.scss'],
})
export class ExpenseApprovalComponent implements OnInit {
  expense: Expense | undefined;
  dropdownOpen = false; 
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private expenseService: ExpenseService
  ) {}

  ngOnInit(): void {
    const expenseId = this.route.snapshot.paramMap.get('id');
    if (expenseId) {
      this.expense = this.expenseService.getExpenseById(expenseId);
    }
  }

  approveExpense(): void {
    if (this.expense) {
      this.expense.status = 'Approved';
      this.expenseService.updateExpense(this.expense);
      this.router.navigate(['/expenses']); 
    }
  }

  rejectExpense(): void {
    if (this.expense) {
      this.expense.status = 'Rejected';
      this.expenseService.updateExpense(this.expense);
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
      this.router.navigate(['/expenses/expensesForm'], {
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
