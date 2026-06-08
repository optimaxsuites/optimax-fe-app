import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { LeaveApiService } from '../../../service/leave-api.service';
import { forkJoin } from 'rxjs';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-assign-leave',
  templateUrl: './assign-leave.component.html',
  styleUrl: './assign-leave.component.scss',
  providers: [MessageService],
})
export class AssignLeaveComponent implements OnInit {
  constructor(
    private messageService: MessageService,
    private leaveApi: LeaveApiService,
  ) {}

  employees: any[] = [];
  leaveTypes: any[] = [];
  selectedEmployee: any[] = [];
  selectedLeaveType: any = null;
  fromDate = '';
  toDate = '';
  comment = '';
  submitting = false;

  ngOnInit(): void {
    forkJoin({
      employees: this.leaveApi.getEmployees().pipe(catchError(() => of([]))),
      leaveTypes: this.leaveApi.getLeaveTypes().pipe(catchError(() => of([]))),
    }).subscribe(({ employees, leaveTypes }) => {
      const emps = Array.isArray(employees) ? employees : (employees as any)?.content ?? [];
      this.employees = emps.map((e: any) => ({
        fullname: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim(),
        userId: e.user?.userId ?? e.user?.id ?? null,
        employeeId: e.id,
      }));

      const types = Array.isArray(leaveTypes) ? leaveTypes : (leaveTypes as any)?.content ?? [];
      this.leaveTypes = types;
    });
  }

  assignLeave() {
    if (!this.selectedEmployee?.length || !this.fromDate || !this.toDate || !this.selectedLeaveType) {
      this.messageService.add({ severity: 'error', summary: 'Leave', detail: 'Please ensure all required fields are filled', key: 'tl', life: 3000 });
      return;
    }

    const from = new Date(this.fromDate);
    const to = new Date(this.toDate);
    const totalDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000));

    const calls = this.selectedEmployee.map(emp => {
      const payload = {
        createdBy: emp.userId,
        leaveTypeId: this.selectedLeaveType?.id ?? this.selectedLeaveType,
        startDate: this.fromDate,
        endDate: this.toDate,
        totalDays,
        planReason: this.comment || 'Admin assigned',
        status: 'APPROVED',
      };
      return this.leaveApi.createLeavePlanRecord(payload).pipe(catchError(err => {
        console.error('Assign leave error for', emp.fullname, err);
        return of(null);
      }));
    });

    this.submitting = true;
    forkJoin(calls).subscribe({
      next: results => {
        this.submitting = false;
        const failed = results.filter(r => r === null).length;
        if (failed === 0) {
          this.messageService.add({ severity: 'success', summary: 'Leave', detail: `Leave assigned to ${results.length} employee(s) successfully`, key: 'tl', life: 3000 });
        } else {
          this.messageService.add({ severity: 'warn', summary: 'Leave', detail: `${results.length - failed} succeeded, ${failed} failed`, key: 'tl', life: 4000 });
        }
        this.selectedEmployee = [];
        this.fromDate = '';
        this.toDate = '';
        this.comment = '';
        this.selectedLeaveType = null;
      },
      error: () => {
        this.submitting = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to assign leave', key: 'tl', life: 3000 });
      },
    });
  }
}
