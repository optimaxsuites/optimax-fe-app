import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import { PayrollService } from '../../../../service/payroll.service';
import { SalaryService } from '../../../../service/salary.service';

@Component({
  selector: 'app-taxation',
  templateUrl: './taxation.component.html',
  styleUrls: ['./taxation.component.scss']
})
export class TaxationComponent implements OnInit {
  form!: FormGroup;
  loading: boolean = false;
  allowanceTypes: any[] = [];

   bonusTaxMethods = [
    { label: 'Standard', value: 'STANDARD' },
    { label: 'Separate', value: 'SEPARATE' }
  ];

  private localStorageKey = 'payrollStatutorySettings';

  constructor(private fb: FormBuilder, private payrollService: PayrollService, private salaryService: SalaryService) {}

  ngOnInit(): void {
    // const saved = localStorage.getItem(this.localStorageKey);
    // const initial = saved ? JSON.parse(saved) : {};
    this.loading = true;

    this.initializeForm({});

    this.payrollService.getTaxConfigById().subscribe({
      next: res => {
        this.loading = false;
      const initial = this.mapBackendToForm(res);

      this.form.patchValue(initial);

      // For bands (FormArray)
      this.setBands(res.taxBands);
      },
      error: err => {   
        this.loading = false;
        console.error('Error fetching statutory settings:', err);
      }

    })
  
    this.salaryService.getAllAllowanceTypes().subscribe({
      next: res => this.allowanceTypes = res,
      error: err => console.error('Error fetching allowance types:', err)
    })

   

    this.setupToggleListeners();
  }

  initializeForm(initial: any) {
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
        base: [initial.pension?.base ?? [], Validators.required]
      }),

      // NHF
      nhf: this.fb.group({
        enabled: [initial.nhf?.enabled ?? false],
        employeeRate: [initial.nhf?.employeeRate ?? 2.5, Validators.required],
        base: [initial.nhf?.base ?? [], Validators.required]
      }),

      // Health Insurance
      health: this.fb.group({
        enabled: [initial.health?.enabled ?? false],
        employeeRate: [initial.health?.employeeRate ?? 0],
        employerRate: [initial.health?.employerRate ?? 0],
        type: [initial.health?.type ?? 'PERCENTAGE']
      }),

      // Employer-only statutory
      employerContributions: this.fb.group({
        nsitfRate: [initial.employerContributions?.nsitfRate ?? 1],
        itfRate: [initial.employerContributions?.itfRate ?? 1]
      })

    });
  }

  // PAYE bands
  get bands(): FormArray {
    return this.form.get('paye.bands') as FormArray;
  }

  setBands(bands: any[]): void {

  const arr = this.form.get('paye.bands') as FormArray;

  arr.clear();

  bands.forEach(b =>
    arr.push(this.createBand({
      id: b.id,
      min: b.minIncome,
      max: b.maxIncome,
      rate: b.ratePercent
    }))
  );
}

