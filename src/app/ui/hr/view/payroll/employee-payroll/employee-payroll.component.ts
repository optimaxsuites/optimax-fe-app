import { Component } from '@angular/core';
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
openSummary: boolean = false
showDropdown = false;
  selectedEmployees: any = [];
  currentEmployeeInView: any = {}

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
    this.payrollSumary = this.calculatePayrollSummary()

    
    this.handlePeriodChange()
      
}
  handlePeriodChange(){
    const currentPayroll = this.payrollRecords.find(
        (payroll) => payroll.year == this.selectedYear && payroll.month == this.monthNames.indexOf(this.selectedMonth) + 1
      );

      console.log(this.selectedYear, this.selectedMonth)

    if (currentPayroll) {
        this.payType = Array.from(new Set(currentPayroll.employeesPayroll.map(emp => emp.type)));
        this.department = Array.from(new Set(currentPayroll.employeesPayroll.map(emp => emp.department)));
        this.level = Array.from(new Set(currentPayroll.employeesPayroll.map(emp => emp.level)));
        this.filteredEmployeePayroll = [...currentPayroll.employeesPayroll];
        this.currentPayroll = [...currentPayroll.employeesPayroll]
      } else {
     
        this.payType = [];
        this.department = [];
        this.level = [];
        this.filteredEmployeePayroll = [];
      }
  }
   
    filterEmployee() {
        this.filteredEmployeePayroll = this.currentPayroll.filter((employee: { name: string; }) => 
            employee.name.toLowerCase().includes(this.searchTerm.toLowerCase())
        );
        this.filteredEmployeePayroll = this.currentPayroll.filter(employee => {
            const matchesSearchTerm = employee.name.toLowerCase().includes(this.searchTerm.toLowerCase());
            const matchesPay = this.selectedPayType.length === 0 || this.selectedPayType.includes(employee.type);
            const matchesLevel = this.selectedLevel.length === 0 || this.selectedLevel.includes(employee.level);
            const matchesDepartment = this.selectedDepartment.length === 0 || this.selectedDepartment.includes(employee.level);
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
      const csvData = this.convertToCSV([this.selectedEmployees]); 
      this.downloadCSV(csvData, `${this.selectedEmployees?.name} for ${this.selectedMonth + this.selectedYear}_payroll.csv`);
    } else {
      const csvData = this.convertToCSV(this.currentPayroll);
      this.downloadCSV(csvData, `payroll for ${this.selectedMonth + this.selectedYear}.csv`);
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
    
  
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    

    document.body.appendChild(link);
    link.click();
    
  
    document.body.removeChild(link);
  }

  viewEmployeePaySLip(employee: any, op:any){
    op.hide()
    this.viewEmployee = true
    this.currentEmployeeInView = employee
  }

  viewSummary(){
    this.payrollSumary = this.calculatePayrollSummary()

    this.openSummary = true
  }
  calculatePayrollSummary() {
    const payrollSummary = {
      totalSalary: 0,
      totalBonuses: 0,
      totalDeductions: 0,
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
        if (emp.type === "salaried") {
            payrollSummary.totalSalary += emp.salary;
        } else if (emp.type === "project-based") {
            payrollSummary.totalSalary += emp.totalProjectPay;
        }



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
  

      for (let key in emp?.allowances) {
        payrollSummary.totalAllowances[key as keyof Allowances] += emp?.allowances[key as keyof Allowances];
      }
  
     


      payrollSummary.totalNetPayable += emp?.netPayable;
    });

    const totalGrossForEmployee = (payrollSummary?.totalSalary || 0)
    + payrollSummary.totalBonuses
    + Object.values(payrollSummary.totalAllowances).reduce((sum, allowance) => sum + (allowance || 0), 0);

  payrollSummary.totalGross += totalGrossForEmployee;
  
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

