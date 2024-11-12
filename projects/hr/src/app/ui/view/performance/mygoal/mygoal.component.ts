import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

interface Metric {
  name: string;
  completed: boolean;
}

interface Goal {
  goalName: string;
  employeeName: string;
  goalDescription: string;
  startDate: string;
  endDate: string;
  priority: string;
  assignedTo: string;
  targetMetrics: Metric[];
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
  metricsArray: Metric[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private messageService: MessageService
  ) {
    this.goalForm = this.fb.group({
      goalName: ['', Validators.required],
      employeeName: ['', Validators.required],
      goalDescription: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      priority: ['Medium', Validators.required],
      assignedTo: ['', Validators.required],
      progressStatus: ['Pending', Validators.required],
    });
  }

  ngOnInit(): void {
    const savedData = localStorage.getItem('goalFormData');
    if (savedData) {
      this.goalForm.patchValue(JSON.parse(savedData));
    }
  }

  onSubmit(): void {
    if (this.goalForm.valid && this.metricsArray.length > 0) {
      const newGoal: Goal = {
        ...this.goalForm.value,
        targetMetrics: this.metricsArray,
      };

      // Save to employee goals
      const existingGoals: Goal[] = JSON.parse(
        localStorage.getItem('employeeGoals') || '[]'
      );
      existingGoals.push(newGoal);
      localStorage.setItem('employeeGoals', JSON.stringify(existingGoals));

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Goal saved successfully',
        life: 3000,
      });

      this.goalForm.reset({
        priority: 'Medium',
        progressStatus: 'Pending',
      });
      this.metricsArray = [];

      setTimeout(() => {
        this.router.navigate(['/goals']);
      }, 1000);
    } else {
      this.markFormGroupTouched(this.goalForm);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail:
          this.metricsArray.length === 0
            ? 'At least one metric is required'
            : 'Please fill in all required fields',
        life: 3000,
      });
    }
  }

  addMetrics(inputElement: HTMLInputElement) {
    if (this.metricString.trim()) {
      // Create a new metric object
      const newMetric: Metric = {
        name: this.metricString.trim(),
        completed: false, // Default to not completed
      };
      this.metricsArray.push(newMetric);
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

  OnDelete(metric: Metric) {
    const index = this.metricsArray.indexOf(metric);
    if (index > -1) {
      this.metricsArray.splice(index, 1);
    }
  }
}
