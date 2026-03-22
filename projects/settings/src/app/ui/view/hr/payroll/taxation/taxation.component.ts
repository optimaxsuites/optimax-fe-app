import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';

@Component({
  selector: 'app-taxation',
  templateUrl: './taxation.component.html',
  styleUrl: './taxation.component.scss'
})
export class TaxationComponent {
form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({

      // PAYE
      paye: this.fb.group({
        enabled: [true],
        annualization: [true],
        bonusTaxMethod: ['Standard'],
        reliefs: this.fb.group({
          enableCRA: [false],
          fixedAmount: [200000],
          percentOfIncome: [20],
          minimumRelief: [0],
          applyAnnually: [true]
        }),
        bands: this.fb.array([this.createBand()])
      }),

      // Pension
      pension: this.fb.group({
        enabled: [false],
        employeeRate: [8, Validators.required],
        employerRate: [10, Validators.required],
        base: ['Basic+Housing+Transport', Validators.required]
      }),

      // NHF
      nhf: this.fb.group({
        enabled: [false],
        employeeRate: [2.5, Validators.required],
        base: ['Basic Salary', Validators.required]
      }),

      // Health Insurance
      health: this.fb.group({
        enabled: [false],
        employeeRate: [0],
        employerRate: [0],
        type: ['Percentage']
      }),

      // Employer-only statutory
      employerContributions: this.fb.group({
        nsitfRate: [1],
        itfRate: [1]
      })

    });

    this.setupToggleListeners();
  }

  // PAYE bands

  get bands(): FormArray {
    return this.form.get('paye.bands') as FormArray;
  }

  createBand(): FormGroup {
    return this.fb.group({
      min: [0, Validators.required],
      max: [0, Validators.required],
      rate: [0, Validators.required]
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

    console.log('Statutory Settings:', this.form.value);
    // TODO: send to API
  }

  private setupToggleListeners() {
  // PAYE Toggle
  this.form.get('paye.enabled')?.valueChanges.subscribe(enabled => {
    if (!enabled) {
      this.form.patchValue({
        paye: {
          annualization: false,
          bonusTaxMethod: 'Standard',
          reliefs: { enableCRA: false }
        }
      }, { emitEvent: false });
      // To clear FormArray bands if needed:
      // while (this.bands.length !== 0) { this.bands.removeAt(0); }
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
