import { Component, EventEmitter, Output } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import { MarketplaceService } from '../../service/marketplace.service';

@Component({
  selector: 'app-module',
  templateUrl: './module.component.html',
  styleUrl: './module.component.scss'
})
export class ModuleComponent {
  moduleForm!: FormGroup;
  @Output() reload = new EventEmitter<void>();

  constructor(private fb: FormBuilder, private marketplaceService: MarketplaceService) {}

  ngOnInit() {
    this.moduleForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      status: ['ACTIVE', Validators.required],

      subscriptionPlans: this.fb.array([]),
    });
  }

  /** ACCESSORS */
  get plans(): FormArray {
    return this.moduleForm.get('subscriptionPlans') as FormArray;
  }

  features(i: number): FormArray {
    return this.plans.at(i).get('features') as FormArray;
  }

  /** ADD PLAN */
  addPlan() {
    this.plans.push(
      this.fb.group({
        name: ['', Validators.required],
        description: [''],
        price: [0],
        duration: [0],
        yearlyPrice: [0, Validators.required],
        monthlyPrice: [0, Validators.required],
        isActive: [true],

        features: this.fb.array([]),

        limits: this.fb.group({
          users: [0],
          roles: [0],
          branches: [0],
          ecommerce: [false],
          customizedEcommerce: [false],
          loyaltyProgram: [false],
          report: [false],
        }),
      })
    );
  }

  /** REMOVE PLAN */
  removePlan(index: number) {
    this.plans.removeAt(index);
  }

  /** ADD FEATURE */
  addFeature(planIndex: number) {
    this.features(planIndex).push(this.fb.control(''));
  }

  /** REMOVE FEATURE */
  removeFeature(planIndex: number, featureIndex: number) {
    this.features(planIndex).removeAt(featureIndex);
  }

  buildModulePayload() {
  const raw = this.moduleForm.value;

  return {
    name: raw.name,
    description: raw.description,
    status: raw.status,
    subscriptionPlans: raw.subscriptionPlans.map((p: any) => ({
      name: p.name,
      description: p.description,
      price: p.price,
      duration: p.duration,
      yearlyPrice: p.yearlyPrice,
      monthlyPrice: p.monthlyPrice,
      features: p.features,
      isActive: p.isActive
    }))
  };
}


  /** SUBMIT */
  submit() {
    console.log("click")
  if (this.moduleForm.invalid) {
    console.log("module invalid")
    this.moduleForm.markAllAsTouched();
    return;
  }

  const modulePayload = this.buildModulePayload();

  this.marketplaceService.createModule(modulePayload).subscribe({
    next: (res: any) => {
      console.log("res"+ res)
      // res should contain module + plans with IDs
      this.createLimits(res.subscriptionPlans);
    },
    error: (err) => console.error(err)
  });
}

createLimits(createdPlans: any[]) {
  const formPlans = this.moduleForm.value.subscriptionPlans;

  createdPlans.forEach((createdPlan, index) => {
    const limits = formPlans[index].limits;

    const limitPayload = {
      id: 0,
      users: limits.users,
      roles: limits.roles,
      branches: limits.branches,
      ecommerce: limits.ecommerce,
      customizedEcommerce: limits.customizedEcommerce,
      loyaltyProgram: limits.loyaltyProgram,
      report: limits.report,
      planId: createdPlan.id
    };

    this.marketplaceService.createLimit(limitPayload).subscribe({
      error: err => console.error('Limit failed', err)
    });
  });
}


}
