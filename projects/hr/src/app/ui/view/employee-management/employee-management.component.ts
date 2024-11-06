import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { RandomTokenService } from '../../shared-component/service/random-token/random-token.service';

interface Allowances {
  transportationAllowance: number;
  mealAllowance: number;
  housingAllowance: number;
  healthAllowance?: number;
  carAllowance?: number;
  securityAllowance?: number;
  travelAllowance?: number;
}

interface Deductions {
  tax: number;
  healthInsurance?: number;
  retirementContribution?: number;
  pension: number
}

interface Bonuses {
  performanceBonus?: number;
  yearEndBonus?: number;
  internshipCompletionBonus?: number;
}

interface Overtime {
  hourlyRate: number;
  maxOvertimeHours: number;
}

 interface SalaryStructure {
  level: string;
  baseSalary: number;
  allowances: Allowances;
  deductions: Deductions;
  bonuses: Bonuses;
  overtime: Overtime;
  netSalary: () => number;

}

@Component({
  selector: 'app-employee-management',
  templateUrl: './employee-management.component.html',
  styleUrl: './employee-management.component.scss',
  providers: [MessageService]

})
export class EmployeeManagementComponent {
  closeAddForm() {
    this.openAddForm = false;
  }
  uniqueLevels: any;
  uniquePositions: any;

viewEmployee: boolean = false;
employeeInView: any = {}
searchTerm: any;

selectedPosition: any;
openAddForm: boolean = false
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
    supervisor: 'John Doe',
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
salaries: SalaryStructure[] = [
  {
    level: 'Intern',
    baseSalary: 20000,
    allowances: {
      transportationAllowance: 2000,
      mealAllowance: 1000,
      housingAllowance: 0,

    },
    deductions: {
      tax: 1000,
      pension: 0
    },
    bonuses: {
      internshipCompletionBonus: 5000,

    },
    overtime: {
      hourlyRate: 200,
      maxOvertimeHours: 10,
    },
    netSalary: function() {
      const grossSalary = this.baseSalary + this.allowances.transportationAllowance + this.allowances.mealAllowance + (this.bonuses.internshipCompletionBonus || 0);
      return grossSalary - this.deductions.tax;
    },
  },
  {
    level: 'Junior Staff',
    baseSalary: 35000,
    allowances: {
      housingAllowance: 3000,
      transportationAllowance: 2500,
      mealAllowance: 2000,
    },
    deductions: {
      tax: 2000,
      pension: 1500,
    },
    bonuses: {},
    overtime: {
      hourlyRate: 300,
      maxOvertimeHours: 15,
    },
    netSalary: function() {
      const grossSalary = this.baseSalary + this.allowances.housingAllowance + this.allowances.transportationAllowance + this.allowances.mealAllowance;
      return grossSalary - (this.deductions.tax + this.deductions.pension);
    },
  },
  {
    level: 'Entry Level',
    baseSalary: 50000,
    allowances: {
      housingAllowance: 5000,
      transportationAllowance: 3000,
      mealAllowance: 2000,
    },
    deductions: {
      tax: 5000,
      pension: 3000,
    },
    bonuses: {
      performanceBonus: 3000,
    },
    overtime: {
      hourlyRate: 500,
      maxOvertimeHours: 20,
    },
    netSalary: function() {
      const grossSalary = this.baseSalary + this.allowances.housingAllowance + this.allowances.transportationAllowance + this.allowances.mealAllowance + (this.bonuses.performanceBonus || 0);
      return grossSalary - (this.deductions.tax + this.deductions.pension);
    },
  },
  {
    level: 'Mid Level 1',
    baseSalary: 75000,
    allowances: {
      housingAllowance: 8000,
      transportationAllowance: 4000,
      mealAllowance: 3000,
    },
    deductions: {
      tax: 7000,
      pension: 3500,
    },
    bonuses: {
      performanceBonus: 5000,
    },
    overtime: {
      hourlyRate: 600,
      maxOvertimeHours: 18,
    },
    netSalary: function() {
      const grossSalary = this.baseSalary + this.allowances.housingAllowance + this.allowances.transportationAllowance + this.allowances.mealAllowance + (this.bonuses.performanceBonus || 0);
      return grossSalary - (this.deductions.tax + this.deductions.pension);
    },
  },
  {
    level: 'Mid Level 2',
    baseSalary: 100000,
    allowances: {
      housingAllowance: 12000,
      transportationAllowance: 5000,
      mealAllowance: 3500,
    },
    deductions: {
      tax: 9000,
      pension: 5000,
    },
    bonuses: {
      performanceBonus: 8000,
    },
    overtime: {
      hourlyRate: 750,
      maxOvertimeHours: 15,
    },
    netSalary: function() {
      const grossSalary = this.baseSalary + this.allowances.housingAllowance + this.allowances.transportationAllowance + this.allowances.mealAllowance + (this.bonuses.performanceBonus || 0) ;
      return grossSalary - (this.deductions.tax + this.deductions.pension);
    },
  },
  {
    level: 'Senior Level 1',
    baseSalary: 150000,
    allowances: {
      housingAllowance: 15000,
      transportationAllowance: 7000,
      mealAllowance: 4000,
      healthAllowance: 5000,
    },
    deductions: {
      tax: 12000,
      pension: 6000,
    },
    bonuses: {
      performanceBonus: 10000,
    },
    overtime: {
      hourlyRate: 900,
      maxOvertimeHours: 12,
    },
    netSalary: function() {
      const grossSalary = this.baseSalary + this.allowances.housingAllowance + this.allowances.transportationAllowance + this.allowances.mealAllowance + (this.bonuses.performanceBonus || 0) 
      return grossSalary - (this.deductions.tax + this.deductions.pension );
    },
  },
  {
    level: 'Senior Level 2',
    baseSalary: 200000,
    allowances: {
      housingAllowance: 20000,
      transportationAllowance: 9000,
      mealAllowance: 5000,
      healthAllowance: 8000,
      carAllowance: 10000,
    },
    deductions: {
      tax: 15000,
      pension: 8000,
    },
    bonuses: {
      performanceBonus: 15000,
    },
    overtime: {
      hourlyRate: 1000,
      maxOvertimeHours: 10,
    },
    netSalary: function() {
      const grossSalary = this.baseSalary + this.allowances.housingAllowance + this.allowances.transportationAllowance + this.allowances.mealAllowance + (this.bonuses.performanceBonus || 0) 
      return grossSalary - (this.deductions.tax + this.deductions.pension );
    },
  },
  {
    level: 'Executive Level 1',
    baseSalary: 300000,
    allowances: {
      housingAllowance: 30000,
      transportationAllowance: 15000,
      mealAllowance: 10000,
      healthAllowance: 15000,
      carAllowance: 20000,
    },
    deductions: {
      tax: 30000,
      pension: 15000,
    },
    bonuses: {
      performanceBonus: 25000,
    },
    overtime: {
      hourlyRate: 1500,
      maxOvertimeHours: 8,
    },
    netSalary: function() {
      const grossSalary = this.baseSalary + this.allowances.housingAllowance + this.allowances.transportationAllowance + this.allowances.mealAllowance + (this.bonuses.performanceBonus || 0) 
      return grossSalary - (this.deductions.tax + this.deductions.pension );
    },
  },
  {
    level: 'Executive Level 2',
    baseSalary: 400000,
    allowances: {
      housingAllowance: 40000,
      transportationAllowance: 20000,
      mealAllowance: 15000,
      healthAllowance: 20000,
      carAllowance: 30000,
      securityAllowance: 15000,
    },
    deductions: {
      tax: 40000,
      pension: 20000,
    },
    bonuses: {
      performanceBonus: 35000,
      // signingBonus: 30000,
    },
    overtime: {
      hourlyRate: 2000,
      maxOvertimeHours: 6,
    },
    netSalary: function() {
      const grossSalary = this.baseSalary + this.allowances.housingAllowance + this.allowances.transportationAllowance + this.allowances.mealAllowance + (this.bonuses.performanceBonus || 0) 
      return grossSalary - (this.deductions.tax + this.deductions.pension );
    },
  },
  {
    level: 'C-Level',
    baseSalary: 500000,
    allowances: {
      housingAllowance: 50000,
      transportationAllowance: 30000,
      mealAllowance: 20000,
      healthAllowance: 30000,
      carAllowance: 40000,
      securityAllowance: 25000,
      travelAllowance: 20000,
    },
    deductions: {
      tax: 50000,
      pension: 30000,
    },
    bonuses: {
      performanceBonus: 50000,
      // signingBonus: 50000,
      // retentionBonus: 40000,
    },
    overtime: {
      hourlyRate: 3000,
      maxOvertimeHours: 4,
    },
    netSalary: function() {
      const grossSalary = this.baseSalary + this.allowances.housingAllowance + this.allowances.transportationAllowance + this.allowances.mealAllowance + (this.bonuses.performanceBonus || 0) 
      return grossSalary - (this.deductions.tax + this.deductions.pension );
    },
  }
];
salaryStructure: any[] = [];
employees: any = []
filteredEmployees: any[] = [];
selectedEmployeeType: any;
calendarOptions: CalendarOptions = {}

handleDateClick(arg: DateClickArg) {
  alert('date click! ' + arg.dateStr)
}


