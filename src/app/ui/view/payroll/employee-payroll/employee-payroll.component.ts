import { Component, inject } from '@angular/core';
import { TableAction, TableColumn } from '../../../shared-component/view/table/table.component';
import { PayrollLoanDeductionService } from '../../../service/payroll-loan-deduction.service';
import { catchError, finalize, from, map, mergeMap, of, toArray } from 'rxjs';
import { buildPayslipEmailHtml, formatNaira, payslipEmailAddress, payslipFigures, periodLabel, toPayslip } from '../payslip.util';
import { buildSchedule, ScheduleKind, scheduleToCsv } from '../statutory-schedules.util';
import { EmployeeObligations, OBLIGATION_KIND_LABEL, PayrollObligation } from '../../../service/payroll-obligations';
import { EmployeeService } from '../../../service/employee.service';
import { DomSanitizer } from '@angular/platform-browser';
import { PayrollService } from '../../../service/payroll.service';
import { Employee, Payroll } from '../../../domain/payroll.dto';
import { MailNotificationService } from '../../../service/mailNotification.service';
import { MessageService } from 'primeng/api';
import { RolesService } from '../../../service/roles.service';
@Component({
  selector: 'app-employee-payroll',
  templateUrl: './employee-payroll.component.html',
  styleUrl: './employee-payroll.component.scss'
})
export class EmployeePayrollComponent {
private readonly payrollLoanDeductionService = inject(PayrollLoanDeductionService);
private readonly rolesService = inject(RolesService);
private readonly toastKey = 'tf';
isLoadingPayroll = false;
isApprovingPayroll = false;
private readonly approverNameByUserId = new Map<string, string>();
private readonly approverRoleNameByRoleId = new Map<string, string>();

payType: string[] = [];
selectedPayType: string[] = [];
department: string[] = [];
selectedDepartment: string[] = [];
selectedLevel: string[] = [];
searchTerm = '';
level: string[] = [];
viewEmployee = false;
openSummary = false;
showDropdown = false;
private _selectedEmployees: any[] = [];
/** Rows ticked in the table. Menu actions apply to these, or to everyone when none are ticked. */
get selectedEmployees(): any[] { return this._selectedEmployees; }
set selectedEmployees(rows: any[]) {
  this._selectedEmployees = rows ?? [];
  this.buildActionItems();
}
currentEmployeeInView: any = {};
payrollInView: any = {};
canSeeApproveButton = false;
openApproveModal = false
openRejectModal = false
approvalComment = '';
currentStageRequiresComment = false;

  currentPage = 1;

 payrollColumns: TableColumn[] = [
  {
    header: 'Employee',
    sortable: true,
    className: 'table-item',
    formatter: (row) =>
      `${row.employee.firstName ?? ''} ${row.employee.lastName ?? ''}`.trim()
  },
  {
    header: 'Level',
    field: 'employee.level.name',
    sortable: true,
    className: 'table-item'
  },
  {
    header: 'Department',
    field: 'employee.department.name',
    sortable: true,
    className: 'table-item'
  },
  {
    header: 'Days worked',
    field: 'daysWorked',
    className: 'table-item'
  },

  // 💰 MONEY FIELDS
  {
    header: 'Base Pay',
    field: 'basePay',
    className: 'table-item',
    formatter: (row) => this.formatCurrency(row.basePay)
  },
  {
    header: 'Gross Pay',
    field: 'grossPay',
    className: 'table-item',
    formatter: (row) => this.formatCurrency(row.grossPay)
  },
  {
    // What the employee owes this month for loans and cooperatives; flagged when the run differs.
    header: 'Loans & Coop',
    className: 'table-item',
    formatter: (row) => this.loansAndCoopLabel(row)
  },
  {
    header: 'Total Deductions',
    field: 'totalDeductions',
    className: 'table-item',
    formatter: (row) => this.formatCurrency(row.totalDeductions)
  },
  {
    header: 'Net Payable',
    field: 'netPayable',
    className: 'table-item',
    formatter: (row) => this.formatCurrency(row.netPayable)
  }
];


 


payrollActions: TableAction[] = [
  { id: 'view', label: 'View', icon: 'pi pi-eye' },
  //  { id: 'edit', label: 'Edit', icon: 'pi pi-pencil' }
  ];







  payrollRecords: Payroll[] = [ ] 

showCalendar = false;
selectedMonth: any
selectedYear: any 
currentMonth: number = new Date().getMonth() + 1;
currentYear: number = new Date().getFullYear();
monthNames = [
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
];
currentMonthName = this.monthNames[this.currentMonth - 1];
months:any[] = [];
years: any[] = [];
filteredEmployeePayroll: any[] = []
currentPayroll: any[] = []
payrollSumary: any = {}
employeeProfilePhotoUrl: string = 'https://media.istockphoto.com/id/1223671392/vector/default-profile-picture-avatar-photo-placeholder-vector-illustration.jpg?s=612x612&w=0&k=20&c=s0aTdmT5aU6b8ot7VKm11DeID6NctRCpB755rA1BIP0='
triggeredGeneration = false;
selectedFile: File | null = null;

currentUser: Employee = {} as Employee;
actionItems: any = []
  currentUserId: any;
  canSeeApprovalButton: any;
  isDocumentRequired: any;
  canEditRecord: any;
// payrollRecords: any[] = []
constructor(   private employeeService: EmployeeService,  private sanitizer: DomSanitizer, private payrollService: PayrollService, private mailNotificationService: MailNotificationService, private messageService: MessageService) {
    this.generateYears();
    this.selectedMonth = this.months[new Date().getMonth()];
    
    this.buildActionItems();
}

/**
 * The Actions menu. Every action except Generate works on the employees ticked in the table, or on
 * everyone when none are ticked, and its label says which. Rebuilt whenever the selection changes.
 */
private buildActionItems(): void {
  const n = this.selectedEmployees.length;
  const scope = n ? ` (${n} selected)` : '';
  this.actionItems = [
    {
      // Always the whole month: a month's payroll can only be generated once.
      label: `Generate ${this.currentMonthName} ${this.currentYear} Payroll`,
      icon: 'pi pi-cog',
      command: () => this.generatePayrollSummary()
    },
    { label: `View Summary${scope}`, icon: 'pi pi-chart-bar', command: () => this.viewSummary() },
    { label: `Download CSV${scope}`, icon: 'pi pi-download', command: () => this.generateCSV() },
    { label: `Download Bank CSV${scope}`, icon: 'pi pi-download', command: () => this.downloadBankCSV() },
    { label: `Email Payslips${scope}`, icon: 'pi pi-envelope', command: () => this.emailPayslips(this.payrollInView, this.selectedEmployeeIds()) },
    { label: `PAYE Schedule (CSV)${scope}`, icon: 'pi pi-file', command: () => this.downloadStatutorySchedule('paye') },
    { label: `Pension Schedule (CSV)${scope}`, icon: 'pi pi-file', command: () => this.downloadStatutorySchedule('pension') },
    { label: `NHF Schedule (CSV)${scope}`, icon: 'pi pi-file', command: () => this.downloadStatutorySchedule('nhf') },
    { label: `Loan & Coop Deductions (CSV)${scope}`, icon: 'pi pi-wallet', command: () => this.downloadObligationsCsv() },
  ];
}

/** Employee ids of the ticked rows, or null when nothing is ticked (meaning everyone). */
private selectedEmployeeIds(): Set<string> | null {
  if (!this.selectedEmployees.length) return null;
  return new Set(this.selectedEmployees.map((row: any) => String(row?.employee?.id ?? row?.employeeId ?? '')));
}

/** `rows` narrowed to the ticked employees; all of them when nothing is ticked. */
private inSelection<T>(rows: T[]): T[] {
  const ids = this.selectedEmployeeIds();
  return ids ? rows.filter((row: any) => ids.has(String(row?.employee?.id ?? row?.employeeId ?? ''))) : rows;
}

clearSelection(): void {
  this.selectedEmployees = [];
}
ngOnInit(){
  const userId = sessionStorage.getItem('userid') || localStorage.getItem('userid')
  this.currentUserId = this.extractUserId(userId);
  this.employeeService.getEmployeeByUserId(this.currentUserId).subscribe({
    next: data => {this.currentUser = data;},
    error: () => {}
  })
  this.loadApproverDirectory();
  this.loadApproverRoles();
  this.generatePayrolls();
}

formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '₦0.00';

