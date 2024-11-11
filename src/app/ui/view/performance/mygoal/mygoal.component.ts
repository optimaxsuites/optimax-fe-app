import { Component, EventEmitter, OnInit, Output } from '@angular/core';
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
  targetMetrics: string[];
  progressStatus: string;
}

@Component({
  selector: 'app-mygoal',
  templateUrl: './mygoal.component.html',
  styleUrls: ['./mygoal.component.scss'],
  providers: [MessageService],
})
export class MygoalComponent implements OnInit {
  @Output() back = new EventEmitter<void>();
  goalForm: FormGroup;
  metricString: string = '';
  metricsArray: string[] = [];

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
      // Create a new goal object including metrics
      const newGoal: Goal = {
        ...this.goalForm.value,
        targetMetrics: this.metricsArray, // Include metrics
      };

      // Get existing goals from localStorage
      const existingGoals: Goal[] = JSON.parse(
        localStorage.getItem('goals') || '[]'
      );

      // Add new goal to the array
      existingGoals.push(newGoal);

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

      // Reset form and metrics
      this.goalForm.reset({
        priority: 'Medium',
        progressStatus: 'Pending',
      });
      this.metricsArray = []; // Clear metrics array

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

  addMetrics(inputElement: HTMLInputElement) {
    if (this.metricString.trim()) {
      this.metricsArray.push(this.metricString.trim());
      this.metricString = ''; // Clear the internal value
      inputElement.value = ''; // Clear the input field display
    }
  }

  onInputChange(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    this.metricString = inputElement.value;
  }

  goBack() {
    this.back.emit();
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

  OnDelete(metric: string) {
    let index = this.metricsArray.indexOf(metric);
    this.metricsArray.splice(index, 1);
  }
}
