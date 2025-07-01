import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { Expense } from '../../service/expense.service';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-expense-summary',
  templateUrl: './expense-summary.component.html',
  styleUrls: ['./expense-summary.component.scss']
})
export class ExpenseSummaryComponent {
  expenseSummary: any;
  searchTerm: string = '';
  requests: any[] = [];

   private searchTermSubject: Subject<string> = new Subject();

  constructor(private router: Router) {
    const navigation = this.router.getCurrentNavigation();
    this.expenseSummary = navigation?.extras?.state?.['expenseSummary'];

  }  onSearchInputChange(): void {
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
  
    console.log(`Approved request ID ${request.id}`);
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
  
    console.log(`Rejected request ID ${request.id}`);
  }
  
  loadExpensesFromLocalStorage(): void {
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    this.requests = expenses;
    console.log('Loaded expenses into table:', this.requests);
  }
  
  goBack(){
    this.router.navigate(['/admin/expenses/:uuid']);
  }
}
