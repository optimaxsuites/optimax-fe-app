import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';
import { RandomTokenService } from 'src/app/ui/shared/service/random-token/random-token.service';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
@Component({
  selector: 'app-employees',
  templateUrl: './employees.component.html',
  styleUrl: './employees.component.scss',
  providers: [MessageService]

})
export class EmployeesComponent {
  uniqueLevels: any;
  uniquePositions: any;

viewEmployee: boolean = false;
employeeInView: any = {}
searchTerm: any;

selectedPosition: any;

employeeList = [
  {
    id: 1,
    firstName: 'Oluwaseun',
    lastName: 'Adesanya',
    age: 24,
    gender: 'Male',
    position: 'Software Developer',
    level: 'Junior Staff',
    department: 'Technology',
    salary: 35000,
    hireDate: '2022-03-15',
    email: 'seun.adesanya@company.com',
    phone: '+2347012345678',
    location: 'Lagos, Nigeria',
    profileImage: 'https://randomuser.me/api/portraits/men/1.jpg', // Sample image
    leaveDetails: {
      assignedLeaves: 20,
      usedLeaves: 10,
      leavesRemaining: 10,
      leavesSpent: [
        {
          type: 'Annual',
          daysUsed: 5,
          from: '2023-05-10',
          to: '2023-05-15',
        },
        {
          type: 'Sick',
          daysUsed: 3,
          from: '2023-08-01',
          to: '2023-08-03',
        },
        {
          type: 'Annual',
          daysUsed: 2,
          from: '2023-10-01',
          to: '2023-10-02',
        }
      ]
    },
    attendance: {
      year: 2024,
      daysPresent: 190,
      daysAbsent: 10,
      lateArrivals: 5,
      overtimeHours: 20,
      lastPresent: '2024-09-30',
    }
  },
  {
    id: 2,
    firstName: 'Ngozi',
    lastName: 'Okeke',
    age: 28,
    gender: 'Female',
    position: 'Human Resources Manager',
    level: 'Mid Level 1',
    department: 'Human Resources',
    salary: 70000,
    hireDate: '2020-06-20',
    email: 'ngozi.okeke@company.com',
    phone: '+2348023456789',
    location: 'Abuja, Nigeria',
    profileImage: 'https://randomuser.me/api/portraits/women/2.jpg', // Sample image
    leaveDetails: {
      assignedLeaves: 25,
      usedLeaves: 8,
      leavesRemaining: 17,
      leavesSpent: [
        {
          type: 'Annual',
          daysUsed: 4,
          from: '2023-06-15',
          to: '2023-06-18',
        },
        {
          type: 'Sick',
          daysUsed: 4,
          from: '2023-09-05',
          to: '2023-09-08',
        }
      ]
    },
    attendance: {
      year: 2024,
      daysPresent: 200,
      daysAbsent: 8,
      lateArrivals: 2,
      overtimeHours: 15,
      lastPresent: '2024-09-29',
    }
  },
  {
    id: 3,
    firstName: 'Emeka',
    lastName: 'Nwosu',
    age: 32,
    gender: 'Male',
    position: 'Finance Analyst',
    level: 'Mid Level 2',
    department: 'Finance',
    salary: 85000,
    hireDate: '2019-11-05',
    email: 'emeka.nwosu@company.com',
    phone: '+2347034567890',
    location: 'Enugu, Nigeria',
    profileImage: 'https://randomuser.me/api/portraits/men/3.jpg', // Sample image
    leaveDetails: {
      assignedLeaves: 22,
      usedLeaves: 12,
      leavesRemaining: 10,
      leavesSpent: [
        {
          type: 'Annual',
          daysUsed: 6,
          from: '2023-04-10',
          to: '2023-04-15',
        },
        {
          type: 'Sick',
          daysUsed: 6,
          from: '2023-07-20',
          to: '2023-07-25',
        }
      ]
    },
    attendance: {
      year: 2024,
      daysPresent: 180,
      daysAbsent: 15,
      lateArrivals: 3,
      overtimeHours: 10,
      lastPresent: '2024-09-25',
    }
  },
  {
    id: 4,
    firstName: 'Amina',
    lastName: 'Bello',
    age: 29,
    gender: 'Female',
    position: 'Marketing Specialist',
    level: 'Entry Level',
    department: 'Marketing',
    salary: 50000,
    hireDate: '2021-09-10',
    email: 'amina.bello@company.com',
    phone: '+2349045678901',
    location: 'Kano, Nigeria',
    profileImage: 'https://randomuser.me/api/portraits/women/4.jpg', // Sample image
    leaveDetails: {
      assignedLeaves: 18,
      usedLeaves: 10,
      leavesRemaining: 8,
      leavesSpent: [
        {
          type: 'Annual',
          daysUsed: 8,
          from: '2023-08-15',
          to: '2023-08-22',
        },
        {
          type: 'Sick',
          daysUsed: 2,
          from: '2023-09-25',
          to: '2023-09-26',
        }
      ]
    },
    attendance: {
      year: 2024,
      daysPresent: 195,
      daysAbsent: 5,
      lateArrivals: 1,
      overtimeHours: 18,
      lastPresent: '2024-09-28',
    }
  },
  {
    id: 5,
    firstName: 'Chidi',
    lastName: 'Ibe',
    age: 42,
    gender: 'Male',
    position: 'Chief Financial Officer',
    level: 'C-Level',
    department: 'Executive',
    salary: 250000,
    hireDate: '2016-01-25',
    email: 'chidi.ibe@company.com',
    phone: '+2348156789012',
    location: 'Port Harcourt, Nigeria',
    profileImage: 'https://randomuser.me/api/portraits/men/5.jpg', // Sample image
    leaveDetails: {
      assignedLeaves: 30,
      usedLeaves: 20,
      leavesRemaining: 10,
      leavesSpent: [
        {
          type: 'Paternity',
          daysUsed: 10,
          from: '2023-03-01',
          to: '2023-03-10',
        },
        {
          type: 'Annual',
          daysUsed: 10,
          from: '2023-09-01',
          to: '2023-09-10',
        }
      ]
    },
    attendance: {
      year: 2024,
      daysPresent: 190,
      daysAbsent: 10,
      lateArrivals: 0,
      overtimeHours: 25,
      lastPresent: '2024-09-30',
    }
  },
  {
    id: 6,
    firstName: 'Blessing',
    lastName: 'Eze',
    age: 30,
    gender: 'Female',
    position: 'Software Tester',
    level: 'Junior Staff',
    department: 'Quality Assurance',
    salary: 45000,
    hireDate: '2021-11-01',
    email: 'blessing.eze@company.com',
    phone: '+2349012345678',
    location: 'Ibadan, Nigeria',
    profileImage: 'https://randomuser.me/api/portraits/women/6.jpg', // Sample image
    leaveDetails: {
      assignedLeaves: 20,
      usedLeaves: 5,
      leavesRemaining: 15,
      leavesSpent: [
        {
          type: 'Annual',
          daysUsed: 5,
          from: '2023-07-10',
          to: '2023-07-15',
        }
      ]
    },
    attendance: {
      year: 2024,
      daysPresent: 185,
      daysAbsent: 10,
      lateArrivals: 4,
      overtimeHours: 12,
      lastPresent: '2024-09-26',
    }
  },
  {
    id: 7,
    firstName: 'Tunde',
    lastName: 'Adeyemi',
    age: 35,
    gender: 'Male',
    position: 'Project Manager',
    level: 'Mid Level 1',
    department: 'Project Management',
    salary: 95000,
    hireDate: '2018-02-15',
    email: 'tunde.adeyemi@company.com',
    phone: '+2348065432109',
    location: 'Lagos, Nigeria',
    profileImage: 'https://randomuser.me/api/portraits/men/7.jpg', // Sample image
    leaveDetails: {
      assignedLeaves: 22,
      usedLeaves: 7,
      leavesRemaining: 15,
      leavesSpent: [
        {
          type: 'Annual',
          daysUsed: 7,
          from: '2023-05-01',
          to: '2023-05-07',
        }
      ]
    },
    attendance: {
      year: 2024,
      daysPresent: 175,
      daysAbsent: 15,
      lateArrivals: 5,
      overtimeHours: 20,
      lastPresent: '2024-09-29',
    }
  },
  {
    id: 8,
    firstName: 'Chinonso',
    lastName: 'Obinna',
    age: 26,
    gender: 'Female',
    position: 'Sales Associate',
    level: 'Entry Level',
    department: 'Sales',
    salary: 40000,
    hireDate: '2023-04-20',
    email: 'chinonso.obinna@company.com',
    phone: '+2349012345679',
    location: 'Abuja, Nigeria',
    profileImage: 'https://randomuser.me/api/portraits/women/8.jpg', // Sample image
    leaveDetails: {
      assignedLeaves: 18,
      usedLeaves: 3,
      leavesRemaining: 15,
      leavesSpent: [
        {
          type: 'Annual',
          daysUsed: 3,
          from: '2023-06-10',
          to: '2023-06-12',
        }
      ]
    },
    attendance: {
      year: 2024,
      daysPresent: 180,
      daysAbsent: 10,
      lateArrivals: 3,
      overtimeHours: 8,
      lastPresent: '2024-09-30',
    }
  },
  {
    id: 9,
    firstName: 'Ibrahim',
    lastName: 'Adebayo',
    age: 31,
    gender: 'Male',
    position: 'IT Support Specialist',
    level: 'Mid Level 1',
    department: 'IT',
    salary: 60000,
    hireDate: '2022-01-10',
    email: 'ibrahim.adebayo@company.com',
    phone: '+2347034567891',
    location: 'Kaduna, Nigeria',
    profileImage: 'https://randomuser.me/api/portraits/men/9.jpg', // Sample image
    leaveDetails: {
      assignedLeaves: 20,
      usedLeaves: 4,
      leavesRemaining: 16,
      leavesSpent: [
        {
          type: 'Annual',
          daysUsed: 4,
          from: '2023-03-01',
          to: '2023-03-05',
        }
      ]
    },
    attendance: {
      year: 2024,
      daysPresent: 185,
      daysAbsent: 5,
      lateArrivals: 2,
      overtimeHours: 10,
      lastPresent: '2024-09-30',
    }
  },
  {
    id: 10,
    firstName: 'Fatimah',
    lastName: 'Alabi',
    age: 27,
    gender: 'Female',
    position: 'Data Analyst',
    level: 'Entry Level',
    department: 'Data Science',
    salary: 50000,
    hireDate: '2023-08-01',
    email: 'fatimah.alabi@company.com',
    phone: '+2349012345680',
    location: 'Oyo, Nigeria',
    profileImage: 'https://randomuser.me/api/portraits/women/10.jpg', // Sample image
    leaveDetails: {
      assignedLeaves: 18,
      usedLeaves: 2,
      leavesRemaining: 16,
      leavesSpent: [
        {
          type: 'Annual',
          daysUsed: 2,
          from: '2023-09-15',
          to: '2023-09-16',
        }
      ]
    },
    attendance: {
      year: 2024,
      daysPresent: 190,
      daysAbsent: 5,
      lateArrivals: 1,
      overtimeHours: 12,
      lastPresent: '2024-09-30',
    }
  }
];

employees: any = []
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
      console.log(this.employees[0])

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
  filterBySelectedEmployeeType() {
    throw new Error('Method not implemented.');
    }
  filterBySelectedPosition() {
      throw new Error('Method not implemented.');
      }
  filterEmployees() {
        throw new Error('Method not implemented.');
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
}
