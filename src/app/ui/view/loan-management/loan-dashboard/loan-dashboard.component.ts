import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router'

@Component({
  selector: 'app-loan-dashboard',
  templateUrl: './loan-dashboard.component.html',
  styleUrls: ['./loan-dashboard.component.scss']
})
export class LoanDashboardComponent implements OnInit {
  constructor (private router: Router) {}
  // Loading state
  isLoading = true;

  // Search
  searchTerm: string = '';

  // Mock Stat Data
  dashboardStats = {
    activeLoans: 12,
    pendingApplications: 5,
    totalBalance: 125000
  };

  // Mock Recent Loan Data
  recentLoans = [
    {id: 'LN-001', employee: 'Ayasa', amount: 50000, status: 'APPROVED', date: '2024-01-15'},
    {id: 'LN-002', employee: 'Makima', amount: 25000, status: 'PENDING', date: '2024-01-16'},
    {id: 'LN-003', employee: 'Frieren', amount: 50000, status: 'REJECTED', date: '2024-01-17'},
    {id: 'LN-004', employee: 'Himmal', amount: 50000, status: 'APPROVED', date: '2024-01-8'},
  ];

  // Mock Upcoming Events
  upcomingRepayments = [
    {date:'2024-01-30', amount:5000, loanType:'Personal', loanID:'LN-001'},
    {date:'2024-02-15', amount:7500, loanType:'Housing', loanID:'LN-005'},
    {date:'2024-02-28', amount:3000, loanType:'Education', loanID:'LN-008'}
  ];

  // Mock Status Options for Reference
   loanStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'COMPLETED'];


  // Dropdown state management
  dropdowns = {
    records: false,
    actions: false
  };

  // Active state indicator
  activeRoute: string = 'dashboard'

  // Loading in ngOnInit
  ngOnInit() {
    // API call delay
    setTimeout(() => {
      this.isLoading = false;
    }, 1000);
  }

  getStatusClass(status: string): string{
  switch(status) {
    case 'APPROVED': return 'status-approved';
    case 'PENDING': return 'status-pending';
    case 'REJECTED': return 'status-rejected';
    default: return 'status-default';
  }
}

applyForLoan() {
  // Will navigate to loan application form
  console.log('Navigate to application form');
  //this.router.navigate(['/loan-application']);
  this.router.navigate(['/admin/hr/loan-management/request-for-loan/', 'uuid'])
}

approveLoan() {
  // Will navigate to loan approval UI
  console.log('Navigate to approval UI');
  //this.router.navigate(['/loan-approval']);
  this.router.navigate(['/admin/hr/loan-management/loan-approval/', 'uuid'])
}

viewLoanDetails(loanId: string) {
  // Will navigate to loan details
  console.log('View details for:', loanId)
  //this.router.navigate(['/loan-details', loanId]);

}

seeLoanHistory(loanId: string) {

    // Navigate to details view with employee details
    // this.router.navigate(['/admin/hr/loan-management/loan-approval/loan-details/', this.employeeId, loanId]);
}

searchLoans(event: any) {
  this.searchTerm = event.target.value;
  // This will filter the recentLoans array
  console.log('Searching for: ', this.searchTerm)
  // Future: Implement filtering
}


navigateTo(destination: string) {
  console.log('Navigate to:', destination);
  // Will implement actual routing later
  // Future: Implement routing
  // switch(destination) {
  //   case 'history': this.router.navigate(['/loan-history']);
  //   // etc.
  // }
}

setActive(route: string) {
  this.activeRoute = route;
  // Navigation logic will go here
}


// Toggle dropdown visibility
toggleDropdown(dropdownName: 'records' | 'actions') {
  this.dropdowns[dropdownName] = !this.dropdowns[dropdownName]
}

// Close all dropdowns
closeAllDropdowns() {
  this.dropdowns.records = false;
  this.dropdowns.actions = false;
}

// Keyboard navigation
handleKeydown(event: KeyboardEvent, dropdownName: any) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    this.toggleDropdown(dropdownName);
  }
  if (event.key === 'Escape') {
    this.closeAllDropdowns();
  }
}

// Close on outside click
@HostListener('document:click', ['$event']) 
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    // Check if click is outside dropdown
    if (!target.closest('.dropdown')) {
      this.closeAllDropdowns()
;    }
  }

}




