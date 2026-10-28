import { Component, Input, OnDestroy } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { EmployeeService } from '../../../service/employee.service';
import { formatDate } from '@angular/common';
import { MetadataService } from '../../../service/metadata.service';
import { ErrorMessageService } from '../../../shared-component/service/error-message/error-message.service';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { environment } from '../../../shared-component/environments/environment';
// // import { CompanyProfileService }

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  position: string;
  level: string;
  department: string;
  salary: number;
  hireDate: string;
  email: string;
  phone: string;
  location: string;
  profileImage: string;
  leaveDetails: {
    assignedLeaves: number;
    usedLeaves: number;
    leavesRemaining: number;
    leavesSpent: {
      type: string;
      daysUsed: number;
      from: string;
      to: string;
    }[];
  };
  attendance: {
    year: number;
    daysPresent: number;
    daysAbsent: number;
    lateArrivals: number;
    overtimeHours: number;
    lastPresent: string;
  };
}

@Component({
  selector: 'app-add-employee-form',
  templateUrl: './add-employee-form.component.html',
  styleUrl: './add-employee-form.component.scss',
  providers: [MessageService, ConfirmationService]
})
export class AddEmployeeFormComponent implements OnDestroy {
  @Input() close: () => void = () => {};
  @Input() admin: boolean = true

  readonly year = new Date().getFullYear();
  readonly maxProfilePhotoSizeInMb = 0.5;
  obCompanyName = '';
  obLogoUrl: string | null = null;
  readonly maxProfilePhotoSizeInBytes = this.maxProfilePhotoSizeInMb * 1024 * 1024;
  basicForm!: FormGroup;      
  employeeForm!: FormGroup;
  guarantorForm!: FormGroup
  NOKForm!: FormGroup
  registerInfo!: FormGroup
  hide = true;
  hideConfirm = true;
  loading = false
  draftLoading = false;
  imageURL: string =''
  /** Object URL behind `imageURL` when the photo came from the server; released when replaced or on destroy. */
  private photoObjectUrl: string | null = null;
  salaryStructure: any = [];
  departments = [
    "Human Resources",
    "Finance",
    "Marketing",
    "Sales",
    "Operations",
    "IT",
    "Customer Service",
    "Legal",
    "Procurement",
    "Administration",
    "group Development",
    "Research & Development",
    "Quality Assurance",
    "Public Relations",
    "Engineering",
    "Logistics",
    "Health and Safety",
    "Security",
    "Compliance",
    "Training & Development"
  ];
  gender: any[] = []
  currentTab = 1;
  tabs = ["Basic Information", "Employment Information", "Next Of Kin", "Guarantor Information", "Summary"]
   maritalStatuses: any[] = [

  ];
  religions: any[] = [
  ];

  nigerianBanks = [
    "Access Bank",
    "Carbon (One Finance)",
    "Citibank Nigeria",
    "Ecobank Nigeria",
    "Fidelity Bank",
    "First Bank of Nigeria",
    "First City Monument Bank",
    "Guaranty Trust Bank",
    "Heritage Bank",
    "Jaiz Bank",
    "Keystone Bank",
    "Kuda Microfinance Bank",
    "Moniepoint Microfinance Bank",
    "OPay (OPay Digital Services)",
    "PalmPay",
    "Polaris Bank",
    "Rubies Microfinance Bank",
    "Stanbic IBTC Bank",
    "Standard Chartered Bank",
    "Sterling Bank",
    "Taj Bank",
    "Union Bank of Nigeria",
    "United Bank for Africa",
    "VFD Microfinance Bank",
    "Wema Bank",
    "Zenith Bank"
  ];
  nextOfKinRelationships: any[] = [
  ];
  // Entries carry `__id` (the server record, once saved) and `__saved` (the server has this version).
  nextOfKinList: any[] = []
  guarantorList: any[] = []
  /** Index of the entry loaded into the form for editing; Add then updates it instead of adding one. */
  editingNokIndex: number | null = null;
  editingGuarantorIndex: number | null = null;
  /** True once the onboarding has been submitted; the form is replaced by a confirmation. */
  submitted = false;
  formErrors: string[] = [];
  userInfoRegData: any[] = [];
  userRegData: any = { };
  employeeId:number = 0
  employeeData: any;
  maxDate: string ="";
  isExpired = false;
  constructor(
    private fb: FormBuilder,
    private metadataService: MetadataService,
    private messageService: MessageService,
    private employeeService: EmployeeService,
    private route: ActivatedRoute,
    private errorMessageService: ErrorMessageService,
    private confirmationService: ConfirmationService,
    private http: HttpClient
  ) {  }

