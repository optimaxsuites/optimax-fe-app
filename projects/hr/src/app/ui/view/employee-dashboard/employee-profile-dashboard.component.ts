import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CalendarOptions } from '@fullcalendar/core/index.js';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { EmployeeService } from '../../service/employee.service';
import { ProfileChangeRequestService } from '../../service/profile-change-request.service';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { HttpClient } from '@angular/common/http';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface NextOfKin {
  id?: number;
  fullName: string;
  email?: string;
  phone?: string;
  address?: string;
  relationship?: string;
  DOB?: string;
  emergencyContact?: boolean;
}

export interface Guarantor {
  id?: number;
  fullName: string;
  email?: string;
  phone?: string;
  address?: string;
  relationship?: string;
  yearsKnown?: number;
}

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
  isStaffIdOpen = false;
  staffIdQrDataUrl = '';
  staffIdBarcodeDataUrl = '';
  isBankChangeRequestOpen = false;
  bankChangeRequestForm: FormGroup;
  submittingBankChangeRequest = false;
  editForm: FormGroup;
  nextOfKinList: NextOfKin[] = [];
  guarantorList: Guarantor[] = [];
  nigerianBanks = [
    'Access Bank',
    'Zenith Bank',
    'GTBank',
    'FCMB',
    'First Bank',
    'Fidelity Bank',
    'UBA',
    'Intercontinental Bank',
    'Standard Chartered',
    'HSBC',
    'Diamond Bank',
    'Polaris Bank',
    'Wema Bank',
    'Stanbic IBTC',
    'Ecobank',
    'Union Bank',
    'Heritage Bank',
    'Keystone Bank',
    'Providus Bank',
    'Titan Bank',
    'ALAT',
    'Taj Bank',
    'Opay',
    'Moniepoint',
  ];
  pendingProfilePhotoDataUrl: string | null = null;
  pendingProfilePhotoName: string | null = null;
  pendingProfilePhotoFile: File | null = null;
  private originalProfilePhotoUrl: SafeUrl | string | null = null;
  private readonly allowanceNameCache = new Map<string, Observable<string>>();
  private readonly bonusNameCache = new Map<string, Observable<string>>();
  private readonly deductionNameCache = new Map<string, Observable<string>>();
  private readonly overtimeNameCache = new Map<string, Observable<string>>();
  private readonly minimumLoaderDurationMs = 900;

  employeeProfilePhotoUrl: SafeUrl | string =
    'https://media.istockphoto.com/id/1223671392/vector/default-profile-picture-avatar-photo-placeholder-vector-illustration.jpg?s=612x612&w=0&k=20&c=s0aTdmT5aU6b8ot7VKm11DeID6NctRCpB755rA1BIP0=';

  constructor(
    private employeeService: EmployeeService,
    private sanitizer: DomSanitizer,
    private messageService: MessageService,
    private fb: FormBuilder,
    private router: Router,
    private profileChangeRequestService: ProfileChangeRequestService,
    // private http: HttpClient
  ) {
    this.editForm = this.fb.group({
      phone: [''],
      email: ['', [Validators.email]],
      address: [''],
      workEmail: [{ value: '', disabled: true }],
    });
    this.bankChangeRequestForm = this.fb.group({
      requestedBankName: ['', Validators.required],
      requestedAccountNumber: ['', Validators.required],
      reason: [''],
    });
  }

  ngOnInit(): void {
    this.fetchEmployeeForCurrentUser();
  }

  handleDateClick(arg: DateClickArg) {
    alert('date click! ' + arg.dateStr);
  }

  formatDate(value: any): string {
    if (!value) return '-';

    if (Array.isArray(value)) {
      const [year, month, day, hour = 0, minute = 0, second = 0] = value;
      if (year && month && day) {
        const safeMonth = Math.max(1, Math.min(12, Number(month)));
        const date = new Date(
          Number(year),
          safeMonth - 1,
          Number(day),
          Number(hour),
          Number(minute),
          Number(second)
        );
        if (!Number.isNaN(date.getTime())) {
          return this.formatDateValue(date);
        }
      }
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return this.formatDateValue(parsed);
    }

    return String(value);
  }

  copyToClipboard(value: string | number | null | undefined, label = 'Value'): void {
    const text = String(value ?? '').trim();
    if (!text) return;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => this.showCopyToast(label))
        .catch(() => this.fallbackCopy(text, label));
      return;
    }

    this.fallbackCopy(text, label);
  }

  buildTelLink(phone: string | number | null | undefined): string | null {
    const text = String(phone ?? '').trim();
    if (!text) return null;
    const cleaned = text.replace(/[^\d+]/g, '');
    return cleaned ? `tel:${cleaned}` : null;
  }

  buildMailLink(email: string | null | undefined): string | null {
    const text = String(email ?? '').trim();
    if (!text) return null;
    return `mailto:${text}`;
  }

  getAllowanceName(id: number | string): Observable<string> {
    if (id === null || id === undefined || id === '') return of('Unknown');
    const key = String(id);
    const cached = this.allowanceNameCache.get(key);
    if (cached) return cached;

    const request$ = this.employeeService.getAllowanceTypeById(id as any).pipe(
      map((response: any) => response?.name || 'Unknown'),
      catchError(() => of('Unknown')),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.allowanceNameCache.set(key, request$);
    return request$;
  }

  getBonusName(id: number | string): Observable<string> {
    if (id === null || id === undefined || id === '') return of('Unknown');
    const key = String(id);
    const cached = this.bonusNameCache.get(key);
    if (cached) return cached;

    const request$ = this.employeeService.getBonusTypeById(id as any).pipe(
      map((response: any) => response?.name || 'Unknown'),
      catchError(() => of('Unknown')),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.bonusNameCache.set(key, request$);
    return request$;
  }

  getDeductionName(id: number | string): Observable<string> {
    if (id === null || id === undefined || id === '') return of('Unknown');
    const key = String(id);
    const cached = this.deductionNameCache.get(key);
    if (cached) return cached;

    const request$ = this.employeeService.getDeductionTypeById(id as any).pipe(
      map((response: any) => response?.name || 'Unknown'),
      catchError(() => of('Unknown')),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.deductionNameCache.set(key, request$);
    return request$;
  }

  getOvertimeName(id: number | string): Observable<string> {
    if (id === null || id === undefined || id === '') return of('Unknown');
    const key = String(id);
    const cached = this.overtimeNameCache.get(key);
    if (cached) return cached;

    const request$ = this.employeeService.getOverTimeTypeById(id as any).pipe(
      map((response: any) => response?.name || 'Unknown'),
      catchError(() => of('Unknown')),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.overtimeNameCache.set(key, request$);
    return request$;
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

  get profileCompletionScore(): number {
    const employee = this.employeeInView || {};
    const checks = [
      employee?.firstName,
      employee?.lastName,
      employee?.phone,
      employee?.email,
      employee?.workEmail,
      employee?.address,
      employee?.department?.name || employee?.department,
      employee?.level?.name || employee?.level,
      employee?.jobTitle,
      employee?.hireDate || employee?.employementStartDate || employee?.employmentStartDate,
      employee?.bankName,
      employee?.accountNumber,
      employee?.nin,
      employee?.bvn,
      employee?.nextOfKin?.length ? 'yes' : '',
      employee?.guarantor?.length ? 'yes' : '',
      employee?.employeeMedia?.mediaNo || employee?.imageUrl,
    ];
    const complete = checks.filter((value) => String(value ?? '').trim() !== '').length;
    return Math.round((complete / checks.length) * 100);
  }

  get roleTrendLabel(): string {
    return this.employeeInView?.department?.name || this.employeeInView?.department
      ? 'Current assignment'
      : 'Needs assignment';
  }

  get salaryTrendLabel(): string {
    const base = Number(this.employeeInView?.salaryDetails?.baseSalary || 0);
    const net = Number(
      this.employeeInView?.salaryDetails?.netSalaryComputed ??
      this.employeeInView?.salaryDetails?.netSalary ??
      0
    );
    if (!base || !net) return 'Awaiting payroll data';
    const ratio = Math.round((net / base) * 100);
    return `${ratio}% of base retained`;
  }

  get leaveTrendLabel(): string {
    const assigned = Number(this.employeeInView?.leaveDetails?.assignedLeaves || 0);
    const remaining = Number(this.employeeInView?.leaveDetails?.leavesRemaining || 0);
    if (!assigned) return 'Leave cycle pending';
    const ratio = Math.round((remaining / assigned) * 100);
    return `${ratio}% balance remaining`;
  }

  get attendanceTrendLabel(): string {
    const late = Number(this.employeeInView?.attendance?.lateArrivals || 0);
    const present = Number(this.employeeInView?.attendance?.daysPresent || 0);
    if (!present) return 'No attendance captured';
    return late === 0 ? 'Perfect punctuality logged' : `${late} late arrival(s) tracked`;
  }

  get printableStaffId(): string {
    return String(this.employeeInView?.id ?? '-');
  }

  get printableStaffName(): string {
    return `${this.employeeInView?.firstName ?? ''} ${this.employeeInView?.lastName ?? ''}`.trim();
  }

  openStaffId(): void {
    this.generateStaffQrCode(this.employeeInView);
    this.generateStaffBarcode(this.employeeInView);
    this.isStaffIdOpen = true;
  }

  closeStaffId(): void {
    this.isStaffIdOpen = false;
  }

  async printStaffId(): Promise<void> {
    const target = document.getElementById('staff-id-download');
    if (!target) return;

    const canvas = await html2canvas(target, {
      scale: 2,
      backgroundColor: '#ffffff',
    });
    const imageData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height],
    });
    pdf.addImage(imageData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`staff-id-${this.printableStaffId}.pdf`);
  }

  private generateStaffQrCode(employee: any): void {
    const payload = JSON.stringify({
      id: employee?.id ?? null,
      name: `${employee?.firstName ?? ''} ${employee?.lastName ?? ''}`.trim(),
      role: employee?.jobTitle ?? '',
      department: employee?.department?.name || employee?.department || '',
      email: employee?.workEmail || employee?.email || '',
    });

    QRCode.toDataURL(payload, {
      width: 160,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    }).then((dataUrl) => {
      this.staffIdQrDataUrl = dataUrl;
    }).catch(() => {
      this.staffIdQrDataUrl = '';
    });
  }

  private generateStaffBarcode(employee: any): void {
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, String(employee?.id ?? '000000'), {
        format: 'CODE128',
        displayValue: false,
        background: '#f8fafc',
        lineColor: '#0f172a',
        margin: 0,
        width: 2,
        height: 72,
      });
      this.staffIdBarcodeDataUrl = canvas.toDataURL('image/png');
    } catch {
      this.staffIdBarcodeDataUrl = '';
    }
  }

  private fetchEmployeeForCurrentUser(): void {
    const selectedEmployee = localStorage.getItem('employeeInView');
    if (selectedEmployee && this.isEmployeeManagementContext()) {
      try {
        const parsedEmployee = JSON.parse(selectedEmployee);
        if (parsedEmployee) {
          this.applyEmployeeView(parsedEmployee);
          return;
        }
      } catch {
        localStorage.removeItem('employeeInView');
      }
    }

    const storedUserId = sessionStorage.getItem('userid') || localStorage.getItem('userid');
    if (storedUserId) {
      this.applySessionEmployeeFallback(storedUserId);
      const startedAt = this.startLoading();
      this.employeeService.getEmployeeByUserId(storedUserId).subscribe({
        next: (data) => {
          const employee = data?.data ?? data ?? null;
          if (!employee) {
            this.fetchEmployeeFromListFallback(storedUserId);
            return;
          }
          this.applyEmployeeView(employee);
        },
        error: () => {
          this.fetchEmployeeFromListFallback(storedUserId);
        },
        complete: () => {
          this.finishLoading(startedAt);
        },
      });
      return;
    }

    this.fetchFirstEmployee();
  }

  private fetchEmployeeFromListFallback(userId: string): void {
    this.employeeService.getAllEmployee().subscribe({
      next: (employees) => {
        const employee =
          employees.find((entry: any) =>
            String(entry?.userId ?? '') === String(userId) ||
            String(entry?.user?.userId ?? '') === String(userId) ||
            String(entry?.user?.id ?? '') === String(userId)
          ) ?? null;

        if (employee) {
          this.applyEmployeeView(employee);
          return;
        }

        this.messageService.add({
          severity: 'warn',
          summary: 'No employee',
          detail: 'No employee record linked to this user.',
          key: 'global',
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Load failed',
          detail: 'Unable to fetch employee record for this user.',
          key: 'global',
        });
      },
    });
  }

  private isEmployeeManagementContext(): boolean {
    return this.router.url.includes('/admin/hr/employee-management/');
  }

  private fetchFirstEmployee(): void {
    const startedAt = this.startLoading();
    this.employeeService.getAllEmployee().subscribe({
      next: (employees) => {
        const sortedEmployees = this.sortEmployeesLatest(employees);
        const employee = sortedEmployees[0];

        if (!employee) {
          this.messageService.add({
            severity: 'warn',
            summary: 'No employees',
            detail: 'No employee records available yet.',
            key: 'global',
          });
          return;
        }

        this.applyEmployeeView(employee);
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
        this.finishLoading(startedAt);
      },
    });
  }

  private startLoading(): number {
    this.loading = true;
    return Date.now();
  }

  private finishLoading(startedAt: number): void {
    const elapsed = Date.now() - startedAt;
    const delay = Math.max(0, this.minimumLoaderDurationMs - elapsed);
    window.setTimeout(() => {
      this.loading = false;
    }, delay);
  }

  private applyEmployeeView(employee: any): void {
    this.employeeInView = employee;
    this.patchEditForm();

    // Load employee relatives
    this.loadEmployeeRelatives();

    if (this.employeeInView?.level) {
      this.employeeService.getSalaryById(this.employeeInView.level.id).subscribe({
        next: (salaryData) => {
          const salaryDetails = salaryData?.[0] ?? {};
          this.employeeInView.salaryDetails = {
            ...salaryDetails,
            netSalaryComputed: this.calculateNetSalary(salaryDetails),
          };
        },
        error: (err) => console.log(err),
      });
    }

    if (this.employeeInView?.imageUrl) {
      this.employeeProfilePhotoUrl = this.employeeInView.imageUrl;
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
  }

  private applySessionEmployeeFallback(userId: string): void {
    try {
      const raw =
        sessionStorage.getItem('userRegData') ||
        localStorage.getItem('userRegData');
      const parsed = raw ? JSON.parse(raw) : null;
      const fullName =
        parsed?.fullname ||
        parsed?.name ||
        parsed?.username ||
        sessionStorage.getItem('fullname') ||
        localStorage.getItem('fullname') ||
        `User ${userId}`;
      const nameParts = String(fullName).trim().split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || 'User';
      const lastName = nameParts.slice(1).join(' ');
      const fallbackImage =
        parsed?.profileImage ||
        parsed?.imageUrl ||
        parsed?.avatarUrl ||
        parsed?.profilePicture ||
        parsed?.photoUrl ||
        '';

      this.employeeInView = {
        ...(this.employeeInView || {}),
        firstName,
        lastName,
        userId: Number(userId),
        user: {
          id: parsed?.id ?? Number(userId),
          userId: parsed?.userId ?? Number(userId),
          fullname: fullName,
          username: parsed?.username || fullName,
          email: parsed?.email || '',
        },
        imageUrl: fallbackImage || this.employeeInView?.imageUrl || '',
      };

      if (fallbackImage) {
        this.employeeProfilePhotoUrl = fallbackImage;
      }
      this.patchEditForm();
    } catch {
      // Keep the default placeholder state when no cached user payload is available.
    }
  }

  openEdit(): void {
    if (!this.employeeInView) return;
    this.patchEditForm();
    this.originalProfilePhotoUrl =
      this.employeeInView?.imageUrl || this.employeeProfilePhotoUrl || null;
    this.pendingProfilePhotoDataUrl = null;
    this.pendingProfilePhotoName = null;
    this.pendingProfilePhotoFile = null;
    this.isEditOpen = true;
  }

  closeEdit(): void {
    if (this.pendingProfilePhotoDataUrl && this.originalProfilePhotoUrl) {
      this.employeeInView.imageUrl = this.originalProfilePhotoUrl;
      this.employeeProfilePhotoUrl = this.originalProfilePhotoUrl;
    }
    this.pendingProfilePhotoDataUrl = null;
    this.pendingProfilePhotoName = null;
    this.pendingProfilePhotoFile = null;
    this.isEditOpen = false;
  }

  saveEdit(): void {
    console.log(this.editForm.invalid)
    if (!this.employeeInView || this.editForm.invalid || this.saving) {
      this.editForm.markAllAsTouched();
      return;
    }

    console.log(this.editForm.invalid)


    const { formData, patch } = this.buildUpdatePayload();

    this.saving = true;
    this.employeeService.addEmployee(formData).subscribe({
      next: (response) => {
        const updated = response?.data ?? response ?? {};
        this.employeeInView = { ...this.employeeInView, ...updated, ...patch };
        this.originalProfilePhotoUrl =
          this.employeeInView?.imageUrl || this.employeeProfilePhotoUrl || null;
        this.pendingProfilePhotoDataUrl = null;
        this.pendingProfilePhotoName = null;
        this.pendingProfilePhotoFile = null;
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

  onProfilePhotoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files.length) return;
    const file = input.files[0];
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];

    if (!allowedTypes.includes(file.type)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid file',
        detail: 'Please upload a PNG or JPG image.',
        key: 'global',
      });
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (!result) return;
      this.pendingProfilePhotoDataUrl = result;
      this.pendingProfilePhotoName = file.name;
      this.pendingProfilePhotoFile = file;
      this.employeeInView.imageUrl = result;
      this.employeeProfilePhotoUrl = result;
    };
    reader.readAsDataURL(file);
  }

  clearProfilePhotoSelection(): void {
    this.pendingProfilePhotoDataUrl = null;
    this.pendingProfilePhotoName = null;
    this.pendingProfilePhotoFile = null;
    if (this.originalProfilePhotoUrl) {
      this.employeeInView.imageUrl = this.originalProfilePhotoUrl;
      this.employeeProfilePhotoUrl = this.originalProfilePhotoUrl;
    }
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

  private buildUpdatePayload(): { formData: FormData; patch: any } {
    const employee = this.employeeInView || {};
    const storedUserId = sessionStorage.getItem('userid') || localStorage.getItem('userid');
    const patch: any = {
      id: employee.id,
      userId: employee.userId ?? employee.user?.userId ?? storedUserId ?? null,
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
      // employeeMediaId: employee.employeeMediaId ?? employee.employeeMedia?.id ?? null,
    };

    const formData = new FormData();
    const normalizeValue = (value: any) => {
      if (value === null || value === undefined || value === '') return null;
      if (value instanceof Date) return value.toISOString();
      if (typeof value === 'object') {
        if ('id' in value && value.id !== null && value.id !== undefined) return value.id;
        if ('name' in value && value.name) return value.name;
        return JSON.stringify(value);
      }
      return value;
    };
    // const appendField = (key: string, value: any) => {
    //   const normalized = normalizeValue(value);
    //   if (normalized === null || normalized === undefined || normalized === '') return;
    // };

    // Object.keys(patch).forEach((key) => appendField(key, patch[key]));
      formData.append("employee", JSON.stringify(patch));


    if (this.pendingProfilePhotoFile) {
      formData.append('file', this.pendingProfilePhotoFile, this.pendingProfilePhotoFile.name);
    }

    return { formData, patch };
  }

  private fallbackCopy(text: string, label: string): void {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.showCopyToast(label);
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Copy failed',
        detail: `${label} could not be copied.`,
        key: 'global',
      });
    }
  }

  private formatDateValue(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }

  private showCopyToast(label: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Copied',
      detail: `${label} copied to clipboard.`,
      key: 'global',
    });
  }

  private calculateNetSalary(details: any): number {
    if (!details) return 0;
    const base = this.toNumber(details.baseSalary);
    const allowances = this.sumAmounts(details.allowance, ['amount', 'value']);
    const bonuses = this.sumAmounts(details.bonus, ['amount', 'value']);
    const overtime = this.sumAmounts(details.overtime, ['amount', 'rate', 'value']);
    const deductions = this.sumAmounts(details.deductions, ['amount', 'value']);
    return base + allowances + bonuses + overtime - deductions;
  }

  private sumAmounts(items: any, fields: string[]): number {
    if (!Array.isArray(items)) return 0;
    return items.reduce((total, item) => {
      if (item === null || item === undefined) return total;
      if (typeof item === 'number') return total + item;
      for (const field of fields) {
        const value = this.toNumber(item?.[field]);
        if (value !== 0) return total + value;
      }
      return total + this.toNumber(item);
    }, 0);
  }

  private toNumber(value: any): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  openBankChangeRequest(): void {
    this.bankChangeRequestForm.reset();
    this.isBankChangeRequestOpen = true;
  }

  closeBankChangeRequest(): void {
    this.isBankChangeRequestOpen = false;
    this.bankChangeRequestForm.reset();
  }

  onBankChangeRequestSubmitted(event: any): void {
    this.closeBankChangeRequest();
    this.messageService.add({
      severity: 'success',
      summary: 'Request submitted',
      detail: 'Your bank change request has been submitted for HR review.',
      key: 'global',
    });
  }

  submitBankChangeRequest(): void {
    if (this.bankChangeRequestForm.invalid || !this.employeeInView) {
      return;
    }

    this.submittingBankChangeRequest = true;

    const formValue = this.bankChangeRequestForm.value;
    const currentBank = {
      bankName: this.employeeInView.bankName || '',
      accountNumber: this.employeeInView.accountNumber || '',
    };
    const requestedBank = {
      bankName: formValue.requestedBankName,
      accountNumber: formValue.requestedAccountNumber,
    };

    this.profileChangeRequestService.submitBankChangeRequest(
      this.employeeInView.id,
      `${this.employeeInView.firstName} ${this.employeeInView.lastName}`,
      currentBank,
      requestedBank,
      formValue.reason || undefined
    ).subscribe({
      next: () => {
        this.submittingBankChangeRequest = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Request submitted',
          detail: 'Your bank change request has been submitted for HR review.',
          key: 'global',
        });
        this.closeBankChangeRequest();
      },
      error: (error) => {
        this.submittingBankChangeRequest = false;
        console.error('Error submitting bank change request:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Submission failed',
          detail: 'Failed to submit bank change request. Please try again.',
          key: 'global',
        });
      },
    });
  }

  loadEmployeeRelatives(): void {
    if (!this.employeeInView?.id) return;
          // this.nextOfKinList = this.employeeInView.nextOfKin || [];


    this.employeeService.getNOKByEmployeeId(this.employeeInView.id).subscribe({
        next: (res: any) => {
          this.nextOfKinList = res;
          // localStorage.setItem('employeeInView', JSON.stringify(this.employeeInView))
        },
        error: () => {
          this.nextOfKinList = [];
        },
      })

    this.employeeService.getGuarantor(this.employeeInView.id).subscribe({
        next: (res: any) => {
          this.guarantorList = res;
          // localStorage.setItem('employeeInView', JSON.stringify(this.employeeInView))
        },
        error: () => {
          this.guarantorList = [];
        },
      })
  }
}