  const formatted = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2
  }).format(Math.abs(value));

  return value < 0 ? `- ${formatted}` : formatted;
}

/** Every run, newest first. */
runs: any[] = [];

/** `onLoaded` runs with the fresh runs once they arrive (used after an approval). */
generatePayrolls(onLoaded?: (records: any[]) => void){
    this.isLoadingPayroll = true;
    const keepRunId = this.payrollInView?.id;
    this.payrollService.getPayrollGenerationResponses().subscribe({
        next: response => {
            const records: any[] = Array.isArray(response) ? response : (response?.content ?? []);
            this.payrollRecords = records;
            this.runs = [...records].sort((a, b) => (+b.year - +a.year) || (+b.month - +a.month));
            // Stay on the run being looked at (e.g. after approving it); otherwise open the newest.
            this.selectRun(this.runs.find(r => keepRunId != null && String(r.id) === String(keepRunId)) ?? this.runs[0]);
            onLoaded?.(records);
        },
        error: err => {
          console.log(err);
          this.messageService.add({
            severity: 'error',
            summary: 'Load failed',
            detail: 'Unable to load payroll records right now.',
            key: this.toastKey
          });
          this.isLoadingPayroll = false;
        },
        complete: () => {
          this.isLoadingPayroll = false;
        }
    })
}

/**
 * Shows one run: its rows exactly as the server calculated them, its approval state, and its month for
 * everything else on the screen (payslip emails, statutory schedules, loan checks, bank file).
 */
selectRun(run: any): void {
    this.payrollInView = run ?? {};
    const currentStage = this.payrollInView?.payrollApprovalInstance?.currentStage;
    const assignments = this.getStageAssignments(currentStage);
    this.canSeeApprovalButton = assignments.some((a: any) => this.canCurrentUserApproveAssignment(a));
    this.isDocumentRequired = currentStage?.isDocumentRequired ?? false;
    this.currentStageRequiresComment = currentStage?.requiresComment ?? false;
    this.canEditRecord = currentStage?.canEditRecord ?? false;
    this.canSeeApproveButton = !!this.payrollInView?.payrollApprovalInstance?.approval;
    const hasEditAction = this.payrollActions.some(action => action.id === 'edit');
    if (this.canEditRecord && !hasEditAction) {
      this.payrollActions.push({ id: 'edit', label: 'Edit', icon: 'pi pi-pencil' });
    }

    this.selectedMonth = run ? this.monthNames[+run.month - 1] : undefined;
    this.selectedYear = run?.year;
    this.currentPayroll = this.activeOnly(this.payrollInView?.employees ?? []);
    const options = (pick: (row: any) => any) =>
      Array.from(new Set(this.currentPayroll.map(pick).filter(v => v !== undefined && v !== null && v !== ''))).sort();
    this.payType = options(row => this.rowJobType(row));
    this.department = options(row => this.rowDepartment(row));
    this.level = options(row => this.rowLevel(row));
    this.selectedPayType = [];
    this.selectedDepartment = [];
    this.selectedLevel = [];
    this.searchTerm = '';
    this.filteredEmployeePayroll = [...this.currentPayroll];
    this.selectedEmployees = [];
    this.loadObligations(this.payrollInView?.month, this.payrollInView?.year);
}

selectRunById(runId: any): void {
    this.selectRun(this.runs.find(r => String(r.id) === String(runId)));
}

runOptionLabel(run: any): string {
    const status = String(run?.payrollApprovalInstance?.status || run?.status || 'PENDING').toUpperCase();
    return `${periodLabel(run?.month, run?.year)} · ${status}`;
}

private rowName(row: any): string {
    return `${row?.employee?.firstName ?? ''} ${row?.employee?.lastName ?? ''}`.trim();
}
private rowDepartment(row: any): string { return row?.employee?.department?.name ?? ''; }
private rowLevel(row: any): string { return row?.employee?.level?.name ?? ''; }
private rowJobType(row: any): string { return row?.employee?.jobType?.name ?? ''; }

private loadApproverDirectory(): void {
  this.employeeService.getAllEmployee().subscribe({
    next: (employees) => {
      (employees || []).forEach((employee: any) => {
        const name = this.buildEmployeeFullName(employee);
        if (!name) {
          return;
        }

        [
          employee?.user?.id,
          employee?.userId,
          employee?.user?.userId
        ].forEach((id) => {
          if (id !== null && id !== undefined && String(id).trim() !== '') {
            this.approverNameByUserId.set(String(id), name);
          }
        });
      });
    },
    error: (err) => console.log(err)
  });
}

private loadApproverRoles(): void {
  this.rolesService.getRoles().subscribe({
    next: (roles) => {
      (roles || []).forEach((role: any) => {
        if (role?.id !== null && role?.id !== undefined) {
          const roleName = role?.name || role?.roleName || role?.code || role?.roleCode;
          if (roleName) {
            this.approverRoleNameByRoleId.set(String(role.id), roleName);
          }
        }
      });
    },
    error: (err) => console.log(err)
  });
}

