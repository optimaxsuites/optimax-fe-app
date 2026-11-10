import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CalendarOptions } from '@fullcalendar/core/index.js';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
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
import { PayrollService } from '../../service/payroll.service';
import { AttendancetableService } from '../../service/attendance/attendancetable.service';
import { buildOnboardingEmailHtml, buildOnboardingLink, escapeHtml, generateTemporaryPassword, onboardingLinkExpiry } from '../employee-management/onboarding-credentials.util';
import { SelectedEmployeeStore } from '../employee-management/selected-employee.store';
import { resolveSalaryStructure, SalaryStructure } from '../../service/payroll-calculation';
import { payslipFigures, periodLabel } from '../payroll/payslip.util';

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

  // Exit reason modal
  showExitReasonModal = false;
  pendingExitStatus = '';
  exitReasonText = '';
  readonly EXIT_STATUSES = new Set(['TERMINATED', 'RESIGNED', 'FIRED', 'INTERNSHIP_ENDED']);

  private isAdmin(): boolean {
    try {
      const basicRole = sessionStorage.getItem('role') || '';
      if (basicRole.includes('ROLE_ADMIN')) return true;
      const appRole = JSON.parse(sessionStorage.getItem('userApplicationRole') || '{}');
      return (appRole?.appRole?.name || '').toLowerCase().includes('admin');
    } catch { return false; }
  }

  private showApiError(err: any, friendlyMsg: string): void {
    if (this.isAdmin()) {
      const tech = err?.error?.message || err?.error?.detail || err?.message || JSON.stringify(err?.error || err);
      this.messageService.add({ severity: 'error', summary: 'Error (Admin Detail)', detail: tech, key: 'tl', life: 0 });
    } else {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: friendlyMsg, key: 'tl', life: 5000 });
    }
  }
  deletingEmployee = false;
  resendingCredentials = false;
  uploadingPhoto = false;
  showDeleteConfirm = false;
  canManageEmployees = false;
  salaryVisible = false;
  jobTitleOptions: string[] = [];
  supervisorOptions: string[] = [];
  changeStatusOptions = [
    { label: 'Active',            value: 'ACTIVE',            color: '#10b981' },
    { label: 'Joining',           value: 'JOINING',           color: '#facc15' },
    { label: 'Suspended',         value: 'SUSPENDED',         color: '#f97316' },
    { label: 'On Leave',          value: 'ON_LEAVE',          color: '#3b82f6' },
    { label: 'Terminated',        value: 'TERMINATED',        color: '#ef4444' },
    { label: 'Resigned',          value: 'RESIGNED',          color: '#8b5cf6' },
    { label: 'Contract',          value: 'CONTRACT',          color: '#64748b' },
    { label: 'Internship Ended',  value: 'INTERNSHIP_ENDED',  color: '#a855f7' },
  ];
  recentPayslips: any[] = [];
  payslipsLoading = false;
  /** Regular monthly pay from the level's salary structure (payroll-calculation.ts). */
  salaryStructure: SalaryStructure | null = null;
  private salaryRecords: any[] = [];
  private salaryInputMode: 'monthly' | 'yearly' = 'monthly';
  viewPayslip = false;
  activePayslip: any = {};

  readonly payslipMonthNames = [
    'Jan','Feb','Mar','Apr','May','Jun',
    'Jul','Aug','Sep','Oct','Nov','Dec'
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
    private payrollService: PayrollService,
    private attendanceService: AttendancetableService,
    // // private companyProfileService: CompanyProfileService,
    private authenticationService: AuthenticationService,
    private selectedEmployee: SelectedEmployeeStore,
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
    this.payrollService.getGeneralSettingsById().subscribe({
      next: (res: any) => {
        this.salaryInputMode = res?.salaryInputMode === 'yearly' ? 'yearly' : 'monthly';
        this.applySalaryStructure();
      },
      error: () => { },
    });
    this.dataService.getDepartment().subscribe({ next: (d: any[]) => this.departments = d, error: () => { } });
    this.dataService.getAllLevels().subscribe({ next: (d: any[]) => this.levels = (d || []).map((l: any) => ({ ...l, displayLabel: l.position?.trim() || l.name })), error: () => { } });
    this.dataService.getGender().subscribe({ next: (d: any[]) => this.genders = d, error: () => { } });
    this.dataService.getJobType().subscribe({ next: (d: any[]) => this.jobTypes = d, error: () => { } });
    this.employeeService.getAllEmployee().subscribe({
      next: (emps: any[]) => {
        this.employees = emps;
        const titles = new Set<string>();
        const supervisors = new Set<string>();
        emps.forEach((e: any) => {
          const title = (e?.jobTitle || '').trim();
          if (title) titles.add(title);
          const name = `${e?.firstName || ''} ${e?.lastName || ''}`.trim();
          if (name) supervisors.add(name);
        });
        this.jobTitleOptions = Array.from(titles).sort();
        this.supervisorOptions = Array.from(supervisors).sort();
      },
      error: () => {}
    });
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
      this.nextOfKinList?.length ? 'yes' : '',
      this.guarantorList?.length ? 'yes' : '',
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
    const base = Number(this.salaryStructure?.baseSalary || 0);
    const net = Number(this.takeHomePay || 0);
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
    }).then((dataUrl:string) => {
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
    const selectedEmployee = this.selectedEmployee.get();
    if (selectedEmployee && this.isEmployeeManagementContext()) {
      this.applyEmployeeView(selectedEmployee);
      return;
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
    this.loadRecentPayslips(employee?.id);
    this.loadAttendanceSummary(employee?.id);

    this.salaryRecords = [];
    this.salaryStructure = null;
    if (this.employeeInView?.level) {
      this.employeeService.getSalaryById(this.employeeInView.level.id).subscribe({
        next: (salaryData) => {
          this.salaryRecords = Array.isArray(salaryData) ? salaryData : (salaryData ? [salaryData] : []);
          this.applySalaryStructure();
        },
        error: () => {},
      });
    }

    if (this.employeeInView?.imageUrl) {
      this.employeeProfilePhotoUrl = this.employeeInView.imageUrl;
    }
    this.getEmployeesProfilePhotoUrl(this.employeeInView?.employeeMedia?.mediaNo);

    if (this.employeeInView?.leaveDetails) {
      this.calendarOptions = {
        ...this.calendarOptions,
        events: this.generateLeaveEvents(this.employeeInView.leaveDetails),
      };
    }
  }

  /** Builds the structure from the loaded records and the payroll's monthly/yearly setting. */
  private applySalaryStructure(): void {
    this.salaryStructure = resolveSalaryStructure(this.salaryRecords, this.salaryInputMode);
    if (!this.employeeInView) return;
    const record = this.salaryStructure ? this.salaryRecords.find(r => r?.id === this.salaryStructure!.recordId) ?? this.salaryRecords[0] : null;
    // Other screens (letters) read salaryDetails; keep the chosen record there with the shared figures.
    this.employeeInView.salaryDetails = record ? {
      ...record,
      netSalaryComputed: this.salaryStructure!.netPay,
      grossSalaryComputed: this.salaryStructure!.grossPay,
    } : null;
  }

  /** The newest payroll run row for this employee, with its figures, or null. */
  /**
   * The newest payslip that actually pays something. A run whose deductions exceed gross (net ≤ 0) is
   * a payroll error, not the employee's take-home, so it is skipped here and flagged in the list.
   */
  get latestPayslip(): { label: string; grossPay: number; netPay: number; runStatus: string } | null {
    const slip = this.recentPayslips.find(s => !payslipFigures(s).notPayable);
    if (!slip) return null;
    const f = payslipFigures(slip);
    return { label: periodLabel(slip.month, slip.year), grossPay: f.grossPay, netPay: f.netPay, runStatus: slip.runStatus };
  }

  isPayslipNotPayable(slip: any): boolean {
    return payslipFigures(slip).notPayable;
  }

  /**
   * Take-home pay: the latest payroll run's net when there is one (it includes PAYE, pension, loans,
   * bonuses and fines for that month); otherwise the salary structure's net.
   */
  get takeHomePay(): number | null {
    return this.latestPayslip?.netPay ?? this.salaryStructure?.netPay ?? null;
  }

  get takeHomeLabel(): string {
    if (this.latestPayslip) {
      const approved = ['APPROVED', 'COMPLETED'].includes(String(this.latestPayslip.runStatus || '').toUpperCase());
      return `From ${this.latestPayslip.label} payroll${approved ? '' : ' (not yet approved)'}`;
    }
    if (this.salaryStructure) return 'Salary structure, before PAYE and payroll deductions';
    return 'No salary structure for this level';
  }

  loadRecentPayslips(empId?: number): void {
    if (!empId) return;
    this.payslipsLoading = true;
    this.payrollService.getPayrollGenerationResponses(1, 500).pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (response: any) => {
        const runs: any[] = Array.isArray(response) ? response : (response?.content ?? []);
        const slips: any[] = [];
        runs.forEach(run => {
          const match = (run?.employees ?? []).find((e: any) =>
            String(e?.employee?.id) === String(empId) || String(e?.employeeId) === String(empId)
          );
          if (match) {
            slips.push({
              ...match,
              month: run.month,
              year: run.year,
              runStatus: (run.payrollApprovalInstance?.status || run.status || 'COMPLETED').toUpperCase()
            });
          }
        });
        slips.sort((a, b) => (+b.year - +a.year) || (+b.month - +a.month));
        this.recentPayslips = slips.slice(0, 5);
        this.payslipsLoading = false;
      },
      error: () => { this.payslipsLoading = false; }
    });
  }

  loadAttendanceSummary(empId?: number): void {
    if (!empId) return;
    const now = new Date();
    const cm = now.getMonth() + 1;
    const cy = now.getFullYear();
    this.attendanceService.fetchEmployeeRecords(String(empId)).subscribe({
      next: (records: any[]) => {
        const thisMonth = records.filter(r => {
          const dateStr = typeof r.date === 'string' ? r.date
            : Array.isArray(r.date) ? `${r.date[0]}-${String(r.date[1]).padStart(2,'0')}-${String(r.date[2]).padStart(2,'0')}`
            : '';
          if (!dateStr) return false;
          const d = new Date(dateStr);
          return d.getMonth() + 1 === cm && d.getFullYear() === cy;
        });
        const daysPresent = thisMonth.filter(r => (r.status || '').toUpperCase() === 'PRESENT').length;
        const daysAbsent  = thisMonth.filter(r => (r.status || '').toUpperCase() === 'ABSENT').length;
        const lateArrivals = thisMonth.filter(r => (r.status || '').toUpperCase().includes('LATE')).length;
        if (this.employeeInView) {
          this.employeeInView = {
            ...this.employeeInView,
            attendance: { daysPresent, daysAbsent, lateArrivals }
          };
        }
      },
      error: () => {}
    });
  }

  openPayslipDetail(slip: any): void {
    const emp = this.employeeInView || slip?.employee || {};
    this.activePayslip = {
      empId: emp.id,
      name: `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim(),
      department: emp.department?.name || emp.department,
      level: emp.level?.name || emp.level,
      accountNumber: emp.accountNumber,
      bank: emp.bankName,
      ...slip
    };
    this.viewPayslip = true;
  }

  fmtPayslipAmount(val: number): string {
    if (!val) return '₦0';
    if (val >= 1_000_000) return '₦' + (val / 1_000_000).toFixed(1) + 'M';
    if (val >= 1_000) return '₦' + (val / 1_000).toFixed(1) + 'K';
    return '₦' + val.toLocaleString();
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
      next: () => {
        this.employeeService.getEmployeeById(this.employeeInView.id).subscribe({
          next: (fresh: any) => {
            this.applyEmployeeView(fresh);
            this.selectedEmployee.set(fresh);
          },
          error: () => {
            this.employeeInView = { ...this.employeeInView, ...patch };
            this.patchEditForm();
          }
        });
        this.originalProfilePhotoUrl =
          this.employeeInView?.imageUrl || this.employeeProfilePhotoUrl || null;
        this.pendingProfilePhotoDataUrl = null;
        this.pendingProfilePhotoName = null;
        this.pendingProfilePhotoFile = null;
        this.messageService.add({
          severity: 'success',
          summary: 'Profile updated',
          detail: 'Your changes have been saved.',
          key: 'global',
        });
        this.isEditMode = false;
        this.isEditOpen = false;
      },
      error: (err: any) => {
        this.showApiError(err, 'Unable to save changes. Please try again.');
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
    const patch: any = {
      id: employee.id,
      // Only the account already linked to this employee, never the signed-in HR user's.
      userId: employee.userId ?? employee.user?.userId ?? null,
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
      },
      error: () => {
        this.nextOfKinList = [];
      },
    })

    this.employeeService.getGuarantor(this.employeeInView.id).subscribe({
      next: (res: any) => {
        this.guarantorList = res;
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

    if (this.EXIT_STATUSES.has(newStatus)) {
      this.pendingExitStatus = newStatus;
      this.exitReasonText = '';
      this.showExitReasonModal = true;
      return;
    }

    this.applyStatusChange(newStatus, '');
  }

  confirmExitReason(): void {
    if (!this.exitReasonText.trim()) return;
    this.showExitReasonModal = false;
    this.applyStatusChange(this.pendingExitStatus, this.exitReasonText.trim());
    this.pendingExitStatus = '';
    this.exitReasonText = '';
  }

  cancelExitReason(): void {
    this.showExitReasonModal = false;
    this.pendingExitStatus = '';
    this.exitReasonText = '';
  }

  getStatusLabel(value: string): string {
    return this.changeStatusOptions.find(o => o.value === value)?.label ?? value;
  }

  private applyStatusChange(newStatus: string, exitReason: string): void {
    const prevStatus = this.employeeInView.employeeStatus;
    this.changingStatus = true;
    const name = `${this.employeeInView.firstName ?? ''} ${this.employeeInView.lastName ?? ''}`.trim();
    const label = this.changeStatusOptions.find(o => o.value === newStatus)?.label ?? newStatus;

    const { data: basePayload } = this.buildUpdatePayload();
    const currentUser = sessionStorage.getItem('username') || localStorage.getItem('username') || '';
    const payload: any = { ...basePayload, employeeStatus: newStatus };
    if (exitReason) {
      payload.exitReason = exitReason;
      payload.exitReasonBy = currentUser;
    }

    this.employeeService.updateEmployee(payload, this.employeeInView.id).pipe(
      finalize(() => { this.changingStatus = false; })
    ).subscribe({
      next: () => {
        this.employeeInView = { ...this.employeeInView, employeeStatus: newStatus, exitReason, exitReasonBy: currentUser };
        this.selectedEmployee.set(this.employeeInView);
        this.messageService.add({ severity: 'success', summary: 'Status Updated', detail: `${name} is now marked as ${label}.`, key: 'tl', life: 3000 });
        if (newStatus === 'ACTIVE' && prevStatus !== 'ACTIVE') {
          this.dispatchWelcomeToActiveNotifications(this.employeeInView, name);
        }
        // Narrower event — updates only this employee in the list without a full refresh
        window.dispatchEvent(new CustomEvent('employee-status-changed', {
          detail: { id: this.employeeInView.id, employeeStatus: newStatus }
        }));
      },
      error: (err) => {
        this.showApiError(err, 'Unable to update employment status. Please try again.');
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
        this.selectedEmployee.clear();
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
    if (!email) {
      this.messageService.add({ severity: 'warn', summary: 'Cannot Resend', detail: 'No email address found on this employee record.', key: 'tl', life: 5000 });
      return;
    }
    const resolvedUserId = employee?.userId ?? employee?.user?.id ?? employee?.user?.userId;
    const username = email;
    const name = `${employee?.firstName ?? ''} ${employee?.lastName ?? ''}`.trim();
    const newPassword = generateTemporaryPassword();
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
    const expiresAt = onboardingLinkExpiry();
    const url = buildOnboardingLink(employee.id, expiresAt);
    const subject = `${companyName} — Your Onboarding Credentials`;
    const htmlBody = buildOnboardingEmailHtml({ name, username, password, url, companyName, hrEmail, expiresAt });
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
    if (this.salaryStructure?.baseSalary) {
      section('Compensation');
      const fmt = (n: any) => n ? `NGN ${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
      twoCol('Base Salary', fmt(this.salaryStructure.baseSalary), 'Gross Pay', fmt(this.salaryStructure.grossPay));
      oneRow('Net Pay', `${fmt(this.takeHomePay)} (${this.takeHomeLabel})`);
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
    const htmlBody = this.buildWelcomeActiveEmailHtml({
      name: escapeHtml(name),
      companyName: escapeHtml(companyName),
      logoUrl: escapeHtml(logoUrl),
      hrEmail: escapeHtml(hrEmail),
      jobTitle: escapeHtml(employee?.jobTitle || ''),
      department: escapeHtml(employee?.department?.name || employee?.department || ''),
    });

    // One email: to the work mailbox now they're staff, or the personal one if there isn't one.
    const to = employee?.workEmail || employee?.email;
    if (to) {
      this.employeeService.sendNotificationEmail(to, subject, htmlBody).subscribe({ error: () => { } });
    }
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
}
