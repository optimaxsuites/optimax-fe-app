import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { AttendancetableService } from '../../../../../../service/attendance/attendancetable.service';
import { AttendanceTableRecord } from '../../../../../../domain/attendance/attendancetable.dto';
import { UserSessionService } from '../../../../../../service/attendance/user-session.service';
import { EmployeeService } from '../../../../../../service/employee.service';
import { MessageService } from 'primeng/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-monthlyattendancelist',
  templateUrl: './monthlyattendancelist.component.html',
  styleUrl: './monthlyattendancelist.component.scss'
})
export class MonthlyattendancelistComponent implements OnInit {
  attendanceData: AttendanceTableRecord[] = [];
  filteredData: AttendanceTableRecord[] = [];

  selectedMonth!: string; // format: YYYY-MM
  isLoading = false;

  // Date range filtering
  startDate: string = '';
  endDate: string = '';
  showDateRangeFilter = false;
  showExportMenu = false;

  @Output() filteredDataChange = new EventEmitter<AttendanceTableRecord[]>();

  constructor(
    private attendancetableService: AttendancetableService,
    private userSession: UserSessionService,
    private employeeService: EmployeeService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.setCurrentMonth();
    this.loadAttendance();
  }

  private setCurrentMonth() {
    const now = new Date();
    this.selectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  loadAttendance() {
    this.isLoading = true;

    this.employeeService.getEmployeeIdForCurrentUser().subscribe({
      next: (hrEmployeeId) => {
        this.attendancetableService.fetchByEmployee(Number(hrEmployeeId));

        this.attendancetableService.attendance$.subscribe(data => {
          this.attendanceData = data.filter(
            r => Number(r.employeeId) === Number(hrEmployeeId)
          );

          this.applyMonthFilter();
          this.isLoading = false;
        });
      },
      error: (err) => {
        console.error('Failed to resolve employee', err);
        this.isLoading = false;
      }
    });
  }

  applyMonthFilter() {
    const [year, month] = this.selectedMonth.split('-').map(Number);

    this.filteredData = this.attendanceData.filter(record => {
      if (!record.date) return false;
      const d = new Date(record.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });

    this.filteredDataChange.emit(this.filteredData);
  }

  onMonthChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.selectedMonth = value;
    this.applyMonthFilter();
  }

  toggleDateRangeFilter(): void {
    this.showDateRangeFilter = !this.showDateRangeFilter;
    if (this.showDateRangeFilter && !this.startDate) {
      // Set default date range (last 30 days)
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      this.endDate = today.toISOString().split('T')[0];
      this.startDate = thirtyDaysAgo.toISOString().split('T')[0];
    }
  }

  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }

  closeExportMenu(): void {
    this.showExportMenu = false;
  }

  applyDateRangeFilter(): void {
    if (!this.startDate || !this.endDate) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Date Range Required',
        detail: 'Please select both start and end dates.',
        key: 'tl',
        life: 3000
      });
      return;
    }

    this.filteredData = this.attendanceData.filter(record => {
      if (!record.date) return false;
      return record.date >= this.startDate && record.date <= this.endDate;
    });

    this.filteredDataChange.emit(this.filteredData);
    this.messageService.add({
      severity: 'info',
      summary: 'Filter Applied',
      detail: `Showing ${this.filteredData.length} records`,
      key: 'tl',
      life: 3000
    });
  }

  resetDateRangeFilter(): void {
    this.startDate = '';
    this.endDate = '';
    this.showDateRangeFilter = false;
    this.applyMonthFilter();
    this.messageService.add({
      severity: 'info',
      summary: 'Filter Reset',
      detail: 'Showing all records for selected month',
      key: 'tl',
      life: 3000
    });
  }

  exportToCSV(): void {
    this.closeExportMenu();

    if (this.filteredData.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Records',
        detail: 'No attendance records to export',
        key: 'tl',
        life: 3000
      });
      return;
    }

    const headers = ['Date', 'Clock In', 'Clock Out', 'Hours', 'Status'];
    let csv = headers.join(',') + '\n';

    this.filteredData.forEach(record => {
      const row = [
        record.date || '',
        record.checkIn || '-',
        record.checkOut || '-',
        record.hours || '-',
        record.status || ''
      ];
      csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `my-attendance-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.messageService.add({
      severity: 'success',
      summary: 'Export Successful',
      detail: `Exported ${this.filteredData.length} records as CSV`,
      key: 'tl',
      life: 3000
    });
  }

  exportToPDF(): void {
    this.closeExportMenu();

    if (this.filteredData.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Records',
        detail: 'No attendance records to export',
        key: 'tl',
        life: 3000
      });
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Add title
    doc.setFontSize(16);
    doc.text('Attendance Report', pageWidth / 2, 15, { align: 'center' });

    // Add date range info
    doc.setFontSize(10);
    const dateInfo = this.showDateRangeFilter
      ? `Date Range: ${this.startDate} to ${this.endDate}`
      : `Month: ${this.selectedMonth}`;
    doc.text(dateInfo, pageWidth / 2, 25, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 32, { align: 'center' });

    // Prepare table data
    const tableData = this.filteredData.map(record => [
      record.date || '-',
      record.checkIn || '-',
      record.checkOut || '-',
      record.hours || '-',
      record.status || '-'
    ]);

    // Add table
    autoTable(doc, {
      head: [['Date', 'Clock In', 'Clock Out', 'Hours', 'Status']],
      body: tableData,
      startY: 40,
      styles: {
        font: 'helvetica',
        fontSize: 10,
        cellPadding: 6
      },
      headStyles: {
        fillColor: [46, 98, 118],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { top: 40 }
    });

    // Add footer
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

    // Save PDF
    doc.save(`my-attendance-${new Date().toISOString().split('T')[0]}.pdf`);

    this.messageService.add({
      severity: 'success',
      summary: 'Export Successful',
      detail: `Exported ${this.filteredData.length} records as PDF`,
      key: 'tl',
      life: 3000
    });
  }

}
