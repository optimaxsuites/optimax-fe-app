// rfq-preview.component.ts

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProcurementRequest, RFQTemplate, VendorSuggestion } from '../../../domain/procurement-request/procurement.dto';
import { ProcurementRequestService } from '../../../service/procurement/procurement.service';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-rfq-preview',
  templateUrl: './rfq-preview.component.html',
  styleUrls: ['./rfq-preview.component.scss']
})
export class RfqPreviewComponent implements OnInit {
  request: ProcurementRequest | null = null;
  template: RFQTemplate | null = null;
  vendors: VendorSuggestion[] = [];
  isLoading = false;
  isDownloading = false;
  isSubmitting = false;
  requestId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private procurementService: ProcurementRequestService
  ) {}

  ngOnInit(): void {
    this.requestId = this.route.snapshot.paramMap.get('uuid');
    if (this.requestId) {
      this.loadRequestDetails(this.requestId);
    }
  }

  loadRequestDetails(id: string): void {
    this.isLoading = true;
    this.procurementService.getRequest(id).subscribe({
      next: (req) => {
        this.request = req;
        this.isLoading = false;
        if (req.rfqTemplateId) {
          this.loadTemplateDetails(req.rfqTemplateId);
        }
        if (req.selectedVendors && req.selectedVendors.length > 0) {
          this.loadVendorDetails(req.selectedVendors);
        }
      },
      error: (err) => {
        console.error('Error loading request details:', err);
        this.isLoading = false;
        // If request not found, try to load from localStorage or generate mock
        this.loadFromLocalStorage(id);
      }
    });
  }

  loadFromLocalStorage(id: string): void {
    try {
      const saved = localStorage.getItem(`rfq_draft_${id}`);
      if (saved) {
        this.request = JSON.parse(saved);
        this.isLoading = false;
      }
    } catch (e) {
      console.warn('No draft found in localStorage');
    }
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
    // If we have vendor IDs from the request, fetch vendor details
    // For now, use mock data
    this.vendors = vendorIds.map(id => ({
      vendorId: id,
      vendorName: `Vendor ${id.substring(0, 4)}`,
      vendorCode: `V${id.substring(0, 4)}`,
      categories: ['General'],
      rating: 4.5,
      totalProjects: 50,
      completionRate: 95,
      averageResponseTime: 2.5,
      matchScore: 85,
      isRecommended: true,
      reason: 'Good match for requirements'
    }));
  }

  formatBudget(value: number): string {
    const currency = this.request?.currency || 'NGN';
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency 
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
      this.router.navigate(['/commerce/requests/new', typePath, this.requestId, 'vendors']);
    } else {
      this.router.navigate(['/commerce/requests/new']);
    }
  }

  onSubmit(): void {
    if (this.requestId) {
      this.isSubmitting = true;
      this.procurementService.updateRequest(this.requestId, {
        status: 'VENDORS_QUOTING'
      }).subscribe({
        next: () => {
          this.isSubmitting = false;
          // Clear draft from localStorage if exists
          localStorage.removeItem(`rfq_draft_${this.requestId}`);
          this.router.navigate(['/commerce/requests']);
        },
        error: (err) => {
          console.error('Failed to submit request:', err);
          this.isSubmitting = false;
          // Fallback: navigate anyway
          this.router.navigate(['/commerce/requests']);
        }
      });
    }
  }
}