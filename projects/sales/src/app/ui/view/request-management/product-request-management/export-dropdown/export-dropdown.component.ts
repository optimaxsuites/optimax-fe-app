// src/app/ui/shared/export-dropdown/export-dropdown.component.ts

import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { saveAs } from 'file-saver';
import { ExportService, ExportOptions } from '../../../../service/procurement-request-management/product-request-management/export.service';
import { MasterOrder } from '../../../../domain/procurement-request/product-requests/product-requests.dto';

@Component({
  selector: 'app-export-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './export-dropdown.component.html',
  styleUrls: ['./export-dropdown.component.scss']
})
export class ExportDropdownComponent {
  @Input() mode: 'single' | 'bulk' = 'single';
  @Input() rowType: 'REQUEST' | 'ORDER' = 'REQUEST';
  @Input() order?: MasterOrder; // Pass full order for richer PDF output
  @Input() requestIds: string[] = [];
  @Input() disabled = false;
  @Output() exported = new EventEmitter<Blob>();

  showDropdown = false;
  selectedFormat: 'PDF' | 'EXCEL' | 'CSV' = 'PDF';
  includeTimeline = true;
  includeQuotations = true;
  includeAttachments = false;
  dateFrom = '';
  dateTo = '';
  
  isExporting = false;
  exportProgress = 0;
  progressMessage = '';

  constructor(private exportService: ExportService) {}

  toggleDropdown(): void {
    if (this.disabled) return;
    this.showDropdown = !this.showDropdown;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.export-container')) {
      this.showDropdown = false;
    }
  }

  export(): void {
    this.isExporting = true;
    this.exportProgress = 0;
    this.progressMessage = 'Preparing export...';

    // Simulate progress
    const interval = setInterval(() => {
      if (this.exportProgress < 90) {
        this.exportProgress += 10;
        this.progressMessage = `Exporting... ${this.exportProgress}%`;
      }
    }, 300);

    let exportObservable;

    if (this.rowType === 'ORDER') {
      if (this.mode === 'single' && this.requestIds.length === 1) {
        exportObservable = this.exportService.exportOrderToPDF(this.requestIds[0], this.order);
      } else {
        exportObservable = this.exportService.exportOrdersToExcel(this.requestIds, { format: this.selectedFormat });
      }
    } else {
      const exportOptions: ExportOptions = {
        format: this.selectedFormat,
        type: this.mode === 'single' ? 'REQUEST' : 'REQUESTS',
        ids: this.requestIds,
        includeTimeline: this.includeTimeline,
        includeQuotations: this.includeQuotations,
        includeAttachments: this.includeAttachments,
        dateRange: this.dateFrom && this.dateTo ? {
          start: new Date(this.dateFrom),
          end: new Date(this.dateTo)
        } : undefined
      };
      if (this.mode === 'single' && this.requestIds.length === 1) {
        exportObservable = this.exportService.exportRequestToPDF(this.requestIds[0], exportOptions);
      } else {
        exportObservable = this.exportService.exportRequestsToExcel(this.requestIds, exportOptions);
      }
    }

    let ext: string;

    if (this.rowType === 'ORDER') {
      if (this.mode === 'single') {
        ext = 'pdf';
      } else {
        ext = this.selectedFormat === 'CSV' ? 'csv' : 'xlsx';
      }
    } else {
      if (this.selectedFormat === 'PDF') ext = 'pdf';
      else if (this.selectedFormat === 'EXCEL') ext = 'xlsx';
      else ext = 'csv';
    }
    const fileName = `${this.rowType === 'ORDER' ? 'order' : 'request'}_export_${new Date().toISOString().slice(0, 19)}.${ext}`;

    exportObservable.subscribe({
      next: (blob: Blob) => {
        clearInterval(interval);
        this.exportProgress = 100;
        this.progressMessage = 'Complete!';
        
        saveAs(blob, fileName);
        
        this.exported.emit(blob);
        
        setTimeout(() => {
          this.isExporting = false;
          this.showDropdown = false;
        }, 500);
      },
      error: (error: Error) => {
        clearInterval(interval);
        console.error('Export failed:', error);
        this.isExporting = false;
        alert('Export failed. Please try again.');
      }
    });
  }
}