import { Component, OnInit, OnDestroy } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router'; 
import { Subscription } from 'rxjs';
import { Message } from 'primeng/api';
import { v4 as uuidV4 } from 'uuid';
import { LoanApplication, RepaymentScheduleItem } from '../../../service/loan/loan.types';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { LoanRepaymentService } from '../../../service/loan/loan-repayment.service';

@Component({
  selector: 'app-employee-dashboard',
  templateUrl: './employee-loan-dashboard.component.html',
  styleUrls: ['./employee-loan-dashboard.component.scss']
})
export class EmployeeDashboardComponent implements OnInit, OnDestroy {
  employeeName: string = 'Employee Name';
  employeeId: string = 'EMP-123';
  isLoading: boolean = false;
  uuid: string = '';
  
  showHistory: boolean = true;
  showLoanForm: boolean = false;
  showPaymentForm: boolean = false;
  
  loanCounts = {
    pending: 0,
    active: 0,
    requested: 0,
    rejected: 0,
    completed: 0
  };
  
  allLoans: LoanApplication[] = [];
  private loanSubscription!: Subscription;
  selectedLoanForSchedule: LoanApplication | null = null;
  selectedLoanForDetails: LoanApplication | null = null;
  showLoanDetailsModal: boolean = false;
  messages: Message[] = [];
  payableLoans: LoanApplication[] = [];
  selectedPaymentLoanId = '';
  autoMonthlyAmount = 0;
  selectedPaymentMethod = '';
  paymentReference = '';
  paymentNarration = '';
  bankName = '';
  accountName = '';
  accountNumber = '';
  cardHolderName = '';
  cardLast4 = '';
  cashReceiverName = '';
  payrollCycle = '';
  paymentFormError = '';
  applicationUpdates: Array<{ loanId: string; status: LoanApplication['status']; date: string; message: string }> = [];

