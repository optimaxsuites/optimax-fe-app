import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ApprovalService } from '../../service/approval-inbox/approval.service';
import { ApprovalRequest, ApprovalStatus, ApprovalFilters, ApprovalStats } from '../../domain/approval-inbox/approval-request.dto';
import { ProcurementRequestService } from '../../service/procurement-request-management/product-request-management/procurement-request.service';

@Component({
  selector: 'app-approval-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './approval-inbox.component.html',
  styleUrls: ['./approval-inbox.component.scss']
})
export class ApprovalInboxComponent implements OnInit, OnDestroy {
  
  approvals: ApprovalRequest[] = [];
  stats: ApprovalStats | null = null;
  isLoading = true;
  selectedApproval: ApprovalRequest | null = null;
  showApprovalModal = false;
  showRejectModal = false;
  approvalComments = '';
  currentApproverLevel = 1;
  
  protected readonly Math = Math;
  
  // Filters
  filters: ApprovalFilters = {
    status: 'IN_APPROVAL',
    urgency: 'ALL',
    department: '',
    searchTerm: '',
    page: 0,
    size: 10
  };
  
  statusOptions: { value: ApprovalStatus | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'All Status' },
    { value: 'PENDING', label: 'Pending Submission' },
    { value: 'IN_APPROVAL', label: 'In Approval' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'EXPIRED', label: 'Expired' }
  ];
  
  urgencyOptions = [
    { value: 'ALL', label: 'All Urgency' },
    { value: 'LOW', label: 'Low', class: 'urgency-low' },
    { value: 'MEDIUM', label: 'Medium', class: 'urgency-medium' },
    { value: 'HIGH', label: 'High', class: 'urgency-high' },
    { value: 'URGENT', label: 'Urgent', class: 'urgency-urgent' }
  ];
  
  departments: string[] = [];
  
  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  
  private destroy$ = new Subject<void>();

  constructor(
    private approvalService: ApprovalService,
    private procurementService: ProcurementRequestService
  ) {}

  ngOnInit(): void {
    this.loadApprovals();
    this.loadStats();
    this.loadDepartments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadApprovals(): void {
    this.isLoading = true;
    this.approvalService.getApprovalRequests(this.filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.approvals = response.data;
          this.totalElements = response.totalElements;
          this.totalPages = response.totalPages;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading approvals:', error);
          this.isLoading = false;
        }
      });
  }

  loadStats(): void {
    this.approvalService.getApprovalStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.stats = stats;
        },
        error: (error) => {
          console.error('Error loading stats:', error);
        }
      });
  }

  loadDepartments(): void {
    this.approvalService.getDepartments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (depts) => {
          this.departments = depts;
        },
        error: (error) => {
          console.error('Error loading departments:', error);
        }
      });
  }

  applyFilters(): void {
    this.filters.page = 0;
    this.loadApprovals();
  }

  resetFilters(): void {
    this.filters = {
      status: 'IN_APPROVAL',
      urgency: 'ALL',
      department: '',
      searchTerm: '',
      page: 0,
      size: 10
    };
    this.loadApprovals();
  }

  onPageChange(page: number): void {
    this.filters.page = page;
    this.loadApprovals();
  }

  onPageSizeChange(size: number): void {
    this.filters.size = size;
    this.filters.page = 0;
    this.loadApprovals();
  }

  openApproveModal(approval: ApprovalRequest): void {
    this.selectedApproval = approval;
    this.approvalComments = '';
    this.showApprovalModal = true;
  }

  openRejectModal(approval: ApprovalRequest): void {
    this.selectedApproval = approval;
    this.approvalComments = '';
    this.showRejectModal = true;
  }

confirmApprove(): void {
  if (!this.selectedApproval) return;
  
  const levelToApprove = this.selectedApproval.currentLevel;
  
  this.approvalService.approveRequest(this.selectedApproval.id, levelToApprove, this.approvalComments)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (updated) => {
        // ONLY update procurement request status if the approval process is FULLY completed (status === 'APPROVED')
        if (updated.status === 'APPROVED') {
          this.updateProcurementRequestStatus(updated.requestId, 'APPROVED', updated.requestType);
        }
        
        this.showApprovalModal = false;
        this.loadApprovals();
        this.loadStats();
      },
      error: (error) => {
        console.error('Error approving request:', error);
      }
    });
}

confirmReject(): void {
  if (!this.selectedApproval) return;
  
  const levelToReject = this.selectedApproval.currentLevel;
  
  this.approvalService.rejectRequest(this.selectedApproval.id, levelToReject, this.approvalComments)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (updated) => {
        // AFTER rejection, update the procurement request status
        this.updateProcurementRequestStatus(updated.requestId, 'REJECTED', updated.requestType);
        
        this.showRejectModal = false;
        this.loadApprovals();
        this.loadStats();
      },
      error: (error) => {
        console.error('Error rejecting request:', error);
      }
    });
}

