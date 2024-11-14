import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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
  userRole: string | undefined;
  levelUser: string;
}

@Component({
  selector: 'app-targetform',
  templateUrl: './targetform.component.html',
  styleUrls: ['./targetform.component.scss'],
})
export class TargetformComponent implements OnInit {
  @Output() back = new EventEmitter<void>();
  goalForm!: FormGroup;
  metricString: string = '';
  metricsArray: Metric[] = [];
  user_id?: number | undefined;
  userRole: any = 'ROLE_USER';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private messageService: MessageService
  ) {
    this.initializeForm();
  }

  levelUser = [
    {
      option: 'Individual',
    },
  ];

  level = [
    {
      option: 'Individual',
    },
    { option: 'Organization' },
  ];

  evaluator = [
    {
      option: 'All',
    },
    { option: 'Supervisor' },
    { option: 'Peer' },
  ];

  ngOnInit(): void {
    this.userRole = sessionStorage.getItem('role');
    const savedData = localStorage.getItem('targetFormData');
    if (savedData) {
      this.goalForm.patchValue(JSON.parse(savedData));
    }
    this.user_id = sessionStorage.getItem('userid')
      ? Number(sessionStorage.getItem('userid'))
      : undefined;

    if (this.userRole !== 'ROLE_ADMIN') {
      const currentUserName = sessionStorage.getItem('userName') || '';
      this.goalForm.patchValue({ employeeName: currentUserName });
      this.goalForm.get('employeeName')?.disable();
    }
  }

  private initializeForm(): void {
    const baseControls = {
      goalName: ['', Validators.required],
      goalDescription: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      level: ['Individual', Validators.required],
      progressStatus: ['Pending', Validators.required],
      priority: ['Medium', Validators.required],
      assignedTo: ['', Validators.required],
    };

    const adminControls = {
      level: ['Individual', Validators.required],
      evaluator: ['', Validators.required],
    };

    this.goalForm =
      this.userRole === 'ROLE_ADMIN'
        ? this.fb.group({ ...baseControls, ...adminControls })
        : this.fb.group(baseControls);
  }

  onSubmit(): void {
    if (this.goalForm.valid && this.metricsArray.length > 0) {
      const formValue = this.goalForm.getRawValue();

      const newGoal: TargetGoal = {
        ...formValue,
        targetMetrics: this.metricsArray,
        user_id: this.user_id,
        isTarget: true,
        userRole: this.userRole,
        ...(this.userRole !== 'ROLE_ADMIN' && {
          priority: 'Medium',
          assignedTo: formValue.employeeName,
          progressStatus: 'Pending',
          level: ['Individual'],
          evaluator: ['Self'],
        }),
      };

      const storageKey =
        this.userRole === 'ROLE_ADMIN' ? 'targetGoals' : 'employeeGoals';
      const existingGoals: TargetGoal[] = JSON.parse(
        localStorage.getItem(storageKey) || '[]'
      );

      const isDuplicate = existingGoals.some(
        (goal) =>
          goal.goalName === newGoal.goalName && goal.user_id === newGoal.user_id
      );

      if (isDuplicate) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'A goal with this name already exists',
          life: 3000,
        });
        return;
      }

      existingGoals.push(newGoal);
      localStorage.setItem(storageKey, JSON.stringify(existingGoals));

      window.dispatchEvent(new Event('storage'));

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Target goal saved successfully',
        life: 3000,
      });

      this.resetForm();

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

  private resetForm(): void {
    const defaultValues = {
      progressStatus: 'Pending',
      ...(this.userRole === 'ROLE_ADMIN' && {
        priority: 'Medium',
      }),
    };

    this.goalForm.reset(defaultValues);
    this.metricsArray = [];

    if (this.userRole !== 'ROLE_ADMIN') {
      const currentUserName = sessionStorage.getItem('userName') || '';
      this.goalForm.patchValue({ employeeName: currentUserName });
    }
  }

  addMetrics(inputElement: HTMLInputElement) {
    if (this.metricString.trim()) {
      const newMetric: Metric = {
        name: this.metricString.trim(),
        completed: false,
      };
      this.metricsArray.push(newMetric);
      this.metricString = '';
      inputElement.value = '';
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
