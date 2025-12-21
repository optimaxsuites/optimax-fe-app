import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import { MarketplaceService } from '../../service/marketplace.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-module',
  templateUrl: './module.component.html',
  styleUrl: './module.component.scss'
})
export class ModuleComponent {
  moduleForm!: FormGroup;
  @Output() reload = new EventEmitter<void>();
   @Output() close = new EventEmitter<void>();
  @Input() moduleToEdit: any = null;
  loading = false;
  isEditing = false;

  constructor(private fb: FormBuilder, private marketplaceService: MarketplaceService) {
     this.initializeForm();
  }

  ngOnInit() {
    // this.moduleForm = this.fb.group({
    //   name: ['', Validators.required],
    //   description: ['', Validators.required],
    //   status: ['ACTIVE', Validators.required],

    //   subscriptionPlans: this.fb.array([]),
    // });

    
    if (this.moduleToEdit) {
      this.isEditing = true;
      this.populateForm(this.moduleToEdit);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['moduleToEdit'] && changes['moduleToEdit'].currentValue) {
      this.isEditing = true;
      this.populateForm(changes['moduleToEdit'].currentValue);
    }
  }

    initializeForm() {
    this.moduleForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      status: ['ACTIVE', Validators.required],
      subscriptionPlans: this.fb.array([]),
    });
  }

    populateForm(module: any) {
    this.moduleForm.patchValue({
      name: module.name,
      description: module.description,
      status: module.status,
    });

    // Clear existing plans
    while (this.plans.length) {
      this.plans.removeAt(0);
    }

    // Add plans from module
    module.subscriptionPlans.forEach((plan: any) => {
      this.plans.push(
        this.fb.group({
          id: [plan.id || 0],
          name: [plan.name, Validators.required],
          description: [plan.description],
          price: [plan.price],
          duration: [plan.duration],
          yearlyPrice: [plan.yearlyPrice, Validators.required],
          monthlyPrice: [plan.monthlyPrice, Validators.required],
          isActive: [plan.isActive],
          features: this.fb.array(plan.features || []),
          limits: this.fb.group({
            id: [plan.limit?.id || 0],
            users: [plan.limit?.subscriptionLimit?.[0]?.users || 0],
            roles: [plan.limit?.subscriptionLimit?.[0]?.roles || 0],
            branches: [plan.limit?.subscriptionLimit?.[0]?.branches || 0],
            ecommerce: [plan.limit?.subscriptionLimit?.[0]?.ecommerce || false],
            customizedEcommerce: [plan.limit?.subscriptionLimit?.[0]?.customizedEcommerce || false],
            loyaltyProgram: [plan.limit?.subscriptionLimit?.[0]?.loyaltyProgram || false],
            report: [plan.limit?.subscriptionLimit?.[0]?.report || false],
          }),
        })
      );
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

  if (this.isEditing && this.moduleToEdit?.id) {
    return {
      id: this.moduleToEdit.id,
      name: raw.name,
      description: raw.description,
      status: raw.status,
      subscriptionPlans: raw.subscriptionPlans.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        duration: p.duration,
        yearlyPrice: p.yearlyPrice,
        monthlyPrice: p.monthlyPrice,
        features: p.features,
        isActive: p.isActive,
        subscriptionModuleId: this.moduleToEdit.id
      }))
    };
  }

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
    if (this.moduleForm.invalid) {
      this.moduleForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const modulePayload = this.buildModulePayload();

    this.marketplaceService.createModule(modulePayload).subscribe({
      next: (res: any) => {
        this.createLimits(res.subscriptionPlans);
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  createLimits(createdPlans: any[]) {
    const formPlans = this.moduleForm.value.subscriptionPlans;
    const limitObservables: any[] = [];

    createdPlans.forEach((createdPlan, index) => {
      const limits = formPlans[index].limits;

      // Check if there are any meaningful limits set
      const hasLimits = Object.values(limits).some(value => 
        (typeof value === 'number' && value > 0) || (typeof value === 'boolean' && value === true)
      );

      if (hasLimits) {
        const limitPayload = {
          id: limits.id || 0,
          users: limits.users,
          roles: limits.roles,
          branches: limits.branches,
          ecommerce: limits.ecommerce,
          customizedEcommerce: limits.customizedEcommerce,
          loyaltyProgram: limits.loyaltyProgram,
          report: limits.report,
          planId: createdPlan.id
        };

        limitObservables.push(this.marketplaceService.createLimit(limitPayload));
      }
    });

    if (limitObservables.length > 0) {
      forkJoin(limitObservables).subscribe({
        next: () => {
          this.loading = false;
          this.reload.emit();
          this.close.emit();

        },
        error: (err) => {
          console.error('Limit creation failed', err);
          this.loading = false;
        }
      });
    } else {
      this.loading = false;
      this.reload.emit();
      this.close.emit();

    }
  }


}
