import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray, AbstractControl } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SalesService } from '../../../../service/sales/sales.service';
import { Customer, Product, Invoice, InvoiceStatus, InvoiceItem, Quote } from '../../../../domain/sales/sales.dto';
import { BackButtonComponent } from '../../../../shared-component/view/back-button/back-button.component';

@Component({
  selector: 'app-invoice-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, BackButtonComponent],
  templateUrl: './invoice-form.component.html',
  styleUrls: ['./invoice-form.component.scss']
})
export class InvoiceFormComponent implements OnInit, OnDestroy {
  @Input() editId?: string;
  @Input() fromQuoteId?: string;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();


  invoiceForm: FormGroup;
  isSubmitting = false;
  isLoading = false;
  isEditMode = false;
  invoiceId: string = '';
  quoteId: string = '';
  showTerms = false;
  showNotes = false;
  showAdvanced = false;
  showSignature = false;
  showAttachments = false;
  showAdditionalInfo = false;
  showContactDetails = false;

  // Additional Option data bindings
  signatureText = '';
  additionalInfoText = '';
  contactPhone = '';
  contactEmail = '';
  attachmentFileName = '';
  logoFileName = '';

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

  // UI State
  showNewCustomerModal = false;
  showProductModal = false;
  searchProductTerm = '';
  currentItemIndex = 0;

  // Currency
  currencies = ['NGN', 'USD', 'EUR', 'GBP'];

