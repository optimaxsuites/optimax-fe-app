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
  loading = false;
  saving = false;
  saved = false;

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

  salaryInputMode: 'monthly' | 'yearly' = 'monthly';
  private recordId: number | null = null;

  constructor(private fb: FormBuilder, private payrollService: PayrollService) {}

  ngOnInit(): void {
    this.loading = true;
    this.initializeForm({});

    this.payrollService.getGeneralSettingsByID().subscribe({
      next: (res) => {
        const settings = res || {};
        this.recordId = settings.id ?? null;
        this.form.patchValue(settings);
        this.salaryInputMode = (settings.salaryInputMode as 'monthly' | 'yearly') || 'monthly';
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  initializeForm(initial: any) {
    this.form = this.fb.group({
      id: [initial.id || null],
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
    if (this.form.invalid) return;

    const payload = { ...this.form.value, salaryInputMode: this.salaryInputMode };
    this.saving = true;
    this.saved = false;

    const request$ = this.recordId
      ? this.payrollService.updateGeneralSettings(this.recordId, payload)
      : this.payrollService.postGeneralSettings(payload);

    request$.subscribe({
      next: (res) => {
        this.recordId = res?.id ?? this.recordId;
        this.saving = false;
        this.saved = true;
        setTimeout(() => this.saved = false, 3000);
      },
      error: () => {
        this.saving = false;
        alert('Failed to save settings. Please try again.');
      }
    });
  }
}
