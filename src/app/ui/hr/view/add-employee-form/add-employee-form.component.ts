import { Component, OnInit  } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AuthenticationService } from 'src/app/ui/auth/service/authentication.service';
import { MyErrorStateMatcher } from 'src/app/ui/auth/view/register/register.component';
import { NavigationLinksService } from 'src/app/ui/shared/service/navigation-links/navigation-links.service';
import { environment } from 'src/environments/environment.prod';

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


  basicForm!: FormGroup;      
  employeeForm!: FormGroup;
  guarantorForm!: FormGroup
  NOKForm!: FormGroup
  registerInfo!: FormGroup

  hide = true;
  hideConfirm = true;
  loading = false

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
    private router: Router,) {  
}

  ngOnInit(): void {
    const salaryStructure = localStorage.getItem("salaryStructure");
    if (salaryStructure) {
      this.salaryStructure = JSON.parse(salaryStructure);
    }

    this.basicForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      gender: ['', [Validators.required]],
      DOB: ['', [Validators.required]],
      maritalStatus: ['', [Validators.required]],
      religion: ['', [Validators.required]],
      address: ['', [Validators.required]],
      createLogin: ['', []]
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
      yearsKnown: ['', [Validators.required]],
      signature: ['', []],
      passportPhoto: ['', []],
      idCard: ['', []],
    });

    this.registerInfo = this.fb.group( {
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
      confirmPassword: ['', [Validators.required]],
    })
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
    if (this.employeeForm.valid) {
      console.log('Form Submitted', this.employeeForm.value);
    }
  }

  nextAndCreate() {
  this.loading = true;




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
          this.nextTab()
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
      console.log(this.guarantorList)

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
      const file = input.files;
      this.guarantorForm.patchValue({ [controlName]: file }); 
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
  
}
