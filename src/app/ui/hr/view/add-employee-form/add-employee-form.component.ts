import { Component, OnInit  } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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
  employeeForm!: FormGroup;
  salaryStructure: any[] = [];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    // Get salary structure from local storage
    const salaryStructure = localStorage.getItem("salaryStructure");
    if (salaryStructure) {
      this.salaryStructure = JSON.parse(salaryStructure);
    }

    // Initialize form
    this.employeeForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      level: ['', Validators.required],
      position: ['', Validators.required],
      phone: [''],
      location: [''],
      hireDate: ['', Validators.required],
      gender: ['Male', Validators.required],  // Can be a dropdown as well
    });
  }

  onSubmit(): void {
    if (this.employeeForm.valid) {
      const newEmployee: Employee = this.employeeForm.value;
      console.log('New Employee', newEmployee);
      // Save or send to the backend
    } else {
      console.error('Form is invalid');
    }
  }
}
