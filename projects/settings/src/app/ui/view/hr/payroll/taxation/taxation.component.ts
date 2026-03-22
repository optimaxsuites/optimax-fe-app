import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';

@Component({
  selector: 'app-taxation',
  templateUrl: './taxation.component.html',
  styleUrls: ['./taxation.component.scss']
})
export class TaxationComponent implements OnInit {
  form!: FormGroup;

  private localStorageKey = 'payrollStatutorySettings';

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    const saved = localStorage.getItem(this.localStorageKey);
    const initial = saved ? JSON.parse(saved) : {};

    this.form = this.fb.group({

      // PAYE
      paye: this.fb.group({
        enabled: [initial.paye?.enabled ?? true],
        annualization: [initial.paye?.annualization ?? true],
        bonusTaxMethod: [initial.paye?.bonusTaxMethod ?? 'Standard'],
        reliefs: this.fb.group({
          enableCRA: [initial.paye?.reliefs?.enableCRA ?? false],
          fixedAmount: [initial.paye?.reliefs?.fixedAmount ?? 200000],
          percentOfIncome: [initial.paye?.reliefs?.percentOfIncome ?? 20],
          minimumRelief: [initial.paye?.reliefs?.minimumRelief ?? 0],
          applyAnnually: [initial.paye?.reliefs?.applyAnnually ?? true]
        }),
        bands: this.fb.array(
          (initial.paye?.bands && initial.paye.bands.length > 0) 
            ? initial.paye.bands.map((b: any) => this.createBand(b))
            : [this.createBand()]
        )
      }),

      // Pension
      pension: this.fb.group({
        enabled: [initial.pension?.enabled ?? false],
        employeeRate: [initial.pension?.employeeRate ?? 8, Validators.required],
        employerRate: [initial.pension?.employerRate ?? 10, Validators.required],
        base: [initial.pension?.base ?? 'Basic+Housing+Transport', Validators.required]
      }),

      // NHF
      nhf: this.fb.group({
        enabled: [initial.nhf?.enabled ?? false],
        employeeRate: [initial.nhf?.employeeRate ?? 2.5, Validators.required],
        base: [initial.nhf?.base ?? 'Basic Salary', Validators.required]
      }),

      // Health Insurance
      health: this.fb.group({
        enabled: [initial.health?.enabled ?? false],
        employeeRate: [initial.health?.employeeRate ?? 0],
        employerRate: [initial.health?.employerRate ?? 0],
        type: [initial.health?.type ?? 'Percentage']
      }),

      // Employer-only statutory
      employerContributions: this.fb.group({
        nsitfRate: [initial.employerContributions?.nsitfRate ?? 1],
        itfRate: [initial.employerContributions?.itfRate ?? 1]
      })

    });

    this.setupToggleListeners();
  }

  // PAYE bands
  get bands(): FormArray {
    return this.form.get('paye.bands') as FormArray;
  }

  createBand(data?: any): FormGroup {
    return this.fb.group({
      min: [data?.min ?? 0, Validators.required],
      max: [data?.max ?? 0, Validators.required],
      rate: [data?.rate ?? 0, Validators.required]
    });
  }

  addBand(): void {
    this.bands.push(this.createBand());
  }

  removeBand(index: number): void {
    this.bands.removeAt(index);
  }

  save(): void {
    if (this.form.invalid) return;

    const settings = this.form.value;
    console.log('Statutory Settings (saved locally):', settings);

    // Save to localStorage
    localStorage.setItem(this.localStorageKey, JSON.stringify(settings));

    alert('Statutory & Taxation settings saved locally.');
  }

  private setupToggleListeners() {
    // PAYE Toggle
    this.form.get('paye.enabled')?.valueChanges.subscribe(enabled => {
      if (!enabled) {
        this.form.get('paye')?.patchValue({
          annualization: false,
          bonusTaxMethod: 'Standard',
          reliefs: { enableCRA: false }
        }, { emitEvent: false });
      }
    });

    // CRA Reliefs Toggle
    this.form.get('paye.reliefs.enableCRA')?.valueChanges.subscribe(enabled => {
      if (!enabled) {
        this.form.get('paye.reliefs')?.patchValue({
          fixedAmount: null,
          percentOfIncome: null,
          minimumRelief: null,
          applyAnnually: false
        }, { emitEvent: false });
      }
    });

    // Pension Toggle
    this.form.get('pension.enabled')?.valueChanges.subscribe(enabled => {
      if (!enabled) {
        this.form.get('pension')?.patchValue({
          employeeRate: null,
          employerRate: null,
          base: null
        }, { emitEvent: false });
      }
    });

    // NHF Toggle
    this.form.get('nhf.enabled')?.valueChanges.subscribe(enabled => {
      if (!enabled) {
        this.form.get('nhf')?.patchValue({
          employeeRate: null,
          base: null
        }, { emitEvent: false });
      }
    });

    // Health Toggle
    this.form.get('health.enabled')?.valueChanges.subscribe(enabled => {
      if (!enabled) {
        this.form.get('health')?.patchValue({
          employeeRate: null,
          employerRate: null
        }, { emitEvent: false });
      }
    });
  }
}