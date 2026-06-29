// src/app/ui/service/export/export.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { MasterOrder, ProcurementRequest, Attachment } from '../../../domain/procurement-request/product-requests/product-requests.dto';

export interface ExportOptions {
  format: 'PDF' | 'EXCEL' | 'CSV';
  type: 'REQUEST' | 'REQUESTS' | 'QUOTATIONS' | 'VENDOR' | 'ORDER' | 'ORDERS';
  ids?: string[];
  dateRange?: { start: Date; end: Date };
  includeAttachments?: boolean;
  includeTimeline?: boolean;
  includeQuotations?: boolean;
  columns?: string[];
  fileName?: string;
}

export interface ExportProgress {
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  message: string;
  downloadUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  
  private exportProgress = new Map<string, ExportProgress>();

  constructor(private http: HttpClient) {}

  /**
   * Export single request to PDF
   */
  exportRequestToPDF(requestId: string, options?: Partial<ExportOptions>, request?: ProcurementRequest): Observable<Blob> {
    // Replace with actual API call
    // return this.http.get(`/api/export/request/${requestId}/pdf`, { responseType: 'blob' });
    
    // Mock data generation
    return this.generateMockPDF(requestId, request);
  }

  /**
   * Export multiple requests to Excel/CSV
   */
  exportRequestsToExcel(requestIds: string[], options?: Partial<ExportOptions>): Observable<Blob> {
    // Replace with actual API call
    // return this.http.post(`/api/export/requests/excel`, { requestIds, ...options }, { responseType: 'blob' });
    
    if (options?.format === 'CSV') {
      return this.generateMockCSV(requestIds);
    }
    return this.generateMockExcel(requestIds);
  }

  /**
   * Export a single multi-item order to PDF
   */
  exportOrderToPDF(orderId: string, order?: MasterOrder): Observable<Blob> {
    return this.generateMockOrderPDF(orderId, order);
  }

  /**
   * Export multiple orders to CSV (one row per item)
   */
  exportOrdersToExcel(orderIds: string[], options?: Partial<ExportOptions>): Observable<Blob> {
    if (options?.format === 'CSV') {
      return this.generateMockOrderCSV(orderIds);
    }
    return this.generateMockOrderExcel(orderIds);
  }

  /**
   * Export with filters (date range, status, etc.)
   */
  exportWithFilters(filters: any, format: 'PDF' | 'EXCEL' | 'CSV'): Observable<Blob> {
    const params = new HttpParams({ fromObject: filters });
    // return this.http.get(`/api/export/requests/${format.toLowerCase()}`, { params, responseType: 'blob' });
    
    if (format === 'CSV') {
      return this.generateMockCSV([]);
    }
    return this.generateMockExcel([]);
  }

  /**
   * Bulk export with progress tracking
   */
  startBulkExport(exportOptions: ExportOptions): string {
    const exportId = Math.random().toString(36).substr(2, 9);
    
    this.exportProgress.set(exportId, {
      status: 'PENDING',
      progress: 0,
      message: 'Preparing export...'
    });
    
    // Simulate export progress
    this.simulateExportProgress(exportId, exportOptions);
    
    return exportId;
  }

  getExportProgress(exportId: string): ExportProgress | undefined {
    return this.exportProgress.get(exportId);
  }

  downloadExport(url: string, fileName: string): void {
    // Trigger download from URL
    saveAs(url, fileName);
  }

  // ============= REAL EXPORT & MOCK METHODS =============

