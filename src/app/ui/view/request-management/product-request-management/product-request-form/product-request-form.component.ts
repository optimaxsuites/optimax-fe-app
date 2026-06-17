import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ProcurementRequestService } from '../../../../service/procurement-request-management/product-request-management/procurement-request.service';
import { VendorService } from '../../../../service/vendor-portal/vendor.service';
import { ApprovalService } from '../../../../service/approval-inbox/approval.service';
import { Attachment } from '../../../../domain/procurement-request/product-requests/product-requests.dto';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-product-request-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './product-request-form.component.html',
  styleUrls: ['./product-request-form.component.scss'],
})
export class ProductRequestFormComponent implements OnInit, OnDestroy {
  // ── State ──────────────────────────────────────────────────────────────────
  mainForm!: FormGroup;
  itemForm!: FormGroup;

  isSubmitting = false;
  currentStep = 1;
  totalSteps = 4;

  // Cart
  cartItems: CartItem[] = [];
  editingItemIndex: number | null = null;
  showItemModal = false;

  // Per-item file uploads (held in modal until saved to cart)
  modalImages: File[] = [];
  modalImagePreviews: string[] = [];
  modalDocuments: File[] = [];

  // Vendors
  availableVendors: any[] = [];
  selectedVendorIds: string[] = [];
  searchVendorTerm = '';

  // Dates
  minExpiryDate = '';

  // Options
  currencies = ['NGN', 'EUR', 'GBP', 'USD', 'KES', 'ZAR'];

  savedLocations = [
    { id: 'LOC1', name: 'Head Office',   address: 'Lekki Phase 1, Lagos' },
    { id: 'LOC2', name: 'Branch Office', address: 'Ikeja, Lagos' },
  ];

  customDeliveryLocation = '';

  private destroy$ = new Subject<void>();

