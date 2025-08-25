import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { Expense } from '../../service/expense.service';
//import { MenuItem } from 'primeng/api';
import { MessageService } from 'primeng/api';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-expense-summary',
  templateUrl: './expense-summary.component.html',
  styleUrls: ['./expense-summary.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class ExpenseSummaryComponent {
  expenseSummary: any;
  searchTerm: string = '';
  selectedRequests: any[] = [];
  requests: any[] = [];

   private searchTermSubject: Subject<string> = new Subject();
 

  constructor(
    private router: Router,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    const navigation = this.router.getCurrentNavigation();
    this.expenseSummary = navigation?.extras?.state?.['expenseSummary'];
  }

    onSearchInputChange(): void {
    this.searchTermSubject.next(this.searchTerm);
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


  ngOnInit(): void {
    this.loadExpensesFromLocalStorage();
  }

  // Method to approve a request
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
  
  getRequests() {
    return this.requests;
  }
  // Method to reject a request
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
      detail: `Expense for ${request.merchant} has been rejected.`
    });
  }
  
  loadExpensesFromLocalStorage(): void {
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    this.requests = expenses;
    console.log('Loaded expenses into table:', this.requests);
  }
  
  goBack(){
    this.router.navigate(['/expense/:uuid']);
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
        this.deleteSelected();
      }
    });
  }


deleteSelected(): void {
  if (this.selectedRequests.length === 0) {
    this.messageService.add({
      severity: 'warn', 
      summary: 'No Requests Selected',
      detail: 'Please select at least one request to delete.'
    });
    return; 
  }
  
  this.confirmationService.confirm({
    message: `Are you sure you want to delete ${this.selectedRequests.length} selected requests?`,
    header: 'Confirm Deletion',
    icon: 'pi pi-exclamation-triangle', 
    accept: () => {
    const selectedIds = this.selectedRequests.map(item => item.id);
    this.requests = this.requests.filter(item => !selectedIds.includes(item.id));
    localStorage.setItem('expenses', JSON.stringify(this.requests));

    const count = this.selectedRequests.length;
    this.selectedRequests = [];

    this.messageService.add({
      severity: 'success',
      summary: 'Requests Deleted',
      detail: `${count} request(s) have been successfully deleted.`
    });
} 
  });

}

bulkApprove(): void {
  if (this.selectedRequests.length === 0) {
    this.messageService.add({
      severity: 'warn',
      summary: 'No Requests Selected',
      detail: 'Please select at least one request to approve.'
    });
    return; 
  }

  const selectedIds = this.selectedRequests.map(item => item.id);
  const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
  const updatedExpenses = expenses.map((item: any) => 
    selectedIds.includes(item.id) ? { ...item, status: 'Approved' } : item
  );

  localStorage.setItem('expenses', JSON.stringify(updatedExpenses));
  this.requests = updatedExpenses;

  const count = this.selectedRequests.length;
  this.selectedRequests = [];

  this.messageService.add({
    severity: 'success',  
    summary: 'Requests Approved',
    detail: `${count} requests have been successfully approved.`
  });
}

bulkReject(): void {
  if (this.selectedRequests.length === 0) {
    this.messageService.add({
      severity: 'warn',
      summary: 'No Requests Selected',
      detail: 'Please select at least one request to reject.'
    });
    return; 
  }

  const selectedIds = this.selectedRequests.map(item => item.id);
  const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
  const updatedExpenses = expenses.map((item: any) => 
    selectedIds.includes(item.id) ? { ...item, status: 'Rejected' } : item
  );

  localStorage.setItem('expenses', JSON.stringify(updatedExpenses));
  this.requests = updatedExpenses;

  const count = this.selectedRequests.length;
  this.selectedRequests = [];

  this.messageService.add({
    severity: 'error', 
    summary: 'Requests Rejected',
    detail: `${count} requests have been successfully rejected.`
  });
}

 getApprovedCount(): number {
    return this.requests.filter(expense => expense.status === 'Approved').length;
  }

  getPendingCount(): number {
    return this.requests.filter(expense => expense.status === 'Pending').length;
  }

  getRejectedCount(): number {
    return this.requests.filter(expense => expense.status === 'Rejected').length;
  }


}







