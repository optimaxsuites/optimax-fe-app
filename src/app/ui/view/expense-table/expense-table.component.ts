import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ExpenseService, Expense } from '../../service/expense.service';
import { debounceTime, from, Subject } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ExclamationTriangleIcon } from 'primeng/icons/exclamationtriangle';

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
  dropdownOpen = {
    category: false,
    status: false,
    dateRange: false
  };

  selectedCategory: string | null = null;
  selectedStatus: string | null = null;
  dateRangeType: string | null = null;
  dateFrom: string | null = null;
  dateTo: string | null = null;

  categories = ['Administrative', 'Cost of Goods Sold', 'Employee-Related', 'Operating Expenses', 'Sales and Marketing', 'Others'];
  statuses = ['Pending', 'Approved', 'Rejected', 'Paid'];

  expense: any;
  expenseId: string | null = null;
  selectedExpenses: any[] = [];
  requests: any;

  onRowSelect(event: any) {
    this.selectedExpenses = event.value;
  }

  onRowUnselect(event: any) {
    this.selectedExpenses = event.value;
  }

  
  deleteSelectedExpenses() {
    if (!this.selectedExpenses.length) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${this.selectedExpenses.length} expenses?`,
      header: `Delete Selected Expenses`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-warning',
      acceptIcon: 'pi pi-trash',
      rejectIcon: 'pi pi-times',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',

      accept: () => {
        this.selectedExpenses.forEach(exp => this.deleteExpense(exp));
        this.selectedExpenses = [];
      }
    });

    // this.filteredExpenses = this.filteredExpenses.filter(
    //   exp => !this.selectedExpenses.includes(exp)
    // );
    
    // this.expenses = this.expenses.filter(
    //   exp => !this.selectedExpenses.includes(exp)
    // );
    
    // this.selectedExpenses = [];
    // // Optionally show a toast
    // this.messageService.add({
    //   severity: 'success',
    //   summary: 'Deleted',
    //   detail: 'Selected expenses have been deleted.'
    // });
  
  }

  reject(request: any): void {
    request.status = 'Rejected';
    request.showActions = false;
    
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    const updatedExpenses = expenses.map((item: any) => 
      item.id === request.id ? { ...item, status: 'Rejected' } : item
    );

    localStorage.setItem('expenses', JSON.stringify(updatedExpenses));
    this.requests = updatedExpenses;

    this.messageService.add({
      severity: 'error',
      summary: 'Request Rejected',
      detail: 'Expense for ${request.merchant} has been rejected.'
    });
  }




  colorClasses: string[] = [
    'color-lightblue',
    'color-lightgreen',
    'color-lightyellow',
    'color-lightcoral',
    'color-lightpink'
  ];

  constructor(
    private router: Router,
    private expenseService: ExpenseService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {
    this.loadExpensesFromLocalStorage();
  }

  getExpenseCount(): number {
    return this.expenses?.length || 0;
  }

  ngOnInit(): void {
    this.loadExpensesFromLocalStorage();
    this.searchTermSubject.pipe(debounceTime(300)).subscribe(() => {
      this.applyFilters();
    });
    console.log('Loaded expenses from local storage:', this.filteredExpenses);
  }

  loadExpensesFromLocalStorage(): void {
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    this.expenses = expenses;
    this.filteredExpenses = [...this.expenses];
    console.log('Loaded expenses from local storage:', this.filteredExpenses);
  }

  get dateRangeLabel(): string {
    if (!this.dateRangeType) return 'Date Range';
    const labels: { [key: string]: string } = {
      'today': 'Today',
      'week': 'This Week',
      'month': 'This Month',
      'custom': 'Custom Range'
    };
    return labels[this.dateRangeType] || 'Date Range';
  }

  onSearchInputChange(): void {
    this.searchTermSubject.next(this.searchTerm);
  }

  // New method to apply all filters
  applyFilters(): void {
    this.filteredExpenses = this.expenses.filter(expense => {
      // Search term filter
      if (this.searchTerm &&
        !expense.merchant.toLowerCase().includes(this.searchTerm.toLowerCase()) &&
        !expense.id.toString().includes(this.searchTerm) &&
        !expense.amount.toString().includes(this.searchTerm)) {
        return false;
      }

      // Category filter
      if (this.selectedCategory && expense.category !== this.selectedCategory) {
        return false;
      }

      // Status filter
      if (this.selectedStatus && expense.status !== this.selectedStatus) {
        return false;
      }

      if (this.dateFrom && this.dateTo) {
        const fromDate = new Date(this.dateFrom);
        const toDate = new Date(this.dateTo + 'T23:59:59');

        const expenseDate = new Date(expense.date || expense.eventDate);

        if (expenseDate < fromDate || expenseDate > toDate) {
          return false;
        }
      }

      return true;
    });
  }

  
  applyDateRange(): void {
    if (!this.dateRangeType) {
      this.applyFilters();
      return;
    }

    const today = new Date();
    let fromDate = new Date();
    let toDate = new Date();

    switch (this.dateRangeType) {
      case 'today':
        fromDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        toDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        break;

      case 'week':
          const dayOfWeek = today.getDay();
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          fromDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysToMonday);
          toDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
          break;

      case 'month':
        fromDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 1);
        toDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 0, 23, 59, 59);
        break;
        
      case 'custom':
        if (!this.dateFrom || !this.dateTo) {
          this.applyFilters();
          return;
        }

        fromDate = new Date(this.dateFrom);
        toDate = new Date(this.dateTo + 'T23:59:59');
        break;

      default:
        this.applyFilters();
        return;

    }


    if (this.dateRangeType !== 'custom') {
      this.dateFrom = fromDate.toISOString().split('T')[0];
      this.dateTo = toDate.toISOString().split('T')[0];
    }

    this.applyFilters();
    // if (this.dateFrom && this.dateTo) {
    //   const fromDate = new Date(this.dateFrom);
    //   const toDate = new Date(this.dateTo);

    //   this.filteredExpenses = this.expenses.filter(expense => {
    //     const expenseDate = new Date(expense.date)
    //       ;
    //     return expenseDate >= fromDate && expenseDate <= toDate;
    //   });
    // } else {
    //   this.filteredExpenses = [...this.expenses];
    // }
    // this.applyFilters(); 
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  toggleDropdown(type: 'category' | 'status' | 'dateRange'): void {
    Object.keys(this.dropdownOpen).forEach(key => {
      if (key !== type) {
        this.dropdownOpen[key as keyof typeof this.dropdownOpen] = false;
      }
    });
    this.dropdownOpen[type] = !this.dropdownOpen[type];
  }

  selectCategory(category: string | null): void {
    this.selectedCategory = category;
    this.dropdownOpen.category = false;
    this.applyFilters();
  }

  selectStatus(status: string | null): void {
    this.selectedStatus = status;
    this.dropdownOpen.status = false;
    this.applyFilters();
  }

  selectDateRange(range: string): void {
    this.dateRangeType = range;
    this.dropdownOpen.dateRange = false;

    if (range !== 'custom') {
      this.dateFrom = null;
      this.dateTo = null;
      }

      else if (range === 'custom'){
        this.dateRangeType = null;
        this.dateFrom = null;
        this.dateTo = null;

      }

      this.applyDateRange();
    }
  

  applyCustomDateRange(): void {
    if (this.dateFrom && this.dateTo) {

      if (new Date(this.dateFrom) > new Date(this.dateTo)) {
        const temp = this.dateFrom;
        this.dateFrom = this.dateTo;
        this.dateTo = temp;
      }

      this.applyFilters();
    }
  }

  openAdvancedFilters(): void {
    console.log('Opening advanced filters');
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedExpense = null;
    this.isModalOpen2 = false;
  }

  generateRandomColor(): string {
    const colors = ['#ADD8E6', '#90EE90', '#FFFFE0', '#F08080', '#FFB6C1'];
    const randomIndex = Math.floor(Math.random() * colors.length);
    return colors[randomIndex];
  }

  navigateToexpense(): void {
    this.router.navigate(['/expense-summary']);
  }

  navigateToForm(): void {
    console.log('Navigating to form');
    this.router.navigate(['/expensesForm']);
  }

  confirmDelete(expense: Expense): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to carry out this action?  Clicking on <b>DELETE</b>, would lead to permanent removal of - ${expense.merchant}`,
      header: `Delete Expense - ${expense.merchant}`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-warning',
      acceptIcon: 'pi pi-trash',
      rejectIcon: 'pi pi-times',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      accept: () => {
        this.deleteExpense(expense);
      }
    });
  }

  deleteExpense(expense: Expense): void {
    this.expenses = this.expenses.filter(e => e.id !== expense.id); 
    this.filteredExpenses = this.filteredExpenses.filter(e => e.id !== expense.id);

    localStorage.setItem('expenses', JSON.stringify(this.expenses));

    this.messageService.add({
      severity: 'success',
      summary: 'Expense Deleted',
      detail: `Expense for ${expense.merchant} has been successfully deleted.`
    });
    /*this.expenseService.deleteExpense(expense.id);
    this.messageService.add({
      severity: 'success',
      summary: 'Expense Deleted',
      detail: `Expense for ${expense.merchant} has been successfully deleted.`
    });
    this.loadExpensesFromLocalStorage();
    */
  }

  deleteExpense2(expenseId: string): void {
    if (!expenseId) return;
    this.expenses = this.expenses.filter(e => e.id !== expenseId);
    this.filteredExpenses = this.filteredExpenses.filter(e => e.id !== expenseId);    
    localStorage.setItem('expenses', JSON.stringify(this.expenses));
    this.messageService.add({
      severity: 'success',
      summary: 'Expense Deleted',
      detail: `Expense with ID ${expenseId} has been successfully deleted.`
    });
    
    /*
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    const updatedExpenses = expenses.filter((exp: any) => exp.id !== expenseId);
    localStorage.setItem('expenses', JSON.stringify(updatedExpenses));
    this.filteredExpenses = updatedExpenses;
    */
  }

  viewExpenseApproval(expense: Expense): void {
    console.log('Edit function called');
    this.selectedExpense = { ...expense };
    this.isModalOpen2 = true;
  }

  editExpense(expense: any): void {
    console.log('Edit function called');
    this.selectedExpense = { ...expense };
    this.isModalOpen = true;
  }

  saveEditedExpense(): void {
    if (!this.selectedExpense) return;

    const index = this.filteredExpenses.findIndex(e => e.id === this.selectedExpense.id);
    if (index > -1) {
      this.filteredExpenses[index] = this.selectedExpense;
      localStorage.setItem('expenses', JSON.stringify(this.filteredExpenses));
      this.expenses = [...this.filteredExpenses];
    }
    this.closeModal();
  }

  downloadExpense(): void {
   
  }

  emailExpense(): void {
    
  }

  exportExpense(): void {
    
  }

  getTotalAmount(): number {
    return this.expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  }

  getApprovedCount(): number {
    return this.expenses.filter(expense => expense.status === 'Approved').length;
  }

  getPendingCount(): number {
    return this.expenses.filter(expense => expense.status === 'Pending').length;
  }

  getRejectedCount(): number {
    return this.expenses.filter(expense => expense.status === 'Rejected').length;
  }


  approve(request: any): void {
    request.status = 'Approved';
    request.showActions = false;
  
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    const updatedExpenses = expenses.map((item: any) =>
      item.id === request.id ? { ...item, status: 'Approved' } : item
    );
  
    localStorage.setItem('expenses', JSON.stringify(updatedExpenses));
    this.requests = updatedExpenses;
  
    this.messageService.add({
      severity: 'success',
      summary: 'Request Approved',  
      detail: `Expense for ${request.merchant} has been approved successfully.`
    });
  }

}

