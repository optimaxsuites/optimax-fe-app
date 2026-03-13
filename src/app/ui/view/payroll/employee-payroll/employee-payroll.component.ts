import { Component, inject } from '@angular/core';
import { TableAction, TableColumn } from '../../../shared-component/view/table/table.component';
import { LoanPayrollBridgeService } from '../../../service/loan/loan-payroll-bridge.service';
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
private readonly loanPayrollBridgeService = inject(LoanPayrollBridgeService);
isApplyingLoanDeductions = false;
loanDeductionSyncMessage = '';
autoApplyLoanDeductions = true;
    async applyLoanDeductionsToPayroll(period: { month: string; year: number }) {
        this.isApplyingLoanDeductions = true;
        this.loanDeductionSyncMessage = 'Applying loan deductions...';
        try {
            const payrollRows = this.getCurrentPayrollRows();
            const result = await this.loanPayrollBridgeService.postPayrollLoanDeductions(payrollRows, period);
            this.loanDeductionSyncMessage = `Loan deductions applied: ${result.applied}, skipped: ${result.skipped}, failed: ${result.failed}`;
            if (result.errors.length > 0) {
                this.loanDeductionSyncMessage += '\nErrors: ' + result.errors.join('; ');
            }
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
        return currentPeriod?.employeesPayroll || [];
    }
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
    { header: 'Employee', field: 'name', sortable: true, className: 'table-item' },
    { header: 'Level', field: 'level', sortable: true, className: 'table-item' },
    { header: 'Department', field: 'department', sortable: true, className: 'table-item' },
    { header: 'Salary Structure', field: 'type', sortable: true, className: 'table-item' },
    {
      header: 'Attendance Deduction',
      field: 'attendancePenalty',
      sortable: true,
      className: 'table-item',
      formatter: (row) => this.formatCurrency(row?.attendancePenalty ?? 0)
    },
    {
      header: 'Overtime',
      field: 'overtimePay',
      sortable: true,
      className: 'table-item',
      formatter: (row) => this.formatCurrency(row?.overtimePay ?? 0)
    },
    {
      header: 'Amount Payable',
      field: 'netPayable',
      sortable: true,
      className: 'table-item',
      formatter: (row) => this.formatCurrency(row?.netPayable ?? 0)
    }
  ];
  payrollActions: TableAction[] = [
    { id: 'view', label: 'View', icon: 'pi pi-eye' }
  ];

  payrollRecords =[ 
    {
    year: 2024,
    month: 10,
    employeesPayroll: [
        {
            id: 1,
            name: "Adebayo Oluwaseun",
            type: "salaried",
            level: "Senior",
            department: "Sales",
            salary: 6000,
            bonuses: [
                {
                    amount: 500,
                    reason: "Exceeded sales targets"
                },
                {
                    amount: 200,
                    reason: "Client retention success"
                }
            ],
            deductions: [
                {
                    amount: 350,
                    reason: "Tax"
                },
                {
                    amount: 200,
                    reason: "Health insurance"
                },
                {
                    amount: 100,
                    reason: "Pension contribution"
                }
            ],
            accountNumber: "1234567890",
            bank: "First Bank",
            allowances: {
                housingAllowance: 50000,
                transportationAllowance: 30000,
                mealAllowance: 20000,
                healthAllowance: 30000,
                carAllowance: 40000,
                securityAllowance: 25000,
                travelAllowance: 20000,
            },
            netPayable: 6000 + 500 + 200 + 50000 + 30000 + 20000 + 30000 + 40000 + 25000 + 20000 - (350 + 200 + 100)
        },
        {
            id: 2,
            name: "Chinaza Okeke",
            type: "salaried",
            level: "Mid-level",
            department: "Finance",
            salary: 5500,
            bonuses: [
                {
                    amount: 400,
                    reason: "Excellent performance review"
                }
            ],
            deductions: [
                {
                    amount: 330,
                    reason: "Tax"
                },
                {
                    amount: 150,
                    reason: "Pension"
                },
                {
                    amount: 200,
                    reason: "Loan repayment"
                }
            ],
            accountNumber: "2345678901",
            bank: "Zenith Bank",
            allowances: {
                housingAllowance: 45000,
                transportationAllowance: 25000,
                mealAllowance: 18000,
                healthAllowance: 28000,
                carAllowance: 35000,
                securityAllowance: 20000,
                travelAllowance: 15000,
            },
            netPayable: 5500 + 400 + 45000 + 25000 + 18000 + 28000 + 35000 + 20000 + 15000 - (330 + 150 + 200)
        },
        {
            id: 3,
            name: "Idris Mohammed",
            type: "salaried",
            level: "Junior",
            department: "Engineering",
            salary: 4800,
            bonuses: [
                {
                    amount: 300,
                    reason: "Timely project completion"
                }
            ],
            deductions: [
                {
                    amount: 280,
                    reason: "Tax"
                },
                {
                    amount: 150,
                    reason: "Health insurance"
                }
            ],
            accountNumber: "3456789012",
            bank: "GTBank",
            allowances: {
                housingAllowance: 40000,
                transportationAllowance: 20000,
                mealAllowance: 15000,
                healthAllowance: 25000,
                carAllowance: 30000,
                securityAllowance: 15000,
                travelAllowance: 10000,
            },
            netPayable: 4800 + 300 + 40000 + 20000 + 15000 + 25000 + 30000 + 15000 + 10000 - (280 + 150)
        },
        {
            id: 4,
            name: "Yemi Adesanya",
            type: "salaried",
            level: "Mid-level",
            department: "Marketing",
            salary: 5200,
            bonuses: [
                {
                    amount: 350,
                    reason: "Employee of the month"
                }
            ],
            deductions: [
                {
                    amount: 310,
                    reason: "Tax"
                },
                {
                    amount: 160,
                    reason: "Pension"
                }
            ],
            accountNumber: "4567890123",
            bank: "Access Bank",
            allowances: {
                housingAllowance: 42000,
                transportationAllowance: 23000,
                mealAllowance: 17000,
                healthAllowance: 27000,
                carAllowance: 32000,
                securityAllowance: 18000,
                travelAllowance: 12000,
            },
            netPayable: 5200 + 350 + 42000 + 23000 + 17000 + 27000 + 32000 + 18000 + 12000 - (310 + 160)
        },
        {
            id: 5,
            name: "Ifeoma Eze",
            type: "project-based",
            level: "Contract",
            department: "Freelance",
            projects: [
                {
                    projectId: "P201",
                    projectName: "E-commerce Website",
                    projectPay: 2500
                },
                {
                    projectId: "P202",
                    projectName: "Mobile App UI Design",
                    projectPay: 1800
                }
            ],
            totalProjectPay: 2500 + 1800,
            deductions: [
                {
                    amount: 400,
                    reason: "Tax"
                }
            ],
            accountNumber: "5678901234",
            bank: "Union Bank",
            allowances: {
                housingAllowance: 30000,
                transportationAllowance: 15000,
                mealAllowance: 12000,
                healthAllowance: 20000,
                carAllowance: 25000,
                securityAllowance: 10000,
                travelAllowance: 8000,
            },
            netPayable: (2500 + 1800) - 400 + 30000 + 15000 + 12000 + 20000 + 25000 + 10000 + 8000
        },
        {
            id: 6,
            name: "Abubakar Suleiman",
            type: "project-based",
            level: "Contract",
            department: "IT Services",
            projects: [
                {
                    projectId: "P203",
                    projectName: "CRM System",
                    projectPay: 3000
                },
                {
                    projectId: "P204",
                    projectName: "ERP Software Development",
                    projectPay: 3500
                }
            ],
            totalProjectPay: 3000 + 3500,
            deductions: [
                {
                    amount: 600,
                    reason: "Tax"
                }
            ],
            accountNumber: "6789012345",
            bank: "Fidelity Bank",
            allowances: {
                housingAllowance: 60000,
                transportationAllowance: 30000,
                mealAllowance: 25000,
                healthAllowance: 35000,
                carAllowance: 40000,
                securityAllowance: 22000,
                travelAllowance: 18000,
            },
            netPayable: (3000 + 3500) - 600 + 60000 + 30000 + 25000 + 35000 + 40000 + 22000 + 18000
        },
        {
            id: 7,
            name: "Bukola Akinyemi",
            type: "project-based",
            level: "Contract",
            department: "Marketing",
            projects: [
                {
                    projectId: "P205",
                    projectName: "Digital Marketing Campaign",
                    projectPay: 2200
                }
            ],
            totalProjectPay: 2200,
            deductions: [
                {
                    amount: 220,
                    reason: "Tax"
                }
            ],
            accountNumber: "7890123456",
            bank: "Sterling Bank",
            allowances: {
                housingAllowance: 28000,
                transportationAllowance: 12000,
                mealAllowance: 8000,
                healthAllowance: 15000,
                carAllowance: 20000,
                securityAllowance: 9000,
                travelAllowance: 7000,
            },
            netPayable: 2200 - 220 + 28000 + 12000 + 8000 + 15000 + 20000 + 9000 + 7000
        },
        {
            id: 8,
            name: "Kemi Onyekachi",
            type: "salaried",
            level: "Junior",
            department: "Customer Support",
            salary: 4700,
            bonuses: [
                {
                    amount: 250,
                    reason: "Successful client acquisition"
                }
            ],
            deductions: [
                {
                    amount: 270,
                    reason: "Tax"
                },
                {
                    amount: 120,
                    reason: "Health insurance"
                }
            ],
            accountNumber: "8901234567",
            bank: "EcoBank",
            allowances: {
                housingAllowance: 35000,
                transportationAllowance: 18000,
                mealAllowance: 13000,
                healthAllowance: 22000,
                carAllowance: 25000,
                securityAllowance: 14000,
                travelAllowance: 10000,
            },
            netPayable: 4700 + 250 + 35000 + 18000 + 13000 + 22000 + 25000 + 14000 + 10000 - (270 + 120)
        },
        {
            id: 9,
            name: "Ngozi Dike",
            type: "salaried",
            level: "Senior",
            department: "Research",
            salary: 6200,
            bonuses: [
                {
                    amount: 600,
                    reason: "Outstanding research project"
                }
            ],
            deductions: [
                {
                    amount: 400,
                    reason: "Tax"
                }
            ],
            accountNumber: "9012345678",
            bank: "United Bank for Africa",
            allowances: {
                housingAllowance: 75000,
                transportationAllowance: 40000,
                mealAllowance: 25000,
                healthAllowance: 30000,
                carAllowance: 45000,
                securityAllowance: 20000,
                travelAllowance: 18000,
            },
            netPayable: 6200 + 600 + 75000 + 40000 + 25000 + 30000 + 45000 + 20000 + 18000 - 400
        },
        {
            id: 10,
            name: "James Onuoha",
            type: "project-based",
            level: "Contract",
            department: "Consulting",
            projects: [
                {
                    projectId: "P206",
                    projectName: "Consulting for a startup",
                    projectPay: 4000
                }
            ],
            totalProjectPay: 4000,
            deductions: [
                {
                    amount: 350,
                    reason: "Tax"
                }
            ],
            accountNumber: "0123456789",
            bank: "Polaris Bank",
            allowances: {
                housingAllowance: 60000,
                transportationAllowance: 30000,
                mealAllowance: 20000,
                healthAllowance: 25000,
                carAllowance: 35000,
                securityAllowance: 18000,
                travelAllowance: 15000,
            },
            netPayable: 4000 - 350 + 60000 + 30000 + 20000 + 25000 + 35000 + 18000 + 15000
        }
    ]
    }, 
    {
    year: 2024,
    month: 9, // September
    employeesPayroll: [
        {
            id: 1,
            name: "Adebayo Oluwaseun",
            type: "salaried",
            level: "Senior",
            department: "Sales",
            salary: 6000,
            bonuses: [
                {
                    amount: 400,
                    reason: "New client acquisition"
                },
                {
                    amount: 150,
                    reason: "Referral bonus"
                }
            ],
            deductions: [
                {
                    amount: 300,
                    reason: "Tax"
                },
                {
                    amount: 250,
                    reason: "Health insurance"
                },
                {
                    amount: 120,
                    reason: "Pension contribution"
                }
            ],
            accountNumber: "1234567890",
            bank: "First Bank",
            allowances: {
                housingAllowance: 50000,
                transportationAllowance: 30000,
                mealAllowance: 20000,
                healthAllowance: 30000,
                carAllowance: 40000,
                securityAllowance: 25000,
                travelAllowance: 20000,
            },
            netPayable: 6000 + 400 + 150 + 50000 + 30000 + 20000 + 30000 + 40000 + 25000 + 20000 - (300 + 250 + 120)
        },
        {
            id: 2,
            name: "Chinaza Okeke",
            type: "salaried",
            level: "Mid-level",
            department: "Finance",
            salary: 5500,
            bonuses: [
                {
                    amount: 300,
                    reason: "Completed budget audit"
                }
            ],
            deductions: [
                {
                    amount: 310,
                    reason: "Tax"
                },
                {
                    amount: 180,
                    reason: "Pension"
                },
                {
                    amount: 170,
                    reason: "Loan repayment"
                }
            ],
            accountNumber: "2345678901",
            bank: "Zenith Bank",
            allowances: {
                housingAllowance: 45000,
                transportationAllowance: 25000,
                mealAllowance: 18000,
                healthAllowance: 28000,
                carAllowance: 35000,
                securityAllowance: 20000,
                travelAllowance: 15000,
            },
            netPayable: 5500 + 300 + 45000 + 25000 + 18000 + 28000 + 35000 + 20000 + 15000 - (310 + 180 + 170)
        },
        {
            id: 3,
            name: "Idris Mohammed",
            type: "salaried",
            level: "Junior",
            department: "Engineering",
            salary: 4800,
            bonuses: [
                {
                    amount: 250,
                    reason: "Team leadership in project"
                }
            ],
            deductions: [
                {
                    amount: 290,
                    reason: "Tax"
                },
                {
                    amount: 160,
                    reason: "Health insurance"
                }
            ],
            accountNumber: "3456789012",
            bank: "GTBank",
            allowances: {
                housingAllowance: 40000,
                transportationAllowance: 20000,
                mealAllowance: 15000,
                healthAllowance: 25000,
                carAllowance: 30000,
                securityAllowance: 15000,
                travelAllowance: 10000,
            },
            netPayable: 4800 + 250 + 40000 + 20000 + 15000 + 25000 + 30000 + 15000 + 10000 - (290 + 160)
        },
        {
            id: 4,
            name: "Yemi Adesanya",
            type: "salaried",
            level: "Mid-level",
            department: "Marketing",
            salary: 5200,
            bonuses: [
                {
                    amount: 320,
                    reason: "Exceeded marketing KPIs"
                }
            ],
            deductions: [
                {
                    amount: 320,
                    reason: "Tax"
                },
                {
                    amount: 170,
                    reason: "Pension"
                }
            ],
            accountNumber: "4567890123",
            bank: "Access Bank",
            allowances: {
                housingAllowance: 42000,
                transportationAllowance: 23000,
                mealAllowance: 17000,
                healthAllowance: 27000,
                carAllowance: 32000,
                securityAllowance: 18000,
                travelAllowance: 12000,
            },
            netPayable: 5200 + 320 + 42000 + 23000 + 17000 + 27000 + 32000 + 18000 + 12000 - (320 + 170)
        },
        {
            id: 5,
            name: "Ifeoma Eze",
            type: "project-based",
            level: "Contract",
            department: "Freelance",
            projects: [
                {
                    projectId: "P201",
                    projectName: "E-commerce Website",
                    projectPay: 2700
                },
                {
                    projectId: "P202",
                    projectName: "Mobile App UI Design",
                    projectPay: 1900
                }
            ],
            totalProjectPay: 2700 + 1900,
            deductions: [
                {
                    amount: 430,
                    reason: "Tax"
                }
            ],
            accountNumber: "5678901234",
            bank: "Union Bank",
            allowances: {
                housingAllowance: 30000,
                transportationAllowance: 15000,
                mealAllowance: 12000,
                healthAllowance: 20000,
                carAllowance: 25000,
                securityAllowance: 10000,
                travelAllowance: 8000,
            },
            netPayable: (2700 + 1900) - 430 + 30000 + 15000 + 12000 + 20000 + 25000 + 10000 + 8000
        },
        {
            id: 6,
            name: "Abubakar Suleiman",
            type: "project-based",
            level: "Contract",
            department: "IT Services",
            projects: [
                {
                    projectId: "P203",
                    projectName: "CRM System",
                    projectPay: 3100
                },
                {
                    projectId: "P204",
                    projectName: "ERP Software Development",
                    projectPay: 3600
                }
            ],
            totalProjectPay: 3100 + 3600,
            deductions: [
                {
                    amount: 650,
                    reason: "Tax"
                }
            ],
            accountNumber: "6789012345",
            bank: "Fidelity Bank",
            allowances: {
                housingAllowance: 60000,
                transportationAllowance: 30000,
                mealAllowance: 25000,
                healthAllowance: 35000,
                carAllowance: 40000,
                securityAllowance: 22000,
                travelAllowance: 18000,
            },
            netPayable: (3100 + 3600) - 650 + 60000 + 30000 + 25000 + 35000 + 40000 + 22000 + 18000
        },
        {
            id: 7,
            name: "Bukola Akinyemi",
            type: "project-based",
            level: "Contract",
            department: "Marketing",
            projects: [
                {
                    projectId: "P205",
                    projectName: "Digital Marketing Campaign",
                    projectPay: 2300
                }
            ],
            totalProjectPay: 2300,
            deductions: [
                {
                    amount: 230,
                    reason: "Tax"
                }
            ],
            accountNumber: "7890123456",
            bank: "Sterling Bank",
            allowances: {
                housingAllowance: 28000,
                transportationAllowance: 12000,
                mealAllowance: 8000,
                healthAllowance: 15000,
                carAllowance: 20000,
                securityAllowance: 9000,
                travelAllowance: 7000,
            },
            netPayable: 2300 - 230 + 28000 + 12000 + 8000 + 15000 + 20000 + 9000 + 7000
        },
        {
            id: 8,
            name: "Kemi Onyekachi",
            type: "salaried",
            level: "Junior",
            department: "Customer Support",
            salary: 4700,
            bonuses: [
                {
                    amount: 300,
                    reason: "Increased customer satisfaction"
                }
            ],
            deductions: [
                {
                    amount: 280,
                    reason: "Tax"
                },
                {
                    amount: 130,
                    reason: "Health insurance"
                }
            ],
            accountNumber: "8901234567",
            bank: "EcoBank",
            allowances: {
                housingAllowance: 35000,
                transportationAllowance: 18000,
                mealAllowance: 13000,
                healthAllowance: 22000,
                carAllowance: 25000,
                securityAllowance: 14000,
                travelAllowance: 10000,
            },
            netPayable: 4700 + 300 + 35000 + 18000 + 13000 + 22000 + 25000 + 14000 + 10000 - (280 + 130)
        },
        {
            id: 9,
            name: "Aminu Adamu",
            type: "salaried",
            level: "Senior",
            department: "Engineering",
            salary: 6800,
            bonuses: [
                {
                    amount: 500,
                    reason: "Project success"
                }
            ],
            deductions: [
                {
                    amount: 400,
                    reason: "Tax"
                },
                {
                    amount: 230,
                    reason: "Pension"
                }
            ],
            accountNumber: "9012345678",
            bank: "Stanbic IBTC",
            allowances: {
                housingAllowance: 52000,
                transportationAllowance: 30000,
                mealAllowance: 24000,
                healthAllowance: 30000,
                carAllowance: 45000,
                securityAllowance: 27000,
                travelAllowance: 22000,
            },
            netPayable: 6800 + 500 + 52000 + 30000 + 24000 + 30000 + 45000 + 27000 + 22000 - (400 + 230)
        }
    ]
    },
    {
        year: 2022,
        month: 10, 
        employeesPayroll: [
            {
                id: 1,
                name: "Adebayo Oluwaseun",
                type: "salaried",
                level: "Senior",
                department: "Sales",
                salary: 6000,
                bonuses: [
                    {
                        amount: 300,
                        reason: "Performance bonus"
                    }
                ],
                deductions: [
                    {
                        amount: 280,
                        reason: "Tax"
                    },
                    {
                        amount: 220,
                        reason: "Health insurance"
                    },
                    {
                        amount: 110,
                        reason: "Pension contribution"
                    }
                ],
                accountNumber: "1234567890",
                bank: "First Bank",
                allowances: {
                    housingAllowance: 50000,
                    transportationAllowance: 30000,
                    mealAllowance: 20000,
                    healthAllowance: 30000,
                    carAllowance: 40000,
                    securityAllowance: 25000,
                    travelAllowance: 20000,
                },
                netPayable: 6000 + 300 + 50000 + 30000 + 20000 + 30000 + 40000 + 25000 + 20000 - (280 + 220 + 110)
            },
            {
                id: 2,
                name: "Chinaza Okeke",
                type: "salaried",
                level: "Mid-level",
                department: "Finance",
                salary: 5500,
                bonuses: [
                    {
                        amount: 250,
                        reason: "Quarterly bonus"
                    }
                ],
                deductions: [
                    {
                        amount: 310,
                        reason: "Tax"
                    },
                    {
                        amount: 190,
                        reason: "Pension"
                    },
                    {
                        amount: 170,
                        reason: "Loan repayment"
                    }
                ],
                accountNumber: "2345678901",
                bank: "Zenith Bank",
                allowances: {
                    housingAllowance: 45000,
                    transportationAllowance: 25000,
                    mealAllowance: 18000,
                    healthAllowance: 28000,
                    carAllowance: 35000,
                    securityAllowance: 20000,
                    travelAllowance: 15000,
                },
                netPayable: 5500 + 250 + 45000 + 25000 + 18000 + 28000 + 35000 + 20000 + 15000 - (310 + 190 + 170)
            },
            {
                id: 3,
                name: "Idris Mohammed",
                type: "salaried",
                level: "Junior",
                department: "Engineering",
                salary: 4800,
                bonuses: [
                    {
                        amount: 200,
                        reason: "Project completion"
                    }
                ],
                deductions: [
                    {
                        amount: 280,
                        reason: "Tax"
                    },
                    {
                        amount: 150,
                        reason: "Health insurance"
                    }
                ],
                accountNumber: "3456789012",
                bank: "GTBank",
                allowances: {
                    housingAllowance: 40000,
                    transportationAllowance: 20000,
                    mealAllowance: 15000,
                    healthAllowance: 25000,
                    carAllowance: 30000,
                    securityAllowance: 15000,
                    travelAllowance: 10000,
                },
                netPayable: 4800 + 200 + 40000 + 20000 + 15000 + 25000 + 30000 + 15000 + 10000 - (280 + 150)
            },
            {
                id: 4,
                name: "Yemi Adesanya",
                type: "salaried",
                level: "Mid-level",
                department: "Marketing",
                salary: 5200,
                bonuses: [
                    {
                        amount: 310,
                        reason: "Campaign success"
                    }
                ],
                deductions: [
                    {
                        amount: 320,
                        reason: "Tax"
                    },
                    {
                        amount: 180,
                        reason: "Pension"
                    }
                ],
                accountNumber: "4567890123",
                bank: "Access Bank",
                allowances: {
                    housingAllowance: 42000,
                    transportationAllowance: 23000,
                    mealAllowance: 17000,
                    healthAllowance: 27000,
                    carAllowance: 32000,
                    securityAllowance: 18000,
                    travelAllowance: 12000,
                },
                netPayable: 5200 + 310 + 42000 + 23000 + 17000 + 27000 + 32000 + 18000 + 12000 - (320 + 180)
            },
            {
                id: 5,
                name: "Ifeoma Eze",
                type: "project-based",
                level: "Contract",
                department: "Freelance",
                projects: [
                    {
                        projectId: "P201",
                        projectName: "Web App Development",
                        projectPay: 2600
                    }
                ],
                totalProjectPay: 2600,
                deductions: [
                    {
                        amount: 430,
                        reason: "Tax"
                    }
                ],
                accountNumber: "5678901234",
                bank: "Union Bank",
                allowances: {
                    housingAllowance: 30000,
                    transportationAllowance: 15000,
                    mealAllowance: 12000,
                    healthAllowance: 20000,
                    carAllowance: 25000,
                    securityAllowance: 10000,
                    travelAllowance: 8000,
                },
                netPayable: 2600 - 430 + 30000 + 15000 + 12000 + 20000 + 25000 + 10000 + 8000
            },
            {
                id: 6,
                name: "Abubakar Suleiman",
                type: "project-based",
                level: "Contract",
                department: "IT Services",
                projects: [
                    {
                        projectId: "P202",
                        projectName: "Data Migration",
                        projectPay: 3400
                    }
                ],
                totalProjectPay: 3400,
                deductions: [
                    {
                        amount: 620,
                        reason: "Tax"
                    }
                ],
                accountNumber: "6789012345",
                bank: "Fidelity Bank",
                allowances: {
                    housingAllowance: 60000,
                    transportationAllowance: 30000,
                    mealAllowance: 25000,
                    healthAllowance: 35000,
                    carAllowance: 40000,
                    securityAllowance: 22000,
                    travelAllowance: 18000,
                },
                netPayable: 3400 - 620 + 60000 + 30000 + 25000 + 35000 + 40000 + 22000 + 18000
            },
            {
                id: 7,
                name: "Bukola Akinyemi",
                type: "project-based",
                level: "Contract",
                department: "Marketing",
                projects: [
                    {
                        projectId: "P203",
                        projectName: "SEO Optimization",
                        projectPay: 2000
                    }
                ],
                totalProjectPay: 2000,
                deductions: [
                    {
                        amount: 200,
                        reason: "Tax"
                    }
                ],
                accountNumber: "7890123456",
                bank: "Sterling Bank",
                allowances: {
                    housingAllowance: 28000,
                    transportationAllowance: 12000,
                    mealAllowance: 8000,
                    healthAllowance: 15000,
                    carAllowance: 20000,
                    securityAllowance: 9000,
                    travelAllowance: 7000,
                },
                netPayable: 2000 - 200 + 28000 + 12000 + 8000 + 15000 + 20000 + 9000 + 7000
            },
            {
                id: 8,
                name: "Kemi Onyekachi",
                type: "salaried",
                level: "Junior",
                department: "Customer Support",
                salary: 4700,
                bonuses: [
                    {
                        amount: 280,
                        reason: "Customer service recognition"
                    }
                ],
                deductions: [
                    {
                        amount: 270,
                        reason: "Tax"
                    },
                    {
                        amount: 120,
                        reason: "Health insurance"
                    }
                ],
                accountNumber: "8901234567",
                bank: "EcoBank",
                allowances: {
                    housingAllowance: 35000,
                    transportationAllowance: 18000,
                    mealAllowance: 13000,
                    healthAllowance: 22000,
                    carAllowance: 25000,
                    securityAllowance: 14000,
                    travelAllowance: 10000,
                },
                netPayable: 4700 + 280 + 35000 + 18000 + 13000 + 22000 + 25000 + 14000 + 10000 - (270 + 120)
            },
            {
                id: 9,
                name: "Aminu Adamu",
                type: "salaried",
                level: "Senior",
                department: "Engineering",
                salary: 6800,
                bonuses: [
                    {
                        amount: 450,
                        reason: "System upgrade success"
                    }
                ],
                deductions: [
                    {
                        amount: 400,
                        reason: "Tax"
                    },
                    {
                        amount: 220,
                        reason: "Pension"
                    }
                ],
                accountNumber: "9012345678",
                bank: "Stanbic IBTC",
                allowances: {
                    housingAllowance: 50000,
                    transportationAllowance: 29000,
                    mealAllowance: 23000,
                    healthAllowance: 28000,
                    carAllowance: 44000,
                    securityAllowance: 26000,
                    travelAllowance: 21000,
                },
                netPayable: 6800 + 450 + 50000 + 29000 + 23000 + 28000 + 44000 + 26000 + 21000 - (400 + 220)
            }
        ]
    }
    
] 
// employeePayroll = [
//     {
//         id: 1,
//         name: "Adebayo Oluwaseun",
//         type: "salaried",
//         level: "Senior",
//         department: "Sales",
//         salary: 6000,
//         bonuses: [
//             {
//                 amount: 500,
//                 reason: "Exceeded sales targets"
//             },
//             {
//                 amount: 200,
//                 reason: "Client retention success"
//             }
//         ],
//         deductions: [
//             {
//                 amount: 350,
//                 reason: "Tax"
//             },
//             {
//                 amount: 200,
//                 reason: "Health insurance"
//             },
//             {
//                 amount: 100,
//                 reason: "Pension contribution"
//             }
//         ],
//         accountNumber: "1234567890",
//         bank: "First Bank",
//         allowances: {
//             housingAllowance: 50000,
//             transportationAllowance: 30000,
//             mealAllowance: 20000,
//             healthAllowance: 30000,
//             carAllowance: 40000,
//             securityAllowance: 25000,
//             travelAllowance: 20000,
//         },
//         netPayable: 6000 + 500 + 200 + 50000 + 30000 + 20000 + 30000 + 40000 + 25000 + 20000 - (350 + 200 + 100)
//     },
//     {
//         id: 2,
//         name: "Chinaza Okeke",
//         type: "salaried",
//         level: "Mid-level",
//         department: "Finance",
//         salary: 5500,
//         bonuses: [
//             {
//                 amount: 400,
//                 reason: "Excellent performance review"
//             }
//         ],
//         deductions: [
//             {
//                 amount: 330,
//                 reason: "Tax"
//             },
//             {
//                 amount: 150,
//                 reason: "Pension"
//             },
//             {
//                 amount: 200,
//                 reason: "Loan repayment"
//             }
//         ],
//         accountNumber: "2345678901",
//         bank: "Zenith Bank",
//         allowances: {
//             housingAllowance: 45000,
//             transportationAllowance: 25000,
//             mealAllowance: 18000,
//             healthAllowance: 28000,
//             carAllowance: 35000,
//             securityAllowance: 20000,
//             travelAllowance: 15000,
//         },
//         netPayable: 5500 + 400 + 45000 + 25000 + 18000 + 28000 + 35000 + 20000 + 15000 - (330 + 150 + 200)
//     },
//     {
//         id: 3,
//         name: "Idris Mohammed",
//         type: "salaried",
//         level: "Junior",
//         department: "Engineering",
//         salary: 4800,
//         bonuses: [
//             {
//                 amount: 300,
//                 reason: "Timely project completion"
//             }
//         ],
//         deductions: [
//             {
//                 amount: 280,
//                 reason: "Tax"
//             },
//             {
//                 amount: 150,
//                 reason: "Health insurance"
//             }
//         ],
//         accountNumber: "3456789012",
//         bank: "GTBank",
//         allowances: {
//             housingAllowance: 40000,
//             transportationAllowance: 20000,
//             mealAllowance: 15000,
//             healthAllowance: 25000,
//             carAllowance: 30000,
//             securityAllowance: 15000,
//             travelAllowance: 10000,
//         },
//         netPayable: 4800 + 300 + 40000 + 20000 + 15000 + 25000 + 30000 + 15000 + 10000 - (280 + 150)
//     },
//     {
//         id: 4,
//         name: "Yemi Adesanya",
//         type: "salaried",
//         level: "Mid-level",
//         department: "Marketing",
//         salary: 5200,
//         bonuses: [
//             {
//                 amount: 350,
//                 reason: "Employee of the month"
//             }
//         ],
//         deductions: [
//             {
//                 amount: 310,
//                 reason: "Tax"
//             },
//             {
//                 amount: 160,
//                 reason: "Pension"
//             }
//         ],
//         accountNumber: "4567890123",
//         bank: "Access Bank",
//         allowances: {
//             housingAllowance: 42000,
//             transportationAllowance: 23000,
//             mealAllowance: 17000,
//             healthAllowance: 27000,
//             carAllowance: 32000,
//             securityAllowance: 18000,
//             travelAllowance: 12000,
//         },
//         netPayable: 5200 + 350 + 42000 + 23000 + 17000 + 27000 + 32000 + 18000 + 12000 - (310 + 160)
//     },
//     {
//         id: 5,
//         name: "Ifeoma Eze",
//         type: "project-based",
//         level: "Contract",
//         department: "Freelance",
//         projects: [
//             {
//                 projectId: "P201",
//                 projectName: "E-commerce Website",
//                 projectPay: 2500
//             },
//             {
//                 projectId: "P202",
//                 projectName: "Mobile App UI Design",
//                 projectPay: 1800
//             }
//         ],
//         totalProjectPay: 2500 + 1800,
//         deductions: [
//             {
//                 amount: 400,
//                 reason: "Tax"
//             }
//         ],
//         accountNumber: "5678901234",
//         bank: "Union Bank",
//         allowances: {
//             housingAllowance: 30000,
//             transportationAllowance: 15000,
//             mealAllowance: 12000,
//             healthAllowance: 20000,
//             carAllowance: 25000,
//             securityAllowance: 10000,
//             travelAllowance: 8000,
//         },
//         netPayable: (2500 + 1800) - 400 + 30000 + 15000 + 12000 + 20000 + 25000 + 10000 + 8000
//     },
//     {
//         id: 6,
//         name: "Abubakar Suleiman",
//         type: "project-based",
//         level: "Contract",
//         department: "IT Services",
//         projects: [
//             {
//                 projectId: "P203",
//                 projectName: "CRM System",
//                 projectPay: 3000
//             },
//             {
//                 projectId: "P204",
//                 projectName: "ERP Software Development",
//                 projectPay: 3500
//             }
//         ],
//         totalProjectPay: 3000 + 3500,
//         deductions: [
//             {
//                 amount: 600,
//                 reason: "Tax"
//             }
//         ],
//         accountNumber: "6789012345",
//         bank: "Fidelity Bank",
//         allowances: {
//             housingAllowance: 60000,
//             transportationAllowance: 30000,
//             mealAllowance: 25000,
//             healthAllowance: 35000,
//             carAllowance: 40000,
//             securityAllowance: 22000,
//             travelAllowance: 18000,
//         },
//         netPayable: (3000 + 3500) - 600 + 60000 + 30000 + 25000 + 35000 + 40000 + 22000 + 18000
//     },
//     {
//         id: 7,
//         name: "Bukola Akinyemi",
//         type: "project-based",
//         level: "Contract",
//         department: "Marketing",
//         projects: [
//             {
//                 projectId: "P205",
//                 projectName: "Digital Marketing Campaign",
//                 projectPay: 2200
//             }
//         ],
//         totalProjectPay: 2200,
//         deductions: [
//             {
//                 amount: 220,
//                 reason: "Tax"
//             }
//         ],
//         accountNumber: "7890123456",
//         bank: "Sterling Bank",
//         allowances: {
//             housingAllowance: 28000,
//             transportationAllowance: 12000,
//             mealAllowance: 8000,
//             healthAllowance: 15000,
//             carAllowance: 20000,
//             securityAllowance: 9000,
//             travelAllowance: 7000,
//         },
//         netPayable: 2200 - 220 + 28000 + 12000 + 8000 + 15000 + 20000 + 9000 + 7000
//     },
//     {
//         id: 8,
//         name: "Kemi Onyekachi",
//         type: "salaried",
//         level: "Junior",
//         department: "Customer Support",
//         salary: 4700,
//         bonuses: [
//             {
//                 amount: 250,
//                 reason: "Successful client acquisition"
//             }
//         ],
//         deductions: [
//             {
//                 amount: 270,
//                 reason: "Tax"
//             },
//             {
//                 amount: 120,
//                 reason: "Health insurance"
//             }
//         ],
//         accountNumber: "8901234567",
//         bank: "EcoBank",
//         allowances: {
//             housingAllowance: 35000,
//             transportationAllowance: 18000,
//             mealAllowance: 13000,
//             healthAllowance: 22000,
//             carAllowance: 25000,
//             securityAllowance: 14000,
//             travelAllowance: 10000,
//         },
//         netPayable: 4700 + 250 + 35000 + 18000 + 13000 + 22000 + 25000 + 14000 + 10000 - (270 + 120)
//     },
//     {
//         id: 9,
//         name: "Ngozi Dike",
//         type: "salaried",
//         level: "Senior",
//         department: "Research",
//         salary: 6200,
//         bonuses: [
//             {
//                 amount: 600,
//                 reason: "Outstanding research project"
//             }
//         ],
//         deductions: [
//             {
//                 amount: 400,
//                 reason: "Tax"
//             }
//         ],
//         accountNumber: "9012345678",
//         bank: "United Bank for Africa",
//         allowances: {
//             housingAllowance: 75000,
//             transportationAllowance: 40000,
//             mealAllowance: 25000,
//             healthAllowance: 30000,
//             carAllowance: 45000,
//             securityAllowance: 20000,
//             travelAllowance: 18000,
//         },
//         netPayable: 6200 + 600 + 75000 + 40000 + 25000 + 30000 + 45000 + 20000 + 18000 - 400
//     },
//     {
//         id: 10,
//         name: "James Onuoha",
//         type: "project-based",
//         level: "Contract",
//         department: "Consulting",
//         projects: [
//             {
//                 projectId: "P206",
//                 projectName: "Consulting for a startup",
//                 projectPay: 4000
//             }
//         ],
//         totalProjectPay: 4000,
//         deductions: [
//             {
//                 amount: 350,
//                 reason: "Tax"
//             }
//         ],
//         accountNumber: "0123456789",
//         bank: "Polaris Bank",
//         allowances: {
//             housingAllowance: 60000,
//             transportationAllowance: 30000,
//             mealAllowance: 20000,
//             healthAllowance: 25000,
//             carAllowance: 35000,
//             securityAllowance: 18000,
//             travelAllowance: 15000,
//         },
//         netPayable: 4000 - 350 + 60000 + 30000 + 20000 + 25000 + 35000 + 18000 + 15000
//     }
// ];
showCalendar = false;
selectedMonth: any
selectedYear: any 
monthNames = [
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
];
months:any[] = [];
years: any[] = [];
filteredEmployeePayroll: any[] = []
currentPayroll: any[] = []
payrollSumary = {}
constructor(){
    this.generateYears();
    this.selectedMonth = this.months[new Date().getMonth()]; 
    
}
ngOnInit(){

    this.years =  Array.from(new Set(this.payrollRecords.map(emp => emp.year))).sort((a, b) => a - b);
    const monthIndices = Array.from(new Set(this.payrollRecords.map(emp => emp.month - 1))); 
    this.months = monthIndices.map(index => this.monthNames[index]).sort((a, b) => this.monthNames.indexOf(a) - this.monthNames.indexOf(b))
    this.selectedMonth = this.months[this.months.length - 1]
    this.selectedYear = this.years[this.years.length - 1]
    this.handlePeriodChange()
      
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

  private applyPayrollRules(employee: any): any {
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

        const loanDeductions = this.loanPayrollBridgeService.getLoanDeductionsForEmployee(employee);
        loanDeductions.forEach((deduction) => {
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
    loanDeductions,
      grossPay,
      totalDeductions,
      netPayable
    };
  }
    handlePeriodChange(autoSyncLoanDeductions = true){
    const monthIndex = this.monthNames.indexOf(this.selectedMonth) + 1;
    const currentPayroll = this.payrollRecords.find(
        (payroll) => payroll.year == this.selectedYear && payroll.month == monthIndex
      );

      console.log(this.selectedYear, this.selectedMonth)

    if (currentPayroll) {
        const normalizedPayroll = currentPayroll.employeesPayroll.map(emp => this.applyPayrollRules(emp));
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
            const result = await this.loanPayrollBridgeService.postPayrollLoanDeductions(this.currentPayroll, {
                month: this.selectedMonth,
                year: Number(this.selectedYear)
            });

                        if (options.showNoDataMessage || result.applied > 0 || result.failed > 0) {
                            this.loanDeductionSyncMessage = `Loan deductions sync complete: ${result.applied} applied, ${result.skipped} skipped, ${result.failed} failed.`;
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

}
