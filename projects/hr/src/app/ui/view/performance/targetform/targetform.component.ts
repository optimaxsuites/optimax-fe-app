// targetform.component.ts
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

export interface Metric {
  name: string;
  completed: boolean;
}

interface TargetGoal {
  goalName: string;
  employeeName: string;
  goalDescription: string;
  startDate: string;
  endDate: string;
  priority: string;
  assignedTo: string;
  targetMetrics: Metric[];
  progressStatus: string;
  user_id?: number;
  isTarget?: boolean;
  level: string[];
  evaluator: string[];
}

@Component({
  selector: 'app-targetform',
  templateUrl: './targetform.component.html',
  styleUrls: ['./targetform.component.scss'],
})
export class TargetformComponent implements OnInit {
  @Output() back = new EventEmitter<void>();
  goalForm: FormGroup;
  metricString: string = '';
  metricsArray: Metric[] = [];
  user_id?: number | undefined;

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
      level: ['Individual', Validators.required],
      evaluator: ['All', Validators.required],
    });
  }

  level = [{ option: 'Individual' }, { option: 'Organization' }];

  evaluator = [
    { option: 'All' },
    { option: 'Supervisor' },
    { option: 'Peer' },
    { option: 'Self' },
  ];

  ngOnInit(): void {
    const savedData = localStorage.getItem('targetFormData');
    if (savedData) {
      this.goalForm.patchValue(JSON.parse(savedData));
    }

    this.user_id = sessionStorage.getItem('userid')
      ? Number(sessionStorage.getItem('userid'))
      : undefined;
  }
  onSubmit(): void {
    if (this.goalForm.valid && this.metricsArray.length > 0) {
      const newGoal: TargetGoal = {
        ...this.goalForm.value,
        targetMetrics: this.metricsArray,
        user_id: this.user_id,
        isTarget: true, // Mark as target goal
      };

      // Save to target goals
      const existingTargetGoals: TargetGoal[] = JSON.parse(
        localStorage.getItem('targetGoals') || '[]'
      );
      existingTargetGoals.push(newGoal);
      localStorage.setItem('targetGoals', JSON.stringify(existingTargetGoals));

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Target goal saved successfully',
        life: 3000,
      });

      this.goalForm.reset({
        priority: 'Medium',
        progressStatus: 'Pending',
      });
      this.metricsArray = [];

      setTimeout(() => {
        this.router.navigate(['/targets']);
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
