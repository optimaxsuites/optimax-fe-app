// import { Component, EventEmitter, Input, Output } from '@angular/core';
// import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
// import { ConfirmationService, MessageService } from 'primeng/api';
// import { PrStorageService } from '../../../service/pr-storage.service';
// import { PrApprovalWorkflowService } from '../../../service/pr-approval-workflow.service';
// import { PurchaseRequisitionLS } from '../../../domain/procurement.dto';

// type PRStatus = 'Draft' | 'Submitted' | 'UnderReview' | 'Approved' | 'Rejected' | 'Cancelled' | 'Converted';

// @Component({
//   selector: 'app-pr-create',
//   templateUrl: './pr-create.component.html',
//   styleUrls: ['./pr-create.component.scss'],
//   providers: [MessageService, ConfirmationService]
// })
// export class PrCreateComponent {
//    @Input() isCreate? : boolean;
//     @Input() isRfq? : boolean;
//     @Input() isQuote? : boolean;
//     @Output() submitForm = new EventEmitter<any>();
//     @Input() purchaseReqData: any = {};
//     @Input() isEdit!: boolean;
//     @Input() isView!: boolean;
//   status: PRStatus = 'Draft';

//   departments = [
//     { id: 'd1', name: 'Operations' },
//     { id: 'd2', name: 'Finance' },
//     { id: 'd3', name: 'IT' },
//   ];

//   costCenters = [
//     { id: 'c1', code: 'CC-OPS', name: 'Operations Cost Center' },
//     { id: 'c2', code: 'CC-FIN', name: 'Finance Cost Center' },
//   ];

//   budgetCodes = [
//     { id: 'b1', costCenterId: 'c1', code: 'BUD-OPS-001', name: 'Office Supplies' },
//     { id: 'b2', costCenterId: 'c1', code: 'BUD-OPS-002', name: 'Maintenance' },
//     { id: 'b3', costCenterId: 'c2', code: 'BUD-FIN-001', name: 'Subscriptions' },
//   ];

//   currencies = ['NGN', 'USD', 'EUR'];
//   uoms = ['pcs', 'box', 'kg', 'hours', 'ream'];

//   form: FormGroup;

//   constructor(
//     private fb: FormBuilder,
//     private store: PrStorageService,
//     private workflow: PrApprovalWorkflowService,
//     private messageService: MessageService
//   ) {
//     this.form = this.fb.group({
//       title: ['', [Validators.required, Validators.maxLength(120)]],
//       departmentId: ['', Validators.required],
//       costCenterId: ['', Validators.required],
//       budgetCodeId: ['', Validators.required],
//       requiredByDate: ['', Validators.required],
//       justification: ['', [Validators.required, Validators.maxLength(2000)]],
//       currency: ['NGN', Validators.required],
//       budgetCapAmount: [0, [Validators.required, Validators.min(1)]],
//       items: this.fb.array([this.createItem()]),
//     });
//   }

//   get items(): FormArray<FormGroup> {
//     return this.form.get('items') as FormArray<FormGroup>;
//   }

//   createItem(): FormGroup {
//     return this.fb.group({
//       name: ['', [Validators.required, Validators.maxLength(200)]],
//       description: [''],
//       quantity: [1, [Validators.required, Validators.min(1)]],
//       unitOfMeasure: ['pcs', Validators.required],
//       category: [''],
//     });
//     console.log(this.fb.group);
//   }

//   addItem() {
//     console.log("item:", this.createItem)
//     this.items.push(this.createItem());
//   }

//   removeItem(i: number) {
//     if (this.items.length === 1) return;
//     this.items.removeAt(i);
//   }

//   filteredBudgetCodes() {
//     const ccId = this.form.get('costCenterId')?.value;
//     return this.budgetCodes.filter(x => x.costCenterId === ccId);
//   }

//   itemCount(): number {
//     return this.items.length;
//   }

//   budgetCap(): number {
//     return Number(this.form.get('budgetCapAmount')?.value || 0);
//   }

