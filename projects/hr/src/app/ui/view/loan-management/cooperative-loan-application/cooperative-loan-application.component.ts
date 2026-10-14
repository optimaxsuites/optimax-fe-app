import { formatDate } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GuarantorDto, GuarantorService } from '../../../service/loan/guarantor.service';
import { MailNotificationService } from '../../../service/mailNotification.service';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { v4 as uuidV4 } from 'uuid';
import { forkJoin, of } from 'rxjs';
import { EmployeeService } from '../../../service/employee.service';
import { EmployeeLoanService } from '../../../service/loan/emoloyee-loan.service';
import { catchError, finalize, switchMap } from 'rxjs/operators';
import { CooperativeMember, CooperativeLoanGroup, CooperativeGroupMembership, CooperativeEmployeeProfile, CooperativeMembershipEligibility } from '../../../service/loan/cooperative-loan/cooperative.types';
import { Message } from 'primeng/api';
import { CooperativeLoanPurposeApiResponse } from '../../../service/loan/cooperative-loan/cooperative-loan-api.service';
import { LoanSupportingDocument, RepaymentScheduleItem } from '../../../service/loan/loan.types';
import { formatNaira } from '../../../service/loan/loan-format.util';
import { computeBorrowingCommitment } from '../../../service/loan/loan-eligibility.util';

@Component({
  selector: 'app-cooperative-loan-application',
  templateUrl: './cooperative-loan-application.component.html',
  styleUrls: ['./cooperative-loan-application.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CooperativeLoanApplicationComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
    @Input() isModal = false;
    @Input() isSelfService = false;
    @Input() prefillMemberId: string | null = null;
    @Output() applicationSubmitted = new EventEmitter<void>();
    @Output() formCancelled = new EventEmitter<void>();
    guarantorContacts: { [memberId: string]: GuarantorDto[] } = {};
  isLoadingGroupDetails = false;
  messages: Message[] = [];
  supportingDocuments: LoanSupportingDocument[] = [];
  showPurposeDisclaimerModal = false;
  selectedPurposeAcknowledged = false;
  pendingPurposeValue: string | null = null;

  // Form properties
  applicationForm!: FormGroup;
  members: CooperativeMember[] = [];
  eligibleMembers: CooperativeMember[] = [];
  groups: CooperativeLoanGroup[] = [];
  qualifiedGroups: CooperativeLoanGroup[] = [];
  availablePurposes: CooperativeLoanPurposeApiResponse[] = [];
  selectedGroup?: CooperativeLoanGroup;
  selectedGroupMembership?: CooperativeGroupMembership;
  selectedMember?: CooperativeMember;
  employeeDirectory: CooperativeEmployeeProfile[] = [];
  selectedMemberEligibility?: CooperativeMembershipEligibility;
  selectedMemberSalary = 0;
  memberSalaryStatus: 'loading' | 'ok' | 'missing' | 'invalid' | 'error' = 'missing';
  isCheckingEligibility = false;

  // Calculated values
  repaymentAmount = 0;
  totalRepayment = 0;
  totalInterest = 0;
  showConfirmation = false;
  confirmationDetails: {
    amount?: number;
    duration?: number;
    repaymentAmount?: number;
    totalRepayment?: number;
    totalInterest?: number;
    purpose?: string;
    groupName?: string;
    memberName?: string;
  } = {};
  prefillMemberParam: string | null = null;
  submitError = '';
  submitSuccessMessage = '';
  isSubmitting = false;

  estimatedAnnualPatronageRefund: number = 0;
  guarantorCandidates: GuarantorDto[] = [];
  
  // Guarantor Approval Modal properties
  isGuarantorView = false;
  showGuarantorApprovalModal = false;
  modalLoanSummary: any = null;
  modalLoanId: number | null = null;
  modalLoading = false;
  modalError = '';
  private isValidating = false;


  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private cooperativeService: CooperativeService,
    private employeeService: EmployeeService,
    private mailNotificationService: MailNotificationService,
    private guarantorService: GuarantorService,
    private employeeLoanService: EmployeeLoanService
  ) {}

  ngOnInit(): void {
    // Check URL parameters for guarantor approval
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      if (params['guarantorApproval'] === 'true' && params['loanId']) {
        this.isGuarantorView = true;
        this.modalLoanId = Number(params['loanId']);
        this.fetchLoanSummaryById(this.modalLoanId);
        return;
      }

      this.isGuarantorView = false;
      this.initForm();
      this.setupPurposeChangeListener();
      
      setTimeout(() => {
        this.loadEmployeeDirectoryWithMemberCheckAndSelectCurrentUser();
      }, 0);
    });
  }

  // ==================== GUARANTOR APPROVAL METHODS ====================
  
  fetchLoanSummaryById(loanId: number): void {
    this.modalLoading = true;
    this.modalError = '';
    
    this.cooperativeService.getLoanById(loanId).subscribe({
      next: (loan) => {
        if (!loan) {
          this.modalError = 'Loan not found. Please contact support.';
          this.modalLoading = false;
          return;
        }
        
        this.modalLoanSummary = {
          applicantName: (loan as any).memberName || (loan as any).fullName || (loan as any).name || 'Unknown',
          amount: loan.amount,
          purpose: loan.purpose,
          repaymentTime: loan.repaymentTime,
          repaymentAmount: loan.repaymentAmount,
          totalRepayable: loan.totalRepayable || (loan.repaymentAmount * loan.repaymentTime),
          interestRate: loan.interestRate,
          groupName: (loan as any).groupName || 'Cooperative Group',
          requestDate: loan.requestDate
        };
        
        this.showGuarantorApprovalModal = true;
        this.modalLoading = false;
      },
      error: (err) => {
        console.error('Error fetching loan:', err);
        this.modalError = 'Error loading loan details. Please try again.';
        this.modalLoading = false;
      }
    });
  }

  handleGuarantorApprove(): void {
    if (!this.modalLoanId) return;
    
    this.modalLoading = true;
    this.modalError = '';
    
    const guarantorId = this.getGuarantorIdFromSession();
    
    this.cooperativeService.submitGuarantorDecision(this.modalLoanId, guarantorId, 'APPROVED').subscribe({
      next: (updatedLoan) => {
        this.modalLoading = false;
        this.handleGuarantorDecisionResult(updatedLoan, 'approved');
      },
      error: (err) => {
        console.error('Error approving loan:', err);
        this.modalLoading = false;
        this.modalError = 'Failed to approve loan. Please try again.';
      }
    });
  }

  handleGuarantorReject(): void {
    if (!this.modalLoanId) return;
    
    this.modalLoading = true;
    this.modalError = '';
    
    const guarantorId = this.getGuarantorIdFromSession();
    
    this.cooperativeService.submitGuarantorDecision(this.modalLoanId, guarantorId, 'REJECTED').subscribe({
      next: (updatedLoan) => {
        this.modalLoading = false;
        this.handleGuarantorDecisionResult(updatedLoan, 'rejected');
      },
      error: (err) => {
        console.error('Error rejecting loan:', err);
        this.modalLoading = false;
        this.modalError = 'Failed to reject loan. Please try again.';
      }
    });
  }

  /**
   * submitGuarantorDecision resolves with undefined when nothing was recorded (no matching pending
   * guarantor on the loan), so only report success when the loan actually came back updated.
   */
  private handleGuarantorDecisionResult(updatedLoan: unknown, decisionLabel: 'approved' | 'rejected'): void {
    if (!updatedLoan) {
      this.modalError = 'Your decision could not be recorded. This request may already have been answered, or you may not be a guarantor on this loan.';
      return;
    }

    this.showGuarantorApprovalModal = false;
    this.messages = [{
      severity: decisionLabel === 'approved' ? 'success' : 'info',
      summary: decisionLabel === 'approved' ? 'Guarantee Approved' : 'Guarantee Rejected',
      detail: `You have ${decisionLabel} this loan as a guarantor.`
    }];
  }

  handleGuarantorModalClose(): void {
    this.showGuarantorApprovalModal = false;
    if (this.isGuarantorView) {
      this.router.navigate(['/']);
    }
  }

  private getGuarantorIdFromSession(): number {
    const guarantorId = sessionStorage.getItem('guarantorId');
    if (guarantorId) {
      return Number(guarantorId);
    }
    return 0;
  }

  // ==================== SETUP METHODS ====================
  
  setupPurposeChangeListener(): void {
    this.applicationForm.get('purpose')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.supportingDocuments = [];
      const purposeControl = this.applicationForm.get('purpose');
      if (purposeControl?.errors) {
        const errors = { ...purposeControl.errors };
        delete errors['purposeRequired'];
        purposeControl.setErrors(Object.keys(errors).length ? errors : null);
      }
      this.updateAmountValidator();

      const selectedPurpose = this.selectedPurposeDefinition;
      if (selectedPurpose && this.requiresPurposeDisclosure) {
        this.pendingPurposeValue = String(purposeControl?.value || '');
        this.selectedPurposeAcknowledged = false;
        this.showPurposeDisclaimerModal = true;
      } else {
        this.showPurposeDisclaimerModal = false;
        this.selectedPurposeAcknowledged = false;
        this.pendingPurposeValue = null;
      }

      this.applicationForm.updateValueAndValidity();
    });
  }