private buildEmployeeFullName(employee: any): string {
  const firstName = employee?.firstName ?? '';
  const lastName = employee?.lastName ?? '';
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || employee?.workEmail || employee?.email || '';
}

 
  /** Generates the run the menu item names: the current month (1–12) and year. Empty filters mean everyone. */
  generatePayrollSummary() {
    if (this.triggeredGeneration) return;
    this.triggeredGeneration = true;
    const payload = {
        month: this.currentMonth,
        year: this.currentYear,
        employeeIds: [],
        level: [],
        department: []
    }

    this.payrollService.postGeneratePayroll(payload).pipe(
      // The run's outcome shouldn't wait on the notification email: refresh and unlock the button now.
      finalize(() => {
        this.triggeredGeneration = false;
        this.generatePayrolls();
      })
    ).subscribe({
     next: (response: Payroll) => {
        console.log(response)
        if(response && response.employees.length){
            const mailBody = {
                name: `${this.currentUser.firstName} ${this.currentUser.lastName}` || 'there',
                recieverEmail: this.currentUser.email || '',
                subject: `Payroll generation for ${this.currentMonthName}, ${this.currentYear} is ready for review`,
                body: `<div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333;">
  
                    <p>Dear ${this.currentUser.firstName || 'User'},</p>

                    <p>
                        The payroll for <strong>${this.currentMonthName}, ${this.currentYear}</strong>
                        has been successfully generated and is now ready for review.
                    </p>

                    <p>
                        Please log in to the system to verify the details, make any necessary
                        adjustments, and proceed with approval.
                    </p>

                    <p>
                        If you notice any discrepancies, kindly resolve them before final approval.
                    </p>

                    <br/>

                    <p>Regards,<br/>
                    <strong>optimaX payroll</strong></p>

                    <hr style="border:none; border-top:1px solid #eee; margin:20px 0;" />

                    <p style="font-size:12px; color:#777;">
                        This is an automated message. Please do not reply to this email.
                    </p>


                    </div>
                `
            }
            this.mailNotificationService.sendMail(mailBody).subscribe({ error: () => {} })
          
        }
        else {
            const mailBody = {
                name: `${this.currentUser.firstName} ${this.currentUser.lastName}` || 'there',
                recieverEmail: this.currentUser.email || '',
                subject: `No payroll data found for ${this.currentMonthName}, ${this.currentYear}`,
                body: `<div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333;">
  
                    <p>Dear ${this.currentUser.firstName || 'User'},</p>

                    <p>
                        Payroll generation for <strong>${this.currentMonthName}, ${this.currentYear}</strong>
                        completed successfully. However, no employee records were found for this period.
                    </p>

                    <p>
                        This may occur if there are no active employees, no approved work records,
                        or no payroll inputs available for the selected month.
                    </p>

                    <p>
                        Please review employee status, attendance, or payroll configuration if
                        payroll data was expected.
                    </p>

                    <br/>

                    <p>Regards,<br/>
                    <strong>optimaX payroll</strong></p>

                    <hr style="border:none; border-top:1px solid #eee; margin:20px 0;" />

                    <p style="font-size:12px; color:#777;">
                        This is an automated message. Please do not reply to this email.
                    </p>

                    </div>
                `
            }
            this.mailNotificationService.sendMail(mailBody).subscribe({ error: () => {} })  

        }
     },
     error: err => {
        this.messageService.add({
            severity: 'error',
            summary: 'Generation failed',
            detail: err?.error?.message || `Payroll for ${this.currentMonthName} ${this.currentYear} could not be generated. Please try again.`,
            key: this.toastKey
        });
        const mailBody = {
                name: `${this.currentUser.firstName} ${this.currentUser.lastName}` || 'there',
                recieverEmail: this.currentUser.email || '',
                subject: `Payroll generation attempt failed for ${this.currentMonthName}, ${this.currentYear}`,
                body: `<div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333;">
                
                <p>Dear ${this.currentUser.firstName || 'User'},</p>

                <p>
                    An error occurred while generating payroll for
                    <strong>${this.currentMonthName}, ${this.currentYear}</strong>.
                    The process could not be completed at this time.
                </p>

                <p>
                    Please try again later. If the issue persists, kindly contact
                    the system administrator for assistance.
                </p>

                <br/>

                <p>Regards,<br/>
                <strong>optimaX payroll</strong></p>

                <hr style="border:none; border-top:1px solid #eee; margin:20px 0;" />

                <p style="font-size:12px; color:#777;">
                    This is an automated message. Please do not reply to this email.
                </p>

                </div>

                `
            }
            this.mailNotificationService.sendMail(mailBody).subscribe({ error: () => {} })  

     }
    })
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

  confirmApprovePayroll(){
    if (this.isApprovingPayroll) {
      return;
    }
    if (this.openApproveModal) {
      this.selectedFile = null;
      this.approvalComment = '';
    }
    this.openApproveModal = !this.openApproveModal
  }

  confirmRejectPayroll() {
    if (this.isApprovingPayroll) {
      return;
    }
    if (this.openRejectModal) {
      this.approvalComment = '';
    }
    this.openRejectModal = !this.openRejectModal;
  }

  get approvalStages(): any[] {
    return this.payrollInView?.payrollApprovalInstance?.approval?.stages ?? [];
  }

  get approvalActions(): any[] {
    return this.payrollInView?.payrollApprovalInstance?.actions ?? [];
  }

  get currentApprovalStageOrder(): number | null {
    return this.payrollInView?.payrollApprovalInstance?.currentStage?.orderIndex ?? null;
  }

  get overallApprovalStatus(): 'completed' | 'current' | 'pending' {
    const stages = this.approvalStages;
    if (!stages.length) {
      return 'pending';
    }

    const statuses = stages.map((stage) => this.getStageStatus(stage));
    if (statuses.every((status) => status === 'completed')) {
      return 'completed';
    }

    if (statuses.some((status) => status === 'current')) {
      return 'current';
    }

    return 'pending';
  }

  get overallApprovalStatusLabel(): string {
    if (this.overallApprovalStatus === 'completed') {
      return 'COMPLETED';
    }

    if (this.overallApprovalStatus === 'current') {
      return 'IN PROGRESS';
    }

    return (this.payrollInView?.payrollApprovalInstance?.status || 'PENDING').toUpperCase();
  }

  getStageStatus(stage: any): 'completed' | 'current' | 'pending' {
    const stageOrder = stage?.orderIndex;
    if (stageOrder == null) {
      return 'pending';
    }

    const hasApprovedAction = this.approvalActions.some(
      (action: any) => action?.stageOrder === stageOrder && action?.actionType === 'APPROVED'
    );

    if (hasApprovedAction) {
      return 'completed';
    }

    if (this.currentApprovalStageOrder === stageOrder) {
      return 'current';
    }

    return 'pending';
  }

  getStageStatusLabel(stage: any): string {
    const status = this.getStageStatus(stage);
    if (status === 'completed') {
      return 'Completed';
    }
    if (status === 'current') {
      return 'Current';
    }
    return 'Pending';
  }

  getStageAssignments(stage: any): any[] {
    return stage?.assignment ?? stage?.assignments ?? stage?.approvers ?? [];
  }

  getStageAction(stage: any): any {
    const stageOrder = stage?.orderIndex;
    if (stageOrder == null) {
      return null;
    }

    return this.approvalActions.find((action: any) => action?.stageOrder === stageOrder) ?? null;
  }

  getStageDocuments(stage: any): any[] {
    const stageOrder = stage?.orderIndex;
    if (stageOrder == null) {
      return [];
    }
    return this.approvalActions.filter((action: any) => action?.stageOrder === stageOrder && action?.documentMediaNo);
  }

  hasStageDocuments(stage: any): boolean {
    return this.getStageDocuments(stage).length > 0;
  }

  getApprovalDocumentUrl(documentMediaNo: string): string {
    return this.payrollService.getApprovalDocumentUrl(documentMediaNo);
  }

  getUserDisplayName(user: any): string {
    if (!user) {
      return 'Unassigned';
    }

    if (typeof user === 'number' || typeof user === 'string') {
      const mappedName = this.approverNameByUserId.get(String(user));
      return mappedName ? `${mappedName} (User #${user})` : `User #${user}`;
    }

    const firstName = user?.firstName ?? '';
    const lastName = user?.lastName ?? '';
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) {
      return fullName;
    }

    if (user?.id !== null && user?.id !== undefined) {
      const directoryName = this.approverNameByUserId.get(String(user.id));
      if (directoryName) {
        return `${directoryName} (User #${user.id})`;
      }
    }

    return user?.email || user?.username || `User #${user?.id ?? ''}`.trim();
  }

  getStageApproverNames(stage: any): string {
    const names = this.getStageAssignments(stage)
      .map((assignment: any) => this.resolveAssignmentDisplayName(assignment))
      .filter((name: string) => !!name);

    return names.length ? names.join(', ') : 'No approver assigned';
  }

  private extractUserId(value: any): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (/^\d+$/.test(trimmed)) {
        return Number(trimmed);
      }
      return null;
    }

    if (value && typeof value === 'object') {
      const nestedId = Number(value.id ?? value.userId ?? value.actorUserId ?? 0);
      return Number.isFinite(nestedId) && nestedId > 0 ? nestedId : null;
    }

    return null;
  }

  private extractAssignmentUserId(assignment: any): number | null {
    if (!assignment) {
      return null;
    }

    const directCandidates = [
      assignment.userId,
      assignment.user,
      assignment.approver,
      assignment.actorUser,
      assignment.assignedUser
    ];

    for (const candidate of directCandidates) {
      const extracted = this.extractUserId(candidate);
      if (extracted) {
        return extracted;
      }
    }

    return null;
  }

  private extractRoleId(value: any): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (/^\d+$/.test(trimmed)) {
        return Number(trimmed);
      }
      return null;
    }

    if (value && typeof value === 'object') {
      const nestedId = Number(value.id ?? value.roleId ?? 0);
      return Number.isFinite(nestedId) && nestedId > 0 ? nestedId : null;
    }

    return null;
  }

  private extractAssignmentRoleId(assignment: any): number | null {
    if (!assignment) {
      return null;
    }

    const directCandidates = [
      assignment.roleId,
      assignment.role,
      assignment.approverRole,
      assignment.assignedRole
    ];

    for (const candidate of directCandidates) {
      const extracted = this.extractRoleId(candidate);
      if (extracted) {
        return extracted;
      }
    }

    return null;
  }

  private getCurrentRoleTokens(): string[] {
    const tokens = new Set<string>();
    const rawRole = sessionStorage.getItem('role') || localStorage.getItem('role') || '';

    rawRole
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => this.pushNormalizedRoleToken(tokens, item));

    const userApplicationRoleRaw = sessionStorage.getItem('userApplicationRole');
    if (userApplicationRoleRaw) {
      try {
        const parsed = JSON.parse(userApplicationRoleRaw);
        const appRole = parsed?.appRole;
        const candidates = [
          appRole?.name,
          appRole?.code,
          appRole?.roleName,
          appRole?.roleCode
        ];
        candidates
          .map((item: any) => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean)
          .forEach((item: string) => this.pushNormalizedRoleToken(tokens, item));
      } catch {
        // ignore malformed session payload
      }
    }

    return Array.from(tokens);
  }

  private getCurrentRoleIds(): number[] {
    const roleIds = new Set<number>();
    const userApplicationRoleRaw = sessionStorage.getItem('userApplicationRole');
    if (!userApplicationRoleRaw) {
      return [];
    }

    try {
      const parsed = JSON.parse(userApplicationRoleRaw);
      const appRole = parsed?.appRole;
      const candidates = [
        appRole?.id,
        appRole?.roleId,
        parsed?.roleId,
        parsed?.id
      ];

      candidates.forEach((candidate: any) => {
        const parsedId = Number(candidate);
        if (Number.isFinite(parsedId) && parsedId > 0) {
          roleIds.add(parsedId);
        }
      });
    } catch {
      // ignore malformed session payload
    }

    return Array.from(roleIds);
  }

  private pushNormalizedRoleToken(target: Set<string>, value: string): void {
    const normalized = value.trim().toUpperCase();
    if (!normalized) {
      return;
    }

    target.add(normalized);
    target.add(normalized.replace(/^ROLE_/, ''));
  }

  private getRoleDisplayName(role: any): string {
    if (!role) {
      return '';
    }

    if (typeof role === 'string') {
      return role.trim();
    }

    const roleId = role?.id ?? role?.roleId ?? null;
    const mappedName = role?.id !== null && role?.id !== undefined
      ? this.approverRoleNameByRoleId.get(String(role.id))
      : null;
    if (mappedName) {
      return roleId ? `${mappedName} (Role #${roleId})` : mappedName;
    }

    const rawName =
      role?.name ||
      role?.roleName ||
      role?.code ||
      role?.roleCode ||
      '';

    if (rawName && roleId) {
      return `${rawName} (Role #${roleId})`;
    }

    return rawName || (roleId ? `Role #${roleId}` : '');
  }

  private canCurrentUserApproveAssignment(assignment: any): boolean {
    const currentUserId = this.currentUserId;
    const assignedUserId = this.extractAssignmentUserId(assignment);
    if (currentUserId && assignedUserId && assignedUserId === currentUserId) {
      return true;
    }

    const currentRoleTokens = this.getCurrentRoleTokens();
    const currentRoleIds = this.getCurrentRoleIds();
    if (!currentRoleTokens.length && !currentRoleIds.length) {
      return false;
    }

    const roleCandidates = [
      assignment?.roleId,
      assignment?.role,
      assignment?.approverRole,
      assignment?.assignedRole
    ];

    const assignedRoleId = this.extractAssignmentRoleId(assignment);
    const assignedRoleNames = roleCandidates
      .map((candidate) => this.getRoleDisplayName(candidate))
      .filter(Boolean)
      .flatMap((item) => {
        const normalized = item.toUpperCase();
        return [normalized, normalized.replace(/^ROLE_/, '')];
      });

    return assignedRoleNames.some((item) => currentRoleTokens.includes(item))
      || (assignedRoleId !== null && currentRoleTokens.includes(`ROLE#${assignedRoleId}`))
      || (assignedRoleId !== null && currentRoleIds.includes(assignedRoleId));
  }

  private resolveAssignmentDisplayName(assignment: any): string {
    if (!assignment) {
      return '';
    }

    const directCandidates = [
      assignment.userId,
      assignment.user,
      assignment.approver,
      assignment.actorUser,
      assignment.assignedUser
    ];

    for (const candidate of directCandidates) {
      const name = this.getUserDisplayName(candidate);
      if (name && name !== 'Unassigned') {
        return name;
      }
    }

    const roleCandidates = [
      assignment.roleId,
      assignment.role,
      assignment.approverRole,
      assignment.assignedRole
    ];

    for (const candidate of roleCandidates) {
      const roleName = this.getRoleDisplayName(candidate);
      if (roleName) {
        return roleName;
      }
    }

    const fallbackId = this.extractAssignmentUserId(assignment);
    if (fallbackId) {
      return this.getUserDisplayName(fallbackId);
    }

    const fallbackRoleId = this.extractAssignmentRoleId(assignment);
    return fallbackRoleId ? `Role #${fallbackRoleId}` : '';
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
  // formatCurrency(value: number): string {
  //   const normalized = Number.isFinite(value) ? value : 0;
  //   return `₦${normalized.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  // }

  /** The month picker: opens that month's run, if one was generated. */
  handlePeriodChange(){
    const monthIndex = this.monthNames.indexOf(this.selectedMonth) + 1;
    const run = this.runs.find(r => +r.year === +this.selectedYear && +r.month === monthIndex);
    this.selectRun(run);
  }

  /** Search, salary structure (job type), department and level filters, all applied together. */
  filterEmployee() {
    const term = (this.searchTerm || '').trim().toLowerCase();
    this.filteredEmployeePayroll = this.currentPayroll.filter(row =>
      (!term || this.rowName(row).toLowerCase().includes(term))
      && (!this.selectedPayType.length || this.selectedPayType.includes(this.rowJobType(row)))
      && (!this.selectedDepartment.length || this.selectedDepartment.includes(this.rowDepartment(row)))
      && (!this.selectedLevel.length || this.selectedLevel.includes(this.rowLevel(row)))
    );
  }

  filterBySelectedPayType() { this.filterEmployee(); }
  filterBySelectedDepartment() { this.filterEmployee(); }
  filterBySelectedLevel() { this.filterEmployee(); }

  generateCSV() {
  const source = this.selectedEmployees.length
    ? this.selectedEmployees
    : this.filteredEmployeePayroll.length > 0
      ? this.filteredEmployeePayroll
      : this.currentPayroll;

  const csvData = this.convertToCSV(source);

  const label = source.length === 1
    ? `${source[0]?.employee?.firstName ?? ''}_${source[0]?.employee?.lastName ?? ''}`.trim()
    : 'employees';

  this.downloadCSV(
    csvData,
    `${label}_${this.selectedMonth}_${this.selectedYear}_payroll.csv`
  );
}

  convertToCSV(data: any[]) {
  const headers = [
    'Employee ID',
    'Employee Name',
    'Account Number',
    'Bank Name',
    'Days Worked',
    'Base Pay',
    'Overtime Pay',
    'Gross Pay',
    'Total Deductions',
    'Net Payable'
  ];

  const safe = (val: any) => `"${val}"`;
  const rows = data.map(emp => [
      emp.id,
      safe(`${emp.employee?.firstName ?? ''} ${emp.employee?.lastName ?? ''}`.trim()),
      emp.employee?.accountNumber ?? '',
      emp.employee?.bankName ?? '',
      emp.daysWorked ?? 0,
      safe(this.formatCurrency(emp.basePay)),
      safe(this.formatCurrency(emp.overtimePay)),
      safe(this.formatCurrency(emp.grossPay)),
      safe(this.formatCurrency(emp.totalDeductions)),
      safe(this.formatCurrency(emp.netPayable))
    ]);

  return [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');
}

  downloadCSV(csv: string, filename: string) {
  const BOM = '\uFEFF'; // forces Excel to read as UTF-8
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

  viewEmployeePaySLip(employee: any, op?: any){
    op?.hide?.()
    this.viewEmployee = true
    this.currentEmployeeInView = employee
  }

  handlePayrollAction(event: { actionId: string; row: any }) {
    if (event.actionId === 'view') {
      this.viewEmployeePaySLip(event.row);
    }
  }

  /** Shown under the summary title: whose figures these are. */
  summaryScopeLabel = '';

  viewSummary(){
    const rows = this.selectedEmployees.length ? this.selectedEmployees : this.filteredEmployeePayroll;
    this.summaryScopeLabel = this.selectedEmployees.length
      ? `${rows.length} selected employee(s)`
      : `All ${rows.length} employee(s)`;
    this.payrollSumary = this.calculatePayrollSummary(rows)

    this.openSummary = true
  }

 calculatePayrollSummary(rows: any[] = this.filteredEmployeePayroll) {
  const summary = {
    totalSalary: 0,
    totalBonuses: 0,
    totalDeductions: 0,
    totalOvertimePay: 0,
    totalAllowances: 0,
    totalNetPayable: 0,
    totalTax: 0,
    totalInsurance: 0,
    totalPension: 0,
    totalGross: 0
  }

  rows.forEach(emp => {
    // Base
    summary.totalSalary += emp.basePay ?? 0;
    summary.totalOvertimePay += emp.overtimePay ?? 0;
    summary.totalGross += emp.grossPay ?? 0;
    summary.totalNetPayable += emp.netPayable ?? 0;

    // Bonuses
    (emp.bonuses || []).forEach((bonus: any) => {
      summary.totalBonuses += bonus.amount ?? 0;
    });

    // Allowances (now single object)
    summary.totalAllowances += emp.allowances?.amount ?? 0;

    // Deductions (now object, not array)
    const deductions = emp.deductions;

    if (deductions) {
      summary.totalDeductions += emp.totalDeductions ?? 0;

      // Direct fields
      summary.totalTax += deductions.tax ?? 0;
      summary.totalPension += deductions.pension ?? 0;
      summary.totalInsurance += deductions.healthInsurance ?? 0;

      // Optional: dynamic breakdown from details[]
      (deductions.details || []).forEach((d: any) => {
        const name = (d.name || '').toLowerCase();

        if (name.includes('tax')) summary.totalTax += 0; // already counted
        if (name.includes('pension')) summary.totalPension += 0;
        if (name.includes('insurance')) summary.totalInsurance += 0;
      });
    }
  });

  return summary;
}
  
  
toTitleCaseWithSpace(key: any): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str: string) => str.toUpperCase());
  }

  toggleCalendar() {
    this.showCalendar = !this.showCalendar;
  }

  onMonthChange(event: any) {
    this.selectedMonth = event.target.value;
    this.handlePeriodChange()
    this.getYearsForSelectedMonth()
  }

  onYearChange(event: any) {
    this.selectedYear = event.target.value;
    this.handlePeriodChange()
  }
  generateYears() {
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 10; i <= currentYear + 10; i++) {
      this.years.push(i);
    }
  }
  getYearsForSelectedMonth() {
    if (!this.selectedMonth) {
        this.years = [...this.years];
        return;
    }

    const monthIndex = this.monthNames.indexOf(this.selectedMonth) + 1;
    this.years = Array.from(new Set(
        this.payrollRecords
            .filter(emp => emp.month === monthIndex) 
            .map(emp => emp.year) 
    ));
  
}