  // Replace your existing generateMockPDF method with this:

private generateMockPDF(requestId: string, request?: ProcurementRequest): Observable<Blob> {
  const doc = new jsPDF();
  
  // Header Banner
  doc.setFillColor(34, 197, 94);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('PROCUREMENT REQUEST DETAILS', 14, 25);
  
  const productName = request?.productName ?? 'Office Laptops';
  const qtyText = request?.quantity ? `${request.quantity} units` : '15 units';
  const currency = request?.currency ?? 'NGN';
  const budgetValue = request?.budget ?? 22500;
  const formattedBudget = `${currency} ${Number(budgetValue).toLocaleString()}`;
  const locationValue = request?.deliveryLocation ?? 'Lagos, Nigeria';
  const statusLabel = request?.status ? request.status : 'In Progress';
  
  const requestRows = [
    ['Request ID', requestId],
    ['Date', new Date().toLocaleDateString()],
    ['Product', productName],
    ['Quantity', qtyText],
    ['Budget', formattedBudget],
    ['Delivery Location', locationValue],
    ['Status', statusLabel]
  ];

  if (request?.projectName) {
    requestRows.push(['Project Name', request.projectName]);
  }
  if (request?.departmentName) {
    requestRows.push(['Department', request.departmentName]);
  }

  // Metadata Table
  autoTable(doc, {
    startY: 45,
    head: [['Field', 'Details']],
    body: requestRows,
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85] }
  });

  // Timeline section (mock for now)
  const timelineY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('Timeline', 14, timelineY);

  autoTable(doc, {
    startY: timelineY + 5,
    head: [['Event', 'Date', 'Status']],
    body: [
      ['Request Created', new Date().toLocaleDateString(), 'Completed'],
      ['Vendors Notified', 'Pending', 'Pending'],
      ['Quotations Received', 'Pending', 'Pending']
    ],
    theme: 'grid',
    headStyles: { fillColor: [71, 85, 105] }
  });

  // Vendor Quotations section (mock for now)
  const vendorY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.text('Vendor Quotations', 14, vendorY);

  autoTable(doc, {
    startY: vendorY + 5,
    head: [['Vendor', 'Quotation', 'Delivery Time']],
    body: [
      ['Awaiting quotes', '—', '—'],
      ['Awaiting quotes', '—', '—']
    ],
    theme: 'striped',
    headStyles: { fillColor: [71, 85, 105] }
  });

  let attachmentsY = (doc as any).lastAutoTable.finalY + 12;

  // ========== FIXED: ACTUALLY USE THE ATTACHMENTS FROM THE REQUEST ==========
  if (request?.attachments && request.attachments.length > 0) {
    if (attachmentsY > 180) {
      doc.addPage();
      attachmentsY = 20;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('Attached Documents & Images', 14, attachmentsY);
    attachmentsY += 8;

    // Loop through each attachment
    for (const att of request.attachments) {
      if (attachmentsY > 240) {
        doc.addPage();
        attachmentsY = 20;
      }

      // Check if this is an image (base64 or file extension)
      const isImage = att.fileUrl && (
        att.fileUrl.startsWith('data:image/') || 
        att.fileName.match(/\.(jpg|jpeg|png|webp|gif)$/i)
      );

      if (isImage && att.fileUrl) {
        try {
          // Add the image to the PDF
          doc.addImage(att.fileUrl, 'JPEG', 14, attachmentsY, 60, 45);
          doc.setFontSize(9);
          doc.setTextColor(100, 116, 139);
          doc.text(`File: ${att.fileName}`, 14, attachmentsY + 48);
          attachmentsY += 55;
        } catch (e) {
          // Fallback if image can't be rendered
          doc.setFontSize(9);
          doc.setTextColor(185, 28, 28);
          doc.text(`[Image: ${att.fileName}]`, 14, attachmentsY);
          attachmentsY += 6;
        }
      } else {
        // Non-image attachment
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(`📄 Document: ${att.fileName}`, 14, attachmentsY);
        attachmentsY += 6;
      }
      
      attachmentsY += 4;
    }
  } else {
    // No attachments message
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('No attachments provided for this request.', 14, attachmentsY);
  }

  const blob = doc.output('blob');
  return of(blob);
}

  // Update the order PDF to show item images