  ngOnInit(): void {
    if (!sessionStorage.getItem('userid')) {
      this.admin = false;
    }

    const expParam = this.route.snapshot.queryParamMap.get('exp');
    if (expParam) {
      const expMs = Number(expParam);
      if (!isNaN(expMs) && Date.now() > expMs) {
        this.isExpired = true;
        return;
      }
    }

    this.employeeId = parseFloat(this.route.snapshot.paramMap.get('id') as string);
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());  // 18 years ago
    this.maxDate = maxDate.toISOString().split('T')[0];  
   
    const salaryStructure = localStorage.getItem("salaryStructure");
    if (salaryStructure) {
      this.salaryStructure = JSON.parse(salaryStructure);
    }

    this.basicForm = this.fb.group({
      firstName: ['',Validators.required ],
      lastName: ['',Validators.required ],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      gender: ['', [Validators.required]],
      DOB: ['', [Validators.required]],
      maritalStatus: [null, [Validators.required, Validators.min(1)]],
      religion: [null, [Validators.required,  Validators.min(1)]],
      address: [null, [Validators.required,  Validators.min(1)]],
      profilePhoto: [null, [Validators.required, this.imageFileValidator()]]
    });

    this.employeeForm = this.fb.group({
     
      bankName: ["", [Validators.required]],
      accountNumber: ["", [Validators.required]],
      bvn: ["",],
      nin: ["", [Validators.required]],
    });

