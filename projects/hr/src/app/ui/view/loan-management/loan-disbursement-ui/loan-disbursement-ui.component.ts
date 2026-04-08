import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Message } from 'primeng/api';
import { v4 as uuidV4 } from 'uuid';
import { LoanApplication } from '../../../service/loan/loan.types';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { LoanApprovalService } from '../../../service/loan/loan-approval.service';
import { EmployeeLoanService } from '../../../service/loan/emoloyee-loan.service';
import { AdvanceDisbursementConfirmationService, CreateDisbursementPayload } from '../../../service/loan/loan-disbursement-confirmation.service';
import { resolveLoanTotalRepayableAmount } from '../../../service/loan/loan-display.util';
import { environment } from '../../../shared-component/environments/environment';

type QueueSortKey = 'loanId' | 'employee' | 'department' | 'amount' | 'approvedDate' | 'readyDate' | 'status';
type QueueSortDirection = 'asc' | 'desc';

interface LoanDisbursementViewState {
  approvedSearchTerm: string;
  readySearchTerm: string;
  approvedPage: number;
  readyPage: number;
  approvedSortKey: QueueSortKey;
  readySortKey: QueueSortKey;
  approvedSortDirection: QueueSortDirection;
  readySortDirection: QueueSortDirection;
}

@Component({
  selector: 'app-loan-disbursement-ui',
  templateUrl: './loan-disbursement-ui.component.html',
  styleUrls: ['./loan-disbursement-ui.component.scss']
})
export class LoanDisbursementUiComponent implements OnInit {
  private readonly defaultAccountingEmail = 'eseosehodion@gmail.com';
  private readonly viewStateStorageKeyPrefix = 'loan-disbursement-ui-state';
  readonly queuePageSize = 5;
  currentUuid = uuidV4();
  isLoading = true;
  messages: Message[] = [];

  approvedLoans: LoanApplication[] = [];
  readyForDisbursementLoans: LoanApplication[] = [];
  selectedDisbursementLoan: LoanApplication | null = null;
  selectedEmployeeDetails: any = null;
  approvedSearchTerm = '';
  readySearchTerm = '';
  approvedPage = 1;
  readyPage = 1;
  approvedSortKey: QueueSortKey = 'approvedDate';
  readySortKey: QueueSortKey = 'readyDate';
  approvedSortDirection: QueueSortDirection = 'desc';
  readySortDirection: QueueSortDirection = 'desc';
  
  // Email fields
  accountingEmail: string = this.defaultAccountingEmail;
  emailNotes: string = '';
  
  // Disbursement tracking
  disbursementInstructionReference: string = '';
  disbursementInitiatedAt: string = '';
  disbursementInitiatedBy: string = '';
  
  // Disbursement form fields (for API)
  disbursementAmount: number = 0;
  paymentMethod: 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | 'PAYROLL_DEDUCTION' = 'BANK_TRANSFER';
  disbursementReference: string = '';
  