private generateMockOrderPDF(orderId: string, order?: MasterOrder): Observable<Blob> {
  const doc = new jsPDF();
  
  // Header Banner
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('REQUEST FOR QUOTATION', 14, 25);
  
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const greeting = 'Dear Prospective Supplier,';
  const orderTitle = order?.orderName || 'the requested items';
  const bodyText = `Kindly submit a quotation for the '${orderTitle}' based on quantities and specifications in this document.`;
  
  doc.text(greeting, 14, 52);
  
  const bodyLines = doc.splitTextToSize(bodyText, 180);
  doc.text(bodyLines, 14, 62);

  let infoY = 70 + (bodyLines.length * 5);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  
  if (order?.projectName) {
    doc.text(`Project: ${order.projectName}`, 14, infoY);
    infoY += 5;
  }
  if (order?.departmentName) {
    doc.text(`Department: ${order.departmentName}`, 14, infoY);
    infoY += 5;
  }
  
  const itemsY = infoY + 8;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Order Items', 14, itemsY);

  const currency = order?.currency ?? 'NGN';

  const itemRows = order?.items?.map((item, i) => [
    (i + 1).toString(),
    item.productName || 'N/A',
    item.quantity?.toString() || '0',
    `${currency} ${Number(item.budget).toLocaleString() || '0'}`,
    item.deliveryLocation || order.masterDeliveryLocation || 'N/A'
  ]) ?? [['-', 'No items available', '-', '-', '-']];

  if (order?.items && order.items.length > 0) {
    const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);
    itemRows.push([
      'TOTAL',
      '',
      totalQty.toString(),
      `${currency} ${Number(order.totalBudget).toLocaleString() || '0'}`,
      ''
    ]);
  }

  autoTable(doc, {
    startY: itemsY + 5,
    head: [['#', 'Product', 'Qty', 'Budget', 'Delivery Location']],
    body: itemRows,
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85] }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 10;

  // ========== ADD ITEM IMAGES/ATTACHMENTS ==========
  if (order?.items) {
    for (const item of order.items) {
      if (item.attachments && item.attachments.length > 0) {
        // Check if we need a new page
        if (currentY > 220) {
          doc.addPage();
          currentY = 20;
        }
        
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text(`Specifications for: ${item.productName}`, 14, currentY);
        currentY += 8;
        
        for (const att of item.attachments) {
          if (currentY > 250) {
            doc.addPage();
            currentY = 20;
          }
          
          const isImage = att.fileUrl && (
            att.fileUrl.startsWith('data:image/') || 
            att.fileName.match(/\.(jpg|jpeg|png|webp|gif)$/i)
          );
          
          if (isImage && att.fileUrl) {
            try {
              // Add image with proper dimensions
              doc.addImage(att.fileUrl, 'JPEG', 14, currentY, 70, 50);
              doc.setFontSize(8);
              doc.setTextColor(100, 116, 139);
              doc.text(att.fileName, 14, currentY + 53);
              currentY += 60;
            } catch (e) {
              console.error('Failed to add image:', e);
              doc.setFontSize(9);
              doc.setTextColor(185, 28, 28);
              doc.text(`[Image: ${att.fileName}]`, 14, currentY);
              currentY += 6;
            }
          } else {
            doc.setFontSize(9);
            doc.setTextColor(71, 85, 105);
            doc.text(`📄 ${att.fileName}`, 14, currentY);
            currentY += 6;
          }
          currentY += 4;
        }
        currentY += 6;
      }
    }
  }

  // Special Instructions
  if (order?.masterSpecialInstructions) {
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Special Instructions:', 14, currentY);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    const instructions = doc.splitTextToSize(order.masterSpecialInstructions, 180);
    doc.text(instructions, 14, currentY + 6);
    currentY += 10 + (instructions.length * 5);
  }

  // Vendor Targeting
  if (currentY > 250) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Vendor Targeting:', 14, currentY);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const vendorTargetText = (order?.selectedVendors?.length ?? 0) > 0 
    ? `Selected Vendors: ${order!.selectedVendors!.join(', ')}` 
    : 'Broadcast to all registered vendors';
  doc.text(vendorTargetText, 14, currentY + 6);

  const blob = doc.output('blob');
  return of(blob);
}

  private generateMockExcel(requestIds: string[]): Observable<Blob> {
    const rows = [
      ['Request ID', 'Product', 'Quantity', 'Budget', 'Status', 'Created Date']
    ];

    if (requestIds && requestIds.length > 0) {
      requestIds.forEach((id, i) => {
        rows.push([
          id,
          `Product ${i + 1}`,
          String(Math.floor(Math.random() * 100)),
          `$${Math.floor(Math.random() * 50000)}`,
          ['Pending', 'Approved', 'Completed'][Math.floor(Math.random() * 3)],
          new Date().toLocaleDateString()
        ]);
      });
    } else {
      rows.push(['REQ1001', 'Office Laptops', '15', '$22,500', 'In Progress', new Date().toLocaleDateString()]);
      rows.push(['REQ1002', 'Desk Chairs', '40', '$12,000', 'Pending', new Date().toLocaleDateString()]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Requests');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    return of(blob);
  }

  private generateMockOrderExcel(orderIds: string[]): Observable<Blob> {
  // Create worksheet data with one row per order
  const rows: any[][] = [
    ['Order ID', 'Order Name', 'Total Items', 'Total Quantity', 'Total Budget', 'Currency', 'Delivery Location', 'Status', 'Created Date']
  ];
  
  if (orderIds && orderIds.length > 0) {
    orderIds.forEach((id, index) => {
      rows.push([
        id,
        `Order ${index + 1}`,
        Math.floor(Math.random() * 10) + 1,
        Math.floor(Math.random() * 100) + 10,
        Math.floor(Math.random() * 5000000),
        'NGN',
        'Lagos, Nigeria',
        ['Pending Approval', 'Approved', 'Quoting'][Math.floor(Math.random() * 3)],
        new Date().toLocaleDateString()
      ]);
    });
  } else {
    rows.push(['ORD-001', 'Office Supplies Order', 5, 150, 1250000, 'NGN', 'Lagos, Nigeria', 'Pending Approval', new Date().toLocaleDateString()]);
    rows.push(['ORD-002', 'Equipment Purchase', 3, 25, 850000, 'NGN', 'Abuja, Nigeria', 'Approved', new Date().toLocaleDateString()]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Orders');
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  return of(blob);
}

  private generateMockCSV(requestIds: string[]): Observable<Blob> {
    const rows = [
      ['Request ID', 'Product', 'Quantity', 'Budget', 'Status', 'Created Date']
    ];

    if (requestIds && requestIds.length > 0) {
      requestIds.forEach((id, i) => {
        rows.push([
          id,
          `Product ${i + 1}`,
          String(Math.floor(Math.random() * 100)),
          `$${Math.floor(Math.random() * 50000)}`,
          ['Pending', 'Approved', 'Completed'][Math.floor(Math.random() * 3)],
          new Date().toLocaleDateString()
        ]);
      });
    } else {
      rows.push(['REQ1001', 'Office Laptops', '15', '$22,500', 'In Progress', new Date().toLocaleDateString()]);
      rows.push(['REQ1002', 'Desk Chairs', '40', '$12,000', 'Pending', new Date().toLocaleDateString()]);
    }

    const csvContent = rows.map(row => row.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    return of(blob);
  }

  private generateMockOrderCSV(orderIds: string[]): Observable<Blob> {
    const rows: string[][] = [
      ['Order ID', 'Order Name', 'Item #', 'Product', 'Description', 'Qty', 'Budget', 'Currency', 'Delivery Location', 'Special Instructions']
    ];
    orderIds.forEach((id, oi) => {
      rows.push([
        id, 
        `Order ${oi + 1}`, 
        '1', 
        'N/A', 
        'Mocked item description', 
        '10', 
        '5000', 
        'NGN', 
        'Lagos Office', 
        'Handle with care'
      ]);
    });

    const csvContent = rows.map(row => row.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    return of(blob);
  }

  private simulateExportProgress(exportId: string, options: ExportOptions): void {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      
      if (progress <= 100) {
        this.exportProgress.set(exportId, {
          status: progress === 100 ? 'COMPLETED' : 'PROCESSING',
          progress,
          message: progress === 100 ? 'Export ready for download' : `Processing... ${progress}%`,
          downloadUrl: progress === 100 ? '/exports/sample.pdf' : undefined
        });
      }
      
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          this.exportProgress.delete(exportId);
        }, 30000);
      }
    }, 500);
  }
}  