//   currency(): string {
//     return this.form.get('currency')?.value || 'NGN';
//   }

//   requiredDateValid(): boolean {
//     const d = this.form.get('requiredByDate')?.value;
//     if (!d) return true;
//     const selected = new Date(d);
//     const today = new Date(); today.setHours(0,0,0,0);
//     return selected >= today;
//   }

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

//   // Mock userId for now (replace later with auth)
//   const requesterUserId = 'u-requester-1';

//   const prmNo = `PR-${Date.now()}`;

//   const pr: PurchaseRequisitionLS = {
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

//     status: 'Submitted',
//     createdAt: new Date().toISOString(),

//     items: formData.items,

//     auditTrail: [
//       { action: 'CREATED', by: requesterUserId, at: new Date().toISOString() }
//     ]
//   };

//   // 1) Save PR to storage
//   this.store.add(pr);

//   // 2) Start workflow (adds approval steps, moves to UnderReview, adds SUBMITTED audit)
//   this.workflow.submitForApproval(pr.id, requesterUserId);

//   this.messageService.add({
//     severity: 'success',
//     summary: 'PR Created',
//     detail: `PR ${prmNo} submitted for approval.`,
//     life: 4000
//   });

//   // 3) Notify parent table to refresh (without closing)
//   this.submitForm.emit(pr);

//   // 4) Clear the form
//   this.resetForm();
// }

// saveDraft() {
//   this.status = 'Draft';

//   const STORAGE_KEY = 'erp.purchaseRequisitions';
//   const formData = this.form.getRawValue();

//   const prPayload = {
//     id: crypto.randomUUID(),
//     prmNo: `PR-${Date.now()}`,
//     title: formData.title || '(Draft)',
//     department: formData.departmentId,
//     budgetCapAmount: formData.budgetCapAmount,
//     status: this.status,
//     createdAt: new Date().toISOString(),
//     items: formData.items
//   };

//   const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
//   existing.push(prPayload);
//   localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

//   this.messageService.add({
//     severity: 'info',
//     summary: 'Draft Saved',
//     detail: 'Purchase Requisition draft saved locally.',
//     life: 3000
//   });

//   this.submitForm.emit(prPayload)

//   this.resetForm()

// }

// resetForm() {
//   // Reset status
//   this.status = 'Draft';

//   // Reset the whole form (except defaults)
//   this.form.reset({
//     currency: 'NGN',
//     budgetCapAmount: 0
//   });

//   // Clear items FormArray completely
//   this.items.clear();

//   // Add one fresh empty item row
//   this.items.push(this.createItem());

//   // Optional: mark form as pristine
//   this.form.markAsPristine();
//   this.form.markAsUntouched();
// }

// addDepartmentMetadata(): void {
//   console.log('Open add department modal');
// }

// addCostCenterMetadata(): void {
//   console.log('Open add cost center modal');
// }

// addUomMetadata(index: number): void {
//   console.log('Open add UoM modal for row', index);
// }

// addCategoryMetadata(index: number): void {
//   console.log('Open add category modal for row', index);
// }
// }

// import { Component, EventEmitter, Input, Output } from '@angular/core';
// import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
// import { ConfirmationService, MessageService } from 'primeng/api';
// import { PrStorageService } from '../../../service/pr-storage.service';
// import { PrApprovalWorkflowService } from '../../../service/pr-approval-workflow.service';
// import { PurchaseRequisitionLS } from '../../../domain/procurement.dto';

// type PRStatus =
//   | 'Draft'
//   | 'Submitted'
//   | 'UnderReview'
//   | 'Approved'
//   | 'Rejected'
//   | 'Cancelled'
//   | 'Converted';

// @Component({
//   selector: 'app-pr-create',
//   templateUrl: './pr-create.component.html',
//   styleUrls: ['./pr-create.component.scss'],
//   providers: [MessageService, ConfirmationService]
// })
// export class PrCreateComponent {
//   @Input() isCreate?: boolean;
//   @Input() isRfq?: boolean;
//   @Input() isQuote?: boolean;
//   @Output() submitForm = new EventEmitter<any>();
//   @Input() purchaseReqData: any = {};
//   @Input() isEdit!: boolean;
//   @Input() isView!: boolean;

