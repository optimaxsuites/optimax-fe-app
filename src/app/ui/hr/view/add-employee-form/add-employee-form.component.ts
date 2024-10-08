import { Component, OnInit  } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { validate } from 'uuid';
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
  styleUrl: './add-employee-form.component.scss'
})
export class AddEmployeeFormComponent {

  basicForm!: FormGroup;      
  employeeForm!: FormGroup;
  guarantorForm!: FormGroup
  NOKForm!: FormGroup

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
  
  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    const salaryStructure = localStorage.getItem("salaryStructure");
    if (salaryStructure) {
      this.salaryStructure = JSON.parse(salaryStructure);
    }

    // Initialize form
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
    });

    this.employeeForm = this.fb.group({
      title: ["", Validators.required],
      department: ["", Validators.required],
      level: ["", Validators.required],
      employmentType: ["", Validators.required],
      supervisor: ["", Validators.required],
      bankName: ["", Validators.required],
      accountNumber: ["", Validators.required],

    });

    this.NOKForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      address: ['', [Validators.required]],
      relationship: ['', [Validators.required]],
      DOB: ['', [Validators.required]],
      emergencyContact: ['', [Validators.required]],

    });

    this.guarantorForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      address: ['', [Validators.required]],
      relationship: ['', [Validators.required]],
      DOB: ['', [Validators.required]],
      idNumber: ['', [Validators.required]],
      signature: ['', [Validators.required]],
      passportPhoto: ['', [Validators.required]],
      idCard: ['', [Validators.required]],
      yearsKnown: ['', [Validators.required]],
    });

  }

  nextTab() {
    if (this.currentTab < 5) {
      this.currentTab++;
    }
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
}
