import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
// // import { CompanyProfileService }
import { NavigationLinksService } from '../../shared-component/service/navigation-links/navigation-links.service';
import { ImportedEmployeeData } from './pre-onboarding-import/pre-onboarding-import.component';
import { finalize } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { RandomTokenService } from '../../shared-component/service/random-token/random-token.service';
import { ViewEmployeeComponent } from './view-employee/view-employee.component';
import { AdminCreationFormComponent } from './admin-creation-form/admin-creation-form.component';
import { TabConfig } from '../../shared-component/service/interface/data';
import { EmployeeNokComponent } from './employee-nok/employee-nok.component';
import { EmployeeGuarantorComponent } from './employee-guarantor/employee-guarantor.component';
import { EmployeeOffboardingComponent } from './employee-offboarding/employee-offboarding.component';
import { HrLettersComponent } from './hr-letters/hr-letters.component';
import { EmployeeService } from '../../service/employee.service';
import { DataService } from '../../service/data.service';
import { AuthenticationService } from '../../shared-component/service/auth-service/authentication.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { EmployeeProfileDashboardComponent } from '../employee-dashboard/employee-profile-dashboard.component';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { buildOnboardingEmailHtml, buildOnboardingLink, escapeHtml, generateTemporaryPassword, onboardingLinkExpiry } from './onboarding-credentials.util';

@Component({
  selector: 'app-employee-management',
  templateUrl: './employee-management.component.html',
  styleUrl: './employee-management.component.scss',
  providers: [MessageService, ConfirmationService],
})
export class EmployeeManagementComponent implements OnInit, OnDestroy {
  activeSubmodule: 'directory' | 'staff-numbers' | 'enrollment' = 'directory';
  private readonly minimumLoaderDurationMs = 900;

  tabsConfig: TabConfig[] = [
    { name: 'Basic Information', component: EmployeeProfileDashboardComponent, icon: 'fa-solid fa-user' },
    { name: 'Next of Kin',       component: EmployeeNokComponent,              icon: 'fa-solid fa-people-arrows' },
    { name: 'Guarantors',        component: EmployeeGuarantorComponent,         icon: 'fa-solid fa-handshake' },
    { name: 'Offboarding',       component: EmployeeOffboardingComponent,       icon: 'fa-solid fa-door-open' },
    { name: 'HR Letters',        component: HrLettersComponent,                 icon: 'fa-solid fa-envelope-open-text' },
  ];
  uniqueLevels: any;
  uniquePositions: any;
  employeeProfilePhotoUrl: string =
    'https://media.istockphoto.com/id/1223671392/vector/default-profile-picture-avatar-photo-placeholder-vector-illustration.jpg?s=612x612&w=0&k=20&c=s0aTdmT5aU6b8ot7VKm11DeID6NctRCpB755rA1BIP0=';

