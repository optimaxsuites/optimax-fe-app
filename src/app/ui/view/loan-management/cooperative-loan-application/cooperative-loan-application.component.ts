// Restore missing methods after cleanup
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GuarantorDto, GuarantorService } from '../../../service/loan/guarantor.service';
import { Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { EmployeeService } from '../../../service/employee.service';
import { EmployeeLoanService } from '../../../service/loan/emoloyee-loan.service';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CooperativeMember, CooperativeLoanGroup, CooperativeGroupMembership, CooperativeEmployeeProfile, CooperativeMembershipEligibility } from '../../../service/loan/cooperative-loan/cooperative.types';
import { Message } from 'primeng/api';
import { CooperativeLoanPurposeApiResponse } from '../../../service/loan/cooperative-loan/cooperative-loan-api.service';

@Component({
  selector: 'app-cooperative-loan-application',
  templateUrl: './cooperative-loan-application.component.html',
  styleUrls: ['./cooperative-loan-application.component.scss']
})
export class CooperativeLoanApplicationComponent implements OnInit {
  // Add messages property for p-messages component
  messages: Message[] = [];

  private isValidEmailCandidate(email: unknown): email is string {
    return typeof email === 'string'
      && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
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
    if (!userRegDataRaw) {
      return '';
    }

    try {
      const userRegData = JSON.parse(userRegDataRaw);
      return this.resolveBestEmailCandidate(userRegData?.email);
    } catch {
      return '';
    }
  }

  private resolveMemberEmail(member: CooperativeMember | undefined): string {
    if (!member) {
      return '';
    }

    const employeeMatch = this.employeeDirectory.find((employee) =>
      String(employee.employeeId) === String(member.employeeId)
      || String(employee.employeeId) === String(member.id)
      || String(employee.employeeId) === String(member.memberId)
      || (employee.fullName && member.fullName && employee.fullName.toLowerCase() === member.fullName.toLowerCase())
    );

    return this.resolveBestEmailCandidate(
      employeeMatch?.email,
      this.getSessionRegistrationEmail(),
      member.email,
      sessionStorage.getItem('email') || ''
    );
  }

  /**
   * Returns the most accurate email for the selected member by checking:
   * 1. Employee directory (by employeeId/memberId/fullName)
   * 2. userRegData from sessionStorage
   * 3. selectedMember.email as fallback
   */
  getSelectedMemberEmail(): string {
    return this.resolveMemberEmail(this.selectedMember);
  }
  
  // --- UI/Template helpers ---