  // ── Constructor ────────────────────────────────────────────────────────────
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private procurementService: ProcurementRequestService,
    private vendorService: VendorService,
    private approvalService: ApprovalService,
  ) {
    this.mainForm = this.fb.group({
      orderName:                ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      projectName:              [''],
      departmentName:           [''],
      masterDeliveryLocation:   ['', Validators.required],
      masterDeliveryDeadline:   ['', Validators.required],
      masterSpecialInstructions:['', Validators.maxLength(1000)],
      rfqExpiryDate:            ['', Validators.required],
      vendorTargetingType:      ['ALL_VENDORS', Validators.required],
    });

    this.itemForm = this.fb.group({
      productName:       ['', [Validators.required, Validators.minLength(3)]],
      description:       ['', Validators.required],
      quantity:          [1,  [Validators.required, Validators.min(1)]],
      budget:            ['', [Validators.required, Validators.min(0.01)]],
      currency:          ['NGN'],
      deliveryLocation:  [''],
      specialInstructions:[''],
    });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadVendors();
    this.setMinExpiryDate();
    this.setupLocationListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Vendor loading ─────────────────────────────────────────────────────────
  private loadVendors(): void {
    this.vendorService
      .getApprovedVendors()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (vendors: any[]) => (this.availableVendors = vendors),
        error: () => {
          // Fallback mock data
          this.availableVendors = [
            { id: 'VEND-001', name: 'Furniture Hub Ltd',    category: 'Furniture',    rating: 4.5 },
            { id: 'VEND-002', name: 'Tech Solutions NG',    category: 'Electronics',  rating: 4.8 },
            { id: 'VEND-003', name: 'Office Supplies NG',   category: 'Stationery',   rating: 4.2 },
            { id: 'VEND-004', name: 'Global Logistics',     category: 'Logistics',    rating: 4.6 },
            { id: 'VEND-005', name: 'Fashion World',        category: 'Apparel',      rating: 4.3 },
          ];
        },
      });
  }

  // ── Date helpers ───────────────────────────────────────────────────────────
  private setMinExpiryDate(): void {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.minExpiryDate = tomorrow.toISOString().split('T')[0];
  }

  get today(): string {
    return new Date().toISOString().split('T')[0];
  }

  // ── Location listener ──────────────────────────────────────────────────────
  private setupLocationListener(): void {
    this.mainForm
      .get('masterDeliveryLocation')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (value === 'CUSTOM') this.customDeliveryLocation = '';
      });
  }

  // ── Cart item management ───────────────────────────────────────────────────
  openAddItemModal(): void {
    this.editingItemIndex = null;
    this.itemForm.reset({
      productName: '', description: '', quantity: 1,
      budget: '', currency: 'NGN', deliveryLocation: '', specialInstructions: '',
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
      productName:        item.productName,
      description:        item.description,
      quantity:           item.quantity,
      budget:             item.budget,
      currency:           item.currency,
      deliveryLocation:   item.deliveryLocation,
      specialInstructions:item.specialInstructions,
    });
    this.modalImages        = [...item.images];
    this.modalImagePreviews = [...item.imagePreviews];
    this.modalDocuments     = [...item.documents];
    this.showItemModal = true;
  }

  saveItemToCart(): void {
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }

    const v = this.itemForm.value;
    const item: CartItem = {
      id: this.editingItemIndex !== null
        ? this.cartItems[this.editingItemIndex].id
        : Math.random().toString(36).substring(2, 11),
      productName:        v.productName,
      description:        v.description,
      quantity:           v.quantity,
      budget:             v.budget,
      currency:           v.currency,
      deliveryLocation:   v.deliveryLocation || '',
      specialInstructions:v.specialInstructions,
      isEditing:          false,
      images:             [...this.modalImages],
      imagePreviews:      [...this.modalImagePreviews],
      documents:          [...this.modalDocuments],
    };

    if (this.editingItemIndex !== null) {
      this.cartItems[this.editingItemIndex] = item;
    } else {
      this.cartItems.push(item);
    }

    this.showItemModal = false;
    this.editingItemIndex = null;
  }

  removeItem(index: number): void {
    if (confirm('Remove this item from your order?')) {
      this.cartItems.splice(index, 1);
    }
  }

  getTotalBudget(): number {
    return this.cartItems.reduce((sum, it) => sum + it.budget, 0);
  }

  getTotalQuantity(): number {
    return this.cartItems.reduce((sum, it) => sum + it.quantity, 0);
  }

  // ── Vendor targeting ───────────────────────────────────────────────────────
  toggleVendorSelection(vendorId: string): void {
    const idx = this.selectedVendorIds.indexOf(vendorId);
    if (idx > -1) this.selectedVendorIds.splice(idx, 1);
    else          this.selectedVendorIds.push(vendorId);
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
    return this.availableVendors.filter(
      v => v.name.toLowerCase().includes(term) || v.category.toLowerCase().includes(term),
    );
  }

  // ── Step navigation ────────────────────────────────────────────────────────
  nextStep(): void {
    if (!this.validateCurrentStep()) return;
    if (this.currentStep < this.totalSteps) this.currentStep++;
  }

  previousStep(): void {
    if (this.currentStep > 1) this.currentStep--;
  }

  private validateCurrentStep(): boolean {
    if (this.currentStep === 1) {
      if (this.cartItems.length === 0) {
        alert('Add at least one item to your order before continuing.');
        return false;
      }
    }

    if (this.currentStep === 2) {
      const fields: [string, string][] = [
        ['orderName',               'Enter an order name (min 3 characters).'],
        ['masterDeliveryLocation',  'Select a delivery location.'],
        ['masterDeliveryDeadline',  'Set a delivery deadline.'],
        ['rfqExpiryDate',           'Set an RFQ expiry date for vendors.'],
      ];
      for (const [field, msg] of fields) {
        if (this.mainForm.get(field)?.invalid) {
          this.mainForm.get(field)?.markAsTouched();
          alert(msg);
          return false;
        }
      }
    }

    return true;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  onSubmit(): void {
    if (this.cartItems.length === 0) {
      alert('Add items to your order before submitting.');
      return;
    }

    if (this.mainForm.invalid) {
      this.mainForm.markAllAsTouched();
      alert('Complete all required fields before submitting.');
      return;
    }

    if (
      this.mainForm.get('vendorTargetingType')?.value === 'SELECTED_VENDORS' &&
      this.selectedVendorIds.length === 0
    ) {
      alert('Select at least one vendor to receive this RFQ.');
      return;
    }

    this.isSubmitting = true;
    const fv = this.mainForm.value;

    const orderItems = this.cartItems.map(item => {
      const attachments: Attachment[] = [
        ...item.imagePreviews.map((preview, i) => ({
          id:         `ATT-IMG-${Date.now()}-${i}`,
          fileName:   item.images[i]?.name ?? `image-${i + 1}.jpg`,
          fileUrl:    preview,
          uploadedAt: new Date(),
        })),
        ...item.documents.map((doc, i) => ({
          id:         `ATT-DOC-${Date.now()}-${i}`,
          fileName:   doc.name,
          fileUrl:    URL.createObjectURL(doc),
          uploadedAt: new Date(),
        })),
      ];

      return {
        id:                  item.id,
        productName:         item.productName,
        description:         item.description,
        quantity:            item.quantity,
        budget:              item.budget,
        currency:            item.currency,
        deliveryLocation:    item.deliveryLocation || fv.masterDeliveryLocation,
        specialInstructions: item.specialInstructions,
        attachments,
      };
    });

    const orderData = {
      orderName:                  fv.orderName,
      customerId:                 'CUST-001',
      customerName:               'John Doe Enterprises',
      projectName:                fv.projectName ?? '',
      departmentName:             fv.departmentName ?? '',
      items:                      orderItems,
      totalBudget:                this.getTotalBudget(),
      currency:                   'NGN',
      masterDeliveryLocation:
        fv.masterDeliveryLocation === 'CUSTOM'
          ? this.customDeliveryLocation
          : fv.masterDeliveryLocation,
      masterDeliveryDeadline:     new Date(fv.masterDeliveryDeadline),
      masterSpecialInstructions:  fv.masterSpecialInstructions,
      selectedVendors:            fv.vendorTargetingType === 'SELECTED_VENDORS' ? this.selectedVendorIds : [],
      rfqExpiryDate:              new Date(fv.rfqExpiryDate),
      vendorTargetingType:        fv.vendorTargetingType,
      status:                     'PENDING_APPROVAL',
    };

    this.procurementService.createMasterOrder(orderData).subscribe({
      next: (response: { id: string }) => {
        this.createApprovalRequest(response.id, orderData);
      },
      error: (err: any) => {
        console.error('Error creating order:', err);
        this.isSubmitting = false;
        alert('Failed to create order. Please try again.');
      },
    });
  }

  // ── Approval request ───────────────────────────────────────────────────────
  private createApprovalRequest(orderId: string, orderData: any): void {
    const approvalData = {
      requestId:           orderId,
      requestType:         'ORDER',
      requestTitle:        orderData.orderName,
      requesterId:         'CUST-001',
      requesterName:       'John Doe Enterprises',
      requesterDepartment: this.getUserDepartment(),
      budget:              orderData.totalBudget,
      currency:            orderData.currency,
      items:               orderData.items.map((item: any, i: number) => ({
        id:          String(i + 1),
        productName: item.productName,
        quantity:    item.quantity,
        budget:      item.budget,
        attachments: item.attachments,
      })),
      urgency:             this.calculateUrgency(orderData.masterDeliveryDeadline),
      approvals:           this.getApprovalLevels(orderData.totalBudget),
      vendorTargetingType: orderData.vendorTargetingType,
      selectedVendors:     orderData.selectedVendors,
    };

    this.approvalService.createApprovalRequest(approvalData).subscribe({
      next: () => {
        this.isSubmitting = false;
        alert(`Order "${orderData.orderName}" submitted for approval. Vendors will be notified once approved.`);
        this.router.navigate(['/commerce/requests']);
      },
      error: (err: any) => {
        console.error('Error creating approval request:', err);
        this.isSubmitting = false;
        alert('Order created but approval setup failed. Please contact support.');
        this.router.navigate(['/commerce/requests']);
      },
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────
  private calculateUrgency(deadline: Date): string {
    if (!deadline) return 'MEDIUM';
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
    if (days <=  3) return 'URGENT';
    if (days <=  7) return 'HIGH';
    if (days <= 14) return 'MEDIUM';
    return 'LOW';
  }

  private getApprovalLevels(budget: number): any[] {
    return [{ level: 1, approverRole: 'Manager', required: true }];
  }

  private getUserDepartment(): string {
    return 'Procurement';
  }

  // ── Public helpers ─────────────────────────────────────────────────────────
  formatCurrency(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency', currency, maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${currency} ${amount}`;
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }

  isFieldInvalid(field: string): boolean {
    const c = this.mainForm.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  cancel(): void {
    const dirty = this.cartItems.length > 0 || this.mainForm.dirty;
    if (!dirty || confirm('You have unsaved changes. Leave anyway?')) {
      this.router.navigate(['/commerce/requests']);
    }
  }

  // ── Image upload handlers ──────────────────────────────────────────────────
  onModalImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.addModalImages(Array.from(input.files));
  }

  onModalImageDropped(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files) this.addModalImages(Array.from(files));
  }

  private addModalImages(files: File[]): void {
    const MAX = 10 * 1024 * 1024;
    for (const file of files) {
      if (!file.type.startsWith('image/')) { alert(`${file.name} is not an image file.`); continue; }
      if (file.size > MAX)                 { alert(`${file.name} exceeds 10 MB.`);        continue; }
      const reader = new FileReader();
      reader.onload = e => {
        this.modalImages.push(file);
        this.modalImagePreviews.push(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  removeModalImage(index: number): void {
    this.modalImages.splice(index, 1);
    this.modalImagePreviews.splice(index, 1);
  }

  // ── Document upload handlers ───────────────────────────────────────────────
  onModalDocSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.addModalDocs(Array.from(input.files));
  }

  onModalDocDropped(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files) this.addModalDocs(Array.from(files));
  }

  private addModalDocs(files: File[]): void {
    const MAX = 10 * 1024 * 1024;
    for (const file of files) {
      if (file.size > MAX) { alert(`${file.name} exceeds 10 MB.`); continue; }
      this.modalDocuments.push(file);
    }
  }

  removeModalDoc(index: number): void {
    this.modalDocuments.splice(index, 1);
  }
  getVendorInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .substring(0, 2);
}
}