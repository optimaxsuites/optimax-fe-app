import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray, AbstractControl } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SalesService } from '../../../../service/sales/sales.service';
import { Customer, Product, Invoice, InvoiceStatus, InvoiceItem, Quote, CustomerBankDetails } from '../../../../domain/sales/sales.dto';
import { BackButtonComponent } from '../../../../shared-component/view/back-button/back-button.component';
import { TemplateTypesComponent, QuoteTemplate } from '../../template-types/template-types.component';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-invoice-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, BackButtonComponent, TemplateTypesComponent],
  templateUrl: './invoice-form.component.html',
  styleUrls: ['./invoice-form.component.scss']
})
export class InvoiceFormComponent implements OnInit, OnDestroy {
  @Input() editId?: string;
  @Input() fromQuoteId?: string;
  @Input() duplicateId?: string;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();


  invoiceForm: FormGroup;
  isSubmitting = false;
  isLoading = false;
  isEditMode = false;
  invoiceId: string = '';
  quoteId: string = '';
  generatedInvoiceNumber: string = '';

  // ============ WIZARD STATE ============
  currentStep: 1 | 2 | 3 | 4 = 1;
  totalSteps = 4;
  selectedTemplate: QuoteTemplate | null = null;
  selectedAction: 'pdf' | 'email' | 'both' = 'pdf';

  get invoiceDataForTemplate(): any {
    return {
      customerId: this.invoiceForm.get('customerId')?.value,
      customerName: this.invoiceForm.get('customerName')?.value,
      customerEmail: this.customers.find(c => c.id === this.invoiceForm.get('customerId')?.value)?.email,
      currency: this.invoiceForm.get('currency')?.value,
      items: this.items.getRawValue().map((item: any) => ({
        ...item,
        total: item.total || 0,
        taxAmount: item.taxAmount || 0
      })),
      subtotal: this.subtotal,
      taxAmount: this.totalTax || this.taxAmount,
      discountAmount: this.discountAmount,
      additionalCharges: this.additionalCharges,
      additionalChargeItems: this.additionalChargeItems,
      totalAmount: this.grandTotal,
      notes: this.invoiceForm.get('notes')?.value,
      terms: this.invoiceForm.get('terms')?.value,
      issueDate: this.invoiceForm.get('issueDate')?.value,
      dueDate: this.invoiceForm.get('dueDate')?.value,
      logoUrl: this.logoUrl,
      selectedCustomerBank: this.invoiceForm.get('selectedCustomerBankIndex')?.value >= 0 ?
        this.selectedCustomerBankAccounts[this.invoiceForm.get('selectedCustomerBankIndex')?.value] :
        (this.isEditMode ? (this.loadedInvoiceSelectedCustomerBank || null) : null)
    };
  }

  showTerms = false;
  showNotes = false;
  showAdvanced = false;
  showSignature = false;

  // ============ STEP 2: PAYMENT TERMS STATE ============
  selectedPresetTerm: 'Net 15' | 'Net 30' | 'Net 60' | 'Due on Receipt' | 'Custom' = 'Net 30';
  paymentMode: 'ONE-OFF' | 'MONTHLY' = 'ONE-OFF';
  paymentMethod: any = 'BANK_TRANSFER';
  paymentPeriodDays: number = 30;
  numberOfInstallments: number = 1;
  depositPercentage: number = 0;
  lateFeeRate: number = 0;
  customTermsText: string = 'Payment is due within 30 days from invoice issue date. Late payments may be subject to a 1.5% monthly interest fee.';

  presetTermsList: { id: 'Net 15' | 'Net 30' | 'Net 60' | 'Due on Receipt' | 'Custom'; name: string; days: number; desc: string; icon: string }[] = [
    { id: 'Net 15', name: 'Net 15', days: 15, desc: 'Payment due within 15 days of issue', icon: 'fa-calendar-day' },
    { id: 'Net 30', name: 'Net 30', days: 30, desc: 'Standard terms — payment due in 30 days', icon: 'fa-calendar-week' },
    { id: 'Net 60', name: 'Net 60', days: 60, desc: 'Extended terms — payment due in 60 days', icon: 'fa-calendar-alt' },
    { id: 'Due on Receipt', name: 'Due on Receipt', days: 0, desc: 'Immediate payment required upon receipt', icon: 'fa-receipt' },
    { id: 'Custom', name: 'Custom Terms', days: 30, desc: 'Configure custom period and conditions', icon: 'fa-sliders-h' }
  ];

  paymentMethodsList: { value: string; label: string; icon: string }[] = [
    { value: 'BANK_TRANSFER', label: 'Bank Transfer (EFT)', icon: 'fa-university' },
    { value: 'CARD', label: 'Credit / Debit Card', icon: 'fa-credit-card' },
    { value: 'CASH', label: 'Cash Payment', icon: 'fa-money-bill-wave' },
    { value: 'CHEQUE', label: 'Cheque', icon: 'fa-money-check' },
    { value: 'POS', label: 'Point of Sale (POS)', icon: 'fa-cash-register' },
    { value: 'MOBILE_MONEY', label: 'Mobile Money', icon: 'fa-mobile-alt' }
  ];
  showAttachments = false;
  showEmail = false;
  showAddress = false;
  showPhone = false;

  // Additional Option data bindings
  signatureText = '';
  contactPhone = '';
  contactEmail = '';
  contactAddress = '';
  attachmentFileName = '';
  logoFileName = '';
  logoUrl = '';

  // Custom modal variables
  showDiscountModal = false;
  showChargesModal = false;
  modalDiscountAmount = 0;
  modalDiscountType: 'PERCENTAGE' | 'FIXED' = 'FIXED';
  
