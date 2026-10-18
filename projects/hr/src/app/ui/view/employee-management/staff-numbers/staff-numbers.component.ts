import { Component, OnInit } from '@angular/core';
import { EmployeeService } from '../../../service/employee.service';

interface StaffNumberRow {
  id: number;
  name: string;
  jobTitle: string;
  department: string;
  staffNumber: string;
  editing: boolean;
  saving: boolean;
  originalStaffNumber: string;
  raw: any;
}

@Component({
  selector: 'app-staff-numbers',
  templateUrl: './staff-numbers.component.html',
  styleUrls: ['./staff-numbers.component.scss'],
})
export class StaffNumbersComponent implements OnInit {
  rows: StaffNumberRow[] = [];
  loading = false;
  searchTerm = '';
  successIds = new Set<number>();
  errorIds: Record<number, string> = {};

  constructor(private employeeService: EmployeeService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.employeeService.getAllEmployee().subscribe({
      next: (employees: any[]) => {
        this.rows = employees.map(e => ({
          id: e.id,
          name: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim(),
          jobTitle: e.jobTitle ?? '',
          department: e.department?.name ?? e.department ?? '',
          staffNumber: e.staffNumber ?? '',
          editing: false,
          saving: false,
          originalStaffNumber: e.staffNumber ?? '',
          raw: e,
        }));
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  get filtered(): StaffNumberRow[] {
    if (!this.searchTerm) return this.rows;
    const q = this.searchTerm.toLowerCase();
    return this.rows.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.staffNumber.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q)
    );
  }

  get assignedCount(): number {
    return this.rows.filter(r => !!r.originalStaffNumber).length;
  }

  get unassignedCount(): number {
    return this.rows.filter(r => !r.originalStaffNumber).length;
  }

  startEdit(row: StaffNumberRow): void {
    row.editing = true;
    delete this.errorIds[row.id];
  }

  cancelEdit(row: StaffNumberRow): void {
    row.staffNumber = row.originalStaffNumber;
    row.editing = false;
    delete this.errorIds[row.id];
  }

  saveRow(row: StaffNumberRow): void {
    if (row.staffNumber === row.originalStaffNumber) {
      row.editing = false;
      return;
    }
    row.saving = true;
    const r = row.raw;
    const payload = {
      ...r,
      staffNumber: row.staffNumber,
      departmentId: r.department?.id ?? r.departmentId ?? null,
      levelId: r.level?.id ?? r.levelId ?? null,
      genderId: r.gender?.id ?? r.genderId ?? null,
      religionId: r.religion?.id ?? r.religionId ?? null,
      maritalStatusId: r.maritalStatus?.id ?? r.maritalStatusId ?? null,
      relationshipId: r.relationship?.id ?? r.relationshipId ?? null,
      jobTypeId: r.jobType?.id ?? r.jobTypeId ?? null,
      employeeMediaId: r.employeeMedia?.id ?? r.employeeMediaId ?? null,
      userId: r.user?.id ?? r.userId ?? null,
    };
    this.employeeService.updateEmployee(payload, row.id).subscribe({
      next: () => {
        row.originalStaffNumber = row.staffNumber;
        row.editing = false;
        row.saving = false;
        delete this.errorIds[row.id];
        this.successIds.add(row.id);
        setTimeout(() => this.successIds.delete(row.id), 2500);
      },
      error: (err: any) => {
        row.saving = false;
        this.errorIds[row.id] = err?.error?.message ?? 'Save failed. Please try again.';
      }
    });
  }
}
