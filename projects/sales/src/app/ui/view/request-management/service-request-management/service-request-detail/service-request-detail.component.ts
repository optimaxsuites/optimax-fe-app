
interface TimelineEvent {
  status: string;
  label: string;
  completed: boolean;
  date?: Date;
  description: string;
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ServiceRequestService } from '../../../../service/procurement-request-management/service-request-management/service-request.service';
import { ServiceRequest, ServiceType, ServiceRequestStatus, ServiceTypeLabels, RateTypeLabels, LocationTypeLabels, ServiceMilestone } from '../../../../domain/procurement-request/service-requests/service-requests.dto';
import { MatDialog } from '@angular/material/dialog';
import { ServiceRequestCancellationDialogComponent, CancellationData, CancellationResult } from '../service-request-cancellation-dialog/service-request-cancellation-dialog.component';

@Component({
  selector: 'app-service-request-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './service-request-detail.component.html',
  styleUrls: ['./service-request-detail.component.scss']
})
export class ServiceRequestDetailComponent implements OnInit, OnDestroy {
  
  serviceRequest: ServiceRequest | null = null;
  isLoading = true;
  isSubmittingCancel = false;
  
  // Quotations (from vendors)
  quotations: any[] = [];
  isLoadingQuotations = false;
  
  // Selected vendor info
  selectedVendor: any = null;
  
  // Milestones
  milestones: ServiceMilestone[] = [];
  
  // Timeline events
  timelineEvents: TimelineEvent[] = [];
  
