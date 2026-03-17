import { Component, Input } from '@angular/core';
import { AttendanceTableRecord } from '../../../../../domain/attendance/attendancetable.dto';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-adminexport',
  templateUrl: './adminexport.component.html',
  styleUrl: './adminexport.component.scss'
})

export class AdminexportComponent {
  @Input() data: AttendanceTableRecord[] = [];
  @Input() filters: any;

 //to generate the file's title
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

  doc.text(this.generateTitle(), 14, 15);

  autoTable(doc, {
    startY: 20,
    head: [Object.keys(this.data[0])],
    body: this.data.map(record => Object.values(record))
  });

  doc.save(this.generateTitle() + '.pdf');
}


}