  viewEmployee: boolean = false;
  employeeInView: any = {};
  staffIdEmployee: any = null;
  staffIdQrDataUrl = '';
  staffIdBarcodeDataUrl = '';
  searchTerm: any;

selectedPosition: any;
openAddForm: boolean = false;
openImportDialog: boolean = false;
importedData: ImportedEmployeeData | null = null;
employeeList = [
  {
    id: 'tok12345abc', // Example token value
    firstName: 'Chukwuemeka',
    lastName: 'Okafor',
    dob: '1990-02-15',
    gender: 'Male',
    email: 'chukwuemeka.okafor@example.com',
    phone: '+2348012345678',
    maritalStatus: 'Married',
    religion: 'Christianity',
    address: '12, Adeola Avenue, Lagos, Nigeria',
    jobTitle: 'Software Engineer',
    department: 'IT',
    level: 'Senior Level 1',
    employmentType: 'Full-Time',
    supervisor: 'Rolayo Awe',
    bankName: 'GTBank',
    accountNumber: '1234567890',
    nin: '9876543210',
    bvn: '12345678901',
    nextOfKin: [
      { name: 'Ngozi Okafor', relationship: 'Wife', phone: '+2348012345679' }
    ],
    guarantor: [
      { name: 'Ifeanyi Nwankwo', relationship: 'Friend', phone: '+2348012345670' }
    ],
    hireDate: '2023-01-10',
    profileImage: 'https://randomuser.me/api/portraits/men/1.jpg', // Example profile image
    leaveDetails: {
      assignedLeaves: 20,
      usedLeaves: 5,
      leavesRemaining: 15,
      leavesSpent: [
        {
          type: 'Annual',
          daysUsed: 5,
          from: '2023-05-10',
          to: '2023-05-15',
        }
      ]
    },
    attendance: {
      year: '2023',
      daysPresent: 200,
      daysAbsent: 10,
      lateArrivals: 5,
      overtimeHours: 15,
      lastPresent: '2023-10-10',
      day2DayAttendance: [
        {
          date: '2023-10-09',
          clockIn: '9:00 AM',
          clockOut: '5:00 PM',
          comment: 'Meeting with clients'
        },
        {
          date: '2023-10-08',
          clockIn: '9:15 AM',
          clockOut: '5:05 PM',
          comment: 'Came in late'
        }
      ]
    }
  },
  {
    id: 'tok56789def',
    firstName: 'Aisha',
    lastName: 'Abdullahi',
    dob: '1992-07-20',
    gender: 'Female',
    email: 'aisha.abdullahi@example.com',
    phone: '+2348076543210',
    maritalStatus: 'Single',
    religion: 'Islam',
    address: '25, Sultan Bello Road, Abuja, Nigeria',
    jobTitle: 'HR Manager',
    department: 'Human Resources',
    level: 'Junior Staff',
    employmentType: 'Full-Time',
    supervisor: 'Maryam Bello',
    bankName: 'Access Bank',
    accountNumber: '1098765432',
    nin: '5678901234',
    bvn: '98765432109',
    nextOfKin: [
      { name: 'Fatima Abdullahi', relationship: 'Sister', phone: '+2348076543211' }
    ],
    guarantor: [
      { name: 'Suleiman Ahmed', relationship: 'Uncle', phone: '+2348076543212' }
    ],
    hireDate: '2023-02-05',
    profileImage: 'https://randomuser.me/api/portraits/women/4.jpg', // Example profile image
    leaveDetails: {
      assignedLeaves: 20,
      usedLeaves: 7,
      leavesRemaining: 13,
      leavesSpent: [
        {
          type: 'Annual',
          daysUsed: 7,
          from: '2023-06-01',
          to: '2023-06-08',
        }
      ]
    },
    attendance: {
      year: '2023',
      daysPresent: 190,
      daysAbsent: 20,
      lateArrivals: 3,
      overtimeHours: 10,
      lastPresent: '2023-10-09',
      day2DayAttendance: [
        {
          date: '2023-10-09',
          clockIn: '9:10 AM',
          clockOut: '5:00 PM',
          comment: 'Team meeting'
        },
        {
          date: '2023-10-08',
          clockIn: '9:00 AM',
          clockOut: '5:00 PM',
          comment: 'Reviewed employee reports'
        }
      ]
    }
  },
  {
    id: 'tok67890ghi',
    firstName: 'Babatunde',
    lastName: 'Balogun',
    dob: '1985-12-30',
    gender: 'Male',
    email: 'babatunde.balogun@example.com',
    phone: '+2348032109876',
    maritalStatus: 'Divorced',
    religion: 'Christianity',
    address: '15, Ajose Adeogun Street, Victoria Island, Lagos',
    jobTitle: 'Accountant',
    department: 'Finance',
    level: 'Mid Level 1',
    employmentType: 'Contract',
    supervisor: 'Omotola Adebayo',
    bankName: 'UBA',
    accountNumber: '6543210987',
    nin: '3456789012',
    bvn: '23456789012',
    nextOfKin: [
      { name: 'Yewande Balogun', relationship: 'Ex-Wife', phone: '+2348032109877' }
    ],
    guarantor: [
      { name: 'Adeyemi Johnson', relationship: 'Brother', phone: '+2348032109878' }
    ],
    hireDate: '2023-03-20',
    profileImage: 'https://randomuser.me/api/portraits/men/5.jpg', // Example profile image
    leaveDetails: {
      assignedLeaves: 20,
      usedLeaves: 10,
      leavesRemaining: 10,
      leavesSpent: [
        {
          type: 'Annual',
          daysUsed: 10,
          from: '2023-07-01',
          to: '2023-07-10',
        }
      ]
    },
    attendance: {
      year: '2023',
      daysPresent: 180,
      daysAbsent: 25,
      lateArrivals: 2,
      overtimeHours: 25,
      lastPresent: '2023-10-08',
      day2DayAttendance: [
        {
          date: '2023-10-08',
          clockIn: '8:45 AM',
          clockOut: '5:00 PM',
          comment: 'Monthly finance meeting'
        },
        {
          date: '2023-10-07',
          clockIn: '9:00 AM',
          clockOut: '5:15 PM',
          comment: 'Reviewed financial statements'
        }
      ]
    }
  }
];

salaryStructure: any[] = [];
employees: any = []
filteredEmployees: any[] = [];
loading = false;
onlineUserIds = new Set<number>();
private presenceInterval: any;
selectedEmployeeType: any;
calendarOptions: CalendarOptions = {}
currentPage = 1;
pageSize = 12;
pageSizeOptions = [8, 12, 16, 24];
deletingEmployeeIds: Record<string, boolean> = {};
activatingEmployeeIds: Record<number, boolean> = {};
resendingOnboardingIds: Record<number, boolean> = {};
resendCredentials: { name: string; username: string; password: string } | null = null;
  showResendPassword = false;
viewMode: 'card' | 'list' = 'card';
selectedStatus: string = 'ACTIVE';
statusOptions = [
  { label: 'Active',      value: 'ACTIVE' },
  { label: 'Joining',     value: 'JOINING' },
  { label: 'Probation',   value: 'PROBATION' },
  { label: 'Left / Offboarded', value: 'LEFT' },
  { label: 'All',         value: 'ALL' },
];

handleDateClick(arg: DateClickArg) {
  alert('date click! ' + arg.dateStr)
}

