import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SalesService } from '../../../../service/sales/sales.service';
import { Product } from '../../../../domain/sales/sales.dto';
import { BackButtonComponent } from '../../../../shared-component/view/back-button/back-button.component';

@Component({
  selector: 'app-product-service-catalog-form',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule, 
    ReactiveFormsModule, 
    BackButtonComponent
  ],
  templateUrl: './product-service-catalog-form.component.html',
  styleUrls: ['./product-service-catalog-form.component.scss']
})
export class ProductServiceCatalogFormComponent implements OnInit, OnDestroy {
  
  productForm: FormGroup;
  isEditMode = false;
  productId: string = '';
  isLoading = false;
  isSubmitting = false;
  
  // Mock data
  branches: string[] = ['Abuja', 'Lagos', 'Port Harcourt', 'Kano', 'Enugu'];
  categories: string[] = ['Electronics', 'Furniture', 'Office Supplies', 'Food & Beverage', 'Services', 'Other'];
  taxOptions: string[] = ['VAT 7.5%', 'VAT 5%', 'No Tax', '0%'];
  discountOptions: string[] = ['No Discount', '5%', '10%', '15%', '20%', '25%', '50%'];
  measurementUnits: string[] = ['Each', 'Kg', 'g', 'L', 'mL', 'm', 'cm', 'Box', 'Pack', 'Carton'];
  suppliers: string[] = ['Supplier A', 'Supplier B', 'Supplier C'];
  
  // Product variants
  variants: any[] = [];
  showVariantModal = false;
  currentVariantIndex: number | null = null;
  
  // UI State
  showDeleteConfirm = false;
  showAdditionalInfo = false;
  showStockMovement = true;
  showComboOptions = false;
  
