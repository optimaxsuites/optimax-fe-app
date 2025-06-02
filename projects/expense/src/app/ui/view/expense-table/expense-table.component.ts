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
  selectedExpense: any = null;
  currentUserId: string = '';

  private searchTermSubject: Subject<string> = new Subject();
  sidebarVisible = false;
  isModalOpen: boolean = false;
  isModalOpen2: boolean = false;
  dropdownOpen: boolean = false;
  expense: any; 

  expenseId: string | null = null;

  constructor(
    private router: Router, 
    private expenseService: ExpenseService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService, 
    private cdr: ChangeDetectorRef,

  ) {
    this.loadExpensesFromLocalStorage();
  }

  // Array of predefined color classes
  colorClasses: string[] = [
    'color-lightblue',
    'color-lightgreen',
    'color-lightyellow',
    'color-lightcoral',
    'color-lightpink'
  ];

  // Example function to update the count
  getExpenseCount(): number {
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    return expenses.length;
  }
  


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
    console.log('Loaded expenses from local storage:', this.filteredExpenses);
    
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
  closeModal() {
    this.isModalOpen = false;
    this.selectedExpense = null;
    this.isModalOpen2 = false;
  }
  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
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

  // editExpense(expense: Expense): void {
  //   this.router.navigate(['admin/expenses/expensesForm'], {
  //     queryParams: { id: expense.id }
  //   });
  // }

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
    console.log('Edit function called');
    console.log('Selected expense:', expense);

    // Clone the expense to avoid modifying the original directly
    this.selectedExpense = { ...expense };
    this.isModalOpen2 = true;
    console.log('Editing expense:', this.selectedExpense);
  
    // this.router.navigate(['/expensesApproval', expense.id]); // ✅ matches your defined route
  }

  editExpense(expense: any) {
    console.log('Edit function called');
    console.log('Selected expense:', expense);

    // Clone the expense to avoid modifying the original directly
    this.selectedExpense = { ...expense };
    this.isModalOpen = true;
    console.log('Editing expense:', this.selectedExpense);
  }

  
  saveEditedExpense(): void {
    if (!this.selectedExpense) {
      console.log('No expense selected for editing.');
      return;
    }

    console.log('Saving edited expense:', this.selectedExpense);

    // Find the index of the expense in the filteredExpenses array
    const index = this.filteredExpenses.findIndex(e => e.id === this.selectedExpense.id);

    if (index > -1) {
      // Update the expense in the array
      this.filteredExpenses[index] = this.selectedExpense;
      console.log('Updated expense list:', this.filteredExpenses);

      // Save the updated list back to local storage
      localStorage.setItem('expenses', JSON.stringify(this.filteredExpenses));
      console.log('Expenses saved to local storage');
    } else {
      console.log('Expense not found in the list');
    }

    this.closeModal();
    console.log('Expense edit form closed');
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

}
