import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CalendarOptions } from '@fullcalendar/core/index.js';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { EmployeeService } from '../../service/employee.service';
import { catchError, map, Observable, of } from 'rxjs';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-employee-profile-dashboard',
  templateUrl: './employee-profile-dashboard.component.html',
  styleUrl: './employee-profile-dashboard.component.scss'
})
export class EmployeeProfileDashboardComponent {
  employeeInView: any;
  calendarOptions: CalendarOptions = {};
  loading = false;
  saving = false;
  isEditOpen = false;
  editForm: FormGroup;

  employeeProfilePhotoUrl: SafeUrl | string =
    'https://media.istockphoto.com/id/1223671392/vector/default-profile-picture-avatar-photo-placeholder-vector-illustration.jpg?s=612x612&w=0&k=20&c=s0aTdmT5aU6b8ot7VKm11DeID6NctRCpB755rA1BIP0=';

  constructor(
    private employeeService: EmployeeService,
    private sanitizer: DomSanitizer,
    private messageService: MessageService,
    private fb: FormBuilder
  ) {
    this.editForm = this.fb.group({
      phone: [''],
      email: ['', [Validators.email]],
      address: [''],
      workEmail: [{ value: '', disabled: true }],
    });
  }

  ngOnInit(): void {
    this.fetchFirstEmployee();
  }

  handleDateClick(arg: DateClickArg) {
    alert('date click! ' + arg.dateStr);
  }

  getAllowanceName(id: number): Observable<string> {
    return this.employeeService.getAllowanceTypeById(id).pipe(
      map((response: any) => response.data?.name || 'Unknown'),
      catchError(() => of('Unknown'))
    );
  }

  getBonusName(id: number): Observable<string> {
    return this.employeeService.getBonusTypeById(id).pipe(
      map((response: any) => response.data?.name || 'Unknown'),
      catchError(() => of('Unknown'))
    );
  }

  getDeductionName(id: number): Observable<string> {
    return this.employeeService.getDeductionTypeById(id).pipe(
      map((response: any) => response.data?.name || 'Unknown'),
      catchError(() => of('Unknown'))
    );
  }

  getOvertimeName(id: number): Observable<string> {
    return this.employeeService.getOverTimeTypeById(id).pipe(
      map((response: any) => response.data?.name || 'Unknown'),
      catchError(() => of('Unknown'))
    );
  }

  generateLeaveEvents(leaveDetails: { leavesSpent: any[] }) {
    return leaveDetails.leavesSpent.map((leave) => {
      return {
        title: `${leave.type} Leave`,
        start: leave.from,
        end: leave.to,
        backgroundColor: '#2EB270',
      };
    });
  }