  // For file upload
  attachmentFileName: string = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private salesService: SalesService
  ) {
    this.productForm = this.createForm();
  }

  ngOnInit(): void {
    this.productId = this.route.snapshot.paramMap.get('id') || '';
    this.isEditMode = !!this.productId;
    
    if (this.isEditMode) {
      this.loadProduct();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  createForm(): FormGroup {
    return this.fb.group({
      // General Information
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      branch: ['Abuja', Validators.required],
      category: ['', Validators.required],
      
      // Identifiers
      partNumber: [''],
      sku: [{ value: '', disabled: true }],
      code: [''],
      measurementUnit: ['Each'],
      
      // Pricing & Inventory
      costPrice: [0, [Validators.required, Validators.min(0)]],
      sellingPrice: [0, [Validators.required, Validators.min(0)]],
      quantity: [0, [Validators.required, Validators.min(0)]],
      expiryDate: [''],
      discount: ['No Discount'],
      taxes: ['VAT 7.5%'],
      supplier: [''],
      
      // Stock Movement
      movementDate: [new Date().toISOString().split('T')[0]],
      movementQuantity: [1, [Validators.min(1)]],
      movementPurchasePrice: [0],
      movementTax: ['Select tax'],
      
      // Additional
      reference: [''],
      selectedSupplier: [''],
      sellingPriceDisplay: ['N/A'],
      discountDisplay: ['Select discount'],
      
      // Combo
      isComboProduct: [false],
      
      // Variants
      variants: this.fb.array([]),
      
      // Online Store
      availableOnline: [false],
      
      // Reorder
      reorderThreshold: [0],
      weight: [0]
    });
  }

  get variantsArray(): FormArray {
    return this.productForm.get('variants') as FormArray;
  }

  loadProduct(): void {
    this.isLoading = true;
    this.salesService.getProductById(this.productId).subscribe({
      next: (product: Product | null) => {
        if (product) {
          this.productForm.patchValue({
            name: product.name,
            description: product.description,
            category: product.category,
            sku: product.sku,
            costPrice: product.costPrice,
            sellingPrice: product.unitPrice,
            quantity: product.stockQuantity,
            measurementUnit: 'Each'
          });
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading product:', error);
        this.isLoading = false;
        alert('Failed to load product. Please try again.');
        this.goBack();
      }
    });
  }

  onSubmit(): void {
    if (this.productForm.invalid) {
      this.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formData = this.productForm.getRawValue();
    
    const productData: Partial<Product> = {
      name: formData.name,
      description: formData.description,
      sku: formData.sku || `SKU-${Date.now()}`,
      unitPrice: formData.sellingPrice,
      costPrice: formData.costPrice,
      stockQuantity: formData.quantity,
      category: formData.category,
      taxRate: this.extractTaxRate(formData.taxes),
      currency: 'NGN',
      status: formData.quantity > 0 ? 'ACTIVE' : 'OUT_OF_STOCK'
    };

    const action = this.isEditMode 
      ? this.salesService.updateProduct(this.productId, productData)
      : this.salesService.createProduct(productData);

    action.subscribe({
      next: (result) => {
        this.isSubmitting = false;
        alert(`Product ${this.isEditMode ? 'updated' : 'created'} successfully!`);
        const uuid = this.route.snapshot.paramMap.get('uuid');
        if (uuid) {
          this.router.navigate(['/admin/sales/sales-hub', uuid]);
        } else {
          this.router.navigate(['/admin/sales/sales-hub']);
        }
      },
      error: (error: any) => {
        console.error('Error saving product:', error);
        this.isSubmitting = false;
        alert('Failed to save product. Please try again.');
      }
    });
  }

  extractTaxRate(tax: string): number {
    const match = tax.match(/(\d+\.?\d*)%/);
    return match ? parseFloat(match[1]) : 7.5;
  }

  markAllAsTouched(): void {
    Object.values(this.productForm.controls).forEach(control => {
      control.markAsTouched();
    });
  }

  // Variant Management
  addVariant(): void {
    const variantGroup = this.fb.group({
      name: ['', Validators.required],
      sku: [''],
      price: [0, [Validators.required, Validators.min(0)]],
      quantity: [0, [Validators.required, Validators.min(0)]],
      attributes: this.fb.group({
        color: [''],
        size: [''],
        material: ['']
      })
    });
    this.variantsArray.push(variantGroup);
    this.showVariantModal = false;
  }

  removeVariant(index: number): void {
    this.variantsArray.removeAt(index);
  }

  editVariant(index: number): void {
    this.currentVariantIndex = index;
    this.showVariantModal = true;
  }

  // File Upload
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.attachmentFileName = input.files[0].name;
    }
  }

  // Navigation
  goBack(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate(['/admin/sales/sales-hub', uuid]);
    } else {
      this.router.navigate(['/admin/sales/sales-hub']);
    }
  }

  // Form validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const control = this.productForm.get(fieldName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  getFieldError(fieldName: string): string {
    const control = this.productForm.get(fieldName);
    if (!control || !control.errors) return '';
    
    if (control.errors['required']) return 'This field is required';
    if (control.errors['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} characters required`;
    if (control.errors['min']) return `Value must be at least ${control.errors['min'].min}`;
    if (control.errors['max']) return `Value cannot exceed ${control.errors['max'].max}`;
    
    return 'Invalid value';
  }

  // Helper: Generate SKU
  generateSku(): void {
    const name = this.productForm.get('name')?.value || 'PROD';
    const timestamp = Date.now().toString().slice(-6);
    const sku = `${name.substring(0, 3).toUpperCase()}-${timestamp}`;
    this.productForm.patchValue({ sku });
  }

  // Helper: Auto-fill from code (UPC/Barcode)
  autoFillFromCode(): void {
    const code = this.productForm.get('code')?.value;
    if (code && code.length >= 12) {
      // Simulate API call to fetch product info
      this.isLoading = true;
      setTimeout(() => {
        this.productForm.patchValue({
          name: 'Auto-filled Product',
          description: 'Product details retrieved from online database',
          category: 'Electronics',
          measurementUnit: 'Each'
        });
        this.isLoading = false;
        alert('Product information auto-filled from code!');
      }, 1000);
    }
  }

  addSupplier(): void {
    const newSupplier = prompt('Enter new supplier name:');
    if (newSupplier && newSupplier.trim()) {
      const trimmed = newSupplier.trim();
      if (!this.suppliers.includes(trimmed)) {
        this.suppliers.push(trimmed);
        this.productForm.patchValue({
          supplier: trimmed,
          selectedSupplier: trimmed
        });
        alert(`Supplier "${trimmed}" added successfully.`);
      } else {
        alert(`Supplier "${trimmed}" already exists.`);
      }
    }
  }
}