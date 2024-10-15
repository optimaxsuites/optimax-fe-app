import { Component } from '@angular/core';

@Component({
  selector: 'app-employee-payroll',
  templateUrl: './employee-payroll.component.html',
  styleUrl: './employee-payroll.component.scss'
})
export class EmployeePayrollComponent {
payType: any[] =[]
selectedPayType: any;
department:  any[] = []
selectedDepartment: any;
selectedLevel: any;
searchTerm: any;
level: any[] = []
viewEmployee: boolean = false
  selectedEmployees: any = [];
  currentEmployeeInView: any = {}
employeePayroll = [
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
];



ngOnInit(){
 this.payType = Array.from(new Set(this.employeePayroll.map(emp => emp.type)));
    this.department = Array.from(new Set(this.employeePayroll.map(emp => emp.level)));
    this.level = Array.from(new Set(this.employeePayroll.map(emp => emp.department)));
}
  
filterBySelectedPayType() {
  throw new Error('Method not implemented.');
  }
filterEmployee() {
    throw new Error('Method not implemented.');
  }
  filterBySelectedDepartment(){

  }
  filterBySelectedLevel(){

  }

  generateCSV() {
    if (this.selectedEmployees.length > 0) {
      const csvData = this.convertToCSV([this.selectedEmployees]); 
      this.downloadCSV(csvData, `${this.selectedEmployees?.name}_payroll.csv`);
    } else {
      const csvData = this.convertToCSV(this.employeePayroll);
      this.downloadCSV(csvData, 'payroll.csv');
    }
  }

  convertToCSV(data: any[]) {
    const headers = ['Employee ID', 'Name', 'Pay type', 'Account Number', 'Bank Name', 'Net Pay'];
    const rows = data.map(employee => [
      employee.id,
      employee.name,
      employee.type,
      employee.accountNumber,
      employee.bank,
      employee.netPayable
    ]);
    
    // Combine headers and rows
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    return csvContent;
  }

  downloadCSV(csvContent: string, filename: string) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    // Create a link element
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    
    // Append the link to the body
    document.body.appendChild(link);
    link.click();
    
    // Clean up and remove the link
    document.body.removeChild(link);
  }

  viewEmployeePaySLip(employee: any){
    this.viewEmployee = true
    this.currentEmployeeInView = employee
  }
}
