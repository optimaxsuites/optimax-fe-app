import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-general',
  templateUrl: './general.component.html',
  styleUrls: ['./general.component.scss']
})
export class GeneralComponent implements OnInit {
  form!: FormGroup;

  frequencies = ['Monthly', 'Bi-Weekly', 'Weekly'];
  prorationRules = ['Calendar Days', 'Working Days'];
  roundingRules = ['None', 'Nearest Naira', 'Up', 'Down'];
  currencies = ['NGN', 'USD', 'EUR'];

  private localStorageKey = 'payrollGeneralSettings';

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    // Load saved settings if available
    const saved = localStorage.getItem(this.localStorageKey);
    const initial = saved ? JSON.parse(saved) : {};

    this.form = this.fb.group({
      payrollFrequency: [initial.payrollFrequency || 'Monthly', Validators.required],
      payPeriodStartDay: [initial.payPeriodStartDay || 1, [Validators.required, Validators.min(1), Validators.max(31)]],
      paymentDay: [initial.paymentDay || 25, [Validators.required, Validators.min(1), Validators.max(31)]],
      cutoffDay: [initial.cutoffDay || 20, [Validators.required, Validators.min(1), Validators.max(31)]],
      currency: [initial.currency || 'NGN', Validators.required],
      fiscalYearStartMonth: [initial.fiscalYearStartMonth || 1, Validators.required],
      workingDaysPerPeriod: [initial.workingDaysPerPeriod || 22, Validators.required],
      hoursPerDay: [initial.hoursPerDay || 8, Validators.required],
      prorationRule: [initial.prorationRule || 'Calendar Days', Validators.required],
      overtimeEnabled: [initial.overtimeEnabled ?? true],
      roundingRule: [initial.roundingRule || 'Nearest Naira'],
      payslipPrefix: [initial.payslipPrefix || 'PSL']
    });
  }

  save(): void {
    if (this.form.invalid) return;

    const settings = this.form.value;
    console.log('General Payroll Settings (saved locally):', settings);

    // Save to localStorage
    localStorage.setItem(this.localStorageKey, JSON.stringify(settings));

    // Optionally show a UI confirmation
    alert('Settings saved locally. Will be synced when backend is ready.');
  }
}