  // Loading states
  isLoadingEmployeeDetails = false;
  isSubmittingDisbursement = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private loanApplicationService: LoanApplicationService,
    private loanApprovalService: LoanApprovalService,
    private employeeLoanService: EmployeeLoanService,
    private http: HttpClient,
    private disbursementConfirmationService: AdvanceDisbursementConfirmationService
  ) {}

  ngOnInit(): void {
    const routeUuid = this.route.snapshot.paramMap.get('uuid');
    if (routeUuid) {
      this.currentUuid = routeUuid;
    }
    this.restoreViewState();
    this.loadApprovedLoans();
  }

  loadApprovedLoans(): void {
    this.isLoading = true;
    this.loanApplicationService.getAllApplications().subscribe({
      next: applications => {
        const queuedLoans = applications
          .filter(loan => loan.status === 'APPROVED' || loan.status === 'READY_FOR_DISBURSEMENT')
          .sort((a, b) => new Date(b.approvedDate || b.requestDate).getTime() - new Date(a.approvedDate || a.requestDate).getTime());

        this.approvedLoans = queuedLoans.filter(loan => loan.status === 'APPROVED');
        this.readyForDisbursementLoans = queuedLoans.filter(loan => loan.status === 'READY_FOR_DISBURSEMENT');
        this.approvedPage = this.clampPage(this.approvedPage, this.getApprovedTotalPages());
        this.readyPage = this.clampPage(this.readyPage, this.getReadyTotalPages());
        this.isLoading = false;
      },
      error: () => {
        this.approvedLoans = [];
        this.readyForDisbursementLoans = [];
        this.isLoading = false;
      }
    });
  }

  selectLoan(loan: LoanApplication): void {
    this.selectedDisbursementLoan = loan;
    this.selectedEmployeeDetails = null;
    this.populateDisbursementTrackingFromLoan(loan);
    
    // Reset disbursement form
    this.disbursementAmount = loan.amount;
    this.paymentMethod = 'BANK_TRANSFER';
    this.disbursementReference = '';
    
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
    if (!this.selectedDisbursementLoan || !this.accountingEmail || this.isSubmittingDisbursement) {
      return;
    }
    
    // Record disbursement initiation
    this.disbursementInitiatedAt = new Date().toISOString();
    this.disbursementInitiatedBy = sessionStorage.getItem('fullname') || sessionStorage.getItem('username') || 'Admin';
    
    // Get approved amount
    const approvedAmount = this.getApprovedAmount(this.selectedDisbursementLoan);
    const totalRepayable = resolveLoanTotalRepayableAmount(this.selectedDisbursementLoan);
    
    this.isSubmittingDisbursement = true;
    
    // Step 1: Create disbursement confirmation record in API
    const payload: CreateDisbursementPayload = {
      loanId: this.selectedDisbursementLoan.id,
      disbursedAmount: approvedAmount,
      disbursementInstructionReference: this.disbursementInstructionReference,
      disbursementReference: this.disbursementReference || `PENDING-${this.disbursementInstructionReference}`,
      paymentMethod: this.paymentMethod,
      notes: this.emailNotes
    };
    
    this.disbursementConfirmationService.createConfirmation(payload).subscribe({
      next: (confirmation) => {
        console.log('Disbursement confirmation created:', confirmation);
        
        // Step 2: Send email to accounting
        const mailBody = this.buildAccountingMailBody(approvedAmount, totalRepayable);
        this.sendAccountingMail(mailBody).subscribe({
          next: () => {
            // Step 3: Update loan status to READY_FOR_DISBURSEMENT
            this.moveLoanToReadyForDisbursement();
          },
          error: (error) => {
            console.error('Error sending disbursement request email:', error);
            this.messages = [{
              severity: 'error',
              summary: 'Email Failed',
              detail: `The disbursement email could not be sent to ${this.accountingEmail}.`
            }];
            this.isSubmittingDisbursement = false;
          }
        });
      },
      error: (error) => {
        console.error('Error creating disbursement confirmation:', error);
        this.messages = [{
          severity: 'error',
          summary: 'Disbursement Record Failed',
          detail: 'Failed to record disbursement in the system.'
        }];
        this.isSubmittingDisbursement = false;
      }
    });
  }

  private moveLoanToReadyForDisbursement(): void {
    if (!this.selectedDisbursementLoan) {
      this.isSubmittingDisbursement = false;
      return;
    }

    this.loanApprovalService.updateApplicationStatus(this.selectedDisbursementLoan.id, {
      status: 'READY_FOR_DISBURSEMENT',
      changedAt: this.disbursementInitiatedAt,
      disbursementInitiatedAt: this.disbursementInitiatedAt,
      disbursementInitiatedBy: this.getCurrentUserId(),
      disbursementInstructionReference: this.disbursementInstructionReference,
      notes: this.emailNotes?.trim()
        ? `Sent to accounting for disbursement. Reference: ${this.disbursementInstructionReference}. ${this.emailNotes.trim()}`
        : `Sent to accounting for disbursement. Reference: ${this.disbursementInstructionReference}.`
    }).subscribe({
      next: (updatedLoan) => {
        // Update the selected loan with additional properties
        this.selectedDisbursementLoan = updatedLoan;
        (this.selectedDisbursementLoan as any).disbursementInitiatedAt = this.disbursementInitiatedAt;
        (this.selectedDisbursementLoan as any).disbursementInitiatedBy = this.disbursementInitiatedBy;
        (this.selectedDisbursementLoan as any).disbursementInstructionReference = this.disbursementInstructionReference;
        
        this.replaceQueueLoan(updatedLoan);
        this.messages = [{
          severity: 'success',
          summary: 'Request Sent',
          detail: `Disbursement request sent to ${this.accountingEmail}. Reference: ${this.disbursementInstructionReference}`
        }];
        this.isSubmittingDisbursement = false;
      },
      error: (error) => {
        console.error('Error updating loan disbursement status:', error);
        this.messages = [{
          severity: 'error',
          summary: 'Update Failed',
          detail: 'The request was prepared, but the loan status could not be moved to ready for disbursement.'
        }];
        this.isSubmittingDisbursement = false;
      }
    });
  }

  markAsDisbursed(): void {
    if (!this.selectedDisbursementLoan || this.isSubmittingDisbursement) {
      return;
    }

    this.isSubmittingDisbursement = true;
    const disbursedAt = new Date().toISOString();
    
    // Update the disbursement confirmation record
    this.disbursementConfirmationService.getConfirmationByLoanId(this.selectedDisbursementLoan.id).subscribe({
      next: (confirmation) => {
        if (confirmation && confirmation.id) {
          this.disbursementConfirmationService.updateConfirmation(confirmation.id, {
            disbursementConfirmedAt: disbursedAt,
            disbursementConfirmedBy: this.getCurrentUserId(),
            disbursementReference: this.disbursementReference || confirmation.disbursementReference,
            notes: `Disbursement completed on ${new Date(disbursedAt).toLocaleString()}`
          }).subscribe({
            next: () => console.log('Disbursement confirmation updated'),
            error: (err) => console.error('Error updating confirmation:', err)
          });
        }
        
        // Update loan status to ACTIVE
        this.loanApprovalService.updateApplicationStatus(this.selectedDisbursementLoan!.id, {
          status: 'ACTIVE',
          changedAt: disbursedAt,
          notes: `Loan disbursed successfully. Reference: ${this.disbursementInstructionReference || 'N/A'}.`,
          repaymentStartDate: this.selectedDisbursementLoan?.repaymentStartDate,
          repaymentDay: this.selectedDisbursementLoan?.repaymentDay
        } as any).subscribe({
          next: (updatedLoan) => {
            this.selectedDisbursementLoan = updatedLoan;
            (this.selectedDisbursementLoan as any).disbursementInitiatedAt = this.disbursementInitiatedAt || disbursedAt;
            (this.selectedDisbursementLoan as any).disbursementInitiatedBy = this.disbursementInitiatedBy || (sessionStorage.getItem('fullname') || sessionStorage.getItem('username') || 'Admin');
            (this.selectedDisbursementLoan as any).disbursementInstructionReference = this.disbursementInstructionReference;
            
            this.replaceQueueLoan(updatedLoan);
            this.messages = [{
              severity: 'success',
              summary: 'Loan Disbursed',
              detail: `Loan ${updatedLoan.loanCode || updatedLoan.id} has been marked as disbursed.`
            }];
            this.isSubmittingDisbursement = false;
            this.loadApprovedLoans();
          },
          error: (error) => {
            console.error('Error marking loan as disbursed:', error);
            this.messages = [{
              severity: 'error',
              summary: 'Disbursement Failed',
              detail: 'Unable to move the loan to active status.'
            }];
            this.isSubmittingDisbursement = false;
          }
        });
      },
      error: () => {
        // If no confirmation record exists, just update the loan
        this.loanApprovalService.updateApplicationStatus(this.selectedDisbursementLoan!.id, {
          status: 'ACTIVE',
          changedAt: disbursedAt,
          notes: `Loan disbursed successfully. Reference: ${this.disbursementInstructionReference || 'N/A'}.`,
          repaymentStartDate: this.selectedDisbursementLoan?.repaymentStartDate,
          repaymentDay: this.selectedDisbursementLoan?.repaymentDay
        } as any).subscribe({
          next: (updatedLoan) => {
            this.selectedDisbursementLoan = updatedLoan;
            this.replaceQueueLoan(updatedLoan);
            this.messages = [{
              severity: 'success',
              summary: 'Loan Disbursed',
              detail: `Loan ${updatedLoan.loanCode || updatedLoan.id} has been marked as disbursed.`
            }];
            this.isSubmittingDisbursement = false;
            this.loadApprovedLoans();
          },
          error: (error) => {
            console.error('Error marking loan as disbursed:', error);
            this.messages = [{
              severity: 'error',
              summary: 'Disbursement Failed',
              detail: 'Unable to move the loan to active status.'
            }];
            this.isSubmittingDisbursement = false;
          }
        });
      }
    });
  }
  
  getApprovedByName(): string {
    const approvedBy = this.selectedDisbursementLoan?.approvedBy;
    if (typeof approvedBy === 'object' && approvedBy !== null) {
      return approvedBy.fullname || approvedBy.username || 'Unknown';
    }
    return 'Unknown';
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
    return this.getApprovedQueueTotal() + this.getReadyForDisbursementTotal();
  }

  getApprovedQueueTotal(): number {
    return this.approvedLoans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
  }

  getReadyForDisbursementTotal(): number {
    return this.readyForDisbursementLoans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
  }

  getFilteredApprovedLoans(): LoanApplication[] {
    return this.sortQueue(
      this.filterQueue(this.approvedLoans, this.approvedSearchTerm),
      this.approvedSortKey,
      this.approvedSortDirection
    );
  }

  getFilteredReadyForDisbursementLoans(): LoanApplication[] {
    return this.sortQueue(
      this.filterQueue(this.readyForDisbursementLoans, this.readySearchTerm),
      this.readySortKey,
      this.readySortDirection
    );
  }

  getPaginatedApprovedLoans(): LoanApplication[] {
    return this.paginateQueue(this.getFilteredApprovedLoans(), this.approvedPage);
  }

  getPaginatedReadyForDisbursementLoans(): LoanApplication[] {
    return this.paginateQueue(this.getFilteredReadyForDisbursementLoans(), this.readyPage);
  }

  getFilteredApprovedTotal(): number {
    return this.getFilteredApprovedLoans().reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
  }

  getFilteredReadyForDisbursementTotal(): number {
    return this.getFilteredReadyForDisbursementLoans().reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
  }

  getApprovedTotalPages(): number {
    return this.getTotalPages(this.getFilteredApprovedLoans().length);
  }

  getReadyTotalPages(): number {
    return this.getTotalPages(this.getFilteredReadyForDisbursementLoans().length);
  }

  onApprovedSearchChange(value: string): void {
    this.approvedSearchTerm = value;
    this.approvedPage = 1;
    this.persistViewState();
  }

  onReadySearchChange(value: string): void {
    this.readySearchTerm = value;
    this.readyPage = 1;
    this.persistViewState();
  }

  goToApprovedPage(page: number): void {
    this.approvedPage = this.clampPage(page, this.getApprovedTotalPages());
    this.persistViewState();
  }

  goToReadyPage(page: number): void {
    this.readyPage = this.clampPage(page, this.getReadyTotalPages());
    this.persistViewState();
  }

  setApprovedSort(key: QueueSortKey): void {
    if (this.approvedSortKey === key) {
      this.approvedSortDirection = this.approvedSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.approvedSortKey = key;
      this.approvedSortDirection = key === 'amount' ? 'desc' : 'asc';
      if (key === 'approvedDate') {
        this.approvedSortDirection = 'desc';
      }
    }

    this.approvedPage = 1;
    this.persistViewState();
  }

  setReadySort(key: QueueSortKey): void {
    if (this.readySortKey === key) {
      this.readySortDirection = this.readySortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.readySortKey = key;
      this.readySortDirection = key === 'amount' ? 'desc' : 'asc';
      if (key === 'readyDate') {
        this.readySortDirection = 'desc';
      }
    }

    this.readyPage = 1;
    this.persistViewState();
  }

  isApprovedSort(key: QueueSortKey): boolean {
    return this.approvedSortKey === key;
  }

  isReadySort(key: QueueSortKey): boolean {
    return this.readySortKey === key;
  }

  getApprovedSortDirection(key: QueueSortKey): QueueSortDirection | null {
    return this.approvedSortKey === key ? this.approvedSortDirection : null;
  }

  getReadySortDirection(key: QueueSortKey): QueueSortDirection | null {
    return this.readySortKey === key ? this.readySortDirection : null;
  }

  getApprovedResultsLabel(): string {
    return this.buildResultsLabel(this.getFilteredApprovedLoans().length, this.approvedPage);
  }

  getReadyResultsLabel(): string {
    return this.buildResultsLabel(this.getFilteredReadyForDisbursementLoans().length, this.readyPage);
  }

  hasQueueLoans(): boolean {
    return this.approvedLoans.length > 0 || this.readyForDisbursementLoans.length > 0;
  }

  getLoanTotalRepayable(loan: LoanApplication): number {
    return resolveLoanTotalRepayableAmount(loan);
  }
  
  getApprovedAmount(loan: LoanApplication): number {
    return (loan as any).approvedAmount || loan.amount;
  }

  getQueueStatusLabel(loan: LoanApplication): string {
    return loan.status === 'READY_FOR_DISBURSEMENT' ? 'READY FOR DISBURSEMENT' : 'APPROVED';
  }

  getQueueStatusClass(loan: LoanApplication): string {
    return loan.status === 'READY_FOR_DISBURSEMENT' ? 'status-ready_for_disbursement' : 'status-approved';
  }

  getReadyForDisbursementDate(loan: LoanApplication): string | null {
    const readyEntry = [...(loan.statusHistory || [])]
      .filter((entry) => entry.status === 'READY_FOR_DISBURSEMENT' && !!entry.changedAt)
      .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime())[0];

    return readyEntry?.changedAt || loan.approvedDate || loan.requestDate || null;
  }

  private getCurrentUserId(): number {
    const storedUserId = String(sessionStorage.getItem('userid') || localStorage.getItem('userid') || '').trim();
    const parsedUserId = Number(storedUserId);
    return Number.isFinite(parsedUserId) ? parsedUserId : 0;
  }

  private replaceQueueLoan(updatedLoan: LoanApplication): void {
    const matchesLoan = (loan: LoanApplication) =>
      loan.id === updatedLoan.id || loan.loanCode === updatedLoan.loanCode;

    this.approvedLoans = this.approvedLoans.filter((loan) => !matchesLoan(loan));
    this.readyForDisbursementLoans = this.readyForDisbursementLoans.filter((loan) => !matchesLoan(loan));

    if (updatedLoan.status === 'APPROVED') {
      this.approvedLoans = this.sortQueueLoans([...this.approvedLoans, updatedLoan]);
      this.approvedPage = this.clampPage(this.approvedPage, this.getApprovedTotalPages());
      this.readyPage = this.clampPage(this.readyPage, this.getReadyTotalPages());
      this.persistViewState();
      return;
    }

    if (updatedLoan.status === 'READY_FOR_DISBURSEMENT') {
      this.readyForDisbursementLoans = this.sortQueueLoans([...this.readyForDisbursementLoans, updatedLoan]);
    }

    this.approvedPage = this.clampPage(this.approvedPage, this.getApprovedTotalPages());
    this.readyPage = this.clampPage(this.readyPage, this.getReadyTotalPages());
    this.persistViewState();
  }

  private sortQueueLoans(loans: LoanApplication[]): LoanApplication[] {
    return [...loans].sort((a, b) =>
      new Date(b.approvedDate || b.requestDate).getTime() - new Date(a.approvedDate || a.requestDate).getTime()
    );
  }

  private sortQueue(loans: LoanApplication[], key: QueueSortKey, direction: QueueSortDirection): LoanApplication[] {
    const directionMultiplier = direction === 'asc' ? 1 : -1;

    return [...loans].sort((left, right) => {
      const leftValue = this.resolveSortValue(left, key);
      const rightValue = this.resolveSortValue(right, key);

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return (leftValue - rightValue) * directionMultiplier;
      }

      return String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: 'base' }) * directionMultiplier;
    });
  }

  private filterQueue(loans: LoanApplication[], term: string): LoanApplication[] {
    const query = term.trim().toLowerCase();

    if (!query) {
      return loans;
    }

    return loans.filter((loan) => {
      const searchableValues = [
        loan.loanCode,
        loan.fullName,
        loan.department,
        loan.purpose,
        String(loan.employeeId || ''),
        loan.status
      ];

      return searchableValues.some((value) => String(value || '').toLowerCase().includes(query));
    });
  }

  private paginateQueue(loans: LoanApplication[], page: number): LoanApplication[] {
    const safePage = this.clampPage(page, this.getTotalPages(loans.length));
    const startIndex = (safePage - 1) * this.queuePageSize;
    return loans.slice(startIndex, startIndex + this.queuePageSize);
  }

  private getTotalPages(totalItems: number): number {
    return Math.max(1, Math.ceil(totalItems / this.queuePageSize));
  }

  private clampPage(page: number, totalPages: number): number {
    return Math.min(Math.max(page, 1), Math.max(totalPages, 1));
  }

  private buildResultsLabel(totalItems: number, page: number): string {
    if (!totalItems) {
      return 'Showing 0 results';
    }

    const safePage = this.clampPage(page, this.getTotalPages(totalItems));
    const start = (safePage - 1) * this.queuePageSize + 1;
    const end = Math.min(start + this.queuePageSize - 1, totalItems);
    return `Showing ${start}-${end} of ${totalItems}`;
  }

  private resolveSortValue(loan: LoanApplication, key: QueueSortKey): string | number {
    switch (key) {
      case 'loanId':
        return String(loan.loanCode || loan.id || '');
      case 'employee':
        return String(loan.fullName || '');
      case 'department':
        return String(loan.department || '');
      case 'amount':
        return Number(loan.amount || 0);
      case 'readyDate':
        return new Date(this.getReadyForDisbursementDate(loan) || 0).getTime();
      case 'status':
        return String(loan.status || '');
      case 'approvedDate':
      default:
        return new Date(loan.approvedDate || loan.requestDate || 0).getTime();
    }
  }

  private persistViewState(): void {
    const state: LoanDisbursementViewState = {
      approvedSearchTerm: this.approvedSearchTerm,
      readySearchTerm: this.readySearchTerm,
      approvedPage: this.approvedPage,
      readyPage: this.readyPage,
      approvedSortKey: this.approvedSortKey,
      readySortKey: this.readySortKey,
      approvedSortDirection: this.approvedSortDirection,
      readySortDirection: this.readySortDirection
    };

    sessionStorage.setItem(this.getViewStateStorageKey(), JSON.stringify(state));
  }

  private restoreViewState(): void {
    const rawState = sessionStorage.getItem(this.getViewStateStorageKey());

    if (!rawState) {
      return;
    }

    try {
      const state = JSON.parse(rawState) as Partial<LoanDisbursementViewState>;
      this.approvedSearchTerm = state.approvedSearchTerm || '';
      this.readySearchTerm = state.readySearchTerm || '';
      this.approvedPage = Number.isFinite(state.approvedPage) ? Number(state.approvedPage) : 1;
      this.readyPage = Number.isFinite(state.readyPage) ? Number(state.readyPage) : 1;
      this.approvedSortKey = state.approvedSortKey || 'approvedDate';
      this.readySortKey = state.readySortKey || 'readyDate';
      this.approvedSortDirection = state.approvedSortDirection || 'desc';
      this.readySortDirection = state.readySortDirection || 'desc';
    } catch {
      sessionStorage.removeItem(this.getViewStateStorageKey());
    }
  }

  private getViewStateStorageKey(): string {
    return `${this.viewStateStorageKeyPrefix}:${this.currentUuid}`;
  }

  private populateDisbursementTrackingFromLoan(loan: LoanApplication): void {
    this.accountingEmail = this.defaultAccountingEmail;
    this.emailNotes = '';

    const readyEntry = [...(loan.statusHistory || [])]
      .filter((entry) => entry.status === 'READY_FOR_DISBURSEMENT' && !!entry.changedAt)
      .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime())[0];

    if (readyEntry) {
      this.disbursementInitiatedAt = readyEntry.changedAt;
      this.disbursementInitiatedBy = typeof readyEntry.changedBy === 'string'
        ? readyEntry.changedBy
        : 'Admin';
      const referenceMatch = String(readyEntry.notes || '').match(/Reference:\s*([^\.]+)/i);
      this.disbursementInstructionReference = referenceMatch?.[1]?.trim() || this.disbursementInstructionReference || '';
      if (!this.disbursementInstructionReference) {
        this.generateDisbursementReference();
      }
      return;
    }

    this.disbursementInitiatedAt = '';
    this.disbursementInitiatedBy = '';
    this.generateDisbursementReference();
  }

  private sendAccountingMail(body: { name: string; recieverEmail: string; subject: string; body: string }) {
    const rawApiKey = String(environment.apiKey || '').trim();
    const apiKey = rawApiKey.startsWith('ApiKey ') ? rawApiKey : `ApiKey ${rawApiKey}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    });

    return this.http.post(
      'https://automation.optimaxsuites.com/webhook/735f4d81-3f63-4390-9b03-098be2a31469',
      body,
      { headers }
    );
  }

  private buildAccountingMailBody(approvedAmount: number, totalRepayable: number): { name: string; recieverEmail: string; subject: string; body: string } {
    const loanId = this.selectedDisbursementLoan?.loanCode || this.selectedDisbursementLoan?.id || '';
    const employeeName = this.selectedDisbursementLoan?.fullName || 'Employee';
    const employeeEmail = this.selectedEmployeeDetails?.email || this.selectedEmployeeDetails?.workEmail || 'N/A';
    const accountName = `${this.selectedEmployeeDetails?.firstName || ''} ${this.selectedEmployeeDetails?.lastName || ''}`.trim() || employeeName;

    return {
      name: 'Accounting Team',
      recieverEmail: this.accountingEmail,
      subject: `Loan Disbursement Request - ${loanId}`,
      body: `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333;">
          <p>Dear Accounting Team,</p>

          <p>
            A loan has been approved and is ready for disbursement processing. Please review the details below.
          </p>

          <ul>
            <li><strong>Loan ID:</strong> ${loanId}</li>
            <li><strong>Employee:</strong> ${employeeName}</li>
            <li><strong>Employee ID:</strong> ${this.selectedDisbursementLoan?.employeeId || 'N/A'}</li>
            <li><strong>Employee Email:</strong> ${employeeEmail}</li>
            <li><strong>Department:</strong> ${this.selectedDisbursementLoan?.department || 'N/A'}</li>
            <li><strong>Approved Amount:</strong> ${this.formatCurrency(approvedAmount)}</li>
            <li><strong>Interest Rate:</strong> ${this.selectedDisbursementLoan?.interestRate || 0}%</li>
            <li><strong>Total Repayable:</strong> ${this.formatCurrency(totalRepayable)}</li>
            <li><strong>Repayment Period:</strong> ${this.selectedDisbursementLoan?.repaymentTime || 0} months</li>
            <li><strong>Mode of Payment:</strong> ${this.selectedDisbursementLoan?.modeOfPayment === 'MONTHLY' ? 'Monthly Installments' : 'One-off Payment'}</li>
            <li><strong>Purpose:</strong> ${this.selectedDisbursementLoan?.purpose || 'N/A'}</li>
            <li><strong>Approved Date:</strong> ${this.formatDate(this.selectedDisbursementLoan?.approvedDate)}</li>
            <li><strong>Approved By:</strong> ${this.getApprovedByName()}</li>
            <li><strong>Bank Name:</strong> ${this.selectedEmployeeDetails?.bankName || 'N/A'}</li>
            <li><strong>Account Number:</strong> ${this.selectedEmployeeDetails?.accountNumber || 'N/A'}</li>
            <li><strong>Account Name:</strong> ${accountName}</li>
            <li><strong>Disbursement Reference:</strong> ${this.disbursementInstructionReference}</li>
            <li><strong>Payment Method:</strong> ${this.paymentMethod.replace('_', ' ')}</li>
            <li><strong>Initiated By:</strong> ${this.disbursementInitiatedBy}</li>
            <li><strong>Initiated At:</strong> ${this.formatDate(this.disbursementInitiatedAt)}</li>
          </ul>

          ${this.emailNotes?.trim() ? `<p><strong>Additional Notes:</strong> ${this.emailNotes.trim()}</p>` : ''}
          ${this.selectedDisbursementLoan?.adminComment?.trim() ? `<p><strong>Admin Comment:</strong> ${this.selectedDisbursementLoan.adminComment}</p>` : ''}

          <p>Please process this disbursement and confirm once completed.</p>

          <br/>

          <p>Regards,<br/>
          <strong>HR Management</strong></p>

          <hr style="border:none; border-top:1px solid #eee; margin:20px 0;" />

          <p style="font-size:12px; color:#777;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `
    };
  }
}