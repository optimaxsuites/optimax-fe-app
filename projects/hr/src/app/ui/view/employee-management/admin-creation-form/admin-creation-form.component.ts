import { Component, OnInit , Input } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl,  FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { RandomTokenService } from '../../../shared-component/service/random-token/random-token.service';
import { environment } from '../../../shared-component/service/environments/environment';
import { AuthenticationService } from '../../../shared-component/service/auth-service/authentication.service';

@Component({
  selector: 'app-admin-creation-form',
  templateUrl: './admin-creation-form.component.html',
  styleUrl: './admin-creation-form.component.scss'
})
export class AdminCreationFormComponent {
  @Input() close: () => void = () => {};
  @Input() admin: boolean = true

  basicForm!: FormGroup;      
  employeeForm!: FormGroup;
  guarantorForm!: FormGroup
  NOKForm!: FormGroup
  registerInfo!: FormGroup
  showModal: boolean = false;
  currentFile: string = '';
  hide = true;
  hideConfirm = true;
  loading = false
  fileDataUrl: SafeUrl = '';
  imageURL: string =''
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
    "Product Development",
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
  gender = ["Male", "Female", "Other"]
  currentTab = 1;
  tabs = ["Employment Information", "Employment Status", "Leave", "Acesss", "Summary"]
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
  employments = ["Contractor", "Full Time", "Part Time", "Internship", "Seasonal", "Temporary"]
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
  constructor(
    private fb: FormBuilder,  
    private authenticationService: AuthenticationService,
    private messageService: MessageService,
    private router: Router, 
    private token: RandomTokenService, 
    private sanitizer: DomSanitizer
  ) {  }

  ngOnInit(): void {
    
    this.userInfoRegData = JSON.parse(sessionStorage["userRegData"]);
    this.userRegData = this.userInfoRegData;
    const salaryStructure = localStorage.getItem("salaryStructure");
    if (salaryStructure) {
      this.salaryStructure = JSON.parse(salaryStructure);
    }

    this.basicForm = this.fb.group({
      firstName: ['Employee',Validators.required ],
      lastName: ['Employee',Validators.required ],
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
      endDate: ['', [Validators.required]],
      startDate: ['', [Validators.required]],
    });

    this.NOKForm = this.fb.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      address: ['', [Validators.required]],
      relationship: ['', [Validators.required]],
      DOB: ['', [Validators.required]],
      emergencyContact: ['', []],

    });

    this.guarantorForm = this.fb.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      address: ['', [Validators.required]],
      relationship: ['', [Validators.required]],
      DOB: ['', [Validators.required]],
      idNumber: ['', [Validators.required]],
      yearsKnown: ['', [Validators.required, ]],
      signature: ['', [Validators.required, this.imageFileValidator()]],
      passportPhoto: ['', [Validators.required, this.imageFileValidator()]],
      idCard: ['', [ this.imageFileValidator()]],
    });

    this.registerInfo = this.fb.group( {
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
      confirmPassword: ['', [Validators.required]],
    })
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
    if (this.currentTab < 5) {
      this.currentTab++;
    }
  }
  nextTabFromNok(){
    this.NOKForm.markAllAsTouched()
    if(this.NOKForm.valid) {
    this.addNextOfKin()
    }
    this.nextTab()
  }
  nextTabFromGuarantor(){
    this.guarantorForm.markAllAsTouched()
    if(this.guarantorForm.valid) {
    this.addGuarantor()
    }
    this.nextTab()
  }

  previousTab() {
    if (this.currentTab > 1) {
      this.currentTab--;
    }
  }

  onSubmit() {
  this.loading = true;

    if (this.basicForm.get('createLogin')?.value) {
      this.nextAndCreate()
    }else {
      this.addNewEmployee()
    }

   
  }