private updateProcurementRequestStatus(requestId: string, status: 'APPROVED' | 'REJECTED', requestType: string): void {
  if (requestType === 'ORDER') {
    this.procurementService.updateOrderStatus(requestId, status === 'APPROVED' ? 'PENDING_VENDOR_QUOTES' : 'CANCELLED')
      .subscribe({
        next: () => {
          if (status === 'APPROVED') {
            console.log(`Master order ${requestId} approved and sent to vendors`);
          } else {
            console.log(`Master order ${requestId} rejected`);
          }
        },
        error: (error: any) => {
          console.error('Error updating order status:', error);
        }
      });
  } else {
    // Single requests (PROCUREMENT, SERVICE, etc.)
    this.procurementService.updateRequestStatus(requestId, status === 'APPROVED' ? 'PENDING' : 'REJECTED' as any)
      .subscribe({
        next: () => {
          if (status === 'APPROVED') {
            // Send RFQ to vendors
            this.procurementService.sendRFQToVendors(requestId).subscribe();
          } else {
            // Notify customer of rejection
            this.procurementService.notifyCustomerOfRejection(requestId, this.approvalComments).subscribe();
          }
        },
        error: (error: any) => {
          console.error('Error updating procurement status:', error);
        }
      });
  }
}


  getStatusIcon(status: ApprovalStatus): string {
    const icons = {
      'DRAFT': 'edit',
      'PENDING': 'clock',
      'IN_APPROVAL': 'loader',
      'APPROVED': 'check-circle',
      'REJECTED': 'x-circle',
      'CANCELLED': 'x-circle',
      'EXPIRED': 'alert-circle'
    };
    return icons[status] || 'circle';
  }

  getStatusClass(status: ApprovalStatus): string {
    const classes = {
      'DRAFT': 'status-draft',
      'PENDING': 'status-pending',
      'IN_APPROVAL': 'status-in-approval',
      'APPROVED': 'status-approved',
      'REJECTED': 'status-rejected',
      'CANCELLED': 'status-cancelled',
      'EXPIRED': 'status-expired'
    };
    return classes[status] || 'status-pending';
  }

  getStatusLabel(status: ApprovalStatus): string {
    const labels = {
      'DRAFT': 'Draft',
      'PENDING': 'Pending',
      'IN_APPROVAL': 'In Approval',
      'APPROVED': 'Approved',
      'REJECTED': 'Rejected',
      'CANCELLED': 'Cancelled',
      'EXPIRED': 'Expired'
    };
    return labels[status];
  }

  getUrgencyClass(urgency: string): string {
    const classes = {
      'LOW': 'urgency-low',
      'MEDIUM': 'urgency-medium',
      'HIGH': 'urgency-high',
      'URGENT': 'urgency-urgent'
    };
    return `urgency-badge ${classes[urgency as keyof typeof classes] || 'urgency-medium'}`;
  }

  getUrgencyLabel(urgency: string): string {
    return urgency.charAt(0) + urgency.slice(1).toLowerCase();
  }

  getRequestTypeIcon(type: string): string {
    const icons = {
      'PROCUREMENT': 'package',
      'SERVICE': 'briefcase',
      'ORDER': 'shopping-cart'
    };
    return icons[type as keyof typeof icons] || 'file';
  }

  getRequestTypeLabel(type: string): string {
    const labels = {
      'PROCUREMENT': 'Product',
      'SERVICE': 'Service',
      'ORDER': 'Multi-Item Order'
    };
    return labels[type as keyof typeof labels] || type;
  }

  getCurrentApprovalLevel(approval: ApprovalRequest): { level: number; approverName: string; approverRole: string } | null {
    const current = approval.approvals.find(a => a.level === approval.currentLevel);
    if (current) {
      return {
        level: current.level,
        approverName: current.approverName,
        approverRole: current.approverRole
      };
    }
    return null;
  }

  getApprovalProgress(approval: ApprovalRequest): number {
    const total = approval.approvals.filter(a => a.required).length;
    const completed = approval.approvals.filter(a => a.status === 'APPROVED' && a.required).length;
    return (completed / total) * 100;
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 24) return `${diffHours} hours ago`;
    return new Date(date).toLocaleDateString();
  }

  getPageNumbers(): number[] {
    const maxVisible = 5;
    let start = Math.max(0, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible);
    
    if (end - start < maxVisible) {
      start = Math.max(0, end - maxVisible);
    }
    
    return Array.from({ length: end - start }, (_, i) => start + i);
  }
}