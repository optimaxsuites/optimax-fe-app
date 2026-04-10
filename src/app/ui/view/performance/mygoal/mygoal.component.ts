import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-mygoal',
  templateUrl: './mygoal.component.html',
  styleUrls: ['./mygoal.component.scss'],
  providers: [MessageService],
})
export class MygoalComponent implements OnInit {
  @Output() back = new EventEmitter<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit() {}

  goBack() {
    this.back.emit();
  }
}

// goalForm: FormGroup;
//   metricString: string = '';
//   metricsArray: Metric[] = [];
//   user_id?: number;

// interface Metric {
//   name: string;
//   completed: boolean;
// }

// interface TargetGoal {
//   goalName: string;
//   employeeName: string;
//   goalDescription: string;
//   startDate: string;
//   endDate: string;
//   priority: string;
//   assignedTo: string;
//   targetMetrics: Metric[];
//   progressStatus: string;
//   [key: string]: any;
//   isTarget?: boolean;
// }

// ngOnInit(): void {
//   const savedData = localStorage.getItem('goalFormData');
//   if (savedData) {
//     this.goalForm.patchValue(JSON.parse(savedData));
//   }

//   this.user_id = sessionStorage.getItem('userid')
//     ? Number(sessionStorage.getItem('userid'))
//     : undefined;
// }
// onSubmit(): void {
//   if (this.goalForm.valid && this.metricsArray.length > 0) {
//     const newGoal: TargetGoal = {
//       ...this.goalForm.value,
//       targetMetrics: this.metricsArray,
//       user_id: this.user_id,
//       isTarget: false, // Mark as regular goal
//     };

//     // Log the new goal to check the data
//     console.log('New Goal:', newGoal);

//     // Save to employee goals
//     const existingGoals: TargetGoal[] = JSON.parse(
//       localStorage.getItem('employeeGoals') || '[]'
//     );
//     console.log('Existing Goals:', existingGoals);

//     existingGoals.push(newGoal);
//     localStorage.setItem('employeeGoals', JSON.stringify(existingGoals));

//     // Log the updated localStorage
//     console.log(
//       'Updated Goals in LocalStorage:',
//       JSON.parse(localStorage.getItem('employeeGoals') || '[]')
//     );

//     this.messageService.add({
//       severity: 'success',
//       summary: 'Success',
//       detail: 'Goal saved successfully',
//       life: 3000,
//     });

//     this.goalForm.reset({
//       priority: 'Medium',
//       progressStatus: 'Pending',
//     });
//     this.metricsArray = [];

//     setTimeout(() => {
//       this.router.navigate(['/goals']);
//     }, 1000);
//   } else {
//     this.markFormGroupTouched(this.goalForm);
//     this.messageService.add({
//       severity: 'error',
//       summary: 'Error',
//       detail:
//         this.metricsArray.length === 0
//           ? 'At least one metric is required'
//           : 'Please fill in all required fields',
//       life: 3000,
//     });
//   }
// }

// addMetrics(inputElement: HTMLInputElement) {
//   if (this.metricString.trim()) {
//     // Create a new metric object
//     const newMetric: Metric = {
//       name: this.metricString.trim(),
//       completed: false, // Default to not completed
//     };
//     this.metricsArray.push(newMetric);
//     this.metricString = ''; // Clear the internal value
//     inputElement.value = ''; // Clear the input field display
//   }
// }

// onInputChange(event: Event) {
//   const inputElement = event.target as HTMLInputElement;
//   this.metricString = inputElement.value;
// }

// goBack() {
//   this.back.emit();
// }

// markFormGroupTouched(formGroup: FormGroup) {
//   Object.values(formGroup.controls).forEach((control) => {
//     control.markAsTouched();
//   });
// }

// onCancel(): void {
//   // Clear the form data from localStorage
//   localStorage.removeItem('goalFormData');
//   this.goalForm.reset();
//   this.router.navigate(['/goals']);
// }

// OnDelete(metric: Metric) {
//   const index = this.metricsArray.indexOf(metric);
//   if (index > -1) {
//     this.metricsArray.splice(index, 1);
//   }
// }
