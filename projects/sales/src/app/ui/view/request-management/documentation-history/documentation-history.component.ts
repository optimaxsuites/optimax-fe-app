import { Component, OnInit } from '@angular/core';
import { ProcurementRequestService } from '../../../service/procurement/procurement.service';
import { ProcurementRequest } from '../../../domain/procurement-request/procurement.dto';
import { ExtendedProcurementRequest } from '../../../service/procurement/rfq-quotation-bridge.util';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { STORAGE_KEYS, loadFromStorage } from '../../../service/vendor-portal/local-store.util';
import { PROCUREMENT_STORAGE_KEYS } from '../../../service/procurement/procurement-store.util';

@Component({
  selector: 'app-documentation-history',
  templateUrl: './documentation-history.component.html',
  styleUrl: './documentation-history.component.scss'
})
export class DocumentationHistoryComponent implements OnInit {
  requests: ExtendedProcurementRequest[] = [];
  isLoading = false;
  showModal = false;
  selectedRequest: ExtendedProcurementRequest | null = null;
  selectedDocType: 'rfq' | 'quotation' | 'lpo' | 'invoice' = 'rfq';
  isDownloading = false;

  // Mocked details caches
  mockQuotation: any = null;
  mockLpo: any = null;
  mockInvoice: any = null;

