import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Message } from 'primeng/api';
import { v4 as uuidV4 } from 'uuid';
import { LoanApplication } from '../../../service/loan/loan.types';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { EmployeeLoanService } from '../../../service/loan/emoloyee-loan.service'; 
import { resolveLoanTotalRepayableAmount } from '../../../service/loan/loan-display.util';

@Component({
  selector: 'app-loan-disbursement-ui',
  templateUrl: './loan-disbursement-ui.component.html',
  styleUrls: ['./loan-disbursement-ui.component.scss']
})
export class LoanDisbursementUiComponent implements OnInit {
  currentUuid = uuidV4();
  isLoading = true;
  messages: Message[] = [];

  approvedLoans: LoanApplication[] = [];
  selectedDisbursementLoan: LoanApplication | null = null;
  selectedEmployeeDetails: any = null;
  
  // Email fields
  accountingEmail: string = '';
  emailNotes: string = '';
  
  // Disbursement tracking
  disbursementInstructionReference: string = '';
  disbursementInitiatedAt: string = '';
  disbursementInitiatedBy: string = '';
  
  // Loading states
  isLoadingEmployeeDetails = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private loanApplicationService: LoanApplicationService,
    private employeeLoanService: EmployeeLoanService
  ) {}

  ngOnInit(): void {
    const routeUuid = this.route.snapshot.paramMap.get('uuid');
    if (routeUuid) {
      this.currentUuid = routeUuid;
    }
    this.loadApprovedLoans();
  }

  loadApprovedLoans(): void {
    this.isLoading = true;
    this.loanApplicationService.getAllApplications().subscribe({
      next: applications => {
        this.approvedLoans = applications
          .filter(loan => loan.status === 'APPROVED')
          .sort((a, b) => new Date(b.approvedDate || b.requestDate).getTime() - new Date(a.approvedDate || a.requestDate).getTime());
        this.isLoading = false;
      },
      error: () => {
        this.approvedLoans = [];
        this.isLoading = false;
      }
    });
  }

  selectLoan(loan: LoanApplication): void {
    this.selectedDisbursementLoan = loan;
    this.selectedEmployeeDetails = null;
    
    // Reset email fields when new loan is selected
    this.accountingEmail = '';
    this.emailNotes = '';
    
    // Generate new disbursement instruction reference
    this.generateDisbursementReference();
    
    // Load employee details including bank info
    this.loadEmployeeDetails(loan.employeeId);
  }
  
  generateDisbursementReference(): void {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 10000);
    this.disbursementInstructionReference = `DISB-${timestamp}-${random}`;
  }
  
  loadEmployeeDetails(employeeId: number): void {
    this.isLoadingEmployeeDetails = true;
    this.employeeLoanService.getEmployeeById(employeeId).subscribe({
      next: (employee) => {
        this.selectedEmployeeDetails = employee;
        console.log('Employee details:', employee);
        this.isLoadingEmployeeDetails = false;
      },
      error: (error) => {
        console.error('Error loading employee details:', error);
        this.isLoadingEmployeeDetails = false;
      }
    });
  }

  sendToAccounting(): void {
    if (!this.selectedDisbursementLoan || !this.accountingEmail) {
      return;
    }
    
    // Record disbursement initiation
    this.disbursementInitiatedAt = new Date().toISOString();
    this.disbursementInitiatedBy = sessionStorage.getItem('fullname') || sessionStorage.getItem('username') || 'Admin';
    
    // Get approved amount (use loan amount as default until approved amount field is added)
    const approvedAmount = (this.selectedDisbursementLoan as any).approvedAmount || this.selectedDisbursementLoan.amount;
    const totalRepayable = resolveLoanTotalRepayableAmount(this.selectedDisbursementLoan);
    
    // Prepare email data
    const emailData = {
      to: this.accountingEmail,
      cc: this.selectedEmployeeDetails?.email,
      subject: `Loan Disbursement Request - ${this.selectedDisbursementLoan.loanCode || this.selectedDisbursementLoan.id}`,
      disbursementReference: this.disbursementInstructionReference,
      initiatedBy: this.disbursementInitiatedBy,
      initiatedAt: this.disbursementInitiatedAt,
      loanDetails: {
        loanId: this.selectedDisbursementLoan.loanCode || this.selectedDisbursementLoan.id,
        employeeName: this.selectedDisbursementLoan.fullName,
        employeeId: this.selectedDisbursementLoan.employeeId,
        employeeEmail: this.selectedEmployeeDetails?.email || this.selectedEmployeeDetails?.workEmail,
        department: this.selectedDisbursementLoan.department,
        bankName: this.selectedEmployeeDetails?.bankName,
        accountNumber: this.selectedEmployeeDetails?.accountNumber,
        accountName: `${this.selectedEmployeeDetails?.firstName} ${this.selectedEmployeeDetails?.lastName}`,
        approvedAmount: approvedAmount,
        interestRate: this.selectedDisbursementLoan.interestRate,
        totalRepayable: totalRepayable,
        repaymentTime: this.selectedDisbursementLoan.repaymentTime,
        modeOfPayment: this.selectedDisbursementLoan.modeOfPayment,
        purpose: this.selectedDisbursementLoan.purpose,
        adminComment: this.selectedDisbursementLoan.adminComment,
        approvedDate: this.selectedDisbursementLoan.approvedDate,
        approvedBy: this.getApprovedByName(),
        notes: this.emailNotes
      }
    };

    console.log('Sending to accounting:', emailData);
    
    // Here you would call an email service API
    this.messages = [{
      severity: 'success',
      summary: 'Request Sent',
      detail: `Disbursement request sent to ${this.accountingEmail}. Reference: ${this.disbursementInstructionReference}`
    }];
    
    // Optionally, you could update the loan status or save the disbursement record
    this.updateLoanDisbursementInitiated();
  }
  
  getApprovedByName(): string {
    const approvedBy = this.selectedDisbursementLoan?.approvedBy;
    if (typeof approvedBy === 'object' && approvedBy !== null) {
      return approvedBy.fullname || approvedBy.username || 'Unknown';
    }
    return 'Unknown';
  }
  
  updateLoanDisbursementInitiated(): void {
    if (!this.selectedDisbursementLoan) return;
    
    // Update the loan with disbursement initiation info
    const updatedLoan = {
      ...this.selectedDisbursementLoan,
      disbursementInitiatedAt: this.disbursementInitiatedAt,
      disbursementInitiatedBy: this.disbursementInitiatedBy,
      disbursementInstructionReference: this.disbursementInstructionReference
    };
    
    this.loanApplicationService.saveApplication(updatedLoan).subscribe({
      next: () => {
        console.log('Loan updated with disbursement initiation info');
      },
      error: (error) => {
        console.error('Error updating loan:', error);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/hr/loan', this.currentUuid]);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount);
  }

  formatDate(value?: string | null): string {
    if (!value) return 'N/A';
    return new Date(value).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getQueuedDisbursementTotal(): number {
    return this.approvedLoans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
  }

  getLoanTotalRepayable(loan: LoanApplication): number {
    return resolveLoanTotalRepayableAmount(loan);
  }
  
  getApprovedAmount(loan: LoanApplication): number {
    return (loan as any).approvedAmount || loan.amount;
  }
}