  constructor(
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private http: HttpClient,
    private employeeService: EmployeeService,
    private sanitizer: DomSanitizer,
    private router: Router,
    private navLinks: NavigationLinksService,
    // // private companyProfileService: CompanyProfileService,
    private authenticationService: AuthenticationService,
  ) {}

  openPreOnboardingForm(): void {
    this.router.navigateByUrl(this.navLinks.getLink('preOnboardingForm'));
  }

  onImportComplete(data: ImportedEmployeeData): void {
    this.importedData = data;
    this.openImportDialog = false;
    this.openAddForm = true;
  }
  private get presenceUrl(): string {
    return `${this.employeeService.baseurl}/x/api/v2/ai/collab/chat/presence`;
  }
  private readonly PRESENCE_STALE_MS = 2 * 60 * 1000; // 2 minutes
  private readonly PRESENCE_POLL_MS = 60_000;
  private presenceRequestInFlight = false;
  /** Polls again as soon as the tab is visible, since polling pauses while it's hidden. */
  private readonly onVisibilityChange = () => {
    if (document.visibilityState === 'visible') this.pollPresence();
  };
  /** Profile photos by media number, so a list refresh doesn't download them all again. */
  private readonly photoUrlCache = new Map<string, SafeUrl>();
  private readonly photoRequests = new Set<string>();
  private readonly photoObjectUrls: string[] = [];