  // Additional charges breakdown
  additionalChargeItems: { id?: number; label: string; amount: number }[] = [];
  modalChargesList: { id?: number; label: string; amount: number }[] = [];
  newChargeLabel = '';
  newChargeAmount: number | null = null;

  // Shipping Details data bindings
  showShippingDetails = false;
  shippingAddress = '';
  shippingMethod = '';
  shippingDate = '';

  // Discount & Additional charges
  additionalCharges = 0;

  // Data
  customers: Customer[] = [];
  products: Product[] = [];
  filteredProducts: Product[] = [];
  selectedCustomerBankAccounts: CustomerBankDetails[] = [];
  loadedInvoiceSelectedCustomerBank: CustomerBankDetails | null = null;
  quickCustomerForm!: FormGroup;

  // UI State
  showNewCustomerModal = false;
  showProductModal = false;
  searchProductTerm = '';
  currentItemIndex = 0;

  // Billed By (Invoice From) editable data
  showBilledByModal = false;
  billedBy = {
    name: '',
    email: '',
    phone: '',
    address: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
    routingNumber: ''
  };
  billedByDraft = { ...this.billedBy };

  get selectedCustomer(): Customer | undefined {
    const custId = this.invoiceForm.get('customerId')?.value;
    return this.customers.find(c => c.customerId === custId || String(c.id) === custId);
  }

  // Currency
  currencies = ['NGN', 'USD', 'EUR', 'GBP'];

  // Tax settings
  taxRate = 0;

  // Calculated totals - THESE ARE THE PROPERTIES
  subtotal: number = 0;
  totalTax: number = 0;      // ← THIS WAS MISSING
  taxAmount: number = 0;
  discountAmount: number = 0;
  grandTotal: number = 0;

