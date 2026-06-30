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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private procurementService: ProcurementRequestService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('uuid');
    if (id) {
      this.loadRequestDetails(id);
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
        this.loadVendorSuggestions(id);
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
      }
    });
  }

  loadVendorSuggestions(requestId: string): void {
    this.procurementService.getVendorSuggestions(requestId).subscribe({
      next: (suggestions) => {
        if (this.request?.selectedVendors && this.request.selectedVendors.length > 0) {
          this.vendors = suggestions.filter(v => 
            this.request?.selectedVendors?.includes(v.vendorId)
          );
        }
      }
    });
  }

  formatBudget(value: number): string {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: this.request?.currency || 'NGN' 
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
    return this.template ? `layout-${this.template.layout.toLowerCase()}` : 'layout-standard';
  }

  downloadPDF(): void {
    const element = document.getElementById('rfq-preview-document');
    if (element) {
      this.isDownloading = true;
      html2canvas(element, { scale: 2, useCORS: true }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210; // A4 size width
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
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      const typePath = this.router.url.includes('/service') ? 'service' : 'product';
      this.router.navigate(['/commerce/requests/new', typePath, uuid, 'vendors']);
    }
  }

  onSubmit(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.isSubmitting = true;
      this.procurementService.updateRequest(uuid, {
        status: 'VENDORS_QUOTING'
      }).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigate(['/commerce/requests']);
        },
        error: (err) => {
          console.error('Failed to submit request:', err);
          this.isSubmitting = false;
        }
      });
    }
  }
}
