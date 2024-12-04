import { Component, OnInit , Input } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl,  FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { RandomTokenService } from '../../../shared-component/service/random-token/random-token.service';
import { environment } from '../../../shared-component/service/environments/environment';
import { AuthenticationService } from '../../../shared-component/service/auth-service/authentication.service';
import { ActivatedRoute } from '@angular/router';
import { EmployeeService } from '../../../service/employee.service';

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
  formErrors: string[] = [];
  userInfoRegData: any[] = [];
  userRegData: any = { };
  employeeId:number = 0
  employeeData: any;
  maxDate: string ="";
  constructor(
    private fb: FormBuilder,  
    private authenticationService: AuthenticationService,
    private messageService: MessageService,
    private router: Router, 
    private employeeService: EmployeeService, 
    private route: ActivatedRoute
  ) {  }

  ngOnInit(): void {
    this.employeeId = this.route.snapshot.paramMap.get('id') as unknown as number;
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
      maritalStatus: ['', [Validators.required]],
      religion: ['', [Validators.required]],
      address: ['', [Validators.required]],
      profilePhoto: ['',[ Validators.required, this.imageFileValidator()]]
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
    this.fetchEmployeeData(this.employeeId);

  }

  fetchEmployeeData(employeeId: number): void {
    this.employeeService.getEmployeeById(employeeId).subscribe({
      next: (employee: any) => {
        this.basicForm.patchValue({
              firstName: employee.firstName,
              lastName: employee.lastName,
              email: employee.email,
            });
      }
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
    console.log(this.guarantorForm.value)

    
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
  this.addNewEmployee()
  }
addNewEmployee(){
  console.log(this.guarantorList)
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const formattedDate = currentDate.toISOString().split('T')[0];
  
  const employeesFromStorage = localStorage.getItem("employeesList");
  const employeesList = employeesFromStorage ? JSON.parse(employeesFromStorage) : [];

  
  const employeeIndex = employeesList.findIndex((emp: { id: number; }) => emp.id === this.employeeId);
  
  if (employeeIndex !== -1) {
    const existingEmployee = employeesList[employeeIndex];

    // Update employee details with form values
    existingEmployee.dob = this.basicForm.get('DOB')?.value,
    existingEmployee.phone= this.basicForm.get('phone')?.value,
    existingEmployee.maritalStatus= this.basicForm.get('maritalStatus')?.value,
    existingEmployee.religion= this.basicForm.get('religion')?.value,
    existingEmployee.address= this.basicForm.get('address')?.value,
    existingEmployee.gender= this.basicForm.get('gender')?.value,
    existingEmployee.bankName = this.employeeForm.get('bankName')?.value;
    existingEmployee.accountNumber = this.employeeForm.get('accountNumber')?.value;
    existingEmployee.nin = this.employeeForm.get('nin')?.value;
    existingEmployee.bvn = this.employeeForm.get('bvn')?.value;
    existingEmployee.nextOfKin = [...this.nextOfKinList];
    existingEmployee.guarantor = [...this.guarantorList];
    existingEmployee.profileImage = this.imageURL;
    // existingEmployee.leaveDetails = {
    //   assignedLeaves: 20,
    //   usedLeaves: 0,
    //   leavesRemaining: 20,
    //   leavesSpent: []
    // };
    // existingEmployee.attendance = {
    //   year: currentYear,
    //   daysPresent: 1,
    //   daysAbsent: 0,
    //   lateArrivals: 0,
    //   overtimeHours: 0,
    //   lastPresent: formattedDate,
    //   day2DayAttendance: [{
    //     date: formattedDate,
    //     clockIn: "9:00 AM",
    //     clockOut: "5:00 PM",
    //     comment: "First day in"
    //   }
    // ]
    // };
console.log(existingEmployee)
    employeesList[employeeIndex] = existingEmployee;
    console.log(employeesList)
    localStorage.setItem("employeesList", JSON.stringify(employeesList));

    this.loading = false;
    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Employee updated successfully!' });

    this.basicForm.reset();
    this.guarantorForm.reset();
    this.NOKForm.reset();
    this.employeeForm.reset();
    this.nextOfKinList = [];
    this.guarantorList = [];
    this.imageURL = '';
    this.fileDataUrl = '';
    this.currentTab = 1;
  } else {
    this.loading = false;
    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Employee not found!' });
  }
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
      const guarantor = { ...this.guarantorForm.value };
  
      // Convert files to base64 if they are present
      this.convertFileToBase64(guarantor.signature).then(base64 => guarantor.signature = base64);
      this.convertFileToBase64(guarantor.passportPhoto).then(base64 => guarantor.passportPhoto = base64);
      this.convertFileToBase64(guarantor.idCard).then(base64 => guarantor.idCard = base64);
  
      // Push to the guarantorList
      this.guarantorList.push(guarantor);
  
      // Reset the form
      this.guarantorForm.reset();
    }
  }
  convertFileToBase64(file: File | null): Promise<string | null> {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve(null);
      } else {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      }
    });
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
    if (confirm('Are you sure you want to remove this guarantor?')) {
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
    return typeof value === 'string' && value.startsWith('data:image/');
  }

  openFileInModal(fileUrl: string) {
    this.currentFile = fileUrl;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.fileDataUrl = '';
  }

  previewFile(fileUrl: string) {
    if (fileUrl) {
      this.fileDataUrl = fileUrl;
      this.showModal = true;
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
