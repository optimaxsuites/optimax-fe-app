import { Component, OnInit , Input } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AuthenticationService } from 'src/app/ui/auth/service/authentication.service';
import { MyErrorStateMatcher } from 'src/app/ui/auth/view/register/register.component';
import { NavigationLinksService } from 'src/app/ui/shared/service/navigation-links/navigation-links.service';
import { environment } from 'src/environments/environment.prod';
import { RandomTokenService } from 'src/app/ui/shared/service/random-token/random-token.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

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
  providers: [MessageService]
})
export class AddEmployeeFormComponent {
  @Input() close: () => void = () => {};

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
  tabs = ["Basic Information", "Employment Information", "Next Of Kin", "Guarantor Information", "Summary"]
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
  employments = ["Full-time", "Part-time", "Contract", "Freelance", "Intern"]
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
  
  constructor(private fb: FormBuilder,  private authenticationService: AuthenticationService,
    private messageService: MessageService,
    private router: Router, private token: RandomTokenService, private sanitizer: DomSanitizer) {  
}

  ngOnInit(): void {
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
      maritalStatus: ['', [Validators.required]],
      religion: ['', [Validators.required]],
      address: ['', [Validators.required]],
      createLogin: [''],
      profilePhoto: ['',[ Validators.required, this.imageFileValidator()]]
    });

    this.employeeForm = this.fb.group({
      title: ["", [Validators.required]],
      department: ["", [Validators.required]],
      level: ["", [Validators.required]],
      employmentType: ["", [Validators.required]],
      supervisor: ["", [Validators.required]],
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
      idCard: ['', [Validators.required, this.imageFileValidator()]],
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
  
      if (typeof file === 'string') {
        return null; 
      }
  
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  
      if (file && file instanceof File && !allowedTypes.includes(file.type)) {
        return { invalidFileType: true };
      }
  
      return null;
    };
  }
  nextTab() {

    if (this.currentTab < 5) {
      this.currentTab++;
    }
  }
  nextTabFromNok(){
    if(this.NOKForm.valid) {
    this.addNextOfKin()
    }
    this.nextTab()
  }
  nextTabFromGuarantor(){
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
      this.guarantorForm.patchValue({ [controlName]: file }); 
    }
  }
  onProfilePhotoChange(event: Event, controlName: string) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
    this.previewImageFile(input.files[0])

      const file = input.files;
      console.log(file[0])
      this.basicForm.patchValue({ [controlName]: file }); 
      
   
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

  getFormValidationErrors() {
    const errors: any[] = [];
    
    Object.keys(this.basicForm.controls).forEach(key => {
      const controlErrors = this.basicForm.get(key)?.errors;
      if (controlErrors) {
        Object.keys(controlErrors).forEach(errorKey => {
          errors.push(this.getErrorMessage(key, errorKey));
        });
      }
    });
  
    return errors;
  }
  
  // Define error messages for different form controls
  getErrorMessage(controlName: string, errorKey: string): string {
    const controlLabelMap: { [key: string]: string } = {
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      profilePhoto: 'Profile Photo',
      phone: 'Phone',
      address: 'Home Address',
      DOB: 'Date of Birth',
      gender: 'Gender',
      maritalStatus: 'Marital Status',
      religion: 'Religion'
    };
  
    const messages: { [key: string]: string } = {
      required: `${controlLabelMap[controlName]} is required.`,
      email: `Please enter a valid ${controlLabelMap[controlName]}.`,
      invalidFileType: `${controlLabelMap[controlName]} must be an image file (PNG, JPEG).`
    };
  
    return messages[errorKey] || `Invalid ${controlLabelMap[controlName]}.`;
  }
  
}
