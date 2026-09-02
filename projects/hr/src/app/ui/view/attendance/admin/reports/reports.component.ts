import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AttendancetableService } from '../../../../service/attendance/attendancetable.service';
import { AttendanceTableRecord } from '../../../../domain/attendance/attendancetable.dto';
import { ToastService } from '../../../../shared-component/service/toast/toast.service';
import { MOCK_ATTENDANCE, BRANCHES, BRANCH_NAMES } from '../../../../domain/attendance/attendancetable.mock';
import { TableComponent, TableColumn, TableAction } from '../../../../shared-component/view/table/table.component';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, TableComponent],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {
  private attendanceService: AttendancetableService = inject(AttendancetableService);
  private toastService: ToastService = inject(ToastService);
  private router: Router = inject(Router);

  attendance: AttendanceTableRecord[] = [];
  filteredAttendance: AttendanceTableRecord[] = [];
  groupedSummary: any[] = [];
  paginatedGroupedSummary: any[] = [];
  isLoading = false;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [10, 25, 50, 100];

  startDate = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0];
  endDate = new Date().toISOString().split('T')[0];

  filters = {
    employee: '',
    department: '',
    status: '',
    branch: ''
  };

  departments: string[] = [];
  branches = Object.entries(BRANCH_NAMES).map(([id, name]) => ({ id: parseInt(id), name }));

  summary = {
    present: 0,
    late: 0,
    absent: 0,
    pendingReview: 0,
    total: 0
  };

  tableColumns: TableColumn[] = [
    { header: 'Employee', field: 'employee' },
    { header: 'Department', field: 'department' },
    { 
      header: 'Date', 
      field: 'date',
      formatter: (row: any) => {
        if (!row.date) return '-';
        if (row.date instanceof Date) {
          return row.date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
        }
        return row.date;
      }
    },
    { header: 'Location', field: 'location' },
    { header: 'Total Hours', field: 'totalHours' },
    { header: 'Cumulative Days', field: 'cumulativeDays' }
  ];

  tableActions: TableAction[] = [
    { id: 'history', icon: 'fa-solid fa-chart-line', label: 'History' }
  ];

  ngOnInit(): void {
    this.loadAttendance();
  }

  loadAttendance(): void {
    this.isLoading = true;
    this.attendanceService.attendance$.subscribe(data => {
      this.attendance = data;
      const uniqueDepts = [...new Set(data.map(r => r.department))];
      this.departments = uniqueDepts as string[];
      this.applyFilters();
      this.isLoading = false;
    });
  }

  applyFilters(): void {
    this.filteredAttendance = this.attendance.filter(record => {
      const recordDate = record.date ?? '';

      if (this.startDate && recordDate < this.startDate) return false;
      if (this.endDate && recordDate > this.endDate) return false;

      if (this.filters.employee && !record.employee.toLowerCase().includes(this.filters.employee.toLowerCase())) {
        return false;
      }

      if (this.filters.department && record.department !== this.filters.department) {
        return false;
      }

      if (this.filters.status && record.status !== this.filters.status) {
        return false;
      }

      if (this.filters.branch) {
        const branchId = parseInt(this.filters.branch);
        if (record.checkedInBranchId !== branchId) {
          return false;
        }
      }

      return true;
    });

    this.calculateSummary();
  }

  calculateSummary(): void {
    const total = this.filteredAttendance.length;
    this.summary = {
      present: this.filteredAttendance.filter(r => r.status === 'PRESENT').length,
      late: this.filteredAttendance.filter(r => r.status === 'LATE').length,
      absent: this.filteredAttendance.filter(r => r.status === 'ABSENT').length,
      pendingReview: this.filteredAttendance.filter(r => r.correctionRequest?.status === 'PENDING').length,
      total
    };
    this.groupAttendanceByEmployee();
  }

  groupAttendanceByEmployee(): void {
    const groupedMap = new Map<string, any>();

    this.filteredAttendance.forEach(record => {
      const key = record.employee;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          employeeId: record.employeeId,
          employee: record.employee,
          department: record.department,
          date: record.date,
          location: record.checkInLocation?.address || '-',
          totalHours: 0,
          cumulativeDays: 0
        });
      }

      const group = groupedMap.get(key);
      group.totalHours += record.hours || 0;

      if (record.status === 'PRESENT' || record.status === 'LATE') {
        group.cumulativeDays += 1;
      }
    });

    this.groupedSummary = Array.from(groupedMap.values());
    this.currentPage = 1; // Reset to first page when data changes
    this.updatePaginatedData();
  }

  // ========== PAGINATION ==========
  updatePaginatedData(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedGroupedSummary = this.groupedSummary.slice(start, end);
  }

  getTotalPages(): number {
    return Math.ceil(this.groupedSummary.length / this.pageSize);
  }

  getStartRecord(): number {
    if (this.groupedSummary.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndRecord(): number {
    const end = this.currentPage * this.pageSize;
    return end > this.groupedSummary.length ? this.groupedSummary.length : end;
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

  getPercentage(count: number): number {
    return this.summary.total > 0 ? Math.round((count / this.summary.total) * 100) : 0;
  }

  resetFilters(): void {
    this.filters = { employee: '', department: '', status: '', branch: '' };
    this.applyFilters();
    this.toastService.info('Filters reset');
  }

  exportCsv(): void {
    if (this.filteredAttendance.length === 0) {
      this.toastService.warning('No records to export');
      return;
    }

    const headers = ['Employee', 'Department', 'Date', 'Clock In', 'Clock Out', 'Status', 'Hours', 'Branch'];
    const rows = this.filteredAttendance.map(r => [
      r.employee,
      r.department,
      r.date ? (r.date instanceof Date ? r.date.toLocaleDateString('en-CA') : r.date) : '-',
      r.checkIn || '-',
      r.checkOut || '-',
      r.status,
      r.hours || 0,
      this.getBranchName(r.checkedInBranchId)
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.toastService.success('✅ Report exported as CSV');
  }

  exportExcel(): void {
    if (this.filteredAttendance.length === 0) {
      this.toastService.warning('No records to export');
      return;
    }

    const worksheetData = this.filteredAttendance.map(r => ({
      'Employee': r.employee,
      'Department': r.department,
      'Date': r.date ? (r.date instanceof Date ? r.date.toLocaleDateString('en-CA') : r.date) : '-',
      'Clock In': r.checkIn || '-',
      'Clock Out': r.checkOut || '-',
      'Status': r.status,
      'Hours': r.hours || 0,
      'Branch': this.getBranchName(r.checkedInBranchId)
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');
    
    const filename = `attendance-report-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);

    this.toastService.success('✅ Report exported as Excel');
  }

  exportPdf(): void {
    if (this.filteredAttendance.length === 0) {
      this.toastService.warning('No records to export');
      return;
    }

    const doc = new jsPDF();
    const title = 'Attendance Report';
    const date = new Date().toLocaleDateString();

    doc.setFontSize(16);
    doc.text(title, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Generated: ${date}`, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });

    const tableData = this.filteredAttendance.map(r => [
      r.employee,
      r.department,
      r.date ? (r.date instanceof Date ? r.date.toLocaleDateString('en-CA') : r.date) : '-',
      r.checkIn || '-',
      r.checkOut || '-',
      r.status,
      r.hours || 0,
      this.getBranchName(r.checkedInBranchId)
    ]);

    autoTable(doc, {
      head: [['Employee', 'Department', 'Date', 'Clock In', 'Clock Out', 'Status', 'Hours', 'Branch']],
      body: tableData,
      startY: 30,
      styles: { fontSize: 9 },
      margin: { top: 30 }
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 10);
    }

    doc.save(`attendance-report-${new Date().toISOString().split('T')[0]}.pdf`);
    this.toastService.success('✅ Report exported as PDF');
  }

  getBranchName(branchId?: number): string {
    if (!branchId) return '-';
    return BRANCH_NAMES[branchId] || '-';
  }

  onTableActionClick(event: { actionId: string; row: any }): void {
    if (event.actionId === 'history') {
      if (!event.row.employee) {
        this.toastService.error('Employee name not found');
        return;
      }
      this.router.navigate(['/attendance/employee-history'], {
        queryParams: { id: event.row.employeeId, name: event.row.employee }
      }).catch(err => {
        this.toastService.error('Failed to navigate to employee history');
        console.error('Navigation error:', err);
      });
    }
  }


  getEmployeeHistory(employee: string): AttendanceTableRecord[] {
    return this.attendance.filter(r => r.employee === employee);
  }

  exportEmployeeHistory(employee: string): void {
    const employeeRecords = this.getEmployeeHistory(employee);
    if (employeeRecords.length === 0) {
      this.toastService.warning('No records found for this employee');
      return;
    }

    const headers = ['Employee', 'Department', 'Date', 'Clock In', 'Clock Out', 'Status', 'Hours', 'Branch'];
    let csv = headers.join(',') + '\n';

    employeeRecords.forEach(r => {
      const row = [
        r.employee,
        r.department,
        r.date,
        r.checkIn || '-',
        r.checkOut || '-',
        r.status,
        r.hours || 0,
        this.getBranchName(r.checkedInBranchId)
      ];
      csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance-${employee}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.toastService.success(`✅ ${employee}'s history exported`);
  }
}
