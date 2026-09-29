import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { SalesService } from '../../../../service/sales/sales.service';
import { PdfGenerationService } from '../../../../service/procurement/pdf-generation.service';
import { Customer, Product, DeliveryNote, DeliveryNoteItem, DeliveryNoteStatus, MerchantInfo } from '../../../../domain/sales/sales.dto';
import { formatApiDate } from '../../../../service/sales/date.util';
import { BackButtonComponent } from '../../../../shared-component/view/back-button/back-button.component';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-delivery-note-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    BackButtonComponent,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './delivery-note-form.component.html',
  styleUrls: ['./delivery-note-form.component.scss']
})
export class DeliveryNoteFormComponent implements OnInit, OnDestroy {
  @Input() editId?: string;
  @Input() orderId?: string;
  @Output() saved = new EventEmitter<DeliveryNote>();
  @Output() cancelled = new EventEmitter<void>();

  deliveryNoteForm: FormGroup;
  isEditMode = false;
  deliveryNoteId = '';
  isLoading = false;
  isSubmitting = false;
  isDownloading = false;
  currentStep: 1 | 2 = 1;

  customers: Customer[] = [];
  products: Product[] = [];
  merchantInfo: MerchantInfo | null = null;
  today = new Date();
  generatedNumber = '';
  sourceOrderId?: string | number;
  salesOrderId?: number;
  currentStatus: DeliveryNoteStatus = 'PENDING';

  // "From Order" provenance chip — set when this note was started from an order's
  // "Generate Delivery Note" action instead of created from scratch.
  fromOrder = false;

