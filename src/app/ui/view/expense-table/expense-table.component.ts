import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ExpenseService, Expense } from '../../service/expense.service';
import { debounceTime, Subject } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';


@Component({
  selector: 'app-expense-table',
  templateUrl: './expense-table.component.html',
  styleUrls: ['./expense-table.component.scss'],
  providers: [ConfirmationService, MessageService] 
})
export class ExpenseTableComponent implements OnInit {
  expenses: Expense[] = [];
  filteredExpenses: Expense[] = [];
  searchTerm: string = '';
  private searchTermSubject: Subject<string> = new Subject();


  constructor(
    private router: Router, 
    private expenseService: ExpenseService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService, 
    private cdr: ChangeDetectorRef
  ) {}

  // Array of predefined color classes
  colorClasses: string[] = [
    'color-lightblue',
    'color-lightgreen',
    'color-lightyellow',
    'color-lightcoral',
    'color-lightpink'
  ];


  ngOnInit(): void {
    // this.expenseService.expenses$.subscribe((expenses) => {
    //   console.log('Received expenses:', expenses);
    //   this.expenses = expenses;
    //   this.filteredExpenses = expenses; 
    // });
    // this.searchTermSubject.pipe(debounceTime(300)).subscribe(() => {
    //   this.onSearch();
    // });
    this.loadExpensesFromLocalStorage();
    console.log('Loaded expenses from local storage:', this.filteredExpenses);
     // Trigger change detection to fix ExpressionChangedAfterItHasBeenCheckedError

  }
  loadExpensesFromLocalStorage(): void {
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    this.filteredExpenses = expenses;
  }

  onSearchInputChange(): void {
    this.searchTermSubject.next(this.searchTerm);
  }

  onSearch(): void {
    console.log('Search triggered with term:', this.searchTerm);
    if (this.searchTerm) {
      this.filteredExpenses = this.expenses.filter(expense =>
        expense.merchant.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        expense.id.toString().includes(this.searchTerm) ||
        expense.amount.toString().includes(this.searchTerm)
      );
    } else {
      this.filteredExpenses = this.expenses; 
    }
  }
  generateRandomColor(): string {
    const colors = [
      '#ADD8E6', // lightblue
      '#90EE90', // lightgreen
      '#FFFFE0', // lightyellow
      '#F08080', // lightcoral
      '#FFB6C1'  // lightpink
    ];
    const randomIndex = Math.floor(Math.random() * colors.length);
    return colors[randomIndex];
  }
  
  navigateToexpense(): void {
    this.router.navigate(['/expense-summary']);
  }
  navigateToForm(): void {
    console.log('Navigating to form');
    this.router.navigate(['/admin/expensesForm']);
  }

  editExpense(expense: Expense): void {
    this.router.navigate(['admin/expenses/expensesForm'], {
      queryParams: { id: expense.id }
    });
  }

  confirmDelete(expense: Expense): void {
    this.confirmationService.confirm({
      message: `Are You sure you want to carry out this action?  Clicking on DELETE, would lead to permanent removal of - ${expense.merchant}`,
      header: `Delete Expense - ${expense.merchant}`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger custom-confirm-button',
      rejectButtonStyleClass: 'p-button-custom-cancel custom-confirm-button',
      acceptIcon: 'pi pi-trash',
      rejectIcon: 'pi pi-times',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      // styleClass: 'custom-confirm-dialog',
      accept: () => {
        this.deleteExpense(expense);
      }
    });
  }

  deleteExpense(expense: Expense): void {
    this.expenseService.deleteExpense(expense.id);
    this.messageService.add({
      severity: 'success',
      summary: 'Expense Deleted',
      detail: `Expense for ${expense.merchant} has been successfully deleted.`
    });
  }

  deleteExpense2(expenseId: string): void {
    // Get data from local storage
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
  
    // Filter out the item to delete
    const updatedExpenses = expenses.filter((exp: any) => exp.id !== expenseId);
  
    // Save back to local storage
    localStorage.setItem('expenses', JSON.stringify(updatedExpenses));
  
    // Update your table data
    this.filteredExpenses = updatedExpenses;
  }
  

  viewExpenseApproval(expense: Expense): void {
    this.router.navigate(['/expenses/expensesApproval', expense.id]);
  }
  
}