  ngOnInit() {
    this.fetchEmployees();
    this.startPresencePolling();
    window.addEventListener('employee-record-changed', () => {
      this.fetchEmployees();
      this.viewEmployee = false;
      this.employeeInView = {};
      localStorage.removeItem('employeeInView');
    });

    // Narrower event: only update the changed employee in-place (no full refresh)
    window.addEventListener('employee-status-changed', (e: any) => {
      const { id, employeeStatus } = e.detail || {};
      if (!id) return;
      const target = this.employees.find((emp: any) => emp.id === id);
      if (target) {
        target.employeeStatus = employeeStatus;
        this.applyFilters();
      }
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.presenceInterval);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.photoObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  }

  private getAuthToken(): string | null {
    for (const key of ['Token', 'token', 'accessToken', 'Token2', 'accessToken2']) {
      const v = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (v && v !== 'undefined' && v !== 'null') return v.trim();
    }
    return null;
  }

  private startPresencePolling(): void {
    this.pollPresence();
    this.presenceInterval = setInterval(() => this.pollPresence(), this.PRESENCE_POLL_MS);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private pollPresence(): void {
    // Nobody sees the dots while the tab is hidden, and a slow response shouldn't stack requests.
    if (document.visibilityState === 'hidden' || this.presenceRequestInFlight) return;
    const token = this.getAuthToken();
    if (!token) return;
    const now = Date.now();
    this.presenceRequestInFlight = true;
    this.http.get<any[]>(this.presenceUrl, {
      headers: { Authorization: `Bearer ${token}` }
    }).pipe(finalize(() => { this.presenceRequestInFlight = false; })).subscribe({
      next: (records) => {
        const onlineIds = new Set<number>();
        (records || []).forEach(r => {
          if (r.presenceStatus === 'ONLINE' && r.userId) {
            const updatedMs = r.updatedAt ? new Date(r.updatedAt).getTime() : 0;
            if (now - updatedMs <= this.PRESENCE_STALE_MS) {
              onlineIds.add(Number(r.userId));
            }
          }
        });
        this.onlineUserIds = onlineIds;
      },
      error: () => { /* silently ignore if AI service is down */ }
    });
  }

  isOnline(employee: any): boolean {
    return employee?.userId != null && this.onlineUserIds.has(Number(employee.userId));
  }

  fmtDate(value: any): string {
    if (!value) return '—';
    if (Array.isArray(value)) {
      const [year, month, day] = value;
      if (!year) return '—';
      return new Date(+year, +month - 1, +day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  empStatusClass(employee: any): string {
    switch (employee?.employeeStatus) {
      case 'ACTIVE':           return 'emp-status--active';
      case 'JOINING':          return 'emp-status--joining';
      case 'SUSPENDED':        return 'emp-status--suspended';
      case 'ON_LEAVE':         return 'emp-status--onleave';
      case 'TERMINATED':
      case 'RESIGNED':
      case 'FIRED':
      case 'INTERNSHIP_ENDED': return 'emp-status--terminated';
      case 'CONTRACT':         return 'emp-status--contract';
      default:                 return 'emp-status--active';
    }
  }

  async getProfileImage(fileName: string) {
    //  this.getEmployeesProfilePhotoUrl(fileName)
    return this.employeeProfilePhotoUrl;
  }
  fetchEmployees() {
    const startedAt = this.startLoading();
    this.employeeService.getAllEmployee().subscribe({
      next: (employees) => {
        this.employees = this.sortEmployeesLatest(employees);
        this.uniqueLevels = [
          ...new Set(
            this.employees
              .map((employee: { level: any }) => employee?.level?.name)
              .filter((level: string) => level != null),
          ),
        ];

        this.uniquePositions = [
          ...new Set(
            this.employees
              .map((employee: { jobTitle: string }) => employee?.jobTitle)
              .filter((jobTitle: string) => jobTitle != undefined),
          ),
        ];
        this.employees.forEach((employee: { employeeMedia: { mediaNo: any; }; imageUrl: any; }) => {
          if (employee.employeeMedia?.mediaNo) {
            this.fetchProfilePhoto(employee);
          } else {
            employee.imageUrl = this.employeeProfilePhotoUrl;
          }
        });
        this.applyFilters();
    

      },
      error: (err) => {
        console.log(err);
        this.messageService.add({
          severity: 'error',
          summary: 'Load failed',
          detail: 'Unable to fetch employee records.',
          key: 'tl',
          life: 3000,
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

  private sortEmployeesLatest(employees: any[]): any[] {
    return employees
      .slice()
      .sort(
        (a, b) => this.getEmployeeSortValue(b) - this.getEmployeeSortValue(a),
      );
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

  fetchProfilePhoto(employee: any): void {
    const mediaNo = String(employee.employeeMedia.mediaNo);
    const cached = this.photoUrlCache.get(mediaNo);
    if (cached) {
      employee.imageUrl = cached;
      return;
    }
    // Shows the placeholder until the photo arrives; a refresh mid-download picks it up from the cache.
    employee.imageUrl = this.employeeProfilePhotoUrl;
    if (this.photoRequests.has(mediaNo)) return;
    this.photoRequests.add(mediaNo);
    this.employeeService
      .getEmployeeImage(mediaNo)
      .pipe(finalize(() => this.photoRequests.delete(mediaNo)))
      .subscribe({
        next: (response) => {
          const blob = new Blob([response], { type: 'image/png' });
          const objectUrl = URL.createObjectURL(blob);
          this.photoObjectUrls.push(objectUrl);
          const safeUrl = this.sanitizer.bypassSecurityTrustUrl(objectUrl);
          this.photoUrlCache.set(mediaNo, safeUrl);
          // Apply to whichever employee objects hold this photo now (the list may have been refetched).
          this.employees
            .filter((emp: any) => String(emp?.employeeMedia?.mediaNo) === mediaNo)
            .forEach((emp: any) => (emp.imageUrl = safeUrl));
          employee.imageUrl = safeUrl;
        },
        error: (err) => {
          console.error('Failed to load image for employee:', err);
        },
      });
  }

  closeAddForm() {
    this.openAddForm = false;
    this.importedData = null;
    this.fetchEmployees();

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

  viewThisEmployee(employee: any) {
    if (employee) {
      console.log(employee);
      this.viewEmployee = false;
      localStorage.setItem('employeeInView', JSON.stringify(employee));

      this.employeeService.getNOKByEmployeeId(employee.id).subscribe({
        next: (res: any) => {
          employee.nextOfKin = res;
          localStorage.setItem('employeeInView', JSON.stringify(employee));
          this.employeeInView = employee;
        },
        error: () => {
          this.employeeInView = employee;
          window.setTimeout(() => {
            this.viewEmployee = true;
          }, 0);
        },
        complete: () => {
          window.setTimeout(() => {
            this.viewEmployee = true;
          }, 0);
        },
      });
    }
  }

  openEmployeeProfile(employee: any, event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    this.viewThisEmployee(employee);
  }

  openStaffId(employee: any, event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    this.staffIdEmployee = employee;
    this.generateStaffQrCode(employee);
    this.generateStaffBarcode(employee);
  }

  closeStaffId() {
    this.staffIdEmployee = null;
  }

  async printStaffId() {
    const target = document.getElementById('employee-management-staff-id');
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
    pdf.save(`staff-id-${this.staffIdEmployee?.id ?? 'employee'}.pdf`);
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
    })
      .then((dataUrl: string) => {
        this.staffIdQrDataUrl = dataUrl;
      })
      .catch(() => {
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

  deleteEmployee(employee: any, event: Event) {
    event.stopPropagation();
    event.preventDefault();

    const employeeId = employee?.id;
    if (employeeId === undefined || employeeId === null || employeeId === '') {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Employee ID is missing.',
        key: 'tl',
        life: 3000,
      });
      return;
    }

    const displayName =
      `${employee?.lastName ?? ''} ${employee?.firstName ?? ''}`.trim() ||
      'this employee';
    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${displayName}?`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        const idKey = +employeeId;
        this.deletingEmployeeIds[idKey] = true;
        this.employeeService.deleteEmployee(employeeId).pipe(
          finalize(() => {
            delete this.deletingEmployeeIds[idKey];
          })
        ).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `${displayName} removed successfully.`, key: 'tl', life: 3000 });
            if (this.viewEmployee && this.employeeInView?.id === employeeId) {
              this.closeViewEmployee();
            }
            this.employeeService.refreshEmployees().subscribe();
            this.employees = this.employees.filter((e: any) => e.id !== employeeId);
            this.applyFilters();
          },
          error: (err) => {
            const msg = err?.error?.message || err?.error?.error || err?.message || 'Failed to delete employee. Please try again.';
            this.messageService.add({ severity: 'error', summary: 'Error', detail: msg, key: 'tl', life: 5000 });
          }
        });
      }
    });
  }


  activateEmployee(employee: any, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    const name = `${employee?.firstName ?? ''} ${employee?.lastName ?? ''}`.trim() || 'this employee';
    this.confirmationService.confirm({
      message: `Confirm ${name} as a full active staff member?`,
      header: 'Activate Employee',
      icon: 'pi pi-user-edit',
      acceptLabel: 'Activate',
      rejectLabel: 'Cancel',
      accept: () => {
        const idKey = +employee.id;
        this.activatingEmployeeIds[idKey] = true;
        const payload = { ...employee, employeeStatus: 'ACTIVE', department: employee.department?.id ?? employee.department, level: employee.level?.id ?? employee.level };
        this.employeeService.updateEmployee(payload, employee.id).pipe(
          finalize(() => { delete this.activatingEmployeeIds[idKey]; })
        ).subscribe({
          next: () => {
            employee.employeeStatus = 'ACTIVE';
            if (this.employeeInView?.id === employee.id) {
              this.employeeInView = { ...this.employeeInView, employeeStatus: 'ACTIVE' };
              localStorage.setItem('employeeInView', JSON.stringify(this.employeeInView));
            }
            this.messageService.add({ severity: 'success', summary: 'Activated', detail: `${name} is now an active staff member.`, key: 'tl', life: 3000 });
            this.applyFilters();
            this.dispatchWelcomeToActiveNotifications(employee, name);
          },
          error: (err) => {
            const msg = err?.error?.message || err?.message || 'Failed to activate employee.';
            this.messageService.add({ severity: 'error', summary: 'Error', detail: msg, key: 'tl', life: 4000 });
          }
        });
      }
    });
  }

  private dispatchWelcomeToActiveNotifications(employee: any, name: string) {
    let business: any = {};
    try { business = JSON.parse(sessionStorage.getItem('userPrimaryInfoRegData') || '{}'); } catch {}
    const companyName = business?.companyName || 'The Company';
    const logoUrl = business?.logoUrl || '';
    const hrEmail = business?.contactEmail || business?.email || '';
    const subject = `Welcome to ${companyName}! 🎉`;
    const htmlBody = this.buildWelcomeActiveEmailHtml({
      name: escapeHtml(name),
      companyName: escapeHtml(companyName),
      logoUrl: escapeHtml(logoUrl),
      hrEmail: escapeHtml(hrEmail),
      jobTitle: escapeHtml(employee?.jobTitle || ''),
      department: escapeHtml(employee?.department?.name || employee?.department || ''),
    });

    const sendTo: string[] = [];
    if (employee?.email) sendTo.push(employee.email);
    if (employee?.workEmail && employee.workEmail !== employee.email) sendTo.push(employee.workEmail);

    sendTo.forEach(email => {
      this.employeeService.sendNotificationEmail(email, subject, htmlBody).subscribe({ error: () => {} });
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
    }).subscribe({ error: () => {} });
  }


  private buildWelcomeActiveEmailHtml(d: { name: string; companyName: string; logoUrl: string; hrEmail: string; jobTitle: string; department: string }): string {
    const logo = d.logoUrl ? `<img src="${d.logoUrl}" alt="${d.companyName}" style="height:40px;max-width:160px;object-fit:contain;margin-bottom:12px;" />` : '';
    const hrLine = d.hrEmail
      ? `Reach us at <a href="mailto:${d.hrEmail}" style="color:#1b3358;text-decoration:none;">${d.hrEmail}</a>`
      : 'Reach out to the HR Department';
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:36px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

      <!-- Header banner -->
      <tr>
        <td style="background:linear-gradient(135deg,#1b3358 0%,#2d5a8e 100%);padding:44px 40px 36px;text-align:center;">
          ${logo}
          <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:50%;width:72px;height:72px;line-height:72px;font-size:36px;margin-bottom:16px;">🎉</div>
          <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Welcome to the Team!</h1>
          <p style="margin:0;font-size:14px;color:#a8c5e8;">${d.companyName}</p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:40px 40px 32px;">
          <p style="margin:0 0 20px;font-size:16px;color:#1a2b3c;font-weight:600;">Dear ${d.name},</p>
          <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.8;">
            We are absolutely thrilled to welcome you as a full member of the <strong>${d.companyName}</strong> family. Your journey with us officially begins today, and we couldn't be more excited to have you on board.
          </p>
          ${d.jobTitle ? `<p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.8;">You are joining us as <strong>${d.jobTitle}</strong>${d.department ? ` in the <strong>${d.department}</strong> department` : ''}, and we look forward to the amazing contributions you will bring.</p>` : ''}

          <!-- Welcome checklist -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:0 0 28px;">
            <tr><td style="padding:24px 26px;">
              <p style="margin:0 0 16px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Your First Steps</p>
              <table cellpadding="0" cellspacing="0" style="width:100%;">
                <tr><td style="padding:6px 0;font-size:13px;color:#334155;"><span style="color:#10b981;font-weight:700;margin-right:8px;">✓</span> Access the staff portal with your existing credentials</td></tr>
                <tr><td style="padding:6px 0;font-size:13px;color:#334155;"><span style="color:#10b981;font-weight:700;margin-right:8px;">✓</span> Review and complete your profile information</td></tr>
                <tr><td style="padding:6px 0;font-size:13px;color:#334155;"><span style="color:#10b981;font-weight:700;margin-right:8px;">✓</span> Familiarise yourself with your team and workspace</td></tr>
                <tr><td style="padding:6px 0;font-size:13px;color:#334155;"><span style="color:#10b981;font-weight:700;margin-right:8px;">✓</span> Attend the scheduled onboarding sessions with HR</td></tr>
              </table>
            </td></tr>
          </table>

          <p style="margin:0 0 8px;font-size:14px;color:#475569;line-height:1.8;">
            Remember, every member of this organisation has a role to play in our collective success. We believe you are the right person for yours.
          </p>
          <p style="margin:0;font-size:14px;color:#475569;line-height:1.8;">
            Once again, <strong>welcome aboard!</strong> We look forward to achieving great things together.
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;">
          <p style="margin:0 0 8px;font-size:13px;color:#475569;line-height:1.6;">${hrLine}</p>
          <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;"><strong>Human Resources Department</strong><br/>${d.companyName}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 40px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#cbd5e1;">This message was sent to inform you of your change in employment status. Please do not reply to this email.</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body></html>`;
  }

  resendOnboarding(employee: any, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    const name = `${employee?.firstName ?? ''} ${employee?.lastName ?? ''}`.trim() || 'this employee';
    this.confirmationService.confirm({
      message: `Resend onboarding credentials to <strong>${name}</strong>? A new password will be generated and sent to their registered email.`,
      header: 'Resend Onboarding Credentials',
      icon: 'pi pi-envelope',
      acceptLabel: 'Yes, Resend',
      rejectLabel: 'Cancel',
      accept: () => this.executeResendOnboarding(employee),
    });
  }

  private executeResendOnboarding(employee: any) {
    const resolvedUserId = employee?.userId ?? employee?.user?.id ?? employee?.user?.userId;
    const email = employee?.workEmail || employee?.email || '';
    const username = email.split('@')[0] || email;
    const name = `${employee?.firstName ?? ''} ${employee?.lastName ?? ''}`.trim();
    const idKey = +employee.id;
    const newPassword = generateTemporaryPassword();

    if (!resolvedUserId) {
      if (!email) {
        this.messageService.add({ severity: 'warn', summary: 'Cannot Resend', detail: 'No email address found on this employee record.', key: 'tl', life: 5000 });
        return;
      }
      // Check if username exists first before attempting to create
      this.resendingOnboardingIds[idKey] = true;
      this.authenticationService.getRegDataByUsername(username).subscribe({
        next: (userData: any) => {
          const existingUserId = userData?.id ?? userData?.userId;
          if (existingUserId) this.linkUserIdToEmployee(employee, existingUserId);
          this.authenticationService.resetPasswordByAdmin(email, newPassword).subscribe({
            next: () => this.dispatchOnboardingEmail(employee, idKey, name, username, newPassword, email),
            error: (e) => {
              delete this.resendingOnboardingIds[idKey];
              this.messageService.add({ severity: 'error', summary: 'Error', detail: e?.error?.message || 'Failed to reset password.', key: 'tl', life: 4000 });
            }
          });
        },
        error: () => {
          // Username not found — create the account
          const signupPayload = this.buildOnboardingSignupPayload(username, newPassword, email, employee.firstName, employee.lastName);
          this.authenticationService.userRegistrationByAdmin(signupPayload).subscribe({
            next: (newUserData) => {
              this.linkUserIdToEmployee(employee, newUserData?.id);
              this.dispatchOnboardingEmail(employee, idKey, name, username, newPassword, email);
            },
            error: (err) => {
              delete this.resendingOnboardingIds[idKey];
              this.messageService.add({ severity: 'error', summary: 'Account Creation Failed', detail: err?.error?.message || 'Failed to create user account.', key: 'tl', life: 6000 });
            }
          });
        }
      });
      return;
    }

    // User account exists — reset password and resend
    this.resendingOnboardingIds[idKey] = true;
    this.authenticationService.resetPasswordByAdmin(email, newPassword).subscribe({
      next: () => this.dispatchOnboardingEmail(employee, idKey, name, username, newPassword, email),
      error: (err) => {
        delete this.resendingOnboardingIds[idKey];
        const msg = err?.error?.message || err?.message || 'Failed to reset password.';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: msg, key: 'tl', life: 4000 });
      }
    });
  }

  private linkUserIdToEmployee(employee: any, userId: number) {
    employee.userId = userId;
    if (this.employeeInView?.id === employee.id) {
      this.employeeInView = { ...this.employeeInView, userId };
    }
    const payload = {
      ...employee,
      userId,
      department: employee.department?.id ?? employee.department,
      level: employee.level?.id ?? employee.level,
    };
    this.employeeService.updateEmployee(payload, employee.id).subscribe();
  }

  private dispatchOnboardingEmail(employee: any, idKey: number, name: string, username: string, password: string, resolvedEmail?: string) {
    let business: any = {};
    try { business = JSON.parse(sessionStorage.getItem('userPrimaryInfoRegData') || '{}'); } catch {}
    const companyName = business?.companyName || 'The Company';
    const hrEmail = business?.contactEmail || business?.email || '';
    const toEmail = resolvedEmail || employee?.workEmail || employee?.email || '';
    const expiresAt = onboardingLinkExpiry();
    const url = buildOnboardingLink(employee.id, expiresAt);

    const subject = `${companyName} — Your Onboarding Credentials`;
    const htmlBody = buildOnboardingEmailHtml({ name, username, password, url, companyName, hrEmail, expiresAt });
    this.employeeService.sendNotificationEmail(toEmail, subject, htmlBody).subscribe({
      next: () => {
        delete this.resendingOnboardingIds[idKey];
        this.resendCredentials = null;
        this.messageService.add({ severity: 'success', summary: 'Sent', detail: 'Onboarding credentials sent successfully.', key: 'tl', life: 3000 });
      },
      error: () => {
        delete this.resendingOnboardingIds[idKey];
        this.resendCredentials = { name, username, password };
        this.showResendPassword = false;
        this.messageService.add({ severity: 'warn', summary: 'Email Failed', detail: 'Credentials set but email failed — shown on screen.', key: 'tl', life: 6000 });
      }
    });
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

  dismissResendCredentials() {
    this.resendCredentials = null;
    this.showResendPassword = false;
  }
  copyToClipboard(value: string) { navigator.clipboard.writeText(value).catch(() => {}); }

  closeViewEmployee() {
    this.viewEmployee = false;
    this.employeeInView = {};
    localStorage.removeItem('employeeInView');
  }

  getAllowanceKeys(allowances: object): string[] {
    return Object.keys(allowances);
  }

  toTitleCaseWithSpace(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());
  }

  applyFilters() {
    this.filteredEmployees = this.employees.filter((employee: any) => {
      const matchesStatus = !this.selectedStatus || this.selectedStatus === 'ALL' ||
        (employee.employeeStatus ?? '').toUpperCase() === this.selectedStatus;

      const matchesLevelType = !this.selectedEmployeeType ||
                               this.selectedEmployeeType.length === 0 ||
                               this.selectedEmployeeType.includes(employee?.level?.name);

      const matchesPosition = !this.selectedPosition ||
                              this.selectedPosition.length === 0 ||
                              this.selectedPosition.includes(employee?.jobTitle);

      const matchesSearchTerm = !this.searchTerm ||
                                employee?.firstName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                                employee?.lastName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                                employee?.jobTitle?.toLowerCase().includes(this.searchTerm.toLowerCase());

      return matchesStatus && matchesLevelType && matchesPosition && matchesSearchTerm;
    });
    this.resetPagination();
  }

  filterBySelectedEmployeeType() {
    this.filteredEmployees = this.employees.filter(
      (employee: { level: { name: string } }) => {
        return (
          this.selectedEmployeeType.length === 0 ||
          this.selectedEmployeeType.includes(employee?.level?.name)
        );
      },
    );
    this.resetPagination();
  }

  filterBySelectedPosition() {
    this.filteredEmployees = this.employees.filter(
      (employee: {
        level: any;
        jobTitle: string;
        firstName: string;
        lastName: string;
      }) => {
        return (
          this.selectedPosition.length === 0 ||
          this.selectedPosition.includes(employee.jobTitle)
        );
      },
    );
    this.resetPagination();
  }

  get totalPages(): number {
    return Math.max(
      1,
      Math.ceil(this.filteredEmployees.length / this.pageSize),
    );
  }

  get startItem(): number {
    if (this.filteredEmployees.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endItem(): number {
    return Math.min(
      this.currentPage * this.pageSize,
      this.filteredEmployees.length,
    );
  }

  get pagedEmployees(): any[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredEmployees.slice(startIndex, startIndex + this.pageSize);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get displayPages(): Array<number | '...'> {
    const total = this.totalPages;
    const current = this.currentPage;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: Array<number | '...'> = [1];
    let start = Math.max(2, current - 1);
    let end = Math.min(total - 1, current + 1);

    if (current <= 4) {
      start = 2;
      end = 4;
    } else if (current >= total - 3) {
      start = total - 3;
      end = total - 1;
    }

    if (start > 2) {
      pages.push('...');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < total - 1) {
      pages.push('...');
    }

    pages.push(total);
    return pages;
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  onPageClick(page: number | '...') {
    if (page === '...') return;
    this.changePage(page);
  }

  nextPage() {
    this.changePage(this.currentPage + 1);
  }

  previousPage() {
    this.changePage(this.currentPage - 1);
  }

  onPageSizeChange() {
    this.resetPagination();
  }

  private resetPagination() {
    this.currentPage = 1;
  }

  // getEmployeesProfilePhotoUrl(filename: string){
  //   this.employeeService.getEmployeeImage(filename).subscribe({
  //     next: (response) => {
  //       const blob = new Blob([response], { type: 'image/png' });
  //       this.employeeProfilePhotoUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
  //     },
  //     error: (err) => {
  //       console.error('Failed to load employee image', err);
  //          this.employeeProfilePhotoUrl = 'https://media.istockphoto.com/id/1223671392/vector/default-profile-picture-avatar-photo-placeholder-vector-illustration.jpg?s=612x612&w=0&k=20&c=s0aTdmT5aU6b8ot7VKm11DeID6NctRCpB755rA1BIP0=';
  //     console.log(this.employeeProfilePhotoUrl)
  //     },
  //   });
  // }
}
