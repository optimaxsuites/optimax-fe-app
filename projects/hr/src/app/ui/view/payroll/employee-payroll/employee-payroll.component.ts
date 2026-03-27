import { Component, inject } from '@angular/core';
import { TableAction, TableColumn } from '../../../shared-component/view/table/table.component';
import { PayrollLoanDeductionService } from '../../../service/payroll-loan-deduction.service';
import { firstValueFrom } from 'rxjs';
import { EmployeeService } from '../../../service/employee.service';
import { DomSanitizer } from '@angular/platform-browser';
import { PayrollService } from '../../../service/payroll.service';
import { Employee, Payroll } from '../../../domain/payroll.dto';
import { MailNotificationService } from '../../../service/mailNotification.service';
interface Allowances {
    housingAllowance: number;
    transportationAllowance: number;
    mealAllowance: number;
    healthAllowance: number;
    carAllowance: number;
    securityAllowance: number;
    travelAllowance: number;
    [key: string]: number; 
}
type PenaltyType = 'fixed' | 'percentage';
type PayType = 'monthly' | 'daily' | 'hourly' | 'project';

interface AttendanceSummary {
  lateDays: number;
  absentDays: number;
}

interface SalaryLevelSetting {
  level: string;
  monthly: number;
  daily: number;
  hourly?: number;
}

interface PayrollSettings {
  paySchedule: {
    startDay: number;
    endDay: number;
    workingDaysPerPeriod: number;
    hoursPerDay: number;
  };
  attendancePolicy: {
    resumptionTime: string;
    graceMinutes: number;
    lateWindowEnd: string;
    latePenalty: {
      type: PenaltyType;
      amount: number;
    };
    absentPenalty: {
      type: PenaltyType;
      amount: number;
    };
  };
  overtime: {
    enabled: boolean;
    rateType: 'percentage' | 'fixed';
    rateValue: number;
    maxHoursPerPeriod: number;
  };
  salaryByLevel: SalaryLevelSetting[];
}

@Component({
  selector: 'app-employee-payroll',
  templateUrl: './employee-payroll.component.html',
  styleUrl: './employee-payroll.component.scss'
})
export class EmployeePayrollComponent {
private readonly payrollLoanDeductionService = inject(PayrollLoanDeductionService);
isApplyingLoanDeductions = false;
loanDeductionSyncMessage = '';
autoApplyLoanDeductions = true;

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
selectedEmployees: any[] = [];
currentEmployeeInView: any = {};

  uniqueLevels: any;
  uniquePositions: any;
  currentPage = 1;
  fetchEmployeeLoading = false;

payrollSettings: PayrollSettings = {
  paySchedule: {
    startDay: 15,
    endDay: 15,
    workingDaysPerPeriod: 22,
    hoursPerDay: 8
  },
  attendancePolicy: {
    resumptionTime: '09:00',
    graceMinutes: 15,
    lateWindowEnd: '10:30',
    latePenalty: {
      type: 'fixed',
      amount: 1000
    },
    absentPenalty: {
      type: 'fixed',
      amount: 3000
    }
  },
  overtime: {
    enabled: true,
    rateType: 'percentage',
    rateValue: 150,
    maxHoursPerPeriod: 20
  },
  salaryByLevel: [
    { level: 'Junior', monthly: 4500, daily: 200 },
    { level: 'Mid-level', monthly: 5500, daily: 250 },
    { level: 'Senior', monthly: 6500, daily: 300 },
    { level: 'Contract', monthly: 0, daily: 180 }
  ]
};

attendanceOverrides: Record<number, AttendanceSummary> = {
  1: { lateDays: 1, absentDays: 0 },
  2: { lateDays: 0, absentDays: 1 },
  4: { lateDays: 2, absentDays: 0 },
  8: { lateDays: 0, absentDays: 2 }
};

overtimeOverrides: Record<number, number> = {
  1: 4,
  3: 2,
  6: 5,
  9: 3
};

