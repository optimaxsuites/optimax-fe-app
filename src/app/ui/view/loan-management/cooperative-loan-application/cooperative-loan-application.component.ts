import { formatDate } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GuarantorDto, GuarantorService } from '../../../service/loan/guarantor.service';
import { Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { forkJoin, of } from 'rxjs';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { EmployeeService } from '../../../service/employee.service';
import { EmployeeLoanService } from '../../../service/loan/emoloyee-loan.service';
import { catchError } from 'rxjs/operators';
import { CooperativeMember, CooperativeLoanGroup, CooperativeGroupMembership, CooperativeEmployeeProfile, CooperativeMembershipEligibility } from '../../../service/loan/cooperative-loan/cooperative.types';
import { Message } from 'primeng/api';
import { CooperativeLoanPurposeApiResponse } from '../../../service/loan/cooperative-loan/cooperative-loan-api.service';
import { LoanSupportingDocument, RepaymentScheduleItem } from '../../../service/loan/loan.types';

@Component({
  selector: 'app-cooperative-loan-application',
  templateUrl: './cooperative-loan-application.component.html',
  styleUrls: ['./cooperative-loan-application.component.scss']
})
export class CooperativeLoanApplicationComponent implements OnInit {
    isLoadingGroupDetails = false;
  messages: Message[] = [];
  supportingDocuments: LoanSupportingDocument[] = [];

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
  guarantorCandidates: CooperativeMember[] = [];

  // Stepper
  stepIndex: number = 0;
  
  // Application tracking
  applicationStatus: string = '';
  applicationNotifications: { title: string; message: string; date: string }[] = [];
  currentUuid = uuidV4();
  
  // Inputs/Outputs
  @Input() isModal = false;
  @Input() isSelfService = false;
  @Input() prefillMemberId: string | null = null;
  @Output() formCancelled = new EventEmitter<void>();
  @Output() applicationSubmitted = new EventEmitter<void>();

  guarantorContacts: { [memberId: string]: GuarantorDto[] } = {};

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

    this.stepIndex = 0;

    this.route.queryParamMap.subscribe(params => {
      this.prefillMemberParam = params.get('memberId') || this.prefillMemberId;
      this.tryApplyPrefillMember();
    });

    this.initForm();
    this.setupPurposeChangeListener();
    this.loadEmployeeDirectoryWithMemberCheck();
  }

  // ==================== SETUP METHODS ====================
  
  setupPurposeChangeListener(): void {
    this.applicationForm.get('purpose')?.valueChanges.subscribe(() => {
      // Reset supporting documents when purpose changes
      this.supportingDocuments = [];
      
      // Clear any purpose-related validation errors
      const purposeControl = this.applicationForm.get('purpose');
      if (purposeControl?.errors) {
        const errors = { ...purposeControl.errors };
        delete errors['purposeRequired'];
        purposeControl.setErrors(Object.keys(errors).length ? errors : null);
      }
      
      // Re-validate the form
      this.applicationForm.updateValueAndValidity();
    });
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

    this.applicationForm.get('repaymentTime')?.valueChanges.subscribe(() => {
      this.calculateRepayment();
    });

    this.guarantorsArray.valueChanges.subscribe(() => {
      this.validateGuarantors();
    });
  }

  // ==================== GETTERS ====================

  public toTitleCase(value: string | undefined | null): string {
  if (!value) return '';
  const normalized = String(value).replace(/_/g, ' ').toLowerCase();
  return normalized.replace(/\b\w/g, c => c.toUpperCase());
}

  get guarantorsArray(): FormArray {
    return this.applicationForm.get('guarantors') as FormArray;
  }

  get selectedPurposeDefinition(): CooperativeLoanPurposeApiResponse | undefined {
    const currentPurpose = String(this.applicationForm?.get('purpose')?.value || '').trim();
    if (!currentPurpose) {
      return undefined;
    }
    
    // Find by name or id
    return this.availablePurposes.find((purpose) => {
      const purposeName = String(purpose.name || '').trim();
      const purposeId = String(purpose.id || '');
      return purposeName === currentPurpose || purposeId === currentPurpose;
    });
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

  get controlNames(): string[] {
    return Object.keys(this.applicationForm?.controls || {});
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

  private loadEmployeeDirectoryWithMemberCheck(): void {
    this.employeeService.getAllEmployee().subscribe({
      next: (data) => {
        const employees = Array.isArray(data) ? data : [];
        this.employeeDirectory = employees
          .map((employee: any) => this.mapEmployeeToProfile(employee))
          .filter((employee: CooperativeEmployeeProfile | null): employee is CooperativeEmployeeProfile => !!employee);

        this.loadData();
      },
      error: () => {
        this.employeeDirectory = [];
        this.loadData();
      }
    });
  }

  loadData(): void {
    forkJoin({
      purposes: this.cooperativeService.loadLoanPurposes(),
      members: this.cooperativeService.getMembers(),
      groups: this.cooperativeService.loadGroups()
    }).subscribe(({ purposes, members, groups }: { purposes: CooperativeLoanPurposeApiResponse[]; members: CooperativeMember[]; groups: CooperativeLoanGroup[] }) => {
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
      employeeMatch?.workEmail,
      employeeMatch?.email,
      this.getSessionRegistrationEmail(),
      member.email,
      sessionStorage.getItem('email') || ''
    );
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
        const emp = this.employeeDirectory.find(e =>
          String(e.employeeId) === String(member.employeeId) ||
          String(e.employeeId) === String(member.id) ||
          String(e.employeeId) === String(member.memberId) ||
          (e.fullName && member.fullName && e.fullName.toLowerCase() === member.fullName.toLowerCase())
        );
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
    const empProfile = this.employeeDirectory.find(e => String(e.employeeId) === String(this.selectedMember?.employeeId));
    if (empProfile) {
      this.selectedMemberEligibility = this.cooperativeService.checkMembershipEligibility(empProfile);
    } else {
      this.selectedMemberEligibility = undefined;
    }
  }

  resolveSelectedMemberSalary(): void {
    // Use fallback salary if salary is 0 or falsy
    if (!this.selectedMember) {
      this.selectedMemberSalary = 20000000;
      return;
    }
    // Try to get salary from member or employee profile
    let salary = 0;
    if (typeof this.selectedMember.monthlySalary === 'number') {
      salary = this.selectedMember.monthlySalary;
    } else if (this.selectedMember.employeeId) {
      const empProfile = this.employeeDirectory.find(e => String(e.employeeId) === String(this.selectedMember?.employeeId));
      if (empProfile && typeof empProfile.monthlySalary === 'number') {
        salary = empProfile.monthlySalary;
      }
    }
    this.selectedMemberSalary = salary && salary > 0 ? salary : 20000000;
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
    }
  }

  // ==================== GROUP SELECTION ====================

  onGroupSelect(groupId: string): void {
    this.isLoadingGroupDetails = true;
    const groupIdNum = Number(groupId);
    this.cooperativeService.loadGroupById(groupIdNum).subscribe({
      next: (group) => {
        console.log('[onGroupSelect] Loaded group:', group);
        this.selectedGroup = group;
        // Debug log: print the full selectedGroup object for field inspection
        console.log('[onGroupSelect] selectedGroup (after mapping):', this.selectedGroup);
        this.selectedGroupMembership = this.selectedMember && this.selectedGroup
          ? this.cooperativeService.getGroupMembership(this.selectedMember.id, this.selectedGroup.id)
          : undefined;

        if (this.selectedGroup) {
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
        } else {
          console.warn('[onGroupSelect] No group found for ID:', groupIdNum);
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
    const previousSelectedGroupId = this.applicationForm?.get('groupId')?.value;
    const previousPurpose = this.applicationForm?.get('purpose')?.value;
    
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

    // Restore previously selected group if still valid
    const selectedGroupId = this.applicationForm?.get('groupId')?.value;
    if (selectedGroupId && !this.qualifiedGroups.some(group => String(group.id) === String(selectedGroupId))) {
      this.applicationForm.patchValue({ groupId: '' }, { emitEvent: false });
      this.selectedGroup = undefined;
      this.selectedGroupMembership = undefined;
    } else if (selectedGroupId && this.qualifiedGroups.some(group => String(group.id) === String(selectedGroupId))) {
      this.selectedGroup = this.qualifiedGroups.find(group => String(group.id) === String(selectedGroupId));
      this.selectedGroupMembership = this.selectedMember && this.selectedGroup
        ? this.cooperativeService.getGroupMembership(this.selectedMember.id, this.selectedGroup.id)
        : undefined;
    }
    
    // Restore purpose if it still exists in availablePurposes
    if (previousPurpose && this.availablePurposes.some(p => String(p.name) === String(previousPurpose))) {
      this.applicationForm.patchValue({ purpose: previousPurpose }, { emitEvent: false });
    }

    this.syncGuarantorControls();
  }

  // ==================== GUARANTOR METHODS ====================

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

  addGuarantor(): void {
    if (!this.selectedGroup?.requiresGuarantors) {
      return;
    }

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

    const memberId = this.guarantorsArray.at(index)?.get('memberId')?.value;
    if (memberId && this.guarantorContacts[memberId]) {
      delete this.guarantorContacts[memberId];
    }
    this.guarantorsArray.removeAt(index);
    this.validateGuarantors();
  }

  getGuarantorContacts(memberId: string): any[] {
    return this.guarantorContacts[memberId] || [];
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

  onDocumentsSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) {
      return;
    }

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
    if (!Number.isFinite(size) || size <= 0) {
      return 'Unknown size';
    }
    if (size < 1024) {
      return `${size} B`;
    }
    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ==================== UI HELPERS ====================

  formatCurrency(value: number | undefined): string {
    if (typeof value !== 'number' || isNaN(value)) return '₦0';
    return value.toLocaleString('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 });
  }

  buildMailLink(email?: string): string | null {
    const text = String(email || '').trim();
    return text ? `mailto:${text}` : null;
  }

  getSelectedGroupAccountingEmail(): string {
    return String(this.selectedGroup?.accountingEmail || '').trim();
  }

  getSelectedGroupLateFeeSummary(): string {
    if (!this.selectedGroup) {
      return '';
    }

    const percentage = Number(this.selectedGroup.lateFeePercentage || 0);
    const graceDays = Number(this.selectedGroup.lateFeeGraceDays || 0);
    return `${percentage}% after ${graceDays} day${graceDays === 1 ? '' : 's'}`;
  }

  getSelectedGroupSettlementSummary(): string {
    if (!this.selectedGroup) {
      return '';
    }

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

  // ==================== STEPPER NAVIGATION ====================

  nextStep(): void {
    if (this.stepIndex < 4) {
      this.stepIndex++;
    }
  }

  prevStep(): void {
    if (this.stepIndex > 0) {
      this.stepIndex--;
    }
  }

  // ==================== NOTIFICATIONS ====================

  addNotification(title: string, message: string) {
    this.applicationNotifications.unshift({
      title,
      message,
      date: new Date().toLocaleString()
    });
  }

  // ==================== SUBMISSION ====================

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

    if (this.requiresSupportingDocuments && this.supportingDocuments.length === 0) {
      this.submitError = 'Upload the required supporting document(s) before submitting this cooperative loan request.';
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

    const memberId = this.applicationForm.get('memberId')?.value;
    const requestedAmount = Number(this.applicationForm.get('amount')?.value || 0);
    const salary = Number(this.selectedMemberSalary || 0);
    
    if (memberId && salary > 0) {
      this.cooperativeService.getLoans().subscribe(loans => {
        const activeLoans = (loans || []).filter(l => (l.memberId === memberId || l.cooperativeMemberId === memberId) && l.status === 'ACTIVE');
        const totalActiveLoanAmount = activeLoans.reduce((sum, l) => sum + Number(l.amount || 0), 0);
        const oneThirdSalary = salary / 3;
        if ((totalActiveLoanAmount + requestedAmount) > oneThirdSalary) {
          this.submitError = `You cannot request this loan because your total active loans would exceed one-third of your monthly salary (₦${oneThirdSalary.toLocaleString()}).`;
          this.showConfirmation = false;
          return;
        }
        
        if (!this.applicationForm.valid || !this.selectedGroup || !this.canSubmitByLevel || !this.validateBeforeSubmit()) {
          return;
        }
        this.showConfirmation = true;
      });
      return;
    }

    if (!this.applicationForm.valid || !this.selectedGroup || !this.canSubmitByLevel || !this.validateBeforeSubmit()) {
      return;
    }

    this.showConfirmation = true;
  }

  confirmSubmit(): void {
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
      next: () => {
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

  // ==================== NAVIGATION ====================

  goBack(): void {
    if (this.isModal) {
      this.formCancelled.emit();
    } else {
      this.router.navigate(['/']);
    }
  }
}