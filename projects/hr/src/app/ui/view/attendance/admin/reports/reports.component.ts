import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendancetableService } from '../../../../service/attendance/attendancetable.service';
import { AttendanceTableRecord } from '../../../../domain/attendance/attendancetable.dto';
import { ToastService } from '../../../../shared-component/service/toast/toast.service';
import { MOCK_ATTENDANCE, BRANCHES, BRANCH_NAMES } from '../../../../domain/attendance/attendancetable.mock';
import { TableComponent, TableColumn, TableAction } from '../../../../shared-component/view/table/table.component';

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

  attendance: AttendanceTableRecord[] = [];
  filteredAttendance: AttendanceTableRecord[] = [];
  isLoading = false;
  selectedRecord: AttendanceTableRecord | null = null;
  isEditMode = false;

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
    { header: 'Clock In', field: 'checkIn' },
    { header: 'Clock Out', field: 'checkOut' },
    { header: 'Status', field: 'status' },
    { header: 'Hours', field: 'hours' }
  ];

  tableActions: TableAction[] = [
    { id: 'view', icon: 'fa-solid fa-eye', label: 'View' },
    { id: 'edit', icon: 'fa-solid fa-pen', label: 'Edit' }
  ];

  ngOnInit(): void {
    this.loadAttendance();
  }

  loadAttendance(): void {
    this.isLoading = true;
    setTimeout(() => {
      this.attendance = MOCK_ATTENDANCE;
      const uniqueDepts = [...new Set(MOCK_ATTENDANCE.map(r => r.department))];
      this.departments = uniqueDepts as string[];
      this.applyFilters();
      this.isLoading = false;
    }, 300);
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
  }

  getPercentage(count: number): number {
    return this.summary.total > 0 ? Math.round((count / this.summary.total) * 100) : 0;
  }

  resetFilters(): void {
    this.filters = { employee: '', department: '', status: '', branch: '' };
    this.applyFilters();
    this.toastService.info('Filters reset');
  }

  exportExcel(): void {
    this.toastService.success('Report exported as Excel');
  }

  exportCsv(): void {
    this.toastService.success('Report exported as CSV');
  }

  getBranchName(branchId?: number): string {
    if (!branchId) return '-';
    return BRANCH_NAMES[branchId] || '-';
  }

  onTableActionClick(event: { actionId: string; row: AttendanceTableRecord }): void {
    if (event.actionId === 'view') {
      this.selectedRecord = { ...event.row };
      this.isEditMode = false;
    } else if (event.actionId === 'edit') {
      this.selectedRecord = { ...event.row };
      this.isEditMode = true;
    }
  }

  closeDrawer(): void {
    this.selectedRecord = null;
    this.isEditMode = false;
  }

  cancelEdit(): void {
    this.selectedRecord = null;
    this.isEditMode = false;
  }

  saveRecord(): void {
    if (this.selectedRecord) {
      const index = this.attendance.findIndex(r => r.id === this.selectedRecord!.id);
      if (index !== -1) {
        this.attendance[index] = this.selectedRecord;
        this.applyFilters();
        this.toastService.success(`Record updated for ${this.selectedRecord.employee}`);
      }
    }
    this.cancelEdit();
  }
}
