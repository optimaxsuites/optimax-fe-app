// src/app/modules/commerce/submodule-a-procurement-request/components/procurement-request-detail/procurement-request-detail.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ProcurementRequestService } from '../../../service/procurement-request-management/procurement-request.service';
import { ProcurementRequest, RequestStatus } from '../../../domain/procurement-request/procurement-request.dto';

@Component({
  selector: 'app-procurement-request-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './procurement-request-detail.component.html',
  styleUrls: ['./procurement-request-detail.component.scss']
})
export class ProcurementRequestDetailComponent implements OnInit, OnDestroy {

  request: ProcurementRequest | null = null;
  isLoading = true;
  showCancelModal = false;
  cancellationReason = '';
  isSubmittingCancel = false;

  // Quotations (from vendors)
  quotations: any[] = [];
  isLoadingQuotations = false;

  // Selected vendor info
  selectedVendor: any = null;

  // Delivery tracking
  deliveryStatus: DeliveryStatus = {
    status: 'pending',
    trackingNumber: null,
    estimatedArrival: null,
    currentLocation: null,
    history: []
  };

  // Timeline data
  timelineEvents: TimelineEvent[] = [];
  
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private procurementRequestService: ProcurementRequestService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    const requestId = this.route.snapshot.paramMap.get('id');
    if (requestId) {
      this.loadRequest(requestId);
      this.loadQuotations(requestId);
      this.loadDeliveryTracking(requestId);
      this.generateTimeline(requestId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadRequest(id: string): void {
    this.isLoading = true;
    this.procurementRequestService.getRequestById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (request) => {
          this.request = request || null;
          this.isLoading = false;
          
          // If vendor selected, load vendor details
          if (this.request?.selectedVendorId) {
            this.loadVendorDetails(this.request.selectedVendorId);
          }
        },
        error: (error) => {
          console.error('Error loading request:', error);
          this.isLoading = false;
        }
      });
  }

  private loadQuotations(requestId: string): void {
    this.isLoadingQuotations = true;
    // Call your quotation service
    // this.quotationService.getQuotationsForRequest(requestId)
    //   .subscribe(quotations => {
    //     this.quotations = quotations;
    //     this.isLoadingQuotations = false;
    //   });
    
    // Mock data for now
    setTimeout(() => {
      this.quotations = [
        {
          id: 'Q-001',
          vendorId: 'VEND-001',
          vendorName: 'Furniture Hub Ltd',
          vendorRating: 4.5,
          amount: 21000,
          currency: 'USD',
          deliveryTimeline: '5-7 business days',
          terms: '30% deposit, 70% upon delivery',
          submittedAt: new Date('2026-05-12'),
          status: 'PENDING'
        },
        {
          id: 'Q-002',
          vendorId: 'VEND-003',
          vendorName: 'Tech Solutions NG',
          vendorRating: 4.8,
          amount: 22500,
          currency: 'USD',
          deliveryTimeline: '3-5 business days',
          terms: 'Net 30',
          submittedAt: new Date('2026-05-13'),
          status: 'PENDING'
        },
        {
          id: 'Q-003',
          vendorId: 'VEND-005',
          vendorName: 'Global Supplies Ltd',
          vendorRating: 4.2,
          amount: 19800,
          currency: 'USD',
          deliveryTimeline: '7-10 business days',
          terms: 'Full payment upon delivery',
          submittedAt: new Date('2026-05-11'),
          status: 'PENDING'
        }
      ];
      this.isLoadingQuotations = false;
    }, 500);
  }

  private loadVendorDetails(vendorId: string): void {
    // Call vendor service
    // this.vendorService.getVendorById(vendorId).subscribe(vendor => {
    //   this.selectedVendor = vendor;
    // });
    
    this.selectedVendor = {
      id: vendorId,
      name: 'Furniture Hub Ltd',
      email: 'sales@furniturehub.com',
      phone: '+234 123 456 789',
      rating: 4.5,
      totalOrders: 127,
      onTimeDelivery: 94
    };
  }

