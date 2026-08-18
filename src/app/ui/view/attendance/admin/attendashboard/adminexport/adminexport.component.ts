import { Component, Input, inject, ViewChild, ElementRef } from '@angular/core';
import { AttendanceTableRecord } from '../../../../../domain/attendance/attendancetable.dto';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AttendancetableService } from '../../../../../service/attendance/attendancetable.service';

@Component({
  selector: 'app-adminexport',
  templateUrl: './adminexport.component.html',
  styleUrl: './adminexport.component.scss'
})

export class AdminexportComponent {
  @Input() data: AttendanceTableRecord[] = [];
  @Input() filters: any;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private attendancetableService = inject(AttendancetableService);

  generateTitle(): string {

    const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');

    let title = `Attendance Records for `;

    // Date period
    if (this.filters?.dateFrom && this.filters?.dateTo) {
      title += `${this.filters.dateFrom} to ${this.filters.dateTo} `;
    } else if (this.filters?.dateFrom) {
      title += `${this.filters.dateFrom} `;
    } else {
      title += `${today} `;
    }

    // Department
    if (this.filters?.department) {
      title += `${this.filters.department} `;
    }

    // Employee ID
    if (this.filters?.id) {
      title += `Employee ${this.filters.id} `;
    }

    // Employee Name
    if (this.filters?.employee) {
      title += `${this.filters.employee} `;
    }

    // Status
    if (this.filters?.status) {
      title += `${this.filters.status} `;
    }

    return title.trim();
}

exportCSV() {
  if (!this.data.length) return;

  const headers = Object.keys(this.data[0]).join(',');

  const rows = this.data.map(record =>
    Object.values(record)
      .map(value => `"${value ?? ''}"`)
      .join(',')
  );

  const csvContent = [headers, ...rows].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = this.generateTitle() + '.csv';
  link.click();
}

exportExcel() {
  if (!this.data.length) return;

  const worksheet = XLSX.utils.json_to_sheet(this.data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

  XLSX.writeFile(workbook, this.generateTitle() + '.xlsx');
}

exportPDF() {
  if (!this.data.length) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.text(this.generateTitle(), pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 25, { align: 'center' });

  const tableData = this.data.map(record => [
    record.employee || '-',
    record.department || '-',
    record.date || '-',
    record.checkIn || '-',
    record.checkOut || '-',
    record.status || '-',
    record.hours || '0'
  ]);

  autoTable(doc, {
    head: [['Employee', 'Department', 'Date', 'Clock In', 'Clock Out', 'Status', 'Hours']],
    body: tableData,
    startY: 35,
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 4
    },
    headStyles: {
      fillColor: [46, 98, 118],
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    margin: { top: 35 }
  });

  const pageCount = (doc as any).internal.pages.length - 1;
  doc.setFontSize(8);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  doc.save(this.generateTitle() + '.pdf');
}

importModalOpen = false;
exportDropdownOpen = false;

openImportModal() {
  this.importModalOpen = true;
}

closeImportModal() {
  this.importModalOpen = false;
}

toggleExportDropdown() {
  this.exportDropdownOpen = !this.exportDropdownOpen;
}

closeExportDropdown() {
  this.exportDropdownOpen = false;
}

downloadTemplate() {
  const template = [
    {
      ID: '',
      Employee: '',
      Department: '',
      Date: '',
      In: '',
      Out: '',
      InLocation: '',
      OutLocation: '',
      Status: '',
      Hours: ''
    },
    {
      ID: '001',
      Employee: 'Damilola Awe',
      Department: 'Engineering',
      Date: 'YYYY-MM-DD',
      In: 'HH:mm',
      Out: 'HH:mm',
      InLocation: 'Office HQ',
      OutLocation: 'Office HQ',
      Status: 'PRESENT / LATE / ABSENT',
      Hours: 'Optional'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');

  XLSX.writeFile(wb, 'Attendance_Template.xlsx');
}

normalizeDate(date: any): string {
  if (!date) return '';

  // Excel numeric date
  if (typeof date === 'number') {
    return XLSX.SSF.format('yyyy-mm-dd', date);
  }

  // Normal string date
  return new Date(date).toISOString().split('T')[0];
}

normalizeTime(time: any): string | null {

  if (!time) return null;

  // Excel numeric time (fraction of day)
  if (typeof time === 'number') {
    const totalMinutes = Math.round(time * 24 * 60);

    const hours = Math.floor(totalMinutes / 60)
      .toString()
      .padStart(2, '0');

    const minutes = (totalMinutes % 60)
      .toString()
      .padStart(2, '0');

    return `${hours}:${minutes}`;
  }

  // If already a string like 08:30:00
  if (typeof time === 'string') {
    return time.substring(0,5); // keep HH:mm only
  }

  return null;
}

importNow() {

  const file = this.fileInput.nativeElement.files?.[0];

  if (!file) {
    alert('Please select a file first');
    return;
  }

  const reader = new FileReader();

  reader.onload = (e: any) => {

    const binaryStr = e.target.result;
    const workbook = XLSX.read(binaryStr, { type: 'binary' });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const jsonData = XLSX.utils.sheet_to_json(sheet);

    const formattedData: AttendanceTableRecord[] = jsonData
      .filter((row: any) => row.ID && row.Employee && row.Date)
      .map((row: any) => ({
        id: 0, //attendancerecordID not provided in Excel
        employeeId:Number(row.ID),
        employee: row.Employee,
        department: row.Department,
        date: this.normalizeDate(row.Date),
        checkIn: this.normalizeTime(row.In),
        checkOut: this.normalizeTime(row.Out),
        checkInLocation: row.InLocation
          ? { address: row.InLocation, lat: 0, lng: 0 }
          : null,
        checkOutLocation: row.OutLocation
          ? { address: row.OutLocation, lat: 0, lng: 0 }
          : null,
        status: row.Status || 'ABSENT',
        hours: Number(row.Hours) || 0
      }));

    this.attendancetableService.importAttendance(formattedData);

    this.closeImportModal();
  };

  reader.readAsBinaryString(file);
}

previewData: AttendanceTableRecord[] = [];
}