    this.NOKForm = this.fb.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      address: ['', [Validators.required]],
      relationship: [null, [Validators.required]],
      DOB: ['', [Validators.required]],
      emergencyContact: ['', []],

    });

    this.guarantorForm = this.fb.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
    });

    this.registerInfo = this.fb.group( {
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
      confirmPassword: ['', [Validators.required]],
    })

    this.fetchEmployeeData(this.employeeId);

    this.fetchMetaData()

  }

  fetchMetaData(){
    this.metadataService.ensureMetaLoaded();
    this.metadataService.gender$.subscribe(data => (this.gender = data));
    this.metadataService.maritalStatuses$.subscribe(data => (this.maritalStatuses = data));
    this.metadataService.religions$.subscribe(data => (this.religions = data));
    this.metadataService.nextOfKinRelationships$.subscribe(data => (this.nextOfKinRelationships = data));
  }
  fetchEmployeeData(employeeId: number): void {
    this.employeeService.getEmployeeById(employeeId).subscribe({
      next: (employee: any) => {
        this.employeeData = employee;
        this.applyEmployeeData(employee);
        if (!this.admin) {
          const userId = employee?.userId ?? employee?.user?.userId ?? employee?.createdBy;
          if (userId) this.loadCompanyBranding(userId);
        }
      },
      error: (err) => {
        const detail = this.errorMessageService.getUserMessage(
          err,
          'Could not load your onboarding details. Please reload the page or contact HR.'
        );
        this.messageService.add({ severity: 'error', summary: 'Error', detail, key: 'tl', life: 6000 });
      }
    });
  }

  /** The employee record has to be loaded first: the saved payload is built on top of it. */
  private ensureEmployeeLoaded(): boolean {
    if (this.employeeId && this.employeeData) return true;
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Your onboarding details have not loaded yet. Please reload the page and try again.',
      key: 'tl',
      life: 5000
    });
    return false;
  }

  private loadCompanyBranding(userId: number): void {
  }

  private applyEmployeeData(employee: any): void {
    if (!employee) return;

    const genderId = this.resolveId(employee.genderId ?? employee.gender);
    const maritalStatusId = this.resolveId(employee.maritalStatusId ?? employee.maritalStatus);
    const religionId = this.resolveId(employee.religionId ?? employee.religion);

    this.basicForm.patchValue({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      address: employee.address,
      DOB: this.toDateInputValue(employee.dob ?? employee.DOB),
      gender: genderId,
      maritalStatus: maritalStatusId,
      religion: religionId
    });

    this.employeeForm.patchValue({
      bankName: employee.bankName,
      accountNumber: employee.accountNumber,
      bvn: employee.bvn,
      nin: employee.nin
    });

    const opts = { emitModelToViewChange: false };
    const savedPhoto = sessionStorage.getItem(`onboarding_photo_${this.employeeId}`);
    if (savedPhoto) {
      this.imageURL = savedPhoto;
      this.basicForm.get('profilePhoto')?.setValue(savedPhoto, opts);
      this.basicForm.get('profilePhoto')?.updateValueAndValidity();
    } else {
      const mediaNo = employee?.employeeMedia?.mediaNo;
      const profileImage = employee?.profileImage || employee?.profilePhoto || employee?.imageUrl;
      if (mediaNo) {
        this.loadProfilePhoto(mediaNo);
        this.basicForm.get('profilePhoto')?.setValue(mediaNo, opts);
      } else if (profileImage) {
        this.imageURL = profileImage;
        this.basicForm.get('profilePhoto')?.setValue(profileImage, opts);
      }
      this.basicForm.get('profilePhoto')?.updateValueAndValidity();
    }

    const nextOfKin = employee?.nextOfKin || employee?.nextOfKins;
    if (Array.isArray(nextOfKin)) {
      this.nextOfKinList = nextOfKin.map((nok: any) => ({
        fullName: nok.fullName,
        email: nok.email,
        phone: nok.phone,
        address: nok.address,
        relationship: this.resolveId(nok.relationshipId ?? nok.relationship),
        DOB: this.toDateInputValue(nok.dob ?? nok.DOB),
        emergencyContact: nok.emergencyContact,
        __id: nok.id,
        __saved: true
      }));
    }

    const guarantors = employee?.guarantor || employee?.guarantors;
    if (Array.isArray(guarantors)) {
      this.guarantorList = guarantors.map((guarantor: any) => ({
        fullName: guarantor.fullName,
        email: guarantor.email,
        phone: guarantor.phone,
        __id: guarantor.id,
        __saved: true
      }));
    }
  }

  private resolveId(value: any): any {
    if (!value) return value;
    if (typeof value === 'object' && 'id' in value) return value.id;
    return value;
  }

  private toDateInputValue(date: Date | string | null | undefined): string | null {
    if (!date) return null;
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return null;
    return formatDate(parsed, 'yyyy-MM-dd', 'en-US');
  }

  ngOnDestroy(): void {
    this.releasePhotoObjectUrl();
  }

  private releasePhotoObjectUrl(): void {
    if (this.photoObjectUrl) {
      URL.revokeObjectURL(this.photoObjectUrl);
      this.photoObjectUrl = null;
    }
  }

  private loadProfilePhoto(mediaNo: string): void {
    this.employeeService.getEmployeeImage(mediaNo).subscribe({
      next: (response) => {
        const blob = new Blob([response], { type: 'image/png' });
        this.releasePhotoObjectUrl();
        this.photoObjectUrl = URL.createObjectURL(blob);
        this.imageURL = this.photoObjectUrl;
      },
      error: (err) => {
        console.error('Failed to load profile photo:', err);
      }
    });
  }
 imageFileValidator(): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    const file = control.value;
    if (!file) {
      return null; 
    }

    if(file instanceof File){
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(file.type )) {
        return { invalidFileType: true };
      }

      if (file.size > this.maxProfilePhotoSizeInBytes) {
        return {
          fileTooLarge: {
            maxSizeInMb: this.maxProfilePhotoSizeInMb
          }
        };
      }

      return null;
    }
    else if(typeof(file) == "string"){
      return null;
    } 
    else {return {invalidFileType: true}}
  };
  }
  nextTab() {
  
  if(this.currentTab == 1){
    this.basicForm.markAllAsTouched()
    if(this.basicForm.invalid) return
  }
  if(this.currentTab == 2){
    this.employeeForm.markAllAsTouched()
    if(this.employeeForm.invalid) return
  }

    if (this.currentTab < 5) {
      this.currentTab++;
    }
  }
  nextTabFromNok(){
    this.NOKForm.markAllAsTouched()
    if(this.NOKForm.valid) {
    this.addNextOfKin()
    }
    this.saveNextOfKinEntries();
    this.nextTab()
  }

  private saveNextOfKinEntries(onComplete?: (hadError: boolean) => void) {
    this.saveEntries(
      this.nextOfKinList,
      (nok) => ({
        fullName: nok.fullName,
        email: nok.email,
        phone: nok.phone,
        address: nok.address,
        relationshipId: nok.relationship,
        dob: this.toLocalDateTime(nok.DOB),
        emergencyContact: nok.emergencyContact,
        employeeId: Number(this.employeeId)
      }),
      (data) => {
        const formData = new FormData();
        formData.append('nextOfKinDTO', JSON.stringify(data));
        return this.employeeService.addNOK(formData);
      },
      (id, data) => this.employeeService.updateNOK(id, data),
      () => this.employeeService.getNOKByEmployeeId(this.employeeId),
      'Failed to save next of kin details. Please try again.',
      onComplete
    );
  }

  /**
   * Sends every entry the server doesn't have yet: an update (PUT) when it already has a server id,
   * otherwise a create. Creates whose reply has no id get it from the employee's saved list, so a
   * later edit updates that record instead of creating a duplicate.
   */
  private saveEntries(
    list: any[],
    toPayload: (entry: any) => any,
    create: (data: any) => Observable<any>,
    update: (id: number, data: any) => Observable<any>,
    loadSaved: () => Observable<any>,
    errorMessage: string,
    onComplete?: (hadError: boolean) => void
  ): void {
    const unsaved = list.filter((entry) => !entry.__saved);
    if (unsaved.length === 0) {
      onComplete?.(false);
      return;
    }

    const requests = unsaved.map((entry) => {
      const data = toPayload(entry);
      const request$ = entry.__id ? update(entry.__id, data) : create(data);
      return request$.pipe(
        map((res: any) => {
          entry.__id = entry.__id ?? res?.id ?? res?.data?.id;
          entry.__saved = true;
          return true;
        }),
        catchError((err) => {
          const detail = this.errorMessageService.getUserMessage(err, errorMessage);
          this.messageService.add({ severity: 'error', summary: 'Error', detail, key: 'tl', life: 4000 });
          return of(false);
        })
      );
    });

    forkJoin(requests).subscribe((results) => {
      const hadError = results.some((ok) => !ok);
      if (list.some((entry) => entry.__saved && !entry.__id)) {
        loadSaved().pipe(catchError(() => of(null))).subscribe((saved) => {
          this.fillMissingIds(list, saved);
          onComplete?.(hadError);
        });
        return;
      }
      onComplete?.(hadError);
    });
  }

  /** Copies server ids onto saved entries that lack one, matching by name, phone and email. */
  private fillMissingIds(list: any[], saved: any): void {
    const records: any[] = Array.isArray(saved) ? saved : (saved?.content ?? saved?.data ?? []);
    const key = (item: any) => [item?.fullName, item?.phone, item?.email].map((v) => String(v ?? '').trim().toLowerCase()).join('|');
    const taken = new Set(list.map((entry) => entry.__id).filter(Boolean));
    list.filter((entry) => entry.__saved && !entry.__id).forEach((entry) => {
      const match = records.find((record) => record?.id && !taken.has(record.id) && key(record) === key(entry));
      if (match) {
        entry.__id = match.id;
        taken.add(match.id);
      }
    });
  }

  nextTabFromGuarantor(){
    this.guarantorForm.markAllAsTouched()
    if(this.guarantorForm.valid) {
    this.addGuarantor()
    }
    this.saveGuarantorEntries();
    this.nextTab()
  }

  private saveGuarantorEntries(onComplete?: (hadError: boolean) => void) {
    this.saveEntries(
      this.guarantorList,
      (guarantor) => ({
        fullName: guarantor.fullName,
        email: guarantor.email,
        phone: guarantor.phone,
        employeeId: Number(this.employeeId),
      }),
      (data) => {
        const formData = new FormData();
        formData.append('guarantor', JSON.stringify(data));
        return this.employeeService.addGuarantor(formData);
      },
      (id, data) => this.employeeService.updateGuarantor(id, data),
      () => this.employeeService.getGuarantor(this.employeeId),
      'Failed to save guarantor details. Please try again.',
      onComplete
    );
  }

  previousTab() {
    if (this.currentTab > 1) {
      this.currentTab--;
    }
  }

  onSubmit() {
    if (this.loading || !this.ensureEmployeeLoaded()) return;
    this.loading = true;
    // Entries are saved when leaving their tab; retry any that failed so the submission is complete.
    this.saveNextOfKinEntries(() => this.saveGuarantorEntries(() => this.addNewEmployee()));
  }

  saveDraft() {
    if (this.draftLoading || this.loading) return;

    const isValid = this.validateCurrentSectionForDraft();
    if (!isValid) return;

    this.draftLoading = true;

    if (this.currentTab === 3) {
      this.saveNextOfKinEntries((hadError) => {
        this.draftLoading = false;
        if (!hadError) {
          this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Draft saved successfully!', key: 'tl', life: 3000 });
        }
      });
      return;
    }

    if (this.currentTab === 4) {
      this.saveGuarantorEntries((hadError) => {
        this.draftLoading = false;
        if (!hadError) {
          this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Draft saved successfully!', key: 'tl', life: 3000 });
        }
      });
      return;
    }

    if (!this.ensureEmployeeLoaded()) {
      this.draftLoading = false;
      return;
    }
    this.saveEmployee().subscribe({
      next: () => {
        this.draftLoading = false;
        this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Draft saved successfully!', key: 'tl', life: 3000 });
      },
      error: (err) => {
        this.draftLoading = false;
        const detail = this.errorMessageService.getUserMessage(
          err,
          'Failed to save draft. Please try again.'
        );
        this.messageService.add({ severity: 'error', summary: 'Error', detail, key: 'tl', life: 4000 });
      }
    })
  }

  private validateCurrentSectionForDraft(): boolean {
    if (this.currentTab === 1) {
      this.basicForm.markAllAsTouched();
      return this.basicForm.valid;
    }
    if (this.currentTab === 2) {
      this.employeeForm.markAllAsTouched();
      return this.employeeForm.valid;
    }
    if (this.currentTab === 3) {
      this.NOKForm.markAllAsTouched();
      if (this.NOKForm.valid) {
        this.addNextOfKin();
      }
      return this.nextOfKinList.length > 0;
    }
    if (this.currentTab === 4) {
      this.guarantorForm.markAllAsTouched();
      if (this.guarantorForm.valid) {
        this.addGuarantor();
      }
      return this.guarantorList.length > 0;
    }
    return true;
  }

  toLocalDateTime(date: Date | string): string {
    if (!date) return '';
    const parsedDate = new Date(date);
    return formatDate(parsedDate, "yyyy-MM-dd'T'HH:mm:ss", 'en-US');
  }

