import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  AbstractControl,
  ValidatorFn,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { VendorRegistrationService } from '../../../service/vendor-portal/vendor-registration.service';
import {
  NIGERIAN_STATES,
  ALL_COUNTRIES,
  SUPPLIER_CATEGORIES,
  INDUSTRY_OPTIONS,
  BANKS_NIGERIA,
  VendorType,
  BusinessSize,
} from '../../../domain/vendor-portal/vendor-registration.dto';

export interface RegistrationStep {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
}

@Component({
  selector: 'app-vendor-registration',
  templateUrl: './vendor-registration.component.html',
   styleUrl: './vendor-registration.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorRegistrationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ─── Step Config ──────────────────────────────────────────────────────────
  readonly steps: RegistrationStep[] = [
    { id: 1, title: 'Business Information',   subtitle: 'Company profile & registration',  icon: 'building' },
    { id: 2, title: 'Contact & Location',     subtitle: 'Addresses & key contacts',        icon: 'map-pin' },
    { id: 3, title: 'Financial & Banking',    subtitle: 'Bank details & payment info',     icon: 'credit-card' },
    { id: 4, title: 'Compliance & Certs',     subtitle: 'Legal standing & certifications', icon: 'shield-check' },
    { id: 5, title: 'References & Projects',  subtitle: 'Track record & experience',       icon: 'briefcase' },
    { id: 6, title: 'Documents',              subtitle: 'Upload required files',           icon: 'file-text' },
  ];

  currentStep = 1;
  isSubmitting = false;
  submitSuccess = false;
  submitError = '';
  registeredVendorId = '';

  // ─── Lookup Data ──────────────────────────────────────────────────────────
  readonly nigerianStates = NIGERIAN_STATES;
  readonly allCountries = ALL_COUNTRIES;
  readonly supplierCategories = SUPPLIER_CATEGORIES;
  readonly industryOptions = INDUSTRY_OPTIONS;
  readonly banksNigeria = BANKS_NIGERIA;

  readonly vendorTypes: { value: VendorType; label: string }[] = [
    { value: 'SOLE_PROPRIETOR', label: 'Sole Proprietorship' },
    { value: 'PARTNERSHIP',     label: 'Partnership' },
    { value: 'LLC',             label: 'Limited Liability Company (LLC)' },
    { value: 'PLC',             label: 'Public Limited Company (PLC)' },
    { value: 'NGO',             label: 'Non-Governmental Organisation (NGO)' },
    { value: 'COOPERATIVE',     label: 'Cooperative Society' },
    { value: 'OTHER',           label: 'Other' },
  ];

  readonly businessSizes: { value: BusinessSize; label: string; description: string }[] = [
    { value: 'MICRO',      label: 'Micro',      description: '1–9 employees' },
    { value: 'SMALL',      label: 'Small',      description: '10–49 employees' },
    { value: 'MEDIUM',     label: 'Medium',     description: '50–249 employees' },
    { value: 'LARGE',      label: 'Large',      description: '250–999 employees' },
    { value: 'ENTERPRISE', label: 'Enterprise', description: '1000+ employees' },
  ];

  readonly annualTurnovers = [
    { value: 'BELOW_1M',      label: 'Below ₦1 Million' },
    { value: '1M_TO_10M',     label: '₦1M – ₦10 Million' },
    { value: '10M_TO_50M',    label: '₦10M – ₦50 Million' },
    { value: '50M_TO_100M',   label: '₦50M – ₦100 Million' },
    { value: 'ABOVE_100M',    label: 'Above ₦100 Million' },
  ];

  readonly yearsOptions = [
    { value: 'LESS_THAN_1', label: 'Less than 1 year' },
    { value: '1_TO_3',      label: '1 – 3 years' },
    { value: '3_TO_5',      label: '3 – 5 years' },
    { value: '5_TO_10',     label: '5 – 10 years' },
    { value: '10_TO_20',    label: '10 – 20 years' },
    { value: 'MORE_THAN_20',label: 'More than 20 years' },
  ];

  readonly ownershipTypes = [
    { value: 'PRIVATE',    label: 'Private' },
    { value: 'PUBLIC',     label: 'Public' },
    { value: 'GOVERNMENT', label: 'Government' },
    { value: 'MIXED',      label: 'Mixed (Private & Government)' },
    { value: 'FOREIGN',    label: 'Foreign' },
  ];

  readonly certificationTypes = [
    { value: 'ISO_9001',  label: 'ISO 9001 – Quality Management' },
    { value: 'ISO_14001', label: 'ISO 14001 – Environmental Management' },
    { value: 'ISO_45001', label: 'ISO 45001 – Occupational Health & Safety' },
    { value: 'NAFDAC',    label: 'NAFDAC Registration' },
    { value: 'SON',       label: 'Standards Organisation of Nigeria (SON)' },
    { value: 'COREN',     label: 'COREN – Engineering Regulation' },
    { value: 'NIA',       label: 'Nigerian Institute of Architects' },
    { value: 'NBA',       label: 'Nigerian Bar Association' },
    { value: 'ICAN',      label: 'ICAN – Chartered Accountants' },
    { value: 'OTHER',     label: 'Other' },
  ];

  readonly paymentMethods = [
    { value: 'BANK_TRANSFER',  label: 'Bank Transfer' },
    { value: 'CHEQUE',         label: 'Cheque' },
    { value: 'MOBILE_MONEY',   label: 'Mobile Money' },
    { value: 'ONLINE_PAYMENT', label: 'Online Payment' },
  ];

  readonly paymentTerms = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Net 90', 'Immediate', 'Custom'];
  readonly currencies = ['NGN (₦)', 'USD ($)', 'GBP (£)', 'EUR (€)', 'GHS (₵)', 'ZAR (R)'];

  // ─── Forms ────────────────────────────────────────────────────────────────
  step1Form!: FormGroup;
  step2Form!: FormGroup;
  step3Form!: FormGroup;
  step4Form!: FormGroup;
  step5Form!: FormGroup;
  step6Form!: FormGroup;

  // ─── Document Upload State ────────────────────────────────────────────────
  uploadedFiles: Record<string, { name: string; size: string; type: string } | null> = {};
  uploadErrors: Record<string, string> = {};

  // ─── UI Flags ─────────────────────────────────────────────────────────────
  selectedCategories: string[] = [];
  selectedIndustries: string[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private registrationService: VendorRegistrationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.buildForms();
    this.subscribeToConditionalControls();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Form Builders ────────────────────────────────────────────────────────

  private buildForms(): void {
    this.buildStep1Form();
    this.buildStep2Form();
    this.buildStep3Form();
    this.buildStep4Form();
    this.buildStep5Form();
    this.buildStep6Form();
  }

  private buildStep1Form(): void {
    this.step1Form = this.fb.group({
      businessName:            ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      tradingName:             [''],
      vendorType:              ['', Validators.required],
      businessSize:            ['', Validators.required],
      ownershipType:           ['', Validators.required],
      yearsInOperation:        ['', Validators.required],
      annualTurnover:          ['', Validators.required],
      numberOfEmployees:       [null, [Validators.required, Validators.min(1), Validators.max(999999)]],
      registrationNumber:      ['', [Validators.required, Validators.minLength(5)]],
      taxIdentificationNumber: ['', [Validators.required, Validators.minLength(8)]],
      vatRegistrationNumber:   [''],
      cacNumber:               [''],
      dateOfIncorporation:     ['', Validators.required],
      primaryIndustry:         ['', Validators.required],
      secondaryIndustries:     [[]],
      supplierCategories:      [[], Validators.required],
      productServiceDescription: ['', [Validators.required, Validators.minLength(50), Validators.maxLength(1000)]],
      companyWebsite:          ['', this.optionalUrlValidator()],
      linkedinProfile:         ['', this.optionalUrlValidator()],
    });
  }

  private buildStep2Form(): void {
    const addressGroup = () =>
      this.fb.group({
        streetLine1: ['', Validators.required],
        streetLine2: [''],
        city:        ['', Validators.required],
        state:       ['', Validators.required],
        lga:         [''],
        country:     ['Nigeria', Validators.required],
        postalCode:  [''],
        landmark:    [''],
      });

    const contactGroup = (required = true) =>
      this.fb.group({
        firstName:              ['', required ? Validators.required : null],
        lastName:               ['', required ? Validators.required : null],
        jobTitle:               ['', required ? Validators.required : null],
        department:             [''],
        email:                  ['', required ? [Validators.required, Validators.email] : Validators.email],
        phoneNumber:            ['', required ? [Validators.required, Validators.pattern(/^\+?[0-9\s\-()]{7,20}$/)] : null],
        phoneNumberAlt:         [''],
        isAuthorizedSignatory:  [false],
      });

    this.step2Form = this.fb.group({
      registeredAddress:                  addressGroup(),
      operatingAddressSameAsRegistered:   [true],
      operatingAddress:                   addressGroup(),
      primaryContact:                     contactGroup(true),
      hasSecondaryContact:                [false],
      secondaryContact:                   contactGroup(false),
      businessEmail:                      ['', [Validators.required, Validators.email]],
      businessPhone:                      ['', [Validators.required, Validators.pattern(/^\+?[0-9\s\-()]{7,20}$/)]],
      businessPhoneAlt:                   [''],
      faxNumber:                          [''],
      twitterHandle:                      [''],
      facebookPage:                       [''],
    });
  }

  private buildStep3Form(): void {
    const bankAccountGroup = (required = true) =>
      this.fb.group({
        bankName:      ['', required ? Validators.required : null],
        bankBranch:    [''],
        accountName:   ['', required ? Validators.required : null],
        accountNumber: ['', required ? [Validators.required, Validators.pattern(/^\d{10}$/)] : null],
        accountType:   ['CURRENT', required ? Validators.required : null],
        sortCode:      [''],
        swiftCode:     [''],
        iban:          [''],
        currency:      ['NGN (₦)', required ? Validators.required : null],
      });

    this.step3Form = this.fb.group({
      primaryBankAccount:           bankAccountGroup(true),
      hasSecondaryBankAccount:      [false],
      secondaryBankAccount:         bankAccountGroup(false),
      preferredPaymentMethod:       ['BANK_TRANSFER', Validators.required],
      paymentTermsPreference:       ['Net 30', Validators.required],
      currencyPreference:           ['NGN (₦)', Validators.required],
      hasBankReference:             [false],
      bankReferenceName:            [''],
      bankReferenceContact:         [''],
      hasLiabilityInsurance:        [false],
      liabilityInsuranceProvider:   [''],
      liabilityInsurancePolicyNumber: [''],
      liabilityInsuranceExpiryDate: [''],
      liabilityInsuranceCoverageAmount: [null],
    });
  }

  private buildStep4Form(): void {
    this.step4Form = this.fb.group({
      certifications:              this.fb.array([]),
      hasBeenDebarred:             [false],
      debarmentDetails:            [''],
      hasPendingLitigation:        [false],
      litigationDetails:           [''],
      hasBeenBankrupt:             [false],
      bankruptcyDetails:           [''],
      hasHsePolicy:                [false],
      hsePolicyDocumentRef:        [''],
      hasEnvironmentalPolicy:      [false],
      hasQualityManagementSystem:  [false],
      qualityManagementSystemDetails: [''],
      acceptsDataProtectionPolicy: [false, Validators.requiredTrue],
      acceptsAntiCorruptionPolicy: [false, Validators.requiredTrue],
      acceptsCodeOfConduct:        [false, Validators.requiredTrue],
    });
  }

  private buildStep5Form(): void {
    this.step5Form = this.fb.group({
      clientReferences:    this.fb.array([this.createClientReferenceGroup()]),
      keyProjects:         this.fb.array([this.createKeyProjectGroup()]),
      tradeAssociations:   this.fb.array([]),
      awards:              [''],
      additionalInformation: [''],
    });
  }

  private buildStep6Form(): void {
    this.step6Form = this.fb.group({
      termsAndConditionsAccepted: [false, Validators.requiredTrue],
      privacyPolicyAccepted:      [false, Validators.requiredTrue],
    });
  }

  // ─── FormArray Helpers ────────────────────────────────────────────────────

  get certifications(): FormArray {
    return this.step4Form.get('certifications') as FormArray;
  }

  get clientReferences(): FormArray {
    return this.step5Form.get('clientReferences') as FormArray;
  }

  get keyProjects(): FormArray {
    return this.step5Form.get('keyProjects') as FormArray;
  }

  get tradeAssociations(): FormArray {
    return this.step5Form.get('tradeAssociations') as FormArray;
  }

  addCertification(): void {
    this.certifications.push(
      this.fb.group({
        certificationType: ['', Validators.required],
        certificationName: ['', Validators.required],
        issuingBody:       ['', Validators.required],
        certificateNumber: [''],
        issueDate:         ['', Validators.required],
        expiryDate:        [''],
        isNeverExpiring:   [false],
      })
    );
  }

  removeCertification(i: number): void {
    this.certifications.removeAt(i);
  }

  private createClientReferenceGroup(): FormGroup {
    return this.fb.group({
      companyName:             ['', Validators.required],
      contactPersonName:       ['', Validators.required],
      contactEmail:            ['', [Validators.required, Validators.email]],
      contactPhone:            ['', Validators.required],
      relationshipDescription: ['', Validators.required],
      yearsOfRelationship:     [1, [Validators.required, Validators.min(0)]],
    });
  }

  addClientReference(): void {
    this.clientReferences.push(this.createClientReferenceGroup());
  }

  removeClientReference(i: number): void {
    if (this.clientReferences.length > 1) {
      this.clientReferences.removeAt(i);
    }
  }

  private createKeyProjectGroup(): FormGroup {
    return this.fb.group({
      projectTitle:    ['', Validators.required],
      clientName:      ['', Validators.required],
      projectValue:    [null],
      projectCurrency: ['NGN'],
      startDate:       ['', Validators.required],
      endDate:         [''],
      isOngoing:       [false],
      description:     ['', [Validators.required, Validators.minLength(30)]],
    });
  }

  addKeyProject(): void {
    this.keyProjects.push(this.createKeyProjectGroup());
  }

  removeKeyProject(i: number): void {
    if (this.keyProjects.length > 1) {
      this.keyProjects.removeAt(i);
    }
  }

  addTradeAssociation(): void {
    this.tradeAssociations.push(
      this.fb.group({
        associationName:  ['', Validators.required],
        membershipNumber: [''],
        memberSince:      [''],
      })
    );
  }

  removeTradeAssociation(i: number): void {
    this.tradeAssociations.removeAt(i);
  }

  // ─── Conditional Control Subscriptions ────────────────────────────────────

  private subscribeToConditionalControls(): void {
    // Step 2: Operating address toggle
    this.step2Form
      .get('operatingAddressSameAsRegistered')!
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((same) => {
        const opAddr = this.step2Form.get('operatingAddress')!;
        same ? opAddr.disable() : opAddr.enable();
      });

    // Step 3: Secondary bank account toggle
    this.step3Form
      .get('hasSecondaryBankAccount')!
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((has) => {
        const secBank = this.step3Form.get('secondaryBankAccount')!;
        has ? secBank.enable() : secBank.disable();
      });

    // Initially disable operating address (same as registered by default)
    this.step2Form.get('operatingAddress')!.disable();
    this.step3Form.get('secondaryBankAccount')!.disable();
  }

  // ─── Category & Industry Multi-Select ─────────────────────────────────────

  toggleCategory(cat: string): void {
    const idx = this.selectedCategories.indexOf(cat);
    if (idx === -1) {
      this.selectedCategories.push(cat);
    } else {
      this.selectedCategories.splice(idx, 1);
    }
    this.step1Form.patchValue({ supplierCategories: this.selectedCategories });
  }

  isCategorySelected(cat: string): boolean {
    return this.selectedCategories.includes(cat);
  }

  toggleIndustry(ind: string): void {
    const idx = this.selectedIndustries.indexOf(ind);
    if (idx === -1) {
      if (this.selectedIndustries.length < 3) {
        this.selectedIndustries.push(ind);
      }
    } else {
      this.selectedIndustries.splice(idx, 1);
    }
    this.step1Form.patchValue({ secondaryIndustries: this.selectedIndustries });
  }

  isIndustrySelected(ind: string): boolean {
    return this.selectedIndustries.includes(ind);
  }

  // ─── Document Upload ──────────────────────────────────────────────────────

  onFileSelect(event: Event, documentKey: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const validation = this.registrationService.validateFile(file);
    if (!validation.valid) {
      this.uploadErrors[documentKey] = validation.error!;
      this.uploadedFiles[documentKey] = null;
      this.cdr.markForCheck();
      return;
    }

    delete this.uploadErrors[documentKey];
    this.uploadedFiles[documentKey] = {
      name: file.name,
      size: this.registrationService.formatFileSize(file.size),
      type: file.type,
    };
    this.cdr.markForCheck();
  }

  removeFile(documentKey: string): void {
    this.uploadedFiles[documentKey] = null;
    delete this.uploadErrors[documentKey];
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  getCurrentForm(): FormGroup {
    const forms: Record<number, FormGroup> = {
      1: this.step1Form,
      2: this.step2Form,
      3: this.step3Form,
      4: this.step4Form,
      5: this.step5Form,
      6: this.step6Form,
    };
    return forms[this.currentStep];
  }

  canProceed(): boolean {
    return this.getCurrentForm().valid;
  }

  nextStep(): void {
    const form = this.getCurrentForm();
    form.markAllAsTouched();
    if (form.valid && this.currentStep < this.steps.length) {
      this.currentStep++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.cdr.markForCheck();
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.cdr.markForCheck();
    }
  }

  goToStep(step: number): void {
    // Allow free navigation to completed steps or adjacent steps
    if (step <= this.currentStep) {
      this.currentStep = step;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.cdr.markForCheck();
    }
  }

  isStepCompleted(stepId: number): boolean {
    if (stepId < this.currentStep) return true;
    const form: Record<number, FormGroup> = {
      1: this.step1Form, 2: this.step2Form, 3: this.step3Form,
      4: this.step4Form, 5: this.step5Form, 6: this.step6Form,
    };
    return form[stepId]?.valid ?? false;
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  onSubmit(): void {
    this.step6Form.markAllAsTouched();
    if (!this.step6Form.valid) return;

    this.isSubmitting = true;
    this.submitError = '';
    this.cdr.markForCheck();

    const registration = this.buildRegistrationPayload();
    this.registrationService
      .submitRegistration(registration)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.isSubmitting = false;
          if (res.success) {
            this.submitSuccess = true;
            this.registeredVendorId = res.vendorId ?? '';
          } else {
            this.submitError = res.message;
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.submitError = err.message ?? 'Registration failed. Please try again.';
          this.cdr.markForCheck();
        },
      });
  }

  private buildRegistrationPayload(): any {
    return {
      businessInformation: this.step1Form.getRawValue(),
      contactLocation: this.step2Form.getRawValue(),
      financialBanking: this.step3Form.getRawValue(),
      compliance: this.step4Form.getRawValue(),
      referencesExperience: this.step5Form.getRawValue(),
      documents: {},
      termsAndConditionsAccepted: this.step6Form.value.termsAndConditionsAccepted,
      privacyPolicyAccepted: this.step6Form.value.privacyPolicyAccepted,
      registrationDate: new Date().toISOString(),
    };
  }

  navigateToLogin(): void {
    this.router.navigate(['/vendor/login']);
  }

  // ─── Validators ───────────────────────────────────────────────────────────

  private optionalUrlValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      if (!control.value) return null;
      try {
        new URL(control.value);
        return null;
      } catch {
        return { invalidUrl: true };
      }
    };
  }

  // ─── Template Helpers ─────────────────────────────────────────────────────

  isInvalid(form: FormGroup, field: string): boolean {
    const ctrl = form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  getError(form: FormGroup, field: string): string {
    const ctrl = form.get(field);
    if (!ctrl?.errors) return '';
    if (ctrl.errors['required'])   return 'This field is required.';
    if (ctrl.errors['email'])      return 'Please enter a valid email address.';
    if (ctrl.errors['minlength'])  return `Minimum ${ctrl.errors['minlength'].requiredLength} characters required.`;
    if (ctrl.errors['maxlength'])  return `Maximum ${ctrl.errors['maxlength'].requiredLength} characters allowed.`;
    if (ctrl.errors['min'])        return `Value must be at least ${ctrl.errors['min'].min}.`;
    if (ctrl.errors['pattern'])    return 'Please enter a valid format.';
    if (ctrl.errors['invalidUrl']) return 'Please enter a valid URL (e.g. https://example.com).';
    if (ctrl.errors['requiredTrue']) return 'You must accept this to continue.';
    return 'Invalid value.';
  }

  getNestedError(form: FormGroup, path: string): string {
    const ctrl = form.get(path);
    if (!ctrl?.errors || !ctrl.touched) return '';
    return this.getError(form, path);
  }

  trackByIndex(index: number): number {
    return index;
  }

  get progressPercent(): number {
    return Math.round(((this.currentStep - 1) / (this.steps.length - 1)) * 100);
  }
}