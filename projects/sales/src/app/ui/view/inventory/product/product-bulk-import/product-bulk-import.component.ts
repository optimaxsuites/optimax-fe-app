// product-bulk-import.component.ts
// ============================================================
// IMPORTS
// ============================================================

import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import { Product, Category, MeasurementUnit, Supplier } from '../../../../domain/inventory/inventory.dto';

// ============================================================
// COMPONENT
// ============================================================

@Component({
  selector: 'app-product-bulk-import',
  templateUrl: './product-bulk-import.component.html',
  styleUrls: ['./product-bulk-import.component.scss']
})
export class ProductBulkImportComponent implements OnInit, OnDestroy {

  // ============================================================
  // OUTPUTS
  // ============================================================

  @Output() completed = new EventEmitter<Product[]>();
  @Output() cancelled = new EventEmitter<void>();

  // ============================================================
  // STATE
  // ============================================================

  // Data
  categories: Category[] = [];
  measurementUnits: MeasurementUnit[] = [];
  suppliers: Supplier[] = [];

  // UI
  Math = Math;
  Object = Object;
  currentStep: number = 1;
  totalSteps: number = 3;
  isLoading: boolean = true;
  isUploading: boolean = false;
  isProcessing: boolean = false;
  error: string | null = null;
  fileName: string = '';

  // File upload
  selectedFile: File | null = null;
  fileContent: string = '';
  parsedData: any[] = [];
  previewData: any[] = [];
  importResults: {
    total: number;
    successful: number;
    failed: number;
    errors: { row: number; message: string }[];
  } | null = null;

  // Form
  importForm: FormGroup;

  // Private
  private destroy$ = new Subject<void>();

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private inventoryService: InventoryService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {
    this.importForm = this.buildForm();
  }

  // ============================================================
  // LIFECYCLE HOOKS
  // ============================================================

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================
  // FORM BUILDING
  // ============================================================

  private buildForm(): FormGroup {
    return this.fb.group({
      defaultCategory: [''],
      defaultUnit: ['EACH'],
      defaultSupplier: [''],
      overwriteExisting: [false],
      skipErrors: [false],
      validateOnly: [false]
    });
  }

  // ============================================================
  // DATA LOADING
  // ============================================================

