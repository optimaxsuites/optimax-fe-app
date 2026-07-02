import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NavigationLinksService } from '../../sharedComponent/service/navigation-links/navigation-links.service';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { LargeSideModalComponent } from '../../sharedComponent/view/large-side-modal/large-side-modal.component';

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.scss'],
})
export class DashboardPageComponent {

  token!: string;
  viewSlip: boolean = false
  activeSlip: any = {}

employee =  {
  id: 'tok123abc', // Example token value
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
}
employeePayslipHistory = {
  id: "tok123abc" ,
  name: "Okafor Chukwuemeka",
  type: "salaried",
  level: "Senior",
  department: "Sales",
  accountNumber: "1234567890",
  bank: "GTBank",
  detail: [
    { id: 1,
    year: 2024,
    month: 10, 
    salary: 6000,
      status: "paid",

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
    
    allowances: {
        housingAllowance: 50000,
        transportationAllowance: 30000,
        mealAllowance: 20000,
        healthAllowance: 30000,
        carAllowance: 40000,
        securityAllowance: 25000,
        travelAllowance: 20000,
    },
    netPayable: 6000 + 300 + 50000 + 30000 + 20000 + 30000 + 40000 + 25000 + 20000 - (280 + 220 + 110)},
    { id: 2,
      year: 2024,
      month: 9, 
      salary: 6000,
      status: "paid",
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
      allowances: {
          housingAllowance: 45000,
          transportationAllowance: 25000,
          mealAllowance: 18000,
          healthAllowance: 28000,
          carAllowance: 35000,
          securityAllowance: 20000,
          travelAllowance: 15000,
      },
      netPayable: 6000 + 250 + 45000 + 25000 + 18000 + 28000 + 35000 + 20000 + 15000 - (310 + 190 + 170)},
    { id: 3,
      year: 2024,
      month: 8, 
        salary: 6000,
      status: "paid",

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
        allowances: {
            housingAllowance: 45000,
            transportationAllowance: 25000,
            mealAllowance: 18000,
            healthAllowance: 28000,
            carAllowance: 35000,
            securityAllowance: 20000,
            travelAllowance: 15000,
        },
        netPayable: 6000 + 250 + 45000 + 25000 + 18000 + 28000 + 35000 + 20000 + 15000 - (310 + 190 + 170)},
    { id: 4,
      year: 2024,
      month: 7, 
        salary: 6000,
      status: "paid",

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
        allowances: {
            housingAllowance: 40000,
            transportationAllowance: 20000,
            mealAllowance: 15000,
            healthAllowance: 25000,
            carAllowance: 30000,
            securityAllowance: 15000,
            travelAllowance: 10000,
        },
        netPayable: 6000 + 200 + 40000 + 20000 + 15000 + 25000 + 30000 + 15000 + 10000 - (280 + 150)},
    { id: 5,
      year: 2024,
      month: 6, 
        salary: 6000,
      status: "paid",

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
        allowances: {
            housingAllowance: 42000,
            transportationAllowance: 23000,
            mealAllowance: 17000,
            healthAllowance: 27000,
            carAllowance: 32000,
            securityAllowance: 18000,
            travelAllowance: 12000,
        },
        netPayable: 6000 + 310 + 42000 + 23000 + 17000 + 27000 + 32000 + 18000 + 12000 - (320 + 180)},
    { id: 6,
        year: 2024,
        month: 5, 
      status: "paid",

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
        netPayable: 2600 - 430 + 30000 + 15000 + 12000 + 20000 + 25000 + 10000 + 8000},
    { id: 7,
        year: 2024,
        month: 4, 
      status: "paid",
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
        netPayable: 3400 - 620 + 60000 + 30000 + 25000 + 35000 + 40000 + 22000 + 18000 },
]}
monthNames = [
  "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
];
fullname: string = ""
  constructor(private route: ActivatedRoute, private router: Router,  public navigationLink: NavigationLinksService 

  ) {}
data =  [
  {salesno: '30,000', title: 'Sales', icon: 'fas fa-shopping-bag'},
  {salesno: '40,000', title: 'Accounting', icon: 'fas fa-wallet'},
  {salesno: '50,000', title: 'Procurement', icon: 'fas fa-shopping-cart'},
  {salesno: '60,000', title: 'Inventory', icon: 'fas fa-boxes'},
  
];
  ngOnInit(): void {
    localStorage.setItem('sharedData', JSON.stringify(this.employeePayslipHistory));

  }
  cards = ['About', 'Attendance', 'Payslip', 'Leave Usage', 'Projects']; // Example for managing positions

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.cards, event.previousIndex, event.currentIndex);
  }

  openViewSlip(slip:any){
    this.viewSlip = true
    this.activeSlip = {
      empId:this.employeePayslipHistory.id,
      name: this.employeePayslipHistory.name,
      type: this.employeePayslipHistory.type,
      level: this.employeePayslipHistory.level,
      department: this.employeePayslipHistory.department,
      accountNumber: this.employeePayslipHistory.accountNumber,
      bank: this.employeePayslipHistory.bank,
      ...slip
    }
    console.log(this.activeSlip)
  }


  
}