addNewEmployee(){
  this.saveEmployee().subscribe({
    next: (data: any) => {
      const vettingPayload = this.buildEmployeePayload();
      if (data?.id) {
        vettingPayload.employee.id = data.id;
        vettingPayload.employeeId = data.id;
      }
      this.employeeService.sendOnboardingVetting(vettingPayload, data).subscribe({
        error: (err) => {
          const detail = this.errorMessageService.getUserMessage(
            err,
            'Vetting request could not be sent. Please contact support.'
          );
          this.messageService.add({ severity: 'warn', summary: 'Notice', detail, key: 'tl', life: 4000 });
        }
      });

      this.loading = false;
      // The new hire isn't signed in, so they stay here and see a confirmation rather than an admin page.
      this.submitted = true;
      sessionStorage.removeItem(`onboarding_photo_${this.employeeId}`);
    },
    error: (err) => {
      this.loading = false;
      const detail = this.errorMessageService.getUserMessage(
        err,
        'Failed to submit onboarding details. Please try again.'
      );
      this.messageService.add({ severity: 'error', summary: 'Error', detail, key: 'tl', life: 4000 });
    }
  })
}

private buildEmployeePayload(): {
  employeeId: number;
  employee: any;
  nextOfKin: any[];
  guarantors: any[];
} {
  const employee = this.employeeData || {};
  const employeeMediaId = employee.employeeMedia?.id;
  const newEmployee: any = {
    id: this.employeeId,
    // Only the employee's own account. Never the signed-in user's: when HR opens this form, that
    // would attach HR's account to the new hire.
    userId: employee.userId ?? employee.user?.userId ?? null,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    workEmail: employee.workEmail,
    jobTitle: employee.jobTitle,
    levelId: employee.levelId ?? employee.level?.id ?? null,
    employmentType: employee.employmentType,
    supervisor: employee.supervisor,

    // Employment Information
    employeeStatus: employee.employeeStatus,
    employementStartDate: employee.employementStartDate,
    employmentEndDate: employee.employmentEndDate,
    onProbation: employee.onProbation,
    probationStartDate: employee.probationStartDate,
    probationEndDate: employee.probationEndDate,
    appraisalDueDate: employee.appraisalDueDate,


    phone: this.basicForm.get('phone')?.value,
    address: this.basicForm.get('address')?.value,
    dob: this.toLocalDateTime(this.basicForm.get('DOB')?.value),
    genderId: this.basicForm.get('gender')?.value,
    maritalStatusId: this.basicForm.get('maritalStatus')?.value,
    religionId: this.basicForm.get('religion')?.value,
    bankName: this.employeeForm.get('bankName')?.value,
    accountNumber: this.employeeForm.get('accountNumber')?.value,
    nin: this.employeeForm.get('nin')?.value,
    bvn: this.employeeForm.get('bvn')?.value,

    departmentId: employee.departmentId ?? employee.department?.id ?? null,
    jobTypeId: employee.jobTypeId ?? employee.jobType?.id ?? null
  };
  if (employeeMediaId) {
    newEmployee.employeeMediaId = employeeMediaId;
  }

  // Only entries the server has, with their ids, so the vetting step can tell they already exist.
  const nextOfKin = this.nextOfKinList.filter((nok) => nok.__saved).map((nok) => ({
    id: nok.__id ?? null,
    fullName: nok.fullName,
    email: nok.email,
    phone: nok.phone,
    address: nok.address,
    relationshipId: nok.relationship,
    dob: this.toLocalDateTime(nok.DOB),
    emergencyContact: nok.emergencyContact,
    employeeId: Number(this.employeeId)
  }));

  const guarantors = this.guarantorList.filter((guarantor) => guarantor.__saved).map((guarantor) => ({
    id: guarantor.__id ?? null,
    fullName: guarantor.fullName,
    email: guarantor.email,
    phone: guarantor.phone,
    employeeId: Number(this.employeeId)
  }));

  return {
    employeeId: Number(this.employeeId),
    employee: newEmployee,
    nextOfKin,
    guarantors
  };
}

