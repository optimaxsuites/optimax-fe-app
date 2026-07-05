import { Component, OnInit } from '@angular/core';
import { ProcurementRequestService } from '../../../service/procurement/procurement.service';
import { ProcurementRequest } from '../../../domain/procurement-request/procurement.dto';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-documentation-history',
  templateUrl: './documentation-history.component.html',
  styleUrl: './documentation-history.component.scss'
})
export class DocumentationHistoryComponent implements OnInit {
  requests: ProcurementRequest[] = [];
  isLoading = false;
  showModal = false;
  selectedRequest: ProcurementRequest | null = null;
  selectedDocType: 'rfq' | 'quotation' | 'lpo' | 'invoice' = 'rfq';
  isDownloading = false;

  // Mocked details caches
  mockQuotation: any = null;
  mockLpo: any = null;
  mockInvoice: any = null;

  constructor(private procurementService: ProcurementRequestService) {}

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.isLoading = true;
    this.procurementService.getRequests({ page: 0, size: 100, status: 'ALL' }).subscribe({
      next: (response) => {
        let list = response.data || [];
        const hasDelivered = list.some(r => r.status === 'DELIVERED');
        if (!hasDelivered) {
          const mockDelivered: ProcurementRequest = {
            id: 'PR-005',
            customerId: 'CUST-101',
            customerName: 'HQ Corporate Operations',
            procurementType: 'PRODUCT',
            title: 'Executive Ergonomic Desks',
            description: 'Procurement of premium height-adjustable executive desks for the management office.',
            items: [
              {
                id: 'item-5',
                name: 'Premium Standing Desk',
                description: 'Dual-motor, steel frame, bamboo top executive standing desk',
                quantity: 15,
                unit: 'Pieces',
                estimatedBudget: 4500000,
                attachments: []
              }
            ],
            totalBudget: 4500000,
            currency: 'NGN',
            deliveryLocation: 'HQ Office, Lekki Phase 1, Lagos',
            deliveryDeadline: new Date('2026-08-15'),
            status: 'DELIVERED',
            attachments: [],
            createdAt: new Date('2026-06-12'),
            updatedAt: new Date('2026-07-02'),
            selectedVendorId: 'VND-001',
            selectedVendorName: 'Apex Tech Distributors',
            selectedQuotationId: 'q-pr005'
          };
          list = [mockDelivered, ...list];
        }
        this.requests = list;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading requests:', err);
        this.isLoading = false;
      }
    });
  }

  openArchiveModal(request: ProcurementRequest): void {
    this.selectedRequest = request;
    this.showModal = true;
    this.selectedDocType = 'rfq';
    this.generateMockDocuments(request);
  }

  closeArchiveModal(): void {
    this.showModal = false;
    this.selectedRequest = null;
    this.mockQuotation = null;
    this.mockLpo = null;
    this.mockInvoice = null;
  }

  isUnlocked(type: 'rfq' | 'quotation' | 'lpo' | 'invoice'): boolean {
    if (!this.selectedRequest) return false;
    const status = this.selectedRequest.status;

    switch (type) {
      case 'rfq':
        return true; // RFQ is always unlocked once created
      case 'quotation':
        return status !== 'PENDING' && status !== 'DRAFT' && status !== 'PENDING_APPROVAL' && status !== 'REJECTED' && status !== 'CANCELLED';
      case 'lpo':
        return ['LPO_ISSUED', 'PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'DELIVERY_IN_PROGRESS', 'DELIVERED'].includes(status);
      case 'invoice':
        return ['PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'DELIVERY_IN_PROGRESS', 'DELIVERED'].includes(status);
      default:
        return false;
    }
  }

  selectDocType(type: 'rfq' | 'quotation' | 'lpo' | 'invoice'): void {
    if (this.isUnlocked(type)) {
      this.selectedDocType = type;
    }
  }

  generateMockDocuments(request: ProcurementRequest): void {
    const vendorName = request.selectedVendorName || 'Apex Tech Distributors';
    const vendorCode = request.selectedVendorId || 'VND-001';
    
    const quoteItems = request.items.map((item, idx) => ({
      id: `qi-${idx}`,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unitPrice: Math.round((request.totalBudget * 0.95) / item.quantity),
      totalPrice: Math.round(request.totalBudget * 0.95)
    }));

    const totalQuoteAmount = quoteItems.reduce((acc, curr) => acc + curr.totalPrice, 0);

    this.mockQuotation = {
      id: `QT-${request.id.replace('PR-', '')}`,
      vendorName: vendorName,
      vendorCode: vendorCode,
      vendorRating: 4.8,
      vendorEmail: 'sales@apextech.example',
      vendorPhone: '+234 803 123 4567',
      items: quoteItems,
      totalAmount: totalQuoteAmount,
      currency: request.currency,
      deliveryTimeline: '5-7 business days',
      validityDays: 30,
      notes: 'Price includes full shipping and delivery charges.'
    };

    this.mockLpo = {
      lpoNumber: `LPO-2026-${request.id.replace('PR-', '')}`,
      orderDate: new Date(request.createdAt.getTime() + 2 * 24 * 60 * 60 * 1000),
      vendorName: vendorName,
      vendorCode: vendorCode,
      vendorRating: 4.8,
      vendorEmail: 'sales@apextech.example',
      vendorPhone: '+234 803 123 4567',
      items: quoteItems,
      totalAmount: totalQuoteAmount,
      currency: request.currency,
      deliveryTimeline: '5-7 business days',
      validityDays: 30
    };

    this.mockInvoice = {
      invoiceNumber: `INV-2026-${request.id.replace('PR-', '')}`,
      orderId: request.id,
      customerName: request.customerName,
      items: request.items.map((item, idx) => ({
        id: `inv-item-${idx}`,
        productName: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: Math.round((request.totalBudget * 0.95) / item.quantity),
        total: Math.round(request.totalBudget * 0.95)
      })),
      subtotal: totalQuoteAmount,
      discountAmount: 0,
      taxAmount: Math.round(totalQuoteAmount * 0.075),
      totalAmount: Math.round(totalQuoteAmount * 1.075),
      amountPaid: request.status === 'DELIVERED' ? Math.round(totalQuoteAmount * 1.075) : 0,
      balanceDue: request.status === 'DELIVERED' ? 0 : Math.round(totalQuoteAmount * 1.075),
      currency: request.currency,
      status: request.status === 'DELIVERED' ? 'PAID' : 'SENT',
      issueDate: new Date(request.createdAt.getTime() + 5 * 24 * 60 * 60 * 1000),
      dueDate: new Date(request.createdAt.getTime() + 19 * 24 * 60 * 60 * 1000),
      paymentTerms: 'Net 14'
    };
  }

  downloadCurrentDocPDF(): void {
    const element = document.getElementById('preview-document-container');
    if (!element || !this.selectedRequest) return;

    this.isDownloading = true;
    const docTitle = `${this.selectedDocType.toUpperCase()}-${this.selectedRequest.id}`;

    html2canvas(element, { 
      scale: 2, 
      useCORS: true, 
      allowTaint: true 
    }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${docTitle}.pdf`);
      this.isDownloading = false;
    }).catch(err => {
      console.error('Error generating PDF:', err);
      this.isDownloading = false;
      alert('Failed to generate PDF document.');
    });
  }

  formatCurrency(amount: number, currency: string = 'NGN'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'PENDING': 'pending',
      'VENDORS_QUOTING': 'quoting',
      'VENDOR_SELECTED': 'selected',
      'LPO_ISSUED': 'lpo-issued',
      'PAYMENT_PENDING': 'payment-pending',
      'PAYMENT_CONFIRMED': 'payment-confirmed',
      'DELIVERY_IN_PROGRESS': 'delivering',
      'DELIVERED': 'delivered',
      'CANCELLED': 'cancelled'
    };
    return classes[status] || 'pending';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'PENDING': 'Pending RFQ',
      'VENDORS_QUOTING': 'Vendors Quoting',
      'VENDOR_SELECTED': 'Vendor Selected',
      'LPO_ISSUED': 'LPO Issued',
      'PAYMENT_PENDING': 'Payment Pending',
      'PAYMENT_CONFIRMED': 'Payment Confirmed',
      'DELIVERY_IN_PROGRESS': 'Delivery In Progress',
      'DELIVERED': 'Delivered',
      'CANCELLED': 'Cancelled'
    };
    return labels[status] || status;
  }
}
