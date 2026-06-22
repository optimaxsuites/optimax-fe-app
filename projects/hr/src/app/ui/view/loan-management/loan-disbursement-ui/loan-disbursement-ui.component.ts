import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { Message } from 'primeng/api';
import { v4 as uuidV4 } from 'uuid';
import { LoanApplication } from '../../../service/loan/loan.types';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { LoanApprovalService } from '../../../service/loan/loan-approval.service';
import { EmployeeLoanService } from '../../../service/loan/emoloyee-loan.service';
import { AdvanceDisbursementConfirmationService, CreateDisbursementPayload } from '../../../service/loan/loan-disbursement-confirmation.service';
import { resolveLoanTotalRepayableAmount, formatAdvancedLoanCode } from '../../../service/loan/loan-display.util';
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
  styleUrls: ['./loan-disbursement-ui.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class LoanDisbursementUiComponent implements OnInit {
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
  emailNotes: string = '';
  emailNotesError: boolean = false;
  
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
  
  // ============================================
  // NEW: Modal visibility flags
  // ============================================
  isSendToAccountingModalVisible = false;
  isLoanDetailsModalVisible = false;
  
  // ============================================
  // NEW: Progress tracking for sending
  // ============================================
  submissionProgress: number = 0;
  
  private loanDetailsCache: Map<number, LoanApplication> = new Map();
  private employeeDetailsCache: Map<number, any> = new Map();

  // Batch selection state
  batchSelectedLoanIds: Set<number> = new Set();
  batchViewIndex: number = 0;
  batchEmployeeDetailsMap: Map<number, any> = new Map();
  private batchLoanNotesMap: Map<number, string> = new Map();
  private batchLoanReferenceMap: Map<number, string> = new Map();

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

  // ============================================
  // NEW: Helper method to generate unique reference
  // ============================================
  generateUniqueDisbursementReference(loan: LoanApplication): string {
    const loanCode = this.getFormattedLoanCode(loan);
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const uuid = uuidV4().substring(0, 8);
    return `DISB-${loanCode}-${timestamp}-${random}-${uuid}`;
  }

  // ============================================
  // NEW: Generate disbursement reference
  // ============================================
  generateDisbursementReference(): void {
    if (this.selectedDisbursementLoan) {
      this.disbursementInstructionReference = this.generateUniqueDisbursementReference(this.selectedDisbursementLoan);
    }
  }

  loadApprovedLoans(): void {
    this.isLoading = true;
    this.loanApplicationService.getAllApplications().subscribe({
      next: applications => {
        const queuedLoans = applications
          .filter(loan => loan.status === 'APPROVED' || loan.status === 'READY_FOR_DISBURSEMENT')
          .sort((a, b) => new Date(b.approvedDate || b.requestDate).getTime() - new Date(a.approvedDate || a.requestDate).getTime());

        queuedLoans.forEach((loan) => {
          this.loanDetailsCache.set(loan.id, loan);
        });

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

  // ============================================
  // MODIFIED: Updated to open modal instead of sidebar
  // ============================================
  selectLoan(loan: LoanApplication, skipServerRefresh = false): void {
    const localLoan = this.loanDetailsCache.get(loan.id) || loan;

    // Render immediately from local/cache for responsive UI.
    this.applySelectedLoan(localLoan);
    this.loadEmployeeDetails(localLoan.employeeId);

    // Open the loan details modal
    this.isLoanDetailsModalVisible = true;

    if (skipServerRefresh) {
      return;
    }

    // Refresh latest details in the background.
    this.loanApplicationService.getApplicationById(String(loan.id)).subscribe({
      next: (freshLoan) => {
        if (!freshLoan) {
          return;
        }

        this.loanDetailsCache.set(freshLoan.id, freshLoan);

        // Only update panel if the same loan is still selected.
        if (this.selectedDisbursementLoan?.id !== loan.id) {
          return;
        }

        this.applySelectedLoan(freshLoan);
        this.loadEmployeeDetails(freshLoan.employeeId);
      },
      error: () => {
        // Keep already-rendered local details on error.
      }
    });
  }

  toggleLoanSelection(loan: LoanApplication): void {
    if (this.selectedDisbursementLoan?.id === loan.id) {
      this.clearSelectedLoan();
      return;
    }
    this.selectLoan(loan);
  }

  openLoanDetailsModal(loan: LoanApplication): void {
    this.selectLoan(loan);
  }

  openBatchLoanDetailsModal(): void {
    const loans = this.batchSelectedLoans;
    if (!loans.length) {
      return;
    }

    this.batchViewIndex = 0;
    const currentLoan = loans[0];
    this.selectedDisbursementLoan = currentLoan;
    this.loadEmployeeDetails(currentLoan.employeeId);
    this.populateDisbursementTrackingFromLoan(currentLoan);
    this.isLoanDetailsModalVisible = true;
  }

  private applySelectedLoan(loan: LoanApplication): void {
    this.selectedDisbursementLoan = loan;
    this.selectedEmployeeDetails = null;
    this.populateDisbursementTrackingFromLoan(loan);

    // Reset disbursement form when active loan changes.
    this.disbursementAmount = loan.amount;
    this.paymentMethod = 'BANK_TRANSFER';
    this.disbursementReference = '';
    this.emailNotesError = false;
    this.isSendToAccountingModalVisible = false;
  }

  // ============================================
  // NEW: Clear selected loan
  // ============================================
  private clearSelectedLoan(): void {
    this.selectedDisbursementLoan = null;
    this.selectedEmployeeDetails = null;
    this.disbursementInstructionReference = '';
    this.disbursementInitiatedAt = '';
    this.disbursementInitiatedBy = '';
    this.disbursementAmount = 0;
    this.disbursementReference = '';
    this.emailNotes = '';
    this.emailNotesError = false;
    this.isSendToAccountingModalVisible = false;
    this.isLoanDetailsModalVisible = false;
  }

  // ============================================
  // NEW: Close loan details modal
  // ============================================
  closeLoanDetailsModal(): void {
    this.isLoanDetailsModalVisible = false;
    // Don't clear selected loan immediately to avoid flicker
    setTimeout(() => {
      if (!this.isSendToAccountingModalVisible) {
        this.selectedDisbursementLoan = null;
        this.selectedEmployeeDetails = null;
      }
    }, 300);
  }

  // ============================================
  // NEW: Open send to accounting modal
  // ============================================
  openSendToAccountingModal(): void {
    if (this.isBatchMode) {
      const allApproved = this.batchSelectedLoans.every(l => l.status === 'APPROVED');
      if (!allApproved) return;

      this.batchViewIndex = Math.min(this.batchViewIndex, Math.max(0, this.batchSelectedLoans.length - 1));
      const currentLoan = this.batchSelectedLoans[this.batchViewIndex];
      if (currentLoan) {
        this.selectedDisbursementLoan = currentLoan;
        this.loadEmployeeDetails(currentLoan.employeeId);
      }

      this.emailNotesError = false;
      this.isSendToAccountingModalVisible = true;
      this.submissionProgress = 0;
      return;
    }

    if (!this.selectedDisbursementLoan || this.selectedDisbursementLoan.status !== 'APPROVED') {
      return;
    }

    if (!this.disbursementInstructionReference) {
      this.disbursementInstructionReference = this.generateUniqueDisbursementReference(this.selectedDisbursementLoan);
    }

    this.emailNotesError = false;
    this.isSendToAccountingModalVisible = true;
    this.submissionProgress = 0;
  }

  // ============================================
  // NEW: Close send to accounting modal
  // ============================================
  closeSendToAccountingModal(): void {
    if (!this.isSubmittingDisbursement) {
      this.isSendToAccountingModalVisible = false;
      this.emailNotesError = false;
      this.submissionProgress = 0;
    }
  }

  loadEmployeeDetails(employeeId: number): void {
    if (this.employeeDetailsCache.has(employeeId)) {
      this.selectedEmployeeDetails = this.employeeDetailsCache.get(employeeId);
      this.isLoadingEmployeeDetails = false;
      return;
    }

    this.isLoadingEmployeeDetails = true;
    this.employeeLoanService.getEmployeeById(employeeId).subscribe({
      next: (employee) => {
        this.employeeDetailsCache.set(employeeId, employee);
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

  // ============================================
  // MODIFIED: Updated with progress tracking
  // ============================================
  sendToAccounting(): void {
    if (!this.emailNotes?.trim() || this.isSubmittingDisbursement) {
      this.emailNotesError = !this.emailNotes?.trim();
      return;
    }

    if (this.isBatchMode) {
      this.sendBatchToAccounting();
      return;
    }

    if (!this.selectedDisbursementLoan) {
      return;
    }

    // Get authentication token and tenant ID
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const tenantId = 'optimax';
    
    if (!token) {
      console.error('No authentication token found!');
      this.messages = [{
        severity: 'error',
        summary: 'Authentication Error',
        detail: 'You are not logged in. Please refresh the page or log in again.'
      }];
      return;
    }

    // Get current user info
    const currentUser = sessionStorage.getItem('fullname') || 
                        sessionStorage.getItem('username') || 
                        localStorage.getItem('fullname') || 
                        localStorage.getItem('username') || 
                        'System';

    // Record disbursement initiation
    this.disbursementInitiatedAt = new Date().toISOString();
    this.disbursementInitiatedBy = currentUser;
    this.disbursementInstructionReference = this.generateUniqueDisbursementReference(this.selectedDisbursementLoan);

    // Get approved amount
    const approvedAmount = this.getApprovedAmount(this.selectedDisbursementLoan);
    const totalRepayable = resolveLoanTotalRepayableAmount(this.selectedDisbursementLoan);

    this.isSubmittingDisbursement = true;
    this.submissionProgress = 10;

    // Step 1: Create disbursement confirmation record in API
    const payload: CreateDisbursementPayload = {
      loanId: this.selectedDisbursementLoan.id,
      disbursedAmount: approvedAmount,
      disbursementInstructionReference: this.disbursementInstructionReference,
      disbursementReference: this.disbursementReference || `PENDING-${this.disbursementInstructionReference}`,
      paymentMethod: this.paymentMethod,
      notes: this.emailNotes
    };

    this.submissionProgress = 30;

    this.disbursementConfirmationService.createConfirmation(payload).subscribe({
      next: (confirmation) => {
        this.submissionProgress = 50;
        
        // Step 2: Send accounting event to /x/api/v2/accounting/events
        const accountingPayload = {
          id: 0,
          sourceModule: 'HR',
          eventType: 'LOAN_DISBURSEMENT',
          amount: approvedAmount,
          currency: 'NGN',
          reference: this.disbursementInstructionReference,
          description: this.emailNotes,
          transactionDate: this.disbursementInitiatedAt,
          metadata: {
            loanId: this.selectedDisbursementLoan!.id,
            loanCode: this.getFormattedLoanCode(this.selectedDisbursementLoan!),
            employeeName: this.selectedDisbursementLoan!.fullName,
            employeeId: this.selectedDisbursementLoan!.employeeId,
            employeeEmail: this.selectedEmployeeDetails?.email || this.selectedEmployeeDetails?.workEmail || '',
            department: this.selectedDisbursementLoan!.department,
            approvedAmount: approvedAmount,
            interest: this.selectedDisbursementLoan!.interestRate,
            repaymentPeriod: this.selectedDisbursementLoan!.repaymentTime,
            modeOfPayment: this.selectedDisbursementLoan!.modeOfPayment,
            purpose: this.selectedDisbursementLoan!.purpose,
            approvedDate: this.selectedDisbursementLoan!.approvedDate,
            approvedBy: this.getApprovedByName(),
            bankName: this.selectedEmployeeDetails?.bankName,
            accountNumber: this.selectedEmployeeDetails?.accountNumber || '',
            accountName: `${this.selectedEmployeeDetails?.firstName || ''} ${this.selectedEmployeeDetails?.lastName || ''}`.trim() || this.selectedDisbursementLoan!.fullName,
            paymentMethod: this.paymentMethod,
            initiatedBy: this.disbursementInitiatedBy,
            initiatedAt: this.disbursementInitiatedAt,
            notes: this.emailNotes
          }
        };

        const apiBaseUrl = environment.apiBaseUrl || '';
        const url = `${apiBaseUrl}/x/api/v2/accounting/events`;
        
        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': tenantId
        });

        console.log('Sending to accounting with headers:', headers.keys());
        console.log('Payload:', accountingPayload);

        this.submissionProgress = 70;

        this.http.post(url, accountingPayload, { headers }).subscribe({
          next: () => {
            this.submissionProgress = 90;
            // Step 3: Update loan status to READY_FOR_DISBURSEMENT
            this.moveLoanToReadyForDisbursement();
          },
          error: (error) => {
            console.error('Error sending accounting event:', error);
            console.error('Error details:', error.error);
            this.messages = [{
              severity: 'error',
              summary: 'Accounting Event Failed',
              detail: `Failed to send event to accounting: ${error.error?.message || error.message}`
            }];
            this.isSubmittingDisbursement = false;
            this.submissionProgress = 0;
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
        this.submissionProgress = 0;
      }
    });
  }

  private sendBatchToAccounting(): void {
    const loans = this.batchSelectedLoans.filter(l => l.status === 'APPROVED');
    if (!loans.length) return;

    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const tenantId = 'optimax';
    
    if (!token) {
      console.error('No authentication token found!');
      this.messages = [{
        severity: 'error',
        summary: 'Authentication Error',
        detail: 'You are not logged in. Please refresh the page or log in again.'
      }];
      return;
    }

    const currentUser = sessionStorage.getItem('fullname') || 
                        sessionStorage.getItem('username') || 
                        localStorage.getItem('fullname') || 
                        localStorage.getItem('username') || 
                        'System';

    const initiatedAt = new Date().toISOString();
    const initiatedBy = currentUser;
    this.emailNotesError = false;
    this.isSubmittingDisbursement = true;
    this.submissionProgress = 10;

    const loanRefs = loans.map(loan => ({
      loan,
      reference: this.generateUniqueDisbursementReference(loan),
      employeeDetails: this.batchEmployeeDetailsMap.get(loan.id) || null
    }));

    // Step 1: Create disbursement confirmation records concurrently
    const confirmationRequests = loanRefs.map(({ loan, reference }) => {
      const loanNote = this.getStoredLoanNote(loan) || this.emailNotes;
      return this.disbursementConfirmationService.createConfirmation({
        loanId: loan.id,
        disbursedAmount: this.getApprovedAmount(loan),
        disbursementInstructionReference: reference,
        disbursementReference: `PENDING-${reference}`,
        paymentMethod: this.paymentMethod,
        notes: loanNote
      });
    });

    this.submissionProgress = 30;

    forkJoin(confirmationRequests).subscribe({
      next: () => {
        this.submissionProgress = 50;
        
        // Step 2: Send one accounting event per loan (endpoint expects a single DTO)
        const apiBaseUrl = environment.apiBaseUrl || '';
        const url = `${apiBaseUrl}/x/api/v2/accounting/events`;

        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': tenantId
        });

        const accountingRequests = loanRefs.map(({ loan, reference, employeeDetails }) => {
          const approvedAmount = this.getApprovedAmount(loan);
          const approvedByRaw = loan.approvedBy as any;
          const approvedByName = approvedByRaw && typeof approvedByRaw === 'object'
            ? String(approvedByRaw.fullname || approvedByRaw.username || 'Unknown')
            : String(approvedByRaw || 'Unknown');
          const loanNote = this.getStoredLoanNote(loan) || this.emailNotes;

          const accountingPayload = {
            id: 0,
            sourceModule: 'HR',
            eventType: 'LOAN_DISBURSEMENT',
            amount: approvedAmount,
            currency: 'NGN',
            reference,
            description: loanNote,
            transactionDate: initiatedAt,
            metadata: {
              loanId: loan.id,
              loanCode: this.getFormattedLoanCode(loan),
              employeeName: loan.fullName,
              employeeId: loan.employeeId,
              employeeEmail: employeeDetails?.email || employeeDetails?.workEmail || '',
              department: loan.department,
              approvedAmount: approvedAmount,
              interest: loan.interestRate,
              repaymentPeriod: loan.repaymentTime,
              modeOfPayment: loan.modeOfPayment,
              purpose: loan.purpose,
              approvedDate: loan.approvedDate,
              approvedBy: approvedByName,
              bankName: employeeDetails?.bankName,
              accountNumber: employeeDetails?.accountNumber || '',
              accountName: `${employeeDetails?.firstName || ''} ${employeeDetails?.lastName || ''}`.trim() || loan.fullName,
              paymentMethod: this.paymentMethod,
              initiatedBy,
              initiatedAt,
              notes: loanNote
            }
          };

          return this.http.post(url, accountingPayload, { headers });
        });

        console.log('Sending batch accounting requests:', accountingRequests.length);
        this.submissionProgress = 70;

        forkJoin(accountingRequests).subscribe({
          next: () => {
            this.submissionProgress = 90;
            // Step 3: Update each loan status individually
            const statusUpdates = loanRefs.map(({ loan, reference }) => {
              const loanNote = this.getStoredLoanNote(loan) || this.emailNotes;
              const notes = loanNote?.trim()
                ? `Sent to accounting for disbursement. Reference: ${reference}. Notes: ${loanNote.trim()}`
                : `Sent to accounting for disbursement. Reference: ${reference}.`;
              return this.loanApprovalService.updateApplicationStatus(loan.id, {
                status: 'READY_FOR_DISBURSEMENT',
                changedAt: initiatedAt,
                disbursementInitiatedAt: initiatedAt,
                disbursementInitiatedBy: this.getCurrentUserId(),
                disbursementInstructionReference: reference,
                notes
              });
            });

            forkJoin(statusUpdates).subscribe({
              next: (updatedLoans) => {
                this.submissionProgress = 100;
                updatedLoans.forEach(updated => {
                  this.replaceQueueLoan(updated);
                  if (updated) {
                    this.batchLoanNotesMap.delete(updated.id);
                  }
                });
                this.isSendToAccountingModalVisible = false;
                this.isLoanDetailsModalVisible = false;
                this.clearBatchSelection();
                this.isSubmittingDisbursement = false;
                this.selectedDisbursementLoan = null;
                this.selectedEmployeeDetails = null;
                this.batchLoanNotesMap.clear();
                this.messages = [{
                  severity: 'success',
                  summary: 'Batch Sent',
                  detail: `${loans.length} disbursement request(s) sent to accounting successfully.`
                }];
              },
              error: () => {
                this.isSubmittingDisbursement = false;
                this.submissionProgress = 0;
                this.messages = [{
                  severity: 'error',
                  summary: 'Status Update Failed',
                  detail: 'Accounting events were posted, but some loan statuses could not be updated.'
                }];
              }
            });
          },
          error: (error: any) => {
            this.isSubmittingDisbursement = false;
            this.submissionProgress = 0;
            console.error('Batch POST error:', error);
            this.messages = [{
              severity: 'error',
              summary: 'Batch Post Failed',
              detail: `Failed to send batch to accounting: ${error.error?.message || error.message}`
            }];
          }
        });
      },
      error: () => {
        this.isSubmittingDisbursement = false;
        this.submissionProgress = 0;
        this.messages = [{
          severity: 'error',
          summary: 'Confirmation Failed',
          detail: 'Failed to create disbursement confirmation records for one or more loans.'
        }];
      }
    });
  }  

  private moveLoanToReadyForDisbursement(): void {
    if (!this.selectedDisbursementLoan) {
      this.isSubmittingDisbursement = false;
      this.submissionProgress = 0;
      return;
    }

    // Prepare statusHistory entry for READY_FOR_DISBURSEMENT
    const statusHistoryEntry = {
      status: 'READY_FOR_DISBURSEMENT' as any,
      changedAt: this.disbursementInitiatedAt,
      changedBy: this.getCurrentUserId(),
      notes: this.emailNotes?.trim()
        ? `Sent to accounting for disbursement. Reference: ${this.disbursementInstructionReference}. Notes: ${this.emailNotes.trim()}`
        : `Sent to accounting for disbursement. Reference: ${this.disbursementInstructionReference}.`
    };

    // Ensure date fields are in ISO 8601 format with time
    const isoDisbursementInitiatedAt = this.disbursementInitiatedAt ? new Date(this.disbursementInitiatedAt).toISOString() : new Date().toISOString();

    this.loanApprovalService.updateApplicationStatus(this.selectedDisbursementLoan.id, {
      status: 'READY_FOR_DISBURSEMENT',
      changedAt: isoDisbursementInitiatedAt,
      disbursementInitiatedAt: isoDisbursementInitiatedAt,
      disbursementInitiatedBy: this.getCurrentUserId(),
      disbursementInstructionReference: this.disbursementInstructionReference,
      notes: statusHistoryEntry.notes
    }).subscribe({
      next: (updatedLoan) => {
        this.submissionProgress = 100;
        
        // Ensure statusHistory entry for READY_FOR_DISBURSEMENT is present
        if (!updatedLoan.statusHistory) {
          updatedLoan.statusHistory = [];
        }
        if (!updatedLoan.statusHistory.some((entry: any) => entry.status === 'READY_FOR_DISBURSEMENT')) {
          updatedLoan.statusHistory.push(statusHistoryEntry);
        }
        this.selectedDisbursementLoan = updatedLoan;
        (this.selectedDisbursementLoan as any).disbursementInitiatedAt = this.disbursementInitiatedAt;
        (this.selectedDisbursementLoan as any).disbursementInitiatedBy = this.disbursementInitiatedBy;
        (this.selectedDisbursementLoan as any).disbursementInstructionReference = this.disbursementInstructionReference;

        // Patch the readyForDisbursementLoans array for UI display
        this.readyForDisbursementLoans = this.readyForDisbursementLoans.map(loan => {
          if (loan.id === updatedLoan.id) {
            const patchedLoan = { ...updatedLoan };
            if (!patchedLoan.statusHistory) patchedLoan.statusHistory = [];
            if (!patchedLoan.statusHistory.some((entry: any) => entry.status === 'READY_FOR_DISBURSEMENT')) {
              patchedLoan.statusHistory.push(statusHistoryEntry);
            }
            return patchedLoan;
          }
          return loan;
        });

        this.replaceQueueLoan(updatedLoan);
        this.isSendToAccountingModalVisible = false;
        this.isLoanDetailsModalVisible = false;
        if (updatedLoan) {
          this.batchLoanNotesMap.delete(updatedLoan.id);
        }
        this.selectedDisbursementLoan = null;
        this.selectedEmployeeDetails = null;
        this.messages = [{
          severity: 'success',
          summary: 'Request Sent',
          detail: `Disbursement request sent. Reference: ${this.disbursementInstructionReference}`
        }];
        this.isSubmittingDisbursement = false;
        this.submissionProgress = 0;
      },
      error: (error) => {
        console.error('Error updating loan disbursement status:', error);
        this.messages = [{
          severity: 'error',
          summary: 'Update Failed',
          detail: 'The request was prepared, but the loan status could not be moved to ready for disbursement.'
        }];
        this.isSubmittingDisbursement = false;
        this.submissionProgress = 0;
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
            this.isLoanDetailsModalVisible = false;
            this.selectedDisbursementLoan = null;
            this.selectedEmployeeDetails = null;
            this.messages = [{
              severity: 'success',
              summary: 'Loan Activated',
              detail: `Loan ${this.getFormattedLoanCode(updatedLoan)} has been set to ACTIVE.`
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
            this.replaceQueueLoan(updatedLoan);
            this.isLoanDetailsModalVisible = false;
            this.selectedDisbursementLoan = null;
            this.selectedEmployeeDetails = null;
            this.messages = [{
              severity: 'success',
              summary: 'Loan Disbursed',
              detail: `Loan ${this.getFormattedLoanCode(updatedLoan)} has been marked as disbursed.`
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
  
  // Helper method to format loan code
  getFormattedLoanCode(loan: LoanApplication): string {
    return formatAdvancedLoanCode(loan.loanCode || loan.id);
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
    const date = new Date(value);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-NG', {
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
    if (!loan.status) return '';
    return String(loan.status)
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  getQueueStatusClass(loan: LoanApplication): string {
    return loan.status === 'READY_FOR_DISBURSEMENT' ? 'status-ready_for_disbursement' : 'status-approved';
  }

  getRepaymentScheduleLength(loan: LoanApplication | null): number {
    if (!loan) {
      return 0;
    }

    const schedule = (loan as any).repaymentSchedule;
    return Array.isArray(schedule) ? schedule.length : 0;
  }

  getReadyForDisbursementDate(loan: LoanApplication): string | null {
    const readyEntries = (loan.statusHistory || [])
      .filter((entry) => entry.status === 'READY_FOR_DISBURSEMENT' && !!entry.changedAt);

    let readyEntry = readyEntries.find(e => typeof e.changedAt === 'string');
    if (!readyEntry && readyEntries.length > 0) {
      readyEntry = readyEntries[0];
    }

    let changedAt: string | null = null;
    if (readyEntry) {
      if (typeof readyEntry.changedAt === 'string') {
        changedAt = readyEntry.changedAt;
      } else if (Array.isArray(readyEntry.changedAt)) {
        const arr = readyEntry.changedAt;
        const dateObj = new Date(arr[0], arr[1] - 1, arr[2], arr[3], arr[4], arr[5], arr[6]);
        changedAt = dateObj.toISOString();
      }
    }

    if (changedAt) {
      return changedAt;
    }

    // Only return a fallback date when the loan is actually in READY_FOR_DISBURSEMENT.
    if (loan.status === 'READY_FOR_DISBURSEMENT') {
      return loan.approvedDate || loan.requestDate || null;
    }

    return null;
  }

  // ============================================
  // Batch selection getters
  // ============================================
  get batchSelectedLoans(): LoanApplication[] {
    return this.approvedLoans.filter(loan => this.batchSelectedLoanIds.has(loan.id));
  }

  get isBatchMode(): boolean {
    return this.batchSelectedLoanIds.size >= 2;
  }

  getBatchTotalAmount(): number {
    return this.batchSelectedLoans.reduce((sum, loan) => sum + this.getApprovedAmount(loan), 0);
  }

  isBatchSelected(loan: LoanApplication): boolean {
    return this.batchSelectedLoanIds.has(loan.id);
  }

  toggleBatchSelect(loan: LoanApplication): void {
    if (this.batchSelectedLoanIds.has(loan.id)) {
      this.batchSelectedLoanIds.delete(loan.id);
      this.batchEmployeeDetailsMap.delete(loan.id);
    } else {
      this.batchSelectedLoanIds.add(loan.id);
      if (!this.batchEmployeeDetailsMap.has(loan.id)) {
        this.employeeLoanService.getEmployeeById(loan.employeeId).subscribe({
          next: (emp) => this.batchEmployeeDetailsMap.set(loan.id, emp),
          error: () => this.batchEmployeeDetailsMap.set(loan.id, null)
        });
      }
    }

    const newSize = this.batchSelectedLoanIds.size;
    this.batchViewIndex = newSize > 0 ? Math.min(this.batchViewIndex, newSize - 1) : 0;

    if (newSize === 1) {
      this.selectedDisbursementLoan = loan;
      this.loadEmployeeDetails(loan.employeeId);
    }
  }

  selectAllApprovedLoans(): void {
    this.getFilteredApprovedLoans().forEach(loan => {
      if (!this.batchSelectedLoanIds.has(loan.id)) {
        this.batchSelectedLoanIds.add(loan.id);
        if (!this.batchEmployeeDetailsMap.has(loan.id)) {
          this.employeeLoanService.getEmployeeById(loan.employeeId).subscribe({
            next: (emp) => this.batchEmployeeDetailsMap.set(loan.id, emp),
            error: () => this.batchEmployeeDetailsMap.set(loan.id, null)
          });
        }
      }
    });
  }

  clearBatchSelection(): void {
    this.batchSelectedLoanIds.clear();
    this.batchEmployeeDetailsMap.clear();
    this.batchViewIndex = 0;
  }

  navigateBatch(direction: 1 | -1): void {
    const total = this.batchSelectedLoans.length;
    if (total < 2) return;
    this.batchViewIndex = (this.batchViewIndex + direction + total) % total;
    const loan = this.batchSelectedLoans[this.batchViewIndex];
    if (loan) {
      this.selectedDisbursementLoan = loan;
      this.selectedEmployeeDetails = this.batchEmployeeDetailsMap.get(loan.id) ?? null;
      if (!this.selectedEmployeeDetails && !this.batchEmployeeDetailsMap.has(loan.id)) {
        this.loadEmployeeDetails(loan.employeeId);
      }
      this.populateDisbursementTrackingFromLoan(loan);
    }
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

  onCurrentLoanNoteChange(value: string): void {
    this.emailNotes = value;

    if (this.selectedDisbursementLoan) {
      this.batchLoanNotesMap.set(this.selectedDisbursementLoan.id, value);
    }
  }

  private getStoredLoanNote(loan: LoanApplication | null | undefined): string {
    if (!loan) return '';
    return this.batchLoanNotesMap.get(loan.id) || '';
  }

  private setStoredLoanReference(loan: LoanApplication | null | undefined, reference: string): void {
    if (!loan || !reference.trim()) {
      return;
    }
    this.batchLoanReferenceMap.set(loan.id, reference.trim());
  }

  private getStoredLoanReference(loan: LoanApplication | null | undefined): string {
    if (!loan) return '';
    return this.batchLoanReferenceMap.get(loan.id) || '';
  }

  private populateDisbursementTrackingFromLoan(loan: LoanApplication): void {
    this.emailNotes = this.getStoredLoanNote(loan);

    // Map Initiated Date to the same value as Sent Date in the table
    this.disbursementInitiatedAt = this.getReadyForDisbursementDate(loan) || '';

    // Optionally, still map InitiatedBy and Reference if needed (using previous logic)
    const readyEntries = [...(loan.statusHistory || [])]
      .filter((entry) => entry.status === 'READY_FOR_DISBURSEMENT' && !!entry.changedAt)
      .sort((left, right) => new Date(left.changedAt).getTime() - new Date(right.changedAt).getTime());

    let readyEntry = readyEntries.find(e => typeof e.changedAt === 'string');
    if (!readyEntry && readyEntries.length > 0) {
      readyEntry = readyEntries[0];
    }

    const storedReference = this.getStoredLoanReference(loan);

    if (readyEntry) {
      this.disbursementInitiatedBy = typeof readyEntry.changedBy === 'string'
        ? readyEntry.changedBy
        : '';
      const referenceMatch = String(readyEntry.notes || '').match(/Reference:\s*([^\.]+)/i);
      this.disbursementInstructionReference = storedReference || referenceMatch?.[1]?.trim() || '';
    } else {
      this.disbursementInitiatedBy = '';
      this.disbursementInstructionReference = storedReference || '';
    }
  }
}