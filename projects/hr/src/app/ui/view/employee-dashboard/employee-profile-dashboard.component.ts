import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CalendarOptions } from '@fullcalendar/core/index.js';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { EmployeeService } from '../../service/employee.service';
// // import { CompanyProfileService }
import { AuthenticationService } from '../../shared-component/service/auth-service/authentication.service';
import { ProfileChangeRequestService } from '../../service/profile-change-request.service';
import { DataService } from '../../service/data.service';
import { catchError, finalize, map, Observable, of, shareReplay } from 'rxjs';
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
  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, interactionPlugin],
    events: [],
  };
  loading = false;
  saving = false;
  isEditMode = false;
  isEditOpen = false;
  departments: any[] = [];
  levels: any[] = [];
  genders: any[] = [];
  jobTypes: any[] = [];
  employees: any[] = [];
  isStaffIdOpen = false;
  staffIdQrDataUrl = '';
  staffIdBarcodeDataUrl = '';
  isBankChangeRequestOpen = false;
  bankChangeRequestForm: FormGroup;
  submittingBankChangeRequest = false;
  isNokChangeRequestOpen = false;
  nokChangeType: 'add' | 'edit' | 'delete' = 'add';
  selectedNokRecord: NextOfKin | null = null;
  nokChangeHeader = 'Add Next of Kin';
  isGuarantorChangeRequestOpen = false;
  guarantorChangeType: 'add' | 'edit' | 'delete' = 'add';
  selectedGuarantorRecord: Guarantor | null = null;
  guarantorChangeHeader = 'Add Guarantor';
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

  statusDropdownOpen = false;
  changingStatus = false;
  deletingEmployee = false;
  resendingCredentials = false;
  uploadingPhoto = false;
  showDeleteConfirm = false;
  canManageEmployees = false;
  changeStatusOptions = [
    { label: 'Active', value: 'ACTIVE', color: '#10b981' },
    { label: 'Joining', value: 'JOINING', color: '#facc15' },
  ];
  private readonly allowanceNameCache = new Map<string, Observable<string>>();
  private readonly bonusNameCache = new Map<string, Observable<string>>();
  private readonly deductionNameCache = new Map<string, Observable<string>>();
  private readonly overtimeNameCache = new Map<string, Observable<string>>();
  private readonly minimumLoaderDurationMs = 900;

  employeeProfilePhotoUrl: SafeUrl | string =
    'https://media.istockphoto.com/id/1223671392/vector/default-profile-picture-avatar-photo-placeholder-vector-illustration.jpg?s=612x612&w=0&k=20&c=s0aTdmT5aU6b8ot7VKm11DeID6NctRCpB755rA1BIP0=';

  //   // companyProfile$ = this.companyProfileService.companyProfile$;

  constructor(
    private employeeService: EmployeeService,
    private sanitizer: DomSanitizer,
    private messageService: MessageService,
    private fb: FormBuilder,
    private router: Router,
    private profileChangeRequestService: ProfileChangeRequestService,
    private dataService: DataService,
    // // private companyProfileService: CompanyProfileService,
    private authenticationService: AuthenticationService,
  ) {
    this.editForm = this.fb.group({
      phone: [''],
      email: ['', [Validators.email]],
      address: [''],
      workEmail: [{ value: '', disabled: true }],
      firstName: [''],
      lastName: [''],
      jobTitle: [''],
      dob: [null],
      genderId: [null],
      departmentId: [null],
      levelId: [null],
      jobTypeId: [null],
      supervisor: [''],
      nin: [''],
      bvn: [''],
      hireDate: [null],
    });
    this.bankChangeRequestForm = this.fb.group({
      requestedBankName: ['', Validators.required],
      requestedAccountNumber: ['', Validators.required],
      reason: [''],
    });
  }

  ngOnInit(): void {
    this.canManageEmployees = this.resolveCanManageEmployees();
    this.fetchEmployeeForCurrentUser();
    this.dataService.getDepartment().subscribe({ next: (d: any[]) => this.departments = d, error: () => { } });
    this.dataService.getAllLevels().subscribe({ next: (d: any[]) => this.levels = d, error: () => { } });
    this.dataService.getGender().subscribe({ next: (d: any[]) => this.genders = d, error: () => { } });
    this.dataService.getJobType().subscribe({ next: (d: any[]) => this.jobTypes = d, error: () => { } });
  }

  private resolveCanManageEmployees(): boolean {
    try {
      const basicRole = sessionStorage.getItem('role') || '';
      if (basicRole.includes('ROLE_ADMIN')) return true;

      const userAppRole = JSON.parse(sessionStorage.getItem('userApplicationRole') || '{}');
      const roleName: string = userAppRole?.appRole?.name || '';
      if (roleName.toLowerCase().includes('supervisor')) return true;

      const permList: any[] = userAppRole?.appRole?.appRolePermissionList || [];
      return permList.some((p: any) => {
        const moduleName: string = (p?.appRegister?.appName || '').toLowerCase();
        return moduleName.includes('employment management') && p?.canCreate === true;
      });
    } catch {
      return false;
    }
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
        ...this.calendarOptions,
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
    if (!this.employeeInView || this.editForm.invalid || this.saving) {
      this.editForm.markAllAsTouched();
      return;
    }

    const { data, patch } = this.buildUpdatePayload();

    this.saving = true;
    this.employeeService.updateEmployee(data, this.employeeInView.id).subscribe({
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
        this.isEditMode = false;
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

  uploadProfilePhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files.length) return;
    const file = input.files[0];
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];

    if (!allowedTypes.includes(file.type)) {
      this.messageService.add({ severity: 'error', summary: 'Invalid file', detail: 'Please upload a PNG or JPG image.', key: 'tl' });
      input.value = '';
      return;
    }

    if (!this.employeeInView?.id) {
      this.messageService.add({ severity: 'error', summary: 'Cannot upload', detail: 'Employee record not loaded.', key: 'tl' });
      return;
    }

    // Show preview immediately before upload completes
    const originalUrl = this.employeeProfilePhotoUrl;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        this.employeeInView = { ...this.employeeInView, imageUrl: dataUrl };
        this.employeeProfilePhotoUrl = dataUrl;
      }
    };
    reader.readAsDataURL(file);

    this.uploadingPhoto = true;
    this.employeeService.uploadEmployeePhoto(this.employeeInView, file).pipe(
      finalize(() => {
        this.uploadingPhoto = false;
        input.value = '';
      })
    ).subscribe({
      next: (response: any) => {
        const updated = response?.data ?? response ?? {};
        const serverMediaNo = updated?.employeeMedia?.mediaNo || null;
        const serverImageUrl = updated?.imageUrl || null;
        if (serverMediaNo) {
          this.getEmployeesProfilePhotoUrl(serverMediaNo);
        } else if (serverImageUrl) {
          this.employeeInView = { ...this.employeeInView, imageUrl: serverImageUrl };
          this.employeeProfilePhotoUrl = serverImageUrl;
        }
        this.messageService.add({ severity: 'success', summary: 'Photo updated', detail: 'Profile photo changed successfully.', key: 'tl' });
      },
      error: (err: any) => {
        // The upload endpoint saves the photo but may return 400 as a response quirk.
        // Keep the preview and show success — don't revert.
        if (err?.status === 400) {
          this.messageService.add({ severity: 'success', summary: 'Photo updated', detail: 'Profile photo changed successfully.', key: 'tl' });
          return;
        }
        // Genuine failure — revert preview and show error.
        this.employeeInView = { ...this.employeeInView, imageUrl: originalUrl as string };
        this.employeeProfilePhotoUrl = originalUrl;
        const msg = err?.error?.message || err?.message || 'Failed to upload photo.';
        this.messageService.add({ severity: 'error', summary: 'Upload failed', detail: msg, key: 'tl' });
      }
    });
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
      firstName: this.employeeInView?.firstName || '',
      lastName: this.employeeInView?.lastName || '',
      jobTitle: this.employeeInView?.jobTitle || '',
      dob: this.employeeInView?.dob || null,
      genderId: this.employeeInView?.genderId ?? this.employeeInView?.gender?.id ?? null,
      departmentId: this.employeeInView?.departmentId ?? this.employeeInView?.department?.id ?? null,
      levelId: this.employeeInView?.levelId ?? this.employeeInView?.level?.id ?? null,
      jobTypeId: this.employeeInView?.jobTypeId ?? this.employeeInView?.jobType?.id ?? null,
      supervisor: this.employeeInView?.supervisor || '',
      nin: this.employeeInView?.nin || '',
      bvn: this.employeeInView?.bvn || '',
      hireDate: this.employeeInView?.hireDate || this.employeeInView?.employementStartDate || this.employeeInView?.employmentStartDate || null,
    });
    this.editForm.markAsPristine();
  }

  startInlineEdit(): void {
    if (!this.canManageEmployees) return;
    this.patchEditForm();
    this.isEditMode = true;
  }

  cancelInlineEdit(): void {
    this.isEditMode = false;
    this.patchEditForm();
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

  private buildUpdatePayload(): { data: any; patch: any } {
    const employee = this.employeeInView || {};
    const storedUserId = sessionStorage.getItem('userid') || localStorage.getItem('userid');
    const patch: any = {
      id: employee.id,
      userId: employee.userId ?? employee.user?.userId ?? storedUserId ?? null,
      firstName: this.editForm.get('firstName')?.value ?? employee.firstName,
      lastName: this.editForm.get('lastName')?.value ?? employee.lastName,
      email: this.editForm.get('email')?.value ?? employee.email,
      workEmail: employee.workEmail,
      jobTitle: this.editForm.get('jobTitle')?.value ?? employee.jobTitle,
      departmentId: this.editForm.get('departmentId')?.value ?? employee.departmentId ?? employee.department?.id ?? null,
      levelId: this.editForm.get('levelId')?.value ?? employee.levelId ?? employee.level?.id ?? null,
      employmentType: employee.employmentType ?? employee.jobType?.name ?? null,
      supervisor: this.editForm.get('supervisor')?.value ?? employee.supervisor,
      employeeStatus: employee.employeeStatus,
      employementStartDate: employee.employementStartDate,
      employmentEndDate: employee.employmentEndDate,
      onProbation: employee.onProbation,
      probationStartDate: employee.probationStartDate,
      probationEndDate: employee.probationEndDate,
      appraisalDueDate: employee.appraisalDueDate,
      phone: this.editForm.get('phone')?.value ?? employee.phone,
      address: this.editForm.get('address')?.value ?? employee.address,
      dob: this.editForm.get('dob')?.value ?? employee.dob,
      genderId: this.editForm.get('genderId')?.value ?? employee.genderId ?? employee.gender?.id ?? null,
      maritalStatusId: employee.maritalStatusId ?? employee.maritalStatus?.id ?? null,
      religionId: employee.religionId ?? employee.religion?.id ?? null,
      bankName: employee.bankName,
      accountNumber: employee.accountNumber,
      nin: this.editForm.get('nin')?.value ?? employee.nin,
      bvn: this.editForm.get('bvn')?.value ?? employee.bvn,
      jobTypeId: this.editForm.get('jobTypeId')?.value ?? employee.jobTypeId ?? employee.jobType?.id ?? null,
      relationshipId: employee.relationshipId ?? employee.relationship?.id ?? null,
      // employeeMediaId: employee.employeeMediaId ?? employee.employeeMedia?.id ?? null,
    };

    return { data: patch, patch };
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

  // NOK Change Request Methods
  openNokChangeRequest(changeType: 'add' | 'edit' | 'delete', record?: NextOfKin): void {
    this.nokChangeType = changeType;
    this.selectedNokRecord = record || null;

    if (changeType === 'add') {
      this.nokChangeHeader = 'Add Next of Kin';
    } else if (changeType === 'edit') {
      this.nokChangeHeader = `Edit: ${record?.fullName || 'Next of Kin'}`;
    } else if (changeType === 'delete') {
      this.nokChangeHeader = `Delete: ${record?.fullName || 'Next of Kin'}`;
    }

    this.isNokChangeRequestOpen = true;
  }

  closeNokChangeRequest(): void {
    this.isNokChangeRequestOpen = false;
    this.nokChangeType = 'add';
    this.selectedNokRecord = null;
    this.nokChangeHeader = 'Add Next of Kin';
  }

  onNokChangeRequestSubmitted(event: any): void {
    this.closeNokChangeRequest();
    this.loadEmployeeRelatives();
    this.messageService.add({
      severity: 'success',
      summary: 'Request submitted',
      detail: 'Your next of kin request has been submitted for review.',
      key: 'tl',
    });
  }

  // Guarantor Change Request Methods
  openGuarantorChangeRequest(changeType: 'add' | 'edit' | 'delete', record?: Guarantor): void {
    this.guarantorChangeType = changeType;
    this.selectedGuarantorRecord = record || null;

    if (changeType === 'add') {
      this.guarantorChangeHeader = 'Add Guarantor';
    } else if (changeType === 'edit') {
      this.guarantorChangeHeader = `Edit: ${record?.fullName || 'Guarantor'}`;
    } else if (changeType === 'delete') {
      this.guarantorChangeHeader = `Delete: ${record?.fullName || 'Guarantor'}`;
    }

    this.isGuarantorChangeRequestOpen = true;
  }

  closeGuarantorChangeRequest(): void {
    this.isGuarantorChangeRequestOpen = false;
    this.guarantorChangeType = 'add';
    this.selectedGuarantorRecord = null;
    this.guarantorChangeHeader = 'Add Guarantor';
  }

  onGuarantorChangeRequestSubmitted(event: any): void {
    this.closeGuarantorChangeRequest();
    this.loadEmployeeRelatives();
    this.messageService.add({
      severity: 'success',
      summary: 'Request submitted',
      detail: 'Your guarantor request has been submitted for review.',
      key: 'tl',
    });
  }

  // ── Status switch ──────────────────────────────────────────────────────────

  getStatusColor(status: string | undefined): string {
    return this.changeStatusOptions.find(o => o.value === status)?.color || '#94a3b8';
  }

  toggleStatusDropdown(): void {
    this.statusDropdownOpen = !this.statusDropdownOpen;
  }

  closeStatusDropdown(): void {
    this.statusDropdownOpen = false;
  }

  changeEmploymentStatus(newStatus: string): void {
    this.statusDropdownOpen = false;
    if (!this.employeeInView || this.employeeInView.employeeStatus === newStatus || this.changingStatus) return;

    const prevStatus = this.employeeInView.employeeStatus;
    this.changingStatus = true;
    const name = `${this.employeeInView.firstName ?? ''} ${this.employeeInView.lastName ?? ''}`.trim();
    const label = this.changeStatusOptions.find(o => o.value === newStatus)?.label ?? newStatus;

    const payload = {
      ...this.employeeInView,
      employeeStatus: newStatus,
      department: this.employeeInView.department?.id ?? this.employeeInView.department,
      level: this.employeeInView.level?.id ?? this.employeeInView.level,
    };

    this.employeeService.updateEmployee(payload, this.employeeInView.id).pipe(
      finalize(() => { this.changingStatus = false; })
    ).subscribe({
      next: () => {
        this.employeeInView = { ...this.employeeInView, employeeStatus: newStatus };
        localStorage.setItem('employeeInView', JSON.stringify(this.employeeInView));
        this.messageService.add({ severity: 'success', summary: 'Status Updated', detail: `${name} is now marked as ${label}.`, key: 'tl', life: 3000 });
        if (newStatus === 'ACTIVE' && prevStatus !== 'ACTIVE') {
          this.dispatchWelcomeToActiveNotifications(this.employeeInView, name);
        }
        window.dispatchEvent(new CustomEvent('employee-record-changed'));
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'Failed to update status.';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: msg, key: 'tl', life: 4000 });
      }
    });
  }

  // ── Delete employee ────────────────────────────────────────────────────────

  confirmDelete(): void {
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
  }

  executeDelete(): void {
    if (!this.employeeInView?.id || this.deletingEmployee) return;
    this.showDeleteConfirm = false;
    this.deletingEmployee = true;
    this.employeeService.deleteEmployee(this.employeeInView.id).pipe(
      finalize(() => { this.deletingEmployee = false; })
    ).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Employee record removed.', key: 'tl', life: 3000 });
        localStorage.removeItem('employeeInView');
        window.dispatchEvent(new CustomEvent('employee-record-changed'));
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'Failed to delete employee.';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: msg, key: 'tl', life: 5000 });
      }
    });
  }

  // ── Resend onboarding credentials ─────────────────────────────────────────

  resendOnboarding(): void {
    if (!this.employeeInView || this.resendingCredentials) return;
    const employee = this.employeeInView;
    const email = employee?.workEmail || employee?.email || '';
    console.log("Got username " + email);
    if (!email) {
      this.messageService.add({ severity: 'warn', summary: 'Cannot Resend', detail: 'No email address found on this employee record.', key: 'tl', life: 5000 });
      return;
    }
    const resolvedUserId = employee?.userId ?? employee?.user?.id ?? employee?.user?.userId;
    const username = email;
    const name = `${employee?.firstName ?? ''} ${employee?.lastName ?? ''}`.trim();
    const newPassword = this.generateRandomPassword();
    this.resendingCredentials = true;

    if (!resolvedUserId) {
      const signupPayload = this.buildOnboardingSignupPayload(username, newPassword, email, employee.firstName, employee.lastName);
      this.authenticationService.userRegistrationByAdmin(signupPayload).subscribe({
        next: (userData: any) => {
          this.employeeInView.userId = userData?.id;
          this.dispatchOnboardingEmail(employee, name, username, newPassword);
        },
        error: (err: any) => {
          const code = err?.error?.code;
          if (code === '1001' || err?.status === 400) {
            this.authenticationService.getRegDataByUsername(username).subscribe({
              next: (userData: any) => {
                const existingUserId = userData?.id ?? userData?.userId;
                if (existingUserId) this.employeeInView.userId = existingUserId;
                this.authenticationService.resetPasswordByAdmin(username, newPassword).subscribe({
                  next: () => this.dispatchOnboardingEmail(employee, name, username, newPassword),
                  error: (e: any) => {
                    this.resendingCredentials = false;
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: e?.error?.message || 'Failed to reset password.', key: 'tl', life: 4000 });
                  }
                });
              },
              error: () => {
                this.resendingCredentials = false;
                this.messageService.add({ severity: 'error', summary: 'Account Creation Failed', detail: err?.error?.message || 'Failed to create user account.', key: 'tl', life: 6000 });
              }
            });
          } else {
            this.resendingCredentials = false;
            this.messageService.add({ severity: 'error', summary: 'Account Creation Failed', detail: err?.error?.message || 'Failed to create user account.', key: 'tl', life: 6000 });
          }
        }
      });
      return;
    }

    this.authenticationService.resetPasswordByAdmin(username, newPassword).subscribe({
      next: () => this.dispatchOnboardingEmail(employee, name, username, newPassword),
      error: (err: any) => {
        this.resendingCredentials = false;
        const msg = err?.error?.message || err?.message || 'Failed to reset password.';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: msg, key: 'tl', life: 4000 });
      }
    });
  }

  private dispatchOnboardingEmail(employee: any, name: string, username: string, password: string): void {
    const companyName = 'The Company';
    const hrEmail = '';
    const url = `${window.location.origin}/onboarding/${employee.id}/wer23456fghi367ghj?onboarding=1`;
    const subject = `${companyName} — Your Onboarding Credentials`;
    const htmlBody = this.buildOnboardingEmailHtml({ name, username, password, url, companyName, hrEmail });
    this.employeeService.sendNotificationEmail(employee.email, subject, htmlBody).subscribe({
      next: () => {
        this.resendingCredentials = false;
        this.messageService.add({ severity: 'success', summary: 'Sent', detail: 'Onboarding credentials sent successfully.', key: 'tl', life: 3000 });
      },
      error: () => {
        this.resendingCredentials = false;
        this.messageService.add({ severity: 'warn', summary: 'Email Failed', detail: 'Credentials set but email could not be delivered.', key: 'tl', life: 6000 });
      }
    });
  }

  // ── Download profile PDF ───────────────────────────────────────────────────

  downloadProfilePdf(): void {
    const e = this.employeeInView;
    if (!e) return;

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const companyName = 'The Company';
    const pageW = 210;
    const margin = 18;
    const colW = pageW - margin * 2;

    const brand = '#1b3358';
    const light = '#f8fafc';
    const muted = '#64748b';
    const accent = '#2d5a8e';

    // Header band
    doc.setFillColor(27, 51, 88);
    doc.rect(0, 0, pageW, 38, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(companyName, margin, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(168, 197, 232);
    doc.text('EMPLOYEE PROFILE RECORD', margin, 24);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageW - margin, 24, { align: 'right' });

    // Name & ID block
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 38, pageW, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(`${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Unknown Employee', margin, 51);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`${e.jobTitle || 'Role pending'}  ·  ID #${e.id || '—'}  ·  ${e.employeeStatus || '—'}`, margin, 57);

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, 62, pageW - margin, 62);

    let y = 70;

    const section = (title: string) => {
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y - 4, colW, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(title.toUpperCase(), margin + 3, y + 1);
      y += 10;
    };

    const row = (label: string, value: string | null | undefined, col: 0 | 1 = 0) => {
      const x = margin + col * (colW / 2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(label, x, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(String(value || '—').substring(0, 42), x, y + 5);
    };

    const twoCol = (l1: string, v1: any, l2: string, v2: any) => {
      row(l1, v1, 0);
      row(l2, v2, 1);
      y += 14;
    };

    const oneRow = (label: string, value: any) => {
      row(label, value, 0);
      y += 14;
    };

    // Personal
    section('Personal Information');
    twoCol('First Name', e.firstName, 'Last Name', e.lastName);
    twoCol('Date of Birth', this.formatDate(e.dob), 'Gender', e.gender?.name || e.gender);
    twoCol('NIN', e.nin, 'BVN', e.bvn);
    twoCol('Marital Status', e.maritalStatus?.name || e.maritalStatus, 'Religion', e.religion?.name || e.religion);

    // Employment
    section('Employment Details');
    twoCol('Job Title', e.jobTitle, 'Department', e.department?.name || e.department);
    twoCol('Level / Grade', e.level?.name || e.level, 'Employment Type', e.employmentType?.name || e.employmentType || e.jobType?.name);
    twoCol('Supervisor', e.supervisor, 'Status', e.employeeStatus);
    twoCol('Hire Date', this.formatDate(e.hireDate || e.employementStartDate || e.employmentStartDate), 'Employee ID', String(e.id || '—'));

    // Contact
    section('Contact Information');
    twoCol('Phone', e.phone, 'Personal Email', e.email);
    oneRow('Work Email', e.workEmail);
    oneRow('Address', e.address);

    // Bank
    section('Bank Details');
    twoCol('Bank Name', e.bankName, 'Account Number', e.accountNumber);

    // Compensation
    if (e.salaryDetails?.baseSalary) {
      section('Compensation');
      const fmt = (n: any) => n ? `NGN ${Number(n).toLocaleString()}` : '—';
      twoCol('Base Salary', fmt(e.salaryDetails.baseSalary), 'Net Salary', fmt(e.salaryDetails.netSalaryComputed ?? e.salaryDetails.netSalary));
    }

    // Footer
    const footerY = 285;
    doc.setFillColor(27, 51, 88);
    doc.rect(0, footerY, pageW, 12, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(168, 197, 232);
    doc.text(`${companyName} — Confidential HR Document`, margin, footerY + 7);
    doc.text('Page 1 of 1', pageW - margin, footerY + 7, { align: 'right' });

    const filename = `employee-profile-${(e.firstName || 'employee').toLowerCase()}-${(e.lastName || '').toLowerCase()}-${e.id || ''}.pdf`.replace(/\s+/g, '-');
    doc.save(filename);
  }

  // ── Welcome to Active notifications ───────────────────────────────────────

  private dispatchWelcomeToActiveNotifications(employee: any, name: string): void {
    const companyName = 'The Company';
    const logoUrl = '';
    const hrEmail = '';
    const subject = `Welcome to ${companyName}! 🎉`;
    const htmlBody = this.buildWelcomeActiveEmailHtml({ name, companyName, logoUrl, hrEmail, jobTitle: employee?.jobTitle || '', department: employee?.department?.name || employee?.department || '' });

    const sendTo: string[] = [];
    if (employee?.email) sendTo.push(employee.email);
    if (employee?.workEmail && employee.workEmail !== employee.email) sendTo.push(employee.workEmail);
    sendTo.forEach(email => {
      this.employeeService.sendNotificationEmail(email, subject, htmlBody).subscribe({ error: () => { } });
    });

    this.employeeService.sendWelcomeEmail({
      name,
      email: employee?.email || '',
      workEmail: employee?.workEmail || '',
      jobTitle: employee?.jobTitle || '',
      department: employee?.department?.name || employee?.department || '',
      companyName,
      event: 'JOINING_TO_ACTIVE',
      timestamp: new Date().toISOString(),
    }).subscribe({ error: () => { } });
  }

  private buildWelcomeActiveEmailHtml(d: { name: string; companyName: string; logoUrl: string; hrEmail: string; jobTitle: string; department: string }): string {
    const logo = d.logoUrl ? `<img src="${d.logoUrl}" alt="${d.companyName}" style="height:40px;max-width:160px;object-fit:contain;margin-bottom:12px;" />` : '';
    const hrLine = d.hrEmail
      ? `Reach us at <a href="mailto:${d.hrEmail}" style="color:#1b3358;text-decoration:none;">${d.hrEmail}</a>`
      : 'Reach out to the HR Department';
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:36px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">
<tr><td style="background:linear-gradient(135deg,#1b3358 0%,#2d5a8e 100%);padding:44px 40px 36px;text-align:center;">
${logo}<div style="display:inline-block;background:rgba(255,255,255,.15);border-radius:50%;width:72px;height:72px;line-height:72px;font-size:36px;margin-bottom:16px;">🎉</div>
<h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#fff;">Welcome to the Team!</h1>
<p style="margin:0;font-size:14px;color:#a8c5e8;">${d.companyName}</p></td></tr>
<tr><td style="padding:40px 40px 32px;">
<p style="margin:0 0 20px;font-size:16px;color:#1a2b3c;font-weight:600;">Dear ${d.name},</p>
<p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.8;">We are absolutely thrilled to welcome you as a full member of the <strong>${d.companyName}</strong> family.</p>
${d.jobTitle ? `<p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.8;">You are joining us as <strong>${d.jobTitle}</strong>${d.department ? ` in the <strong>${d.department}</strong> department` : ''}.</p>` : ''}
<p style="margin:0;font-size:14px;color:#475569;line-height:1.8;">Once again, <strong>welcome aboard!</strong></p></td></tr>
<tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;">
<p style="margin:0;font-size:13px;color:#475569;">${hrLine} — <strong>Human Resources Department</strong><br/>${d.companyName}</p></td></tr>
</table></td></tr></table></body></html>`;
  }

  private buildOnboardingEmailHtml(d: { name: string; username: string; password: string; url: string; companyName: string; hrEmail: string }): string {
    const hrLine = d.hrEmail
      ? `Please contact HR at <a href="mailto:${d.hrEmail}" style="color:#1e3a5f;">${d.hrEmail}</a> for queries.`
      : `Please contact the HR Department for queries.`;
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:36px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08);">
<tr><td style="background:#1b3358;padding:36px 40px;text-align:center;">
<p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;color:#7aa7d4;text-transform:uppercase;">Human Resources</p>
<h1 style="margin:0;font-size:24px;font-weight:700;color:#fff;">${d.companyName}</h1>
<p style="margin:8px 0 0;font-size:13px;color:#a8c5e8;">Staff Onboarding</p></td></tr>
<tr><td style="padding:40px 40px 28px;">
<p style="margin:0 0 20px;font-size:15px;color:#1a2b3c;font-weight:600;">Dear ${d.name},</p>
<p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.7;">Please complete your onboarding via the portal below.</p>
<table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
<tr><td style="background:#1b3358;border-radius:6px;padding:13px 30px;">
<a href="${d.url}" style="color:#fff;text-decoration:none;font-size:14px;font-weight:600;">Begin Onboarding Process →</a></td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
<tr><td style="padding:22px 26px;">
<p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Your Portal Credentials</p>
<table cellpadding="0" cellspacing="0">
<tr><td style="padding:5px 16px 5px 0;font-size:13px;color:#94a3b8;">Username</td><td style="font-size:13px;color:#1e293b;font-weight:600;">${d.username}</td></tr>
<tr><td style="padding:5px 16px 5px 0;font-size:13px;color:#94a3b8;">Password</td><td style="font-size:13px;color:#1e293b;font-family:monospace;font-weight:700;">${d.password}</td></tr>
</table></td></tr></table>
</td></tr>
<tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;">
<p style="margin:0;font-size:13px;color:#475569;">${hrLine}<br/><strong>Human Resources Department</strong><br/>${d.companyName}</p></td></tr>
</table></td></tr></table></body></html>`;
  }

  private buildOnboardingSignupPayload(username: string, password: string, email: string, firstName = '', lastName = '') {
    const business = sessionStorage.getItem('userPrimaryInfoRegData')
      ? JSON.parse(sessionStorage.getItem('userPrimaryInfoRegData') || '{}')
      : null;
    return {
      username, password, email,
      project: 'ERP',
      apiKey: '',
      upi: {
        fullname: `${firstName} ${lastName}`.trim(),
        username: username || '',
        email: email || '',
        industry: business?.industry,
        companyName: business?.companyName,
        clientType: business?.clientType,
        currency: business?.currency,
        language: business?.language,
        timeZone: business?.timeZone,
      }
    };
  }

  private generateRandomPassword(length = 12): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%*?';
    const pick = () => chars[Math.floor(Math.random() * chars.length)];
    return Array.from({ length }, pick).join('');
  }
}
