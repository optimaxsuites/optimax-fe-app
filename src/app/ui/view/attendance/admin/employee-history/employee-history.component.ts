import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AttendancetableService } from '../../../../service/attendance/attendancetable.service';
import { AttendanceTableRecord } from '../../../../domain/attendance/attendancetable.dto';
import { ToastService } from '../../../../shared-component/service/toast/toast.service';
import { BRANCH_NAMES } from '../../../../domain/attendance/attendancetable.mock';

@Component({
  selector: 'app-employee-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-history.component.html',
  styleUrl: './employee-history.component.scss'
})
export class EmployeeHistoryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private attendanceService = inject(AttendancetableService);
  private toastService = inject(ToastService);

  employeeName: string = '';
  employeeRecords: AttendanceTableRecord[] = [];
  filteredRecords: AttendanceTableRecord[] = [];
  isLoading = true;

  startDate = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
  endDate = new Date().toISOString().split('T')[0];

  summary = {
    total: 0,
    present: 0,
    late: 0,
    absent: 0,
    avgHours: 0
  };

  ngOnInit(): void {
    this.employeeName = this.route.snapshot.queryParamMap.get('name') || '';
    if (!this.employeeName) {
      this.toastService.error('Employee name not provided');
      this.router.navigate(['/attendance/admin']);
      return;
    }

    this.loadEmployeeHistory();
  }

  loadEmployeeHistory(): void {
    this.isLoading = true;
    this.attendanceService.attendance$.subscribe(data => {
      this.employeeRecords = data.filter(r => r.employee === this.employeeName);
      this.applyFilters();
      this.isLoading = false;
    });
  }

  applyFilters(): void {
    this.filteredRecords = this.employeeRecords.filter(record => {
      const recordDate = record.date ?? '';
      if (this.startDate && recordDate < this.startDate) return false;
      if (this.endDate && recordDate > this.endDate) return false;
      return true;
    });

    this.calculateSummary();
  }

  calculateSummary(): void {
    const total = this.filteredRecords.length;
    const presentCount = this.filteredRecords.filter(r => r.status === 'PRESENT').length;
    const lateCount = this.filteredRecords.filter(r => r.status === 'LATE').length;
    const absentCount = this.filteredRecords.filter(r => r.status === 'ABSENT').length;
    const totalHours = this.filteredRecords.reduce((sum, r) => sum + (r.hours || 0), 0);

    this.summary = {
      total,
      present: presentCount,
      late: lateCount,
      absent: absentCount,
      avgHours: total > 0 ? Math.round((totalHours / total) * 100) / 100 : 0
    };
  }

  getBranchName(branchId?: number): string {
    if (!branchId) return '-';
    return BRANCH_NAMES[branchId] || '-';
  }

  exportHistory(): void {
    if (this.filteredRecords.length === 0) {
      this.toastService.warning('No records to export');
      return;
    }

    const headers = ['Date', 'Clock In', 'Clock Out', 'Status', 'Hours', 'Department', 'Branch'];
    let csv = headers.join(',') + '\n';

    this.filteredRecords.forEach(r => {
      const row = [
        r.date,
        r.checkIn || '-',
        r.checkOut || '-',
        r.status,
        r.hours || 0,
        r.department,
        this.getBranchName(r.checkedInBranchId)
      ];
      csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${this.employeeName}-history-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.toastService.success(`✅ ${this.employeeName}'s history exported`);
  }

  goBack(): void {
    this.router.navigate(['/attendance/admin']);
  }
}