  private loadDeliveryTracking(requestId: string): void {
    // Call tracking service
    // this.trackingService.getDeliveryStatus(requestId).subscribe(status => {
    //   this.deliveryStatus = status;
    // });

    if (this.request?.status === 'DELIVERY_IN_PROGRESS' || this.request?.status === 'DELIVERED') {
      this.deliveryStatus = {
        status: 'in_transit',
        trackingNumber: 'TRK-123456789',
        estimatedArrival: new Date('2026-05-25'),
        currentLocation: 'Sorting Center, Lagos',
        history: [
          { status: 'Order processed', timestamp: new Date('2026-05-18'), location: 'Warehouse' },
          { status: 'Picked up', timestamp: new Date('2026-05-19'), location: 'Vendor Location' },
          { status: 'In transit', timestamp: new Date('2026-05-20'), location: 'Sorting Center, Lagos' }
        ]
      };
    }
  }

  private generateTimeline(requestId: string): void {
    // Generate timeline based on request status and history
    const timeline: TimelineEvent[] = [
      { status: 'REQUEST_CREATED', label: 'Request Created', completed: true, date: this.request?.createdAt, description: 'Your procurement request was submitted' },
      { status: 'VENDORS_NOTIFIED', label: 'Vendors Notified', completed: this.isStatusAtLeast('VENDORS_QUOTING'), date: this.request?.updatedAt, description: 'Registered vendors have been notified' },
      { status: 'QUOTATIONS_RECEIVED', label: 'Quotations Received', completed: this.isStatusAtLeast('VENDOR_SELECTED'), date: undefined, description: 'Vendors have submitted their quotations' },
      { status: 'VENDOR_SELECTED', label: 'Vendor Selected', completed: this.isStatusAtLeast('VENDOR_SELECTED'), date: this.request?.updatedAt, description: `Selected ${this.request?.selectedVendorName || 'a vendor'}` },
      { status: 'LPO_ISSUED', label: 'LPO Issued', completed: this.isStatusAtLeast('LPO_ISSUED'), date: undefined, description: 'Local Purchase Order has been issued' },
      { status: 'PAYMENT_CONFIRMED', label: 'Payment Confirmed', completed: this.isStatusAtLeast('PAYMENT_CONFIRMED'), date: undefined, description: 'Payment has been received and confirmed' },
      { status: 'DELIVERY_IN_PROGRESS', label: 'Delivery in Progress', completed: this.isStatusAtLeast('DELIVERY_IN_PROGRESS'), date: undefined, description: 'Your order is on the way' },
      { status: 'DELIVERED', label: 'Delivered', completed: this.isStatusAtLeast('DELIVERED'), date: undefined, description: 'Order has been delivered' }
    ];
    
    this.timelineEvents = timeline;
  }

  private isStatusAtLeast(status: RequestStatus): boolean {
    const statusOrder: RequestStatus[] = [
      'PENDING', 'VENDORS_QUOTING', 'VENDOR_SELECTED', 'LPO_ISSUED', 
      'PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'DELIVERY_IN_PROGRESS', 'DELIVERED'
    ];
    const currentIndex = statusOrder.indexOf(this.request?.status || 'PENDING');
    const requiredIndex = statusOrder.indexOf(status);
    return currentIndex >= requiredIndex;
  }

  getStatusClass(status: RequestStatus): string {
    const classes: Record<RequestStatus, string> = {
      'PENDING': 'badge-secondary',
      'VENDORS_QUOTING': 'badge-info',
      'VENDOR_SELECTED': 'badge-primary',
      'LPO_ISSUED': 'badge-primary',
      'PAYMENT_PENDING': 'badge-warning',
      'PAYMENT_CONFIRMED': 'badge-success',
      'DELIVERY_IN_PROGRESS': 'badge-info',
      'DELIVERED': 'badge-success',
      'CANCELLED': 'badge-danger'
    };
    return classes[status] || 'badge-secondary';
  }

