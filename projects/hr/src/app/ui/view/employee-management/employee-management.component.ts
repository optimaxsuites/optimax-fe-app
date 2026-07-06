import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CompanyProfileService } from 'projects/settings/src/app/ui/sharedComponents/service/company-profile/company-profile.service';
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
import { EmploymentLetterComponent } from './employment-letter/employment-letter.component';
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


@Component({
  selector: 'app-employee-management',
  templateUrl: './employee-management.component.html',
  styleUrl: './employee-management.component.scss',
  providers: [MessageService, ConfirmationService]

})
export class EmployeeManagementComponent {
  private readonly minimumLoaderDurationMs = 900;
  
  tabsConfig: TabConfig[] = [
    { name: 'Basic Information', component: EmployeeProfileDashboardComponent },
    { name: 'Next of Kin Information', component:  EmployeeNokComponent, },
    { name: 'Guarantor(s) Information', component:  EmployeeGuarantorComponent, },
    { name: 'Offboarding', component:  EmployeeOffboardingComponent, },
    { name: 'Employment Letter', component: EmploymentLetterComponent },
  ];
  uniqueLevels: any;
  uniquePositions: any;
  employeeProfilePhotoUrl: string = 'https://media.istockphoto.com/id/1223671392/vector/default-profile-picture-avatar-photo-placeholder-vector-illustration.jpg?s=612x612&w=0&k=20&c=s0aTdmT5aU6b8ot7VKm11DeID6NctRCpB755rA1BIP0='


viewEmployee: boolean = false;
employeeInView: any = {}
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
selectedEmployeeType: any;
calendarOptions: CalendarOptions = {}
currentPage = 1;
pageSize = 12;
pageSizeOptions = [8, 12, 16, 24];
deletingEmployeeIds: Record<string, boolean> = {};
activatingEmployeeIds: Record<number, boolean> = {};
resendingOnboardingIds: Record<number, boolean> = {};
resendCredentials: { name: string; username: string; password: string } | null = null;
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


  companyProfile$ = this.companyProfileService.companyProfile$;

