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
  basicForm!: FormGroup;
  employeeForm!: FormGroup;
  guarantorForm!: FormGroup
  leaveForm!: FormGroup
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
  leaves: any[] = []
  isAmountTouched: boolean = false
  selectedLeaves: {
    name: number,
    amount: number
  }[] = []


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
  nextOfKinList: any[] = []
  guarantorList: any[] = []
  formErrors: string[] = [];
  userInfoRegData: any[] = [];
  userRegData: any = { };
  roles: any[] = [];
  totalLeaveDays: number = 0;
  errorMessage: string = "";
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
    this.metadataService.departments$.subscribe(data => (this.departments = data));
    this.metadataService.levels$.subscribe(data => (this.levels = data))
    this.metadataService.leaves$.subscribe(data => (this.leaves = data));
   this.metadataService.employment$.subscribe(data => this.employments = data);
    this.metadataService.gender$.subscribe(data => (this.gender = data));
   this.loadEmployees();
   
    this.basicForm = this.fb.group({
      firstName: ['',Validators.required ],
      lastName: ['',Validators.required ],
      email: [ "", [Validators.required, Validators.email]],
      workemail:[ "", [Validators.required, Validators.email]],
      gender: ["", [Validators.required]],
      title: ["", [Validators.required]],
      department: ["", [Validators.required]],
      level: [0, [Validators.required]],
      jobType: [0, [Validators.required]],
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

    this.leaveForm = this.fb.group({
      // leaveDays: [null, Validators.required],
      leaveType: [null, [Validators.pattern("^[0-9]*$"), Validators.min(1)]],
      leaveAmount: [null, [Validators.pattern("^[0-9]*$"), Validators.min(1)]],
    
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

    this.leaveForm.valueChanges.subscribe(() => this.calculateTotalLeaveDays());
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

    // Match gender from loaded metadata
    const genderId = this.gender.find(
      g => g.name?.toLowerCase() === d.gender?.toLowerCase()
    )?.id ?? '';

    this.basicForm.patchValue({
      firstName: d.firstName ?? '',
      lastName: d.lastName ?? '',
      email: d.email ?? '',
      gender: genderId,
      title: d.jobTitle ?? '',
    });

    if (d.startDate) {
      this.employeeForm.patchValue({ startDate: d.startDate });
    }
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
        console.log('Error fetching roles:', err);
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

  calculateTotalLeaveDays(): void {
    this.totalLeaveDays = Object.values(this.selectedLeaves).reduce((sum: number, leave) => sum + Number(leave.amount || 0), 0);
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
      console.log(file)
      if (!allowedTypes.includes(file.type )) {
        return { invalidFileType: true };
      }else{
       return null
      }
    }
    else if(typeof(file) == "string"){
      const allowedTypes = ['.png', '.jpeg', '.jpg'];
      const fileExtension = file.slice(file.lastIndexOf('.')).toLowerCase();
      console.log(file)
    console.log(fileExtension)
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
  // if(this.currentTab == 3){
  //   this.leaveForm.markAllAsTouched()
  //   if(this.leaveForm.invalid) return
  // }
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
  const currentDate = new Date();  
  const currentYear = currentDate.getFullYear();  
  const formattedDate = currentDate.toISOString().split('T')[0];
  const employeesFromStorage = localStorage.getItem("employeesList");
  const employeesList = employeesFromStorage ? JSON.parse(employeesFromStorage) : [];
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

    // Employment Information
    employeeStatus: this.employeeForm.get('status')?.value.toUpperCase(),
    employementStartDate: this.toLocalDateTime(this.employeeForm.get('startDate')?.value),
    employmentEndDate: this.toLocalDateTime(this.employeeForm.get('endDate')?.value),
    onProbation: this.employeeForm.get('isProbation')?.value,
    probationStartDate: this.toLocalDateTime(this.employeeForm.get('probationStartDate')?.value),
    probationEndDate: this.toLocalDateTime(this.employeeForm.get('probationEndDate')?.value),
    appraisalDueDate: this.toLocalDateTime(this.employeeForm.get('appraisalDueDate')?.value),

    // Leave Information
    // leaveDays: this.leaveForm.get('leaveDays')?.value,

    // Access Information
    // optimaxAccess: this.guarantorForm.get('optimaxAccess')?.value,
    // roleId: this.guarantorForm.get('roleId')?.value,
   
  }
  const hasOptiMaxAccess = this.guarantorForm.get('optimaxAccess')?.value;
  const firstName = this.basicForm.get('firstName')?.value ?? '';
  const lastName = this.basicForm.get('lastName')?.value ?? '';
  const workEmail = this.basicForm.get('workemail')?.value ?? '';
  const email = this.basicForm.get('email')?.value ?? '';
  const username = workEmail || email;
  const password = this.generateRandomPassword();
  const signupDetails = this.buildSignupDetails(username, password, email, firstName, lastName);

  this.authenticationService.userRegistrationByAdmin(signupDetails).subscribe({
    next: (userData) => {
      newEmployee.userId = userData?.id;
      const formData = new FormData();
      formData.append('employee', JSON.stringify(newEmployee));

      this.employeeService.addEmployee(formData).subscribe({
        next: (data: any) => {
          if (hasOptiMaxAccess) {
            const roleRequest = {
              userId: userData.id,
              appRoleId: this.guarantorForm.get('roleId')?.value
            };

            this.authenticationService.userApplicationRole(roleRequest).subscribe({
              next: () => {
                this.finalizeEmployeeCreation(data, shouldRedirect, {
                  username,
                  password,
                  message: 'Employee added and user access created successfully!'
                });
              },
              error: (err) => {
                console.log(err);
                this.finalizeEmployeeCreation(data, shouldRedirect, {
                  username,
                  password,
                  severity: 'warn',
                  message: 'Employee created, but role assignment failed. Please assign role in settings.'
                });
              }
            });
          } else {
            this.finalizeEmployeeCreation(data, shouldRedirect, {
              message: 'Employee added successfully!'
            });
          }
        },
        error: (err) => {
          this.resetSubmitLoading();
          const detail = this.errorMessageService.getUserMessage(
            err,
            'Failed to create employee. Please try again.'
          );
          this.messageService.add({ severity: 'error', summary: 'Error', detail, key: 'tl', life: 4000 });
          console.log(err);
        }
      });
    },
    error: (error) => {
      this.resetSubmitLoading();
      const detail = this.errorMessageService.getUserMessage(
        error,
        'Failed to create user account. Please try again.'
      );
      this.messageService.add({ severity: 'error', summary: 'Error', detail, key: 'tl', life: 4000 });
      console.log(error);
    }
  });
  // employeesList.push(newEmployee);
  // localStorage.setItem("employeesList", JSON.stringify(employeesList));
  if (shouldRedirect) {
  // this.router.navigate([`/user/onboarding/${newEmployee.id}/wer23456fghi367ghj`]);
  }
 
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
    const url = `${window.location.origin}/onboarding/${data.id}/wer23456fghi367ghj?onboarding=1`;

    if (options?.username && options?.password) {
      this.pendingCredentials = { name, username: options.username, password: options.password };
    }

    if (options?.username && options?.password && data.email) {
      const subject = `${companyName} — Your Onboarding Credentials`;
      const htmlBody = this.buildOnboardingEmailHtml({ name, username: options.username, password: options.password, url, companyName, hrEmail });
      this.employeeService.sendNotificationEmail(data.email, subject, htmlBody).subscribe({
        next: () => { this.pendingCredentials = null; },
        error: () => {}
      });
    }
  }

  private buildOnboardingEmailHtml(d: { name: string; username: string; password: string; url: string; companyName: string; hrEmail: string }): string {
    const hrLine = d.hrEmail
      ? `Please contact the <strong>HR Department</strong> at <a href="mailto:${d.hrEmail}" style="color:#1e3a5f;text-decoration:none;">${d.hrEmail}</a> for any queries regarding your onboarding.`
      : `Please contact the <strong>HR Department</strong> for any queries regarding your onboarding.`;
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:36px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
  <tr><td style="background:#1b3358;padding:36px 40px;text-align:center;">
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;color:#7aa7d4;text-transform:uppercase;">Human Resources</p>
    <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">${d.companyName}</h1>
    <p style="margin:8px 0 0;font-size:13px;color:#a8c5e8;">Staff Onboarding</p>
  </td></tr>
  <tr><td style="padding:40px 40px 28px;">
    <p style="margin:0 0 20px;font-size:15px;color:#1a2b3c;font-weight:600;">Dear ${d.name},</p>
    <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.7;">We are delighted to welcome you to <strong>${d.companyName}</strong>. Please complete your onboarding by submitting the required documentation through the portal below.</p>
    <p style="margin:0 0 8px;font-size:13px;color:#64748b;">You will be required to provide:</p>
    <ul style="margin:0 0 24px;padding-left:20px;font-size:13px;color:#64748b;line-height:2;">
      <li>Passport photograph / Valid ID</li><li>Guarantor information</li><li>Next-of-kin details</li><li>Bank account number</li><li>Any other requested personal information</li>
    </ul>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr><td style="background:#1b3358;border-radius:6px;padding:13px 30px;">
        <a href="${d.url}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.3px;">Begin Onboarding Process →</a>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
      <tr><td style="padding:22px 26px;">
        <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Your Portal Credentials</p>
        <table cellpadding="0" cellspacing="0">
          <tr><td style="padding:5px 16px 5px 0;font-size:13px;color:#94a3b8;white-space:nowrap;">Username</td><td style="padding:5px 0;font-size:13px;color:#1e293b;font-weight:600;">${d.username}</td></tr>
          <tr><td style="padding:5px 16px 5px 0;font-size:13px;color:#94a3b8;white-space:nowrap;">Password</td><td style="padding:5px 0;font-size:13px;color:#1e293b;font-family:monospace;font-weight:700;letter-spacing:1.5px;background:#f1f5f9;border-radius:4px;padding-left:8px;padding-right:8px;">${d.password}</td></tr>
        </table>
        <p style="margin:14px 0 0;font-size:11px;color:#94a3b8;">You will be prompted to change your password after your first login.</p>
      </td></tr>
    </table>
    <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">If the button above does not work, copy and paste the link below into your browser:</p>
    <p style="margin:0;font-size:12px;color:#3b82f6;word-break:break-all;">${d.url}</p>
  </td></tr>
  <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;">
    <p style="margin:0 0 10px;font-size:13px;color:#475569;line-height:1.6;">${hrLine}</p>
    <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">We look forward to a productive and rewarding journey together.<br/><strong>Human Resources Department</strong><br/>${d.companyName}</p>
  </td></tr>
  <tr><td style="padding:16px 40px;text-align:center;"><p style="margin:0;font-size:11px;color:#cbd5e1;">This is a system-generated message. Please do not reply to this email.</p></td></tr>
</table></td></tr></table></body></html>`;
  }

  private resetSubmitLoading() {
    this.submitLoading = false;
    this.submitContinueLoading = false;
  }

  addAnother() {
    this.submitted = false;
    this.lastSubmittedName = '';
    this.basicForm.reset();
    this.guarantorForm.reset();
    this.leaveForm.reset();
    this.employeeForm.reset();
    this.currentTab = 1;
    this.selectedLeaves = [];
    this.totalLeaveDays = 0;
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

  private generateRandomPassword(length = 12): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%*?';
    const all = lowercase + uppercase + numbers + symbols;

    const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
    const passwordChars = [
      pick(lowercase),
      pick(uppercase),
      pick(numbers),
      pick(symbols)
    ];

    for (let i = passwordChars.length; i < length; i += 1) {
      passwordChars.push(pick(all));
    }

    return passwordChars.sort(() => Math.random() - 0.5).join('');
  }



 




  onFileChange(event: Event, controlName: string) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      const file = input.files[0];
     console.log(`${controlName} file:`, file);
      this.guarantorForm.patchValue({ [controlName]: file }); 
      this.guarantorForm.get(controlName)?.updateValueAndValidity();

console.log(this.guarantorForm.value)
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

  dismissCredentials() { this.pendingCredentials = null; }

  copyToClipboard(value: string) {
    navigator.clipboard.writeText(value).catch(() => {});
  }

  addLeave(){
    this.isAmountTouched = true
    const leaveType = this.leaveForm.value.leaveType;
    const leaveAmount = this.leaveForm.value.leaveAmount;
    if(  this.leaveForm.valid && 
      typeof leaveAmount === 'number' && 
      !isNaN(leaveAmount)){
      this.selectedLeaves.push({
        name: leaveType,
        amount: leaveAmount
      })
      this.calculateTotalLeaveDays()
      this.isAmountTouched =false
      this.leaveForm.reset()
    }else {
      this.isAmountTouched= true
      this.errorMessage = this.getLeaveAmountErrorMessage()
    }

  }

  getLeaveNameWithId(id: number){
    const leave = this.leaves.find((item) => item.value === id);
    return leave ? leave.label : 'Unknown';
  }

  getLeaveAmountErrorMessage(): string {
    const control = this.leaveForm.get('leaveAmount');
  
   
    if (control?.value <= 0 && typeof control?.value === 'number') {
      return 'Value must be at least 1.';
    }
  
    if (!isNaN(control?.value)) {
      return 'Please enter a positive number.';
    }
  
    return '';
  }

  removeLeave(id: number){
    const leaveIndex = this.selectedLeaves.findIndex(s => s.name === id);
    this.selectedLeaves.splice(leaveIndex, 1)
    this.calculateTotalLeaveDays()
  }
  
}
