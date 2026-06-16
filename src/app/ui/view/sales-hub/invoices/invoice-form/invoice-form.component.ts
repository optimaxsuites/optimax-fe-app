// src/app/ui/view/sales-module/invoice-form/invoice-form.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray, AbstractControl } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SalesService } from '../../../../service/sales/sales.service';
import { Customer, Product, Invoice, InvoiceStatus, InvoiceItem, Quote } from '../../../../domain/sales/sales.dto';
import { buildSalesLink } from '../../../../shared-component/service/route-context/route-context';

@Component({
  selector: 'app-invoice-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './invoice-form.component.html',
  styleUrls: ['./invoice-form.component.scss']
})
export class InvoiceFormComponent implements OnInit, OnDestroy {
  
  invoiceForm: FormGroup;
  isSubmitting = false;
  buildLink = buildSalesLink;
  isLoading = false;
  isEditMode = false;
  invoiceId: string = '';
  quoteId: string = '';
  
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
  
  // Calculated totals
  subtotal: number = 0;
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
      paymentTerms: ['Net 30'],
      items: this.fb.array([]),
      taxRate: [0],
      discountType: ['PERCENTAGE'],
      discountValue: [0]
    });
  }

  ngOnInit(): void {
    this.invoiceId = this.route.snapshot.paramMap.get('id') || '';
    this.quoteId = this.route.snapshot.queryParamMap.get('quoteId') || '';
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
      total: [{ value: 0, disabled: true }]
    });
    
    this.items.push(itemForm);
    
    // Subscribe to changes for this item
    itemForm.get('quantity')?.valueChanges.subscribe(() => this.calculateItemTotal(itemForm));
    itemForm.get('unitPrice')?.valueChanges.subscribe(() => this.calculateItemTotal(itemForm));
  }

  removeLineItem(index: number): void {
    this.items.removeAt(index);
    this.calculateTotals();
  }

  private calculateItemTotal(itemForm: AbstractControl): void {
    const quantity = itemForm.get('quantity')?.value || 0;
    const unitPrice = itemForm.get('unitPrice')?.value || 0;
    const total = quantity * unitPrice;
    itemForm.patchValue({ total: total }, { emitEvent: false });
    this.calculateTotals();
  }

  calculateTotals(): void {
    // Calculate subtotal
    this.subtotal = 0;
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items.at(i);
      this.subtotal += item.get('total')?.value || 0;
    }
    
    // Calculate discount
    const discountType = this.invoiceForm.get('discountType')?.value;
    const discountValue = this.invoiceForm.get('discountValue')?.value || 0;
    
    if (discountType === 'PERCENTAGE') {
      this.discountAmount = this.subtotal * (discountValue / 100);
    } else {
      this.discountAmount = discountValue;
    }
    
    // Calculate tax
    const taxRate = this.invoiceForm.get('taxRate')?.value || 0;
    const afterDiscount = this.subtotal - this.discountAmount;
    this.taxAmount = afterDiscount * (taxRate / 100);
    
    // Calculate grand total
    this.grandTotal = afterDiscount + this.taxAmount;
  }

  // Product selection - FIXED: Accept string, not Event
  onProductSelect(index: number, productId: string): void {
    const product = this.products.find(p => p.id === productId);
    if (product) {
      const itemForm = this.items.at(index);
      itemForm.patchValue({
        productName: product.name,
        description: product.description,
        unitPrice: product.unitPrice
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
      unitPrice: product.unitPrice
    });
    this.calculateItemTotal(itemForm);
    this.showProductModal = false;
    this.searchProductTerm = '';
  }

  // Customer selection - FIXED: Accept string, not Event
  onCustomerSelect(customerId: string): void {
    const customer = this.customers.find(c => c.id === customerId);
    if (customer) {
      this.invoiceForm.patchValue({ customerName: customer.name });
    }
  }

  // Load data
  private loadCustomers(): void {
    this.salesService.getCustomers({ page: 0, size: 100 }).subscribe({
      next: (response) => {
        this.customers = response.data;
      },
      error: (error) => {
        console.error('Error loading customers:', error);
        this.setMockCustomers();
      }
    });
  }

  private loadProducts(): void {
    this.salesService.getProducts({ page: 0, size: 100 }).subscribe({
      next: (response) => {
        this.products = response.data;
        this.filteredProducts = this.products;
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.setMockProducts();
      }
    });
  }

  private loadInvoice(): void {
    this.isLoading = true;
    this.salesService.getInvoiceById(this.invoiceId).subscribe({
      next: (invoice) => {
        if (invoice) {
          this.populateForm(invoice);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading invoice:', error);
        this.isLoading = false;
      }
    });
  }

  private loadQuoteForInvoice(): void {
    this.isLoading = true;
    this.salesService.getQuoteById(this.quoteId).subscribe({
      next: (quote) => {
        if (quote) {
          this.populateFromQuote(quote);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading quote:', error);
        this.isLoading = false;
      }
    });
  }

  private populateFromQuote(quote: any): void {
    this.invoiceForm.patchValue({
      customerId: quote.customerId,
      customerName: quote.customerName,
      currency: quote.currency,
      notes: quote.notes,
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
        unitPrice: item.unitPrice
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
        unitPrice: item.unitPrice
      });
      this.calculateItemTotal(itemForm);
    });
  }

  // Submit
  onSubmit(): void {
    if (this.invoiceForm.invalid) {
      this.invoiceForm.markAllAsTouched();
      alert('Please fill in all required fields');
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
      next: (response) => {
        this.isSubmitting = false;
        alert(this.isEditMode ? 'Invoice updated successfully!' : 'Invoice created successfully!');
        this.router.navigate(this.buildLink('/sales/invoices', response.id));
      },
      error: (error) => {
        console.error('Error saving invoice:', error);
        this.isSubmitting = false;
        alert('Failed to save invoice. Please try again.');
      }
    });
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
}