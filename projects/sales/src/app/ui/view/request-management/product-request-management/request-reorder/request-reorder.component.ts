// src/app/ui/view/procurement-request-management/request-reorder/request-reorder.component.ts

import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ProcurementRequestService } from '../../../../service/procurement-request-management/product-request-management/procurement-request.service';
import { ProcurementRequest } from '../../../../domain/procurement-request/product-requests/product-requests.dto';

export interface ReorderItem {
  originalRequestId: string;
  productName: string;
  description: string;
  quantity: number;
  budget: number;
  currency: string;
  deliveryLocation: string;
  specialInstructions: string;
  quantityMultiplier: number;
  adjustments: ReorderAdjustment[];
}

export interface ReorderAdjustment {
  field: string;
  originalValue: any;
  newValue: any;
  reason: string;
}

export interface ReorderResult {
  success: boolean;
  newRequestId: string;
  message: string;
}

@Component({
  selector: 'app-request-reorder',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './request-reorder.component.html',
  styleUrls: ['./request-reorder.component.scss']
})
export class RequestReorderComponent implements OnInit, OnDestroy {
  
  @Input() originalRequest: ProcurementRequest | null = null;
  @Input() originalRequestId: string = '';
  @Output() reorderComplete = new EventEmitter<ReorderResult>();
  @Output() cancelled = new EventEmitter<void>();
  
  reorderForm: FormGroup;
  isSubmitting = false;
  isLoading = true;
  currentStep = 1;
  totalSteps = 3;
  
  // Reorder data
  reorderItems: ReorderItem[] = [];
  selectedVendorId: string = '';
  selectedVendorName: string = '';
  
  // Quantity multiplier options
  multiplierOptions = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
  customMultiplier: number = 1;
  
  // Delivery location options
  savedLocations: { id: string; name: string; address: string }[] = [];
  useSavedLocation = false;
  selectedSavedLocationId = '';
  
  // Adjustments made
  adjustments: ReorderAdjustment[] = [];
  
  // Preview mode
  showPreview = false;
  reorderResult: ReorderResult | null = null;
  