initForm(): void {
  this.applicationForm = this.fb.group({
    memberId: ['', Validators.required],
    groupId: ['', Validators.required],
    amount: ['', [Validators.required, Validators.min(1000)]],
    purpose: ['', Validators.required],
    repaymentTime: ['', [Validators.required, Validators.min(1), Validators.max(12)]],
    modeOfPayment: ['MONTHLY', Validators.required],
    requestDate: [this.toDateTimeLocal(new Date()), Validators.required],
    guarantors: this.fb.array([]),
    acceptTerms: [false, Validators.requiredTrue],
    acceptAcknowledgement: [false, Validators.requiredTrue]
  });

  // Watch for changes - use distinctUntilChanged to prevent loops
  this.applicationForm.get('groupId')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(groupId => {
    this.onGroupSelect(groupId);
  });

  this.applicationForm.get('memberId')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(memberId => {
    // Look up in eligibleMembers first; fall back to full members list so guarantors are
    // not wiped out when eligibleMembers hasn't been populated yet (e.g. auto-resolve path).
    const found =
      this.eligibleMembers.find(m => String(m.id) === String(memberId) || String(m.memberId) === String(memberId)) ||
      this.members.find(m => String(m.id) === String(memberId) || String(m.memberId) === String(memberId));

    if (found) {
      this.selectedMember = { ...found, email: this.resolveMemberEmail(found) };
      this.loadGuarantorCandidates(this.selectedMember);
    } else if (!this.selectedMember || (String(this.selectedMember.id) !== String(memberId) && String(this.selectedMember.memberId) !== String(memberId))) {
      // Only clear when the value genuinely changed to an unknown member
      this.selectedMember = undefined;
      this.guarantorCandidates = [];
    }
    this.resolveSelectedMemberEligibility();
    this.refreshQualifiedGroups();
    this.validateGuarantors();
  });

  this.applicationForm.get('amount')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
    this.calculateRepayment();
    this.validateGuarantors();
  });

  this.applicationForm.get('repaymentTime')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
    this.calculateRepayment();
  });

  // Use debounce to prevent rapid fire
  this.guarantorsArray.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
    this.validateGuarantors();
  });
}

  // ==================== GETTERS ====================

  get guarantorsArray(): FormArray {
    return this.applicationForm.get('guarantors') as FormArray;
  }

  get selectedPurposeDefinition(): CooperativeLoanPurposeApiResponse | undefined {
    const currentPurpose = String(this.applicationForm?.get('purpose')?.value || '').trim();
    if (!currentPurpose) return undefined;
    return this.availablePurposes.find((purpose) => {
      const purposeName = String(purpose.name || '').trim();
      const purposeId = String(purpose.id || '');
      return purposeName === currentPurpose || purposeId === currentPurpose;
    });
  }

  get minLoanAmount(): number {
    const minAmount = Number(this.selectedPurposeDefinition?.minLoanAmount || 0);
    return minAmount > 0 ? minAmount : 1000;
  }

  get maxPurposeLoanAmount(): number | null {
    const maxAmount = Number(this.selectedPurposeDefinition?.maxLoanAmount || 0);
    return maxAmount > 0 ? maxAmount : null;
  }

  /**
   * Most the member may request in this group: their borrowable amount (contributions × the group's
   * borrowing %), capped by the purpose maximum. A borrowable amount of 0 means they can't borrow yet;
   * it used to mean "no limit".
   */
  get effectiveMaxLoanAmount(): number {
    const maxBorrowable = Math.max(Number(this.maxBorrowableAmount || 0), 0);
    const purposeMax = this.maxPurposeLoanAmount;
    return purposeMax ? Math.min(purposeMax, maxBorrowable) : maxBorrowable;
  }

  get hasPurposeAmountConstraints(): boolean {
    return !!((this.selectedPurposeDefinition?.minLoanAmount && this.selectedPurposeDefinition.minLoanAmount > 0)
      || (this.selectedPurposeDefinition?.maxLoanAmount && this.selectedPurposeDefinition.maxLoanAmount > 0));
  }

  get requiresPurposeDisclosure(): boolean {
    return this.hasPurposeAmountConstraints || !!(this.selectedPurposeDefinition?.defaultInterestRate && this.selectedPurposeDefinition.defaultInterestRate > 0);
  }

  get selectedPurposeAmountRangeMessage(): string {
    if (!this.selectedPurposeDefinition) {
      return '';
    }

    const hasMin = !!(this.selectedPurposeDefinition.minLoanAmount && this.selectedPurposeDefinition.minLoanAmount > 0);
    const hasMax = !!(this.selectedPurposeDefinition.maxLoanAmount && this.selectedPurposeDefinition.maxLoanAmount > 0);

    if (hasMin && hasMax) {
      return `Allowed range: ${this.formatCurrency(this.selectedPurposeDefinition.minLoanAmount || 0)} to ${this.formatCurrency(this.selectedPurposeDefinition.maxLoanAmount || 0)}.`;
    }

    if (hasMin) {
      return `Minimum allowed amount: ${this.formatCurrency(this.selectedPurposeDefinition.minLoanAmount || 0)}.`;
    }

    if (hasMax) {
      return `Maximum allowed amount: ${this.formatCurrency(this.selectedPurposeDefinition.maxLoanAmount || 0)}.`;
    }

    return '';
  }

  get hasAvailablePurposes(): boolean {
    return this.availablePurposes.length > 0;
  }

  get requiresSupportingDocuments(): boolean {
    return Boolean(this.selectedPurposeDefinition?.requiresDocumentation);
  }

  get requiredDocumentationTypes(): string[] {
    return this.selectedPurposeDefinition?.documentationTypes || [];
  }

  get hasDocumentRequirementGap(): boolean {
    return this.requiresSupportingDocuments && this.supportingDocuments.length === 0;
  }

  get requiredGuarantorCount(): number {
    return Number(this.selectedGroup?.minimumGuarantors || 0);
  }

  get totalGuaranteedAmount(): number {
    return this.guarantorsArray.controls.reduce((sum, control) => {
      return sum + Number(control.get('guaranteedAmount')?.value || 0);
    }, 0);
  }

  get guarantorRequirementLabel(): string {
    if (!this.selectedGroup) return '';
    if (this.selectedGroup.requiresGuarantors) {
      const min = this.selectedGroup.minimumGuarantors || 1;
      return `${min} guarantor${min > 1 ? 's' : ''} required`;
    }
    return 'No guarantor required';
  }

  get maxBorrowableAmount(): number {
    if (!this.selectedMember || !this.selectedGroup) return 0;
    return this.cooperativeService.getMaxBorrowableAmountForGroup(this.selectedMember.id, this.selectedGroup.id);
  }

  get canSubmitByLevel(): boolean {
    return true;
  }

  get previewRepaymentSchedule(): RepaymentScheduleItem[] {
    const amount = Number(this.applicationForm?.get('amount')?.value || 0);
    const repaymentTime = Number(this.applicationForm?.get('repaymentTime')?.value || 0);
    const modeOfPayment = String(this.applicationForm?.get('modeOfPayment')?.value || 'MONTHLY').toUpperCase();
    const requestDateRaw = String(this.applicationForm?.get('requestDate')?.value || '').trim();
    const baseDate = requestDateRaw ? new Date(requestDateRaw) : new Date();

    if (!this.selectedGroup || amount <= 0 || repaymentTime <= 0 || Number.isNaN(baseDate.getTime())) {
      return [];
    }

    if (modeOfPayment === 'ONE_OFF') {
      const dueDate = new Date(baseDate);
      dueDate.setMonth(dueDate.getMonth() + repaymentTime);
      return [{
        installmentNo: 1,
        dueDate: dueDate.toISOString(),
        principalAmount: amount,
        interestAmount: this.totalInterest,
        totalAmount: this.totalRepayment,
        paidAmount: 0,
        remainingBalance: this.totalRepayment,
        status: 'PENDING'
      }];
    }

    const principalPerInstallment = amount / repaymentTime;
    const interestPerInstallment = this.totalInterest / repaymentTime;

    return Array.from({ length: repaymentTime }, (_, index) => {
      const dueDate = new Date(baseDate);
      dueDate.setMonth(dueDate.getMonth() + index + 1);
      const totalAmount = Number((principalPerInstallment + interestPerInstallment).toFixed(2));
      const remainingBalance = Math.max(Number((this.totalRepayment - totalAmount * (index + 1)).toFixed(2)), 0);

      return {
        installmentNo: index + 1,
        dueDate: dueDate.toISOString(),
        principalAmount: Number(principalPerInstallment.toFixed(2)),
        interestAmount: Number(interestPerInstallment.toFixed(2)),
        totalAmount,
        paidAmount: 0,
        remainingBalance,
        status: 'PENDING' as const
      };
    });
  }

  get workflowTimelinePreview(): Array<{ title: string; description: string; tone: 'neutral' | 'accent' | 'success' }> {
    const steps: Array<{ title: string; description: string; tone: 'neutral' | 'accent' | 'success' }> = [{
      title: 'Application Submitted',
      description: 'The loan request is created with your selected group, purpose, and financial terms.',
      tone: 'accent'
    }];

    if (this.selectedGroup?.requiresGuarantors) {
      steps.push({
        title: 'Guarantor Review',
        description: `At least ${this.requiredGuarantorCount || 1} guarantor approval${(this.requiredGuarantorCount || 1) > 1 ? 's are' : ' is'} required before admin review.`,
        tone: 'neutral'
      });
    }

    steps.push(
      {
        title: 'Admin Review',
        description: 'Cooperative admins validate the request, policy fit, and attached supporting evidence.',
        tone: 'neutral'
      },
      {
        title: 'Disbursement Routing',
        description: 'Approved requests move into the cooperative disbursement workflow for accounting action.',
        tone: 'neutral'
      },
      {
        title: 'Repayment Monitoring',
        description: 'Once disbursed, repayment entries, reminders, grace handling, and status changes are tracked over time.',
        tone: 'success'
      }
    );

    return steps;
  }

  // ==================== LOAD METHODS ====================

  private loadEmployeeDirectoryWithMemberCheckAndSelectCurrentUser(): void {
    this.employeeService.getAllEmployee().subscribe({
      next: (data) => {
        const employees = Array.isArray(data) ? data : [];
        this.employeeDirectory = employees
          .map((employee: any) => this.mapEmployeeToProfile(employee))
          .filter((employee: CooperativeEmployeeProfile | null): employee is CooperativeEmployeeProfile => !!employee);
        this.loadDataAndSelectCurrentUser();
      },
      error: () => {
        this.employeeDirectory = [];
        this.loadDataAndSelectCurrentUser();
      }
    });
  }

  private loadDataAndSelectCurrentUser(): void {
    forkJoin({
      purposes: this.cooperativeService.loadLoanPurposes(),
      members: this.cooperativeService.getMembers(),
      groups: this.cooperativeService.loadGroups()
    }).subscribe({
      next: ({ purposes, members, groups }) => {
        this.availablePurposes = purposes;
        this.members = members.filter((m: CooperativeMember) => m.status === 'ACTIVE');
        this.groups = groups.filter((group: CooperativeLoanGroup) => group.status === 'ACTIVE');
        
        
        const sessionUserId = Number(
          sessionStorage.getItem('userid')
          || localStorage.getItem('userid')
          || sessionStorage.getItem('userId')
          || localStorage.getItem('userId')
          || 0
        );

        let foundMember: CooperativeMember | undefined = this.cooperativeService.resolveCurrentSessionMember(this.members);

        if (!foundMember && sessionUserId) {
          foundMember = this.members.find((member) =>
            member.employeeId === sessionUserId || member.id === sessionUserId || member.memberId === sessionUserId
          );
        }
        
        if (!foundMember && sessionUserId) {
          this.employeeService.getEmployeeByUserId(sessionUserId).subscribe({
            next: (employee) => {
              const employeeId = employee?.employeeId || employee?.id;
              
              foundMember = this.members.find(m => 
                m.employeeId === employeeId || 
                m.id === employeeId ||
                m.memberId === employeeId
              );

              if (!foundMember) {
                foundMember = this.cooperativeService.resolveCurrentSessionMember(this.members);
              }
              
              if (foundMember) {
                this.setSelectedMemberAndLoadData(foundMember);
              } else {
                console.error('[CoopLoanApp] No member found for employeeId:', employeeId);
                this.messages = [{
                  severity: 'warn',
                  summary: 'Not a Cooperative Member',
                  detail: 'You are not yet registered as a cooperative member. Please contact support or join the cooperative to proceed.'
                }];
              }
            },
            error: (err) => {
              console.error('[CoopLoanApp] Failed to fetch employee:', err);
              this.messages = [{
                severity: 'error',
                summary: 'Error',
                detail: 'Could not verify your cooperative membership. Please contact support.'
              }];
            }
          });
        } else if (foundMember) {
          this.setSelectedMemberAndLoadData(foundMember);
        } else {
          console.error('[CoopLoanApp] No member found and no session userId');
          this.messages = [{
            severity: 'warn',
            summary: 'Not a Cooperative Member',
            detail: 'You are not yet registered as a cooperative member. Please contact support or join the cooperative to proceed.'
          }];
        }
      },
      error: (err) => {
        console.error('[CoopLoanApp] Error loading initial data:', err);
        this.messages = [{
          severity: 'error',
          summary: 'Loading Error',
          detail: 'Could not load cooperative data. Please try again later.'
        }];
      }
    });
  }

  private setSelectedMemberAndLoadData(member: CooperativeMember): void {
  
  // Guard against null/undefined
  if (!member || !member.id) {
    console.error('[CoopLoanApp] Invalid member passed to setSelectedMemberAndLoadData');
    return;
  }
  
  // Set the member
  this.selectedMember = member;

  // Store the ID for verification
  const selectedMemberId = this.selectedMember.id;

  // Populate eligibleMembers BEFORE patching the form so the memberId.valueChanges
  // subscriber can find this member immediately and not zero out guarantorCandidates.
  this.refreshEligibleMembers();

  // Kick off guarantor fetch — eligible members is now ready so the reactive subscriber
  // will also fetch correctly when patchValue fires below.
  this.loadGuarantorCandidates(this.selectedMember);

  // Update the form if it exists
  if (this.applicationForm) {
    this.applicationForm.patchValue({ memberId: selectedMemberId });
  } else {
    console.warn('[CoopLoanApp] Form not ready, will retry');
    setTimeout(() => {
      if (this.applicationForm && this.selectedMember) {
        this.applicationForm.patchValue({ memberId: this.selectedMember.id });
      }
    }, 100);
    return;
  }

  // Eligibility and salary (eligibleMembers already refreshed above)
  this.resolveSelectedMemberEligibility();
  this.resolveSelectedMemberSalary();
  
  // Verify member still exists before proceeding
  if (!this.selectedMember || this.selectedMember.id !== selectedMemberId) {
    console.error('[CoopLoanApp] Member was reset! Restoring...');
    this.selectedMember = member;
  }
  
  
  // Load group memberships
  this.cooperativeService.refreshGroupMembershipsForMember(this.selectedMember).subscribe({
    next: (memberships) => {
      
      // Verify member still exists
      if (!this.selectedMember) {
        console.error('[CoopLoanApp] Selected member became undefined after loading memberships, restoring...');
        this.selectedMember = member;
      }
      
      if (this.selectedMember && this.selectedMember.id === selectedMemberId) {
        // Clear any error messages
        this.messages = [];
        
        // Refresh qualified groups - but only if member still matches
        this.refreshQualifiedGroups();
        
        const activeMemberships = memberships.filter(m => m.status === 'ACTIVE');
        if (activeMemberships.length === 0) {
          this.messages = [{
            severity: 'warn',
            summary: 'No Active Group Membership',
            detail: 'You are a cooperative member but not yet a member of any active loan group. Please contact support to join a group.'
          }];
        } else {
          
          // Auto-select first group if available and none selected
          if (this.qualifiedGroups.length > 0 && !this.applicationForm.get('groupId')?.value) {
            const firstGroup = this.qualifiedGroups[0];
            this.applicationForm.patchValue({ groupId: firstGroup.id });
            this.selectedGroup = firstGroup;
          }
          
          // Set default values for amount and repayment time if not set
          if (!this.applicationForm.get('amount')?.value || this.applicationForm.get('amount')?.value < 1000) {
            this.applicationForm.patchValue({ amount: 10000 });
          }
          
          // FIX: Ensure repaymentTime has a valid value between 1-12
          const currentRepaymentTime = this.applicationForm.get('repaymentTime')?.value;
          if (!currentRepaymentTime || currentRepaymentTime < 1 || currentRepaymentTime > 12) {
            this.applicationForm.patchValue({ repaymentTime: 6 });
          }
          
          // Ensure modeOfPayment is set
          if (!this.applicationForm.get('modeOfPayment')?.value) {
            this.applicationForm.patchValue({ modeOfPayment: 'MONTHLY' });
          }
          
          // Ensure requestDate is set
          if (!this.applicationForm.get('requestDate')?.value) {
            this.applicationForm.patchValue({ requestDate: this.toDateTimeLocal(new Date()) });
          }
          
          // Force update validity for all controls
          this.applicationForm.get('repaymentTime')?.updateValueAndValidity();
          this.applicationForm.get('amount')?.updateValueAndValidity();
          this.applicationForm.updateValueAndValidity();
          
          // Force calculate repayment
          this.calculateRepayment();
          
          // Debug form validity after fixes
          setTimeout(() => {
          }, 100);
          
          // Force change detection
          setTimeout(() => {
            if (this.applicationForm) {
              this.applicationForm.updateValueAndValidity();
            }
          }, 0);
        }
      } else {
        console.error('[CoopLoanApp] Member ID mismatch after loading memberships');
      }
    },
    error: (err) => {
      console.error('[CoopLoanApp] Error loading group memberships:', err);
      this.messages = [{
        severity: 'error',
        summary: 'Error',
        detail: 'Could not load your group memberships. Please try again.'
      }];
    }
  });
}

  private loadGuarantorCandidates(member?: CooperativeMember): void {
    const employeeId = Number(member?.employeeId || 0);
    if (employeeId <= 0) {
      this.guarantorCandidates = [];
      return;
    }

    this.guarantorService.getGuarantorByEmployeeId(employeeId).subscribe({
      next: (guarantors: GuarantorDto[]) => {
        this.guarantorCandidates = Array.isArray(guarantors) ? guarantors : [];
      },
      error: (err) => {
        console.error('[CoopLoanApp] Error loading guarantors:', err);
        this.guarantorCandidates = [];
      }
    });
  }

  loadData(): void {
    forkJoin({
      purposes: this.cooperativeService.loadLoanPurposes(),
      members: this.cooperativeService.getMembers(),
      groups: this.cooperativeService.loadGroups()
    }).subscribe(({ purposes, members, groups }) => {
      this.availablePurposes = purposes;
      const selectedPurpose = String(this.applicationForm?.get('purpose')?.value || '').trim();
      if (selectedPurpose && !this.availablePurposes.some((purpose) => purpose.name === selectedPurpose)) {
        this.applicationForm.patchValue({ purpose: '' }, { emitEvent: false });
      }

      this.members = members.filter((m: CooperativeMember) => m.status === 'ACTIVE');
      this.groups = groups.filter((group: CooperativeLoanGroup) => group.status === 'ACTIVE');
      this.refreshEligibleMembers();
      this.tryApplyPrefillMember();
      this.resolveSelectedMemberEligibility();
      this.refreshQualifiedGroups();
    });
  }

  // ==================== HELPER METHODS ====================

  private isValidEmailCandidate(email: unknown): email is string {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  private resolveBestEmailCandidate(...candidates: unknown[]): string {
    for (const candidate of candidates) {
      if (this.isValidEmailCandidate(candidate)) {
        return candidate.trim();
      }
    }
    return '';
  }

  private getSessionRegistrationEmail(): string {
    const userRegDataRaw = sessionStorage.getItem('userRegData');
    if (!userRegDataRaw) return '';
    try {
      const userRegData = JSON.parse(userRegDataRaw);
      return this.resolveBestEmailCandidate(userRegData?.email);
    } catch {
      return '';
    }
  }

  private resolveMemberEmail(member: CooperativeMember | undefined): string {
    if (!member) return '';
    return member.email || '';
  }

  getSelectedMemberEmail(): string {
    return this.resolveMemberEmail(this.selectedMember);
  }

  getMemberTenureMonths(memberId: string): number {
    const member = this.members.find(m => String(m.id) === String(memberId) || String(m.memberId) === String(memberId));
    if (!member || !member.joinDate) return 0;
    const joinDate = new Date(member.joinDate);
    const now = new Date();
    return (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
  }

  private toDateTimeLocal(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private normalizeRequestDate(value: string): string {
    const trimmedValue = String(value || '').trim();
    if (!trimmedValue) return new Date().toISOString();
    const parsedDate = new Date(trimmedValue);
    return Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
  }

  mapEmployeeToProfile(employee: any): CooperativeEmployeeProfile | null {
    if (!employee) return null;
    return {
      employeeId: employee.employeeId || employee.id || '',
      fullName: employee.fullName || employee.name || '',
      email: this.resolveBestEmailCandidate(employee.workEmail, employee.email),
      workEmail: this.resolveBestEmailCandidate(employee.workEmail),
      monthlySalary: employee.monthlySalary || 0,
      phone: employee.phone || '',
      department: employee.department || '',
      level: employee.level,
      employmentType: employee.employmentType,
      employmentStartDate: employee.employmentStartDate,
    };
  }

  refreshEligibleMembers(): void {
    this.eligibleMembers = this.members
      .filter((member: CooperativeMember) => member.status === 'ACTIVE')
      .map((member: CooperativeMember) => {
        return {
          ...member,
          employeeId: typeof member.employeeId === 'string' ? parseInt(member.employeeId, 10) : member.employeeId,
        };
      });
  }

  resolveSelectedMemberEligibility(): void {
    if (!this.selectedMember) {
      this.selectedMemberEligibility = undefined;
      return;
    }
    const empProfile = this.employeeDirectory.find(e => String(e.employeeId) === String(this.selectedMember?.employeeId));
    if (empProfile) {
      this.selectedMemberEligibility = this.cooperativeService.checkMembershipEligibility(empProfile);
    } else {
      this.selectedMemberEligibility = undefined;
    }
  }

  /**
   * The member's monthly salary for the one-third limit: the salary on their cooperative member record,
   * otherwise the salary set up for their employee level (GET /employees/{id} → level → GET /salaries).
   * There is no fallback amount: without a salary the application can't be submitted.
   */
  resolveSelectedMemberSalary(): void {
    const member = this.selectedMember;
    this.selectedMemberSalary = 0;
    if (!member) {
      this.memberSalaryStatus = 'missing';
      return;
    }

    const recordedSalary = Number(member.monthlySalary || 0);
    if (recordedSalary > 0) {
      this.selectedMemberSalary = recordedSalary;
      this.memberSalaryStatus = 'ok';
      return;
    }

    const employeeId = Number(member.employeeId || 0);
    if (!employeeId) {
      this.memberSalaryStatus = 'missing';
      return;
    }

    this.memberSalaryStatus = 'loading';
    const requestedForMemberId = member.id;
    this.employeeLoanService.getEmployeeById(employeeId).pipe(
      switchMap((response: any) => this.employeeLoanService.getMonthlySalaryForEmployee(response?.data || response))
    ).subscribe({
      next: (result) => {
        if (this.selectedMember?.id !== requestedForMemberId) {
          return; // a different member was selected meanwhile
        }
        if (result.status === 'ok') {
          this.selectedMemberSalary = result.monthlySalary;
          this.memberSalaryStatus = 'ok';
        } else {
          this.memberSalaryStatus = result.status;
        }
      },
      error: () => {
        if (this.selectedMember?.id === requestedForMemberId) {
          this.memberSalaryStatus = 'error';
        }
      }
    });
  }

  /** Why the salary can't be used (empty when it's fine), for the submit error. */
  get memberSalaryProblem(): string {
    switch (this.memberSalaryStatus) {
      case 'loading':
        return 'Your salary is still loading. Try again in a moment.';
      case 'missing':
        return 'No salary is on record for you (neither on your membership nor for your employee level), so your loan limit can\'t be worked out. Please contact HR.';
      case 'invalid':
        return 'The salary set up for your employee level doesn\'t add up (deductions are more than pay). Please contact HR.';
      case 'error':
        return 'Your salary couldn\'t be loaded, so your loan limit can\'t be worked out. Refresh the page and try again.';
      default:
        return '';
    }
  }

  tryApplyPrefillMember(): void {
    if (!this.prefillMemberParam || !this.applicationForm || this.members.length === 0) return;
    const matchedMember = this.eligibleMembers.find(member =>
      String(member.id) === String(this.prefillMemberParam) || String(member.memberId) === String(this.prefillMemberParam)
    );
    if (matchedMember) {
      this.applicationForm.patchValue({ memberId: matchedMember.id });
    }
  }

  // ==================== GROUP SELECTION ====================

  onGroupSelect(groupId: string): void {
  this.isLoadingGroupDetails = true;
  const groupIdNum = Number(groupId);
  this.cooperativeService.loadGroupById(groupIdNum).subscribe({
    next: (group) => {
      this.selectedGroup = group;
      this.selectedGroupMembership = this.selectedMember && this.selectedGroup
        ? this.cooperativeService.getGroupMembership(this.selectedMember.id, this.selectedGroup.id)
        : undefined;

      if (this.selectedGroup) {
        // Update validators
        this.applicationForm.get('amount')?.setValidators([
          Validators.required,
          Validators.min(1000)
        ]);
        
        // FIX: Update repaymentTime validators with group's min/max
        const minDuration = this.selectedGroup.minDuration || 1;
        const maxDuration = this.selectedGroup.maxDuration || 12;
        this.applicationForm.get('repaymentTime')?.setValidators([
          Validators.required,
          Validators.min(minDuration),
          Validators.max(maxDuration)
        ]);
        
        // Get current value
        let currentRepaymentTime = this.applicationForm.get('repaymentTime')?.value;
        
        // If current value is invalid for this group, set a default
        if (!currentRepaymentTime || currentRepaymentTime < minDuration || currentRepaymentTime > maxDuration) {
          const defaultTime = Math.min(Math.max(6, minDuration), maxDuration);
          this.applicationForm.patchValue({ repaymentTime: defaultTime });
        }
        
        this.applicationForm.get('amount')?.updateValueAndValidity();
        this.applicationForm.get('repaymentTime')?.updateValueAndValidity();
        this.syncGuarantorControls();
        this.validateGuarantors();
        this.calculateRepayment();
      }
      this.isLoadingGroupDetails = false;
    },
    error: (err) => {
      console.error('[onGroupSelect] Error loading group:', err);
      this.selectedGroup = undefined;
      this.selectedGroupMembership = undefined;
      this.isLoadingGroupDetails = false;
    }
  });
}
  private refreshQualifiedGroups(): void {
  
  if (!this.applicationForm) {
    return;
  }
  
  if (!this.selectedMember || !this.selectedMember.id) {
    this.qualifiedGroups = [];
    this.selectedGroup = undefined;
    this.selectedGroupMembership = undefined;
    if (this.applicationForm?.get('groupId')?.value) {
      this.applicationForm.patchValue({ groupId: '' }, { emitEvent: false });
    }
    this.syncGuarantorControls(); // This will now clear guarantors properly
    return;
  }

  const memberId = this.selectedMember.id;
  this.resolveSelectedMemberSalary();
  
  const activeMembershipGroupIds = new Set(
    this.cooperativeService
      .getGroupMembershipsByMember(memberId)
      .filter(membership => membership.status === 'ACTIVE')
      .map(membership => String(membership.groupId))
  );
  

  this.qualifiedGroups = this.groups
    .filter(group => activeMembershipGroupIds.has(String(group.id)))
    .sort((left, right) => left.name.localeCompare(right.name));
  

  const selectedGroupId = this.applicationForm.get('groupId')?.value;
  let groupChanged = false;
  
  if (selectedGroupId && !this.qualifiedGroups.some(group => String(group.id) === String(selectedGroupId))) {
    this.applicationForm.patchValue({ groupId: '' }, { emitEvent: false });
    this.selectedGroup = undefined;
    this.selectedGroupMembership = undefined;
    groupChanged = true;
  } else if (selectedGroupId && this.qualifiedGroups.some(group => String(group.id) === String(selectedGroupId))) {
    const newGroup = this.qualifiedGroups.find(group => String(group.id) === String(selectedGroupId));
    if (this.selectedGroup?.id !== newGroup?.id) {
      this.selectedGroup = newGroup;
      groupChanged = true;
    }
    this.selectedGroupMembership = this.selectedGroup
      ? this.cooperativeService.getGroupMembership(memberId, this.selectedGroup.id)
      : undefined;
  } else if (this.qualifiedGroups.length > 0 && !selectedGroupId) {
    const firstGroup = this.qualifiedGroups[0];
    this.applicationForm.patchValue({ groupId: firstGroup.id });
    this.selectedGroup = firstGroup;
    this.selectedGroupMembership = this.cooperativeService.getGroupMembership(memberId, firstGroup.id);
    groupChanged = true;
  }
  
  // If group changed, update guarantor requirements
  if (groupChanged) {
    this.syncGuarantorControls();
  }
  
  // Update form validity
  this.applicationForm.updateValueAndValidity();
}
  
  // ==================== GUARANTOR METHODS ====================

  private syncGuarantorControls(): void {
  // Clear all validators first
  this.guarantorsArray.clearValidators();
  
  if (!this.selectedGroup?.requiresGuarantors) {
    // If no guarantors required, clear the array and remove validators
    while (this.guarantorsArray.length) {
      this.guarantorsArray.removeAt(0);
    }
    this.guarantorsArray.clearValidators();
    this.guarantorsArray.updateValueAndValidity();
    return;
  }

  // If guarantors are required, set validators
  const minimum = Math.max(this.requiredGuarantorCount, 1);
  while (this.guarantorsArray.length < minimum) {
    this.guarantorsArray.push(this.createGuarantorGroup());
  }
  
  // Remove extra guarantors if there are too many
  while (this.guarantorsArray.length > minimum + 2) { // Allow up to 2 extra
    this.guarantorsArray.removeAt(this.guarantorsArray.length - 1);
  }
  
  this.validateGuarantors();
}

  private createGuarantorGroup(): FormGroup {
    return this.fb.group({
      memberId: ['', Validators.required],
      guaranteedAmount: [0, [Validators.required, Validators.min(1)]]
    });
  }

  addGuarantor(): void {
    if (!this.selectedGroup?.requiresGuarantors) return;
    this.guarantorsArray.push(this.createGuarantorGroup());
    this.validateGuarantors();
  }

 removeGuarantor(index: number): void {
  if (!this.selectedGroup?.requiresGuarantors) return;
  const minimum = Math.max(this.requiredGuarantorCount, 1);
  if (this.guarantorsArray.length <= minimum) {
    return; // Don't remove below minimum
  }
  this.guarantorsArray.removeAt(index);
  this.validateGuarantors();
}

private validateGuarantors(): void {
  // Prevent infinite recursion
  if (this.isValidating) {
    return;
  }
  
  this.isValidating = true;
  
  try {
    const guarantorsControl = this.applicationForm.get('guarantors');
    if (!guarantorsControl) {
      return;
    }

    if (!this.selectedGroup?.requiresGuarantors) {
      guarantorsControl.setErrors(null);
      return;
    }

    const errors: Record<string, boolean> = {};
    const controls = this.guarantorsArray.controls;
    const minimum = Math.max(this.requiredGuarantorCount, 1);
    const selectedMemberId = this.selectedMember?.id;

    if (controls.length < minimum) {
      errors['minimumGuarantors'] = true;
    }

    const guarantorIds = controls
      .map(control => String(control.get('memberId')?.value || '').trim())
      .filter(Boolean);

    if (selectedMemberId && guarantorIds.includes(String(selectedMemberId))) {
      errors['selfGuarantee'] = true;
    }

    if (new Set(guarantorIds).size !== guarantorIds.length) {
      errors['duplicateGuarantor'] = true;
    }

    if (this.totalGuaranteedAmount < Number(this.applicationForm.get('amount')?.value || 0)) {
      errors['insufficientCoverage'] = true;
    }

    guarantorsControl.setErrors(Object.keys(errors).length ? errors : null);
  } finally {
    this.isValidating = false;
  }
}

  approveGuarantor(guarantorId: number, memberId: string) {
    const control = this.guarantorsArray.controls.find(c => c.get('memberId')?.value === memberId);
    if (control) {
      control.patchValue({ status: 'APPROVED' });
      this.addNotification('Guarantor Approved', `Guarantor ${memberId} approved the request.`);
    }
  }
  
  rejectGuarantor(guarantorId: number, memberId: string) {
    const control = this.guarantorsArray.controls.find(c => c.get('memberId')?.value === memberId);
    if (control) {
      control.patchValue({ status: 'REJECTED' });
      this.addNotification('Guarantor Rejected', `Guarantor ${memberId} rejected the request.`);
    }
  }

  // ==================== CALCULATIONS ====================

  calculateRepayment(): void {
    const amount = Number(this.applicationForm.get('amount')?.value || 0);
    const repaymentTime = Number(this.applicationForm.get('repaymentTime')?.value || 0);
    const modeOfPayment = String(this.applicationForm.get('modeOfPayment')?.value || 'MONTHLY').toUpperCase();
    if (amount > 0 && repaymentTime > 0 && this.selectedGroup) {
      const rate = Number(this.selectedGroup.interestRate || 0);
      this.totalInterest = Math.round((amount * rate * repaymentTime) / 1200);
      this.totalRepayment = amount + this.totalInterest;
      this.repaymentAmount = modeOfPayment === 'ONE_OFF'
        ? this.totalRepayment
        : Math.round(this.totalRepayment / repaymentTime);
    } else {
      this.totalInterest = 0;
      this.totalRepayment = 0;
      this.repaymentAmount = 0;
    }
    
    this.confirmationDetails = {
      amount,
      duration: repaymentTime,
      repaymentAmount: this.repaymentAmount,
      totalRepayment: this.totalRepayment,
      totalInterest: this.totalInterest,
      purpose: this.applicationForm.get('purpose')?.value || '',
      groupName: this.selectedGroup?.name || '',
      memberName: this.selectedMember?.fullName || ''
    };
    
    if (this.selectedGroup?.patronageEligible && this.selectedGroup.patronageRate) {
      this.estimatedAnnualPatronageRefund = Math.round((amount * this.selectedGroup.patronageRate) / 100);
    } else {
      this.estimatedAnnualPatronageRefund = 0;
    }
  }

  // ==================== DOCUMENT METHODS ====================

  onPurposeChange(): void {
    this.supportingDocuments = [];
    const purposeControl = this.applicationForm.get('purpose');
    if (purposeControl?.value) {
      const purposeExists = this.availablePurposes.some(p => 
        String(p.name) === String(purposeControl.value) || 
        String(p.id) === String(purposeControl.value)
      );
      if (!purposeExists) {
        purposeControl.setErrors({ purposeNotFound: true });
      } else {
        purposeControl.setErrors(null);
      }
    }
    this.applicationForm.updateValueAndValidity();
  }

  onPurposeAcknowledgedChange(): void {
    // ngModel keeps the acknowledgment state in sync.
  }

  acceptPurposeAndContinue(): void {
    if (!this.selectedPurposeAcknowledged) {
      return;
    }

    this.showPurposeDisclaimerModal = false;
    this.pendingPurposeValue = null;
  }

  rejectPurposeAndReset(): void {
    this.showPurposeDisclaimerModal = false;
    this.selectedPurposeAcknowledged = false;
    this.pendingPurposeValue = null;
    this.applicationForm.get('purpose')?.setValue('');
    this.updateAmountValidator();
  }

  onDocumentsSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) return;

    const selectedDocuments: LoanSupportingDocument[] = Array.from(files).map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      uploadedAt: formatDate(new Date(), 'yyyy-MM-dd', 'en-US')
    }));

    this.supportingDocuments = [...this.supportingDocuments, ...selectedDocuments];
    input.value = '';
  }

  removeDocument(index: number): void {
    this.supportingDocuments = this.supportingDocuments.filter((_, currentIndex) => currentIndex !== index);
  }

  getDocumentSizeLabel(size: number): string {
    if (!Number.isFinite(size) || size <= 0) return 'Unknown size';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ==================== UI HELPERS ====================

  formatCurrency(value: number | undefined): string {
    return formatNaira(value, { omitZeroKobo: true });
  }

  buildMailLink(email?: string): string | null {
    const text = String(email || '').trim();
    return text ? `mailto:${text}` : null;
  }

  getSelectedGroupAccountingEmail(): string {
    return String(this.selectedGroup?.accountingEmail || '').trim();
  }

  getSelectedGroupLateFeeSummary(): string {
    if (!this.selectedGroup) return '';
    const percentage = Number(this.selectedGroup.lateFeePercentage || 0);
    const graceDays = Number(this.selectedGroup.lateFeeGraceDays || 0);
    return `${percentage}% after ${graceDays} day${graceDays === 1 ? '' : 's'}`;
  }

  getSelectedGroupSettlementSummary(): string {
    if (!this.selectedGroup) return '';
    const segments = [
      this.selectedGroup.principalBankName && this.selectedGroup.principalCollectionAccount
        ? `Principal: ${this.selectedGroup.principalBankName} (${this.selectedGroup.principalCollectionAccount})`
        : '',
      this.selectedGroup.interestBankName && this.selectedGroup.interestCollectionAccount
        ? `Interest: ${this.selectedGroup.interestBankName} (${this.selectedGroup.interestCollectionAccount})`
        : '',
      this.selectedGroup.lateFeeBankName && this.selectedGroup.lateFeeCollectionAccount
        ? `Late fees: ${this.selectedGroup.lateFeeBankName} (${this.selectedGroup.lateFeeCollectionAccount})`
        : ''
    ].filter(Boolean);
    return segments.join(' • ');
  }

  // ==================== NOTIFICATIONS ====================

  addNotification(title: string, message: string) {
    // Implementation for notifications
  }

  // ==================== SUBMISSION ====================

  private validateBeforeSubmit(): boolean {
    this.submitError = '';

    if (this.showPurposeDisclaimerModal) {
      this.submitError = 'Please review and acknowledge the purpose disclaimer before submitting.';
      return false;
    }

    if (!this.selectedGroup || !this.selectedMember) {
      this.submitError = 'Please select member and group.';
      return false;
    }

    if (!this.selectedGroupMembership || this.selectedGroupMembership.status !== 'ACTIVE') {
      this.submitError = 'Member must have an approved membership in this group before applying for a loan.';
      return false;
    }

    if (!this.hasAvailablePurposes) {
      this.submitError = 'No active cooperative loan purposes are available right now.';
      return false;
    }

    if (!this.selectedPurposeDefinition) {
      this.submitError = 'Select a valid cooperative loan purpose from the approved list.';
      return false;
    }

    const amount = Number(this.applicationForm.get('amount')?.value || 0);
    const repaymentTime = Number(this.applicationForm.get('repaymentTime')?.value || 0);
    this.validateGuarantors();

    if (amount < this.minLoanAmount) {
      this.submitError = `Requested amount cannot be lower than ${this.formatCurrency(this.minLoanAmount)} for this purpose.`;
      return false;
    }

    if (this.maxPurposeLoanAmount && amount > this.maxPurposeLoanAmount) {
      this.submitError = `Requested amount cannot be higher than ${this.formatCurrency(this.maxPurposeLoanAmount)} for this purpose.`;
      return false;
    }

    if (repaymentTime < this.selectedGroup.minDuration || repaymentTime > this.selectedGroup.maxDuration) {
      this.submitError = `Duration must be between ${this.selectedGroup.minDuration} and ${this.selectedGroup.maxDuration} months.`;
      return false;
    }

    if (this.selectedGroup.requiresGuarantors) {
      const guarantorErrors = this.applicationForm.get('guarantors')?.errors;
      if (guarantorErrors?.['minimumGuarantors']) {
        this.submitError = `Add at least ${this.requiredGuarantorCount} guarantor(s) for this group.`;
        return false;
      }
      if (guarantorErrors?.['duplicateGuarantor']) {
        this.submitError = 'A guarantor can only appear once in this application.';
        return false;
      }
      if (guarantorErrors?.['selfGuarantee']) {
        this.submitError = 'The borrowing member cannot be selected as a guarantor.';
        return false;
      }
      if (guarantorErrors?.['insufficientCoverage']) {
        this.submitError = 'Total guaranteed amount must cover the requested loan amount.';
        return false;
      }
    }

    return true;
  }

  private updateAmountValidator(): void {
    const amountControl = this.applicationForm.get('amount');
    if (!amountControl) {
      return;
    }

    const validators = [Validators.required, Validators.min(this.minLoanAmount)];
    if (this.selectedGroup) {
      validators.push(Validators.max(this.effectiveMaxLoanAmount));
    }

    amountControl.setValidators(validators);
    amountControl.updateValueAndValidity();
  }

  onSubmit(): void {
  
  if (this.isSubmitting || this.isCheckingEligibility) {
    return;
  }
  
  this.applicationForm.markAllAsTouched();
  this.calculateRepayment();
  this.submitSuccessMessage = '';
  this.submitError = '';

  // Debug: Log all form values, validity, and errors

  // Check if form is valid
  if (!this.applicationForm.valid) {
    const firstInvalid = document.querySelector('.ng-invalid');
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  // Business rules (approved membership, purpose, duration, guarantors) — defined but never called before.
  if (!this.validateBeforeSubmit()) {
    return;
  }

  const member = this.selectedMember;
  const requestedAmount = Number(this.applicationForm.get('amount')?.value || 0);

  if (this.selectedGroup && this.effectiveMaxLoanAmount <= 0) {
    this.submitError = `You can't borrow from ${this.selectedGroup.name || 'this group'} yet: your contributions don't give you a borrowing limit (₦0). Keep contributing, or contact the cooperative admin.`;
    return;
  }

  const salary = Number(this.selectedMemberSalary || 0);
  if (!member || this.memberSalaryStatus !== 'ok' || salary <= 0) {
    this.submitError = this.memberSalaryProblem || 'Select the member applying for this loan.';
    return;
  }

  // Every page of loans, fresh. A failed load must block the application, not count as "no loans".
  this.isCheckingEligibility = true;
  this.cooperativeService.fetchLoansOrFail().pipe(
    finalize(() => { this.isCheckingEligibility = false; })
  ).subscribe({
    next: (loans) => {
      // Compare as numbers: the form value is a string and loan ids are numbers, so the old
      // strict comparison never matched and existing loans were never counted.
      const memberIds = new Set([Number(member.id), Number(member.memberId)].filter((id) => id > 0));
      const memberLoans = (loans || []).filter((loan) =>
        memberIds.has(Number(loan.cooperativeMemberId ?? 0)) || memberIds.has(Number(loan.memberId ?? 0))
      );
      const commitment = computeBorrowingCommitment(memberLoans as any);
      const oneThirdSalary = Number((salary / 3).toFixed(2));

      if (commitment.total + requestedAmount > oneThirdSalary) {
        const remaining = Math.max(oneThirdSalary - commitment.total, 0);
        const parts = [
          commitment.outstandingPrincipal > 0 ? `${this.formatCurrency(commitment.outstandingPrincipal)} still owed on loans you're repaying` : '',
          commitment.pipelineAmount > 0 ? `${this.formatCurrency(commitment.pipelineAmount)} in applications not yet disbursed` : ''
        ].filter(Boolean).join(' and ');
        this.submitError = `Your borrowing can't exceed one-third of your monthly salary (${this.formatCurrency(oneThirdSalary)}). `
          + (parts ? `You already have ${parts}, so ` : '')
          + `you can request up to ${this.formatCurrency(remaining)}.`;
        this.showConfirmation = false;
        return;
      }

      this.showConfirmation = true;
    },
    error: (err) => {
      console.error('[CoopLoanApp] Error getting loans for eligibility check:', err);
      this.submitError = 'We couldn\'t check your existing loans, so your application wasn\'t sent. Please try again.';
      this.showConfirmation = false;
    }
  });
}
  confirmSubmit(): void {
    this.isSubmitting = true;
    const formValue = this.applicationForm.getRawValue();
    const requiresGuarantors = Boolean(this.selectedGroup?.requiresGuarantors);
    const guarantors = requiresGuarantors
      ? this.guarantorsArray.controls.map(control => ({
          memberId: String(control.get('memberId')?.value || '').trim(),
          guaranteedAmount: Number(control.get('guaranteedAmount')?.value || 0),
          status: 'PENDING' as const,
          requestedAt: new Date().toISOString()
        })).filter(item => !!item.memberId && item.guaranteedAmount > 0)
      : [];
      
    const applicationStage = this.selectedGroup?.requiresGuarantors
      ? 'PENDING_GUARANTOR_APPROVAL'
      : 'READY_FOR_ADMIN_REVIEW';
    const requestDate = this.normalizeRequestDate(formValue.requestDate);
    const modeOfPayment = String(formValue.modeOfPayment || 'MONTHLY').toUpperCase() === 'ONE_OFF' ? 'ONE_OFF' : 'MONTHLY';
    
    const newLoan = {
      cooperativeMemberId: Number(formValue.memberId),
      cooperativeGroupId: Number(formValue.groupId),
      membershipId: Number(this.selectedGroupMembership?.membershipId || this.selectedGroupMembership?.id || 0) || undefined,
      memberId: formValue.memberId,
      groupId: formValue.groupId,
      amount: Number(formValue.amount),
      purpose: String(formValue.purpose || '').trim(),
      repaymentTime: Number(formValue.repaymentTime),
      duration: Number(formValue.repaymentTime),
      modeOfPayment,
      requestDate,
      interestRate: this.selectedGroup?.interestRate,
      lateFeePercentage: this.selectedGroup?.lateFeePercentage,
      lateFeeGraceDays: this.selectedGroup?.lateFeeGraceDays,
      principalBankName: this.selectedGroup?.principalBankName,
      principalCollectionAccount: this.selectedGroup?.principalCollectionAccount,
      interestBankName: this.selectedGroup?.interestBankName,
      interestCollectionAccount: this.selectedGroup?.interestCollectionAccount,
      lateFeeBankName: this.selectedGroup?.lateFeeBankName,
      lateFeeCollectionAccount: this.selectedGroup?.lateFeeCollectionAccount,
      accountingEmail: this.selectedGroup?.accountingEmail,
      accountingWebhookUrl: this.selectedGroup?.accountingWebhookUrl,
      repaymentAmount: this.repaymentAmount,
      totalRepayable: this.totalRepayment,
      totalRepayment: this.totalRepayment,
      status: 'PENDING' as const,
      applicationStage,
      applicationDate: requestDate,
      guarantors,
      supportingDocuments: this.supportingDocuments,
      statusHistory: [{
        id: 0,
        status: 'PENDING',
        changedAt: requestDate,
        changedBy: Number(sessionStorage.getItem('userid') || 0) || 0,
        notes: this.selectedGroup?.requiresGuarantors
          ? 'Application submitted and awaiting guarantor approval.'
          : 'Application submitted and routed for admin review.',
        overrideOpen: false,
        overrideBy: 0,
        overrideReason: '',
        statusBeforeOverride: ''
      }]
    };
    
    this.cooperativeService.addLoan(newLoan as any).subscribe({
      next: (savedLoan: any) => {
        if (requiresGuarantors && guarantors.length > 0) {
          this.sendGuarantorEmails(savedLoan.id, guarantors);
        }
        
        this.submitSuccessMessage = this.selectedGroup?.requiresGuarantors
          ? 'Application submitted. Guarantor requests are now pending before admin review.'
          : 'Application submitted successfully and sent for admin review.';
        this.showConfirmation = false;
        this.isSubmitting = false;
        this.supportingDocuments = [];
        setTimeout(() => {
          if (this.isModal) {
            this.applicationSubmitted.emit();
            this.formCancelled.emit();
            this.submitError = '';
          }
        }, 1200);
      },
      error: () => {
        this.isSubmitting = false;
        this.submitError = 'Unable to submit cooperative loan application right now.';
      }
    });
  }

  private sendGuarantorEmails(loanId: number, guarantors: any[]): void {
    const baseUrl = window.location.origin + window.location.pathname;
    
    guarantors.forEach(guarantor => {
      const guarantorDetails = this.guarantorCandidates.find(g => g.id === Number(guarantor.memberId));
      if (guarantorDetails?.email) {
        const approvalLink = `${baseUrl}?guarantorApproval=true&loanId=${loanId}`;
        const mailBody = {
          recieverEmail: guarantorDetails.email,
          subject: 'Guarantor Approval Request - Cooperative Loan',
          name: `${this.selectedMember?.fullName} has requested a loan and selected you as their guarantor. 
                 Loan Amount: ${this.formatCurrency(Number(this.applicationForm.get('amount')?.value))}
                 Please review and approve or reject the request using the link below:
                 ${approvalLink}`,
          body: `
            <h2>Guarantor Approval Request</h2>
            <p><strong>${this.selectedMember?.fullName}</strong> has requested a loan and selected you as their guarantor.</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p><strong>Loan Amount:</strong> ${this.formatCurrency(Number(this.applicationForm.get('amount')?.value))}</p>
              <p><strong>Purpose:</strong> ${this.applicationForm.get('purpose')?.value}</p>
              <p><strong>Repayment Period:</strong> ${this.applicationForm.get('repaymentTime')?.value} months</p>
            </div>
            <p><a href='${approvalLink}' style="background: #2EB270; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Request</a></p>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p>${approvalLink}</p>
          `
        };
        this.mailNotificationService.sendMail(mailBody).subscribe({
          error: (err) => console.error('Error sending email to guarantor:', err)
        });
      }
    });
  }

  // Add this custom validator for the guarantors array
private guarantorArrayValidator(control: AbstractControl): { [key: string]: boolean } | null {
  const formArray = control as FormArray;
  
  // If the selected group doesn't require guarantors, skip validation
  if (!this.selectedGroup?.requiresGuarantors) {
    return null;
  }
  
  // If it does require guarantors, validate
  const minimum = Math.max(this.requiredGuarantorCount, 1);
  if (formArray.length < minimum) {
    return { minimumGuarantors: true };
  }
  
  const selectedMemberId = this.selectedMember?.id;
  const guarantorIds = formArray.controls
    .map(c => String(c.get('memberId')?.value || '').trim())
    .filter(Boolean);
  
  if (selectedMemberId && guarantorIds.includes(String(selectedMemberId))) {
    return { selfGuarantee: true };
  }
  
  if (new Set(guarantorIds).size !== guarantorIds.length) {
    return { duplicateGuarantor: true };
  }
  
  const totalGuaranteed = formArray.controls.reduce((sum, c) => {
    return sum + Number(c.get('guaranteedAmount')?.value || 0);
  }, 0);
  
  const amount = Number(this.applicationForm?.get('amount')?.value || 0);
  if (totalGuaranteed < amount) {
    return { insufficientCoverage: true };
  }
  
  return null;
}

  // ==================== NAVIGATION ====================

  goBack(): void {
    if (this.isModal) {
      this.formCancelled.emit();
    } else {
      this.router.navigate(['/']);
    }
  }
}