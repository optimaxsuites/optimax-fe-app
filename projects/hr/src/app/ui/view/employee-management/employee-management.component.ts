import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';
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
import { EmployeeService } from '../../service/employee.service';
import { DataService } from '../../service/data.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';


@Component({
  selector: 'app-employee-management',
  templateUrl: './employee-management.component.html',
  styleUrl: './employee-management.component.scss',
  providers: [MessageService]

})
export class EmployeeManagementComponent {
  
  tabsConfig: TabConfig[] = [
    { name: 'Basic Information', component: ViewEmployeeComponent },
    { name: 'Next of Kin Information', component:  EmployeeNokComponent, },
    { name: 'Guarantor(s) Information', component:  EmployeeGuarantorComponent, },
    { name: 'Offboarding', component:  EmployeeOffboardingComponent, },
  ];
  uniqueLevels: any;
  uniquePositions: any;
  employeeProfilePhotoUrl: string = 'https://media.istockphoto.com/id/1223671392/vector/default-profile-picture-avatar-photo-placeholder-vector-illustration.jpg?s=612x612&w=0&k=20&c=s0aTdmT5aU6b8ot7VKm11DeID6NctRCpB755rA1BIP0='


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
    private http: HttpClient,
   private employeeService: EmployeeService,
   private sanitizer: DomSanitizer, 
  ) {
  }
   ngOnInit() {

   this.fetchEmployees()

      
  
  }

  async getProfileImage(fileName: string){
  //  this.getEmployeesProfilePhotoUrl(fileName)
  return this.employeeProfilePhotoUrl
  }
  fetchEmployees(){
    this.employeeService.getAllEmployee().subscribe({
      next: data => {
        this.employees = data
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
        this.filteredEmployees = this.employees.map((employee: { employeeMedia: { mediaNo: any; }; imageUrl: any; }) => {
          if (employee.employeeMedia?.mediaNo) {
            this.fetchProfilePhoto(employee);
          } else {
            employee.imageUrl = this.employeeProfilePhotoUrl; // Assign default image if no mediaNo
          }
          return employee;
        });
    console.log(this.filteredEmployees)
    

      },
      error: err => console.log(err)
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



  closeAddForm() {
    this.openAddForm = false;
   this.fetchEmployees()

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
    console.log(employee)
    localStorage.setItem('employeeInView', JSON.stringify(employee))

    this.viewEmployee = true
    this.employeeInView = employee
    
    
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
    this.filteredEmployees = this.employees.filter((employee: { level: any; jobTitle: string; firstName: string; lastName: string; }) => {
      const matchesLevelType = !this.selectedEmployeeType || 
                               this.selectedEmployeeType.length === 0 || 
                               this.selectedEmployeeType.includes(employee.level.name);
  
      const matchesPosition = !this.selectedPosition || 
                              this.selectedPosition.length === 0 || 
                              this.selectedPosition.includes(employee.jobTitle);
  
      const matchesSearchTerm = !this.searchTerm || 
                                employee.firstName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                                employee.lastName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                                employee.jobTitle?.toLowerCase().includes(this.searchTerm.toLowerCase());

  
      return matchesLevelType && matchesPosition && matchesSearchTerm;
    });
  
  }
  
  filterBySelectedEmployeeType() {
    this.filteredEmployees = this.employees.filter(
      (employee: { level: { name: string }; }) => 
        {return this.selectedEmployeeType.length === 0 || this.selectedEmployeeType.includes(employee?.level?.name)}
    );
    }


  filterBySelectedPosition() {
     this.filteredEmployees = this.employees.filter((employee: { level: any; jobTitle: string; firstName: string; lastName: string; }) => {
      return this.selectedPosition.length === 0 || this.selectedPosition.includes(employee.jobTitle);
    })
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