//   status: PRStatus = 'Draft';

//   departments = [
//     { id: 'd1', name: 'Operations' },
//     { id: 'd2', name: 'Finance' },
//     { id: 'd3', name: 'IT' }
//   ];

//   costCenters = [
//     { id: 'c1', code: 'CC-OPS', name: 'Operations Cost Center' },
//     { id: 'c2', code: 'CC-FIN', name: 'Finance Cost Center' }
//   ];

//   uoms = ['pcs', 'box', 'kg', 'hours', 'ream'];

//   form: FormGroup;

//   constructor(
//     private fb: FormBuilder,
//     private store: PrStorageService,
//     private workflow: PrApprovalWorkflowService,
//     private messageService: MessageService
//   ) {
//     this.form = this.fb.group({
//       title: ['', [Validators.required, Validators.maxLength(120)]],
//       departmentId: ['', Validators.required],
//       costCenterId: ['', Validators.required],
//       requiredByDate: ['', Validators.required],
//       justification: ['', [Validators.required, Validators.maxLength(2000)]],
//       items: this.fb.array([this.createItem()])
//     });
//   }

//   get items(): FormArray<FormGroup> {
//     return this.form.get('items') as FormArray<FormGroup>;
//   }

//   createItem(): FormGroup {
//     return this.fb.group({
//       name: ['', [Validators.required, Validators.maxLength(200)]],
//       description: [''],
//       quantity: [1, [Validators.required, Validators.min(1)]],
//       unitOfMeasure: ['pcs', Validators.required],
//       category: [''],
//       budgetCap: [0, [Validators.required, Validators.min(1)]]
//     });
//   }

//   addItem(): void {
//     this.items.push(this.createItem());
//   }

//   removeItem(i: number): void {
//     if (this.items.length === 1) return;
//     this.items.removeAt(i);
//   }

//   itemCount(): number {
//     return this.items.length;
//   }

//   requiredDateValid(): boolean {
//     const d = this.form.get('requiredByDate')?.value;
//     if (!d) return true;

//     const selected = new Date(d);
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     return selected >= today;
//   }

//   submit(): void {
//     this.status = 'Submitted';
//     this.form.markAllAsTouched();

//     if (this.form.invalid || !this.requiredDateValid()) {
//       this.messageService.add({
//         severity: 'error',
//         summary: 'Invalid Form',
//         detail: 'Please fix validation errors before submitting.',
//         life: 4000
//       });
//       return;
//     }

//     const formData = this.form.getRawValue();

//     const requesterUserId = 'u-requester-1';
//     const prmNo = `PR-${Date.now()}`;

//     const pr: PurchaseRequisitionLS = {
//       id: crypto.randomUUID(),
//       prmNo,
//       title: formData.title,
//       department: formData.departmentId,
//       costCenterId: formData.costCenterId,
//       requiredByDate: formData.requiredByDate,
//       justification: formData.justification,
//       status: 'Submitted',
//       createdAt: new Date().toISOString(),
//       items: formData.items,
//       auditTrail: [
//         {
//           action: 'CREATED',
//           by: requesterUserId,
//           at: new Date().toISOString()
//         }
//       ],
//       budgetCodeId: '',
//       currency: '',
//       budgetCapAmount: 0
//     };

//     this.store.add(pr);

//     this.workflow.submitForApproval(pr.id, requesterUserId);

//     this.messageService.add({
//       severity: 'success',
//       summary: 'PR Created',
//       detail: `PR ${prmNo} submitted for approval.`,
//       life: 4000
//     });

//     this.submitForm.emit(pr);

//     this.resetForm();
//   }

//   saveDraft(): void {
//     this.status = 'Draft';