  payrollColumns: TableColumn[] = [
    { header: 'Employee', sortable: true, className: 'table-item', formatter: (row: { employee: { employee:any }; }) =>
    `${row.employee?.employee.firstName ?? ''} ${row.employee?.employee.lastName ?? ''}`.trim()},
    { header: 'Level', field: 'employee.employee.level.name', sortable: true, className: 'table-item' },
    { header: 'Department', field: 'employee.employee.department.name', sortable: true, className: 'table-item' },
    { header: 'Days worked', field: 'employee.daysWorked',  className: 'table-item' },
    { header: 'Base Pay', field: 'employee.basePay',  className: 'table-item' },
    { header: 'Gross Pay', field: 'employee.grossPay', className: 'table-item' },
    { header: 'Total Deductions', field: 'employee.totalDeductions', className: 'table-item' },
    { header: 'Net Payable', field: 'employee.netPayable', className: 'table-item' },
  
];


  payrollActions: TableAction[] = [
    { id: 'view', label: 'View', icon: 'pi pi-eye' }
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
payrollSumary = {}
employees: any = []
filteredEmployees: any[] = [];
employeeProfilePhotoUrl: string = 'https://media.istockphoto.com/id/1223671392/vector/default-profile-picture-avatar-photo-placeholder-vector-illustration.jpg?s=612x612&w=0&k=20&c=s0aTdmT5aU6b8ot7VKm11DeID6NctRCpB755rA1BIP0='
triggeredGeneration = false;

currentUser: Employee = {} as Employee;
actionItems: any = []
// payrollRecords: any[] = []
constructor(   private employeeService: EmployeeService,  private sanitizer: DomSanitizer, private payrollService: PayrollService, private mailNotificationService: MailNotificationService) {
    this.generateYears();
    this.selectedMonth = this.months[new Date().getMonth()];
    
    this.actionItems=[
{
        label: `Generate ${this.currentMonthName} ${this.currentYear} Payroll`,
        icon: 'pi pi-cog',
        command: () => this.generatePayrollSummary()
      },
            {
        label: `View Summary`,
        icon: 'pi pi-chart-bar',
        command: () => this.viewSummary()
      },
      {
        label: 'Download CSV',
        icon: 'pi pi-download',
        command: () => this.generateCSV()
      }
    ];
     
}
ngOnInit(){
    // this.handlePeriodChange()
    //    this.fetchEmployees()
  const userId = sessionStorage.getItem('userid')
  this.employeeService.getEmployeeByUserId(Number(userId)).subscribe({  
    next: data => {this.currentUser = data; console.log(data)},
    error: err => console.log(err)
  })
  this.generatePayrolls()    
}


generatePayrolls(){

    this.payrollService.getPayrollGenerationResponses().subscribe({
        next: response => {
            this.payrollRecords = response

            this.years =  Array.from(new Set(this.payrollRecords.map((emp: { year: number }) => emp.year))).sort((a, b) => a - b);
            const monthIndices = Array.from(new Set(this.payrollRecords.map((emp: { month: number }) => emp.month - 1))); 
            this.months = monthIndices.map(index => this.monthNames[index]).sort((a, b) => this.monthNames.indexOf(a) - this.monthNames.indexOf(b))
            this.selectedMonth = this.months[this.months.length - 1]
            this.selectedYear = this.years[this.years.length - 1]
            this.filteredEmployeePayroll = this.payrollRecords.length > 0 ? this.payrollRecords[0].employees : [];
        },
        error: err => console.log(err)
    })
}

 
  generatePayrollSummary() {
    this.triggeredGeneration = true;
    const payload = {
        month: 0,
        year: 0,
        employeeIds: [],
        level: [],
        department: []
    }

    this.payrollService.postGeneratePayroll(payload).subscribe({
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
            this.mailNotificationService.sendMail(mailBody).subscribe({
                next: mailResponse => {
                      this.triggeredGeneration = false;
                      this.generatePayrolls()
                },
            })
          
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
            this.mailNotificationService.sendMail(mailBody).subscribe({
                next: mailResponse => {
                      this.triggeredGeneration = false;
                },
            })  

        }
     },
     error: err => {
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
            this.mailNotificationService.sendMail(mailBody).subscribe({
                next: mailResponse => {
                      this.triggeredGeneration = false;
                },
            })  

     }
    })
  }

  fetchEmployees(){
    this.filteredEmployees = []
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

        this.filteredEmployees = this.employees.map((employee: any) => {
        //   if (employee.employeeMedia?.mediaNo) {
        //     this.fetchProfilePhoto(employee);
        //   } else {
        //     employee.imageUrl = this.employeeProfilePhotoUrl; // Assign default image if no mediaNo
        //   }
          if(employee?.level.id){
                this.employeeService.getSalaryById(employee.level.id).subscribe({
                next: data => {
                    employee.netPayable = this.calculateNetSalary(data[0])
                },
                error: err => console.log(err)
                })
            }
          employee.name = `${employee.firstName} ${employee.lastName}`;
          employee.level = employee.level?.name || 'N/A';
          employee.department = employee.department?.name || 'N/A';
        //   employee.netPayable = 0; // Initialize netPayable to 0 or calculate based on your logic

          return employee;
        });

        this.fetchEmployeeLoading= false
        this.resetPagination();
    console.log(this.filteredEmployees)
    

      },
      error: err => {
        console.log(err)
        this.fetchEmployeeLoading= false
    }
    })


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
  formatCurrency(value: number): string {
    const normalized = Number.isFinite(value) ? value : 0;
    return `₦${normalized.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private resolvePayType(employee: any): PayType {
    if (employee.payType) return employee.payType as PayType;
    if (employee.type === 'daily') return 'daily';
    if (employee.type === 'hourly') return 'hourly';
    if (employee.type === 'project-based') return 'project';
    return 'monthly';
  }

  private getLevelRate(level: string, payType: Exclude<PayType, 'project'>): number {
    const match = this.payrollSettings.salaryByLevel.find(setting => setting.level === level);
    if (!match) return 0;
    if (payType === 'hourly') {
      return match.hourly ?? (match.daily / this.payrollSettings.paySchedule.hoursPerDay);
    }
    return match[payType];
  }

  private getDailyRate(employee: any, payType: PayType, basePay: number): number {
    if (payType === 'daily') return employee.dailyRate ?? this.getLevelRate(employee.level, 'daily');
    if (payType === 'hourly') return (employee.hourlyRate ?? this.getLevelRate(employee.level, 'hourly')) * this.payrollSettings.paySchedule.hoursPerDay;
    if (payType === 'monthly') return basePay / this.payrollSettings.paySchedule.workingDaysPerPeriod;
    return 0;
  }

  private getHourlyRate(employee: any, payType: PayType, basePay: number): number {
    if (payType === 'hourly') return employee.hourlyRate ?? this.getLevelRate(employee.level, 'hourly');
    const dailyRate = this.getDailyRate(employee, payType, basePay);
    return dailyRate / this.payrollSettings.paySchedule.hoursPerDay;
  }

  private getAttendanceSummary(employee: any): AttendanceSummary {
    return employee.attendanceSummary ?? this.attendanceOverrides[employee.id] ?? { lateDays: 0, absentDays: 0 };
  }

  private resolvePenaltyAmount(penalty: { type: PenaltyType; amount: number }, dailyRate: number): number {
    if (penalty.type === 'percentage') {
      return dailyRate * (penalty.amount / 100);
    }
    return penalty.amount;
  }

  private calculateAttendancePenalty(employee: any, basePay: number, payType: PayType): number {
    const attendance = this.getAttendanceSummary(employee);
    if (!attendance.lateDays && !attendance.absentDays) return 0;
    const dailyRate = this.getDailyRate(employee, payType, basePay);
    const latePenalty = this.resolvePenaltyAmount(this.payrollSettings.attendancePolicy.latePenalty, dailyRate);
    const absentPenalty = this.resolvePenaltyAmount(this.payrollSettings.attendancePolicy.absentPenalty, dailyRate);
    return (attendance.lateDays * latePenalty) + (attendance.absentDays * absentPenalty);
  }

  private calculateOvertimePay(employee: any, basePay: number, payType: PayType): { overtimePay: number; overtimeHours: number } {
    if (!this.payrollSettings.overtime.enabled) return { overtimePay: 0, overtimeHours: 0 };
    const overrideHours = this.overtimeOverrides[employee.id] ?? 0;
    const overtimeHours = Math.min(employee.overtimeHours ?? overrideHours, this.payrollSettings.overtime.maxHoursPerPeriod);
    if (!overtimeHours) return { overtimePay: 0, overtimeHours: 0 };
    const hourlyRate = this.getHourlyRate(employee, payType, basePay);
    if (!hourlyRate) return { overtimePay: 0, overtimeHours: 0 };
    const overtimeRate = this.payrollSettings.overtime.rateType === 'percentage'
      ? hourlyRate * (this.payrollSettings.overtime.rateValue / 100)
      : this.payrollSettings.overtime.rateValue;
    return { overtimePay: overtimeRate * overtimeHours, overtimeHours };
  }

  private calculateBasePay(employee: any, payType: PayType): number {
    if (payType === 'project') {
      if (employee.totalProjectPay) return employee.totalProjectPay;
      return (employee.projects || []).reduce((sum: number, project: any) => sum + (project.projectPay || 0), 0);
    }
    if (payType === 'daily') {
      const dailyRate = employee.dailyRate ?? this.getLevelRate(employee.level, 'daily');
      const daysWorked = employee.daysWorked ?? this.payrollSettings.paySchedule.workingDaysPerPeriod;
      return dailyRate * daysWorked;
    }
    if (payType === 'hourly') {
      const hourlyRate = employee.hourlyRate ?? this.getLevelRate(employee.level, 'hourly');
      return hourlyRate * (employee.hoursWorked ?? 0);
    }
    return employee.salary ?? this.getLevelRate(employee.level, 'monthly');
  }

  private getBasePayLabel(payType: PayType): string {
    if (payType === 'daily') return 'Daily Wage';
    if (payType === 'hourly') return 'Hourly Pay';
    if (payType === 'project') return 'Project Pay';
    return 'Base Salary';
  }

  private sumAllowances(allowances?: Allowances): number {
    if (!allowances) return 0;
    return Object.values(allowances).reduce((sum, amount) => sum + (amount || 0), 0);
  }

  private sumBonuses(bonuses?: { amount: number }[]): number {
    if (!bonuses) return 0;
    return bonuses.reduce((sum, bonus) => sum + (bonus.amount || 0), 0);
  }

  private sumDeductions(deductions?: { amount: number }[]): number {
    if (!deductions) return 0;
    return deductions.reduce((sum, deduction) => sum + (deduction.amount || 0), 0);
  }

    private async applyPayrollRules(employee: any): Promise<any> {
        const payType = this.resolvePayType(employee);
        const basePay = this.calculateBasePay(employee, payType);
        const attendancePenalty = this.calculateAttendancePenalty(employee, basePay, payType);
        const overtime = this.calculateOvertimePay(employee, basePay, payType);
        const bonuses = (employee.bonuses || []).map((bonus: any) => ({ ...bonus }));
        const allowances = { ...(employee.allowances || {}) };
        const deductions = (employee.deductions || []).map((deduction: any) => ({ ...deduction }));
        if (attendancePenalty > 0) {
            deductions.push({ amount: attendancePenalty, reason: 'Attendance deduction' });
        }

        const loanDeductions = await this.payrollLoanDeductionService.getLoanDeductionsForEmployee(employee, this.selectedMonth, this.selectedYear);
        loanDeductions.forEach((deduction: { amount: number; reason: string }) => {
            deductions.push({
                amount: deduction.amount,
                reason: deduction.reason
            });
        });

        const totalAllowances = this.sumAllowances(allowances);
        const totalBonuses = this.sumBonuses(bonuses);
        const totalDeductions = this.sumDeductions(deductions);
        const grossPay = basePay + totalAllowances + totalBonuses + overtime.overtimePay;
        const netPayable = grossPay - totalDeductions;

        return {
            ...employee,
            payType,
            basePay,
            basePayLabel: this.getBasePayLabel(payType),
            attendanceSummary: this.getAttendanceSummary(employee),
            attendancePenalty,
            overtimeHours: overtime.overtimeHours,
            overtimePay: overtime.overtimePay,
            deductions,
            totalAllowances,
            totalBonuses,
            totalDeductions,
            grossPay,
            netPayable
        };
    }
    async handlePeriodChange(autoSyncLoanDeductions = true){
    const monthIndex = this.monthNames.indexOf(this.selectedMonth) + 1;
    const currentPayroll = this.payrollRecords.find(
        (payroll) => payroll.year == this.selectedYear && payroll.month == monthIndex
      );

      console.log(this.selectedYear, this.selectedMonth)

        if (currentPayroll) {
                const normalizedPayroll = await Promise.all(currentPayroll.employees.map(emp => this.applyPayrollRules(emp)));
                this.payType = Array.from(new Set(normalizedPayroll.map(emp => emp.type)));
                this.department = Array.from(new Set(normalizedPayroll.map(emp => emp.department)));
                this.level = Array.from(new Set(normalizedPayroll.map(emp => emp.level)));
                this.filteredEmployeePayroll = [...normalizedPayroll];
                this.currentPayroll = [...normalizedPayroll];
            } else {
                this.payType = [];
                this.department = [];
                this.level = [];
                this.filteredEmployeePayroll = [];
                this.currentPayroll = [];
            }
            this.payrollSumary = this.calculatePayrollSummary();

                        if (autoSyncLoanDeductions && this.autoApplyLoanDeductions && this.currentPayroll.length > 0) {
                                void this.syncLoanDeductions({ refreshAfterSync: false, showNoDataMessage: false });
                        }
  }
   
    filterEmployee() {
        const term = (this.searchTerm || '').toLowerCase();
        this.filteredEmployeePayroll = this.currentPayroll.filter(employee => {
            const matchesSearchTerm = !term || employee.name.toLowerCase().includes(term);
            const matchesPay = this.selectedPayType.length === 0 || this.selectedPayType.includes(employee.type);
            const matchesLevel = this.selectedLevel.length === 0 || this.selectedLevel.includes(employee.level);
            const matchesDepartment = this.selectedDepartment.length === 0 || this.selectedDepartment.includes(employee.department);
            return matchesSearchTerm && matchesLevel && matchesDepartment && matchesPay;
        });
    }

    filterBySelectedPayType() {
        if (this.selectedPayType.length == 0 ) {
   
            this.filteredEmployeePayroll = [...this.currentPayroll]; 
          } else {
            this.filteredEmployeePayroll = this.currentPayroll.filter((employee: { type: string; }) => 
                this.selectedPayType.some((type: string) => 
                  employee.type.toLowerCase().includes(type.toLowerCase()) 
                )
              );
          }
    
          if (this.searchTerm && this.searchTerm.trim() !== '') {
            this.filterEmployee();
          }
    }
    filterBySelectedDepartment(){
        console.log(this.selectedDepartment)

        if (this.selectedDepartment.length == 0 ) {
   
            this.filteredEmployeePayroll = [...this.currentPayroll]; 
          } else {
            this.filteredEmployeePayroll = this.currentPayroll.filter((employee: { department: string; }) => 
                this.selectedDepartment.includes(employee.department)
              );
          }
    
          if (this.searchTerm && this.searchTerm.trim() !== '') {
            this.filterEmployee();
          }
    }
    filterBySelectedLevel(){
        console.log(this.selectedLevel)
        if (this.selectedLevel.length == 0 ) {
   
            this.filteredEmployeePayroll = [...this.currentPayroll]; 
          } else {
            this.filteredEmployeePayroll = this.currentPayroll.filter((employee: { level: string; }) => 
                this.selectedLevel.includes(employee.level)
              );
              console.log(this.filteredEmployeePayroll)
          }
    
          if (this.searchTerm && this.searchTerm.trim() !== '') {
            this.filterEmployee();
          }
    }

  generateCSV() {
    if (this.selectedEmployees.length > 0) {
      const csvData = this.convertToCSV(this.selectedEmployees);
      const label = this.selectedEmployees.length === 1
        ? `${this.selectedEmployees[0]?.name}`
        : 'selected employees';
      this.downloadCSV(csvData, `${label} for ${this.selectedMonth + this.selectedYear}_payroll.csv`);
    } else {
      const csvData = this.convertToCSV(this.currentPayroll);
      this.downloadCSV(csvData, `payroll for ${this.selectedMonth + this.selectedYear}.csv`);
    }
  }

  convertToCSV(data: any[]) {
    const headers = ['Employee ID', 'Name', 'Pay type', 'Account Number', 'Bank Name', 'Attendance Deduction', 'Overtime', 'Net Pay'];
    const rows = data.map(employee => [
      employee.id,
      employee.name,
      employee.type,
      employee.accountNumber,
      employee.bank,
      employee.attendancePenalty || 0,
      employee.overtimePay || 0,
      employee.netPayable
    ]);
    
    // Combine headers and rows
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    return csvContent;
  }

  downloadCSV(csvContent: string, filename: string) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
  
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
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

  onSettingsChange() {
    if (!this.selectedMonth || !this.selectedYear) return;
    this.handlePeriodChange();
  }

    onAutoLoanApplyToggle(): void {
        if (!this.autoApplyLoanDeductions || !this.selectedMonth || !this.selectedYear) {
            return;
        }

        if (this.currentPayroll.length > 0) {
            void this.syncLoanDeductions({ refreshAfterSync: false, showNoDataMessage: true });
        }
    }

  viewSummary(){
    this.payrollSumary = this.calculatePayrollSummary()

    this.openSummary = true
  }

        async applyLoanDeductionsToLoans(): Promise<void> {
            await this.syncLoanDeductions({ refreshAfterSync: true, showNoDataMessage: true });
        }

        private async syncLoanDeductions(options: { refreshAfterSync: boolean; showNoDataMessage: boolean }): Promise<void> {
        if (this.isApplyingLoanDeductions) {
            return;
        }

        if (!this.currentPayroll.length || !this.selectedMonth || !this.selectedYear) {
                        if (options.showNoDataMessage) {
                            this.loanDeductionSyncMessage = 'No payroll period selected for loan deduction posting.';
                        }
            return;
        }

        this.isApplyingLoanDeductions = true;
                if (options.showNoDataMessage) {
                    this.loanDeductionSyncMessage = '';
                }

        try {
            // Use getLoanDeductionsForPayroll for batch deduction

            const result = await firstValueFrom(this.payrollLoanDeductionService.getLoanDeductionsForPayroll(this.currentPayroll, this.selectedMonth, Number(this.selectedYear)));
            if (options.showNoDataMessage || (Array.isArray(result) && result.length > 0)) {
                this.loanDeductionSyncMessage = `Loan deductions sync complete: ${Array.isArray(result) ? result.length : 0} employees processed.`;
            }

                        if (options.refreshAfterSync) {
                            this.handlePeriodChange(false);
                        }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unexpected error while syncing loan deductions.';
            this.loanDeductionSyncMessage = `Loan deductions sync failed: ${message}`;
        } finally {
            this.isApplyingLoanDeductions = false;
        }
    }

  calculatePayrollSummary() {
    const payrollSummary = {
      totalSalary: 0,
      totalBonuses: 0,
      totalDeductions: 0,
      totalOvertimePay: 0,
      totalAttendanceDeductions: 0,
      totalAllowances: {
        housingAllowance: 0,
        transportationAllowance: 0,
        mealAllowance: 0,
        healthAllowance: 0,
        carAllowance: 0,
        securityAllowance: 0,
        travelAllowance: 0
      } as Allowances,
      totalNetPayable: 0,
      totalTax: 0, 
      totalInsurance: 0,
      totalPension: 0,
      totalGross: 0
    };
  

    this.currentPayroll.forEach(emp => {
      payrollSummary.totalSalary += emp.basePay ?? 0;
      payrollSummary.totalOvertimePay += emp.overtimePay ?? 0;
      payrollSummary.totalAttendanceDeductions += emp.attendancePenalty ?? 0;

      (emp?.bonuses || []).forEach((bonus: { amount: number; }) => {
        payrollSummary.totalBonuses += bonus.amount;
      });
  

      (emp?.deductions || []).forEach((deduction: { amount: number; reason: string }) => {
        payrollSummary.totalDeductions += deduction.amount;

        if (deduction.reason.toLocaleLowerCase().includes("tax")) {
            payrollSummary.totalTax += deduction.amount || 0;
          }
    
          if (deduction.reason.toLocaleLowerCase().includes("insurance") ) {
            payrollSummary.totalInsurance += deduction.amount || 0;
          }

          if (deduction.reason.toLocaleLowerCase().includes("pension") ) {
            payrollSummary.totalPension += deduction.amount || 0;
          }
      });
  

      const allowances = emp?.allowances || {};
      for (let key in allowances) {
        payrollSummary.totalAllowances[key as keyof Allowances] += allowances[key as keyof Allowances] || 0;
      }
  
      payrollSummary.totalNetPayable += emp?.netPayable;
      payrollSummary.totalGross += emp?.grossPay ?? 0;
    });
  
    return payrollSummary;
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

generatePayroll() {
    this.fetchEmployeeLoading = true
    this.fetchEmployees()
  const payrollData = this.calculatePayroll(); // your local calculation function
  localStorage.setItem('generatedPayroll', JSON.stringify(payrollData));
//   this.filteredEmployeePayroll = payrollData;
//   this.payrollSummary = this.generateSummary(payrollData);
}

calculatePayroll(){

}

  private resetPagination() {
    this.currentPage = 1;
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


      async applyLoanDeductionsToPayroll(period: { month: string; year: number }) {
        this.isApplyingLoanDeductions = true;
        this.loanDeductionSyncMessage = 'Applying loan deductions...';
        try {
            const payrollRows = this.getCurrentPayrollRows();
            // Convert month string to number (1-12)
            const monthIndex = this.monthNames.indexOf(period.month) + 1;
            const result = await firstValueFrom(this.payrollLoanDeductionService.getLoanDeductionsForPayroll(payrollRows, monthIndex, period.year));
            this.loanDeductionSyncMessage = `Loan deductions processed for ${Array.isArray(result) ? result.length : 0} employees.`;
        } catch (error) {
            this.loanDeductionSyncMessage = 'Error applying loan deductions.';
        } finally {
            this.isApplyingLoanDeductions = false;
        }
    }

    getCurrentPayrollRows() {
        // Example: return current payroll employees for the selected period
        // Replace with actual logic as needed
        const currentPeriod = this.payrollRecords.find(
            (payroll) => payroll.year == this.selectedYear && payroll.month == (this.monthNames.indexOf(this.selectedMonth) + 1)
        );
        return currentPeriod?.employees || [];
    }

    
}