  loadData(): void {
    this.isLoading = true;

    // Load categories
    this.inventoryService.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => {
          this.categories = categories;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load categories:', err);
          this.error = 'Failed to load categories. Please try again.';
          this.isLoading = false;
        }
      });

    // Load measurement units
    this.inventoryService.getMeasurementUnits()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (units) => {
          this.measurementUnits = units;
        },
        error: (err) => {
          console.error('Failed to load measurement units:', err);
        }
      });

    // Load suppliers
    this.inventoryService.getSuppliers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (suppliers) => {
          this.suppliers = suppliers;
        },
        error: (err) => {
          console.error('Failed to load suppliers:', err);
        }
      });
  }

  // ============================================================
  // FILE HANDLING
  // ============================================================

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.selectedFile = input.files[0];
    this.fileName = this.selectedFile.name;
    this.error = null;

    // Read file content
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      this.fileContent = content;
      this.parseFile(content);
    };
    reader.readAsText(this.selectedFile);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    target.classList.add('ql-upload-zone--dragover');
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    target.classList.remove('ql-upload-zone--dragover');
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    target.classList.remove('ql-upload-zone--dragover');

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.selectedFile = files[0];
      this.fileName = this.selectedFile.name;
      this.error = null;

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        this.fileContent = content;
        this.parseFile(content);
      };
      reader.readAsText(this.selectedFile);
    }
  }

  removeFile(): void {
    this.selectedFile = null;
    this.fileName = '';
    this.fileContent = '';
    this.parsedData = [];
    this.previewData = [];
    this.error = null;
    const input = document.getElementById('fileInput') as HTMLInputElement;
    if (input) input.value = '';
  }

  // ============================================================
  // FILE PARSING
  // ============================================================

  parseFile(content: string): void {
    this.isProcessing = true;
    this.error = null;

    try {
      // Try to parse as CSV or TSV
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        this.error = 'File is empty. Please upload a valid CSV file.';
        this.isProcessing = false;
        return;
      }

      // Detect delimiter (comma or tab)
      const firstLine = lines[0];
      const hasComma = firstLine.includes(',');
      const hasTab = firstLine.includes('\t');
      const delimiter = hasTab ? '\t' : ',';

      // Parse headers
      const headers = this.parseCSVLine(firstLine, delimiter);
      const expectedHeaders = ['name', 'sku', 'category', 'sellingPrice', 'costPrice', 'quantity', 'description'];

      // Validate headers
      const normalizedHeaders = headers.map(h => h.toLowerCase().trim().replace(/\s/g, ''));
      const missingHeaders = expectedHeaders.filter(h => !normalizedHeaders.includes(h));

      if (missingHeaders.length > 0) {
        this.error = `Missing required columns: ${missingHeaders.join(', ')}. Expected: ${expectedHeaders.join(', ')}`;
        this.isProcessing = false;
        return;
      }

      // Parse data rows
      const data: any[] = [];
      const errors: { row: number; message: string }[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i], delimiter);
        if (values.length < headers.length) continue;

        const row: any = {};
        headers.forEach((header, index) => {
          const key = header.toLowerCase().trim().replace(/\s/g, '');
          const value = values[index]?.trim() || '';
          row[key] = value;
        });

        // Validate row
        const rowErrors = this.validateRow(row, i + 1);
        if (rowErrors.length > 0) {
          errors.push(...rowErrors);
          continue;
        }

        data.push(row);
      }

      this.parsedData = data;
      this.previewData = data.slice(0, 10); // Show first 10 rows in preview

      if (data.length === 0) {
        this.error = 'No valid rows found in the file. Please check your data.';
      }

      this.isProcessing = false;

      // If data is valid, move to step 2
      if (data.length > 0) {
        this.currentStep = 2;
      }

    } catch (err) {
      console.error('Error parsing file:', err);
      this.error = 'Failed to parse file. Please ensure it is a valid CSV file.';
      this.isProcessing = false;
    }
  }

  private parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result;
  }

  private validateRow(row: any, rowNumber: number): { row: number; message: string }[] {
    const errors: { row: number; message: string }[] = [];

    if (!row.name) {
      errors.push({ row: rowNumber, message: 'Name is required' });
    }

    if (!row.sku) {
      errors.push({ row: rowNumber, message: 'SKU is required' });
    }

    if (!row.sellingprice || isNaN(parseFloat(row.sellingprice)) || parseFloat(row.sellingprice) < 0) {
      errors.push({ row: rowNumber, message: 'Selling price must be a positive number' });
    }

    if (row.costprice && isNaN(parseFloat(row.costprice))) {
      errors.push({ row: rowNumber, message: 'Cost price must be a number' });
    }

    if (row.quantity && isNaN(parseInt(row.quantity))) {
      errors.push({ row: rowNumber, message: 'Quantity must be a number' });
    }

    if (row.category && !this.categories.some(c => c.name.toLowerCase() === row.category.toLowerCase())) {
      // Warning, not error - will use default category
    }

    return errors;
  }

  // ============================================================
  // STEP NAVIGATION
  // ============================================================

  goToStep(step: number): void {
    if (step < 1 || step > this.totalSteps) return;
    if (step > this.currentStep && !this.validateCurrentStep()) return;
    this.currentStep = step;
    this.error = null;
  }

  nextStep(): void {
    if (this.validateCurrentStep()) {
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
        this.error = null;
      }
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.error = null;
    }
  }

  private validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1:
        if (!this.selectedFile) {
          this.error = 'Please select a file to import';
          return false;
        }
        if (this.parsedData.length === 0) {
          this.error = 'No valid data found in the file';
          return false;
        }
        return true;
      default:
        return true;
    }
  }

  // ============================================================
  // IMPORT EXECUTION
  // ============================================================

  executeImport(): void {
    this.isProcessing = true;
    this.error = null;

    const formValue = this.importForm.value;
    const products = this.parsedData.map(row => this.mapRowToProduct(row, formValue));

    // Simulate import process
    setTimeout(() => {
      const total = products.length;
      const successful = Math.floor(total * 0.9); // Simulate 90% success rate
      const failed = total - successful;
      const errors: { row: number; message: string }[] = [];

      // Simulate some errors
      for (let i = 0; i < failed; i++) {
        errors.push({
          row: i + 1,
          message: 'Invalid product data'
        });
      }

      this.importResults = {
        total,
        successful,
        failed,
        errors
      };

      this.isProcessing = false;
      this.currentStep = 3;
    }, 1500);
  }

  private mapRowToProduct(row: any, formValue: any): Partial<Product> {
    const category = this.categories.find(c => c.name.toLowerCase() === row.category?.toLowerCase());
    const unit = this.measurementUnits.find(u => u.name === (formValue.defaultUnit || 'pcs'));

    return {
      name: row.name,
      sku: row.sku,
      description: row.description || '',
      category: category?.id || formValue.defaultCategory || 'Uncategorized',
      unitOfMeasure: unit?.id as any || 'EACH',
      sellingPrice: parseFloat(row.sellingprice) || 0,
      costPrice: parseFloat(row.costprice) || 0,
      stockQuantity: parseInt(row.quantity) || 0,
      status: (parseInt(row.quantity) || 0) > 0 ? 'ACTIVE' as any : 'OUT_OF_STOCK' as any,
      supplierIds: []
    };
  }

  // ============================================================
  // NAVIGATION
  // ============================================================

  goBack(): void {
    this.cancelled.emit();
    if (!this.cancelled.observed) {
      this.navigateToProducts();
    }
  }

  finishImport(): void {
    this.completed.emit(this.parsedData.map(row => this.mapRowToProduct(row, this.importForm.value)) as Product[]);
    if (!this.completed.observed) {
      this.navigateToProducts();
    }
  }

  /** Falls back to the product list when nothing is listening to completed/cancelled — this component is currently only ever routed to directly, never embedded. */
  private navigateToProducts(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate(['/commerce/inventory', uuid]);
    } else {
      this.router.navigate(['/commerce/inventory']);
    }
  }

  // ============================================================
  // UTILITY HELPERS
  // ============================================================

  getStepStatus(step: number): 'complete' | 'current' | 'incomplete' {
    if (step < this.currentStep) return 'complete';
    if (step === this.currentStep) return 'current';
    return 'incomplete';
  }

  getFileSize(size: number): string {
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  }

  formatCurrency(value: number): string {
    if (!value) return '₦0';
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  getColumnName(key: string): string {
    const map: Record<string, string> = {
      'name': 'Product Name',
      'sku': 'SKU',
      'category': 'Category',
      'sellingprice': 'Selling Price',
      'costprice': 'Cost Price',
      'quantity': 'Quantity',
      'description': 'Description'
    };
    return map[key] || key;
  }

  isStepValid(step: number): boolean {
    switch (step) {
      case 1:
        return !!this.selectedFile && this.parsedData.length > 0;
      default:
        return true;
    }
  }

  getSuccessRate(): number {
    if (!this.importResults || this.importResults.total === 0) return 0;
    return (this.importResults.successful / this.importResults.total) * 100;
  }
}