  constructor(private procurementService: ProcurementRequestService) { }

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
          const mockDelivered: ExtendedProcurementRequest = {
            id: 'PR-005' as any,
            customerId: 'CUST-101',
            customerName: 'HQ Corporate Operations',
            procurementType: 'PRODUCT',
            title: 'Executive Ergonomic Desks',
            description: 'Procurement of premium height-adjustable executive desks for the management office.',
            items: [
              {
                id: 'item-5' as any,
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
            selectedQuotationId: 'q-pr005',
            approvalStatus: 'APPROVED',
            approvedBy: 'ADMIN',
            approvedAt: new Date('2026-06-14'),
            createdBy: 'ADMIN',
            updatedBy: 'ADMIN',
            suggestedVendorIds: [],
            suggestedVendors: []
          };
          list = [mockDelivered, ...list];
        }
        this.requests = list as ExtendedProcurementRequest[];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading requests:', err);
        this.isLoading = false;
      }
    });
  }

  openArchiveModal(request: ExtendedProcurementRequest): void {
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
        return true;
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

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      'PENDING': 'status-pending',
      'VENDORS_QUOTING': 'status-quoting',
      'VENDOR_SELECTED': 'status-selected',
      'LPO_ISSUED': 'status-lpo-issued',
      'PAYMENT_PENDING': 'status-payment-pending',
      'PAYMENT_CONFIRMED': 'status-payment-confirmed',
      'DELIVERY_IN_PROGRESS': 'status-delivering',
      'DELIVERED': 'status-delivered',
      'CANCELLED': 'status-cancelled'
    };
    return classes[status] || 'status-pending';
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

  generateMockDocuments(request: ExtendedProcurementRequest): void {
    const vendorName = request.selectedVendorName || 'Apex Tech Distributors';
    const vendorCode = request.selectedVendorId || 'VND-001';

    // 1. Try to load the real accepted quotation
    const localQuotes = loadFromStorage<any[]>(PROCUREMENT_STORAGE_KEYS.QUOTATIONS, () => []);
    const sharedQuotes = loadFromStorage<any[]>(STORAGE_KEYS.QUOTATIONS, () => []);
    const allQuotes = [...localQuotes, ...sharedQuotes];

    const realQuote = allQuotes.find(q => 
      (request.selectedQuotationId && (q.id === request.selectedQuotationId || q.id === request.selectedQuotationId.replace('live:', ''))) ||
      (q.rfqId === request.id && ['ACCEPTED', 'LPO_GENERATED', 'LPO_SENT', 'accepted'].includes(q.status))
    );

    let quoteItems: any[] = [];
    if (realQuote) {
      quoteItems = (realQuote.items || []).map((item: any) => {
        const origItem = request.items.find(ri => ri.id === item.rfqItemId);
        const name = origItem ? origItem.name : (item.name || item.productName || '');
        const unitPrice = item.unitPrice || 0;
        const quantity = item.quantity || 0;
        const totalPrice = item.totalPrice || (unitPrice * quantity);
        return {
          id: item.id || item.rfqItemId,
          name: name,
          description: item.description || '',
          quantity: quantity,
          unitPrice: unitPrice,
          totalPrice: totalPrice
        };
      });

      this.mockQuotation = {
        id: realQuote.quotationNumber || realQuote.id,
        vendorName: realQuote.vendorName || vendorName,
        vendorCode: realQuote.vendorCode || vendorCode,
        vendorRating: realQuote.vendorRating || 4.8,
        vendorEmail: realQuote.vendorEmail || 'sales@apextech.example',
        vendorPhone: realQuote.vendorPhone || '+234 803 123 4567',
        items: quoteItems,
        totalAmount: realQuote.total || realQuote.totalAmount || 0,
        currency: realQuote.currency || request.currency,
        deliveryTimeline: realQuote.deliveryTimeline || '5-7 business days',
        validityDays: realQuote.validityDays || 30,
        notes: realQuote.notes || 'Price includes full shipping and delivery charges.'
      };
    } else {
      quoteItems = request.items.map((item, idx) => {
        const itemBudget = item.estimatedBudget || Math.round(request.totalBudget / request.items.length);
        return {
          id: `qi-${idx}`,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unitPrice: Math.round((itemBudget * 0.95) / item.quantity),
          totalPrice: Math.round(itemBudget * 0.95)
        };
      });

      const totalQuoteAmount = quoteItems.reduce((acc, curr) => acc + curr.totalPrice, 0);

      this.mockQuotation = {
        id: `QT-${String(request.id).replace('PR-', '')}`,
        quotationId: `QT-${String(request.id).replace('PR-', '')}`,
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
    }

    const totalQuoteAmount = this.mockQuotation.totalAmount;

    // 2. Try to load the real generated LPO
    const lpos = loadFromStorage<any[]>(STORAGE_KEYS.LPOS, () => []);
    const realLpo = (request.selectedLpoId && lpos.find(l => l.id === request.selectedLpoId))
      || (request.selectedLpoNumber && lpos.find(l => l.lpoNumber === request.selectedLpoNumber))
      || lpos.find(l => 
        (realQuote && (l.quotationId === realQuote.id || l.quotationId === realQuote.id.replace('live:', ''))) ||
        String(l.rfqNumber) === String(request.id)
      );

    if (realLpo) {
      const lpoItems = (realLpo.items || []).map((item: any) => {
        const rfqItemId = item.id.replace('lpo-item-', '');
        const origItem = request.items.find(ri => String(ri.id) === String(rfqItemId));
        const name = origItem ? origItem.name : (item.name || '');
        return {
          id: item.id,
          name: name,
          description: item.description || '',
          quantity: item.quantity || 0,
          unitPrice: item.unitPrice || 0,
          totalPrice: item.totalPrice || (item.unitPrice * item.quantity)
        };
      });

      this.mockLpo = {
        lpoNumber: realLpo.lpoNumber,
        orderDate: new Date(realLpo.issuedDate),
        vendorName: realLpo.vendorName || this.mockQuotation.vendorName,
        vendorCode: realLpo.vendorCode || this.mockQuotation.vendorCode,
        vendorRating: realLpo.vendorRating || this.mockQuotation.vendorRating,
        vendorEmail: realLpo.vendorEmail || this.mockQuotation.vendorEmail,
        vendorPhone: realLpo.vendorPhone || this.mockQuotation.vendorPhone,
        items: lpoItems,
        totalAmount: realLpo.total || 0,
        currency: realLpo.currency || request.currency,
        deliveryTimeline: realLpo.deliveryTimeline || '5-7 business days',
        validityDays: realLpo.validityDays || 30
      };
    } else {
      this.mockLpo = {
        lpoNumber: `LPO-2026-${String(request.id).replace('PR-', '')}`,
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
    }

    // 3. Try to load the real submitted invoice
    let realInvoice: any = null;
    try {
      const storedInvoices = localStorage.getItem('vendor_submitted_invoices_db') || localStorage.getItem(STORAGE_KEYS.INVOICES);
      if (storedInvoices) {
        const list = JSON.parse(storedInvoices);
        realInvoice = list.find((inv: any) => 
          (realLpo && (inv.lpoId === realLpo.id || inv.lpoNumber === realLpo.lpoNumber)) ||
          inv.lpoId === `lpo-${request.id}` || 
          String(inv.lpoId) === String(request.id) ||
          (inv.lpoNumber && inv.lpoNumber.includes(String(request.id).replace('PR-', '')))
        );
      }
    } catch (e) {
      console.error('Error loading real invoice from vendor portal:', e);
    }

    if (realInvoice) {
      // Align items to request.items for correct parallel indexing in HTML
      const alignedItems = request.items.map((ri: any) => {
        const invItem = realInvoice.items.find((item: any) => 
          item.lpoItemId && (
            item.lpoItemId.endsWith(String(ri.id)) || 
            item.lpoItemId.replace('lpo-item-', '').replace('item-', '') === String(ri.id).replace('item-', '')
          )
        );
        if (invItem) {
          const origItem = request.items.find(x => String(x.id) === String(ri.id));
          const name = origItem ? origItem.name : (invItem.name || invItem.description || '');
          return {
            id: invItem.id,
            name: name,
            description: invItem.description || '',
            quantity: invItem.quantity,
            unitPrice: invItem.unitPrice,
            totalPrice: invItem.totalPrice || (invItem.unitPrice * invItem.quantity),
            total: invItem.totalPrice || (invItem.unitPrice * invItem.quantity)
          };
        }
        return {
          unitPrice: ri.estimatedBudget / ri.quantity,
          totalPrice: ri.estimatedBudget,
          total: ri.estimatedBudget
        };
      });

      this.mockInvoice = {
        invoiceNumber: realInvoice.invoiceNumber,
        orderId: request.id,
        customerName: request.customerName,
        items: alignedItems,
        subtotal: realInvoice.subtotal,
        discountAmount: 0,
        taxAmount: realInvoice.tax,
        totalAmount: realInvoice.total,
        amountPaid: realInvoice.status === 'paid' ? realInvoice.total : 0,
        balanceDue: realInvoice.status === 'paid' ? 0 : realInvoice.total,
        currency: realInvoice.currency,
        status: realInvoice.status === 'paid' ? 'PAID' : 'SENT',
        issueDate: new Date(realInvoice.issuedDate),
        dueDate: new Date(realInvoice.dueDate),
        paymentTerms: realInvoice.paymentTerms || 'Net 14'
      };
    } else {
      this.mockInvoice = {
        invoiceNumber: `INV-2026-${String(request.id).replace('PR-', '')}`,
        orderId: request.id,
        customerName: request.customerName,
        items: request.items.map((item, idx) => ({
          id: `inv-item-${idx}`,
          productName: item.name,
          description: item.description,
          quantity: item.quantity,
          unitPrice: Math.round((item.estimatedBudget || (request.totalBudget / request.items.length)) / item.quantity),
          totalPrice: item.estimatedBudget || Math.round(request.totalBudget / request.items.length),
          total: item.estimatedBudget || Math.round(request.totalBudget / request.items.length)
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
}