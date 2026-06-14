import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ProcurementRequestService } from '../../../../service/procurement-request-management/product-request-management/procurement-request.service';
import { VendorService } from '../../../../service/vendor-portal/vendor.service';
import { ApprovalService } from '../../../../service/approval-inbox/approval.service'
import { Attachment } from '../../../../domain/procurement-request/product-requests/product-requests.dto';

interface CartItem {
  id: string;
  productName: string;
  description: string;
  quantity: number;
  budget: number;
  currency: string;
  deliveryLocation: string;
  specialInstructions: string;
  isEditing: boolean;
  images: File[];
  imagePreviews: string[];
  documents: File[];
}

@Component({
  selector: 'app-product-request-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './product-request-form.component.html',
  styleUrls: ['./product-request-form.component.scss']
})
export class ProductRequestFormComponent implements OnInit, OnDestroy {
  
  mainForm: FormGroup;
  isSubmitting = false;
  currentStep = 1;
  totalSteps = 4;
  
  // Cart items
  cartItems: CartItem[] = [];
  editingItemIndex: number | null = null;
  showItemModal = false;

  // Modal file uploads (per item)
  modalImages: File[] = [];
  modalImagePreviews: string[] = [];
  modalDocuments: File[] = [];
  
  // Form for adding/editing items
  itemForm: FormGroup;
  
  // Available vendors (for vendor targeting)
  availableVendors: any[] = [];
  selectedVendorIds: string[] = [];
  searchVendorTerm = '';
  showVendorSelector = false;
  
  // RFQ expiry
  minExpiryDate: string = '';
  
  // Currency options
  currencies = ['NGN', 'EUR', 'GBP', 'USD', 'KES', 'ZAR'];
  
  // Delivery locations (saved)
  savedLocations = [
    { id: 'LOC1', name: 'Head Office', address: 'Lekki Phase 1, Lagos' },
    { id: 'LOC2', name: 'Branch Office', address: 'Ikeja, Lagos' }
  ];
  