addNewEmployee(){
  const currentDate = new Date();  
  const currentYear = currentDate.getFullYear();  
  const formattedDate = currentDate.toISOString().split('T')[0];
  const employeesFromStorage = localStorage.getItem("employeesList");
  const employeesList = employeesFromStorage ? JSON.parse(employeesFromStorage) : [];
  const newEmployee = {
    id: this.token.getRandomToken(),
    firstName: this.basicForm.get('firstName')?.value,
    lastName: this.basicForm.get('lastName')?.value,
    dob: this.basicForm.get('DOB')?.value,
    gender: this.basicForm.get('gender')?.value,
    email: this.basicForm.get('email')?.value,
    phone: this.basicForm.get('phone')?.value,
    maritalStstus: this.basicForm.get('maritalStatus')?.value,
    religion: this.basicForm.get('religion')?.value,
    address: this.basicForm.get('address')?.value,
    jobTitle: this.employeeForm.get('title')?.value,
    department: this.employeeForm.get('department')?.value,
    level: this.employeeForm.get('level')?.value,
    employmentType: this.employeeForm.get('employmentType')?.value,
    supervisor: this.employeeForm.get('supervisor')?.value,
    bankName: this.employeeForm.get('bankName')?.value,
    accountNumber: this.employeeForm.get('accountNumber')?.value,
    nin: this.employeeForm.get('nin')?.value,
    bvn: this.employeeForm.get('bvn')?.value,
    nextOfKin: [...this.nextOfKinList],
    guarantor: [... this.guarantorList],
    hireDate: formattedDate,
    profileImage: this.imageURL, 
    leaveDetails: {
      assignedLeaves: 20,
      usedLeaves: 0,
      leavesRemaining: 20,
      leavesSpent: [
      ]
    },
    attendance: {
      year: currentYear,
      daysPresent: 1,
      daysAbsent: 0,
      lateArrivals: 0,
      overtimeHours: 0,
      lastPresent: formattedDate,
      day2DayAttendance: [
        {
          date: formattedDate,
          clockIn: "9:00 AM",
          clockOut: "5:00 PM",
          comment: "First day in"
        },
      ]
    }
  }
  employeesList.push(newEmployee);

  localStorage.setItem("employeesList", JSON.stringify(employeesList));
  this.loading = false;
  this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Employee added successfully!' }); 
  this.basicForm.reset()
  this.guarantorForm.reset()
  this.NOKForm.reset()
  this.employeeForm.reset()
  this.nextOfKinList = []
  this.guarantorList = []
  this.imageURL =''
  this.fileDataUrl =''
  this.currentTab = 1
}


  nextAndCreate() {
  const signupDetails = {
      username: this.basicForm.get('firstName')?.value,
      password: this.basicForm.get('firstName')?.value,
      email: this.basicForm.get('email')?.value,
      role: ['user'],
      project : `${environment.project}`,
      apiKey : `${environment.apiKey}`
  };

  this.authenticationService.userRegistration(signupDetails).subscribe(
    async (data) => {
          this.loading = false;
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'User account created successfully!' }); 
          this.addNewEmployee()
      },
      (error) => {

        if (error.toString() == '400') {
          // Client-side validation error (invalid input)
          this.messageService.add({ 
              severity: 'error', 
              summary: 'Registration Failed', 
              detail: 'Account with email address already exists. Check your mail to verify!' 
          });
      } else if (error.toString() == '409') {
          // Conflict error (e.g., email already registered)
          this.messageService.add({ 
              severity: 'error', 
              summary: 'Registration Failed', 
              detail: 'Email address is already registered. Please use a different email or login.' 
          });
      } else if (error.toString() == '0') {
          // Network error or server unreachable
          this.messageService.add({ 
              severity: 'error', 
              summary: 'Registration Failed', 
              detail: 'Unable to connect to the server. Please check your internet connection.' 
          });
      } else {
          // Other server errors
          this.messageService.add({ 
              severity: 'error', 
              summary: 'Registration Failed', 
              detail: 'An unexpected error occurred. Please try again later.' 
          });
      }
          this.loading = false;
      }
  );
  }
  addNextOfKin() {
    if (this.NOKForm.valid) {
      this.nextOfKinList.push(this.NOKForm.value);
      this.NOKForm.reset(); 
    } else {
    }
  }

  editNextOfKin(index: number) {
    const kin = this.nextOfKinList[index];
    this.NOKForm.patchValue(kin); 
    this.nextOfKinList.splice(index, 1);
  }

  deleteNextOfKin(index: number) {
    if (confirm('Are you sure you want to remove this next of kin?')) {
      this.nextOfKinList.splice(index, 1); 
    }
  }
  addGuarantor() {
    if (this.guarantorForm.valid) {
      this.guarantorList.push(this.guarantorForm.value);

      this.guarantorForm.reset(); 
    } else {
    }
  }
  editGuarantor(index: number) {
    const guarantor = this.guarantorList[index];
    this.guarantorForm.patchValue({
      fullName: guarantor.fullName,
      email: guarantor.email,
      phone: guarantor.phone,
      address: guarantor.address,
      relationship: guarantor.relationship,
      DOB: guarantor.DOB,
      idNumber: guarantor.idNumber,
      yearsKnown: guarantor.yearsKnown,
      signature: null, 
      passportPhoto: null, 
      idCard: null, 
    });
    this.guarantorList.splice(index, 1);
  }

  deleteGuarantor(index: number) {
    if (confirm('Are you sure you want to remove this guarantoor?')) {
      this.guarantorList.splice(index, 1); 
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
}