  // Status update options
  statusOptions: { value: ServiceRequestStatus; label: string }[] = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'VENDORS_QUOTING', label: 'Vendors Quoting' },
    { value: 'VENDOR_SELECTED', label: 'Vendor Selected' },
    { value: 'CONTRACT_SIGNED', label: 'Contract Signed' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' }
  ];
  
  showStatusUpdate = false;
  selectedStatus: ServiceRequestStatus = 'PENDING';
  statusUpdateNote = '';
  isUpdatingStatus = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private serviceRequestService: ServiceRequestService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const requestId = this.route.snapshot.paramMap.get('id');
    if (requestId) {
      this.loadServiceRequest(requestId);
      this.loadQuotations(requestId);
      this.generateTimeline(requestId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadServiceRequest(id: string): void {
    this.isLoading = true;
    this.serviceRequestService.getServiceRequestById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (request) => {
          this.serviceRequest = request || null;
          this.milestones = request?.milestones || [];
          this.isLoading = false;
          
          if (this.serviceRequest?.selectedVendorId) {
            this.loadVendorDetails(this.serviceRequest.selectedVendorId);
          }
        },
        error: (error) => {
          console.error('Error loading service request:', error);
          this.isLoading = false;
        }
      });
  }

  private loadQuotations(requestId: string): void {
    this.isLoadingQuotations = true;
    
    // Mock data - replace with actual API call
    setTimeout(() => {
      this.quotations = [
        {
          id: 'Q-001',
          vendorId: 'VEND-001',
          vendorName: 'Tech Solutions NG',
          vendorRating: 4.8,
          amount: 48000,
          currency: 'NGN',
          deliveryTimeline: '10-12 weeks',
          terms: '30% upfront, 40% at milestone 2, 30% on completion',
          submittedAt: new Date('2026-05-25'),
          status: 'PENDING',
          proposal: 'Detailed proposal attached',
          teamSize: 4,
          estimatedStartDate: new Date('2026-06-01')
        },
        {
          id: 'Q-002',
          vendorId: 'VEND-003',
          vendorName: 'Digital Experts Ltd',
          vendorRating: 4.6,
          amount: 52000,
          currency: 'NGN',
          deliveryTimeline: '8-10 weeks',
          terms: '50% upfront, 50% on delivery',
          submittedAt: new Date('2026-05-26'),
          status: 'PENDING',
          proposal: 'Proposal with portfolio',
          teamSize: 3,
          estimatedStartDate: new Date('2026-06-05')
        },
        {
          id: 'Q-003',
          vendorId: 'VEND-005',
          vendorName: 'Global IT Services',
          vendorRating: 4.9,
          amount: 45000,
          currency: 'NGN',
          deliveryTimeline: '12-14 weeks',
          terms: 'Net 30',
          submittedAt: new Date('2026-05-24'),
          status: 'PENDING',
          proposal: 'Comprehensive proposal',
          teamSize: 5,
          estimatedStartDate: new Date('2026-06-10')
        }
      ];
      this.isLoadingQuotations = false;
    }, 500);
  }

  private loadVendorDetails(vendorId: string): void {
    // Mock data - replace with actual API call
    this.selectedVendor = {
      id: vendorId,
      name: 'Tech Solutions NG',
      email: 'contact@techsolutions.com',
      phone: '+234 123 456 789',
      rating: 4.8,
      totalProjects: 156,
      onTimeDelivery: 92,
      specialties: ['Web Development', 'Mobile Apps', 'Cloud Solutions']
    };
  }

  private generateTimeline(requestId: string): void {
    const timeline: TimelineEvent[] = [
      { 
        status: 'REQUEST_CREATED', 
        label: 'Request Created', 
        completed: true, 
        date: this.serviceRequest?.createdAt, 
        description: 'Your service request was submitted' 
      },
      { 
        status: 'VENDORS_NOTIFIED', 
        label: 'Vendors Notified', 
        completed: this.isStatusAtLeast('VENDORS_QUOTING'), 
        date: this.serviceRequest?.updatedAt, 
        description: 'Qualified vendors have been notified' 
      },
      { 
        status: 'QUOTATIONS_RECEIVED', 
        label: 'Quotations Received', 
        completed: this.isStatusAtLeast('VENDOR_SELECTED'), 
        date: undefined, 
        description: 'Vendors have submitted their proposals' 
      },
      { 
        status: 'VENDOR_SELECTED', 
        label: 'Vendor Selected', 
        completed: this.isStatusAtLeast('VENDOR_SELECTED'), 
        date: this.serviceRequest?.updatedAt, 
        description: `Selected ${this.serviceRequest?.selectedVendorName || 'a vendor'}` 
      },
      { 
        status: 'CONTRACT_SIGNED', 
        label: 'Contract Signed', 
        completed: this.isStatusAtLeast('CONTRACT_SIGNED'), 
        date: undefined, 
        description: 'Contract has been signed by both parties' 
      },
      { 
        status: 'WORK_STARTED', 
        label: 'Work Started', 
        completed: this.isStatusAtLeast('IN_PROGRESS'), 
        date: undefined, 
        description: 'Vendor has commenced work' 
      },
      { 
        status: 'COMPLETED', 
        label: 'Completed', 
        completed: this.isStatusAtLeast('COMPLETED'), 
        date: this.serviceRequest?.completedAt, 
        description: 'Service has been completed' 
      }
    ];
    
    this.timelineEvents = timeline;
  }

  private isStatusAtLeast(status: ServiceRequestStatus): boolean {
    const statusOrder: ServiceRequestStatus[] = [
      'DRAFT', 'PENDING', 'VENDORS_QUOTING', 'VENDOR_SELECTED', 
      'CONTRACT_SIGNED', 'IN_PROGRESS', 'MILESTONE_1_COMPLETE',
      'MILESTONE_2_COMPLETE', 'MILESTONE_3_COMPLETE', 'COMPLETED'
    ];
    const currentIndex = statusOrder.indexOf(this.serviceRequest?.status || 'PENDING');
    const requiredIndex = statusOrder.indexOf(status);
    return currentIndex >= requiredIndex;
  }

  getServiceTypeLabel(type: ServiceType): string {
    return ServiceTypeLabels[type] || type;
  }

  getRateTypeLabel(rateType: string): string {
    return RateTypeLabels[rateType as keyof typeof RateTypeLabels] || rateType;
  }

  getLocationTypeLabel(locationType: string): string {
    return LocationTypeLabels[locationType as keyof typeof LocationTypeLabels] || locationType;
  }

  getStatusBadgeClass(status: ServiceRequestStatus): string {
    const classes: Record<ServiceRequestStatus, string> = {
      'DRAFT': 'badge-secondary',
      'PENDING': 'badge-warning',
      'VENDORS_QUOTING': 'badge-info',
      'VENDOR_SELECTED': 'badge-primary',
      'CONTRACT_SIGNED': 'badge-primary',
      'IN_PROGRESS': 'badge-info',
      'MILESTONE_1_COMPLETE': 'badge-success',
      'MILESTONE_2_COMPLETE': 'badge-success',
      'MILESTONE_3_COMPLETE': 'badge-success',
      'COMPLETED': 'badge-success',
      'CANCELLED': 'badge-danger'
    };
    return `badge ${classes[status] || 'badge-secondary'}`;
  }

  getStatusLabel(status: ServiceRequestStatus): string {
    const labels: Record<ServiceRequestStatus, string> = {
      'DRAFT': 'Draft',
      'PENDING': 'Pending',
      'VENDORS_QUOTING': 'Vendors Quoting',
      'VENDOR_SELECTED': 'Vendor Selected',
      'CONTRACT_SIGNED': 'Contract Signed',
      'IN_PROGRESS': 'In Progress',
      'MILESTONE_1_COMPLETE': 'Milestone 1 Complete',
      'MILESTONE_2_COMPLETE': 'Milestone 2 Complete',
      'MILESTONE_3_COMPLETE': 'Milestone 3 Complete',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled'
    };
    return labels[status];
  }

  canEdit(): boolean {
    if (!this.serviceRequest) return false;
    const nonEditableStatuses: ServiceRequestStatus[] = ['COMPLETED', 'CANCELLED', 'CONTRACT_SIGNED', 'IN_PROGRESS'];
    return !nonEditableStatuses.includes(this.serviceRequest.status);
  }

  canCancel(): boolean {
    if (!this.serviceRequest) return false;
    const nonCancellableStatuses: ServiceRequestStatus[] = ['COMPLETED', 'CANCELLED'];
    return !nonCancellableStatuses.includes(this.serviceRequest.status);
  }

  canUpdateStatus(): boolean {
    if (!this.serviceRequest) return false;
    return !['COMPLETED', 'CANCELLED'].includes(this.serviceRequest.status);
  }

  // openCancelModal(): void {
  //   if (!this.serviceRequest) return;

  //   const reason = prompt(
  //     'Why are you cancelling this request?\n\nCancellation after vendor selection may incur a service fee of up to 10% of the project value.',
  //     ''
  //   );

  //   if (reason === null) return;

  //   const trimmedReason = reason.trim();
  //   if (!trimmedReason) {
  //     alert('Cancellation reason is required.');
  //     return;
  //   }

  //   this.confirmCancel(trimmedReason);
  // }

  openCancelModal(): void {
  const dialogData: CancellationData = {
    requestId: this.serviceRequest!.id,
    requestTitle: this.serviceRequest!.serviceName,
    requestStatus: this.serviceRequest!.status,
    cancellationPolicy: 'Cancellation after vendor selection may incur a service fee of up to 10% of the project value.'
  };

  const dialogRef = this.dialog.open(ServiceRequestCancellationDialogComponent, {
    width: '600px',
    maxWidth: '90vw',
    disableClose: true,
    data: dialogData
  });

  dialogRef.afterClosed().subscribe((result: CancellationResult | null) => {
    if (result) {
      this.confirmCancel(result.reason, result.additionalNotes);
    }
  });
}

  confirmCancel(reason: string, additionalNotes?: string): void {
  this.isSubmittingCancel = true;
  
  this.serviceRequestService.cancelServiceRequest(this.serviceRequest!.id, reason)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (updatedRequest) => {
        this.serviceRequest = updatedRequest;
        this.isSubmittingCancel = false;
        this.generateTimeline(this.serviceRequest!.id);
        // Show success message
        // this.toastr.success('Service request cancelled successfully');
      },
      error: (error) => {
        console.error('Error cancelling request:', error);
        this.isSubmittingCancel = false;
        alert('Failed to cancel request. Please try again.');
      }
    });
}

  editRequest(): void {
    this.router.navigate(['/commerce/service-requests', this.serviceRequest?.id, 'edit']);
  }

  selectVendor(quotation: any): void {
    if (confirm(`Select ${quotation.vendorName} as your service provider?`)) {
      this.serviceRequestService.updateServiceRequest(this.serviceRequest!.id, {
        selectedVendorId: quotation.vendorId,
        selectedVendorName: quotation.vendorName,
        selectedQuotationId: quotation.id,
        status: 'VENDOR_SELECTED'
      }).subscribe({
        next: (updated) => {
          this.serviceRequest = updated;
          this.loadVendorDetails(quotation.vendorId);
          alert('Vendor selected successfully!');
        },
        error: (error) => {
          console.error('Error selecting vendor:', error);
          alert('Failed to select vendor. Please try again.');
        }
      });
    }
  }

  openStatusUpdateModal(): void {
    this.selectedStatus = this.serviceRequest!.status;
    this.statusUpdateNote = '';
    this.showStatusUpdate = true;
  }

  closeStatusUpdateModal(): void {
    this.showStatusUpdate = false;
    this.statusUpdateNote = '';
  }

  updateStatus(): void {
    this.isUpdatingStatus = true;
    
    this.serviceRequestService.updateServiceRequestStatus(this.serviceRequest!.id, this.selectedStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedRequest) => {
          this.serviceRequest = updatedRequest;
          this.isUpdatingStatus = false;
          this.showStatusUpdate = false;
          this.generateTimeline(this.serviceRequest!.id);
          alert(`Status updated to ${this.getStatusLabel(this.selectedStatus)}`);
        },
        error: (error) => {
          console.error('Error updating status:', error);
          this.isUpdatingStatus = false;
          alert('Failed to update status. Please try again.');
        }
      });
  }

  updateMilestone(milestone: ServiceMilestone): void {
    const newPercentage = prompt(`Update progress for "${milestone.name}" (0-100%):`, milestone.percentageComplete.toString());
    if (newPercentage !== null) {
      const percentage = parseInt(newPercentage);
      if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
        this.serviceRequestService.updateMilestoneProgress(this.serviceRequest!.id, milestone.id, percentage)
          .subscribe({
            next: (updated) => {
              this.serviceRequest = updated;
              this.milestones = updated.milestones || [];
              alert(`Milestone "${milestone.name}" updated to ${percentage}%`);
            },
            error: (error) => {
              console.error('Error updating milestone:', error);
              alert('Failed to update milestone. Please try again.');
            }
          });
      }
    }
  }

  downloadAttachment(attachment: any): void {
    window.open(attachment.fileUrl, '_blank');
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  formatDateTime(date: Date | undefined): string {
    if (!date) return 'Not set';
    return new Date(date).toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTotalMilestonePayment(): number {
    return this.milestones.reduce((sum, m) => sum + m.paymentAmount, 0);
  }

  getMilestoneProgress(): number {
    if (this.milestones.length === 0) return 0;
    const total = this.milestones.reduce((sum, m) => sum + m.percentageComplete, 0);
    return total / this.milestones.length;
  }

  getOverallProgress(): number {
    const statusOrder: ServiceRequestStatus[] = [
      'PENDING', 'VENDORS_QUOTING', 'VENDOR_SELECTED', 'CONTRACT_SIGNED', 
      'IN_PROGRESS', 'MILESTONE_1_COMPLETE', 'MILESTONE_2_COMPLETE', 
      'MILESTONE_3_COMPLETE', 'COMPLETED'
    ];
    const currentIndex = statusOrder.indexOf(this.serviceRequest?.status || 'PENDING');
    const totalSteps = statusOrder.length;
    return (currentIndex / totalSteps) * 100;
  }

  getVendorColor(vendorName: string): string {
  const colors = ['#2E6276', '#2EB270', '#f97316', '#8b5cf6', '#ec4899', '#06b6d4'];
  let hash = 0;
  for (let i = 0; i < vendorName.length; i++) {
    hash = vendorName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

getStarRating(rating: number): string {
  const fullStars = Math.floor(rating);
  let stars = '';
  for (let i = 0; i < fullStars; i++) stars += '★';
  for (let i = fullStars; i < 5; i++) stars += '☆';
  return stars;
}
}