  getMemberTenureMonths(memberId: string): number {
    const member = this.members.find(m => String(m.id) === String(memberId) || String(m.memberId) === String(memberId));
    if (!member || !member.joinDate) return 0;
    const joinDate = new Date(member.joinDate);
    const now = new Date();
    return (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
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

  goBack(): void {
    if (this.isModal) {
      this.formCancelled.emit();
    } else {
      this.router.navigate(['/']);
    }
  }
  
  // Stepper state for multi-step form
  stepIndex: number = 0;

  get controlNames(): string[] {
    return Object.keys(this.applicationForm?.controls || {});
  }
  
  // Stepper navigation methods
  nextStep(): void {
    // Maximum step is 4 (0-based index for 5 steps)
    if (this.stepIndex < 4) {
      this.stepIndex++;
    }
  }

  prevStep(): void {
    if (this.stepIndex > 0) {
      this.stepIndex--;
    }
  }
  
  // Expose Object to the template for Object.keys usage
  Object = Object;
  
  errorKeys(errors: any): string[] {
    if (!errors) return [];
    return Object.keys(errors);
  }
  
  // Utility to format currency
  formatCurrency(value: number | undefined): string {
    if (typeof value !== 'number' || isNaN(value)) return '₦0';
    return value.toLocaleString('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 });
  }

  private toDateTimeLocal(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private normalizeRequestDate(value: string): string {
    const trimmedValue = String(value || '').trim();
    if (!trimmedValue) {
      return new Date().toISOString();
    }

    const parsedDate = new Date(trimmedValue);
    return Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
  }

  private extractSalaryAmount(payload: any): number {
    return Number(
      payload?.baseSalary
      || payload?.monthlySalary
      || payload?.salary
      || payload?.grossSalary
      || 0
    );
  }

  // Property to check rank eligibility (stub, update as needed)
  get canSubmitByRank(): boolean {
    // Add actual rank eligibility logic if needed
    return true;
  }

  addNotification(title: string, message: string) {
    this.applicationNotifications.unshift({
      title,
      message,
      date: new Date().toLocaleString()
    });
  }
  
  approveGuarantor(guarantorId: number, memberId: string) {
    // Update status and notify
    const control = this.guarantorsArray.controls.find(c => c.get('memberId')?.value === memberId);
    if (control) {
      control.patchValue({ status: 'APPROVED' });
      this.addNotification('Guarantor Approved', `Guarantor ${memberId} approved the request.`);
    }
  }
  
  rejectGuarantor(guarantorId: number, memberId: string) {
    // Update status and notify
    const control = this.guarantorsArray.controls.find(c => c.get('memberId')?.value === memberId);
    if (control) {
      control.patchValue({ status: 'REJECTED' });
      this.addNotification('Guarantor Rejected', `Guarantor ${memberId} rejected the request.`);
    }
  }
  
  guarantorContacts: { [memberId: string]: GuarantorDto[] } = {};
  applicationStatus: string = '';
  applicationNotifications: { title: string; message: string; date: string }[] = [];
  currentUuid = uuidV4();
  @Input() isModal = false;
  @Input() isSelfService = false;
  @Input() prefillMemberId: string | null = null;
  @Output() formCancelled = new EventEmitter<void>();
  @Output() applicationSubmitted = new EventEmitter<void>();

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

  // Removed purposeType and showOtherPurpose for free-text purpose
  estimatedAnnualPatronageRefund: number = 0;
  guarantorCandidates: CooperativeMember[] = [];

  // Removed onPurposeTypeChange

  get guarantorsArray(): FormArray {
    return this.applicationForm.get('guarantors') as FormArray;
  }

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private cooperativeService: CooperativeService,
    private employeeService: EmployeeService,
    private employeeLoanService: EmployeeLoanService,
    private guarantorService: GuarantorService
  ) {}

  ngOnInit(): void {
    const routeUuid = this.route.snapshot.paramMap.get('uuid');
    if (routeUuid) {
      this.currentUuid = routeUuid;
    }

    if (this.prefillMemberId) {
      this.prefillMemberParam = this.prefillMemberId;
    }

    // Reset stepper on init
    this.stepIndex = 0;

    this.route.queryParamMap.subscribe(params => {
      this.prefillMemberParam = params.get('memberId') || this.prefillMemberId;
      this.tryApplyPrefillMember();
    });

    // Load employee directory first, then ensure member, then load data
    this.loadEmployeeDirectoryWithMemberCheck();
    this.initForm();
  }

  private loadEmployeeDirectoryWithMemberCheck(): void {
    this.employeeService.getAllEmployee().subscribe({
      next: (data) => {
        const employees = Array.isArray(data) ? data : [];
        this.employeeDirectory = employees
          .map((employee: any) => this.mapEmployeeToProfile(employee))
          .filter((employee: CooperativeEmployeeProfile | null): employee is CooperativeEmployeeProfile => !!employee);

        // Try to get current employee from session or first in directory
        let currentEmployee: CooperativeEmployeeProfile | undefined;
        const userRegDataRaw = sessionStorage.getItem('userRegData');
        const userRegData = userRegDataRaw ? JSON.parse(userRegDataRaw) : null;
        const sessionUserId = String(sessionStorage.getItem('userid') || '').trim();
        if (sessionUserId) {
          currentEmployee = this.employeeDirectory.find(e => String(e.employeeId) === String(sessionUserId));
        }
        if (!currentEmployee && userRegData?.email) {
          currentEmployee = this.employeeDirectory.find(e => e.email.toLowerCase() === String(userRegData.email).toLowerCase());
        }
        if (!currentEmployee) {
          currentEmployee = this.employeeDirectory[0];
        }

        // Removed ensureMemberForEmployee (does not exist)
        this.loadData();
      },
      error: () => {
        this.employeeDirectory = [];
        this.loadData();
      }
    });
  }

  loadData(): void {
    this.cooperativeService.loadLoanPurposes().subscribe((purposes) => {
      this.availablePurposes = purposes;
      const selectedPurpose = String(this.applicationForm?.get('purpose')?.value || '').trim();
      if (selectedPurpose && !this.availablePurposes.some((purpose) => purpose.name === selectedPurpose)) {
        this.applicationForm.patchValue({ purpose: '' }, { emitEvent: false });
      }
    });

    this.cooperativeService.getMembers().subscribe((members: CooperativeMember[]) => {
      this.members = members.filter((m: CooperativeMember) => m.status === 'ACTIVE');
      this.cooperativeService.loadGroups().subscribe((groups: CooperativeLoanGroup[]) => {
        this.groups = groups.filter((group: CooperativeLoanGroup) => group.status === 'ACTIVE');
        this.refreshEligibleMembers();
        this.tryApplyPrefillMember();
        this.resolveSelectedMemberEligibility();
        this.refreshQualifiedGroups();
      });
    });
  }

  loadEmployeeDirectory(): void {
    this.employeeService.getAllEmployee().subscribe({
      next: (data) => {
        const employees = Array.isArray(data)
          ? data : []
          
        this.employeeDirectory = employees
          .map((employee: any) => this.mapEmployeeToProfile(employee))
          .filter((employee: CooperativeEmployeeProfile | null): employee is CooperativeEmployeeProfile => !!employee);

        this.refreshEligibleMembers();
        this.resolveSelectedMemberEligibility();
      },
      error: () => {
        this.employeeDirectory = [];
        this.refreshEligibleMembers();
        this.resolveSelectedMemberEligibility();
      }
    });
  }

  tryApplyPrefillMember(): void {
    if (!this.prefillMemberParam || !this.applicationForm || this.members.length === 0) {
      return;
    }

    const matchedMember = this.eligibleMembers.find(member =>
      String(member.id) === String(this.prefillMemberParam) || String(member.memberId) === String(this.prefillMemberParam)
    );

    if (matchedMember) {
      this.applicationForm.patchValue({ memberId: matchedMember.id });
      return;
    }
  }

  initForm(): void {
    this.applicationForm = this.fb.group({
      memberId: ['', Validators.required],
      groupId: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(1000)]],
      purpose: ['', Validators.required],
      repaymentTime: ['', [Validators.required, Validators.min(1)]],
      modeOfPayment: ['MONTHLY', Validators.required],
      requestDate: [this.toDateTimeLocal(new Date()), Validators.required],
      guarantors: this.fb.array([]),
      acceptTerms: [false, Validators.requiredTrue],
      acceptAcknowledgement: [false, Validators.requiredTrue]
    });

    // Watch for changes
    this.applicationForm.get('groupId')?.valueChanges.subscribe(groupId => {
      this.onGroupSelect(groupId);
    });

    this.applicationForm.get('memberId')?.valueChanges.subscribe(memberId => {
      this.selectedMember = this.eligibleMembers.find(member => member.id === memberId);
      if (this.selectedMember) {
        this.selectedMember = {
          ...this.selectedMember,
          email: this.resolveMemberEmail(this.selectedMember)
        };
      }
      this.resolveSelectedMemberEligibility();
      this.refreshQualifiedGroups();
      this.validateGuarantors();
    });

    this.applicationForm.get('amount')?.valueChanges.subscribe(() => {
      this.calculateRepayment();
      this.validateGuarantors();
    });

    this.applicationForm.get('duration')?.valueChanges.subscribe(() => {
      this.calculateRepayment();
    });

    this.guarantorsArray.valueChanges.subscribe(() => {
      this.validateGuarantors();
    });
  }

  get selectedPurposeDefinition(): CooperativeLoanPurposeApiResponse | undefined {
    const currentPurpose = String(this.applicationForm?.get('purpose')?.value || '').trim();
    if (!currentPurpose) {
      return undefined;
    }

    return this.availablePurposes.find((purpose) => String(purpose.name || '').trim() === currentPurpose);
  }

  get hasAvailablePurposes(): boolean {
    return this.availablePurposes.length > 0;
  }

  onGroupSelect(groupId: string): void {
    this.selectedGroup = this.qualifiedGroups.find(p => String(p.id) === String(groupId));
    this.selectedGroupMembership = this.selectedMember && this.selectedGroup
      ? this.cooperativeService.getGroupMembership(this.selectedMember.id, this.selectedGroup.id)
      : undefined;

    if (this.selectedGroup) {
      // Set validators
      this.applicationForm.get('amount')?.setValidators([
        Validators.required,
        Validators.min(1000)
      ]);
      this.applicationForm.get('repaymentTime')?.setValidators([
        Validators.required,
        Validators.min(this.selectedGroup.minDuration),
        Validators.max(this.selectedGroup.maxDuration)
      ]);
      
      this.applicationForm.get('amount')?.updateValueAndValidity();
      this.applicationForm.get('repaymentTime')?.updateValueAndValidity();

      this.syncGuarantorControls();
      this.validateGuarantors();
      this.calculateRepayment();
    }
  }

  addGuarantor(): void {
    if (!this.selectedGroup?.requiresGuarantors) {
      return;
    }

    // Fetch contact info for new guarantor
    const lastGuarantor = this.guarantorsArray.at(this.guarantorsArray.length - 1);
    const memberId = lastGuarantor?.get('memberId')?.value;
    if (memberId) {
      this.guarantorService.getGuarantorByEmployeeId(memberId).subscribe(data => {
        this.guarantorContacts[memberId] = data;
      });
    }
    this.guarantorsArray.push(this.createGuarantorGroup());
    this.validateGuarantors();
  }

  removeGuarantor(index: number): void {
    if (!this.selectedGroup?.requiresGuarantors) {
      return;
    }

    // Remove contact info
    const memberId = this.guarantorsArray.at(index)?.get('memberId')?.value;
    if (memberId && this.guarantorContacts[memberId]) {
      delete this.guarantorContacts[memberId];
    }
    this.guarantorsArray.removeAt(index);
    this.validateGuarantors();
  }

  get requiredGuarantorCount(): number {
    return Number(this.selectedGroup?.minimumGuarantors || 0);
  }

  get totalGuaranteedAmount(): number {
    return this.guarantorsArray.controls.reduce((sum, control) => {
      return sum + Number(control.get('guaranteedAmount')?.value || 0);
    }, 0);
  }

  private refreshQualifiedGroups(): void {
    if (!this.selectedMember) {
      this.qualifiedGroups = [];
      this.selectedGroup = undefined;
      this.selectedGroupMembership = undefined;
      if (this.applicationForm?.get('groupId')?.value) {
        this.applicationForm.patchValue({ groupId: '' }, { emitEvent: false });
      }
      this.syncGuarantorControls();
      return;
    }

    this.resolveSelectedMemberSalary();
    const activeMembershipGroupIds = new Set(
      this.cooperativeService
        .getGroupMembershipsByMember(this.selectedMember.id)
        .filter(membership => membership.status === 'ACTIVE')
        .map(membership => String(membership.groupId))
    );

    this.qualifiedGroups = this.groups
      .filter(group => activeMembershipGroupIds.has(String(group.id)))
      .sort((left, right) => left.name.localeCompare(right.name));

    const selectedGroupId = this.applicationForm?.get('groupId')?.value;
    if (selectedGroupId && !this.qualifiedGroups.some(group => group.id === selectedGroupId)) {
      this.applicationForm.patchValue({ groupId: '' }, { emitEvent: false });
      this.selectedGroup = undefined;
      this.selectedGroupMembership = undefined;
    }

    this.syncGuarantorControls();
  }

  private syncGuarantorControls(): void {
    if (!this.selectedGroup?.requiresGuarantors) {
      this.guarantorsArray.clear();
      this.guarantorContacts = {};
      return;
    }

    const minimum = Math.max(this.requiredGuarantorCount, 1);
    while (this.guarantorsArray.length < minimum) {
      this.guarantorsArray.push(this.createGuarantorGroup());
    }
    this.validateGuarantors();
  }

  private createGuarantorGroup(): FormGroup {
    return this.fb.group({
      memberId: ['', Validators.required],
      guaranteedAmount: [0, [Validators.required, Validators.min(1)]]
    });
  }

  private validateGuarantors(): void {
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
  }

  calculateRepayment(): void {
    const amount = Number(this.applicationForm.get('amount')?.value || 0);
    const repaymentTime = Number(this.applicationForm.get('repaymentTime')?.value || 0);
    const modeOfPayment = String(this.applicationForm.get('modeOfPayment')?.value || 'MONTHLY').toUpperCase();
    if (amount > 0 && repaymentTime > 0 && this.selectedGroup) {
      // Example calculation: simple interest
      const rate = Number(this.selectedGroup.interestRate || 0);
      this.totalInterest = Math.round((amount * rate * repaymentTime) / 1200); // (amount * rate * months) / 12 / 100
      this.totalRepayment = amount + this.totalInterest;
      this.repaymentAmount = modeOfPayment === 'ONE_OFF'
        ? this.totalRepayment
        : Math.round(this.totalRepayment / repaymentTime);
    } else {
      this.totalInterest = 0;
      this.totalRepayment = 0;
      this.repaymentAmount = 0;
    }
    // Update confirmation details
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
    // Patronage refund calculation (stub)
    if (this.selectedGroup?.patronageEligible && this.selectedGroup.patronageRate) {
      this.estimatedAnnualPatronageRefund = Math.round((amount * this.selectedGroup.patronageRate) / 100);
    } else {
      this.estimatedAnnualPatronageRefund = 0;
    }
  }

  private validateBeforeSubmit(): boolean {
    this.submitError = '';

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

  onSubmit(): void {
    if (this.isSubmitting) { return; }
    this.applicationForm.markAllAsTouched();
    this.calculateRepayment();
    this.submitSuccessMessage = '';

    if (!this.applicationForm.valid || !this.selectedGroup || !this.canSubmitByRank || !this.validateBeforeSubmit()) {
      // Debug: Log invalid controls and errors
      const invalidControls = Object.keys(this.applicationForm.controls).filter(key => this.applicationForm.get(key)?.invalid);
      console.warn('Form invalid. Invalid controls:', invalidControls);
      invalidControls.forEach(key => {
        const control = this.applicationForm.get(key);
        if (control) {
          console.warn(`Control '${key}' errors:`, control.errors);
        }
      });
      if (!this.selectedGroup) {
        console.warn('No group selected.');
      }
      if (!this.canSubmitByRank) {
        console.warn('Cannot submit by rank.');
      }
      if (!this.validateBeforeSubmit()) {
        console.warn('Custom validation failed.');
      }
      return;
    }

    // Show confirmation step before final submission
    this.showConfirmation = true;
    // Details already set in calculateRepayment()
    // Actual submission will be handled in confirmSubmit()
  }

  confirmSubmit(): void {
    // Track application status
    this.applicationStatus = 'PENDING';
    this.addNotification('Application Submitted', 'Your loan application has been submitted and is pending review.');
    if (this.selectedGroup?.requiresGuarantors) {
      this.addNotification('Guarantor Requests', 'Guarantor requests are pending before admin review.');
    } else {
      this.addNotification('Admin Review', 'Application sent for admin review.');
    }
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
      memberId: formValue.memberId,
      groupId: formValue.groupId,
      amount: Number(formValue.amount),
      purpose: String(formValue.purpose || '').trim(),
      repaymentTime: Number(formValue.repaymentTime),
      duration: Number(formValue.repaymentTime),
      modeOfPayment,
      requestDate,
      interestRate: this.selectedGroup?.interestRate,
      repaymentAmount: this.repaymentAmount,
      totalRepayable: this.totalRepayment,
      totalRepayment: this.totalRepayment,
      status: 'PENDING' as const,
      applicationStage,
      applicationDate: requestDate,
      guarantors
    };
    this.cooperativeService.addLoan(newLoan as any).subscribe({
      next: () => {
        this.submitSuccessMessage = this.selectedGroup?.requiresGuarantors
          ? 'Application submitted. Guarantor requests are now pending before admin review.'
          : 'Application submitted successfully and sent for admin review.';
        this.showConfirmation = false;
        this.isSubmitting = false;
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

  getGuarantorContacts(memberId: string): any[] {
    return this.guarantorContacts[memberId] || [];
  }

  // --- Restored methods (must be inside the class) ---
  mapEmployeeToProfile(employee: any): CooperativeEmployeeProfile | null {
    if (!employee) return null;
    return {
      employeeId: employee.employeeId || employee.id || '',
      fullName: employee.fullName || employee.name || '',
      email: this.resolveBestEmailCandidate(employee.email, employee.workEmail),
      monthlySalary: employee.monthlySalary || 0,
      phone: employee.phone || '',
      department: employee.department || '',
      rank: employee.rank,
      employmentType: employee.employmentType,
      employmentStartDate: employee.employmentStartDate,
      // Add other fields as needed
    };
  }

  refreshEligibleMembers(): void {
    // Only ACTIVE members are eligible, and merge employee directory data for accurate display
    this.eligibleMembers = this.members
      .filter((member: CooperativeMember) => member.status === 'ACTIVE')
      .map((member: CooperativeMember) => {
        // Try to find a matching employee profile
        const emp = this.employeeDirectory.find(e =>
          String(e.employeeId) === String(member.employeeId) ||
          String(e.employeeId) === String(member.id) ||
          String(e.employeeId) === String(member.memberId) ||
          (e.fullName && member.fullName && e.fullName.toLowerCase() === member.fullName.toLowerCase())
        );
        // If found, update member's fullName and email for display
        if (emp) {
          return {
            ...member,
            fullName: emp.fullName || member.fullName,
            email: this.resolveBestEmailCandidate(emp.email, member.email)
          };
        }
        return member;
      });
  }

  resolveSelectedMemberEligibility(): void {
    if (!this.selectedMember) {
      this.selectedMemberEligibility = undefined;
      return;
    }
    // Find the employee profile for eligibility check
    const empProfile = this.employeeDirectory.find(e => String(e.employeeId) === String(this.selectedMember?.employeeId));
    if (empProfile) {
      this.selectedMemberEligibility = this.cooperativeService.checkMembershipEligibility(empProfile);
    } else {
      this.selectedMemberEligibility = undefined;
    }
  }

  resolveSelectedMemberSalary(): void {
    if (!this.selectedMember) {
      this.selectedMemberSalary = 0;
      return;
    }

    const employeeId = Number(this.selectedMember.employeeId || this.selectedMember.id || this.selectedMember.memberId || 0);
    const fallbackEmployee = this.employeeDirectory.find(e => String(e.employeeId) === String(employeeId));
    const fallbackSalary = Number(fallbackEmployee?.monthlySalary || this.selectedMember.monthlySalary || 0);

    if (!Number.isFinite(employeeId) || employeeId <= 0) {
      this.selectedMemberSalary = fallbackSalary;
      return;
    }

    this.employeeLoanService.getSalaryByEmployeeId(employeeId).pipe(
      catchError(() => of({ baseSalary: fallbackSalary } as { baseSalary?: number; monthlySalary?: number; salary?: number; grossSalary?: number }))
    ).subscribe((salaryData: { baseSalary?: number; monthlySalary?: number; salary?: number; grossSalary?: number }) => {
      this.selectedMemberSalary = this.extractSalaryAmount(salaryData) || fallbackSalary;
    });
  }
}