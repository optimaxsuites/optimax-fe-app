import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SalesService } from '../../../../service/sales/sales.service';
import { Customer, Product, Quote, QuoteItem, QuoteStatus } from '../../../../domain/sales/sales.dto';

@Component({
  selector: 'app-quote-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './quote-form.component.html',
  styleUrls: ['./quote-form.component.scss']
})
export class QuoteFormComponent implements OnInit, OnDestroy {
  
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
  
  // Currency
  currencies = ['NGN', 'USD', 'EUR', 'GBP'];
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    public router: Router,
    private route: ActivatedRoute,
    private salesService: SalesService
  ) {
    this.quoteForm = this.fb.group({
      customerId: ['', Validators.required],
      customerName: [''],
      quoteNumber: [{ value: 'Auto-generated', disabled: true }],
      currency: ['NGN', Validators.required],
      validUntil: ['', Validators.required],
      notes: [''],
      terms: [''],
      items: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.quoteId = this.route.snapshot.paramMap.get('id') || '';
    this.isEditMode = !!this.quoteId;
    this.loadCustomers();
    this.loadProducts();
    
    if (this.isEditMode) {
      this.loadQuote();
    } else {
      this.addLineItem(); // Start with one empty line item
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
      discount: [0, [Validators.min(0), Validators.max(100)]],
      total: [{ value: 0, disabled: true }]
    });
    
    this.items.push(itemForm);
    
    // Subscribe to changes for this item to calculate total
    itemForm.get('quantity')?.valueChanges.subscribe(() => this.calculateItemTotal(itemForm));
    itemForm.get('unitPrice')?.valueChanges.subscribe(() => this.calculateItemTotal(itemForm));
    itemForm.get('discount')?.valueChanges.subscribe(() => this.calculateItemTotal(itemForm));
  }

  removeLineItem(index: number): void {
    this.items.removeAt(index);
    this.calculateGrandTotal();
  }

  private calculateItemTotal(itemForm: FormGroup): void {
    const quantity = itemForm.get('quantity')?.value || 0;
    const unitPrice = itemForm.get('unitPrice')?.value || 0;
    const discount = itemForm.get('discount')?.value || 0;
    
    const subtotal = quantity * unitPrice;
    const discountAmount = subtotal * (discount / 100);
    const total = subtotal - discountAmount;
    
    itemForm.patchValue({ total: total }, { emitEvent: false });
    this.calculateGrandTotal();
  }

  calculateGrandTotal(): void {
    let subtotal = 0;
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items.at(i);
      subtotal += item.get('total')?.value || 0;
    }
    // You can add tax calculation here if needed
    this.grandTotal = subtotal;
  }

  grandTotal: number = 0;

  // Product selection
  onProductSelect(index: number, event: Event): void {
    const productId = (event.target as HTMLSelectElement).value;
    const product = this.products.find(p => p.id === productId);
    if (product) {
      const itemForm = this.items.at(index) as FormGroup;
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
    const itemForm = this.items.at(index) as FormGroup;
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

  // Customer selection
  onCustomerSelect(event: Event): void {
    const customerId = (event.target as HTMLSelectElement).value;
    const customer = this.customers.find(c => c.id === customerId);
    if (customer) {
      this.quoteForm.patchValue({ customerName: customer.name });
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

  private loadQuote(): void {
    this.isLoading = true;
    this.salesService.getQuoteById(this.quoteId).subscribe({
      next: (quote) => {
        if (quote) {
          this.populateForm(quote);
        }
        this.isLoading = false;
      },
      error: (error) => {
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
      validUntil: this.formatDateForInput(quote.validUntil),
      notes: quote.notes,
      terms: quote.terms
    });
    
    // Clear existing items
    while (this.items.length) {
      this.items.removeAt(0);
    }
    
    // Add items from quote
    quote.items.forEach(item => {
      this.addLineItem();
      const index = this.items.length - 1;
      const itemForm = this.items.at(index) as FormGroup;
      itemForm.patchValue({
        productId: item.productId,
        productName: item.productName,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount
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
        discount: item.discount,
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
      subtotal: this.grandTotal,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: this.grandTotal,
      status: 'DRAFT' as QuoteStatus,
      createdAt: new Date(),
      expiresAt: new Date(formValue.validUntil)
    };
    
    let request;
    if (this.isEditMode) {
      request = this.salesService.updateQuote(this.quoteId, quoteData);
    } else {
      request = this.salesService.createQuote(quoteData);
    }
    
    request.subscribe({
      next: (response) => {
        this.isSubmitting = false;
        alert(this.isEditMode ? 'Quote updated successfully!' : 'Quote created successfully!');
        this.router.navigate(['/sales/quotes', response.id]);
      },
      error: (error) => {
        console.error('Error saving quote:', error);
        this.isSubmitting = false;
        alert('Failed to save quote. Please try again.');
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

  get minValidUntil(): string {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  }

  formatCurrency(amount: number): string {
    const currency = this.quoteForm.get('currency')?.value || 'NGN';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(amount);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.quoteForm.get(fieldName);
    return field ? (field.invalid && (field.dirty || field.touched)) : false;
  }

  // Mock data for development
  private setMockCustomers(): void {
    this.customers = [
      { id: 'CUST-001', name: 'Mama Nkechi Enterprises', email: 'contact@maman kechi.com', phone: '+234 123 456 789', address: 'Lagos, Nigeria', taxId: '', createdAt: new Date(), totalSpent: 0, totalOrders: 0, status: 'ACTIVE' },
      { id: 'CUST-002', name: 'Tech Solutions Ltd', email: 'info@techsolutions.com', phone: '+234 234 567 890', address: 'Abuja, Nigeria', taxId: '', createdAt: new Date(), totalSpent: 0, totalOrders: 0, status: 'ACTIVE' },
      { id: 'CUST-003', name: 'Global Services NG', email: 'hello@globalservices.com', phone: '+234 345 678 901', address: 'Port Harcourt, Nigeria', taxId: '', createdAt: new Date(), totalSpent: 0, totalOrders: 0, status: 'ACTIVE' }
    ];
  }

  private setMockProducts(): void {
    this.products = [
      { id: 'PROD-001', name: 'Executive Office Chair', sku: 'CHR-001', description: 'Ergonomic executive office chair', unitPrice: 50000, costPrice: 30000, currency: 'NGN', stockQuantity: 50, category: 'Furniture', taxRate: 7.5, images: [], status: 'ACTIVE' },
      { id: 'PROD-002', name: 'Standing Desk', sku: 'DSK-001', description: 'Adjustable standing desk', unitPrice: 120000, costPrice: 80000, currency: 'NGN', stockQuantity: 30, category: 'Furniture', taxRate: 7.5, images: [], status: 'ACTIVE' },
      { id: 'PROD-003', name: 'Laptop - Dell XPS', sku: 'LAP-001', description: 'Dell XPS 13 laptop', unitPrice: 850000, costPrice: 700000, currency: 'NGN', stockQuantity: 15, category: 'Electronics', taxRate: 7.5, images: [], status: 'ACTIVE' },
      { id: 'PROD-004', name: 'Conference Table', sku: 'TBL-001', description: 'Large conference table', unitPrice: 250000, costPrice: 180000, currency: 'NGN', stockQuantity: 10, category: 'Furniture', taxRate: 7.5, images: [], status: 'ACTIVE' },
      { id: 'PROD-005', name: 'Printer - HP LaserJet', sku: 'PRN-001', description: 'HP LaserJet printer', unitPrice: 150000, costPrice: 120000, currency: 'NGN', stockQuantity: 25, category: 'Electronics', taxRate: 7.5, images: [], status: 'ACTIVE' }
    ];
    this.filteredProducts = this.products;
  }
}