  constructor(
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private http: HttpClient,
    private employeeService: EmployeeService,
    private sanitizer: DomSanitizer,
    private router: Router,
    private navLinks: NavigationLinksService,
    private companyProfileService: CompanyProfileService,
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
   ngOnInit() {
   this.fetchEmployees()

      
  
  }

  async getProfileImage(fileName: string){
  //  this.getEmployeesProfilePhotoUrl(fileName)
  return this.employeeProfilePhotoUrl
  }
  fetchEmployees(){
    const startedAt = this.startLoading();
    this.employeeService.getAllEmployee().subscribe({
      next: (employees) => {
        this.employees = this.sortEmployeesLatest(employees);
        this.uniqueLevels = [
          ...new Set(
            this.employees
              .map((employee: { level: any }) => employee?.level?.name)
              .filter((level: string) => level != null) 
          ),
        ];
        
        this.uniquePositions = [
          ...new Set(
            this.employees
              .map((employee: { jobTitle: string }) => employee?.jobTitle)
              .filter((jobTitle: string) => jobTitle != undefined) 
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
      error: err => {
        console.log(err);
        this.messageService.add({
          severity: 'error',
          summary: 'Load failed',
          detail: 'Unable to fetch employee records.',
          key: 'tl',
          life: 3000
        });
      },
      complete: () => {
        this.finishLoading(startedAt);
      }
    })


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

  fetchProfilePhoto(employee: any): void {
    this.employeeService.getEmployeeImage(employee.employeeMedia.mediaNo).subscribe({
      next: (response) => {
        const blob = new Blob([response], { type: 'image/png' });
        employee.imageUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
      },
      error: (err) => {
        console.error('Failed to load image for employee:', err);
      }
    });
  }



  closeAddForm() {
    this.openAddForm = false;
    this.importedData = null;
    this.fetchEmployees();

  }
  generateLeaveEvents(leaveDetails: { leavesSpent: any[]; }) {
    return leaveDetails.leavesSpent.map(leave => {
      return {
        title: `${leave.type} Leave`,
        start: leave.from,
        end: leave.to,
        backgroundColor:  '#2EB270'   
      };
    });
  }
 

  viewThisEmployee(employee: any){

    if (employee) {
      console.log(employee)
      this.viewEmployee = false;
      localStorage.setItem('employeeInView', JSON.stringify(employee))

      this.employeeService.getNOKByEmployeeId(employee.id).subscribe({
        next: (res: any) => {
          employee.nextOfKin = res;
          localStorage.setItem('employeeInView', JSON.stringify(employee))
          this.employeeInView = employee
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
        }
      })
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

  deleteEmployee(employee: any, event: Event) {
    event.stopPropagation();
    event.preventDefault();

    const employeeId = employee?.id;
    if (employeeId === undefined || employeeId === null || employeeId === '') {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Employee ID is missing.', key: 'tl', life: 3000 });
      return;
    }

    const displayName = `${employee?.lastName ?? ''} ${employee?.firstName ?? ''}`.trim() || 'this employee';
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
        const formData = new FormData();
        formData.append('employee', JSON.stringify(payload));
        this.employeeService.updateEmployee(formData, employee.id).pipe(
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
          },
          error: (err) => {
            const msg = err?.error?.message || err?.message || 'Failed to activate employee.';
            this.messageService.add({ severity: 'error', summary: 'Error', detail: msg, key: 'tl', life: 4000 });
          }
        });
      }
    });
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
    const username = email;
    const name = `${employee?.firstName ?? ''} ${employee?.lastName ?? ''}`.trim();
    const idKey = +employee.id;
    const newPassword = this.generateRandomPassword();

    if (!resolvedUserId) {
      if (!email) {
        this.messageService.add({ severity: 'warn', summary: 'Cannot Resend', detail: 'No email address found on this employee record.', key: 'tl', life: 5000 });
        return;
      }
      // No userId cached — try creating account; if username taken, look up existing user
      this.resendingOnboardingIds[idKey] = true;
      const signupPayload = this.buildOnboardingSignupPayload(username, newPassword, email, employee.firstName, employee.lastName);
      this.authenticationService.userRegistrationByAdmin(signupPayload).subscribe({
        next: (userData) => {
          this.linkUserIdToEmployee(employee, userData?.id);
          this.dispatchOnboardingEmail(employee, idKey, name, username, newPassword);
        },
        error: (err) => {
          const code = err?.error?.code;
          if (code === '1001' || err?.status === 400) {
            // Account already exists — look it up by username then reset password
            this.authenticationService.getRegDataByUsername(username).subscribe({
              next: (userData: any) => {
                const existingUserId = userData?.id ?? userData?.userId;
                if (!existingUserId) {
                  delete this.resendingOnboardingIds[idKey];
                  this.messageService.add({ severity: 'error', summary: 'Lookup Failed', detail: 'Account exists but could not retrieve user ID. Contact support.', key: 'tl', life: 6000 });
                  return;
                }
                this.linkUserIdToEmployee(employee, existingUserId);
                this.authenticationService.resetPasswordByAdmin(username, newPassword).subscribe({
                  next: () => this.dispatchOnboardingEmail(employee, idKey, name, username, newPassword),
                  error: (e) => {
                    delete this.resendingOnboardingIds[idKey];
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: e?.error?.message || 'Failed to reset password.', key: 'tl', life: 4000 });
                  }
                });
              },
              error: () => {
                delete this.resendingOnboardingIds[idKey];
                this.messageService.add({ severity: 'error', summary: 'Account Creation Failed', detail: err?.error?.message || 'Failed to create user account.', key: 'tl', life: 6000 });
              }
            });
          } else {
            delete this.resendingOnboardingIds[idKey];
            this.messageService.add({ severity: 'error', summary: 'Account Creation Failed', detail: err?.error?.message || 'Failed to create user account.', key: 'tl', life: 6000 });
          }
        }
      });
      return;
    }

    // User account exists — just reset password and resend
    this.resendingOnboardingIds[idKey] = true;
    this.authenticationService.resetPasswordByAdmin(username, newPassword).subscribe({
      next: () => this.dispatchOnboardingEmail(employee, idKey, name, username, newPassword),
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
    const payload = new FormData();
    payload.append('employee', JSON.stringify({
      ...employee,
      userId,
      department: employee.department?.id ?? employee.department,
      level: employee.level?.id ?? employee.level,
    }));
    this.employeeService.updateEmployee(payload, employee.id).subscribe();
  }

  private dispatchOnboardingEmail(employee: any, idKey: number, name: string, username: string, password: string) {
    const profile = this.companyProfileService.get();
    const companyName = profile?.companyName || 'The Company';
    const hrEmail = (profile as any)?.email || (profile as any)?.companyEmail || '';
    const url = `${window.location.origin}/onboarding/${employee.id}/wer23456fghi367ghj?onboarding=1`;

    const subject = `${companyName} — Your Onboarding Credentials`;
    const htmlBody = this.buildOnboardingEmailHtml({ name, username, password, url, companyName, hrEmail });
    this.employeeService.sendNotificationEmail(employee.email, subject, htmlBody).subscribe({
      next: () => {
        delete this.resendingOnboardingIds[idKey];
        this.resendCredentials = null;
        this.messageService.add({ severity: 'success', summary: 'Sent', detail: 'Onboarding credentials sent successfully.', key: 'tl', life: 3000 });
      },
      error: () => {
        delete this.resendingOnboardingIds[idKey];
        this.resendCredentials = { name, username, password };
        this.messageService.add({ severity: 'warn', summary: 'Email Failed', detail: 'Credentials set but email failed — shown on screen.', key: 'tl', life: 6000 });
      }
    });
  }

  private buildOnboardingEmailHtml(d: { name: string; username: string; password: string; url: string; companyName: string; hrEmail: string }): string {
    const hrLine = d.hrEmail
      ? `Please contact the <strong>HR Department</strong> at <a href="mailto:${d.hrEmail}" style="color:#1e3a5f;text-decoration:none;">${d.hrEmail}</a> for any queries regarding your onboarding.`
      : `Please contact the <strong>HR Department</strong> for any queries regarding your onboarding.`;
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:36px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
      <tr>
        <td style="background:#1b3358;padding:36px 40px;text-align:center;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;color:#7aa7d4;text-transform:uppercase;">Human Resources</p>
          <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">${d.companyName}</h1>
          <p style="margin:8px 0 0;font-size:13px;color:#a8c5e8;">Staff Onboarding</p>
        </td>
      </tr>
      <tr>
        <td style="padding:40px 40px 28px;">
          <p style="margin:0 0 20px;font-size:15px;color:#1a2b3c;font-weight:600;">Dear ${d.name},</p>
          <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.7;">
            We are delighted to welcome you to <strong>${d.companyName}</strong>. Please complete your onboarding by submitting the required documentation through the portal below.
          </p>
          <p style="margin:0 0 8px;font-size:13px;color:#64748b;">You will be required to provide:</p>
          <ul style="margin:0 0 24px;padding-left:20px;font-size:13px;color:#64748b;line-height:2;">
            <li>Passport photograph / Valid ID</li>
            <li>Guarantor information</li>
            <li>Next-of-kin details</li>
            <li>Bank account number</li>
            <li>Any other requested personal information</li>
          </ul>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
            <tr>
              <td style="background:#1b3358;border-radius:6px;padding:13px 30px;">
                <a href="${d.url}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.3px;">Begin Onboarding Process →</a>
              </td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
            <tr>
              <td style="padding:22px 26px;">
                <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Your Portal Credentials</p>
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:5px 16px 5px 0;font-size:13px;color:#94a3b8;white-space:nowrap;">Username</td>
                    <td style="padding:5px 0;font-size:13px;color:#1e293b;font-weight:600;">${d.username}</td>
                  </tr>
                  <tr>
                    <td style="padding:5px 16px 5px 0;font-size:13px;color:#94a3b8;white-space:nowrap;">Password</td>
                    <td style="padding:5px 0;font-size:13px;color:#1e293b;font-family:monospace;font-weight:700;letter-spacing:1.5px;background:#f1f5f9;border-radius:4px;padding-left:8px;padding-right:8px;">${d.password}</td>
                  </tr>
                </table>
                <p style="margin:14px 0 0;font-size:11px;color:#94a3b8;">You will be prompted to change your password after your first login.</p>
              </td>
            </tr>
          </table>
          <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">If the button above does not work, copy and paste the link below into your browser:</p>
          <p style="margin:0;font-size:12px;color:#3b82f6;word-break:break-all;">${d.url}</p>
        </td>
      </tr>
      <tr>
        <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;">
          <p style="margin:0 0 10px;font-size:13px;color:#475569;line-height:1.6;">${hrLine}</p>
          <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">
            We look forward to a productive and rewarding journey together.<br/>
            <strong>Human Resources Department</strong><br/>
            ${d.companyName}
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 40px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#cbd5e1;">This is a system-generated message. Please do not reply to this email.</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>`;
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

  dismissResendCredentials() { this.resendCredentials = null; }
  copyToClipboard(value: string) { navigator.clipboard.writeText(value).catch(() => {}); }

  private generateRandomPassword(length = 12): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%*?';
    const pick = () => chars[Math.floor(Math.random() * chars.length)];
    return Array.from({ length }, pick).join('');
  }

    closeViewEmployee() {
  this.viewEmployee = false
  this.employeeInView = {}
  localStorage.removeItem('employeeInView');
  }



  getAllowanceKeys(allowances: object): string[] {
    return Object.keys(allowances);
  }



  toTitleCaseWithSpace(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
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
      (employee: { level: { name: string }; }) => 
        {return this.selectedEmployeeType.length === 0 || this.selectedEmployeeType.includes(employee?.level?.name)}
    );
    this.resetPagination();
    }


  filterBySelectedPosition() {
     this.filteredEmployees = this.employees.filter((employee: { level: any; jobTitle: string; firstName: string; lastName: string; }) => {
      return this.selectedPosition.length === 0 || this.selectedPosition.includes(employee.jobTitle);
    })
    this.resetPagination();
      }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredEmployees.length / this.pageSize));
  }

  get startItem(): number {
    if (this.filteredEmployees.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredEmployees.length);
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