  // Available budgets
  availableBudget = 50000;
  totalCost = 0;
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private procurementRequestService: ProcurementRequestService
  ) {
    this.reorderForm = this.fb.group({
      quantityMultiplier: [1, [Validators.required, Validators.min(0.1), Validators.max(10)]],
      updateBudget: [true],
      updateDeliveryLocation: [false],
      updateSpecialInstructions: [false],
      customDeliveryLocation: [''],
      customInstructions: [''],
      useSameVendor: [true],
      reasonForReorder: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]]
    });
  }

  ngOnInit(): void {
    if (!this.originalRequestId) {
      this.originalRequestId = this.route.snapshot.paramMap.get('id') || '';
    }
    this.loadOriginalRequest();
    this.loadSavedLocations();
    this.setupFormListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadOriginalRequest(): void {
    this.isLoading = true;
    
    if (this.originalRequest) {
      this.processOriginalRequest(this.originalRequest);
    } else if (this.originalRequestId) {
      this.procurementRequestService.getRequestById(this.originalRequestId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (request) => {
            if (request) {
              this.processOriginalRequest(request);
            }
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Error loading request:', error);
            this.isLoading = false;
          }
        });
    }
  }

  private processOriginalRequest(request: ProcurementRequest): void {
    // Keep a local reference so we can reuse metadata when creating reorder requests.
    this.originalRequest = request;

    const reorderItem: ReorderItem = {
      originalRequestId: request.id,
      productName: request.productName,
      description: request.description,
      quantity: request.quantity,
      budget: request.budget,
      currency: request.currency,
      deliveryLocation: request.deliveryLocation,
      specialInstructions: '',
      quantityMultiplier: 1,
      adjustments: []
    };
    
    this.reorderItems = [reorderItem];
    this.totalCost = request.budget;
    this.selectedVendorId = request.selectedVendorId || '';
    this.selectedVendorName = request.selectedVendorName || '';
    
    this.isLoading = false;
  }

  private loadSavedLocations(): void {
    // Mock saved locations - replace with actual service
    this.savedLocations = [
      { id: 'LOC1', name: 'Head Office', address: 'Lekki Phase 1, Lagos' },
      { id: 'LOC2', name: 'Branch Office', address: 'Ikeja, Lagos' },
      { id: 'LOC3', name: 'Warehouse', address: 'Apapa, Lagos' }
    ];
  }

  private setupFormListeners(): void {
    this.reorderForm.get('quantityMultiplier')?.valueChanges.subscribe(multiplier => {
      this.updateQuantitiesAndBudget(multiplier);
    });
    
    this.reorderForm.get('updateBudget')?.valueChanges.subscribe(update => {
      if (!update) {
        this.reorderForm.get('quantityMultiplier')?.disable();
      } else {
        this.reorderForm.get('quantityMultiplier')?.enable();
      }
    });
  }

  private updateQuantitiesAndBudget(multiplier: number): void {
    if (!this.reorderItems.length) return;
    
    const originalBudget = this.reorderItems[0].budget;
    const originalQuantity = this.reorderItems[0].quantity;
    
    const newQuantity = originalQuantity * multiplier;
    const newBudget = originalBudget * multiplier;
    
    this.reorderItems[0].quantity = newQuantity;
    this.reorderItems[0].quantityMultiplier = multiplier;
    
    if (this.reorderForm.get('updateBudget')?.value) {
      this.reorderItems[0].budget = newBudget;
      this.totalCost = newBudget;
    } else {
      this.totalCost = originalBudget;
    }
  }

  setMultiplier(value: number): void {
    this.customMultiplier = value;
    this.reorderForm.patchValue({ quantityMultiplier: value });
  }

  useCustomMultiplier(): void {
    this.reorderForm.patchValue({ quantityMultiplier: this.customMultiplier });
  }

  onSavedLocationChange(): void {
    const location = this.savedLocations.find(l => l.id === this.selectedSavedLocationId);
    if (location) {
      this.reorderItems[0].deliveryLocation = location.address;
      this.adjustments.push({
        field: 'deliveryLocation',
        originalValue: this.reorderItems[0].deliveryLocation,
        newValue: location.address,
        reason: 'Changed delivery location'
      });
    }
  }

  updateDeliveryLocation(): void {
    const customLocation = this.reorderForm.get('customDeliveryLocation')?.value;
    if (customLocation) {
      this.reorderItems[0].deliveryLocation = customLocation;
      this.adjustments.push({
        field: 'deliveryLocation',
        originalValue: this.reorderItems[0].deliveryLocation,
        newValue: customLocation,
        reason: 'Custom delivery location'
      });
    }
  }

  updateInstructions(): void {
    const instructions = this.reorderForm.get('customInstructions')?.value;
    if (instructions) {
      this.reorderItems[0].specialInstructions = instructions;
      this.adjustments.push({
        field: 'specialInstructions',
        originalValue: this.reorderItems[0].specialInstructions,
        newValue: instructions,
        reason: 'Updated special instructions'
      });
    }
  }

  nextStep(): void {
    if (this.currentStep === 1 && !this.reorderForm.get('reasonForReorder')?.value) {
      alert('Please provide a reason for reordering');
      return;
    }
    
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  togglePreview(): void {
    this.showPreview = !this.showPreview;
  }

  onSubmit(): void {
    if (this.reorderForm.invalid) {
      this.reorderForm.markAllAsTouched();
      return;
    }
    
    if (this.totalCost > this.availableBudget) {
      alert(`Insufficient budget! Required: ${this.totalCost}, Available: ${this.availableBudget}`);
      return;
    }
    
    this.isSubmitting = true;
    
    const reorderData = {
      originalRequestId: this.originalRequestId,
      productName: this.reorderItems[0].productName,
      description: this.reorderItems[0].description,
      quantity: Math.round(this.reorderItems[0].quantity),
      budget: this.reorderItems[0].budget,
      currency: this.reorderItems[0].currency,
      deliveryLocation: this.reorderItems[0].deliveryLocation,
      specialInstructions: this.reorderItems[0].specialInstructions,
      preferredVendorId: this.reorderForm.get('useSameVendor')?.value ? this.selectedVendorId : undefined,
      reasonForReorder: this.reorderForm.get('reasonForReorder')?.value,
      adjustments: this.adjustments,
      quantityMultiplier: this.reorderForm.get('quantityMultiplier')?.value,
      originalValues: {
        budget: this.reorderItems[0].budget,
        quantity: this.reorderItems[0].quantity
      }
    };

    const createRequestPayload = {
      customerId: this.originalRequest?.customerId || 'CUST-001',
      customerName: this.originalRequest?.customerName || 'Unknown Customer',
      productName: reorderData.productName,
      description: reorderData.description,
      quantity: reorderData.quantity,
      budget: reorderData.budget,
      currency: reorderData.currency,
      deliveryLocation: reorderData.deliveryLocation,
      // Keep deadline aligned with the original request when available.
      deliveryDeadline: this.originalRequest?.deliveryDeadline || new Date(),
      // Extra metadata for backend compatibility if needed.
      reasonForReorder: reorderData.reasonForReorder,
      adjustments: reorderData.adjustments,
      quantityMultiplier: reorderData.quantityMultiplier,
      specialInstructions: reorderData.specialInstructions,
      preferredVendorId: reorderData.preferredVendorId
    };

    this.procurementRequestService.createRequest(createRequestPayload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newRequest) => {
          const result: ReorderResult = {
            success: true,
            newRequestId: newRequest.id,
            message: 'Reorder created successfully! Your new request has been submitted.'
          };

          this.isSubmitting = false;
          this.reorderResult = result;
          this.reorderComplete.emit(result);
        },
        error: (error) => {
          console.error('Error creating reorder request:', error);
          this.isSubmitting = false;
          alert('Failed to create reorder request. Please try again.');
        }
      });
  }

  closeModal(): void {
    this.cancelled.emit();
  }

  viewNewRequest(requestId: string): void {
    this.router.navigate(['/admin/sales/commerce/requests', requestId]);
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
  }

  getBudgetStatusClass(): string {
    if (this.totalCost > this.availableBudget) return 'exceeded';
    if (this.totalCost > this.availableBudget * 0.8) return 'warning';
    return 'good';
  }

  getBudgetStatusMessage(): string {
    if (this.totalCost > this.availableBudget) {
      return `Exceeds budget by ${this.formatCurrency(this.totalCost - this.availableBudget, 'NGN')}`;
    }
    if (this.totalCost > this.availableBudget * 0.8) {
      return `Using ${((this.totalCost / this.availableBudget) * 100).toFixed(0)}% of available budget`;
    }
    return `Within budget (${((this.totalCost / this.availableBudget) * 100).toFixed(0)}% used)`;
  }

  getChangedFields(): ReorderAdjustment[] {
    const changes: ReorderAdjustment[] = [];
    
    if (this.reorderForm.get('quantityMultiplier')?.value !== 1) {
      changes.push({
        field: 'quantity',
        originalValue: this.reorderItems[0]?.quantity / this.reorderForm.get('quantityMultiplier')?.value,
        newValue: this.reorderItems[0]?.quantity,
        reason: `Quantity ${this.reorderForm.get('quantityMultiplier')?.value > 1 ? 'increased' : 'decreased'} by ${Math.abs(this.reorderForm.get('quantityMultiplier')?.value - 1) * 100}%`
      });
    }
    
    if (this.reorderForm.get('updateBudget')?.value && this.reorderForm.get('quantityMultiplier')?.value !== 1) {
      changes.push({
        field: 'budget',
        originalValue: this.reorderItems[0]?.budget / this.reorderForm.get('quantityMultiplier')?.value,
        newValue: this.reorderItems[0]?.budget,
        reason: `Budget adjusted to match new quantity`
      });
    }
    
    return [...changes, ...this.adjustments];
  }

  getTotalSavings(): number {
    // Calculate if any savings compared to original
    return 0;
  }
}