mapBackendToForm(data: any) {

  return {

    paye: {
      id: data.id,
      enabled: data.payeEnabled,
      annualization: data.annualizationEnabled,
      bonusTaxMethod: data.bonusTaxMethod,
      reliefs: {
        id: data.taxRelief?.id,
        enableCRA: data.taxRelief?.enableCra,
        fixedAmount: data.taxRelief?.fixedAmount,
        percentOfIncome: data.taxRelief?.percentOfIncome,
        minimumRelief: data.taxRelief?.minimumRelief,
        applyAnnually: data.taxRelief?.applyAnnually
      }
    },

    pension: {
      id: data.pensionConfig?.id,
      enabled: data.pensionConfig?.enabled,
      employeeRate: data.pensionConfig?.employeeRate,
      employerRate: data.pensionConfig?.employerRate,
      base: data.pensionConfig?.contributionBase
    },

    nhf: {
      id: data.nhfConfig?.id,
      enabled: data.nhfConfig?.enabled,
      employeeRate: data.nhfConfig?.employeeRate,
      base: data.nhfConfig?.contributionBase
    },

    health: {
      id: data.healthInsuranceConfig?.id,
      enabled: data.healthInsuranceConfig.enabled,
      employeeRate: data.healthInsuranceConfig?.employeeRate,
      employerRate: data.healthInsuranceConfig?.employerRate
    },

    employerContributions: {
      id: data.employerStatutoryConfig?.id,
      nsitfRate: data.employerStatutoryConfig?.nsitfRate,
      itfRate: data.employerStatutoryConfig?.itfRate
    }

  };


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

  // save(): void {
  //   if (this.form.invalid) return;

  //   const settings = this.form.value;
  //   console.log('Statutory Settings (saved locally):', settings);

  //   // Save to localStorage
  //   localStorage.setItem(this.localStorageKey, JSON.stringify(settings));

  //   alert('Statutory & Taxation settings saved locally.');
  // }

//   save(): void {
//   if (this.form.invalid) return;

//   const f = this.form.value;

//   // ---------- 1️⃣ PAYE CONFIG ----------
//   const payeConfig = {
//     enabled: f.paye.enabled,
//     annualization: f.paye.annualization,
//     bonusTaxMethod: f.paye.bonusTaxMethod?.toUpperCase()
//   };

//   this.payrollService.postTaxConfig(payeConfig).subscribe({
//     next: () => {

//       // ---------- 2️⃣ RELIEFS ----------
//       if (f.paye.reliefs.enableCRA) {
//         const reliefPayload = {
//           enableCra: f.paye.reliefs.enableCRA,
//           fixedAmount: f.paye.reliefs.fixedAmount,
//           percentOfIncome: f.paye.reliefs.percentOfIncome,
//           minimumRelief: f.paye.reliefs.minimumRelief,
//           applyAnnually: f.paye.reliefs.applyAnnually
//         };

//         this.payrollService.postTaxRelief(reliefPayload).subscribe();
//       }

//       // ---------- 3️⃣ TAX BANDS ----------
//       f.paye.bands.forEach((band: any) => {
//         const bandPayload = {
//           minIncome: band.min,
//           maxIncome: band.max,
//           ratePercent: band.rate
//         };

//         this.payrollService.postTaxBand(bandPayload).subscribe();
//       });

//     },
//     error: err => console.error('PAYE config save failed', err)
//   });

//   // ---------- 4️⃣ PENSION ----------
//   if (f.pension.enabled) {
//     this.payrollService.postPensionConfig({
//       enabled: f.pension.enabled,
//       employeeRate: f.pension.employeeRate,
//       employerRate: f.pension.employerRate,
//       contributionBase: f.pension.base
//     }).subscribe();
//   }

//   // ---------- 5️⃣ NHF ----------
//   if (f.nhf.enabled) {
//     this.payrollService.postNhfConfig({
//       enabled: f.nhf.enabled,
//       employeeRate: f.nhf.employeeRate,
//       contributionBase: f.nhf.base
//     }).subscribe();
//   }

//   // ---------- 6️⃣ HEALTH ----------
//   if (f.health.enabled) {
//     this.payrollService.postHealthInsuranceConfig({
//       employeeRate: f.health.employeeRate,
//       employerRate: f.health.employerRate,
//       type: f.health.type
//     }).subscribe();
//   }

//   // ---------- 7️⃣ EMPLOYER STATUTORY ----------
//   this.payrollService.postEmployerStatutory({
//     nsitfRate: f.employerContributions.nsitfRate,
//     itfRate: f.employerContributions.itfRate
//   }).subscribe();

//   alert('Statutory settings saved to backend.');
// }

save(): void {
  if (this.form.invalid) return;

  const f = this.form.value;

  const payload = {

    // ===== PAYE =====
    id: f.paye.id,
    payeEnabled: f.paye.enabled,
    annualizationEnabled: f.paye.annualization,
    bonusTaxMethod: f.paye.bonusTaxMethod?.toUpperCase(),

    taxRelief: {
      id: f.paye.reliefs.id,
      enableCra: f.paye.reliefs.enableCRA,
      fixedAmount: f.paye.reliefs.fixedAmount,
      percentOfIncome: f.paye.reliefs.percentOfIncome,
      minimumRelief: f.paye.reliefs.minimumRelief,
      applyAnnually: f.paye.reliefs.applyAnnually
    },

    taxBands: f.paye.bands.map((b: any) => ({
      id: b.id,
      minIncome: b.min,
      maxIncome: b.max,
      ratePercent: b.rate
    })),

    // ===== PENSION =====
    pensionConfig: {
      id: f.pension.id,
      enabled: f.pension.enabled,
      employeeRate: f.pension.employeeRate,
      employerRate: f.pension.employerRate,
      contributionBase: f.pension.base
    },

    // ===== NHF =====
    nhfConfig: {
      id: f.nhf.id,
      enabled: f.nhf.enabled,
      employeeRate: f.nhf.employeeRate,
      contributionBase: f.nhf.base
    },

    // ===== HEALTH =====
    healthInsuranceConfig: {
      id: f.health.id,
      enabled: f.health.enabled,
      employeeRate: f.health.employeeRate,
      employerRate: f.health.employerRate,
      contributionBase: f.health.base,
      type: f.health.type
    },

    // ===== EMPLOYER STATUTORY =====
    employerStatutoryConfig: {
      id: f.employerContributions.id,
      nsitfRate: f.employerContributions.nsitfRate,
      itfRate: f.employerContributions.itfRate
    }

  };

  this.payrollService.postTaxConfig(payload)
    .subscribe({
      next: () => alert('Statutory settings saved successfully'),
      error: err => console.error('Save failed', err)
    });
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