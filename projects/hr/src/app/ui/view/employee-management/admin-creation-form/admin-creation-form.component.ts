import { Component, OnInit , Input } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl,  FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { RandomTokenService } from '../../../shared-component/service/random-token/random-token.service';
import { environment } from '../../../shared-component/service/environments/environment';
import { AuthenticationService } from '../../../shared-component/service/auth-service/authentication.service';
import { DataService } from '../../../service/data.service';

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
  gender: any[] = []
  currentTab = 1;
  tabs = ["Employment Information", "Employment Status", "Leave", "Access", "Summary"]
   maritalStatuses = [
    "Single",
    "Married",
    "Divorced",
    "Widowed",
    "Separated",
    "Engaged",
    "In a Relationship",
    "Domestic Partnership",
    "Civil Union"
  ];
  religions = [
    "Christianity",
    "Islam",
    "Hinduism",
    "Buddhism",
    "Judaism",
    "Atheism",
    "Agnosticism",
    "Sikhism",
    "Taoism",
    "Shinto",
    "Traditional African Religions",
    "Bahá'í",
    "Other"
  ];
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
  nextOfKinRelationships = [
    "Spouse",
    "Parent",
    "Sibling",
    "Child",
    "Grandparent",
    "Grandchild",
    "Aunt",
    "Uncle",
    "Cousin",
    "Friend",
    "Guardian",
    "Partner",
    "In-law",
    "Other"
  ];
  nextOfKinList: any[] = []
  guarantorList: any[] = []
  formErrors: string[] = [];
  userInfoRegData: any[] = [];
  userRegData: any = { };
totalLeaveDays: number = 0;
  constructor(
    private fb: FormBuilder,  
    private authenticationService: AuthenticationService,
    private messageService: MessageService,
    private router: Router, 
    private token: RandomTokenService, 
    private sanitizer: DomSanitizer,
    private dataService: DataService
  ) {  }

  ngOnInit(): void {
    this.dataService.getDepartment().subscribe(departments => {
       this.departments = departments.map((d: any) => ({
        label: d.name,
        value: d.id,
      }));
    });
    this.dataService.getGender().subscribe(gender => {
      this.gender = gender.map((g: any) => ({
       label: g.name,
       value: g.id,
     }));
   });
   this.dataService.getJobType().subscribe(jobType => {
    this.employments = jobType.map((j: any) => ({
     label: j.name,
     value: j.id,
   }));
 });
   
     
    // this.userInfoRegData = JSON.parse(sessionStorage["userRegData"]);
    // this.userRegData = this.userInfoRegData;
    const salaryStructure = localStorage.getItem("salaryStructure");
    if (salaryStructure) {
      this.salaryStructure = JSON.parse(salaryStructure);
    }

    this.basicForm = this.fb.group({
      firstName: ['',Validators.required ],
      lastName: ['',Validators.required ],
      email: [ "employee@gmail.com", [Validators.required, Validators.email]],
      workemail:[ "", [Validators.required, Validators.email]],
      title: ["", [Validators.required]],
      department: ["", [Validators.required]],
      level: ["", [Validators.required]],
      employmentType: ["", [Validators.required]],
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
      annual: [0, [ Validators.pattern("^[0-9]*$"), Validators.min(0)]],
      sick: [0, [ Validators.pattern("^[0-9]*$"), Validators.min(0)]],
      holiday: [0, [ Validators.pattern("^[0-9]*$"), Validators.min(0)]],
      bereavement: [0, [ Validators.pattern("^[0-9]*$"), Validators.min(0)]],
      casual: [0, [ Validators.pattern("^[0-9]*$"), Validators.min(0)]]
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

  calculateTotalLeaveDays(): void {
    this.totalLeaveDays = Object.values(this.leaveForm.value).reduce((sum: number, value) => sum + Number(value || 0), 0);
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
  if(this.currentTab == 3){
    this.leaveForm.markAllAsTouched()
    if(this.leaveForm.invalid) return
  }
  if(this.currentTab == 4){
    this.guarantorForm.markAllAsTouched()
    if(this.guarantorForm.invalid) return
  }
  
   

    if (this.currentTab < 5) {
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


  addNewEmployee(shouldRedirect: boolean){
  const currentDate = new Date();  
  const currentYear = currentDate.getFullYear();  
  const formattedDate = currentDate.toISOString().split('T')[0];
  const employeesFromStorage = localStorage.getItem("employeesList");
  const employeesList = employeesFromStorage ? JSON.parse(employeesFromStorage) : [];
  const newEmployee = {
    id: this.token.getRandomToken(),  // Generate a random ID for the employee
    firstName: this.basicForm.get('firstName')?.value,
    lastName: this.basicForm.get('lastName')?.value,
    email: this.basicForm.get('email')?.value,
    workemail: this.basicForm.get('workemail')?.value,
    jobTitle: this.basicForm.get('title')?.value,
    department: this.basicForm.get('department')?.value,
    level: this.basicForm.get('level')?.value,
    employmentType: this.basicForm.get('employmentType')?.value,
    supervisor: this.basicForm.get('supervisor')?.value,

    // Employment Information
    status: this.employeeForm.get('status')?.value,
    startDate: this.employeeForm.get('startDate')?.value,
    endDate: this.employeeForm.get('endDate')?.value,
    isProbation: this.employeeForm.get('isProbation')?.value,
    probationStartDate: this.employeeForm.get('probationStartDate')?.value,
    probationEndDate: this.employeeForm.get('probationEndDate')?.value,
    appraisalDueDate: this.employeeForm.get('appraisalDueDate')?.value,

    // Leave Information
    leaveDays: this.leaveForm.get('leaveDays')?.value,

    // Access Information
    employeePortalAccess: this.guarantorForm.get('employeePortalAccess')?.value,
    emailAccess: this.guarantorForm.get('emailAccess')?.value,
    hrSystemAccess: this.guarantorForm.get('hrSystemAccess')?.value,
    projectManagementAccess: this.guarantorForm.get('projectManagementAccess')?.value,
    buildingAccess: this.guarantorForm.get('buildingAccess')?.value,
    managerialAccess: this.guarantorForm.get('managerialAccess')?.value,
    adminAccess: this.guarantorForm.get('adminAccess')?.value,
   
  }
  employeesList.push(newEmployee);
  localStorage.setItem("employeesList", JSON.stringify(employeesList));
  if (shouldRedirect) {
  this.router.navigate([`/user/onboarding/${newEmployee.id}/wer23456fghi367ghj`]);
  }
  this.loading = false;
  this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Employee added successfully!', key: 'tl', life: 3000  }); 
  this.basicForm.reset()
  this.guarantorForm.reset()
  this.leaveForm.reset()
  this.employeeForm.reset()
  this.currentTab = 1
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
}