  constructor(
    private messageService: MessageService,
   private token: RandomTokenService
  ) {
  }
  ngOnInit() {

    const employeesFromStorage = localStorage.getItem("employeesList");
    const salaryStructureFromStorage = localStorage.getItem("salaryStructure");
    if (salaryStructureFromStorage) {
      this.salaryStructure = JSON.parse(salaryStructureFromStorage);
    }else {
      localStorage.setItem("salaryStructure", JSON.stringify(this.salaries))
      const salaryStructureFromStorage = localStorage.getItem("salaryStructure") || "[]"
      this.salaryStructure = JSON.parse(salaryStructureFromStorage);
    }
    if (employeesFromStorage) {
      const storedEmployees = JSON.parse(employeesFromStorage);
      let salaryStructure: any[] = [];
      if (salaryStructureFromStorage) {
        salaryStructure = JSON.parse(salaryStructureFromStorage);
      }
      
      const calculateNetSalary = (salaryDetails: any) => {
        const grossSalary = salaryDetails.baseSalary +
          (salaryDetails.allowances.transportationAllowance || 0) +
          (salaryDetails.allowances.mealAllowance || 0) + (salaryDetails.allowances.housingAllowance || 0) +
          (salaryDetails.bonuses.internshipCompletionBonus || 0);
        return grossSalary - (salaryDetails.deductions.tax + (salaryDetails.deductions.pension || 0));
      };
      this.employees = storedEmployees.map((employee: any) => {
        const salaryDetails = salaryStructure.find(s => s.level === employee.level);
        return {
          ...employee,
          salaryDetails: salaryDetails ? {
            baseSalary: salaryDetails.baseSalary,
            allowances: salaryDetails.allowances,
            deductions: salaryDetails.deductions,
            bonuses: salaryDetails.bonuses,
            overtime: salaryDetails.overtime,
            netSalary: calculateNetSalary(salaryDetails)
          } : null 
        };
      });

      this.uniqueLevels = [...new Set(this.employees.map((employee: { level: any; }) => employee.level))];

      this.uniquePositions = [...new Set(this.employees.map((employee: {jobTitle: string} ) => employee.jobTitle))];
      console.log(this.uniquePositions)

      this.filteredEmployees = this.employees;

    }
  
  else {
    localStorage.setItem("employeesList", JSON.stringify(this.employeeList))
    const employeesFromStorage = localStorage.getItem("employeesList");
    const salaryStructureFromStorage = localStorage.getItem("salaryStructure");
    if (employeesFromStorage) {

      const storedEmployees = JSON.parse(employeesFromStorage);
      let salaryStructure: any[] = [];
      if (salaryStructureFromStorage) {
        salaryStructure = JSON.parse(salaryStructureFromStorage);
      }
      
      const calculateNetSalary = (salaryDetails: any) => {
        const grossSalary = salaryDetails.baseSalary +
          (salaryDetails.allowances.transportationAllowance || 0) +
          (salaryDetails.allowances.mealAllowance || 0) + (salaryDetails.allowances.housingAllowance || 0) +
          (salaryDetails.bonuses.internshipCompletionBonus || 0);
        return grossSalary - (salaryDetails.deductions.tax + (salaryDetails.deductions.pension || 0));
      };
      this.employees = storedEmployees.map((employee: any) => {
        const salaryDetails = salaryStructure.find(s => s.level === employee.level);
        return {
          ...employee,
          salaryDetails: salaryDetails ? {
            baseSalary: salaryDetails.baseSalary,
            allowances: salaryDetails.allowances,
            deductions: salaryDetails.deductions,
            bonuses: salaryDetails.bonuses,
            overtime: salaryDetails.overtime,
            netSalary: calculateNetSalary(salaryDetails)
          } : null 
        };
      });
      this.uniqueLevels = [...new Set(this.employees.map((employee: { level: any; }) => employee.level))];
      this.uniquePositions = [...new Set(this.employees.map((employee: { position: any; }) => employee.position))];

      console.log(this.employees[0].salaryDetails)

    }
  }

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
  this.viewEmployee = true
  this.employeeInView = employee
  this.calendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, interactionPlugin],
    dateClick: (arg) => this.handleDateClick(arg),
    events:  this.generateLeaveEvents(this.employeeInView.leaveDetails)
  };

    }    
    closeViewEmployee() {
  this.viewEmployee = false
  this.employeeInView = {}
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
    this.filteredEmployees = this.employees.filter((employee: { level: any; position: string; firstName: string; lastName: string; }) => {
      const matchesLevelType = this.selectedEmployeeType.length === 0 || 
                               this.selectedEmployeeType.includes(employee.level);

      const matchesPosition = this.selectedPosition.length === 0 || 
                              this.selectedPosition.includes(employee.position);

      const matchesSearchTerm = this.searchTerm === '' || 
                                employee.firstName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                                employee.lastName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                                employee.position.toLowerCase().includes(this.searchTerm.toLowerCase());

      return matchesLevelType && matchesPosition && matchesSearchTerm;
    });
  }
  filterBySelectedEmployeeType() {
    this.filteredEmployees = this.employees.filter((employee: { level: any; position: string; firstName: string; lastName: string; }) => {
      return this.selectedEmployeeType.length === 0 || 
                               this.selectedEmployeeType.includes(employee.level);
    })
    }


  filterBySelectedPosition() {
     this.filteredEmployees = this.employees.filter((employee: { level: any; jobTitle: string; firstName: string; lastName: string; }) => {
      return this.selectedPosition.length === 0 || 
      this.selectedPosition.includes(employee.jobTitle);
    })
      }

  filterEmployees() {
        throw new Error('Method not implemented.');
        }
}
