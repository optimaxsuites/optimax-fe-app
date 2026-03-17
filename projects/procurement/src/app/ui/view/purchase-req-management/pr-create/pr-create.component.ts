import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PrStorageService } from '../../../service/pr-storage.service';
import { PrApprovalWorkflowService } from '../../../service/pr-approval-workflow.service';
import { PurchaseRequisitionLS } from '../../../domain/procurement.dto';


type PRStatus = 'Draft' | 'Submitted' | 'UnderReview' | 'Approved' | 'Rejected' | 'Cancelled' | 'Converted';

@Component({
  selector: 'app-pr-create',
  templateUrl: './pr-create.component.html',
  styleUrls: ['./pr-create.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class PrCreateComponent {
   @Input() isCreate? : boolean;
    @Input() isRfq? : boolean;
    @Input() isQuote? : boolean;
    @Output() submitForm = new EventEmitter<any>();
    @Input() purchaseReqData: any = {};
    @Input() isEdit!: boolean; 
    @Input() isView!: boolean; 
  status: PRStatus = 'Draft';


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

  constructor(
    private fb: FormBuilder,
    private store: PrStorageService,
    private workflow: PrApprovalWorkflowService,
    private messageService: MessageService
  ) {
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
    return this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      description: [''],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitOfMeasure: ['pcs', Validators.required],
      category: [''], 
    });
    console.log(this.fb.group);
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


  // submit() {
  //   this.status = 'Submitted';
  //   this.form.markAllAsTouched();
  //   if (this.form.invalid || !this.requiredDateValid()) return;
  //   alert('Submitted for approval.');
  // }

//   submit() {
//   this.status = 'Submitted';

//   // mark all fields so validation shows
//   this.form.markAllAsTouched();

//   if (this.form.invalid || !this.requiredDateValid()) {
//     console.warn('Form is invalid. Fix errors before submitting.');
//     return;
//   }

//   // ✅ full raw form value (includes items array)
//   const formData = this.form.getRawValue();

//   console.group('📦 Purchase Requisition Submit Payload');
//   console.log('PR Header:', {
//     title: formData.title,
//     departmentId: formData.departmentId,
//     costCenterId: formData.costCenterId,
//     budgetCodeId: formData.budgetCodeId,
//     requiredByDate: formData.requiredByDate,
//     justification: formData.justification,
//     currency: formData.currency,
//     budgetCapAmount: formData.budgetCapAmount,
//     status: this.status,
//   });

//   console.log('PR Items:', formData.items);

//   console.log('Full Payload:', formData);
//   console.groupEnd();

//   // later this is where API call will go
//   // this.procurementService.submitPR(formData).subscribe(...)
// }
// submit() {
//   this.status = 'Submitted';

//   this.form.markAllAsTouched();

//   if (this.form.invalid || !this.requiredDateValid()) {
//     this.messageService.add({
//       severity: 'error',
//       summary: 'Invalid Form',
//       detail: 'Please fix validation errors before submitting.',
//       life: 4000
//     });
//     return;
//   }

//   const formData = this.form.getRawValue();
//   const STORAGE_KEY = 'erp.purchaseRequisitions';

//   const prmNo = `PR-${Date.now()}`;

//   const prPayload = {
//     id: crypto.randomUUID(),
//     prmNo,
//     title: formData.title,
//     department: formData.departmentId,
//     costCenterId: formData.costCenterId,
//     budgetCodeId: formData.budgetCodeId,
//     requiredByDate: formData.requiredByDate,
//     justification: formData.justification,
//     currency: formData.currency,
//     budgetCapAmount: formData.budgetCapAmount,
//     status: this.status = 'Submitted',
//     createdAt: new Date().toISOString(),
//     items: formData.items
//   };

//   const existingRaw = localStorage.getItem(STORAGE_KEY);
//   const existingPRs = existingRaw ? JSON.parse(existingRaw) : [];

//   existingPRs.push(prPayload);
//   localStorage.setItem(STORAGE_KEY, JSON.stringify(existingPRs));

//   console.group('💾 Purchase Requisition Saved');
//   console.log(prPayload);
//   console.groupEnd();

//   // ✅ SUCCESS TOAST
//   this.messageService.add({
//     severity: 'success',
//     summary: 'Purchase Requisition Saved',
//     detail: `PR ${prmNo} has been saved successfully.`,
//     life: 4000
//   });

//   this.submitForm.emit(prPayload)

//   this.resetForm()

// }

submit() {
  this.status = 'Submitted';
  this.form.markAllAsTouched();

  if (this.form.invalid || !this.requiredDateValid()) {
    this.messageService.add({
      severity: 'error',
      summary: 'Invalid Form',
      detail: 'Please fix validation errors before submitting.',
      life: 4000
    });
    return;
  }

  const formData = this.form.getRawValue();

  // Mock userId for now (replace later with auth)
  const requesterUserId = 'u-requester-1';

  const prmNo = `PR-${Date.now()}`;

  const pr: PurchaseRequisitionLS = {
    id: crypto.randomUUID(),
    prmNo,
    title: formData.title,

    department: formData.departmentId,
    costCenterId: formData.costCenterId,
    budgetCodeId: formData.budgetCodeId,

    requiredByDate: formData.requiredByDate,
    justification: formData.justification,

    currency: formData.currency,
    budgetCapAmount: formData.budgetCapAmount,

    status: 'Submitted',
    createdAt: new Date().toISOString(),

    items: formData.items,

    auditTrail: [
      { action: 'CREATED', by: requesterUserId, at: new Date().toISOString() }
    ]
  };

  // 1) Save PR to storage
  this.store.add(pr);

  // 2) Start workflow (adds approval steps, moves to UnderReview, adds SUBMITTED audit)
  this.workflow.submitForApproval(pr.id, requesterUserId);

  this.messageService.add({
    severity: 'success',
    summary: 'PR Created',
    detail: `PR ${prmNo} submitted for approval.`,
    life: 4000
  });

  // 3) Notify parent table to refresh (without closing)
  this.submitForm.emit(pr);

  // 4) Clear the form
  this.resetForm();
}


saveDraft() {
  this.status = 'Draft';

  const STORAGE_KEY = 'erp.purchaseRequisitions';
  const formData = this.form.getRawValue();

  const prPayload = {
    id: crypto.randomUUID(),
    prmNo: `PR-${Date.now()}`,
    title: formData.title || '(Draft)',
    department: formData.departmentId,
    budgetCapAmount: formData.budgetCapAmount,
    status: this.status,
    createdAt: new Date().toISOString(),
    items: formData.items
  };

  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  existing.push(prPayload);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

  this.messageService.add({
    severity: 'info',
    summary: 'Draft Saved',
    detail: 'Purchase Requisition draft saved locally.',
    life: 3000
  });

  this.submitForm.emit(prPayload)

  this.resetForm()

}

resetForm() {
  // Reset status
  this.status = 'Draft';

  // Reset the whole form (except defaults)
  this.form.reset({
    currency: 'NGN',
    budgetCapAmount: 0
  });

  // Clear items FormArray completely
  this.items.clear();

  // Add one fresh empty item row
  this.items.push(this.createItem());

  // Optional: mark form as pristine
  this.form.markAsPristine();
  this.form.markAsUntouched();
}

}