  selectedMasterLocation = '';
  customDeliveryLocation = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private procurementService: ProcurementRequestService,
    private vendorService: VendorService,
    private approvalService: ApprovalService
  ) {
    // Main order form
    this.mainForm = this.fb.group({
      orderName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      projectName: [''],
      departmentName: [''],
      masterDeliveryLocation: ['', Validators.required],
      masterDeliveryDeadline: ['', Validators.required],
      masterSpecialInstructions: ['', Validators.maxLength(1000)],
      rfqExpiryDate: ['', Validators.required],
      vendorTargetingType: ['ALL_VENDORS', Validators.required] // ALL_VENDORS or SELECTED_VENDORS
    });
    
    // Item form for modal
    this.itemForm = this.fb.group({
      productName: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      budget: ['', [Validators.required, Validators.min(0.01)]],
      currency: ['NGN'],
      deliveryLocation: [''],
      specialInstructions: ['']
    });
  }

  ngOnInit(): void {
    this.loadVendors();
    this.setMinExpiryDate();
    this.setupLocationListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadVendors(): void {
    this.vendorService.getApprovedVendors().subscribe({
      next: (vendors: any[]) => {
        this.availableVendors = vendors;
      },
      error: (error: any) => {
        console.error('Error loading vendors:', error);
        // Mock data for now
        this.availableVendors = [
          { id: 'VEND-001', name: 'Furniture Hub Ltd', category: 'Furniture', rating: 4.5 },
          { id: 'VEND-002', name: 'Tech Solutions NG', category: 'Electronics', rating: 4.8 },
          { id: 'VEND-003', name: 'Office Supplies NG', category: 'Stationery', rating: 4.2 },
          { id: 'VEND-004', name: 'Global Logistics', category: 'Logistics', rating: 4.6 },
          { id: 'VEND-005', name: 'Fashion World', category: 'Apparel', rating: 4.3 }
        ];
      }
    });
  }

  private setMinExpiryDate(): void {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    this.minExpiryDate = today.toISOString().split('T')[0];
  }

  private setupLocationListener(): void {
    this.mainForm.get('masterDeliveryLocation')?.valueChanges.subscribe(value => {
      if (value === 'CUSTOM') {
        this.customDeliveryLocation = '';
      }
    });
  }

  // Cart Item Management
  openAddItemModal(): void {
    this.editingItemIndex = null;
    this.itemForm.reset({
      productName: '',
      description: '',
      quantity: 1,
      budget: '',
      currency: 'NGN',
      deliveryLocation: '',
      specialInstructions: ''
    });
    this.modalImages = [];
    this.modalImagePreviews = [];
    this.modalDocuments = [];
    this.showItemModal = true;
  }

  editItem(index: number): void {
    this.editingItemIndex = index;
    const item = this.cartItems[index];
    this.itemForm.patchValue({
      productName: item.productName,
      description: item.description,
      quantity: item.quantity,
      budget: item.budget,
      currency: item.currency,
      deliveryLocation: item.deliveryLocation,
      specialInstructions: item.specialInstructions
    });
    this.modalImages = [...item.images];
    this.modalImagePreviews = [...item.imagePreviews];
    this.modalDocuments = [...item.documents];
    this.showItemModal = true;
  }

  saveItemToCart(): void {
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }

    const formValue = this.itemForm.value;
    const newItem: CartItem = {
      id: this.editingItemIndex !== null ? this.cartItems[this.editingItemIndex].id : Math.random().toString(36).substr(2, 9),
      productName: formValue.productName,
      description: formValue.description,
      quantity: formValue.quantity,
      budget: formValue.budget,
      currency: formValue.currency,
      deliveryLocation: formValue.deliveryLocation || this.mainForm.get('masterDeliveryLocation')?.value || '',
      specialInstructions: formValue.specialInstructions,
      isEditing: false,
      images: [...this.modalImages],
      imagePreviews: [...this.modalImagePreviews],
      documents: [...this.modalDocuments]
    };

    if (this.editingItemIndex !== null) {
      this.cartItems[this.editingItemIndex] = newItem;
    } else {
      this.cartItems.push(newItem);
    }

    this.showItemModal = false;
    this.itemForm.reset();
    this.editingItemIndex = null;
  }

  removeItem(index: number): void {
    if (confirm('Remove this item from your order?')) {
      this.cartItems.splice(index, 1);
    }
  }

  getTotalBudget(): number {
    return this.cartItems.reduce((sum, item) => sum + item.budget, 0);
  }

  getTotalQuantity(): number {
    return this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  // Vendor Targeting
  toggleVendorSelector(): void {
    this.showVendorSelector = !this.showVendorSelector;
  }

  toggleVendorSelection(vendorId: string): void {
    if (this.selectedVendorIds.includes(vendorId)) {
      this.selectedVendorIds = this.selectedVendorIds.filter(id => id !== vendorId);
    } else {
      this.selectedVendorIds.push(vendorId);
    }
  }

  isVendorSelected(vendorId: string): boolean {
    return this.selectedVendorIds.includes(vendorId);
  }

  selectAllVendors(): void {
    this.selectedVendorIds = this.availableVendors.map(v => v.id);
  }

  deselectAllVendors(): void {
    this.selectedVendorIds = [];
  }

  getFilteredVendors(): any[] {
    if (!this.searchVendorTerm) return this.availableVendors;
    const term = this.searchVendorTerm.toLowerCase();
    return this.availableVendors.filter(v => 
      v.name.toLowerCase().includes(term) || 
      v.category.toLowerCase().includes(term)
    );
  }

  // Navigation
  nextStep(): void {
    if (this.currentStep === 1 && this.cartItems.length === 0) {
      alert('Please add at least one item to your order');
      return;
    }
    if (this.currentStep === 2 && this.mainForm.get('orderName')?.invalid) {
      this.mainForm.get('orderName')?.markAsTouched();
      alert('Please enter an order name');
      return;
    }
    if (this.currentStep === 2 && this.mainForm.get('masterDeliveryLocation')?.invalid) {
      alert('Please select a delivery location');
      return;
    }
    if (this.currentStep === 2 && this.mainForm.get('masterDeliveryDeadline')?.invalid) {
      alert('Please select a delivery deadline');
      return;
    }
    if (this.currentStep === 2 && this.mainForm.get('rfqExpiryDate')?.invalid) {
      alert('Please set an RFQ expiry date for vendors');
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

  onSubmit(): void {
  if (this.cartItems.length === 0) {
    alert('Please add items to your order');
    return;
  }

  if (this.mainForm.invalid) {
    this.mainForm.markAllAsTouched();
    alert('Please complete all required fields');
    return;
  }

  if (this.mainForm.get('vendorTargetingType')?.value === 'SELECTED_VENDORS' && this.selectedVendorIds.length === 0) {
    alert('Please select at least one vendor to receive this RFQ');
    return;
  }

  this.isSubmitting = true;

  const formValue = this.mainForm.value;
  
  // Build items WITH attachments
  const orderItems = this.cartItems.map(item => {
    // Convert images to Attachment format
    const itemAttachments: Attachment[] = [];
    
    // Add images as attachments
    item.imagePreviews.forEach((preview, idx) => {
      itemAttachments.push({
        id: `ATT-${Date.now()}-${idx}`,
        fileName: item.images[idx]?.name || `image-${idx + 1}.jpg`,
        fileUrl: preview,
        uploadedAt: new Date()
      });
    });
    
    // Add documents as attachments
    item.documents.forEach((doc, idx) => {
      itemAttachments.push({
        id: `ATT-DOC-${Date.now()}-${idx}`,
        fileName: doc.name,
        fileUrl: URL.createObjectURL(doc),
        uploadedAt: new Date()
      });
    });
    
    return {
      id: item.id,
      productName: item.productName,
      description: item.description,
      quantity: item.quantity,
      budget: item.budget,
      currency: item.currency,
      deliveryLocation: item.deliveryLocation || formValue.masterDeliveryLocation,
      specialInstructions: item.specialInstructions,
      attachments: itemAttachments
    };
  });
  
  const orderData = {
    orderName: formValue.orderName,
    customerId: 'CUST-001',
    customerName: 'John Doe Enterprises',
    projectName: formValue.projectName || '',
    departmentName: formValue.departmentName || '',
    items: orderItems,
    totalBudget: this.getTotalBudget(),
    currency: 'NGN',
    masterDeliveryLocation: formValue.masterDeliveryLocation === 'CUSTOM' ? this.customDeliveryLocation : formValue.masterDeliveryLocation,
    masterDeliveryDeadline: new Date(formValue.masterDeliveryDeadline),
    masterSpecialInstructions: formValue.masterSpecialInstructions,
    selectedVendors: formValue.vendorTargetingType === 'SELECTED_VENDORS' ? this.selectedVendorIds : [],
    rfqExpiryDate: new Date(formValue.rfqExpiryDate),
    vendorTargetingType: formValue.vendorTargetingType,  // ← ADD THIS
    status: 'PENDING_APPROVAL'
  };

  // Add this right before calling createMasterOrder
console.log('Order items with attachments:', orderItems.map(item => ({
  name: item.productName,
  attachmentCount: item.attachments?.length || 0,
  firstAttachment: item.attachments?.[0]?.fileUrl?.substring(0, 100)
}))); 

  // Submit to service
  this.procurementService.createMasterOrder(orderData).subscribe({
    next: (response: { id: string }) => {
      this.createApprovalRequestForOrder(response.id, orderData);
    },
    error: (error: any) => {
      console.error('Error creating order:', error);
      this.isSubmitting = false;
      alert('Failed to create order. Please try again.');
    }
  });
}

// NEW METHOD: Create approval request for multi-item order
private createApprovalRequestForOrder(orderId: string, orderData: any): void {
  const urgency = this.calculateUrgency(orderData.masterDeliveryDeadline);
  const totalBudget = orderData.totalBudget;
  
  const approvalData = {
    requestId: orderId,
    requestType: 'ORDER',
    requestTitle: orderData.orderName,
    requesterId: 'CUST-001',
    requesterName: 'John Doe Enterprises',
    requesterDepartment: this.getUserDepartment(),
    budget: totalBudget,
    currency: orderData.currency,
    items: orderData.items.map((item: any, index: number) => ({
      id: String(index + 1),
      productName: item.productName,
      quantity: item.quantity,
      budget: item.budget,
      attachments: item.attachments  // ← Include attachments in approval
    })),
    urgency: urgency,
    approvals: this.getApprovalLevels(totalBudget),
    vendorTargetingType: orderData.vendorTargetingType,  // ← ADD THIS
    selectedVendors: orderData.selectedVendors  // ← ADD THIS
  };
  
  this.approvalService.createApprovalRequest(approvalData).subscribe({
    next: (approvalResponse) => {
      this.isSubmitting = false;
      alert(`Order "${orderData.orderName}" submitted for approval! Vendors will be notified once approved.`);
      this.router.navigate(['/commerce/requests']);
    },
    error: (error) => {
      console.error('Error creating approval request:', error);
      this.isSubmitting = false;
      alert('Order created but approval setup failed. Please contact support.');
      this.router.navigate(['/commerce/requests']);
    }
  });
}

// HELPER METHODS (add to your component)
private calculateUrgency(deadline: Date): string {
  if (!deadline) return 'MEDIUM';
  const daysUntilDeadline = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntilDeadline <= 3) return 'URGENT';
  if (daysUntilDeadline <= 7) return 'HIGH';
  if (daysUntilDeadline <= 14) return 'MEDIUM';
  return 'LOW';
}

private getApprovalLevels(budget: number): any[] {
  return [
    { level: 1, approverRole: 'Manager', required: true }
  ];
}

private getUserDepartment(): string {
  // Get from user service / auth
  return 'Procurement';
}

  cancel(): void {
    if (this.cartItems.length > 0 || this.mainForm.dirty) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        this.router.navigate(['/commerce/requests']);
      }
    } else {
      this.router.navigate(['/commerce/requests']);
    }
  }

  // Helper methods
  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Per-item file upload handlers
  onModalImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) { this.addModalImages(Array.from(input.files)); }
  }

  onModalImageDropped(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files) { this.addModalImages(Array.from(files)); }
  }

  private addModalImages(files: File[]): void {
    const maxSize = 10 * 1024 * 1024;
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file.`);
        continue;
      }
      if (file.size > maxSize) { alert(`${file.name} exceeds 10MB`); continue; }
      this.modalImages.push(file);
      const reader = new FileReader();
      reader.onload = (e) => { this.modalImagePreviews.push(e.target?.result as string); };
      reader.readAsDataURL(file);
    }
  }

  removeModalImage(index: number): void {
    this.modalImages.splice(index, 1);
    this.modalImagePreviews.splice(index, 1);
  }

  onModalDocSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) { this.addModalDocs(Array.from(input.files)); }
  }

  onModalDocDropped(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files) { this.addModalDocs(Array.from(files)); }
  }

  private addModalDocs(files: File[]): void {
    const maxSize = 10 * 1024 * 1024;
    for (const file of files) {
      if (file.size > maxSize) { alert(`${file.name} exceeds 10MB`); continue; }
      this.modalDocuments.push(file);
    }
  }

  removeModalDoc(index: number): void {
    this.modalDocuments.splice(index, 1);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.mainForm.get(fieldName);
    return field ? (field.invalid && (field.dirty || field.touched)) : false;
  }

  get today(): string {
    return new Date().toISOString().split('T')[0];
  }
}