import { Component, OnInit , Input } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl,  FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { RandomTokenService } from '../../../shared-component/service/random-token/random-token.service';
import { environment } from '../../../shared-component/service/environments/environment';
import { AuthenticationService } from '../../../shared-component/service/auth-service/authentication.service';
import { DataService } from '../../../service/data.service';
import { EmployeeService } from '../../../service/employee.service';
import { formatDate } from '@angular/common';
import { MetadataService } from '../../../service/metadata.service';

@Component({
  selector: 'app-admin-creation-form',
  templateUrl: './admin-creation-form.component.html',
  styleUrl: './admin-creation-form.component.scss',
  providers: [MessageService]
})
export class AdminCreationFormComponent {

  @Input() close: () => void = () => {};
  @Input() admin: boolean = true

  openInfoModal: boolean = false
  basicForm!: FormGroup;      
  employeeForm!: FormGroup;
  guarantorForm!: FormGroup
  leaveForm!: FormGroup
  registerInfo!: FormGroup
  showModal: boolean = false;
  currentFile: string = '';
  hide = true;
  hideConfirm = true;
  loading = false
  fileDataUrl: SafeUrl = '';
  imageURL: string =''
  salaryStructure: any = [];
  departments: any[] = [];
  employees: any[] = [];

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
  totalLeaveDays: number = 0;
  errorMessage: string = "";
  showMetaModal: boolean = false;
  activeMetaType: 'department' | 'employment' | 'level' | null = null;
  savingMeta: boolean = false;
  metaForm!: FormGroup;
  constructor(
    private fb: FormBuilder,  
    private metadataService: MetadataService,
    private messageService: MessageService,
    private router: Router, 
    private token: RandomTokenService, 
    private employeeService: EmployeeService,
    private dataService: DataService
  ) {  }

  ngOnInit(): void {
   

    this.metadataService.ensureMetaLoaded();
    this.metadataService.departments$.subscribe(data => (this.departments = data));
    this.metadataService.levels$.subscribe(data => (this.levels = data))
    this.metadataService.leaves$.subscribe(data => (this.leaves = data));
   this.metadataService.employment$.subscribe(data => this.employments = data);
   this.loadEmployees();
   
    this.basicForm = this.fb.group({
      firstName: ['',Validators.required ],
      lastName: ['',Validators.required ],
      email: [ "", [Validators.required, Validators.email]],
      workemail:[ "", [Validators.required, Validators.email]],
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
      employeePortalAccess: [false],
      emailAccess: [false],
      hrSystemAccess: [false],
      projectManagementAccess: [false],
      buildingAccess: [false],
      managerialAccess: [false],
      adminAccess: [false]
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
  }

  get metaTitle(): string {
    switch (this.activeMetaType) {
      case 'department':
        return 'Create Department';
      case 'employment':
        return 'Create Employment Type';
      case 'level':
        return 'Create Level';
      default:
        return 'Create';
    }
  }

  openMetaModal(type: 'department' | 'employment' | 'level') {
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
      next: (data) => {
        const employees = Array.isArray(data)
          ? data
          : Array.isArray(data?.content)
          ? data.content
          : Array.isArray(data?.data)
          ? data.data
          : [];

        this.employees = employees
          .map((employee: any) => ({
            ...employee,
            fullName: `${employee?.firstName ?? ''} ${employee?.lastName ?? ''}`.trim()
          }))
          .filter((employee: any) => employee.fullName.length > 0)
          .sort((a: any, b: any) => a.fullName.localeCompare(b.fullName));
      },
      error: () => {
        this.employees = [];
      }
    });
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

  onSubmit(shouldRedirect: boolean = false) {
  this.loading = true;
  this.addNewEmployee(shouldRedirect)
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
  const newEmployee = {
 
    firstName: this.basicForm.get('firstName')?.value,
    lastName: this.basicForm.get('lastName')?.value,
    email: this.basicForm.get('email')?.value,
    workEmail: this.basicForm.get('workemail')?.value,
    jobTitle: this.basicForm.get('title')?.value,
    departmentId: this.basicForm.get('department')?.value,
    levelId: this.basicForm.get('level')?.value,
    jobType: this.basicForm.get('jobType')?.value,
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
    // employeePortalAccess: this.guarantorForm.get('employeePortalAccess')?.value,
    // emailAccess: this.guarantorForm.get('emailAccess')?.value,
    // hrSystemAccess: this.guarantorForm.get('hrSystemAccess')?.value,
    // projectManagementAccess: this.guarantorForm.get('projectManagementAccess')?.value,
    // buildingAccess: this.guarantorForm.get('buildingAccess')?.value,
    // managerialAccess: this.guarantorForm.get('managerialAccess')?.value,
    // adminAccess: this.guarantorForm.get('adminAccess')?.value,
   
  }
  const formData = new FormData();
  formData.append('employee', JSON.stringify(newEmployee));
  console.log(formData)
  this.employeeService.addEmployee(formData).subscribe(
   { next: (data: any) => {
    console.log(data)
    this.loading = false;
    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Employee added successfully!', key: 'tl', life: 3000  }); 
    this.basicForm.reset()
    this.guarantorForm.reset()
    this.leaveForm.reset()
    this.employeeForm.reset()
    this.currentTab = 1

    if (shouldRedirect) {
      this.router.navigate([`/user/onboarding/${data.id}/wer23456fghi367ghj`]);
      }
   },
   error: (err) => {
    this.loading = false;
    console.log(err)
  }
  },
   
  
  )
  // employeesList.push(newEmployee);
  // localStorage.setItem("employeesList", JSON.stringify(employeesList));
  if (shouldRedirect) {
  // this.router.navigate([`/user/onboarding/${newEmployee.id}/wer23456fghi367ghj`]);
  }
 
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
