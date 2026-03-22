import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-general',
  templateUrl: './general.component.html',
  styleUrl: './general.component.scss'
})
export class GeneralComponent {
form!: FormGroup;

  frequencies = ['Monthly', 'Bi-Weekly', 'Weekly'];
  prorationRules = ['Calendar Days', 'Working Days'];
  roundingRules = ['None', 'Nearest Naira', 'Up', 'Down'];
  currencies = ['NGN', 'USD', 'EUR'];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      payrollFrequency: ['Monthly', Validators.required],
      payPeriodStartDay: [1, [Validators.required, Validators.min(1), Validators.max(31)]],
      paymentDay: [25, [Validators.required, Validators.min(1), Validators.max(31)]],
      cutoffDay: [20, [Validators.required, Validators.min(1), Validators.max(31)]],
      currency: ['NGN', Validators.required],
      fiscalYearStartMonth: [1, Validators.required],
      workingDaysPerPeriod: [22, Validators.required],
      hoursPerDay: [8, Validators.required],
      prorationRule: ['Calendar Days', Validators.required],
      overtimeEnabled: [true],
      roundingRule: ['Nearest Naira'],
      payslipPrefix: ['PSL']
    });
  }

  save(): void {
    if (this.form.invalid) return;

    const settings = this.form.value;
    console.log('General Payroll Settings:', settings);

    // TODO: send to API
  }
}
