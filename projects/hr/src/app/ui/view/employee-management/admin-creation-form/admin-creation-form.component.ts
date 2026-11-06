import { Component, OnInit , Input, OnChanges, SimpleChanges } from '@angular/core';
import { ImportedEmployeeData } from '../pre-onboarding-import/pre-onboarding-import.component';
import { AbstractControl, FormBuilder, FormControl,  FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { environment } from '../../../shared-component/service/environments/environment';
import { AuthenticationService } from '../../../shared-component/service/auth-service/authentication.service';
import { DataService } from '../../../service/data.service';
import { EmployeeService } from '../../../service/employee.service';
import { formatDate } from '@angular/common';
import { MetadataService } from '../../../service/metadata.service';
import { RolesService } from '../../../service/roles.service';
import { NavigationLinksService } from '../../../shared-component/service/navigation-links/navigation-links.service';
import { ErrorMessageService } from '../../../shared-component/service/error-message/error-message.service';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import { findIdByName, parseImportedDate } from '../employee-import.util';
import { buildOnboardingEmailHtml, buildOnboardingLink, generateTemporaryPassword, onboardingLinkExpiry } from '../onboarding-credentials.util';
// // import { CompanyProfileService }

@Component({
  selector: 'app-admin-creation-form',
  templateUrl: './admin-creation-form.component.html',
  styleUrls: ['./admin-creation-form.component.scss'],
  providers: [MessageService]
})
export class AdminCreationFormComponent implements OnChanges {

  @Input() close: () => void = () => {};
  @Input() admin: boolean = true;
  @Input() importData: ImportedEmployeeData | null = null;

  openInfoModal: boolean = false
  submitted = false;
  lastSubmittedName = '';
  pendingCredentials: { name: string; username: string; password: string } | null = null;
  showPendingPassword = false;
  basicForm!: FormGroup;
  employeeForm!: FormGroup;
  guarantorForm!: FormGroup
  registerInfo!: FormGroup
  showModal: boolean = false;
  currentFile: string = '';
  hide = true;
  hideConfirm = true;
  submitLoading = false;
  submitContinueLoading = false;
  fileDataUrl: SafeUrl = '';
  imageURL: string =''
  salaryStructure: any = [];
  departments: any[] = [];
  employees: any[] = [];
  gender: any[] = [];

  levels: any[] = []


  currentTab = 1;
  tabs = ["Employment Information", "Employment Status", "Access", "Summary"]
  
  
  employments: any[] = []
  nigerianBanks = [
    "Access Bank",
    "Citibank Nigeria",
    "Ecobank Nigeria",
    "Fidelity Bank",
    "First Bank of Nigeria",
    "First City Monument Bank",
    "Guaranty Trust Bank",
    "Heritage Bank",
    "Jaiz Bank",
    "Keystone Bank",
    "Polaris Bank",
    "Stanbic IBTC Bank",
    "Standard Chartered Bank",
    "Sterling Bank",
    "Union Bank of Nigeria",
    "United Bank for Africa",
    "Wema Bank",
    "Zenith Bank"
  ];
  nextOfKinRelationships: any[] = [];
  maritalStatuses: any[] = [];
  religions: any[] = [];
  nextOfKinList: any[] = []
  guarantorList: any[] = []
  formErrors: string[] = [];
  userInfoRegData: any[] = [];
  userRegData: any = { };
  roles: any[] = [];
  showMetaModal: boolean = false;
  activeMetaType: 'department' | 'employment' | 'level' | 'gender' | null = null;
  savingMeta: boolean = false;
  metaForm!: FormGroup;
  constructor(
    private fb: FormBuilder,  
    private metadataService: MetadataService,
    private messageService: MessageService,
    private router: Router, 
    private employeeService: EmployeeService,
    private dataService: DataService,
    private authenticationService: AuthenticationService,
    private rolesService: RolesService,
    public navigationLink: NavigationLinksService,
    private errorMessageService: ErrorMessageService
  ) {  }

  ngOnInit(): void {
   

    this.metadataService.ensureMetaLoaded();
    this.metadataService.departments$.subscribe(data => { this.departments = data; this.applyImportLookups(); });
    this.metadataService.levels$.subscribe(data =>
      this.levels = (data || []).map((l: any) => ({ ...l, displayLabel: l.position?.trim() || l.name }))
    )
   this.metadataService.employment$.subscribe(data => { this.employments = data; this.applyImportLookups(); });
    this.metadataService.gender$.subscribe(data => { this.gender = data; this.applyImportLookups(); });
    this.metadataService.maritalStatuses$.subscribe(data => (this.maritalStatuses = data));
    this.metadataService.religions$.subscribe(data => (this.religions = data));
    this.metadataService.nextOfKinRelationships$.subscribe(data => (this.nextOfKinRelationships = data));
   this.loadEmployees();
   
    this.basicForm = this.fb.group({
      firstName: ['',Validators.required ],
      lastName: ['',Validators.required ],
      email: [ "", [Validators.required, Validators.email]],
      workemail:[ "", [Validators.required, Validators.email]],
      gender: ["", [Validators.required]],
      title: ["", [Validators.required]],
      department: ["", [Validators.required]],
      level: [null, [Validators.required]],
      jobType: [null, [Validators.required]],
      supervisor: ["", [Validators.required]],
    });

    this.employeeForm = this.fb.group({
      status: ['', Validators.required],
      endDate: ['', []],
      startDate: ['', [Validators.required]],
      isProbation: [false],
      probationStartDate: [''],
      probationEndDate: [''],
      appraisalDueDate: ['', Validators.required]
    });

    this.guarantorForm = this.fb.group({
      optimaxAccess: [false],
      roleId: [null]
    });

    this.metaForm = this.fb.group({
      name: ['', Validators.required],
      code: [''],
      description: ['']
    });

    this.registerInfo = this.fb.group( {
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
      confirmPassword: ['', [Validators.required]],
    })

    this.setProbationValidators();
    this.setOptimaxAccessValidators();

    this.employeeForm.get('isProbation')?.valueChanges.subscribe(isProbation => {
      if (isProbation) {
        this.employeeForm.get('probationStartDate')?.setValidators(Validators.required);
        this.employeeForm.get('probationEndDate')?.setValidators(Validators.required);
      } else {
        this.employeeForm.get('probationStartDate')?.clearValidators();
        this.employeeForm.get('probationEndDate')?.clearValidators();
      }
      this.employeeForm.get('probationStartDate')?.updateValueAndValidity();
      this.employeeForm.get('probationEndDate')?.updateValueAndValidity();
    });

    this.fetchRoles();
    this.updateSupervisorValidators();

    if (this.importData) {
      setTimeout(() => this.applyImportData(), 0);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['importData'] && this.importData && this.basicForm) {
      this.applyImportData();
    }
  }

  private applyImportData(): void {
    if (!this.importData) return;
    const d = this.importData;

    this.basicForm.patchValue({
      firstName: d.firstName ?? '',
      lastName: d.lastName ?? '',
      email: d.email ?? '',
      workemail: d.email ?? '',
      title: d.jobTitle ?? '',
    });

    const startDate = parseImportedDate(d.startDate);
    if (startDate) {
      this.employeeForm.patchValue({ startDate: formatDate(startDate, 'yyyy-MM-dd', 'en-US') });
    }
    this.applyImportLookups();
  }

  /**
   * Fills the dropdowns the import has names for (gender, department, employment type). Runs again
   * whenever one of those lists loads, since the import can arrive first; never overwrites a choice.
   */
  private applyImportLookups(): void {
    if (!this.importData || !this.basicForm) return;
    const d = this.importData;
    const fillIfEmpty = (controlName: string, items: any[], name: string | undefined) => {
      const control = this.basicForm.get(controlName);
      if (!control || control.value) return;
      const id = findIdByName(items, name);
      if (id !== undefined) control.setValue(id);
    };
    fillIfEmpty('gender', this.gender, d.gender);
    fillIfEmpty('department', this.departments, d.department);
    fillIfEmpty('jobType', this.employments, d.employmentType);
  }

  /** Personal and bank details from an imported form that go on the employee record; blanks are left out. */
  private importedEmployeeFields(): Record<string, any> {
    const d = this.importData;
    if (!d) return {};
    const dob = parseImportedDate(d.dob);
    const fields: Record<string, any> = {
      phone: d.phone,
      address: d.address,
      dob: dob ? this.toLocalDateTime(dob) : undefined,
      maritalStatusId: findIdByName(this.maritalStatuses, d.maritalStatus),
      religionId: findIdByName(this.religions, d.religion),
      bankName: d.bankName,
      accountNumber: d.accountNumber,
      bvn: d.bvn,
    };
    return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined && value !== null && value !== ''));
  }

  /** What the import will add beyond this form, for the summary step. */
  get importedSummary(): { label: string; value: string }[] {
    const d = this.importData;
    if (!d) return [];
    const rows: [string, string | undefined][] = [
      ['Phone', d.phone],
      ['Date of Birth', d.dob],
      ['Address', d.address],
      ['Marital Status', d.maritalStatus],
      ['Religion', d.religion],
      ['Bank', d.bankName],
      ['Account Number', d.accountNumber],
      ['BVN', d.bvn],
      ['Next of Kin', [d.nokName, d.nokRelationship, d.nokPhone].filter(Boolean).join(' · ')],
      ['Guarantor 1', [d.g1Name, d.g1Phone].filter(Boolean).join(' · ')],
      ['Guarantor 2', [d.g2Name, d.g2Phone].filter(Boolean).join(' · ')],
    ];
    return rows.filter(([, value]) => !!value).map(([label, value]) => ({ label, value: value as string }));
  }

  /** Imported fields with nowhere to go on the employee record, so HR knows to keep the paper form. */
  get importedUnsavedFields(): string[] {
    const d = this.importData;
    if (!d) return [];
    const rows: [string, string | undefined][] = [
      ['Middle name', d.middleName],
      ['Nationality', d.nationality],
      ['State of origin', d.stateOfOrigin],
      ['LGA of origin', d.lgaOfOrigin],
      ['Branch', d.branch],
      ['Highest qualification', d.highestQualification],
      ['Field of study', d.fieldOfStudy],
      ['Account name', d.accountName],
    ];
    return rows.filter(([, value]) => !!value).map(([label]) => label);
  }

  /** Creates the next of kin and guarantors from an imported form once the employee exists. */
  private saveImportedRelatives(employeeId: number | undefined): void {
    const d = this.importData;
    if (!d || !employeeId) return;
    const requests: Observable<unknown>[] = [];

    if (d.nokName) {
      const nextOfKin = {
        fullName: d.nokName,
        email: d.nokEmail ?? '',
        phone: d.nokPhone ?? '',
        address: d.nokAddress ?? '',
        relationshipId: findIdByName(this.nextOfKinRelationships, d.nokRelationship) ?? null,
        emergencyContact: false,
        employeeId: Number(employeeId),
      };
      const formData = new FormData();
      formData.append('nextOfKinDTO', JSON.stringify(nextOfKin));
      requests.push(this.employeeService.addNOK(formData));
    }

    [
      { fullName: d.g1Name, phone: d.g1Phone, email: d.g1Email },
      { fullName: d.g2Name, phone: d.g2Phone, email: d.g2Email },
    ]
      .filter((guarantor) => !!guarantor.fullName)
      .forEach((guarantor) => {
        const formData = new FormData();
        formData.append('guarantor', JSON.stringify({
          fullName: guarantor.fullName,
          email: guarantor.email ?? '',
          phone: guarantor.phone ?? '',
          employeeId: Number(employeeId),
        }));
        requests.push(this.employeeService.addGuarantor(formData));
      });

    if (requests.length === 0) return;
    forkJoin(requests.map((request) => request.pipe(map(() => true), catchError(() => of(false))))).subscribe((results) => {
      const failed = results.filter((ok) => !ok).length;
      if (failed > 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Some imported details not saved',
          detail: `${failed} of ${results.length} imported next-of-kin/guarantor records could not be saved. Add them from the employee's profile.`,
          key: 'tl',
          life: 6000,
        });
      }
    });
  }

  get metaTitle(): string {
    switch (this.activeMetaType) {
      case 'department':
        return 'Create Department';
      case 'employment':
        return 'Create Employment Type';
      case 'level':
        return 'Create Level';
      case 'gender':
        return 'Create Gender';
      default:
        return 'Create';
    }
  }

  fetchRoles() {
    this.rolesService.getRoles().subscribe({
      next: (roles) => {
        const roleList = Array.isArray(roles) ? roles : [];
        this.roles = roleList.map(role => ({
          ...role,
          name: role.name ?? role.roleName
        }));
      },
      error: (err) => {
        this.roles = [];
      }
    });
  }

  setOptimaxAccessValidators() {
    const optimaxAccessControl = this.guarantorForm.get('optimaxAccess');
    const roleControl = this.guarantorForm.get('roleId');
    optimaxAccessControl?.valueChanges.subscribe((hasAccess) => {
      if (hasAccess) {
        roleControl?.setValidators([Validators.required]);
      } else {
        roleControl?.clearValidators();
        roleControl?.setValue(null);
      }
      roleControl?.updateValueAndValidity();
    });
    if (optimaxAccessControl?.value) {
      roleControl?.setValidators([Validators.required]);
      roleControl?.updateValueAndValidity();
    }
  }

  getRoleNameById(roleId: number | null): string {
    if (!roleId) return '';
    const role = this.roles.find(r => r.id === roleId);
    return role?.name || '';
  }

  openMetaModal(type: 'department' | 'employment' | 'level' | 'gender') {
    this.activeMetaType = type;
    this.showMetaModal = true;
    this.metaForm.reset();

    const codeControl = this.metaForm.get('code');
    const descriptionControl = this.metaForm.get('description');

    if (type === 'level') {
      codeControl?.setValidators([Validators.required]);
      descriptionControl?.setValidators([Validators.required]);
    } else {
      codeControl?.clearValidators();
      descriptionControl?.clearValidators();
    }

    codeControl?.updateValueAndValidity();
    descriptionControl?.updateValueAndValidity();
  }

  closeMetaModal() {
    this.showMetaModal = false;
    this.activeMetaType = null;
    this.metaForm.reset();
  }

  saveMeta() {
    if (!this.activeMetaType) return;
    this.metaForm.markAllAsTouched();
    if (this.metaForm.invalid) return;

    const payload = {
      id: 0,
      name: this.metaForm.get('name')?.value ?? '',
      code: this.metaForm.get('code')?.value ?? '',
      description: this.metaForm.get('description')?.value ?? '',
    };

    this.savingMeta = true;

    const request =
      this.activeMetaType === 'department'
        ? this.dataService.addDepartment({ id: payload.id, name: payload.name, code: payload.code, description: payload.description })
        : this.activeMetaType === 'employment'
        ? this.dataService.addJobType({ id: payload.id, name: payload.name, code: payload.code, description: payload.description })
        : this.activeMetaType === 'gender'
        ? this.dataService.addGender({ id: payload.id, name: payload.name, code: payload.code, description: payload.description })
        : this.dataService.addLevel({ name: payload.name, code: payload.code, description: payload.description });

    request.subscribe({
      next: (data: any) => {
        this.savingMeta = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `${this.metaTitle} saved`,
          key: 'tl',
          life: 3000
        });
        this.metadataService.refreshMetaData();
        if (this.activeMetaType === 'department' && data?.id) {
          this.basicForm.get('department')?.setValue(data.id);
        }
        if (this.activeMetaType === 'employment' && data?.id) {
          this.basicForm.get('jobType')?.setValue(data.id);
        }
        if (this.activeMetaType === 'level' && data?.id) {
          this.basicForm.get('level')?.setValue(data.id);
        }
        if (this.activeMetaType === 'gender' && data?.id) {
          this.basicForm.get('gender')?.setValue(data.id);
        }
        this.closeMetaModal();
      },
      error: () => {
        this.savingMeta = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Unable to save ${this.activeMetaType}`,
          key: 'tl',
          life: 3000
        });
      }
    });
  }

  private loadEmployees() {
    this.employeeService.getAllEmployee().subscribe({
      next: (employees) => {
        this.employees = employees
          .map((employee: any) => ({
            ...employee,
            fullName: `${employee?.firstName ?? ''} ${employee?.lastName ?? ''}`.trim()
          }))
          .filter((employee: any) => employee.fullName.length > 0)
          .sort((a: any, b: any) => a.fullName.localeCompare(b.fullName));
        this.updateSupervisorValidators();
      },
      error: () => {
        this.employees = [];
        this.updateSupervisorValidators();
      }
    });
  }

  private updateSupervisorValidators(): void {
    if (!this.basicForm) return;
    const supervisorControl = this.basicForm.get('supervisor');
    if (!supervisorControl) return;

    if (this.employees.length === 0) {
      supervisorControl.clearValidators();
    } else {
      supervisorControl.setValidators([Validators.required]);
    }
    supervisorControl.updateValueAndValidity();
  }

private setProbationValidators(): void {
  const isProbation = this.employeeForm.get('isProbation')?.value;
  if (isProbation) {
    this.employeeForm.get('probationStartDate')?.setValidators(Validators.required);
    this.employeeForm.get('probationEndDate')?.setValidators(Validators.required);
  } else {
    this.employeeForm.get('probationStartDate')?.clearValidators();
    this.employeeForm.get('probationEndDate')?.clearValidators();
  }
  this.employeeForm.get('probationStartDate')?.updateValueAndValidity();
  this.employeeForm.get('probationEndDate')?.updateValueAndValidity();
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
      }else{
       return null
      }
    }
    else if(typeof(file) == "string"){
      const allowedTypes = ['.png', '.jpeg', '.jpg'];
      const fileExtension = file.slice(file.lastIndexOf('.')).toLowerCase();
      if (!allowedTypes.includes(fileExtension )) {
        return { invalidFileType: true };
      }else{
       return null
      }
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
  if(this.currentTab == 3){
    this.guarantorForm.markAllAsTouched()
    if(this.guarantorForm.invalid) return
  }
  
   

    if (this.currentTab < 4) {
      this.currentTab++;
    }
  }
  
 
  previousTab() {
    if (this.currentTab > 1) {
      this.currentTab--;
    }
  }

  get isSubmitting(): boolean {
    return this.submitLoading || this.submitContinueLoading;
  }

  onSubmit(shouldRedirect: boolean = false) {
    if (this.isSubmitting) return;
    if (shouldRedirect) {
      this.submitContinueLoading = true;
    } else {
      this.submitLoading = true;
    }
    this.addNewEmployee(shouldRedirect);
  }
  openBulkInstruction() {
      this.openInfoModal = true
  }
 toLocalDateTime(date: Date | string): string {
    if (!date) return '';
    const parsedDate = new Date(date);
    return formatDate(parsedDate, "yyyy-MM-dd'T'HH:mm:ss", 'en-US');
  }

  addNewEmployee(shouldRedirect: boolean){
  this.applyImportLookups();
  if (!this.basicForm.valid || !this.employeeForm.valid) {
    this.basicForm.markAllAsTouched();
    this.employeeForm.markAllAsTouched();
    return;
  }
  const newEmployee: any = {
    firstName: this.basicForm.get('firstName')?.value,
    lastName: this.basicForm.get('lastName')?.value,
    email: this.basicForm.get('email')?.value,
    workEmail: this.basicForm.get('workemail')?.value,
    genderId: this.basicForm.get('gender')?.value,
    jobTitle: this.basicForm.get('title')?.value,
    departmentId: this.basicForm.get('department')?.value,
    levelId: this.basicForm.get('level')?.value,
    jobTypeId: this.basicForm.get('jobType')?.value,
    supervisor: this.basicForm.get('supervisor')?.value,
    employeeStatus: this.employeeForm.get('status')?.value.toUpperCase(),
    employementStartDate: this.toLocalDateTime(this.employeeForm.get('startDate')?.value),
    employmentEndDate: this.toLocalDateTime(this.employeeForm.get('endDate')?.value),
    onProbation: this.employeeForm.get('isProbation')?.value,
    probationStartDate: this.toLocalDateTime(this.employeeForm.get('probationStartDate')?.value),
    probationEndDate: this.toLocalDateTime(this.employeeForm.get('probationEndDate')?.value),
    appraisalDueDate: this.toLocalDateTime(this.employeeForm.get('appraisalDueDate')?.value),
    ...this.importedEmployeeFields(),
  };

  const hasOptiMaxAccess = this.guarantorForm.get('optimaxAccess')?.value;
  const firstName = this.basicForm.get('firstName')?.value ?? '';
  const lastName = this.basicForm.get('lastName')?.value ?? '';
  const workEmail = this.basicForm.get('workemail')?.value ?? '';
  const email = this.basicForm.get('email')?.value ?? '';
  const resolvedEmail = workEmail || email;
  const username = resolvedEmail.split('@')[0] || resolvedEmail;
  const password = generateTemporaryPassword();

  const createUserThenPersist = () => {
    const signupDetails = this.buildSignupDetails(username, password, resolvedEmail, firstName, lastName);
    this.authenticationService.userRegistrationByAdmin(signupDetails).subscribe({
      next: (userData) => {
        // The shared auth interceptor turns a 401 into an empty 200, so a reply without an id is a failure.
        if (!userData?.id) {
          this.failSubmit('The user account was not created: the server refused the request. Sign in again and retry, or contact support if it keeps happening.');
          return;
        }
        this.persistEmployeeWithUser(newEmployee, userData.id, hasOptiMaxAccess, shouldRedirect, username, password);
      },
      error: (error) => {
        this.failSubmit(this.errorMessageService.getUserMessage(error, 'Failed to create user account. Please try again.'));
      }
    });
  };

  this.authenticationService.getRegDataByUsername(username).subscribe({
    next: (existingUser) => {
      const existingId = existingUser?.id ?? existingUser?.userId;
      if (existingId) {
        this.persistEmployeeWithUser(newEmployee, existingId, hasOptiMaxAccess, shouldRedirect, username, password);
      } else {
        createUserThenPersist();
      }
    },
    error: () => createUserThenPersist()
  });
}

  /** Ends a failed submit: re-enables the buttons and says why. */
  private failSubmit(detail: string): void {
    this.resetSubmitLoading();
    this.messageService.add({ severity: 'error', summary: 'Error', detail, key: 'tl', life: 6000 });
  }

  private persistEmployeeWithUser(
    newEmployee: any,
    userId: number | null,
    hasOptiMaxAccess: boolean,
    shouldRedirect: boolean,
    username: string,
    password: string
  ): void {
    if (userId) newEmployee.userId = userId;
    const formData = new FormData();
    formData.append('employee', JSON.stringify(newEmployee));
    this.employeeService.addEmployee(formData).subscribe({
      next: (data: any) => {
        // The shared auth interceptor turns a 401 into an empty 200, so a reply without an id means nothing was saved.
        if (!data?.id) {
          this.failSubmit('The employee was not saved: the server refused the request. Sign in again and retry, or contact support if it keeps happening.');
          return;
        }
        this.saveImportedRelatives(data.id);
        if (hasOptiMaxAccess && userId) {
          const roleRequest = { userId, appRoleId: this.guarantorForm.get('roleId')?.value };
          this.authenticationService.userApplicationRole(roleRequest).subscribe({
            next: () => this.finalizeEmployeeCreation(data, shouldRedirect, {
              username, password, message: 'Employee added and user access created successfully!'
            }),
            error: () => this.finalizeEmployeeCreation(data, shouldRedirect, {
              username, password, severity: 'warn',
              message: 'Employee created, but role assignment failed. Please assign role in settings.'
            })
          });
        } else {
          this.finalizeEmployeeCreation(data, shouldRedirect, { message: 'Employee added successfully!' });
        }
      },
      error: (err) => {
        this.resetSubmitLoading();
        const detail = this.errorMessageService.getUserMessage(err, 'Failed to create employee. Please try again.');
        this.messageService.add({ severity: 'error', summary: 'Error', detail, key: 'tl', life: 4000 });
      }
    });
  }

  private finalizeEmployeeCreation(
    data: any,
    shouldRedirect: boolean,
    options?: {
      username?: string;
      password?: string;
      message?: string;
      severity?: 'success' | 'warn' | 'error';
    }
  ) {
    this.resetSubmitLoading();
    const severity = options?.severity || 'success';
    const summary = severity === 'success' ? 'Success' : 'Notice';

    this.messageService.add({
      severity,
      summary,
      detail: options?.message || 'Employee added successfully!',
      key: 'tl',
      life: 3000
    });

    this.submitted = true;
    this.lastSubmittedName = `${data.firstName} ${data.lastName}`.trim();

    const companyName = 'The Company';
    const hrEmail = '';
    const name = `${data.firstName} ${data.lastName}`.trim();
    const expiresAt = onboardingLinkExpiry();
    const url = buildOnboardingLink(data.id, expiresAt);

    if (!options?.username || !options?.password) return;
    const credentials = { name, username: options.username, password: options.password };
    // The credentials card is only for when the email can't go out, so HR can pass them on by hand.
    const showCredentials = () => {
      this.pendingCredentials = credentials;
      this.showPendingPassword = false;
    };

    if (!data.email) {
      showCredentials();
      return;
    }
    const subject = `${companyName} — Your Onboarding Credentials`;
    const htmlBody = buildOnboardingEmailHtml({ ...credentials, url, companyName, hrEmail, expiresAt });
    this.employeeService.sendNotificationEmail(data.email, subject, htmlBody).subscribe({
      error: () => showCredentials()
    });
  }

  private resetSubmitLoading() {
    this.submitLoading = false;
    this.submitContinueLoading = false;
  }

  addAnother() {
    // The import belonged to the employee just created; the next one starts blank.
    this.importData = null;
    this.submitted = false;
    this.lastSubmittedName = '';
    this.basicForm.reset();
    this.guarantorForm.reset();
    this.employeeForm.reset();
    this.currentTab = 1;
  }

  private buildSignupDetails(username: string, password: string, email: string, firstName = '', lastName = '') {
    const business = sessionStorage.getItem('userPrimaryInfoRegData')
      ? JSON.parse(sessionStorage.getItem('userPrimaryInfoRegData') || '{}')
      : null;

    const businessInfo = {
      fullname: `${firstName} ${lastName}`.trim(),
      username: username || '',
      email: email || '',
      industry: business?.industry,
      companyName: business?.companyName,
      clientType: business?.clientType,
      currency: business?.currency,
      language: business?.language,
      timeZone: business?.timeZone,
    };

    return {
      username,
      password,
      email,
      project: `${environment.project}`,
      apiKey: `${environment.apiKey}`,
      upi: businessInfo
    };
  }

  onFileChange(event: Event, controlName: string) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      const file = input.files[0];
      this.guarantorForm.patchValue({ [controlName]: file }); 
      this.guarantorForm.get(controlName)?.updateValueAndValidity();

    }
  }
  onProfilePhotoChange(event: Event, controlName: string) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.previewImageFile(input.files[0])
      const file = input.files;
      this.basicForm.patchValue({ [controlName]: file }); 
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
    return Object.keys(obj);
  }
  toTitleCaseWithSpace(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }
  isFile(value: any): boolean {
    return value instanceof File;
  }

  openFileInModal(fileUrl: string) {
    this.currentFile = fileUrl;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.fileDataUrl = '';
  }

  previewFile(file: File) {
    if (file) {
      const reader = new FileReader();
      reader.onload = (event: any) => {
        
          this.fileDataUrl = event.target.result;
         
          this.showModal = true;           
      };
      reader.readAsDataURL(file);
  }
  }

  previewImageFile(file: File){
    if (file) {
      const reader = new FileReader();
      reader.onload = (event: any) => {
        
          this.imageURL = event.target.result;
         
      };
      reader.readAsDataURL(file);
  }
  }

  // getFormValidationErrors() {
  //   const errors: any[] = [];
    
  //   Object.keys(this.basicForm.controls).forEach(key => {
  //     const controlErrors = this.basicForm.get(key)?.errors;
  //     if (controlErrors) {
  //       Object.keys(controlErrors).forEach(errorKey => {
  //         errors.push(this.getErrorMessage(control, key));
  //       });
  //     }
  //   });
  
  //   return errors;
  // }

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
  
    return '';
  }

  dismissCredentials() {
    this.pendingCredentials = null;
    this.showPendingPassword = false;
  }

  copyToClipboard(value: string) {
    navigator.clipboard.writeText(value).catch(() => {});
  }

  
}