toggleDropdown() {
    this.showDropdown = !this.showDropdown;
}

download(format: string) {
    if (format === 'pdf') {
        console.log('Downloading as PDF');
    } else if (format === 'csv') {
        console.log('Downloading as CSV');
    }
    this.showDropdown = false;
}



  /** The selected month as 1–12. `selectedMonth` holds the name ("January"); loan schedules use numbers. */
  private get selectedMonthNumber(): number {
    return this.monthNames.indexOf(this.selectedMonth) + 1;
  }

  private activeOnly(emps: any[]): any[] {
    return emps.filter((e: any) =>
      (e.employee?.employeeStatus ?? e.employeeStatus ?? 'ACTIVE') === 'ACTIVE'
    );
  }

  private resetPagination() {
    this.currentPage = 1;
  }

    /**
     * The bank file for the run on screen, from the saved template. Only for a fully approved run, and
     * never with a zero or negative amount: those rows are left out and named.
     */
    downloadBankCSV() {
        const run = this.payrollInView;
        if (!run?.employees?.length) {
          this.messageService.add({ severity: 'warn', summary: 'No payroll run', detail: 'Generate a payroll run first.', key: this.toastKey });
          return;
        }
        if (!this.isRunFullyApproved(run)) {
          this.messageService.add({ severity: 'warn', summary: 'Not approved yet', detail: 'The bank file can be downloaded once this payroll run is fully approved.', key: this.toastKey });
          return;
        }
        const template = this.payrollService.getTemplate();
        if (!template?.columns?.length) {
          this.messageService.add({ severity: 'warn', summary: 'No bank template', detail: 'Set up a bank export template under Payroll Disbursement first.', key: this.toastKey });
          return;
        }
        const scoped = this.selectedEmployees.length ? this.selectedEmployees : this.filteredEmployeePayroll;
        const payable = scoped.filter(row => Number(row?.netPayable) > 0);
        const unpaid = scoped.filter(row => !(Number(row?.netPayable) > 0));
        if (!payable.length) {
          this.messageService.add({ severity: 'warn', summary: 'Nothing to pay', detail: 'No employee in this selection has a net pay above zero.', key: this.toastKey });
          return;
        }
        const csv = this.payrollService.generateCSV(payable, template);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${template.name}-${periodLabel(run.month, run.year).replace(/\s+/g, '-')}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        if (unpaid.length) {
          this.messageService.add({
            severity: 'warn', summary: 'Some employees left out',
            detail: `Net pay is zero or negative for: ${unpaid.map(row => this.rowName(row) || `#${this.rowEmployeeId(row)}`).join(', ')}. Check their deductions before paying them.`,
            key: this.toastKey, life: 10000
          });
        }
    }

    /**
     * Every deduction on the payslip on screen: tax, pension, NHF, health insurance, loans, cooperatives,
     * then the named lines (ad-hocs, queries…). When named lines exist they stand in for "Other".
     */
    get payslipDeductionLines(): { label: string; amount: number }[] {
      const row = this.currentEmployeeInView;
      const details: any[] = Array.isArray(row?.deductions?.details) ? row.deductions.details : [];
      const fixed = payslipFigures(row).deductionLines.filter(l => !(details.length && l.label === 'Other'));
      return [...fixed, ...details.map(d => ({ label: d?.name || d?.description || 'Deduction', amount: Number(d?.amount) || 0 }))];
    }

    get payslipDeductionSum(): number {
      return this.payslipDeductionLines.reduce((t, l) => t + l.amount, 0);
    }

    /** True when the deduction lines don't add up to the run's total deductions for this payslip. */
    get payslipDeductionsMismatch(): boolean {
      const total = Number(this.currentEmployeeInView?.totalDeductions) || 0;
      return Math.abs(total - this.payslipDeductionSum) > 0.5;
    }

    formatDate(arr: number[]): string {
      if (!arr) return '';
      const [year, month, day] = arr;
      return new Date(year, month - 1, day).toLocaleDateString();
    }

    onFileSelected(event: any) {
      const file = event.target.files?.[0];
      this.selectedFile = file ?? null;
    }
    // ── Payslip emails ─────────────────────────────────────────────────────────
    emailingPayslips = false;
    private static readonly EMAILED_RUNS_KEY = 'payroll.payslipsEmailedRuns';

    private isRunFullyApproved(run: any): boolean {
      const status = String(run?.payrollApprovalInstance?.status || run?.status || '').toUpperCase();
      return ['APPROVED', 'COMPLETED', 'PAID'].includes(status);
    }

    /** Runs whose payslips went out from this browser, so a refresh after approval doesn't send twice. */
    private emailedRuns(): Record<string, string> {
      try { return JSON.parse(localStorage.getItem(EmployeePayrollComponent.EMAILED_RUNS_KEY) || '{}') || {}; } catch { return {}; }
    }

    private payslipsAlreadyEmailed(run: any): boolean {
      return !!this.emailedRuns()[String(run?.id)];
    }

    private markPayslipsEmailed(run: any): void {
      try {
        const runs = { ...this.emailedRuns(), [String(run?.id)]: new Date().toISOString() };
        localStorage.setItem(EmployeePayrollComponent.EMAILED_RUNS_KEY, JSON.stringify(runs));
      } catch {}
    }

    /**
     * Emails payslips for an approved run: to everyone after the final approval, and from the
     * "Email Payslips" menu item to the ticked employees (everyone when none are ticked).
     * Employees without an email address are skipped and named; failed ones are ticked for a retry.
     */
    emailPayslips(run: any, onlyEmployeeIds: Set<string> | null = null): void {
      if (this.emailingPayslips) return;
      if (!run?.id || !this.isRunFullyApproved(run)) {
        this.messageService.add({ severity: 'warn', summary: 'Not approved yet', detail: 'Payslips can be emailed once the payroll run is fully approved.', key: this.toastKey });
        return;
      }
      const idOf = (row: any) => String(row?.employee?.id ?? row?.employeeId ?? '');
      const everyone = !onlyEmployeeIds;
      const rows: any[] = (run.employees ?? []).filter((row: any) => everyone || onlyEmployeeIds!.has(idOf(row)));
      if (!rows.length) {
        this.messageService.add({ severity: 'warn', summary: 'No payslips', detail: everyone ? 'This payroll run has no employees.' : 'None of the ticked employees are in this payroll run.', key: this.toastKey });
        return;
      }

      let companyName = 'OptimaX';
      try {
        const biz = JSON.parse(sessionStorage.getItem('userPrimaryInfoRegData') || '{}');
        companyName = biz?.companyName || biz?.company?.name || companyName;
      } catch {}
      const period = periodLabel(run.month, run.year);
      const payslipsUrl = `${window.location.origin}/admin/employee-payslip/my-payslips`;

      this.emailingPayslips = true;
      this.messageService.add({ severity: 'info', summary: 'Emailing payslips', detail: `Sending ${period} payslips to ${rows.length} employee(s)…`, key: this.toastKey });

      // Run rows don't always carry email addresses, so match them to the full employee records.
      this.employeeService.getAllEmployee().pipe(
        catchError(() => of([] as any[])),
        mergeMap((employees: any[]) => {
          const byId = new Map(employees.map(e => [String(e?.id), e]));
          return from(rows).pipe(
            mergeMap(row => {
              const id = String(row?.employee?.id ?? row?.employeeId ?? '');
              const employee = { ...(row?.employee || {}), ...(byId.get(id) || {}) };
              const slip = toPayslip(row, run, employee);
              const to = payslipEmailAddress(employee);
              if (!to) return of({ id, name: slip.name || `#${id}`, result: 'skipped' as const, reason: '' });
              const html = buildPayslipEmailHtml(slip, companyName, payslipsUrl);
              return this.employeeService.sendNotificationEmail(to, `${companyName}: your payslip for ${period}`, html).pipe(
                map(() => ({ id, name: slip.name, result: 'sent' as const, reason: '' })),
                // Keep the server's answer, so the message can say why (e.g. 401: not signed in).
                catchError((err: any) => of({
                  id, name: slip.name || `#${id}`, result: 'failed' as const,
                  reason: [err?.status || '', err?.error?.message || err?.message || ''].filter(Boolean).join(': ').slice(0, 160),
                }))
              );
            }, 4),
            toArray()
          );
        }),
        finalize(() => { this.emailingPayslips = false; })
      ).subscribe(results => {
        const sent = results.filter(r => r.result === 'sent');
        const skipped = results.filter(r => r.result === 'skipped').map(r => r.name);
        const failedResults = results.filter(r => r.result === 'failed');
        const failed = failedResults.map(r => r.reason ? `${r.name} (${r.reason})` : r.name);
        // Only a send to the whole run counts as "the run was emailed" (it stops the automatic resend).
        if (sent.length && everyone) this.markPayslipsEmailed(run);
        // Tick the failed employees, so "Email Payslips (n selected)" retries just them.
        if (failedResults.length) {
          const failedIds = new Set(failedResults.map(r => r.id));
          this.selectedEmployees = this.filteredEmployeePayroll.filter(row => failedIds.has(idOf(row)));
        }
        this.messageService.add({
          severity: failed.length || skipped.length ? 'warn' : 'success',
          summary: 'Payslips emailed',
          detail: [
            `${sent.length} of ${results.length} ${period} payslip(s) sent.`,
            skipped.length ? `No email address: ${skipped.join(', ')}.` : '',
            failed.length ? `Failed to send: ${failed.join(', ')}. They're now ticked in the table; choose "Email Payslips (${failed.length} selected)" to retry just them.` : '',
          ].filter(Boolean).join(' '),
          key: this.toastKey,
          life: 10000
        });
      });
    }

    // ── Loan & cooperative deductions ──────────────────────────────────────────
    /** What each employee owes this month for loans and cooperatives, by employee id (payroll-obligations.ts). */
    obligationsByEmployee = new Map<string, EmployeeObligations>();
    obligationsMonthLabel = '';
    readonly obligationKindLabel = OBLIGATION_KIND_LABEL;

    private loadObligations(month: any, year: any): void {
      const m = Number(month), y = Number(year);
      if (!m || !y) { this.obligationsByEmployee = new Map(); return; }
      this.payrollLoanDeductionService.getPayrollObligations(m, y).subscribe(map => {
        this.obligationsByEmployee = map;
        this.obligationsMonthLabel = periodLabel(m, y);
        // New array so the table re-runs its formatters with the amounts.
        this.filteredEmployeePayroll = [...this.filteredEmployeePayroll];
      });
    }

    private rowEmployeeId(row: any): string {
      return String(row?.employee?.id ?? row?.employeeId ?? '');
    }

    obligationsFor(row: any): EmployeeObligations | undefined {
      return this.obligationsByEmployee.get(this.rowEmployeeId(row));
    }

    /** Loan and cooperative deductions the generated run actually contains for this row. */
    runLoanDeduction(row: any): number {
      const d = row?.deductions;
      return d && !Array.isArray(d) ? (Number(d.advances) || 0) + (Number(d.cooperatives) || 0) : 0;
    }

    /** True when the run took a different amount than the employee owes this month. */
    obligationMismatch(row: any): boolean {
      return Math.abs((this.obligationsFor(row)?.total ?? 0) - this.runLoanDeduction(row)) > 0.5;
    }

    get obligationMismatchCount(): number {
      return this.filteredEmployeePayroll.filter(row => this.obligationMismatch(row)).length;
    }

    loansAndCoopLabel(row: any): string {
      const owed = this.obligationsFor(row)?.total ?? 0;
      const inRun = this.runLoanDeduction(row);
      if (!owed && !inRun) return '—';
      return this.obligationMismatch(row)
        ? `${this.formatCurrency(owed)} ⚠ run has ${this.formatCurrency(inRun)}`
        : this.formatCurrency(owed);
    }

    obligationStatusLabel(item: PayrollObligation): string {
      if (item.status === 'NOT_STARTED') return item.startsOn ? `Starts ${periodLabel(+item.startsOn.slice(5, 7), +item.startsOn.slice(0, 4))}` : 'Not started';
      if (item.status === 'REPAID') return 'Fully repaid';
      if (item.status === 'TERM_ENDED') return 'Repayment period over, balance still showing: check the loan';
      return 'Deducted this month';
    }

    /**
     * One line per loan or contribution: total repayable, balance, group, and the exact amount taken
     * this month. Ticked employees only, when any are ticked.
     */
    downloadObligationsCsv(): void {
      const run = this.payrollInView;
      if (!run?.employees?.length) {
        this.messageService.add({ severity: 'warn', summary: 'No payroll run', detail: 'Generate a payroll run first.', key: this.toastKey });
        return;
      }
      const cell = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const lines = [['Staff ID', 'Employee', 'Type', 'Loan / Group', 'Cooperative Group', 'Total Repayable (NGN)', 'Outstanding (NGN)', 'Monthly Amount (NGN)', 'This Month (NGN)', 'Starts', 'Status', 'In Payroll Run (NGN)']];
      let total = 0, people = 0;
      for (const row of this.inSelection(run.employees as any[])) {
        const obligations = this.obligationsFor(row);
        if (!obligations?.items.length) continue;
        people++;
        total += obligations.total;
        const name = `${row?.employee?.firstName ?? ''} ${row?.employee?.lastName ?? ''}`.trim();
        obligations.items.forEach((item, i) => lines.push([
          this.rowEmployeeId(row), name, OBLIGATION_KIND_LABEL[item.kind], item.reference, item.groupName ?? '',
          item.totalRepayable ?? '', item.outstanding ?? '', item.monthlyAmount, item.thisMonth, item.startsOn ?? '',
          this.obligationStatusLabel(item), i === 0 ? this.runLoanDeduction(row) : '',
        ] as any[]));
      }
      if (!people) {
        this.messageService.add({ severity: 'info', summary: 'No loan or cooperative deductions', detail: 'Nobody has a loan repayment or cooperative contribution this month.', key: this.toastKey });
        return;
      }
      const period = periodLabel(run.month, run.year).replace(/\s+/g, '_');
      const partial = this.selectedEmployees.length ? `_${this.selectedEmployees.length}_selected` : '';
      this.downloadCSV(lines.map(r => r.map(cell).join(',')).join('\r\n'), `Loan_and_Coop_Deductions_${period}${partial}.csv`);
      this.messageService.add({ severity: 'success', summary: 'Loan & cooperative deductions downloaded', detail: `${people} employee(s), ${formatNaira(total)} to deduct this month.`, key: this.toastKey, life: 8000 });
    }

    // ── Statutory schedules ────────────────────────────────────────────────────
    /**
     * Downloads the PAYE, pension or NHF schedule for the run on screen. A run that isn't fully approved
     * yet is marked DRAFT in the file name, since its figures can still change.
     */
    downloadStatutorySchedule(kind: ScheduleKind): void {
      const run = this.payrollInView;
      if (!run?.employees?.length) {
        this.messageService.add({ severity: 'warn', summary: 'No payroll run', detail: 'Generate a payroll run first.', key: this.toastKey });
        return;
      }
      // Ticked employees only, when any are ticked; the file name says so, since a remittance needs everyone.
      const scopedRun = { ...run, employees: this.inSelection(run.employees) };
      const partial = this.selectedEmployees.length ? `_${scopedRun.employees.length}_selected` : '';
      this.employeeService.getAllEmployee().pipe(catchError(() => of([] as any[]))).subscribe((employees: any[]) => {
        const schedule = buildSchedule(kind, scopedRun, new Map(employees.map(e => [String(e?.id), e])));
        if (!schedule.count) {
          this.messageService.add({ severity: 'info', summary: schedule.title, detail: `No ${schedule.title.replace(' Schedule', '')} was deducted ${partial ? 'for the ticked employees' : 'in this run'}.`, key: this.toastKey });
          return;
        }
        const draft = this.isRunFullyApproved(run) ? '' : '_DRAFT';
        const period = periodLabel(run.month, run.year).replace(/\s+/g, '_');
        this.downloadCSV(scheduleToCsv(schedule), `${schedule.title.replace(/\s+/g, '_')}_${period}${partial}${draft}.csv`);

        const idName = { paye: 'TIN', pension: 'RSA PIN or PFA', nhf: 'NHF number' }[kind];
        this.messageService.add({
          severity: schedule.missingIds || draft ? 'warn' : 'success',
          summary: `${schedule.title} downloaded`,
          detail: [
            `${schedule.count} employee(s), ${formatNaira(schedule.total)} to remit.`,
            partial ? 'Only the ticked employees are included; untick everyone for the full schedule to send.' : '',
            draft ? 'The run is not fully approved yet, so this is a draft.' : '',
            schedule.missingIds ? `${schedule.missingIds} employee(s) have no ${idName} on record; fill those in before sending.` : '',
          ].filter(Boolean).join(' '),
          key: this.toastKey,
          life: 10000
        });
      });
    }

    onApprove() {
      if (this.isApprovingPayroll) {
        return;
      }

      const approvalInstanceId = this.payrollInView?.payrollApprovalInstance?.id;
      if (!approvalInstanceId || !this.currentUserId) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Approval data is incomplete', key: this.toastKey });
        return;
      }

    if (this.isDocumentRequired && !this.selectedFile) {
        this.messageService.add({ severity: 'warn', summary: 'Document required', detail: 'Attach a supporting document before approving this payroll', key: this.toastKey });
        return;
      }
      if (this.currentStageRequiresComment && !this.approvalComment.trim()) {
        this.messageService.add({ severity: 'warn', summary: 'Comment required', detail: 'Enter a comment before approving this payroll', key: this.toastKey });
        return;
      }

      const userApplicationRoleRaw = sessionStorage.getItem('userApplicationRole');
      let actorRoleCode: string | null = sessionStorage.getItem('role') || null;
      let actorRoleId: number | null = null;

      if (userApplicationRoleRaw) {
        try {
          const parsed = JSON.parse(userApplicationRoleRaw);
          actorRoleCode =
            parsed?.appRole?.code ||
            parsed?.appRole?.roleCode ||
            parsed?.appRole?.name ||
            actorRoleCode;

          const parsedRoleId = Number(parsed?.appRole?.id ?? parsed?.appRole?.roleId ?? 0);
          actorRoleId = Number.isFinite(parsedRoleId) && parsedRoleId > 0 ? parsedRoleId : null;
        } catch {
          // ignore malformed session payload
        }
      }

      const payload = new FormData();
      payload.append('actorUserId', String(this.currentUserId));
      if (actorRoleCode) {
        payload.append('actorRoleCode', actorRoleCode);
      }
      if (actorRoleId !== null) {
        payload.append('actorRoleId', String(actorRoleId));
      }
      payload.append('comment', this.approvalComment.trim());
      if (this.selectedFile) {
        payload.append('file', this.selectedFile);
      }

      this.isApprovingPayroll = true;
      this.payrollService.approvePayroll(approvalInstanceId, payload)
      .pipe(finalize(() => {
        this.isApprovingPayroll = false;
      }))
      .subscribe({
        next: () => {
          const approvedRunId = this.payrollInView?.id;
          this.openApproveModal = false;
          this.selectedFile = null;
          this.approvalComment = '';
          // Approval has several stages; payslips go out once, when the last stage approves the run.
          this.generatePayrolls(records => {
            const run = records.find(r => String(r?.id) === String(approvedRunId));
            if (run && this.isRunFullyApproved(run) && !this.payslipsAlreadyEmailed(run)) {
              this.emailPayslips(run);
            }
          });
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Payroll approved successfully', key: this.toastKey });
        },
        error: (err: any) => {
          console.log(err);
          const detail =
            err?.error?.message ||
            err?.error?.detail ||
            err?.error?.error ||
            'Unable to approve payroll';
          this.messageService.add({ severity: 'error', summary: 'Error', detail, key: this.toastKey });
        }
      });
    }

    onReject() {
      if (this.isApprovingPayroll) {
        return;
      }

      const approvalInstanceId = this.payrollInView?.payrollApprovalInstance?.id;
      if (!approvalInstanceId || !this.currentUserId) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Approval data is incomplete', key: this.toastKey });
        return;
      }

      if (!this.approvalComment.trim()) {
        this.messageService.add({ severity: 'warn', summary: 'Comment required', detail: 'Enter a reason before rejecting this payroll', key: this.toastKey });
        return;
      }

      const userApplicationRoleRaw = sessionStorage.getItem('userApplicationRole');
      let actorRoleCode: string | null = sessionStorage.getItem('role') || null;
      let actorRoleId: number | null = null;

      if (userApplicationRoleRaw) {
        try {
          const parsed = JSON.parse(userApplicationRoleRaw);
          actorRoleCode =
            parsed?.appRole?.code ||
            parsed?.appRole?.roleCode ||
            parsed?.appRole?.name ||
            actorRoleCode;

          const parsedRoleId = Number(parsed?.appRole?.id ?? parsed?.appRole?.roleId ?? 0);
          actorRoleId = Number.isFinite(parsedRoleId) && parsedRoleId > 0 ? parsedRoleId : null;
        } catch {
          // ignore malformed session payload
        }
      }

      const payload: any = {
        actorUserId: this.currentUserId,
        actorRoleCode,
        comment: this.approvalComment.trim()
      };

      if (actorRoleId !== null) {
        payload.actorRoleId = actorRoleId;
      }

      this.isApprovingPayroll = true;
      this.payrollService.rejectPayroll(approvalInstanceId, payload)
        .pipe(finalize(() => {
          this.isApprovingPayroll = false;
        }))
        .subscribe({
          next: () => {
            this.openRejectModal = false;
            this.approvalComment = '';
            this.generatePayrolls();
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Payroll rejected successfully', key: this.toastKey });
          },
          error: (err: any) => {
            const detail =
              err?.error?.message ||
              err?.error?.detail ||
              err?.error?.error ||
              'Unable to reject payroll';
            this.messageService.add({ severity: 'error', summary: 'Error', detail, key: this.toastKey });
          }
        });
    }
}