//     const STORAGE_KEY = 'erp.purchaseRequisitions';
//     const formData = this.form.getRawValue();

//     const prPayload = {
//       id: crypto.randomUUID(),
//       prmNo: `PR-${Date.now()}`,
//       title: formData.title || '(Draft)',
//       department: formData.departmentId,
//       costCenterId: formData.costCenterId,
//       requiredByDate: formData.requiredByDate,
//       justification: formData.justification,
//       status: this.status,
//       createdAt: new Date().toISOString(),
//       items: formData.items
//     };

//     const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
//     existing.push(prPayload);
//     localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

//     this.messageService.add({
//       severity: 'info',
//       summary: 'Draft Saved',
//       detail: 'Purchase Requisition draft saved locally.',
//       life: 3000
//     });

//     this.submitForm.emit(prPayload);

//     this.resetForm();
//   }

//   resetForm(): void {
//     this.status = 'Draft';

//     this.form.reset({
//       title: '',
//       departmentId: '',
//       costCenterId: '',
//       requiredByDate: '',
//       justification: ''
//     });

//     this.items.clear();
//     this.items.push(this.createItem());

//     this.form.markAsPristine();
//     this.form.markAsUntouched();
//   }

//   addDepartmentMetadata(): void {
//     console.log('Open add department modal');
//   }

//   addCostCenterMetadata(): void {
//     console.log('Open add cost center modal');
//   }

//   addUomMetadata(index: number): void {
//     console.log('Open add UoM modal for row', index);
//   }

//   addCategoryMetadata(index: number): void {
//     console.log('Open add category modal for row', index);
//   }
// }

import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PrStorageService } from '../../../service/pr-storage.service';
import { PrApprovalWorkflowService } from '../../../service/pr-approval-workflow.service';
import { PurchaseRequisitionLS } from '../../../domain/procurement.dto';
import { VendorDto, VendorStatus } from '../../../domain/vendor.dto';
import { MailerServiceService } from '../../../service/mailer-service.service';

type PRStatus =
  | 'Draft'
  | 'Submitted'
  | 'UnderReview'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled'
  | 'Converted';

@Component({
  selector: 'app-pr-create',
  templateUrl: './pr-create.component.html',
  styleUrls: ['./pr-create.component.scss'],
  providers: [MessageService, ConfirmationService],
})
export class PrCreateComponent implements OnInit, OnChanges {
  @Input() isCreate?: boolean;
  @Input() isRfq?: boolean;
  @Input() isQuote?: boolean;
  @Output() submitForm = new EventEmitter<any>();
  @Output() back = new EventEmitter<void>();
  @Input() purchaseReqData: any = {};
  @Input() isEdit!: boolean;
  @Input() isView!: boolean;

  status: PRStatus = 'Draft';

  departments = [
    {
      id: 'd1',
      name: 'Administration & Office Services',
      categories: ['Office Supplies', 'Printing & Branding'],
    },
    {
      id: 'd2',
      name: 'Information Technology',
      categories: [
        'IT Equipment & Hardware',
        'Software & Licensing',
        'Telecommunications',
      ],
    },
    {
      id: 'd3',
      name: 'Finance & Professional Services',
      categories: ['Consulting Services', 'Training & Capacity Building'],
    },
    {
      id: 'd4',
      name: 'Engineering & Construction',
      categories: [
        'Construction & Civil Works',
        'Electrical & Engineering Services',
      ],
    },
    {
      id: 'd5',
      name: 'Facilities & Operations',
      categories: ['Facility Management', 'Security Services'],
    },
    {
      id: 'd6',
      name: 'Supply Chain & Logistics',
      categories: ['Logistics & Transportation'],
    },
    {
      id: 'd7',
      name: 'Healthcare & Medical',
      categories: ['Medical Supplies'],
    },
    {
      id: 'd8',
      name: 'Marketing & Communications',
      categories: ['Marketing & Advertising', 'Printing & Branding'],
    },
    {
      id: 'd9',
      name: 'Hospitality & Events',
      categories: ['Catering Services'],
    },
  ];

