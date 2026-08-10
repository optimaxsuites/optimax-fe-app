// rfq-preview.component.ts

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProcurementRequest, RFQTemplate, VendorSuggestion } from '../../../domain/procurement-request/procurement.dto';
import { ExtendedProcurementRequest, parseIdToNumber } from '../../../service/procurement/rfq-quotation-bridge.util';
import { ProcurementRequestService } from '../../../service/procurement/procurement.service';
import { ApprovalService } from '../../../service/approval-inbox/approval.service';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-rfq-preview',
  templateUrl: './rfq-preview.component.html',
  styleUrls: ['./rfq-preview.component.scss']
})
export class RfqPreviewComponent implements OnInit {
  request: ExtendedProcurementRequest | null = null;
  template: RFQTemplate | null = null;
  vendors: VendorSuggestion[] = [];
  isLoading = false;
  isDownloading = false;
  isSubmitting = false;
  requestId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private procurementService: ProcurementRequestService,
    private approvalService: ApprovalService
  ) {}

  ngOnInit(): void {
    this.requestId = this.route.snapshot.paramMap.get('uuid');
    if (this.requestId) {
      this.loadRequestDetails(this.requestId);
    }
  }

  loadRequestDetails(id: string): void {
    this.isLoading = true;
    this.procurementService.getRequest(parseIdToNumber(id)).subscribe({
      next: (req) => {
        this.request = req as ExtendedProcurementRequest;
        this.isLoading = false;
        if (this.request?.rfqTemplateId) {
          this.loadTemplateDetails(this.request.rfqTemplateId);
        }
        if (this.request.vendorsToNotify && this.request.vendorsToNotify.length > 0) {
          this.loadVendorDetails(this.request.vendorsToNotify);
        }
      },
      error: (err) => {
        console.error('Error loading request details:', err);
        this.isLoading = false;
      }
    });
  }

  loadTemplateDetails(templateId: string): void {
    this.procurementService.getRFQTemplate(templateId).subscribe({
      next: (tpl) => {
        this.template = tpl;
      },
      error: () => {
        // Use default template
        this.template = {
          id: 'default',
          name: 'Standard RFQ',
          description: 'Default template',
          layout: 'STANDARD',
          isDefault: true,
          sections: [],
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
    });
  }

  loadVendorDetails(vendorIds: string[]): void {
    if (!vendorIds || vendorIds.length === 0) { this.vendors = []; return; }
    this.procurementService.getVendorSuggestions(parseIdToNumber(this.requestId!)).subscribe({
      next: (suggestions) => {
        const idSet = new Set(vendorIds);
        this.vendors = suggestions.filter(v => idSet.has(v.vendorId));
      },
      error: () => { this.vendors = []; }
    });
  }

  formatBudget(value: number, currency?: string): string {
    const curr = currency || this.request?.currency || 'NGN';
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: curr 
    }).format(value || 0);
  }

  formatDate(date: any): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getTemplateClass(): string {
    if (!this.template) return 'layout-standard';
    return `layout-${this.template.layout.toLowerCase()}`;
  }

  downloadPDF(): void {
    const element = document.getElementById('rfq-preview-document');
    if (element) {
      this.isDownloading = true;
      html2canvas(element, { scale: 2, useCORS: true, allowTaint: true }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`RFQ-${this.request?.id || 'Draft'}.pdf`);
        this.isDownloading = false;
      }).catch(err => {
        console.error('Error generating PDF:', err);
        this.isDownloading = false;
      });
    }
  }

  onBack(): void {
    if (this.requestId) {
      // Determine which type path to use based on the request
      const typePath = this.request?.procurementType === 'SERVICE' ? 'service' : 'product';
      this.router.navigate(['/admin/sales/commerce/requests/new', typePath, this.requestId, 'vendors']);
    } else {
      this.router.navigate(['/admin/sales/commerce/requests/new']);
    }
  }

  onSubmit(): void {
    if (this.requestId && this.request) {
      this.isSubmitting = true;
      this.procurementService.updateRequest(parseIdToNumber(this.requestId), {
        status: 'PENDING_APPROVAL'
      }).subscribe({
        next: (updatedRequest) => {
          this.createApprovalRequest(updatedRequest);
        },
        error: (err) => {
          console.error('Failed to submit request:', err);
          this.isSubmitting = false;
          this.router.navigate(['/admin/sales/commerce/requests']);
        }
      });
    }
  }

  createApprovalRequest(req: ExtendedProcurementRequest): void {
    const urgency = req.deliveryDeadline ? this.calculateUrgency(req.deliveryDeadline) : 'LOW';
    
    const approvals = [{ level: 1, approverRole: 'Department Head', required: true }];

    const approvalData = {
      requestId: req.id,
      requestType: req.procurementType === 'SERVICE' ? 'SERVICE' : 'PROCUREMENT',
      requestTitle: req.title,
      requesterId: req.customerId || 'CUST-101',
      requesterName: req.customerName || 'HQ Corporate Operations',
      requesterDepartment: 'Procurement',
      budget: req.totalBudget,
      currency: req.currency || 'NGN',
      items: (req.items || []).map((item, idx) => ({
        id: item.id || `item-${idx}`,
        productName: item.name,
        quantity: item.quantity,
        budget: item.estimatedBudget,
        currency: item.currency || req.currency || 'NGN'
      })),
      urgency: urgency,
      approvals: approvals
    };

    this.approvalService.createApprovalRequest(approvalData).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/admin/sales/commerce/requests']);
      },
      error: (err) => {
        console.error('Failed to create approval request:', err);
        this.isSubmitting = false;
        this.router.navigate(['/admin/sales/commerce/requests']);
      }
    });
  }

  private calculateUrgency(deadline: Date | string): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
    if (!deadline) return 'MEDIUM';
    const daysUntilDeadline = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilDeadline <= 3) return 'URGENT';
    if (daysUntilDeadline <= 7) return 'HIGH';
    if (daysUntilDeadline <= 14) return 'MEDIUM';
    return 'LOW';
  }
}