  getStatusLabel(status: RequestStatus): string {
    const labels: Record<RequestStatus, string> = {
      'PENDING': 'Pending',
      'VENDORS_QUOTING': 'Vendors Quoting',
      'VENDOR_SELECTED': 'Vendor Selected',
      'LPO_ISSUED': 'LPO Issued',
      'PAYMENT_PENDING': 'Payment Pending',
      'PAYMENT_CONFIRMED': 'Payment Confirmed',
      'DELIVERY_IN_PROGRESS': 'Delivery in Progress',
      'DELIVERED': 'Delivered',
      'CANCELLED': 'Cancelled'
    };
    return labels[status] || status;
  }

  canCancel(): boolean {
    if (!this.request) return false;
    const nonCancellableStatuses: RequestStatus[] = ['DELIVERED', 'CANCELLED', 'DELIVERY_IN_PROGRESS'];
    return !nonCancellableStatuses.includes(this.request.status);
  }

  canEdit(): boolean {
    if (!this.request) return false;
    return this.request.status === 'PENDING';
  }

  canMakePayment(): boolean {
    return this.request?.status === 'PAYMENT_PENDING';
  }

  canConfirmDelivery(): boolean {
    return this.request?.status === 'DELIVERY_IN_PROGRESS';
  }

  openCancelModal(): void {
    this.showCancelModal = true;
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
    this.cancellationReason = '';
  }


  editRequest(): void {
    this.router.navigate(['/commerce/requests', this.request?.id, 'edit']);
  }

  confirmCancel(): void {
    if (!this.request || !this.cancellationReason.trim()) return;
    
    this.isSubmittingCancel = true;
    this.procurementRequestService.cancelRequest(this.request.id, this.cancellationReason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedRequest) => {
          this.request = updatedRequest;
          this.isSubmittingCancel = false;
          this.closeCancelModal();
        },
        error: (error) => {
          console.error('Error cancelling request:', error);
          this.isSubmittingCancel = false;
          alert('Failed to cancel request. Please try again.');
        }
      });
  }

  selectVendor(quotation: any): void {
    // Call API to select vendor
    console.log('Selecting vendor:', quotation);
    // After selection, refresh request data
  }

  makePayment(): void {
    // Navigate to payment page
    this.router.navigate(['/commerce/payment', this.request?.id]);
  }

  confirmDelivery(): void {
    // Call API to confirm delivery
    if (confirm('Have you received and confirmed the delivery?')) {
      console.log('Delivery confirmed');
      // Update request status to DELIVERED
    }
  }

  downloadAttachment(attachment: any): void {
    window.open(attachment.fileUrl, '_blank');
  }

  getDaysRemaining(): number | null {
    if (!this.request?.deliveryDeadline) return null;
    const today = new Date();
    const deadline = new Date(this.request.deliveryDeadline);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  getProgressPercentage(): number {
    const statusOrder: RequestStatus[] = [
      'PENDING', 'VENDORS_QUOTING', 'VENDOR_SELECTED', 'LPO_ISSUED', 
      'PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'DELIVERY_IN_PROGRESS', 'DELIVERED'
    ];
    const currentIndex = statusOrder.indexOf(this.request?.status || 'PENDING');
    const totalSteps = statusOrder.length - 1; // Exclude DELIVERED from total for progress
    return (currentIndex / totalSteps) * 100;
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'Pending';
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
  }
}

interface DeliveryHistory {
  status: string;
  timestamp: Date;
  location: string;
}

interface DeliveryStatus {
  status: string;
  trackingNumber: string | null;
  estimatedArrival: Date | null;
  currentLocation: string | null;
  history: DeliveryHistory[];
}

interface TimelineEvent {
  status: string;
  label: string;
  completed: boolean;
  date?: Date;
  description: string;
}