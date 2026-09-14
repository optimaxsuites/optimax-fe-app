import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { AttendancetableService } from '../../../../service/attendance/attendancetable.service';
import { ExportService } from '../../../../service/export.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-attendance-reports',
  templateUrl: './attendance-reports.component.html',
  styleUrl: './attendance-reports.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttendanceReportsComponent implements OnInit {
  activeTab: 'weekly' | 'monthly' | 'trend' | 'compliance' = 'weekly';

  // Weekly Summary
  weeklyStartDate = this.formatDate(new Date(new Date().setDate(new Date().getDate() - 7)));
  weeklyEndDate = this.formatDate(new Date());
  weeklySummary: any = null;

  // Monthly Summary
  monthlyYear = new Date().getFullYear();
  monthlyMonth = new Date().getMonth() + 1;
  monthlySummary: any = null;

  // Absenteeism Trend
  trendDays = 30;
  trendData: any[] = [];

  // Compliance Export
  exportStartDate = this.formatDate(new Date(new Date().setMonth(new Date().getMonth() - 1)));
  exportEndDate = this.formatDate(new Date());
  exportDepartment = '';
  exportStatus = '';
  complianceData: any[] = [];
  paginatedComplianceData: any[] = [];
  departments: string[] = [];

  // Pagination
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [10, 25, 50, 100];

  loading = false;
  exporting = false;

  constructor(
    private attendanceService: AttendancetableService,
    private exportService: ExportService
  ) {}

  ngOnInit(): void {
    // Don't load data on init - load on demand
  }

  private loadDepartments(): void {
    if (this.departments.length > 0) return; // Already loaded
    // Get unique departments from attendance records
    const records = (this.attendanceService as any).attendanceSubject.value;
    if (records && records.length > 0) {
      const deptSet = new Set(records.map((r: any) => r.department).filter(Boolean));
      this.departments = Array.from(deptSet) as string[];
    }
  }

  // ========== WEEKLY SUMMARY ==========
  loadWeeklySummary(): void {
    this.loading = true;
    // Run calculation asynchronously to not block UI
    requestAnimationFrame(() => {
      this.weeklySummary = this.attendanceService.getWeeklySummary(
        this.weeklyStartDate,
        this.weeklyEndDate
      );
      this.loading = false;
    });
  }

  // ========== MONTHLY SUMMARY ==========
  loadMonthlySummary(): void {
    this.loading = true;
    requestAnimationFrame(() => {
      this.monthlySummary = this.attendanceService.getMonthlySummary(
        this.monthlyYear,
        this.monthlyMonth
      );
      this.loading = false;
    });
  }

  previousMonth(): void {
    if (this.monthlyMonth === 1) {
      this.monthlyMonth = 12;
      this.monthlyYear--;
    } else {
      this.monthlyMonth--;
    }
    this.loadMonthlySummary();
  }

  nextMonth(): void {
    if (this.monthlyMonth === 12) {
      this.monthlyMonth = 1;
      this.monthlyYear++;
    } else {
      this.monthlyMonth++;
    }
    this.loadMonthlySummary();
  }

  // ========== ABSENTEEISM TREND ==========
  loadAbsenteeismTrend(): void {
    this.loading = true;
    requestAnimationFrame(() => {
      this.trendData = this.attendanceService.getAbsenteeismTrend(this.trendDays);
      this.loading = false;
    });
  }

  avgAbsenteeRate(): number {
    if (this.trendData.length === 0) return 0;
    const avg = this.trendData.reduce((sum, d) => sum + d.absentRate, 0) / this.trendData.length;
    return +avg.toFixed(2);
  }

  maxAbsenteeRate(): number {
    if (this.trendData.length === 0) return 0;
    return Math.max(...this.trendData.map(d => d.absentRate));
  }

  // ========== COMPLIANCE EXPORT ==========
  loadComplianceData(): void {
    this.loading = true;
    this.currentPage = 1; // Reset to first page
    this.loadDepartments(); // Ensure departments are loaded
    requestAnimationFrame(() => {
      this.complianceData = this.attendanceService.getComplianceExportData({
        startDate: this.exportStartDate,
        endDate: this.exportEndDate,
        department: this.exportDepartment || undefined,
        status: this.exportStatus || undefined
      });
      this.updatePaginatedData();
      this.loading = false;
    });
  }

  // ========== PAGINATION ==========
  updatePaginatedData(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedComplianceData = this.complianceData.slice(start, end);
  }

  getTotalPages(): number {
    return Math.ceil(this.complianceData.length / this.pageSize);
  }

  getStartRecord(): number {
    if (this.complianceData.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndRecord(): number {
    const end = this.currentPage * this.pageSize;
    return end > this.complianceData.length ? this.complianceData.length : end;
  }

  nextPage(): void {
    if (this.currentPage < this.getTotalPages()) {
      this.currentPage++;
      this.updatePaginatedData();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedData();
    }
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage = 1;
    this.updatePaginatedData();
  }

  // ========== EXPORTS ==========
  exportWeeklyCSV(): void {
    this.exporting = true;
    const filename = `attendance-weekly-${this.weeklyStartDate}_${this.weeklyEndDate}`;
    const headers = ['Employee', 'Department', 'Date', 'Clock In', 'Clock Out', 'Status', 'Hours', 'Location'];
    this.exportService.exportToCSV(
      this.weeklySummary?.records || [],
      filename,
      headers
    );
    this.exporting = false;
  }

  exportWeeklyExcel(): void {
    this.exporting = true;
    const worksheetData = (this.weeklySummary?.records || []).map((r: any) => ({
      'Employee': r.employee,
      'Department': r.department,
      'Date': r.date ? (r.date instanceof Date ? r.date.toLocaleDateString('en-CA') : r.date) : '-',
      'Clock In': r.checkIn || '-',
      'Clock Out': r.checkOut || '-',
      'Status': r.status,
      'Hours': r.hours || 0,
      'Location': r.checkInLocation?.address || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Weekly Report');
    
    const filename = `attendance-weekly-${this.weeklyStartDate}_${this.weeklyEndDate}.xlsx`;
    XLSX.writeFile(workbook, filename);
    this.exporting = false;
  }

  exportWeeklyJSON(): void {
    this.exporting = true;
    const filename = `attendance-weekly-${this.weeklyStartDate}_${this.weeklyEndDate}`;
    this.exportService.exportToJSON(this.weeklySummary?.records || [], filename);
    this.exporting = false;
  }

  exportMonthlyCSV(): void {
    this.exporting = true;
    const monthName = new Date(this.monthlyYear, this.monthlyMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    const filename = `attendance-monthly-${monthName}`;
    const headers = ['Date', 'Present', 'Late', 'Absent', 'Total Records'];
    this.exportService.exportToCSV(
      this.monthlySummary?.dailyBreakdown || [],
      filename,
      headers
    );
    this.exporting = false;
  }

  exportMonthlyExcel(): void {
    this.exporting = true;
    const monthName = new Date(this.monthlyYear, this.monthlyMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    const worksheetData = (this.monthlySummary?.dailyBreakdown || []).map((day: any) => ({
      'Date': day.date ? (day.date instanceof Date ? day.date.toLocaleDateString('en-CA') : day.date) : '-',
      'Present': day.present,
      'Late': day.late,
      'Absent': day.absent,
      'Total Records': day.totalRecords
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Report');
    
    const filename = `attendance-monthly-${monthName}.xlsx`;
    XLSX.writeFile(workbook, filename);
    this.exporting = false;
  }

  exportTrendCSV(): void {
    this.exporting = true;
    const filename = `absenteeism-trend-${this.trendDays}days`;
    const headers = ['Date', 'Absent Count', 'Total Records', 'Absent Rate (%)'];
    this.exportService.exportToCSV(this.trendData, filename, headers);
    this.exporting = false;
  }

  exportTrendExcel(): void {
    this.exporting = true;
    const worksheetData = (this.trendData || []).map((day: any) => ({
      'Date': day.date ? (day.date instanceof Date ? day.date.toLocaleDateString('en-CA') : day.date) : '-',
      'Absent Count': day.absentCount,
      'Total Records': day.totalRecords,
      'Absent Rate (%)': day.absentRate
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Absenteeism Trend');
    
    const filename = `absenteeism-trend-${this.trendDays}days.xlsx`;
    XLSX.writeFile(workbook, filename);
    this.exporting = false;
  }

  exportComplianceCSV(): void {
    this.exporting = true;
    const filename = `compliance-export-${this.exportStartDate}_${this.exportEndDate}`;
    const headers = ['Employee ID', 'Employee Name', 'Department', 'Date', 'Clock In', 'Clock Out', 'Status', 'Hours', 'Location', 'Verified', 'Verified By', 'Notes'];
    this.exportService.exportToCSV(this.complianceData, filename, headers);
    this.exporting = false;
  }

  exportComplianceExcel(): void {
    this.exporting = true;
    const worksheetData = (this.complianceData || []).map((r: any) => ({
      'Employee ID': r.employeeId,
      'Employee Name': r.employeeName,
      'Department': r.department,
      'Date': r.date ? (r.date instanceof Date ? r.date.toLocaleDateString('en-CA') : r.date) : '-',
      'Clock In': r.clockIn || '-',
      'Clock Out': r.clockOut || '-',
      'Status': r.status,
      'Hours': r.hours,
      'Location': r.location,
      'Verified': r.verified,
      'Verified By': r.verifiedBy,
      'Notes': r.notes
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Compliance Report');
    
    const filename = `compliance-export-${this.exportStartDate}_${this.exportEndDate}.xlsx`;
    XLSX.writeFile(workbook, filename);
    this.exporting = false;
  }

  exportComplianceTSV(): void {
    this.exporting = true;
    const filename = `compliance-export-${this.exportStartDate}_${this.exportEndDate}`;
    const headers = ['Employee ID', 'Employee Name', 'Department', 'Date', 'Clock In', 'Clock Out', 'Status', 'Hours', 'Location', 'Verified', 'Verified By', 'Notes'];
    this.exportService.exportToTSV(this.complianceData, filename, headers);
    this.exporting = false;
  }

  printWeeklySummary(): void {
    const html = this.exportService.generateAttendanceSummaryReport(
      this.weeklySummary,
      `Weekly Attendance Report: ${this.weeklyStartDate} to ${this.weeklyEndDate}`
    );
    this.exportService.printReport('Weekly Attendance Report', html);
  }

  printMonthlySummary(): void {
    const monthName = new Date(this.monthlyYear, this.monthlyMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    const html = this.exportService.generateAttendanceSummaryReport(
      this.monthlySummary,
      `Monthly Attendance Report: ${monthName}`
    );
    this.exportService.printReport('Monthly Attendance Report', html);
  }

  // ========== HELPERS ==========
  private formatDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  getMonthName(): string {
    return new Date(this.monthlyYear, this.monthlyMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  formatPercent(value: number): string {
    return isFinite(value) ? value.toFixed(2) : '0.00';
  }

  getTotalAbsences(): number {
    return this.trendData.reduce((sum, d) => sum + d.absentCount, 0);
  }
}