  private fetchFirstEmployee(): void {
    this.loading = true;
    this.employeeService.getAllEmployee().subscribe({
      next: (data) => {
        const employees = Array.isArray(data)
          ? data
          : Array.isArray(data?.content)
          ? data.content
          : Array.isArray(data?.data)
          ? data.data
          : [];

        const sortedEmployees = this.sortEmployeesLatest(employees);
        this.employeeInView = sortedEmployees[0];

        if (!this.employeeInView) {
          this.messageService.add({
            severity: 'warn',
            summary: 'No employees',
            detail: 'No employee records available yet.',
            key: 'global',
          });
          return;
        }

        this.patchEditForm();

        if (this.employeeInView?.level) {
          this.employeeService.getSalaryById(this.employeeInView.level.id).subscribe({
            next: (salaryData) => {
              this.employeeInView.salaryDetails = salaryData?.[0];
            },
            error: (err) => console.log(err),
          });
        }

        this.getEmployeesProfilePhotoUrl(this.employeeInView?.employeeMedia?.mediaNo);

        if (this.employeeInView?.leaveDetails) {
          this.calendarOptions = {
            initialView: 'dayGridMonth',
            plugins: [dayGridPlugin, interactionPlugin],
            dateClick: (arg) => this.handleDateClick(arg),
            events: this.generateLeaveEvents(this.employeeInView.leaveDetails),
          };
        }
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Load failed',
          detail: 'Unable to fetch employee records.',
          key: 'global',
        });
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  openEdit(): void {
    if (!this.employeeInView) return;
    this.patchEditForm();
    this.isEditOpen = true;
  }

  closeEdit(): void {
    this.isEditOpen = false;
  }

  saveEdit(): void {
    if (!this.employeeInView || this.editForm.invalid || this.saving) {
      this.editForm.markAllAsTouched();
      return;
    }

    const payload = this.buildUpdatePayload();
    if (!payload?.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Missing employee ID',
        detail: 'Unable to update profile.',
        key: 'global',
      });
      return;
    }

    this.saving = true;
    this.employeeService.updateEmployee(payload, payload.id).subscribe({
      next: (response) => {
        const updated = response?.data ?? response ?? {};
        this.employeeInView = { ...this.employeeInView, ...updated, ...payload };
        this.patchEditForm();
        this.messageService.add({
          severity: 'success',
          summary: 'Profile updated',
          detail: 'Your changes have been saved.',
          key: 'global',
        });
        this.isEditOpen = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Update failed',
          detail: 'Unable to save changes. Please try again.',
          key: 'global',
        });
      },
      complete: () => {
        this.saving = false;
      },
    });
  }

  private patchEditForm(): void {
    this.editForm.patchValue({
      phone: this.employeeInView?.phone || '',
      email: this.employeeInView?.email || '',
      address: this.employeeInView?.address || '',
      workEmail: this.employeeInView?.workEmail || '',
    });
    this.editForm.markAsPristine();
  }

  private sortEmployeesLatest(employees: any[]): any[] {
    return employees
      .slice()
      .sort((a, b) => this.getEmployeeSortValue(b) - this.getEmployeeSortValue(a));
  }

  private getEmployeeSortValue(employee: any): number {
    const dateValue =
      employee?.createdAt ??
      employee?.hireDate ??
      employee?.employementStartDate ??
      employee?.employmentStartDate ??
      employee?.employmentDate ??
      employee?.dateOfHire;

    if (dateValue) {
      const time = new Date(dateValue).getTime();
      if (!Number.isNaN(time)) return time;
    }

    const id = employee?.id;
    if (typeof id === 'number') return id;
    if (typeof id === 'string' && id.trim() !== '') {
      const parsed = Number(id);
      if (!Number.isNaN(parsed)) return parsed;
    }

    return 0;
  }

  private getEmployeesProfilePhotoUrl(filename: string) {
    if (!filename) return;
    this.employeeService.getEmployeeImage(filename).subscribe({
      next: (response) => {
        const blob = new Blob([response], { type: 'image/png' });
        this.employeeProfilePhotoUrl = this.sanitizer.bypassSecurityTrustUrl(
          URL.createObjectURL(blob)
        );
        if (this.employeeInView) {
          this.employeeInView.imageUrl = this.employeeProfilePhotoUrl;
        }
      },
      error: () => {
        this.employeeProfilePhotoUrl =
          'https://media.istockphoto.com/id/1223671392/vector/default-profile-picture-avatar-photo-placeholder-vector-illustration.jpg?s=612x612&w=0&k=20&c=s0aTdmT5aU6b8ot7VKm11DeID6NctRCpB755rA1BIP0=';
      },
    });
  }

  private buildUpdatePayload(): any {
    const employee = this.employeeInView || {};

    return {
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: this.editForm.get('email')?.value ?? employee.email,
      workEmail: employee.workEmail,
      jobTitle: employee.jobTitle,
      departmentId: employee.departmentId ?? employee.department?.id ?? null,
      levelId: employee.levelId ?? employee.level?.id ?? null,
      employmentType: employee.employmentType ?? employee.jobType?.name ?? null,
      supervisor: employee.supervisor,
      employeeStatus: employee.employeeStatus,
      employementStartDate: employee.employementStartDate,
      employmentEndDate: employee.employmentEndDate,
      onProbation: employee.onProbation,
      probationStartDate: employee.probationStartDate,
      probationEndDate: employee.probationEndDate,
      appraisalDueDate: employee.appraisalDueDate,
      phone: this.editForm.get('phone')?.value ?? employee.phone,
      address: this.editForm.get('address')?.value ?? employee.address,
      dob: employee.dob,
      genderId: employee.genderId ?? employee.gender?.id ?? null,
      maritalStatusId: employee.maritalStatusId ?? employee.maritalStatus?.id ?? null,
      religionId: employee.religionId ?? employee.religion?.id ?? null,
      bankName: employee.bankName,
      accountNumber: employee.accountNumber,
      nin: employee.nin,
      bvn: employee.bvn,
      jobTypeId: employee.jobTypeId ?? employee.jobType?.id ?? null,
      relationshipId: employee.relationshipId ?? employee.relationship?.id ?? null,
      employeeMediaId: employee.employeeMediaId ?? employee.employeeMedia?.id ?? null,
    };
  }
}