  // Tax settings
  taxRate = 0;
  discountType: 'PERCENTAGE' | 'FIXED' = 'PERCENTAGE';
  discountValue = 0;

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
      isRecurring: [false]
    });
  }



  ngOnInit(): void {

    this.invoiceId = this.editId || this.route.snapshot.paramMap.get('id') || '';
    this.quoteId = this.fromQuoteId || this.route.snapshot.queryParamMap.get('quoteId') || '';
    this.isEditMode = !!this.invoiceId;

    this.loadCustomers();
    this.loadProducts();
    this.setupFormListeners();

    if (this.isEditMode) {
      this.loadInvoice();
    } else if (this.quoteId) {
      this.loadQuoteForInvoice();
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
      productId: ['', Validators.required],
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

    // Calculate tax on after discount
    const taxRate = this.invoiceForm.get('taxRate')?.value || 0;
    const afterDiscount = this.subtotal - this.discountAmount;
    this.taxAmount = afterDiscount * (taxRate / 100);

    const finalTax = this.totalTax || this.taxAmount;
    this.grandTotal = afterDiscount + finalTax + this.additionalCharges;
  }

  // Product selection
  onProductSelect(index: number, productId: string): void {
    const product = this.products.find(p => p.id === productId);
    if (product) {
      const itemForm = this.items.at(index);
      itemForm.patchValue({
        productName: product.name,
        description: product.description,
        unitPrice: product.unitPrice,
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
      productId: product.id,
      productName: product.name,
      description: product.description,
      unitPrice: product.unitPrice,
      taxRate: product.taxRate || 0
    });
    this.calculateItemTotal(itemForm);
    this.showProductModal = false;
    this.searchProductTerm = '';
  }

  // Customer selection
  onCustomerSelect(customerId: string): void {
    const customer = this.customers.find(c => c.id === customerId);
    if (customer) {
      this.invoiceForm.patchValue({ customerName: customer.name });
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
          const customer = this.customers.find(c => c.id === customerId);
          if (customer) {
            this.invoiceForm.patchValue({ customerName: customer.name });
          }
        }
      },
      error: (error: any) => {
        console.error('Error loading customers:', error);
        this.setMockCustomers();
        const customerId = this.route.snapshot.queryParamMap.get('customerId');
        if (customerId) {
          this.invoiceForm.patchValue({ customerId: customerId });
          const customer = this.customers.find(c => c.id === customerId);
          if (customer) {
            this.invoiceForm.patchValue({ customerName: customer.name });
          }
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
        this.setMockProducts();
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

  private loadQuoteForInvoice(): void {
    this.isLoading = true;
    this.salesService.getQuoteById(this.quoteId).subscribe({
      next: (quote: Quote | null) => {
        if (quote) {
          this.populateFromQuote(quote);
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
    this.invoiceForm.patchValue({
      customerId: quote.customerId,
      customerName: quote.customerName,
      currency: quote.currency,
      notes: quote.notes,
      terms: quote.terms,
      paymentTerms: quote.terms || 'Net 30'
    });

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
    this.invoiceForm.patchValue({
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      issueDate: this.formatDateForInput(invoice.issueDate),
      dueDate: this.formatDateForInput(invoice.dueDate),
      currency: invoice.currency,
      notes: invoice.notes,
      paymentTerms: invoice.paymentTerms
    });

    // Clear existing items
    while (this.items.length) {
      this.items.removeAt(0);
    }

    // Add items from invoice
    invoice.items.forEach(item => {
      this.addLineItem();
      const index = this.items.length - 1;
      const itemForm = this.items.at(index);
      itemForm.patchValue({
        productId: '',
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
        id: Math.random().toString(36).substr(2, 9),
        productName: item.productName,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total
      });
    }

    const invoiceData: Partial<Invoice> = {
      customerId: formValue.customerId,
      customerName: formValue.customerName,
      currency: formValue.currency,
      issueDate: new Date(formValue.issueDate),
      dueDate: new Date(formValue.dueDate),
      notes: formValue.notes,
      paymentTerms: formValue.paymentTerms,
      items: items,
      subtotal: this.subtotal,
      taxAmount: this.taxAmount,
      discountAmount: this.discountAmount,
      totalAmount: this.grandTotal,
      amountPaid: 0,
      balanceDue: this.grandTotal,
      status: 'DRAFT' as InvoiceStatus
    };

    let request;
    if (this.isEditMode) {
      request = this.salesService.updateInvoice(this.invoiceId, invoiceData);
    } else {
      request = this.salesService.createInvoice(invoiceData);
    }

    request.subscribe({
      next: (response: Invoice) => {
        this.isSubmitting = false;
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
    this.router.navigate(['/sales/invoices']);
  }

  // Helper methods
  private formatDateForInput(date: Date): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  get today(): string {
    return new Date().toISOString().split('T')[0];
  }

  formatCurrency(amount: number): string {
    const currency = this.invoiceForm.get('currency')?.value || 'NGN';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(amount);
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

  // Mock data
  private setMockCustomers(): void {
    this.customers = [
      { id: 'CUST-001', name: 'Mama Nkechi Enterprises', email: 'contact@mamankechi.com', phone: '+234 123 456 789', address: 'Lagos, Nigeria', taxId: '', createdAt: new Date(), totalSpent: 0, totalOrders: 0, status: 'ACTIVE' },
      { id: 'CUST-002', name: 'Tech Solutions Ltd', email: 'info@techsolutions.com', phone: '+234 234 567 890', address: 'Abuja, Nigeria', taxId: '', createdAt: new Date(), totalSpent: 0, totalOrders: 0, status: 'ACTIVE' }
    ];
  }

  private setMockProducts(): void {
    this.products = [
      { id: 'PROD-001', name: 'Executive Office Chair', sku: 'CHR-001', description: 'Ergonomic executive office chair', unitPrice: 50000, costPrice: 30000, currency: 'NGN', stockQuantity: 50, category: 'Furniture', taxRate: 7.5, images: [], status: 'ACTIVE' },
      { id: 'PROD-002', name: 'Standing Desk', sku: 'DSK-001', description: 'Adjustable standing desk', unitPrice: 120000, costPrice: 80000, currency: 'NGN', stockQuantity: 30, category: 'Furniture', taxRate: 7.5, images: [], status: 'ACTIVE' },
      { id: 'PROD-003', name: 'Laptop - Dell XPS', sku: 'LAP-001', description: 'Dell XPS 13 laptop', unitPrice: 850000, costPrice: 700000, currency: 'NGN', stockQuantity: 15, category: 'Electronics', taxRate: 7.5, images: [], status: 'ACTIVE' }
    ];
    this.filteredProducts = this.products;
  }

  onLogoSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.logoFileName = file.name;
      alert(`Logo "${file.name}" uploaded successfully.`);
    }
  }

  addCustomFields(): void {
    alert('Custom Fields feature is under development.');
  }

  addNewGroup(): void {
    alert('Add New Group feature is under development.');
  }

  addShippingDetails(): void {
    this.showShippingDetails = !this.showShippingDetails;
  }

  addDiscounts(): void {
    const discountType = this.invoiceForm.get('discountType')?.value || 'PERCENTAGE';
    const discountValue = this.invoiceForm.get('discountValue')?.value || 0;
    
    const input = prompt(
      'Enter discount amount (e.g. 10% or 5000):',
      discountValue ? `${discountValue}${discountType === 'PERCENTAGE' ? '%' : ''}` : ''
    );
    if (input !== null) {
      const valStr = input.trim();
      if (valStr.endsWith('%')) {
        const val = parseFloat(valStr.slice(0, -1));
        if (!isNaN(val)) {
          this.invoiceForm.patchValue({
            discountType: 'PERCENTAGE',
            discountValue: val
          });
          this.calculateTotals();
        }
      } else {
        const val = parseFloat(valStr);
        if (!isNaN(val)) {
          this.invoiceForm.patchValue({
            discountType: 'FIXED',
            discountValue: val
          });
          this.calculateTotals();
        }
      }
    }
  }

  addAdditionalCharges(): void {
    const input = prompt(
      'Enter additional charges (fixed amount):',
      this.additionalCharges ? `${this.additionalCharges}` : ''
    );
    if (input !== null) {
      const val = parseFloat(input.trim());
      if (!isNaN(val)) {
        this.additionalCharges = val;
        this.calculateTotals();
      }
    }
  }

  editBilledBy(): void {
    alert('Edit Billed By feature is under development.');
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
}