  costCenters = [
    { id: 'c1', code: 'CC-OPS', name: 'Operations Cost Center' },
    { id: 'c2', code: 'CC-FIN', name: 'Finance Cost Center' },
  ];

  uoms = ['pcs', 'box', 'kg', 'hours', 'ream'];

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private store: PrStorageService,
    private workflow: PrApprovalWorkflowService,
    private messageService: MessageService,
    private mailerService: MailerServiceService,
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(120)]],
      departmentId: ['', Validators.required],
      costCenterId: ['', Validators.required],
      requiredByDate: ['', Validators.required],
      justification: ['', [Validators.required, Validators.maxLength(2000)]],
      items: this.fb.array([this.createItem()]),
      currency: ['NGN', Validators.required],
      // budgetCodeId: ['', Validators.required],
      // budgetCapAmount: [0, Validators.required],
    });
  }

  formatDate(value: string): string {
    if (!value) return '---';

    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  ngOnInit(): void {
    this.loadFormData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['purchaseReqData'] || changes['isEdit'] || changes['isView']) {
      this.loadFormData();
    }
  }

  get items(): FormArray<FormGroup> {
    return this.form.get('items') as FormArray<FormGroup>;
  }

  createItem(item?: any): FormGroup {
    return this.fb.group({
      name: [
        item?.name ?? '',
        [Validators.required, Validators.maxLength(200)],
      ],
      description: [item?.description ?? ''],
      quantity: [item?.quantity ?? 1, [Validators.required, Validators.min(1)]],
      unitOfMeasure: [item?.unitOfMeasure ?? 'pcs', Validators.required],
      category: [item?.category ?? ''],
      budgetCap: [
        item?.budgetCap ?? 0,
        [Validators.required, Validators.min(1)],
      ],
    });
  }

  private loadFormData(): void {
    if (!this.purchaseReqData || (!this.isEdit && !this.isView)) {
      if (!this.isView) {
        this.form.enable({ emitEvent: false });
      }
      return;
    }

    this.status = this.purchaseReqData.status || 'Draft';

    this.form.patchValue(
      {
        title: this.purchaseReqData.title ?? '',
        departmentId: this.purchaseReqData.department ?? '',
        costCenterId: this.purchaseReqData.costCenterId ?? '',
        requiredByDate: this.purchaseReqData.requiredByDate ?? '',
        justification: this.purchaseReqData.justification ?? '',
      },
      { emitEvent: false },
    );

    this.items.clear();

    const incomingItems = Array.isArray(this.purchaseReqData.items)
      ? this.purchaseReqData.items
      : [];

    if (incomingItems.length > 0) {
      incomingItems.forEach((item: any) => {
        this.items.push(this.createItem(item));
      });
    } else {
      this.items.push(this.createItem());
    }

    if (this.isView) {
      this.form.disable({ emitEvent: false });
    } else {
      this.form.enable({ emitEvent: false });
    }
  }

  addItem(): void {
    if (this.isView) return;
    this.items.push(this.createItem());
  }

  removeItem(i: number): void {
    if (this.isView) return;
    if (this.items.length === 1) return;
    this.items.removeAt(i);
  }

  itemCount(): number {
    return this.items.length;
  }

  emitBack() {
    this.back.emit();
  }

  requiredDateValid(): boolean {
    const d = this.form.get('requiredByDate')?.value;
    if (!d) return true;

    const selected = new Date(d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return selected >= today;
  }

  submit(): void {
    if (this.isView) return;

    this.form.markAllAsTouched();

    if (this.form.invalid || !this.requiredDateValid()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid Form',
        detail: 'Please fix validation errors before submitting.',
        life: 4000,
      });
      return;
    }

    const formData = this.form.getRawValue();
    const requesterUserId = 'u-requester-1';

    if (this.isEdit && this.purchaseReqData?.id) {
      const existing = this.store.getAll();

      const updatedList = existing.map((pr: any) => {
        if (pr.id !== this.purchaseReqData.id) return pr;

        return {
          ...pr,
          title: formData.title,
          department: formData.departmentId,
          costCenterId: formData.costCenterId,
          requiredByDate: formData.requiredByDate,
          justification: formData.justification,
          items: formData.items,
          currency: formData.currency,
          budgetCodeId: formData.budgetCodeId,
          budgetCapAmount: formData.budgetCapAmount,
          updatedAt: new Date().toISOString(),
          status: 'UnderReview',
        };
      });

      localStorage.setItem(
        'erp.purchaseRequisitions',
        JSON.stringify(updatedList),
      );

      const updatedPr = updatedList.find(
        (x: any) => x.id === this.purchaseReqData.id,
      );

      this.messageService.add({
        severity: 'success',
        summary: 'PR Updated',
        detail: `PR ${this.purchaseReqData.prmNo} updated successfully.`,
        life: 4000,
      });

      this.submitForm.emit(updatedPr);
      this.resetForm();
      return;
    }

    this.status = 'Submitted';
    const prmNo = `PR-${Date.now()}`;

    const pr: PurchaseRequisitionLS = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      prmNo,
      title: formData.title,
      department: formData.departmentId,
      costCenterId: formData.costCenterId,
      budgetCodeId: formData.budgetCodeId,
      requiredByDate: formData.requiredByDate,
      justification: formData.justification,
      comment: '',
      currency: formData.currency,
      budgetCapAmount: formData.budgetCapAmount ?? 0,
      status: 'Submitted',
      createdAt: new Date().toISOString(),
      items: formData.items,
    };

    this.store.add(pr);
    this.workflow.submitForApproval(pr.id, requesterUserId);
    this.notifyEligibleVendorsForPr(pr);

    this.messageService.add({
      severity: 'success',
      summary: 'PR Created',
      detail: `PR ${prmNo} submitted for approval.`,
      life: 4000,
    });

    this.submitForm.emit(pr);
    this.resetForm();
  }

  saveDraft(): void {
    if (this.isView) return;

    this.status = 'Draft';
    const formData = this.form.getRawValue();
    const STORAGE_KEY = 'erp.purchaseRequisitions';

    if (this.isEdit && this.purchaseReqData?.id) {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

      const updated = existing.map((pr: any) => {
        if (pr.id !== this.purchaseReqData.id) return pr;

        // return {
        //   ...pr,
        //   title: formData.title || pr.title || '(Draft)',
        //   department: formData.departmentId,
        //   costCenterId: formData.costCenterId,
        //   requiredByDate: formData.requiredByDate,
        //   justification: formData.justification,
        //   status: 'Draft',
        //   items: formData.items,
        //   updatedAt: new Date().toISOString(),
        // };

        return {
          ...pr,
          title: formData.title || pr.title || '(Draft)',
          department: formData.departmentId,
          costCenterId: formData.costCenterId,
          budgetCodeId: formData.budgetCodeId,
          requiredByDate: formData.requiredByDate,
          justification: formData.justification,
          currency: formData.currency,
          budgetCapAmount: formData.budgetCapAmount ?? pr.budgetCapAmount ?? 0,
          status: 'Draft',
          items: formData.items,
          updatedAt: new Date().toISOString(),
        };
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      const updatedPr = updated.find(
        (x: any) => x.id === this.purchaseReqData.id,
      );

      this.messageService.add({
        severity: 'info',
        summary: 'Draft Updated',
        detail: 'Purchase Requisition draft updated successfully.',
        life: 3000,
      });

      this.submitForm.emit(updatedPr);
      this.resetForm();
      return;
    }

    // const prPayload = {
    //   id: crypto.randomUUID(),
    //   prmNo: `PR-${Date.now()}`,
    //   title: formData.title || '(Draft)',
    //   department: formData.departmentId,
    //   costCenterId: formData.costCenterId,
    //   requiredByDate: formData.requiredByDate,
    //   justification: formData.justification,
    //   status: this.status,
    //   createdAt: new Date().toISOString(),
    //   items: formData.items,
    // };

    const prPayload: PurchaseRequisitionLS = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      prmNo: `PR-${Date.now()}`,
      title: formData.title || '(Draft)',
      department: formData.departmentId,
      costCenterId: formData.costCenterId,
      budgetCodeId: formData.budgetCodeId,
      requiredByDate: formData.requiredByDate,
      justification: formData.justification,
      comment: '',
      currency: formData.currency,
      budgetCapAmount: formData.budgetCapAmount ?? 0,
      status: 'Draft',
      createdAt: new Date().toISOString(),
      items: formData.items,
    };

    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    existing.push(prPayload);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

    this.messageService.add({
      severity: 'info',
      summary: 'Draft Saved',
      detail: 'Purchase Requisition draft saved locally.',
      life: 3000,
    });

    this.submitForm.emit(prPayload);
    this.resetForm();
  }

  resetForm(): void {
    this.status = 'Draft';

    this.form.enable({ emitEvent: false });

    this.form.reset({
      title: '',
      departmentId: '',
      costCenterId: '',
      requiredByDate: '',
      justification: '',
    });

    this.items.clear();
    this.items.push(this.createItem());

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  addDepartmentMetadata(): void {
    console.log('Open add department modal');
  }

  addCostCenterMetadata(): void {
    console.log('Open add cost center modal');
  }

  addUomMetadata(index: number): void {
    console.log('Open add UoM modal for row', index);
  }

  addCategoryMetadata(index: number): void {
    console.log('Open add category modal for row', index);
  }

  notifyEligibleVendorsForPr(pr: any): void {
    const vendors: VendorDto[] = JSON.parse(
      localStorage.getItem('vendors') || '[]',
    );

    const eligibleVendors = vendors.filter((vendor) =>
      this.isVendorEligibleForPr(vendor, pr),
    );

    if (!eligibleVendors.length) {
      console.warn('No approved vendors matched this PR department.');
      return;
    }

    eligibleVendors.forEach((vendor) => {
      this.mailerService
        .sendPrInvitationEmail({
          vendorName: vendor.companyProfile.legalName,
          recieverEmail: vendor.companyProfile.companyEmail,
          prmNo: pr.prmNo,
          prTitle: pr.title,
          departmentName: this.getDepartmentName(pr.department),
          requiredByDate: this.formatDate(pr.requiredByDate),
        })
        .subscribe({
          next: () => {
            console.log(
              `Invitation sent to ${vendor.companyProfile.legalName}`,
            );
          },
          error: (err) => {
            console.error(
              `Failed to send invitation to ${vendor.companyProfile.legalName}`,
              err,
            );
          },
        });
    });
  }

  private getDepartmentById(departmentId: string): any | null {
    return (
      this.departments.find(
        (d) => String(d.id).trim() === String(departmentId).trim(),
      ) || null
    );
  }

  private getDepartmentName(departmentId: string): string {
    const department = this.getDepartmentById(departmentId);
    return department ? department.name : String(departmentId || '');
  }

  private getVendorCategoryNames(vendor: any): string[] {
    const categories = vendor?.category || vendor?.categories || [];

    return categories
      .map((cat: any) =>
        String(cat?.name || '')
          .trim()
          .toLowerCase(),
      )
      .filter((name: string) => !!name);
  }

  private isVendorEligibleForPr(vendor: VendorDto, pr: any): boolean {
    if (vendor.status !== VendorStatus.Approved) {
      return false;
    }

    const department = this.getDepartmentById(pr.department);

    if (!department) {
      return false;
    }

    const vendorCategoryNames = this.getVendorCategoryNames(vendor);

    if (!vendorCategoryNames.length) {
      return false;
    }

    const allowedCategories = (department.categories || []).map(
      (category: string) => category.trim().toLowerCase(),
    );

    return vendorCategoryNames.some((vendorCategory: string) =>
      allowedCategories.includes(vendorCategory),
    );
  }
}
