import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

interface Goal {
  goalName: string;
  goalDescription: string;
  startDate: string;
  endDate: string;
  priority: string;
  assignedTo: string;
  targetMetrics: string;
  actualMetrics: string;
  progressStatus: string;
}

@Component({
  selector: 'app-mygoal',
  templateUrl: './mygoal.component.html',
  styleUrls: ['./mygoal.component.scss'],
  providers: [MessageService],
})
export class MygoalComponent implements OnInit {
  goalForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private messageService: MessageService
  ) {
    this.goalForm = this.fb.group({
      goalName: ['', Validators.required],
      goalDescription: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      priority: ['Medium', Validators.required],
      assignedTo: ['', Validators.required],
      targetMetrics: ['', Validators.required],
      actualMetrics: [''],
      progressStatus: ['Pending', Validators.required],
    });
  }

  ngOnInit(): void {
    // Load saved form data if any
    const savedData = localStorage.getItem('goalFormData');
    if (savedData) {
      this.goalForm.patchValue(JSON.parse(savedData));
    }
  }

  onSubmit(): void {
    if (this.goalForm.valid) {
      // Get existing goals from localStorage
      const existingGoals: Goal[] = JSON.parse(
        localStorage.getItem('goals') || '[]'
      );

      // Add new goal to the array
      existingGoals.push(this.goalForm.value);

      // Save updated goals array back to localStorage
      localStorage.setItem('goals', JSON.stringify(existingGoals));

      // Clear the form data from localStorage since it's now saved
      localStorage.removeItem('goalFormData');

      // Show success message
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Goal saved successfully',
        life: 3000,
      });

      // Reset form
      this.goalForm.reset({
        priority: 'Medium',
        progressStatus: 'Pending',
      });

      // Navigate back to goals list
      setTimeout(() => {
        this.router.navigate(['/goals']);
      }, 1000);
    } else {
      this.markFormGroupTouched(this.goalForm);

      // Show error message
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please fill in all required fields',
        life: 3000,
      });
    }
  }

  markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
    });
  }

  onCancel(): void {
    // Clear the form data from localStorage
    localStorage.removeItem('goalFormData');
    this.goalForm.reset();
    this.router.navigate(['/goals']);
  }
}