  // Make router available to template
  router: Router;


  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private salesService: SalesService,
    router: Router
  ) {
    this.router = router;
    this.invoiceForm = this.fb.group({
      customerId: ['', Validators.required],
      customerName: [''],
      invoiceNumber: [{ value: 'Auto-generated', disabled: true }],
      issueDate: [this.formatDateForInput(new Date()), Validators.required],
      dueDate: ['', Validators.required],
      currency: ['NGN', Validators.required],
      notes: [''],
      terms: [''],
      paymentTerms: ['Net 30'],
      items: this.fb.array([]),
      taxRate: [0],
      discountType: ['PERCENTAGE'],
      discountValue: [0],
      isRecurring: [false],
      selectedCustomerBankIndex: [-1]
    });

    this.quickCustomerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^[0-9+\-\s()]{7,20}$/)]],  // phone is optional
      address: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(255)]],
      taxId: ['', [Validators.maxLength(50)]],
      savePermanently: [true],
      bankAccounts: this.fb.array([])
    });
  }



  ngOnInit(): void {

    this.invoiceId = this.editId || this.route.snapshot.paramMap.get('id') || '';
    this.quoteId = this.fromQuoteId || this.route.snapshot.queryParamMap.get('quoteId') || '';
    this.isEditMode = !!this.invoiceId;
    if (!this.duplicateId) {
      this.duplicateId = this.route.snapshot.queryParamMap.get('duplicateId') || '';
    }

    this.loadCustomers();
    this.loadProducts();
    this.setupFormListeners();

    if (this.isEditMode) {
      this.loadInvoice();
    } else if (this.quoteId) {
      this.loadQuoteForInvoice();
      this.currentStep = 3;
    } else if (this.duplicateId) {
      this.loadInvoiceForDuplicate();
    } else {
      this.addLineItem();
    }
  }

  ngOnDestroy(): void {

    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFormListeners(): void {
    // Auto-calculate due date based on payment terms
    this.invoiceForm.get('issueDate')?.valueChanges.subscribe(() => {
      this.updateDueDate();
    });

    this.invoiceForm.get('paymentTerms')?.valueChanges.subscribe(() => {
      this.updateDueDate();
    });

    // Calculate totals when items change
    this.invoiceForm.get('taxRate')?.valueChanges.subscribe(() => {
      this.calculateTotals();
    });

    this.invoiceForm.get('discountValue')?.valueChanges.subscribe(() => {
      this.calculateTotals();
    });

    this.invoiceForm.get('discountType')?.valueChanges.subscribe(() => {
      this.calculateTotals();
    });
  }

  private updateDueDate(): void {
    const issueDate = this.invoiceForm.get('issueDate')?.value;
    const paymentTerms = this.invoiceForm.get('paymentTerms')?.value;

    if (issueDate && paymentTerms) {
      const days = parseInt(paymentTerms.split(' ')[1]) || 30;
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + days);
      this.invoiceForm.patchValue({ dueDate: this.formatDateForInput(dueDate) }, { emitEvent: false });
    }
  }

  // Form Arrays
  get items(): FormArray {
    return this.invoiceForm.get('items') as FormArray;
  }

  addLineItem(): void {
    const itemForm = this.fb.group({
      productId: [''],
      productName: ['', Validators.required],
      description: [''],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      taxRate: [0],
      total: [{ value: 0, disabled: true }],
      taxAmount: [{ value: 0, disabled: true }]
    });

    this.items.push(itemForm);

    // Subscribe to changes for this item
    itemForm.get('quantity')?.valueChanges.subscribe(() => this.calculateItemTotal(itemForm));
    itemForm.get('unitPrice')?.valueChanges.subscribe(() => this.calculateItemTotal(itemForm));
    itemForm.get('taxRate')?.valueChanges.subscribe(() => this.calculateItemTotal(itemForm));
  }

  removeLineItem(index: number): void {
    this.items.removeAt(index);
    this.calculateTotals();
  }

  private calculateItemTotal(itemForm: AbstractControl): void {
    const quantity = itemForm.get('quantity')?.value || 0;
    const unitPrice = itemForm.get('unitPrice')?.value || 0;
    const taxRate = itemForm.get('taxRate')?.value || 0;

    const total = quantity * unitPrice;
    const taxAmount = total * (taxRate / 100);

    itemForm.patchValue({ total: total, taxAmount: taxAmount }, { emitEvent: false });
    this.calculateTotals();
  }

  get discountType(): 'PERCENTAGE' | 'FIXED' {
    return this.invoiceForm.get('discountType')?.value || 'PERCENTAGE';
  }
  set discountType(val: 'PERCENTAGE' | 'FIXED') {
    this.invoiceForm.patchValue({ discountType: val });
  }

  get discountValue(): number {
    return Number(this.invoiceForm.get('discountValue')?.value) || 0;
  }
  set discountValue(val: number) {
    this.invoiceForm.patchValue({ discountValue: val });
  }

  // ✅ SINGLE calculateTotals method - removed duplicate
  calculateTotals(): void {
    this.subtotal = 0;
    this.totalTax = 0;

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items.at(i);
      const total = item.get('total')?.value || 0;
      const taxAmount = item.get('taxAmount')?.value || 0;

      this.subtotal += total;
      this.totalTax += taxAmount;
    }

    // Calculate discount
    const discountType = this.invoiceForm.get('discountType')?.value;
    const discountValue = this.invoiceForm.get('discountValue')?.value || 0;

    if (discountType === 'PERCENTAGE') {
      this.discountAmount = this.subtotal * (discountValue / 100);
    } else {
      this.discountAmount = discountValue;
    }

    // Sum itemized additional charges if available
    if (this.additionalChargeItems && this.additionalChargeItems.length > 0) {
      this.additionalCharges = this.additionalChargeItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    }

    // Calculate tax on after discount
    const taxRate = this.invoiceForm.get('taxRate')?.value || 0;
    const afterDiscount = this.subtotal - this.discountAmount;
    this.taxAmount = afterDiscount * (taxRate / 100);

    const finalTax = this.totalTax || this.taxAmount;
    this.grandTotal = afterDiscount + finalTax + this.additionalCharges;
  }

  // Product selection
  onProductSelect(index: number, productId: string): void {
    const product = this.products.find(p => p.productId === productId || String(p.id) === productId);
    if (product) {
      const itemForm = this.items.at(index);
      itemForm.patchValue({
        productName: product.name,
        description: product.description,
        unitPrice: product.unitPrice || product.sellingPrice,
        taxRate: product.taxRate || 0
      });
      this.calculateItemTotal(itemForm);
    }
  }

  filterProducts(): void {
    if (this.searchProductTerm) {
      const term = this.searchProductTerm.toLowerCase();
      this.filteredProducts = this.products.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term)
      );
    } else {
      this.filteredProducts = this.products;
    }
  }

  selectProductFromModal(product: Product, index: number): void {
    const itemForm = this.items.at(index);
    itemForm.patchValue({
      productId: product.productId || String(product.id),
      productName: product.name,
      description: product.description,
      unitPrice: product.unitPrice || product.sellingPrice,
      taxRate: product.taxRate || 0
    });
    this.calculateItemTotal(itemForm);
    this.showProductModal = false;
    this.searchProductTerm = '';
  }

  // Customer selection
  onCustomerSelect(customerId: string): void {
    const customer = this.customers.find(c => c.customerId === customerId || String(c.id) === customerId);
    if (customer) {
      this.invoiceForm.patchValue({ customerName: customer.name });
      this.selectedCustomerBankAccounts = customer.bankAccounts || [];
      if (this.selectedCustomerBankAccounts.length > 0) {
        // If we loaded a bank, try to match it first
        if (this.loadedInvoiceSelectedCustomerBank) {
          const index = this.selectedCustomerBankAccounts.findIndex(
            b => b.accountNumber === this.loadedInvoiceSelectedCustomerBank?.accountNumber && b.bankName === this.loadedInvoiceSelectedCustomerBank?.bankName
          );
          if (index >= 0) {
            this.invoiceForm.patchValue({ selectedCustomerBankIndex: index });
          } else {
            this.invoiceForm.patchValue({ selectedCustomerBankIndex: 0 });
          }
        } else {
          this.invoiceForm.patchValue({ selectedCustomerBankIndex: 0 });
        }
      } else {
        this.invoiceForm.patchValue({ selectedCustomerBankIndex: -1 });
      }
    } else {
      this.selectedCustomerBankAccounts = [];
      this.invoiceForm.patchValue({ selectedCustomerBankIndex: -1 });
    }
  }

  // Load data
  private loadCustomers(): void {
    this.salesService.getCustomers({ page: 0, size: 100 }).subscribe({
      next: (response: any) => {
        this.customers = response.data;
        const customerId = this.route.snapshot.queryParamMap.get('customerId');
        if (customerId) {
          this.invoiceForm.patchValue({ customerId: customerId });
          this.onCustomerSelect(customerId);
        }
      },
      error: (error: any) => {
        console.error('Error loading customers:', error);
        const customerId = this.route.snapshot.queryParamMap.get('customerId');
        if (customerId) {
          this.invoiceForm.patchValue({ customerId: customerId });
          this.onCustomerSelect(customerId);
        }
      }
    });
  }

  private loadProducts(): void {
    this.salesService.getProducts({ page: 0, size: 100 }).subscribe({
      next: (response: any) => {
        this.products = response.data;
        this.filteredProducts = this.products;
      },
      error: (error: any) => {
        console.error('Error loading products:', error);
      }
    });
  }

  private loadInvoice(): void {
    this.isLoading = true;
    this.salesService.getInvoiceById(this.invoiceId).subscribe({
      next: (invoice: Invoice | null) => {
        if (invoice) {
          this.populateForm(invoice);
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading invoice:', error);
        this.isLoading = false;
      }
    });
  }

  // Copy an existing invoice's details into this (still-new) form so the user can
  // review/edit before it is saved and sent as a brand-new invoice.
  private loadInvoiceForDuplicate(): void {
    this.isLoading = true;
    this.salesService.getInvoiceById(this.duplicateId!).subscribe({
      next: (invoice: Invoice | null) => {
        if (invoice) {
          this.populateForm(invoice);

          // Don't inherit the source invoice's link back to a quote - this is a
          // fresh, independent invoice, so it shouldn't affect that quote's status.
          this.quoteId = '';

          // Refresh the dates rather than carrying over the original invoice's.
          const today = new Date();
          const defaultDueDate = new Date();
          defaultDueDate.setDate(defaultDueDate.getDate() + 30);
          this.invoiceForm.patchValue({
            issueDate: this.formatDateForInput(today),
            dueDate: this.formatDateForInput(defaultDueDate)
          });
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading invoice to duplicate:', error);
        this.isLoading = false;
      }
    });
  }

  private loadQuoteForInvoice(): void {
    this.isLoading = true;
    this.salesService.getQuoteById(this.quoteId).subscribe({
      next: (quote: Quote | null) => {
        if (quote) {
          this.populateFromQuote(quote);
          this.validateStep2();
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading quote:', error);
        this.isLoading = false;
      }
    });
  }

  private populateFromQuote(quote: Quote): void {
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 30);

    const custId = quote.customerId.customerId || String(quote.customerId.id);
    const custName = quote.customerName.name || String(quote.customerName);

    const addOpts = Array.isArray(quote.additionalOptions) ? quote.additionalOptions[0] : (quote.additionalOptions as any);

    this.invoiceForm.patchValue({
      customerId: custId,
      customerName: custName,
      currency: quote.currency,
      notes: addOpts?.notes || '',
      terms: addOpts?.terms || '',
      paymentTerms: addOpts?.terms || 'Net 30',
      dueDate: this.formatDateForInput(defaultDueDate)
    });

    this.logoUrl = quote.logoUrl?.[0] || '';
    this.logoFileName = quote.logoUrl?.[0] ? 'Saved Logo' : '';

    if (quote.merchantDetails) {
      this.billedBy = {
        name: quote.merchantDetails.name || quote.merchantDetails.companyName || '',
        email: quote.merchantDetails.email || '',
        phone: quote.merchantDetails.phone || '',
        address: Array.isArray(quote.merchantDetails.address) ? quote.merchantDetails.address.join(', ') : (quote.merchantDetails.address || ''),
        bankName: quote.merchantDetails.bankDetails?.bankName || '',
        accountName: quote.merchantDetails.bankDetails?.accountName || '',
        accountNumber: quote.merchantDetails.bankDetails?.accountNumber || '',
        routingNumber: quote.merchantDetails.website || ''
      };
      this.billedByDraft = { ...this.billedBy };
    }

    // Add items from quote
    quote.items.forEach((item: any) => {
      this.addLineItem();
      const index = this.items.length - 1;
      const itemForm = this.items.at(index);
      itemForm.patchValue({
        productId: item.productId,
        productName: item.productName,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: 0
      });
      this.calculateItemTotal(itemForm);
    });
  }

  private populateForm(invoice: Invoice): void {
    this.quoteId = invoice.quoteId || '';
    this.loadedInvoiceSelectedCustomerBank = invoice.selectedCustomerBank || null;
    
    const custId = invoice.customerId.customerId || String(invoice.customerId.id);
    const custName = invoice.customerName.name || String(invoice.customerName);

    this.invoiceForm.patchValue({
      customerId: custId,
      customerName: custName,
      issueDate: this.formatDateForInput(invoice.issueDate),
      dueDate: this.formatDateForInput(invoice.dueDate),
      currency: invoice.currency,
      notes: invoice.notes,
      paymentTerms: (invoice.paymentTerms as any)?.label || 'Net 30'
    });
    this.onCustomerSelect(custId);

    if (invoice.merchantDetails) {
      this.billedBy = {
        name: invoice.merchantDetails.name || invoice.merchantDetails.companyName || '',
        email: invoice.merchantDetails.email || '',
        phone: invoice.merchantDetails.phone || '',
        address: Array.isArray(invoice.merchantDetails.address) ? invoice.merchantDetails.address.join(', ') : (invoice.merchantDetails.address || ''),
        bankName: invoice.merchantDetails.bankDetails?.bankName || '',
        accountName: invoice.merchantDetails.bankDetails?.accountName || '',
        accountNumber: invoice.merchantDetails.bankDetails?.accountNumber || '',
        routingNumber: invoice.merchantDetails.website || ''
      };
      this.billedByDraft = { ...this.billedBy };
    }

    this.logoUrl = invoice.logoUrl || '';
    this.logoFileName = invoice.logoUrl ? 'Saved Logo' : '';

    if (Array.isArray(invoice.additionalCharges)) {
      const labels = invoice.additionalChargesLabel || [];
      this.additionalChargeItems = invoice.additionalCharges.map((amt, idx) => ({
        id: idx + 1,
        label: labels[idx] || `Charge #${idx + 1}`,
        amount: Number(amt) || 0
      }));
    } else if (typeof (invoice as any).additionalCharges === 'number' && (invoice as any).additionalCharges > 0) {
      this.additionalChargeItems = [{
        id: 1,
        label: 'Additional Charge',
        amount: Number((invoice as any).additionalCharges)
      }];
    }

    // Clear existing items
    while (this.items.length) {
      this.items.removeAt(0);
    }

    // Add items from invoice
    invoice.items.forEach(item => {
      this.addLineItem();
      const index = this.items.length - 1;
      const itemForm = this.items.at(index);
      
      const matchingProduct = this.products.find(
        p => p.name.toLowerCase() === item.productName.toLowerCase()
      );
      const pId = matchingProduct ? matchingProduct.id : '';

      itemForm.patchValue({
        productId: pId,
        productName: item.productName,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: 0
      });
      this.calculateItemTotal(itemForm);
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.attachmentFileName = file.name;
    }
  }

  // Submit
  onSubmit(): void {
    if (this.invoiceForm.invalid) {
      this.invoiceForm.markAllAsTouched();
      this.logInvalidControls(this.invoiceForm);
      alert('Please fill in all required fields. Check console for details.');
      return;
    }

    if (this.items.length === 0) {
      alert('Please add at least one item to the invoice');
      return;
    }

    this.isSubmitting = true;

    const formValue = this.invoiceForm.getRawValue();
    const items: InvoiceItem[] = [];

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items.at(i).getRawValue();
      items.push({
        id: Math.floor(Math.random() * 1000000),
        productId: item.productId,
        productName: item.productName,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        taxRate: item.taxRate || 0,
        amount: item.total,
        total: item.total
      } as any);
    }

    const selectedBankIdx = formValue.selectedCustomerBankIndex;
    let selectedCustomerBank: any = undefined;
    if (selectedBankIdx !== undefined && selectedBankIdx !== null && selectedBankIdx >= 0 && selectedBankIdx < this.selectedCustomerBankAccounts.length) {
      selectedCustomerBank = this.selectedCustomerBankAccounts[selectedBankIdx];
    } else if (this.isEditMode && this.loadedInvoiceSelectedCustomerBank) {
      selectedCustomerBank = this.loadedInvoiceSelectedCustomerBank;
    }

    const customerObj: Customer = this.customers.find(c => c.customerId === formValue.customerId || String(c.id) === formValue.customerId) || {
      id: 1,
      customerId: formValue.customerId,
      name: formValue.customerName,
      email: '',
      phone: '',
      address: [''],
      deliverAddress: [''],
      createdBy: 'System',
      createdAt: new Date(),
      totalSpent: 0,
      totalOrders: 0,
      status: 'ACTIVE'
    };

    const invoiceData: any = {
      customerId: customerObj,
      customerName: customerObj,
      currency: formValue.currency,
      issueDate: new Date(formValue.issueDate),
      dueDate: new Date(formValue.dueDate),
      notes: formValue.notes,
      shippingAddress: this.showShippingDetails ? this.shippingAddress : undefined,
      paymentTerms: [{
        id: 1,
        customerId: customerObj,
        customerName: customerObj,
        paymentPeriod: this.paymentPeriodDays || 30,
        paymentMethod: this.paymentMethod,
        paymentMode: this.paymentMode,
        amount: this.grandTotal,
        balanceDue: this.grandTotal,
        installmentNumber: this.numberOfInstallments || 1,
        completedInstallments: 0
      }],
      additionalOptions: [{
        signatureText: '',
        attachments: [],
        email: customerObj.email,
        address: Array.isArray(customerObj.address) ? customerObj.address[0] : customerObj.address,
        phone: customerObj.phone,
        notes: formValue.notes || '',
        terms: this.customTermsText || formValue.terms || ''
      }],
      items: items,
      subtotal: this.subtotal,
      taxAmount: this.taxAmount,
      discountAmount: this.discountAmount,
      additionalCharges: this.additionalChargeItems.map(item => Number(item.amount) || 0),
      additionalChargesLabel: this.additionalChargeItems.map(item => item.label || ''),
      totalAmount: this.grandTotal,
      amountPaid: 0,
      balanceDue: this.grandTotal,
      status: (this.currentStep === 4 ? 'SENT' : 'DRAFT') as InvoiceStatus,
      quoteId: this.quoteId || undefined,
      logoUrl: this.logoUrl,
      selectedCustomerBank: selectedCustomerBank
    };

    let request;
    if (this.isEditMode) {
      request = this.salesService.updateInvoice(this.invoiceId, invoiceData);
    } else {
      request = this.salesService.createInvoice(invoiceData);
    }

    request.subscribe({
      next: async (response: Invoice) => {
        this.isSubmitting = false;
        await this.handleDeliveryAction(response, this.selectedAction);

        if (response.status === 'SENT' && response.quoteId) {
          this.salesService.updateQuote(response.quoteId, { status: 'CONVERTED' }).subscribe({
            next: () => console.log(`Quote ${response.quoteId} marked as CONVERTED`),
            error: (err) => console.error('Error converting quote:', err)
          });
        }

        alert(this.isEditMode ? 'Invoice updated successfully!' : 'Invoice created successfully!');
        const uuid = this.route.snapshot.paramMap.get('uuid');
        if (uuid) {
          this.router.navigate(['/admin/sales/invoices', response.id, uuid]);
        } else {
          this.router.navigate(['/admin/sales/invoices', response.id]);
        }
      },
      error: (error: any) => {
        console.error('Error saving invoice:', error);
        this.isSubmitting = false;
        alert('Failed to save invoice. Please try again.');
      }
    });
  }

  cancel(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate(['/admin/sales/sales-hub', uuid]);
    } else {
      this.router.navigate(['/admin/sales/sales-hub']);
    }
  }

  navigateToInvoices(): void {
    this.router.navigate(['/admin/sales/sales-hub']);
  }

  // Helper methods
  private formatDateForInput(date: Date): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  get today(): string {
    return new Date().toISOString().split('T')[0];
  }

  formatCurrency(amount: number, customCurrency?: string): string {
    const currency = customCurrency || this.invoiceForm.get('currency')?.value || 'NGN';
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '₦';
    return `${symbol}${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.invoiceForm.get(fieldName);
    return field ? (field.invalid && (field.dirty || field.touched)) : false;
  }

  getTotalQuantity(): number {
    let total = 0;
    for (let i = 0; i < this.items.length; i++) {
      total += this.items.at(i).get('quantity')?.value || 0;
    }
    return total;
  }

  getCurrencyLabel(code: string): string {
    const labels: Record<string, string> = {
      'NGN': 'Nigerian Naira (NGN, ₦)',
      'USD': 'US Dollar (USD, $)',
      'EUR': 'Euro (EUR, €)',
      'GBP': 'British Pound (GBP, £)'
    };
    return labels[code] || code;
  }

  getTotalInWords(amount: number): string {
    if (amount === 0) return 'Zero Naira Only';

    const naira = Math.floor(amount);
    const kobo = Math.round((amount - naira) * 100);

    let result = '';
    if (naira > 0) {
      result += this.numberToWords(naira) + ' Naira';
    }
    if (kobo > 0) {
      result += (result ? ' ' : '') + this.numberToWords(kobo) + ' Kobo';
    }
    return result + ' Only';
  }

  private numberToWords(num: number): string {
    if (num === 0) return 'Zero';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' and ' + this.numberToWords(num % 100) : '');
    if (num < 1000000) return this.numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + this.numberToWords(num % 1000) : '');
    return this.numberToWords(Math.floor(num / 1000000)) + ' Million' + (num % 1000000 ? ' ' + this.numberToWords(num % 1000000) : '');
  }

  onLogoSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.logoFileName = file.name;
      const reader = new FileReader();
      reader.onload = () => {
        this.logoUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  triggerLogoUpload(): void {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (e: any) => this.onLogoSelected(e);
    fileInput.click();
  }

  addNewGroup(): void {}

  addShippingDetails(): void {
    this.showShippingDetails = !this.showShippingDetails;
  }

  addDiscounts(): void {
    this.modalDiscountAmount = this.discountValue;
    this.modalDiscountType = this.discountType;
    this.showDiscountModal = true;
  }

  saveDiscountModal(): void {
    this.discountType = this.modalDiscountType;
    this.discountValue = this.modalDiscountType === 'PERCENTAGE' ? Math.min(this.modalDiscountAmount, 100) : this.modalDiscountAmount;
    this.calculateTotals();
    this.showDiscountModal = false;
  }

  addAdditionalCharges(): void {
    this.modalChargesList = this.additionalChargeItems.map(item => ({ ...item }));
    this.newChargeLabel = '';
    this.newChargeAmount = null;
    this.showChargesModal = true;
  }

  addChargeItemToModal(): void {
    if (!this.newChargeLabel.trim()) {
      alert('Please enter a label for the additional charge (e.g. Shipping, Handling).');
      return;
    }
    if (this.newChargeAmount === null || this.newChargeAmount === undefined || this.newChargeAmount < 0) {
      alert('Please enter a valid charge amount.');
      return;
    }
    this.modalChargesList.push({
      id: Math.floor(Math.random() * 1000000),
      label: this.newChargeLabel.trim(),
      amount: Number(this.newChargeAmount)
    });
    this.newChargeLabel = '';
    this.newChargeAmount = null;
  }

  removeChargeItemFromModal(index: number): void {
    this.modalChargesList.splice(index, 1);
  }

  get modalTotalCharges(): number {
    return this.modalChargesList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }

  saveChargesModal(): void {
    this.additionalChargeItems = this.modalChargesList.map(item => ({ ...item }));
    this.calculateTotals();
    this.showChargesModal = false;
  }

  editBilledBy(): void {
    this.billedByDraft = { ...this.billedBy };
    this.showBilledByModal = true;
  }

  saveBilledBy(): void {
    if (!this.billedByDraft.name || this.billedByDraft.name.trim().length === 0) {
      alert('Name is required for the sender.');
      return;
    }
    this.billedBy = { ...this.billedByDraft };
    this.showBilledByModal = false;
  }

  cancelBilledByEdit(): void {
    this.showBilledByModal = false;
  }

  getBilledByInitials(): string {
    if (!this.billedBy.name) return '??';
    const parts = this.billedBy.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }

  addDescription(index: number): void {
    const itemForm = this.items.at(index);
    const currentDesc = itemForm.get('description')?.value || '';
    const newDesc = prompt('Enter item description:', currentDesc);
    if (newDesc !== null) {
      itemForm.patchValue({ description: newDesc });
    }
  }

  addImage(index: number): void {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        alert(`Image "${file.name}" uploaded successfully for item.`);
      }
    };
    fileInput.click();
  }

  addUnit(index: number): void {
    const newUnit = prompt('Enter measurement unit (e.g. Kg, Box, Pack):', 'Each');
    if (newUnit) {
      alert(`Measurement unit set to: ${newUnit}`);
    }
  }

  // ============ STEP 2 PAYMENT TERMS HELPERS ============
  selectPresetTerm(preset: 'Net 15' | 'Net 30' | 'Net 60' | 'Due on Receipt' | 'Custom'): void {
    this.selectedPresetTerm = preset;
    const issueDateVal = this.invoiceForm.get('issueDate')?.value || this.formatDateForInput(new Date());
    const baseDate = new Date(issueDateVal);

    let days = 30;
    switch (preset) {
      case 'Net 15': days = 15; break;
      case 'Net 30': days = 30; break;
      case 'Net 60': days = 60; break;
      case 'Due on Receipt': days = 0; break;
      case 'Custom': days = this.paymentPeriodDays || 30; break;
    }

    this.paymentPeriodDays = days;
    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + days);

    const defaultTermsMap: Record<string, string> = {
      'Net 15': 'Payment is due within 15 days of invoice date.',
      'Net 30': 'Payment is due within 30 days of invoice date. Thank you for your business!',
      'Net 60': 'Payment is due within 60 days of invoice date.',
      'Due on Receipt': 'Payment is due immediately upon receipt of this invoice.',
      'Custom': this.customTermsText || `Payment is due within ${days} days.`
    };

    this.customTermsText = defaultTermsMap[preset] || defaultTermsMap['Net 30'];

    const termLabel = preset === 'Custom' ? `Custom (${days} days)` : preset;
    this.invoiceForm.patchValue({
      paymentTerms: termLabel,
      dueDate: this.formatDateForInput(dueDate),
      terms: this.customTermsText
    });
  }

  onCustomDaysChange(days: number): void {
    this.paymentPeriodDays = days || 0;
    const issueDateVal = this.invoiceForm.get('issueDate')?.value || this.formatDateForInput(new Date());
    const baseDate = new Date(issueDateVal);
    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + (days || 0));

    this.invoiceForm.patchValue({
      paymentTerms: `Custom (${days} days)`,
      dueDate: this.formatDateForInput(dueDate)
    });
  }

  get installmentSchedule(): { number: number; amount: number; dueDate: string }[] {
    if (this.paymentMode === 'ONE-OFF' || this.numberOfInstallments <= 1) return [];
    const total = this.grandTotal || 0;
    const count = this.numberOfInstallments || 1;
    const perInstallment = total / count;
    const issueDateVal = this.invoiceForm.get('issueDate')?.value || this.formatDateForInput(new Date());

    const schedule = [];
    for (let i = 1; i <= count; i++) {
      const dt = new Date(issueDateVal);
      dt.setMonth(dt.getMonth() + (i - 1));
      schedule.push({
        number: i,
        amount: perInstallment,
        dueDate: this.formatDateForInput(dt)
      });
    }
    return schedule;
  }

  get calculatedDepositAmount(): number {
    return (this.grandTotal || 0) * ((this.depositPercentage || 0) / 100);
  }

  // ============ WIZARD NAVIGATION ============
  goToStep(step: 1 | 2 | 3 | 4): void {
    if (step > this.currentStep) {
      if (this.currentStep === 1 && !this.validateStep1()) return;
      if (this.currentStep === 2 && !this.validateStep2()) return;
      if (this.currentStep === 3 && !this.validateStep3()) return;
    }
    this.currentStep = step;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  nextStep(): void {
    if (this.currentStep === 1) {
      if (this.validateStep1()) {
        this.currentStep = 2;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (this.currentStep === 2) {
      if (this.validateStep2()) {
        this.currentStep = 3;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (this.currentStep === 3) {
      if (this.validateStep3()) {
        this.currentStep = 4;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep = (this.currentStep - 1) as 1 | 2 | 3 | 4;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  proceedToTemplateSelection(): void {
    this.nextStep();
  }

  onHeaderActionClick(): void {
    if (this.currentStep === 1) {
      this.nextStep();
    } else if (this.currentStep === 2) {
      this.nextStep();
    } else if (this.currentStep === 3) {
      this.nextStep();
    } else if (this.currentStep === 4) {
      this.onSubmit();
    }
  }

  // ============ STEP VALIDATION ============
  private validateStep1(): boolean {
    console.log('Validating Step 1 (Invoice Details & Line Items)...');

    if (!this.invoiceForm.get('customerId')?.value) {
      alert('Please select a customer');
      return false;
    }

    if (!this.invoiceForm.get('issueDate')?.value) {
      alert('Please select an invoice date');
      return false;
    }

    if (!this.invoiceForm.get('dueDate')?.value) {
      alert('Please select a due date');
      return false;
    }

    if (this.items.length === 0) {
      alert('Please add at least one item to the invoice');
      return false;
    }

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items.at(i);

      const qty = item.get('quantity')?.value;
      if (qty === null || qty === undefined || qty < 1) {
        alert(`Item ${i + 1}: Please enter a valid quantity (min 1)`);
        return false;
      }

      const price = item.get('unitPrice')?.value;
      if (price === null || price === undefined || price < 0) {
        alert(`Item ${i + 1}: Please enter a valid price (min 0)`);
        return false;
      }
    }

    return true;
  }

  private validateStep2(): boolean {
    if (this.paymentMode === 'MONTHLY' && (!this.numberOfInstallments || this.numberOfInstallments < 1)) {
      alert('Please enter a valid number of installments (min 1)');
      return false;
    }
    return true;
  }

  private validateStep3(): boolean {
    if (!this.selectedTemplate) {
      this.selectedTemplate = {
        id: 'standard',
        name: 'Standard Professional',
        description: 'Clean, balanced layout with all essential business information',
        sections: {
          showCustomerDetails: true,
          showCompanyLogo: true,
          showTaxBreakdown: true,
          showShippingDetails: true,
          showPaymentTerms: true,
          showNotes: true,
          showTermsConditions: true,
          showSignature: true,
          showAttachments: false,
          showItemImages: false,
          showSKU: true,
          showSerialNumbers: false,
          showBatchDetails: false,
          showSubtotalPerGroup: true,
          showTotalInWords: true,
          showCurrencySymbol: true,
          showVendorInfo: true,
          showCustomFields: false
        },
        layout: 'standard',
        fontSize: 'medium',
        colorTheme: 'professional'
      };
    }
    return true;
  }

  onTemplateSelected(template: QuoteTemplate | undefined): void {
    if (template) {
      this.selectedTemplate = template;
    }
  }

  onCreateAction(event: { action: 'pdf' | 'email' | 'both' }): void {
    this.selectedAction = event.action;
    this.onSubmit();
  }

  // ============ DELIVERY ACTIONS ============
  private async handleDeliveryAction(invoice: Invoice, action: 'pdf' | 'email' | 'both'): Promise<void> {
    try {
      if (action === 'pdf' || action === 'both') {
        const pdfBlob = await this.generateInvoicePDF(invoice);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(pdfBlob);
        link.download = `Invoice-${invoice.invoiceNumber}.pdf`;
        link.click();
        URL.revokeObjectURL(link.href);
      }

      if (action === 'email' || action === 'both') {
        await this.sendInvoiceEmail(invoice);
        alert(`Invoice ${invoice.invoiceNumber} sent to ${invoice.customerName}`);
      }
    } catch (error) {
      console.error('Error in delivery action:', error);
      alert('There was an issue with the delivery. Please try again.');
    }
  }

  private async generateInvoicePDF(invoice: Invoice): Promise<Blob> {
    this.generatedInvoiceNumber = invoice.invoiceNumber;
    
    // Allow small delay for Angular to bind the new invoice number to the DOM
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const element = document.getElementById('invoice-preview-document');
    if (!element) {
      throw new Error('Preview document element not found');
    }
    
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210; // A4 size width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    
    const pdfBlob = pdf.output('blob');
    
    // Reset the generated invoice number
    this.generatedInvoiceNumber = '';
    
    return pdfBlob;
  }

  private async sendInvoiceEmail(invoice: Invoice): Promise<void> {
    console.log(`Sending invoice ${invoice.invoiceNumber} to ${invoice.customerName}`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  getProductSku(productId: string): string {
    if (!productId) return 'N/A';
    const product = this.products.find(p => p.productId === productId || String(p.id) === productId);
    return product ? product.sku : 'N/A';
  }

  getStepLabel(step: number): string {
    const labels = {
      1: 'Invoice Details',
      2: 'Template Design',
      3: 'Preview & Delivery'
    };
    return labels[step as keyof typeof labels] || '';
  }

  private logInvalidControls(formGroup: FormGroup | FormArray): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control?.invalid) {
        if (control instanceof FormGroup || control instanceof FormArray) {
          console.warn(`Invalid Form group/array: ${key}`);
          this.logInvalidControls(control);
        } else {
          console.warn(`Invalid Control: ${key}`, control.errors);
        }
      }
    });
  }

  // Quick Customer helpers & submit
  get quickCustomerBankAccounts(): FormArray {
    return this.quickCustomerForm.get('bankAccounts') as FormArray;
  }

  addQuickCustomerBankAccount(): void {
    this.quickCustomerBankAccounts.push(this.fb.group({
      bankName: ['', Validators.required],
      accountName: ['', Validators.required],
      accountNumber: ['', [Validators.required, Validators.pattern(/^[0-9a-zA-Z\s\-]+$/)]],
      routingNumber: ['']
    }));
  }

  removeQuickCustomerBankAccount(index: number): void {
    this.quickCustomerBankAccounts.removeAt(index);
  }

  onQuickCustomerSubmit(): void {
    if (this.quickCustomerForm.invalid) {
      this.quickCustomerForm.markAllAsTouched();
      alert('Please fill in all required fields in the quick-add client form');
      return;
    }

    const val = this.quickCustomerForm.value;
    const newCust: any = {
      name: val.name,
      email: val.email,
      phone: val.phone,
      address: val.address,
      taxId: val.taxId || '',
      status: 'ACTIVE',
      bankAccounts: val.bankAccounts || [],
      createdAt: new Date(),
      totalSpent: 0,
      totalOrders: 0
    };

    if (val.savePermanently) {
      this.salesService.createCustomer(newCust).subscribe({
        next: (savedCust) => {
          this.customers = [...this.customers, savedCust];
          this.showNewCustomerModal = false;
          this.quickCustomerForm.reset({ savePermanently: true });
          while (this.quickCustomerBankAccounts.length) {
            this.quickCustomerBankAccounts.removeAt(0);
          }
          setTimeout(() => {
            this.invoiceForm.patchValue({ customerId: savedCust.customerId || String(savedCust.id) });
            this.onCustomerSelect(savedCust.customerId || String(savedCust.id));
          });
        },
        error: (err) => {
          console.error('Error saving client permanently:', err);
          alert('Failed to save client permanently. Please try again.');
        }
      });
    } else {
      // Temporary client (Invoice Only)
      const tempId = `TEMP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const tempCust: Customer = {
        ...newCust,
        id: Math.floor(Math.random() * 1000000),
        customerId: tempId
      } as any;
      this.customers = [...this.customers, tempCust];
      this.showNewCustomerModal = false;
      this.quickCustomerForm.reset({ savePermanently: true });
      while (this.quickCustomerBankAccounts.length) {
        this.quickCustomerBankAccounts.removeAt(0);
      }
      setTimeout(() => {
        this.invoiceForm.patchValue({ customerId: tempId });
        this.onCustomerSelect(tempId);
      });
    }
  }

  isQuickFieldInvalid(fieldName: string): boolean {
    const field = this.quickCustomerForm.get(fieldName);
    return field ? (field.invalid && (field.dirty || field.touched)) : false;
  }
}