  showNewCustomerModal = false;
  quickCustomerForm: FormGroup;
  isSavingQuickCustomer = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private salesService: SalesService,
    private pdfGenerationService: PdfGenerationService,
    private messageService: MessageService
  ) {
    this.deliveryNoteForm = this.buildForm();
    this.quickCustomerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^[0-9+\-\s()]{7,20}$/)]],
      address: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  get items(): FormArray {
    return this.deliveryNoteForm.get('items') as FormArray;
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      customerId: ['', Validators.required],
      customerAddress: ['', Validators.required],
      carrier: [''],
      trackingNumber: [''],
      signature: [''],
      items: this.fb.array([])
    });
  }

  private createItemForm(item?: Partial<DeliveryNoteItem>): FormGroup {
    return this.fb.group({
      productName: [item?.productName || '', Validators.required],
      quantity: [item?.quantity ?? 1, [Validators.required, Validators.min(0)]],
      unit: [item?.unit || '']
    });
  }

  addItem(): void {
    this.items.push(this.createItemForm());
  }

  removeItem(index: number): void {
    if (this.items.length > 1) this.items.removeAt(index);
  }

  onProductSelect(index: number, productId: string): void {
    const product = this.products.find(p => String(p.id) === productId);
    if (!product) return;
    this.items.at(index).patchValue({
      productName: product.name,
      unit: product.measurementUnit?.name || product.measurementUnit?.code || ''
    });
  }

  ngOnInit(): void {
    this.deliveryNoteId = this.editId || this.route.snapshot.paramMap.get('id') || '';
    this.isEditMode = !!this.deliveryNoteId;
    this.sourceOrderId = this.orderId || this.route.snapshot.queryParamMap.get('orderId') || undefined;

    forkJoin({
      customers: this.salesService.getCustomers({ page: 0, size: 200 }),
      products: this.salesService.getProducts({ page: 0, size: 200 }),
      merchant: this.salesService.getMyMerchantInfo()
    }).pipe(takeUntil(this.destroy$)).subscribe(({ customers, products, merchant }) => {
      this.customers = customers.data;
      this.products = products.data;
      this.merchantInfo = merchant;

      if (this.isEditMode) {
        this.loadDeliveryNote();
      } else if (this.sourceOrderId) {
        this.loadFromOrder(this.sourceOrderId);
      } else {
        this.addItem();
        this.generatedNumber = `DN-${Date.now().toString().slice(-6)}`;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDeliveryNote(): void {
    this.isLoading = true;
    this.salesService.getDeliveryNoteById(this.deliveryNoteId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (note) => {
        this.isLoading = false;
        if (!note) return;
        this.populateForm(note);
      },
      error: () => { this.isLoading = false; }
    });
  }

  /** Pre-fills from an existing order (the "Generate Delivery Note" entry point from Sales &
   *  Transactions) — reuses an already-created note for this order if one exists instead of
   *  always starting blank, matching getOrCreateDeliveryNote()'s find-or-create pattern. */
  private loadFromOrder(orderId: string | number): void {
    this.isLoading = true;
    this.fromOrder = true;
    this.salesService.getOrCreateDeliveryNote(orderId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (note) => {
        this.isLoading = false;
        if (!note) { this.addItem(); return; }
        if (note.id) {
          this.isEditMode = true;
          this.deliveryNoteId = String(note.id);
        }
        this.populateForm(note);
      },
      error: () => { this.isLoading = false; this.addItem(); }
    });
  }

  private populateForm(note: DeliveryNote): void {
    this.generatedNumber = note.deliveryNumber;
    this.salesOrderId = note.salesOrderId;
    this.currentStatus = note.status || 'PENDING';
    this.deliveryNoteForm.patchValue({
      customerId: note.customerId ? String(note.customerId) : '',
      customerAddress: note.customerAddress || '',
      carrier: note.carrier || '',
      trackingNumber: note.trackingNumber || '',
      signature: note.signature || ''
    });

    this.items.clear();
    const noteItems = note.items && note.items.length > 0 ? note.items : [{ productName: '', quantity: 1, unit: '' } as DeliveryNoteItem];
    noteItems.forEach(item => this.items.push(this.createItemForm(item)));
  }

  onCustomerChange(): void {
    const customerId = this.deliveryNoteForm.get('customerId')?.value;
    const customer = this.customers.find(c => String(c.id) === String(customerId));
    if (customer && !this.deliveryNoteForm.get('customerAddress')?.value) {
      const addr = Array.isArray(customer.deliverAddress) ? customer.deliverAddress.join(', ') : (Array.isArray(customer.address) ? customer.address.join(', ') : '');
      if (addr) this.deliveryNoteForm.patchValue({ customerAddress: addr });
    }
  }

  get selectedCustomer(): Customer | null {
    const customerId = this.deliveryNoteForm.get('customerId')?.value;
    return this.customers.find(c => String(c.id) === String(customerId)) || null;
  }

  // ============================================================
  // QUICK-ADD CUSTOMER (freeform creation, same pattern as quote-form/invoice-form)
  // ============================================================

  openNewCustomerModal(): void {
    this.quickCustomerForm.reset();
    this.showNewCustomerModal = true;
  }

  closeNewCustomerModal(): void {
    this.showNewCustomerModal = false;
  }

  onQuickCustomerSubmit(): void {
    if (this.quickCustomerForm.invalid) {
      this.quickCustomerForm.markAllAsTouched();
      return;
    }
    this.isSavingQuickCustomer = true;
    const formValue = this.quickCustomerForm.value;
    this.salesService.createCustomer({
      name: formValue.name,
      email: formValue.email,
      phone: formValue.phone,
      address: [formValue.address],
      status: 'ACTIVE',
      createdAt: new Date(),
      totalSpent: 0,
      totalOrders: 0
    }).subscribe({
      next: (customer) => {
        this.isSavingQuickCustomer = false;
        this.customers = [...this.customers, customer];
        this.deliveryNoteForm.patchValue({ customerId: String(customer.id) });
        this.onCustomerChange();
        this.showNewCustomerModal = false;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Customer added.' });
      },
      error: (err) => {
        console.error('Error creating customer:', err);
        this.isSavingQuickCustomer = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to add customer. Please try again.' });
      }
    });
  }

  // ============================================================
  // STEP NAVIGATION
  // ============================================================

  goToStep(step: 1 | 2): void {
    if (step === 2 && this.deliveryNoteForm.invalid) {
      this.deliveryNoteForm.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Please fill in all required fields before continuing.' });
      return;
    }
    this.currentStep = step;
  }

  nextStep(): void {
    this.goToStep(2);
  }

  previousStep(): void {
    this.currentStep = 1;
  }

  // ============================================================
  // SAVE
  // ============================================================

  private buildPayload(): Partial<DeliveryNote> {
    const formValue = this.deliveryNoteForm.value;
    return {
      deliveryNumber: this.generatedNumber,
      status: this.currentStatus,
      salesOrderId: this.salesOrderId,
      customerId: formValue.customerId ? Number(formValue.customerId) : undefined,
      customerAddress: formValue.customerAddress,
      carrier: formValue.carrier || undefined,
      trackingNumber: formValue.trackingNumber || undefined,
      signature: formValue.signature || undefined,
      items: this.items.getRawValue(),
      ...(this.isEditMode ? {} : { createdBy: Number(sessionStorage.getItem('userid')) || undefined })
    } as Partial<DeliveryNote>;
  }

  onSubmit(): void {
    if (this.deliveryNoteForm.invalid) {
      this.deliveryNoteForm.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Please fill in all required fields.' });
      return;
    }

    this.isSubmitting = true;
    const payload = this.buildPayload();
    const request = this.isEditMode
      ? this.salesService.updateDeliveryNote(this.deliveryNoteId, payload)
      : this.salesService.createDeliveryNote(payload);

    request.subscribe({
      next: (result) => {
        this.isSubmitting = false;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: this.isEditMode ? 'Delivery note updated successfully!' : 'Delivery note created successfully!' });
        this.saved.emit(result);
        const uuid = this.route.snapshot.paramMap.get('uuid');
        const id = result?.id ?? this.deliveryNoteId;
        const path = uuid ? ['/admin/sales/delivery-notes', id, uuid] : ['/admin/sales/delivery-notes', id];
        this.router.navigate(path, { replaceUrl: true });
      },
      error: (err) => {
        console.error('Error saving delivery note:', err);
        this.isSubmitting = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save delivery note. Please try again.' });
      }
    });
  }

  // ============================================================
  // NAVIGATION
  // ============================================================

  goBack(): void {
    if (this.cancelled.observed) {
      this.cancelled.emit();
      return;
    }
    this.router.navigate(['/admin/sales/sales-hub']);
  }

  // ============================================================
  // PDF / PRINT
  // ============================================================

  downloadPDF(): void {
    const element = document.getElementById('delivery-note-form-preview');
    if (!element) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Unable to find preview to generate PDF.' });
      return;
    }
    this.isDownloading = true;
    setTimeout(() => {
      html2canvas(element, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`DeliveryNote-${this.generatedNumber || 'draft'}.pdf`);
        this.isDownloading = false;
      }).catch(err => {
        console.error('Error generating PDF:', err);
        this.isDownloading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to build PDF document.' });
      });
    }, 100);
  }

  printPreview(): void {
    window.print();
  }

  // ============================================================
  // UTILITY HELPERS
  // ============================================================

  formatDate(date: unknown): string {
    return formatApiDate(date);
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.deliveryNoteForm.get(fieldName);
    return !!control?.invalid && !!control?.touched;
  }
}