  historyColumns = [
    { header: 'Loan ID', field: 'id' },
    {
      header: 'Date',
      formatter: (row: LoanApplication) => new Date(row.dateSubmitted).toLocaleDateString()
    },
    { header: 'Purpose', field: 'purpose' },
    {
      header: 'Amount',
      formatter: (row: LoanApplication) => this.formatCurrency(row.loanAmount)
    },
    {
      header: 'Status',
      formatter: (row: LoanApplication) => this.getStatusDisplay(row.status),
      badgeClass: (row: LoanApplication) => `status-badge status-${this.getStatusClass(row.status)}`
    }
  ];

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private router: Router,
    private loanApplicationService: LoanApplicationService,
    private loanRepaymentService: LoanRepaymentService
  ) {}

  ngOnInit(): void {
    this.loadEmployeeData();
    this.setupLoanSubscription();
  }

  ngOnDestroy(): void {
    if (this.loanSubscription) {
      this.loanSubscription.unsubscribe();
    }
  }

  private sortLoansByRecent(loans: LoanApplication[]): LoanApplication[] {
    return [...loans].sort((a, b) => {
      const timestampA = new Date(a.submittedAt || a.dateSubmitted).getTime();
      const timestampB = new Date(b.submittedAt || b.dateSubmitted).getTime();
      const dateDiff = timestampB - timestampA;
      if (dateDiff !== 0) {
        return dateDiff;
      }

      return b.id.localeCompare(a.id);
    });
  }

  setupLoanSubscription(): void {
    // Subscribe to loan updates for real-time data
    this.loanSubscription = this.loanApplicationService.getApplicationsObservable().subscribe({
      next: (applications) => {
        const employeeLoans = applications.filter(loan => 
          loan.employeeId === this.employeeId
        );
        this.allLoans = this.sortLoansByRecent(employeeLoans);
        this.refreshPayableLoans();
        this.calculateLoanCounts();
        this.refreshApplicationUpdates();
      },
      error: (error) => {
        console.error('Error in loan subscription:', error);
      }
    });
  }

  loadEmployeeData(): void {
    this.isLoading = true;
    
    this.route.params.subscribe(params => {
      this.uuid = params['uuid'];
      
      // In real app, get from auth service
      this.employeeName = 'Eseose Odion';
      this.employeeId = 'EMP-123';
      
      this.loadLoanData();
    });
  }

  loadLoanData(): void {
    this.isLoading = true;
    this.loanApplicationService.getApplicationsByEmployeeId(this.employeeId).subscribe({
      next: (applications) => {
        this.allLoans = this.sortLoansByRecent(applications);
        this.refreshPayableLoans();
        this.calculateLoanCounts();
        this.refreshApplicationUpdates();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading loan data:', error);
        this.isLoading = false;
      }
    });
  }

  calculateLoanCounts(): void {
    this.loanCounts = {
      pending: 0,
      active: 0,
      requested: 0,
      rejected: 0,
      completed: 0
    };
    
    this.allLoans.forEach(loan => {
      switch(loan.status) {
        case 'PENDING':
          this.loanCounts.pending++;
          this.loanCounts.requested++;
          break;
        case 'APPROVED':
          this.loanCounts.active++;
          break;
        case 'REJECTED':
          this.loanCounts.rejected++;
          break;
        case 'COMPLETED':
          this.loanCounts.completed++;
          break;
        case 'ACTIVE':
          this.loanCounts.active++;
          break;
      }
    });
  }

  openLoanFormModal(): void {
    this.showLoanForm = true;
  }

  openPaymentFormModal(): void {
    this.resetPaymentForm();
    this.refreshPayableLoans();
    this.showPaymentForm = true;
  }

  closePaymentFormModal(): void {
    this.showPaymentForm = false;
    this.resetPaymentForm();
  }

  onPaymentLoanSelect(loanId: string): void {
    this.selectedPaymentLoanId = loanId;
    this.autoMonthlyAmount = this.getDueAmountForLoan(loanId);
    this.paymentFormError = '';
  }

  submitPayment(): void {
    this.paymentFormError = '';

    if (!this.selectedPaymentLoanId) {
      this.paymentFormError = 'Please select a loan ID to pay.';
      return;
    }

    if (!this.selectedPaymentMethod) {
      this.paymentFormError = 'Please select a payment method.';
      return;
    }

    if (this.autoMonthlyAmount <= 0) {
      this.paymentFormError = 'No payable installment found for the selected loan.';
      return;
    }

    if (!this.validateMethodSpecificDetails()) {
      return;
    }

    this.loanRepaymentService.recordPayment(this.selectedPaymentLoanId, {
      amount: this.autoMonthlyAmount,
      paymentMethod: this.selectedPaymentMethod,
      date: new Date().toISOString(),
      referenceNumber: this.paymentReference || undefined,
      notes: this.paymentNarration || undefined,
      receivedBy: this.cashReceiverName || undefined
    }).subscribe({
      next: () => {
        this.messages = [{
          severity: 'success',
          summary: 'Payment Recorded',
          detail: `Payment of ${this.formatCurrency(this.autoMonthlyAmount)} was recorded successfully.`
        }];
        this.closePaymentFormModal();
        this.loadLoanData();
      },
      error: () => {
        this.paymentFormError = 'Unable to process payment right now. Please try again.';
      }
    });
  }

  closeLoanFormModal(): void {
    this.showLoanForm = false;
  }

  toggleHistory(): void {
    this.showHistory = !this.showHistory;
  }

  onLoanSubmitted(): void {
    this.showLoanForm = false;
    this.loadLoanData();
    this.messages = [{
      severity: 'success',
      summary: 'Loan Submitted',
      detail: 'Your loan request has been submitted successfully.'
    }];
  }

  viewDetailedHistory(): void {
    if (this.uuid) {
      this.router.navigate(['/admin/hr/loan-management/employee-loan-history', this.employeeId, this.uuid], {
        state: { source: 'employee' }
      });
    } else {
      this.router.navigate(['/admin/hr/loan-management/employee-loan-history', this.employeeId, uuidV4()], {
        state: { source: 'employee' }
      });
    }
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/admin/hr/loan', uuidV4()]);
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  }

  getTotalRequests(): number {
    return this.allLoans.length;
  }

  getStatusDisplay(status: string): string {
    switch(status) {
      case 'PENDING': return 'Pending';
      case 'APPROVED': return 'Approved';
      case 'ACTIVE': return 'Active';
      case 'REJECTED': return 'Rejected';
      case 'COMPLETED': return 'Completed';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch(status) {
      case 'PENDING': return 'pending';
      case 'APPROVED': return 'approved';
      case 'ACTIVE': return 'active';
      case 'REJECTED': return 'rejected';
      case 'COMPLETED': return 'completed';
      default: return status.toLowerCase();
    }
  }

  viewLoanDetails(loan: LoanApplication): void {
    this.selectedLoanForDetails = loan;
    this.showLoanDetailsModal = true;
  }

  closeLoanDetailsModal(): void {
    this.showLoanDetailsModal = false;
    this.selectedLoanForDetails = null;
  }

  viewRepaymentSchedule(loan: LoanApplication): void {
    this.selectedLoanForSchedule = loan;
  }

  closeRepaymentSchedule(): void {
    this.selectedLoanForSchedule = null;
  }

  private refreshPayableLoans(): void {
    this.payableLoans = this.allLoans.filter(loan =>
      (loan.status === 'ACTIVE' || loan.status === 'APPROVED') && loan.currentBalance > 0
    );
  }

  private getDueAmountForLoan(loanId: string): number {
    const loan = this.allLoans.find(item => item.id === loanId);
    if (!loan) {
      return 0;
    }

    const pendingInstallment = [...(loan.repaymentSchedule || [])]
      .filter((item: RepaymentScheduleItem) => item.status === 'PENDING' || item.status === 'OVERDUE')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    if (pendingInstallment?.totalPayment) {
      return Number(pendingInstallment.totalPayment.toFixed(2));
    }

    if (loan.monthlyRepayment > 0) {
      return Number(loan.monthlyRepayment.toFixed(2));
    }

    return 0;
  }

  private validateMethodSpecificDetails(): boolean {
    switch (this.selectedPaymentMethod) {
      case 'BANK_TRANSFER':
        if (!this.bankName || !this.accountName || !this.accountNumber) {
          this.paymentFormError = 'Enter bank name, account name and account number.';
          return false;
        }
        return true;
      case 'CARD':
        if (!this.cardHolderName || !this.cardLast4) {
          this.paymentFormError = 'Enter card holder name and last 4 digits.';
          return false;
        }
        return true;
      case 'CASH':
        if (!this.cashReceiverName) {
          this.paymentFormError = 'Enter cash receiver name.';
          return false;
        }
        return true;
      case 'PAYROLL_DEDUCTION':
        if (!this.payrollCycle) {
          this.paymentFormError = 'Select payroll deduction cycle.';
          return false;
        }
        return true;
      default:
        return true;
    }
  }

  private resetPaymentForm(): void {
    this.selectedPaymentLoanId = '';
    this.autoMonthlyAmount = 0;
    this.selectedPaymentMethod = '';
    this.paymentReference = '';
    this.paymentNarration = '';
    this.bankName = '';
    this.accountName = '';
    this.accountNumber = '';
    this.cardHolderName = '';
    this.cardLast4 = '';
    this.cashReceiverName = '';
    this.payrollCycle = '';
    this.paymentFormError = '';
  }

  private refreshApplicationUpdates(): void {
    const updates = this.allLoans
      .flatMap(loan =>
        (loan.statusHistory || [])
          .filter(item => item.status !== 'PENDING')
          .map(item => ({
            loanId: loan.id,
            status: item.status,
            date: item.date,
            message: item.notes || `Loan ${loan.id} status updated to ${item.status}.`
          }))
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    this.applicationUpdates = updates;
  }
}
