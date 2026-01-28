import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';

type PRStatus = 'Draft' | 'Submitted' | 'UnderReview' | 'Approved' | 'Rejected' | 'Cancelled' | 'Converted';

@Component({
  selector: 'app-pr-create',
  templateUrl: './pr-create.component.html',
  styleUrls: ['./pr-create.component.scss'],
})
export class PrCreateComponent {
   @Input() isCreate? : boolean;
    @Input() isRfq? : boolean;
    @Input() isQuote? : boolean;
    @Output() submitFrom = new EventEmitter<any>();
    @Input() purchaseReqData: any = {};
    @Input() isEdit!: boolean; 
    @Input() isView!: boolean; 
  status: PRStatus = 'Draft';

  // Replace with real data from API later
  departments = [
    { id: 'd1', name: 'Operations' },
    { id: 'd2', name: 'Finance' },
    { id: 'd3', name: 'IT' },
  ];

  costCenters = [
    { id: 'c1', code: 'CC-OPS', name: 'Operations Cost Center' },
    { id: 'c2', code: 'CC-FIN', name: 'Finance Cost Center' },
  ];

  budgetCodes = [
    { id: 'b1', costCenterId: 'c1', code: 'BUD-OPS-001', name: 'Office Supplies' },
    { id: 'b2', costCenterId: 'c1', code: 'BUD-OPS-002', name: 'Maintenance' },
    { id: 'b3', costCenterId: 'c2', code: 'BUD-FIN-001', name: 'Subscriptions' },
  ];

  currencies = ['NGN', 'USD', 'EUR'];
  uoms = ['pcs', 'box', 'kg', 'hours', 'ream'];

  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(120)]],
      departmentId: ['', Validators.required],
      costCenterId: ['', Validators.required],
      budgetCodeId: ['', Validators.required],

      requiredByDate: ['', Validators.required],
      justification: ['', [Validators.required, Validators.maxLength(2000)]],

      currency: ['NGN', Validators.required],
      budgetCapAmount: [0, [Validators.required, Validators.min(1)]],

      items: this.fb.array([this.createItem()]),
    });
  }

  get items(): FormArray<FormGroup> {
    return this.form.get('items') as FormArray<FormGroup>;
  }

  createItem(): FormGroup {
    console.log(this.fb.group.name)
    return this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      description: [''],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitOfMeasure: ['pcs', Validators.required],
      category: [''], // optional (can become categoryId later)
    });
  }

  addItem() {
    console.log("item:", this.createItem)
    this.items.push(this.createItem());
  }

  removeItem(i: number) {
    if (this.items.length === 1) return;
    this.items.removeAt(i);
  }

  filteredBudgetCodes() {
    const ccId = this.form.get('costCenterId')?.value;
    return this.budgetCodes.filter(x => x.costCenterId === ccId);
  }

  // UI helpers
  itemCount(): number {
    return this.items.length;
  }

  budgetCap(): number {
    return Number(this.form.get('budgetCapAmount')?.value || 0);
  }

  currency(): string {
    return this.form.get('currency')?.value || 'NGN';
  }

  requiredDateValid(): boolean {
    const d = this.form.get('requiredByDate')?.value;
    if (!d) return true;
    const selected = new Date(d);
    const today = new Date(); today.setHours(0,0,0,0);
    return selected >= today;
  }

  saveDraft() {
    this.status = 'Draft';
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.requiredDateValid()) return;

    // frontend-only: later call API
    alert('Saved as Draft (frontend-only).');
  }

  submit() {
    this.status = 'Submitted';
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.requiredDateValid()) return;

    // frontend-only: later call API
    alert('Submitted for approval (frontend-only).');
  }
}
