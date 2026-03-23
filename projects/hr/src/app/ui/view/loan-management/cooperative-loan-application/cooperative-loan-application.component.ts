import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GuarantorDto, GuarantorService } from '../../../service/loan/guarantor.service';
import { Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { EmployeeService } from '../../../service/employee.service';
import { CooperativeMember, CooperativeLoanGroup, CooperativeGroupMembership, CooperativeEmployeeProfile, CooperativeMembershipEligibility } from '../../../service/loan/cooperative-loan/cooperative.types';

@Component({
  selector: 'app-cooperative-loan-application',
  templateUrl: './cooperative-loan-application.component.html',
  styleUrls: ['./cooperative-loan-application.component.scss']
})
export class CooperativeLoanApplicationComponent implements OnInit {
  // Utility to format currency
  formatCurrency(value: number | undefined): string {
    if (typeof value !== 'number' || isNaN(value)) return '₦0';
    return value.toLocaleString('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 });
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

  purposeType: string = '';
  showOtherPurpose: boolean = false;
  estimatedAnnualPatronageRefund: number = 0;
  guarantorCandidates: CooperativeMember[] = [];

  onPurposeTypeChange(value: string): void {
    this.purposeType = value;
    this.showOtherPurpose = value === 'other';
  }

  get guarantorsArray(): FormArray {
    return this.applicationForm.get('guarantors') as FormArray;
  }

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private cooperativeService: CooperativeService,
    private employeeService: EmployeeService,
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

    this.route.queryParamMap.subscribe(params => {
      this.prefillMemberParam = params.get('memberId') || this.prefillMemberId;
      this.tryApplyPrefillMember();
    });

    this.loadData();
    this.loadEmployeeDirectory();
    this.initForm();
  }

  loadData(): void {
    this.cooperativeService.getMembers().subscribe(members => {
      this.members = members.filter(m => m.status === 'ACTIVE');
      this.cooperativeService.loadGroups().subscribe(groups => {
        this.groups = groups.filter(group => group.status === 'ACTIVE');
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
      member.id === this.prefillMemberParam || member.memberId === this.prefillMemberParam
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
      purposeType: ['', Validators.required],
      duration: ['', [Validators.required, Validators.min(1)]],
      useSharesAsCollateral: [false],
      pledgedSharesAmount: [0],
      guarantors: this.fb.array([]),
      acceptTerms: [false, Validators.requiredTrue],
      acceptAcknowledgement: [false, Validators.requiredTrue]
    });

    this.applicationForm.get('purposeType')?.valueChanges.subscribe((value) => {
      this.purposeType = value;
      this.showOtherPurpose = value === 'other';
    });

    // Watch for changes
    this.applicationForm.get('groupId')?.valueChanges.subscribe(groupId => {
      this.onGroupSelect(groupId);
    });

    this.applicationForm.get('memberId')?.valueChanges.subscribe(memberId => {
      this.selectedMember = this.eligibleMembers.find(member => member.id === memberId);
      this.resolveSelectedMemberEligibility();
      this.refreshQualifiedGroups();
      this.validateShareEligibility();
      this.validatePledgedShares();
      this.validateGuarantors();
    });

    this.applicationForm.get('amount')?.valueChanges.subscribe(() => {
      this.calculateRepayment();
      this.validateShareEligibility();
      this.validatePledgedShares();
      this.validateGuarantors();
    });

    this.applicationForm.get('duration')?.valueChanges.subscribe(() => {
      this.calculateRepayment();
    });

    this.applicationForm.get('useSharesAsCollateral')?.valueChanges.subscribe(() => {
      this.validatePledgedShares();
    });

    this.applicationForm.get('pledgedSharesAmount')?.valueChanges.subscribe(() => {
      this.validatePledgedShares();
    });

    this.guarantorsArray.valueChanges.subscribe(() => {
      this.validateGuarantors();
    });
  }

  onGroupSelect(groupId: string): void {
    this.selectedGroup = this.qualifiedGroups.find(p => p.id === groupId);
    this.selectedGroupMembership = this.selectedMember && this.selectedGroup
      ? this.cooperativeService.getGroupMembership(this.selectedMember.id, this.selectedGroup.id)
      : undefined;

    if (this.selectedGroup) {
      // Set validators
      this.applicationForm.get('amount')?.setValidators([
        Validators.required,
        Validators.min(this.selectedGroup.minAmount),
        Validators.max(this.selectedGroup.maxAmount)
      ]);
      this.applicationForm.get('duration')?.setValidators([
        Validators.required,
        Validators.min(this.selectedGroup.minDuration),
        Validators.max(this.selectedGroup.maxDuration)
      ]);
      
      this.applicationForm.get('amount')?.updateValueAndValidity();
      this.applicationForm.get('duration')?.updateValueAndValidity();

      if (this.selectedGroup.requiresShares) {
        this.applicationForm.patchValue({ useSharesAsCollateral: true }, { emitEvent: false });
      }

      this.syncGuarantorControls();

      this.validateShareEligibility();
      this.validatePledgedShares();
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

    if (selectedMemberId && guarantorIds.includes(selectedMemberId)) {
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

  validateShareEligibility(): void {
    const amountControl = this.applicationForm.get('amount');
    if (!amountControl) {
      return;
    }

    const amount = Number(amountControl.value || 0);
    if (!this.selectedGroup?.requiresShares || !this.selectedMember || !amount) {
      if (amountControl.hasError('shareLimit')) {
        const errors = { ...(amountControl.errors || {}) };
        delete errors['shareLimit'];
        amountControl.setErrors(Object.keys(errors).length ? errors : null);
      }
      return;
    }

    if (amount > this.selectedMember.shareCapital) {
      amountControl.setErrors({ ...(amountControl.errors || {}), shareLimit: true });
      return;
    }

    if (amountControl.hasError('shareLimit')) {
      const errors = { ...(amountControl.errors || {}) };
      delete errors['shareLimit'];
      amountControl.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  calculateRepayment(): void {
    const amount = Number(this.applicationForm.get('amount')?.value || 0);
    const duration = Number(this.applicationForm.get('duration')?.value || 0);
    if (amount > 0 && duration > 0 && this.selectedGroup) {
      // Example calculation: simple interest
      const rate = Number(this.selectedGroup.interestRate || 0);
      this.totalInterest = Math.round((amount * rate * duration) / 1200); // (amount * rate * months) / 12 / 100
      this.totalRepayment = amount + this.totalInterest;
      this.repaymentAmount = Math.round(this.totalRepayment / duration);
    } else {
      this.totalInterest = 0;
      this.totalRepayment = 0;
      this.repaymentAmount = 0;
    }
    // Update confirmation details
    this.confirmationDetails = {
      amount,
      duration,
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

  validatePledgedShares(): void {
    const pledgedControl = this.applicationForm.get('pledgedSharesAmount');
    if (!pledgedControl) {
      return;
    }

    const useCollateral = Boolean(this.applicationForm.get('useSharesAsCollateral')?.value);
    const amount = Number(this.applicationForm.get('amount')?.value || 0);
    const pledgedSharesAmount = Number(pledgedControl.value || 0);
    const availableShares = Number(this.selectedMember?.shareCapital || 0);

    if (!this.selectedGroup?.requiresShares && !useCollateral) {
      pledgedControl.setErrors(null);
      return;
    }

    const errors = { ...(pledgedControl.errors || {}) };
    delete errors['required'];
    delete errors['min'];
    delete errors['maxShares'];
    delete errors['overAmount'];

    if (useCollateral || this.selectedGroup?.requiresShares) {
      if (pledgedSharesAmount <= 0) {
        errors['required'] = true;
      }
      if (pledgedSharesAmount > availableShares) {
        errors['maxShares'] = true;
      }
      if (amount > 0 && pledgedSharesAmount > amount) {
        errors['overAmount'] = true;
      }
    }

    pledgedControl.setErrors(Object.keys(errors).length ? errors : null);
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

    const amount = Number(this.applicationForm.get('amount')?.value || 0);
    const duration = Number(this.applicationForm.get('duration')?.value || 0);
    const useSharesAsCollateral = Boolean(this.applicationForm.get('useSharesAsCollateral')?.value);
    const pledgedSharesAmount = Number(this.applicationForm.get('pledgedSharesAmount')?.value || 0);
    this.validateGuarantors();

    if (amount < this.selectedGroup.minAmount || amount > this.selectedGroup.maxAmount) {
      this.submitError = `Amount must be between ${this.formatCurrency(this.selectedGroup.minAmount)} and ${this.formatCurrency(this.selectedGroup.maxAmount)}.`;
      return false;
    }

    if (duration < this.selectedGroup.minDuration || duration > this.selectedGroup.maxDuration) {
      this.submitError = `Duration must be between ${this.selectedGroup.minDuration} and ${this.selectedGroup.maxDuration} months.`;
      return false;
    }

    if (this.selectedGroup.requiresShares && amount > this.selectedMember.shareCapital) {
      this.submitError = 'Share-backed loan amount cannot exceed member available shares.';
      return false;
    }

    if ((this.selectedGroup.requiresShares || useSharesAsCollateral) && pledgedSharesAmount <= 0) {
      this.submitError = 'Please provide a valid amount to pledge as shares collateral.';
      return false;
    }

    if (pledgedSharesAmount > this.selectedMember.shareCapital) {
      this.submitError = 'Pledged shares amount cannot exceed available shares.';
      return false;
    }

    if (amount > 0 && pledgedSharesAmount > amount) {
      this.submitError = 'Pledged shares amount cannot be greater than loan amount.';
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
    this.validateShareEligibility();
    this.validatePledgedShares();
    this.calculateRepayment();
    this.submitSuccessMessage = '';

    if (!this.applicationForm.valid || !this.selectedGroup || !this.canSubmitByRank || !this.validateBeforeSubmit()) {
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
    const newLoan = {
      memberId: formValue.memberId,
      groupId: formValue.groupId,
      amount: Number(formValue.amount),
      purpose: String(formValue.purpose || '').trim(),
      duration: Number(formValue.duration),
      interestRate: this.selectedGroup?.interestRate,
      repaymentAmount: this.repaymentAmount,
      totalRepayment: this.totalRepayment,
      status: 'PENDING' as const,
      applicationStage,
      applicationDate: new Date().toISOString(),
      guarantors,
      useSharesAsCollateral: Boolean(formValue.useSharesAsCollateral || this.selectedGroup?.requiresShares),
      pledgedSharesAmount: Number(formValue.pledgedSharesAmount || 0)
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
  // Utility for confirmation label
  getPurposeLabel(purposeType: string): string {
    switch (purposeType) {
      case 'school_fees': return 'School Fees';
      case 'renovation': return 'Renovation';
      case 'medical': return 'Medical Emergency';
      case 'vehicle': return 'Vehicle Purchase/Repair';
      case 'business': return 'Business Capital';
      case 'other': return 'Other';
      default: return purposeType;
    }
  }

  get guarantorRequirementLabel(): string {
    if (!this.selectedGroup?.requiresGuarantors) {
      return 'Not required';
    }

    return `${this.requiredGuarantorCount} required`;
  }

  get maxBorrowableAmount(): number {
    if (!this.selectedMember || !this.selectedGroup) {
      return 0;
    }
    return this.cooperativeService.getMaxBorrowableAmountForGroup(this.selectedMember.id, this.selectedGroup.id);
  }

  getMemberTenureMonths(memberId: string): number {
    return this.cooperativeService.getMemberTenureMonths(memberId);
  }

  private refreshEligibleMembers(): void {
    if (this.members.length === 0) {
      this.eligibleMembers = [];
      return;
    }

    const profileByEmail = new Map(
      this.employeeDirectory.map(employee => [employee.email.toLowerCase(), employee])
    );
    const profileByName = new Map(
      this.employeeDirectory.map(employee => [employee.fullName.toLowerCase(), employee])
    );
    const profileById = new Map(
      this.employeeDirectory.map(employee => [employee.employeeId, employee])
    );

    this.eligibleMembers = this.members.filter(member => {
      const matchedEmployee =
        profileById.get(member.id) ||
        profileByEmail.get(member.email.toLowerCase()) ||
        profileByName.get(member.fullName.toLowerCase());

      if (!matchedEmployee) {
        return true;
      }

      return true;
    });

    const selectedMemberId = this.applicationForm?.get('memberId')?.value;
    if (selectedMemberId && !this.eligibleMembers.some(member => member.id === selectedMemberId)) {
      this.applicationForm.patchValue({ memberId: '' }, { emitEvent: false });
      this.selectedMember = undefined;
      this.selectedMemberEligibility = undefined;
    }

    if (!this.applicationForm) {
      return;
    }

    const currentMemberId = this.applicationForm.get('memberId')?.value;
    if (!currentMemberId && this.eligibleMembers.length > 0) {
      const fallbackMember = this.prefillMemberParam
        ? this.eligibleMembers.find(member => member.id === this.prefillMemberParam || member.memberId === this.prefillMemberParam)
        : undefined;
      const targetMember = fallbackMember || this.eligibleMembers[0];

      if (targetMember) {
        this.applicationForm.patchValue({ memberId: targetMember.id });
      }
    }
  }

  private resolveSelectedMemberEligibility(): void {
    if (!this.selectedMember) {
      this.selectedMemberEligibility = undefined;
      return;
    }

    const matchedEmployee = this.employeeDirectory.find(employee =>
      employee.employeeId === this.selectedMember?.id ||
      employee.email.toLowerCase() === this.selectedMember?.email.toLowerCase() ||
      employee.fullName.toLowerCase() === this.selectedMember?.fullName.toLowerCase()
    );

    if (!matchedEmployee) {
      const fallbackProfile: CooperativeEmployeeProfile = {
        employeeId: this.selectedMember.id,
        fullName: this.selectedMember.fullName,
        email: this.selectedMember.email,
        phone: this.selectedMember.phone,
        department: this.selectedMember.address || 'Operations',
        rank: 'MID',
        employmentType: 'PERMANENT',
        employmentStartDate: this.selectedMember.joinDate,
        onProbation: false,
        hasActiveDisciplinaryIssue: false
      };

      this.selectedMemberEligibility = this.cooperativeService.checkMembershipEligibility(fallbackProfile);
      return;
    }

    this.selectedMemberEligibility = this.cooperativeService.checkMembershipEligibility(matchedEmployee);
  }

  private resolveSelectedMemberSalary(): void {
    if (!this.selectedMember) {
      this.selectedMemberSalary = 0;
      return;
    }

    const matchedEmployee = this.employeeDirectory.find(employee =>
      employee.employeeId === this.selectedMember?.id ||
      employee.email.toLowerCase() === this.selectedMember?.email.toLowerCase() ||
      employee.fullName.toLowerCase() === this.selectedMember?.fullName.toLowerCase()
    );

    this.selectedMemberSalary = Number(matchedEmployee?.monthlySalary || 0);
  }

  private mapEmployeeToProfile(employee: any): CooperativeEmployeeProfile | null {
    if (!employee) {
      return null;
    }
    const firstName = String(employee?.firstName || '').trim();
    const lastName = String(employee?.lastName || '').trim();
    const fallbackName = String(employee?.fullName || employee?.name || '').trim();
    const fullName = `${firstName} ${lastName}`.trim() || fallbackName;
    const email = String(employee?.email || employee?.workEmail || '').trim();

    if (!fullName || !email) {
      return null;
    }

    const employeeId = String(employee?.id ?? employee?.employeeId ?? employee?.staffId ?? '').trim();
    if (!employeeId) {
      return null;
    }

    const levelName = String(employee?.level?.name || employee?.level || employee?.jobTitle || '').trim().toLowerCase();
    const employmentTypeName = String(
      employee?.employmentType?.name || employee?.employmentType || employee?.jobType?.name || employee?.jobType || ''
    ).trim().toLowerCase();

    return {
      employeeId,
      fullName,
      email,
      monthlySalary: Number(employee?.salary || employee?.monthlySalary || employee?.basicSalary || 0),
      phone: String(employee?.phone || '').trim(),
      department: String(employee?.department?.name || employee?.department || '').trim(),
      rank: levelName.includes('executive') || levelName.includes('exec') || levelName.includes('director')
        ? 'EXEC'
        : levelName.includes('senior') || levelName.includes('manager') || levelName.includes('lead') || levelName.includes('head')
        ? 'SENIOR'
        : levelName.includes('mid') || levelName.includes('associate') || levelName.includes('level 2') || levelName.includes('level 3')
        ? 'MID'
        : 'JUNIOR',
      employmentType: employmentTypeName.includes('intern')
        ? 'INTERN'
        : employmentTypeName.includes('contract')
        ? 'CONTRACT'
        : 'PERMANENT',
      employmentStartDate:
        employee?.employementStartDate ||
        employee?.employmentStartDate ||
        employee?.hireDate ||
        employee?.createdAt ||
        new Date().toISOString(),
      onProbation: Boolean(employee?.onProbation),
      probationEndDate: employee?.probationEndDate,
      hasActiveDisciplinaryIssue: Boolean(employee?.hasActiveDisciplinaryIssue || employee?.disciplinaryCaseOpen),
      managerId: String(employee?.supervisor?.id || employee?.supervisor || employee?.managerId || '').trim() || undefined
    };
  }

  goBack(): void {
    if (this.isModal) {
      this.formCancelled.emit();
    } else {
      this.router.navigate(['../'], { relativeTo: this.route });
    }
  }
}