/**
 * Updates the employee HR already created (PUT /employees/{id}), then uploads a newly picked
 * photo. This used to POST to the create endpoint with the id set, which could add another
 * employee on every submit or draft save.
 */
private saveEmployee(): Observable<any> {
  const { employee } = this.buildEmployeePayload();
  const profilePhoto = this.basicForm.get('profilePhoto')?.value;
  return this.employeeService.updateEmployee(employee, this.employeeId).pipe(
    switchMap((saved: any) => profilePhoto instanceof File
      ? this.employeeService.uploadEmployeePhoto({ id: this.employeeId }, profilePhoto).pipe(map(() => saved))
      : of(saved))
  );
}


 
  /** Adds the form as a new next of kin, or applies it to the one being edited. */
  addNextOfKin() {
    if (!this.NOKForm.valid) return;
    this.applyFormEntry(this.nextOfKinList, this.editingNokIndex, this.NOKForm.value);
    this.editingNokIndex = null;
    this.NOKForm.reset();
  }

  editNextOfKin(index: number) {
    this.editingNokIndex = index;
    this.NOKForm.patchValue(this.nextOfKinList[index]);
  }

  cancelNextOfKinEdit() {
    this.editingNokIndex = null;
    this.NOKForm.reset();
  }

  deleteNextOfKin(index: number) {
    this.confirmAndDelete(
      this.nextOfKinList, index, 'next of kin',
      (id) => this.employeeService.deleteNOK(id),
      () => { this.editingNokIndex = this.indexAfterRemoval(this.editingNokIndex, index, this.NOKForm); }
    );
  }

  /** Adds the form as a new guarantor, or applies it to the one being edited. */
  addGuarantor() {
    if (!this.guarantorForm.valid) return;
    this.applyFormEntry(this.guarantorList, this.editingGuarantorIndex, this.guarantorForm.value);
    this.editingGuarantorIndex = null;
    this.guarantorForm.reset();
  }

  editGuarantor(index: number) {
    const guarantor = this.guarantorList[index];
    this.editingGuarantorIndex = index;
    this.guarantorForm.patchValue({
      fullName: guarantor.fullName,
      email: guarantor.email,
      phone: guarantor.phone,
    });
  }

  cancelGuarantorEdit() {
    this.editingGuarantorIndex = null;
    this.guarantorForm.reset();
  }

  deleteGuarantor(index: number) {
    this.confirmAndDelete(
      this.guarantorList, index, 'guarantor',
      (id) => this.employeeService.deleteGuarantor(id),
      () => { this.editingGuarantorIndex = this.indexAfterRemoval(this.editingGuarantorIndex, index, this.guarantorForm); }
    );
  }

  /** Puts form values into the list: replacing the edited entry (keeping its server id) or appending. */
  private applyFormEntry(list: any[], editingIndex: number | null, values: any): void {
    if (editingIndex !== null && list[editingIndex]) {
      list[editingIndex] = { ...list[editingIndex], ...values, __saved: false };
    } else {
      list.push({ ...values, __saved: false });
    }
  }

  /** Asks first, then removes the entry, deleting the server record when there is one. */
  private confirmAndDelete(
    list: any[],
    index: number,
    label: string,
    deleteOnServer: (id: number) => Observable<any>,
    afterRemove: () => void
  ): void {
    const entry = list[index];
    if (!entry) return;
    this.confirmationService.confirm({
      header: `Remove ${label}`,
      message: `Remove ${entry.fullName || `this ${label}`}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Remove',
      rejectLabel: 'Cancel',
      accept: () => {
        const remove = () => {
          const current = list.indexOf(entry);
          if (current === -1) return;
          list.splice(current, 1);
          afterRemove();
        };
        if (!entry.__id) {
          remove();
          return;
        }
        deleteOnServer(entry.__id).subscribe({
          next: () => remove(),
          error: (err) => {
            const detail = this.errorMessageService.getUserMessage(err, `Failed to remove ${label}. Please try again.`);
            this.messageService.add({ severity: 'error', summary: 'Error', detail, key: 'tl', life: 4000 });
          }
        });
      }
    });
  }

  /** The edit index once entry `removed` is gone: cleared (with the form) if it was the one being edited. */
  private indexAfterRemoval(editingIndex: number | null, removed: number, form: FormGroup): number | null {
    if (editingIndex === null) return null;
    if (editingIndex === removed) {
      form.reset();
      return null;
    }
    return editingIndex > removed ? editingIndex - 1 : editingIndex;
  }

  onProfilePhotoChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      const file = input.files[0];
      const profilePhotoControl = this.basicForm.get('profilePhoto');
      // Don't write the File back into the <input type="file">; browsers reject that.
      profilePhotoControl?.setValue(file, { emitModelToViewChange: false });
      profilePhotoControl?.markAsTouched();
      profilePhotoControl?.updateValueAndValidity();

      if (profilePhotoControl?.invalid) {
        input.value = '';
        return;
      }

      this.previewImageFile(file);
      this.basicForm.get('profilePhoto')?.updateValueAndValidity();
    }

  }
  getFormControls(control: string) {
    const formGroup = this[control as keyof this] as FormGroup;
    return Object.keys(formGroup.controls).map(key => ({
      key: key,
      value: formGroup.get(key)?.value
    }));
  }
  getKeys(obj: any): string[] {
    return Object.keys(obj).filter(key => !key.startsWith('__'));
  }
  toTitleCaseWithSpace(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }

  previewImageFile(file: File){
    if (file) {
      const reader = new FileReader();
      reader.onload = (event: any) => {
        this.releasePhotoObjectUrl();
        this.imageURL = event.target.result;
        if (this.employeeId) {
          sessionStorage.setItem(`onboarding_photo_${this.employeeId}`, event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  }

 

  getErrorMessage(control: AbstractControl | null, controlName: string): string {
    // const control = this.basicForm.get(controlName);
    if (control?.hasError('required')) {
      return `${this.toTitleCaseWithSpace(controlName)} is required.`;
    }
  
    if (control?.hasError('email')) {
      return 'Enter a valid email address.';
    }
  
    if (control?.hasError('minlength')) {
      const requiredLength = control.getError('minlength').requiredLength;
      return `${this.toTitleCaseWithSpace(controlName)} must be at least ${requiredLength} characters long.`;
    }
  
    if (control?.hasError('maxlength')) {
      const maxLength = control.getError('maxlength').requiredLength;
      return `${this.toTitleCaseWithSpace(controlName)} cannot be more than ${maxLength} characters long.`;
    }
  
    if (control?.hasError('invalidFileType')) {
      return `${this.toTitleCaseWithSpace(controlName)} must be a valid image file (PNG, JPG, JPEG).`;
    }

    if (control?.hasError('fileTooLarge')) {
      return `${this.toTitleCaseWithSpace(controlName)} must not be more than ${this.maxProfilePhotoSizeInMb} MB.`;
    }
  
    return '';
  }
  
}
