import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';

@Component({
  selector: 'app-module',
  templateUrl: './module.component.html',
  styleUrl: './module.component.scss'
})
export class ModuleComponent {
  moduleForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

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
        price: [0, Validators.required],
        duration: [0, Validators.required],
        yearlyPrice: [0],
        monthlyPrice: [0],
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

  /** SUBMIT */
  submit() {
    if (this.moduleForm.invalid) {
      this.moduleForm.markAllAsTouched();
      return;
    }

    const body = this.moduleForm.value;

    console.log('Final Body:', body);
    // TODO: this.moduleService.createModule(body).subscribe(...)
  }
}
