import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { PayrollService } from '../../../../service/payroll.service';

@Component({
  selector: 'app-general',
  templateUrl: './general.component.html',
  styleUrls: ['./general.component.scss']
})
export class GeneralComponent implements OnInit {
  form!: FormGroup;
  loading: boolean = false;

  // frequencies = ['MONTHLY', 'Bi-Weekly', 'Weekly'];
  // prorationRules = ['Calendar Days', 'Working Days'];
  // roundingRules = ['None', 'Nearest Naira', 'Up', 'Down'];
  // currencies = ['NGN', 'USD', 'EUR'];
  frequencies = [
  { label: 'Monthly', value: 'MONTHLY' },
  { label: 'Bi-Weekly', value: 'BI_WEEKLY' },
  { label: 'Weekly', value: 'WEEKLY' }
];

prorationRules = [
  { label: 'Calendar Days', value: 'CALENDAR_DAYS' },
  { label: 'Working Days', value: 'WORKING_DAYS' }
];

roundingRules = [
  { label: 'None', value: 'NONE' },
  { label: 'Nearest Naira', value: 'NEAREST' },
  { label: 'Up', value: 'UP' },
  { label: 'Down', value: 'DOWN' }
];

currencies = [
  { label: 'NGN', value: 'NGN' },
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' }
];

  private localStorageKey = 'payrollGeneralSettings';

  constructor(private fb: FormBuilder, private payrollService: PayrollService) {}

  ngOnInit(): void {
   this.loading = true
  // 1️⃣ Create empty form immediately
  this.initializeForm({});

  // 2️⃣ Then load backend data and patch
  this.payrollService.getGeneralSettingsByID().subscribe({
    next: (res) => {
      console.log('Fetched general settings from backend:', res);
      const settings = res || {};
      this.form.patchValue(settings);
      this.loading = false;
    },
    error: (err) => {
      this.loading = false;
      console.error('Error fetching general settings:', err);
    }
  });
}

 initializeForm(initial: any) {
  this.form = this.fb.group({
    id: [initial.id || 0],
    payrollFrequency: [initial.payrollFrequency || 'MONTHLY', Validators.required],
    payPeriodStartDay: [initial.payPeriodStartDay || 1, [Validators.required, Validators.min(1), Validators.max(31)]],
    paymentDay: [initial.paymentDay || 25, [Validators.required, Validators.min(1), Validators.max(31)]],
    cutoffDay: [initial.cutoffDay || 20, [Validators.required, Validators.min(1), Validators.max(31)]],
    currency: [initial.currency || 'NGN', Validators.required],
    fiscalYearStartMonth: [initial.fiscalYearStartMonth || 1, Validators.required],
    workingDaysPerPeriod: [initial.workingDaysPerPeriod || 22, Validators.required],
    hoursPerDay: [initial.hoursPerDay || 8, Validators.required],
    prorationRule: [initial.prorationRule || 'CALENDAR_DAYS', Validators.required],
    overtimeEnabled: [initial.overtimeEnabled ?? true],
    roundingRule: [initial.roundingRule || 'NEAREST'],
    payslipPrefix: [initial.payslipPrefix || 'PSL']
  });
}

  save(): void {
    console.log(this.form.value)
    if (this.form.invalid) return;

    const settings = this.form.value;
    console.log('General Payroll Settings (saved locally):', settings);

    this.payrollService.postGeneralSettings(settings).subscribe({
      next: (res) => {
        console.log('General settings saved to backend:', res);
        alert('Settings saved successfully!');
      },
      error: (err) => {
        console.error('Error saving general settings to backend:', err);
        alert('Failed to save settings to backend. Please try again later.');
      }
    });

    // Save to localStorage
    localStorage.setItem(this.localStorageKey, JSON.stringify(settings));

    // Optionally show a UI confirmation
    // alert('Settings saved locally. Will be synced when backend is ready.');
  }
}