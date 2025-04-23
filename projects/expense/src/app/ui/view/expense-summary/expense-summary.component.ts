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
  requests = [
    {
      id: 1,
      eventDate: '2025-04-15',
      name: 'Transport Allowance',
      merchant: 'Uber',
      category: 'Transport',
      amount: 10000,
      status: 'Pending',
      submittedBy: 'John Doe',
      comment: 'Client visit transportation'
    },
    {
      id: 2,
      eventDate: '2025-04-14',
      name: 'Office Supplies',
      merchant: 'Jumia',
      category: 'Stationery',
      amount: 15000,
      status: 'Pending',
      submittedBy: 'Jane Smith',
      comment: 'Bought markers and pens'
    },
    {
      id: 3,
      eventDate: '2025-04-13',
      name: 'Team Dinner',
      merchant: 'Dominos Pizza',
      category: 'Meals',
      amount: 20000,
      status: 'Pending',
      submittedBy: 'Mike Johnson',
      comment: 'Dinner after sprint wrap-up'
    }
  ];

  // Method to approve a request
  approve(request: any) {
    request.status = 'Approved';
    request.showActions = false;
    console.log(`Approved request ID ${request.id}`);
  }
  getRequests() {
    return this.requests;
  }
  // Method to reject a request
  reject(request: any) {
    request.status = 'Rejected';
    request.showActions = false;
    console.log(`Rejected request ID ${request.id}`);
  }
  goBack(){
    this.router.navigate(['/admin/expenses/:uuid']);
  }
}
