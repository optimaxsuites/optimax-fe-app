// src/app/ui/view/sales-module/quote-form/quote-form.component.ts

import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray, AbstractControl } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SalesService } from '../../../../service/sales/sales.service';
import { Customer, Product, Quote, QuoteStatus, QuoteItem } from '../../../../domain/sales/sales.dto';

@Component({
  selector: 'app-quote-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './quote-form.component.html',
  styleUrls: ['./quote-form.component.scss']
})
export class QuoteFormComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('dialog') dialogRef?: ElementRef<HTMLDialogElement>;
  @Input() editId?: string;
  @Input() customerId?: string;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  
  isModal = false;
  quoteForm: FormGroup;
  isSubmitting = false;
  isLoading = false;
  isEditMode = false;
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
  
  // Toggle states
  showTerms = false;
  showNotes = false;
  showAdvanced = false;
  
  // Currency
  currencies = ['NGN', 'USD', 'EUR', 'GBP'];
  
  // Calculated totals
  subtotal: number = 0;
  totalTax: number = 0;
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
    this.quoteForm = this.fb.group({
      customerId: ['', Validators.required],
      customerName: [''],
      quoteNumber: [{ value: 'Auto-generated', disabled: true }],
      quoteDate: [this.formatDateForInput(new Date()), Validators.required],
      validUntil: ['', Validators.required],
      currency: ['NGN', Validators.required],
      notes: [''],
      terms: [''],
      items: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.isModal = this.saved.observed || this.cancelled.observed;
    this.quoteId = this.editId || this.route.snapshot.paramMap.get('id') || '';
    this.isEditMode = !!this.quoteId;
    
    if (!this.customerId) {
      this.customerId = this.route.snapshot.queryParamMap.get('customerId') || '';
    }
    
    this.loadCustomers();
    this.loadProducts();
    this.setupFormListeners();
    
    if (this.isEditMode) {
      this.loadQuote();
    } else {
      this.addLineItem();
    }
  }

  ngAfterViewInit(): void {
    if (this.isModal) {
      try {
        if (this.dialogRef?.nativeElement && typeof this.dialogRef.nativeElement.showModal === 'function') {
          this.dialogRef.nativeElement.showModal();
        } else if (this.dialogRef?.nativeElement) {
          this.dialogRef.nativeElement.setAttribute('open', '');
        }
      } catch (e) {
        // ignore
      }
    } else {
      if (this.dialogRef?.nativeElement) {
        this.dialogRef.nativeElement.setAttribute('open', '');
      }
    }
  }

  ngOnDestroy(): void {
    this.closeDialog();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFormListeners(): void {
    // Listen to item changes to recalculate totals
    this.quoteForm.get('items')?.valueChanges.subscribe(() => {
      this.calculateTotals();
    });
  }

  // Form Arrays
  get items(): FormArray {
    return this.quoteForm.get('items') as FormArray;
  }

  addLineItem(): void {
    const itemForm = this.fb.group({
      productId: ['', Validators.required],
      productName: ['', Validators.required],
      description: [''],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      taxRate: [0, [Validators.min(0), Validators.max(100)]],
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
    
    // For now, discount is 0 - can be expanded later
    this.discountAmount = 0;
    this.grandTotal = this.subtotal + this.totalTax - this.discountAmount;
  }

  // Product selection
  onProductSelect(index: number, event: any): void {
    const productId = event.target.value;
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
  onCustomerSelect(event: any): void {
    const customerId = event.target.value;
    const customer = this.customers.find(c => c.id === customerId);
    if (customer) {
      this.quoteForm.patchValue({ customerName: customer.name });
    }
  }

  // Load data
  private loadCustomers(): void {
    this.salesService.getCustomers({ page: 0, size: 100 }).subscribe({
      next: (response: any) => {
        this.customers = response.data;
        if (this.customerId) {
          this.quoteForm.patchValue({ customerId: this.customerId });
          const customer = this.customers.find(c => c.id === this.customerId);
          if (customer) {
            this.quoteForm.patchValue({ customerName: customer.name });
          }
        }
      },
      error: (error: any) => {
        console.error('Error loading customers:', error);
        this.setMockCustomers();
        if (this.customerId) {
          this.quoteForm.patchValue({ customerId: this.customerId });
          const customer = this.customers.find(c => c.id === this.customerId);
          if (customer) {
            this.quoteForm.patchValue({ customerName: customer.name });
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

  private loadQuote(): void {
    this.isLoading = true;
    this.salesService.getQuoteById(this.quoteId).subscribe({
      next: (quote: Quote | null) => {
        if (quote) {
          this.populateForm(quote);
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading quote:', error);
        this.isLoading = false;
      }
    });
  }

  private populateForm(quote: Quote): void {
    this.quoteForm.patchValue({
      customerId: quote.customerId,
      customerName: quote.customerName,
      currency: quote.currency,
      quoteDate: this.formatDateForInput(quote.createdAt),
      validUntil: this.formatDateForInput(quote.validUntil),
      notes: quote.notes,
      terms: quote.terms
    });
    
    // Clear existing items
    while (this.items.length) {
      this.items.removeAt(0);
    }
    
    // Add items from quote
    quote.items.forEach((item: QuoteItem) => {
      this.addLineItem();
      const index = this.items.length - 1;
      const itemForm = this.items.at(index);
      itemForm.patchValue({
        productId: item.productId,
        productName: item.productName,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: 0 // Default tax rate
      });
      this.calculateItemTotal(itemForm);
    });
  }

  // Submit
  onSubmit(): void {
    if (this.quoteForm.invalid) {
      this.quoteForm.markAllAsTouched();
      alert('Please fill in all required fields');
      return;
    }

    if (this.items.length === 0) {
      alert('Please add at least one item to the quote');
      return;
    }

    this.isSubmitting = true;
    
    const formValue = this.quoteForm.getRawValue();
    const items: QuoteItem[] = [];
    
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items.at(i).getRawValue();
      items.push({
        id: Math.random().toString(36).substr(2, 9),
        productId: item.productId,
        productName: item.productName,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: 0,
        total: item.total
      });
    }
    
    const quoteData: Partial<Quote> = {
      customerId: formValue.customerId,
      customerName: formValue.customerName,
      currency: formValue.currency,
      validUntil: new Date(formValue.validUntil),
      notes: formValue.notes,
      terms: formValue.terms,
      items: items,
      subtotal: this.subtotal,
      taxAmount: this.totalTax,
      discountAmount: this.discountAmount,
      totalAmount: this.grandTotal,
      status: 'DRAFT' as QuoteStatus,
      createdAt: new Date(formValue.quoteDate),
      expiresAt: new Date(formValue.validUntil)
    };
    
    let request;
    if (this.isEditMode) {
      request = this.salesService.updateQuote(this.quoteId, quoteData);
    } else {
      request = this.salesService.createQuote(quoteData);
    }
    
    request.subscribe({
      next: (response: Quote) => {
        this.isSubmitting = false;
        alert(this.isEditMode ? 'Quote updated successfully!' : 'Quote created successfully!');
        this.closeDialog();
        if (this.saved.observed) {
          this.saved.emit();
        } else {
          const uuid = this.route.snapshot.paramMap.get('uuid');
          if (uuid) {
            this.router.navigate(['/admin/sales/quotes', response.id, uuid]);
          } else {
            this.router.navigate(['/admin/sales/quotes', response.id]);
          }
        }
      },
      error: (error: any) => {
        console.error('Error saving quote:', error);
        this.isSubmitting = false;
        alert('Failed to save quote. Please try again.');
      }
    });
  }

  cancel(): void {
    this.closeDialog();
    if (this.cancelled.observed) {
      this.cancelled.emit();
    } else {
      const uuid = this.route.snapshot.paramMap.get('uuid');
      if (uuid) {
        this.router.navigate(['/admin/sales/sales-hub', uuid]);
      } else {
        this.router.navigate(['/admin/sales/sales-hub']);
      }
    }
  }

  private closeDialog(): void {
    try {
      if (this.dialogRef?.nativeElement) {
        if (typeof this.dialogRef.nativeElement.close === 'function') {
          this.dialogRef.nativeElement.close();
        } else {
          this.dialogRef.nativeElement.removeAttribute('open');
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // Helper methods
  private formatDateForInput(date: Date): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  get today(): string {
    return new Date().toISOString().split('T')[0];
  }

  get minValidUntil(): string {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  }

  formatCurrency(amount: number): string {
    const currency = this.quoteForm.get('currency')?.value || 'NGN';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(amount);
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

  getTotalQuantity(): number {
    let total = 0;
    for (let i = 0; i < this.items.length; i++) {
      total += this.items.at(i).get('quantity')?.value || 0;
    }
    return total;
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

  isFieldInvalid(fieldName: string): boolean {
    const field = this.quoteForm.get(fieldName);
    return field ? (field.invalid && (field.dirty || field.touched)) : false;
  }

  // Mock data
  private setMockCustomers(): void {
    this.customers = [
      { id: 'CUST-001', name: 'Mama Nkechi Enterprises', email: 'contact@mamankechi.com', phone: '+234 803 123 4567', address: 'Lagos, Nigeria', taxId: 'TAX-001', createdAt: new Date(), totalSpent: 500000, totalOrders: 1, status: 'ACTIVE' },
      { id: 'CUST-002', name: 'Tech Solutions Ltd', email: 'info@techsolutions.ng', phone: '+234 812 345 6789', address: 'Abuja, Nigeria', taxId: 'TAX-002', createdAt: new Date(), totalSpent: 1250000, totalOrders: 1, status: 'ACTIVE' }
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