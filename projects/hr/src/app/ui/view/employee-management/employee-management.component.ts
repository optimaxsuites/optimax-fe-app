import { Component } from '@angular/core';
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
import { EmployeeService } from '../../service/employee.service';
import { DataService } from '../../service/data.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { EmployeeProfileDashboardComponent } from '../employee-dashboard/employee-profile-dashboard.component';


@Component({
  selector: 'app-employee-management',
  templateUrl: './employee-management.component.html',
  styleUrl: './employee-management.component.scss',
  providers: [MessageService, ConfirmationService]

})
export class EmployeeManagementComponent {
  
  tabsConfig: TabConfig[] = [
    { name: 'Basic Information', component: ViewEmployeeComponent },
    // { name: 'Basic Information', component: EmployeeProfileDashboardComponent },
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
currentPage = 1;
pageSize = 12;
pageSizeOptions = [8, 12, 16, 24];
deletingEmployeeIds: Record<string, boolean> = {};

handleDateClick(arg: DateClickArg) {
  alert('date click! ' + arg.dateStr)
}


  constructor(
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
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
        this.filteredEmployees = this.employees.map((employee: { employeeMedia: { mediaNo: any; }; imageUrl: any; }) => {
          if (employee.employeeMedia?.mediaNo) {
            this.fetchProfilePhoto(employee);
          } else {
            employee.imageUrl = this.employeeProfilePhotoUrl; // Assign default image if no mediaNo
          }
          return employee;
        });
        this.resetPagination();
    console.log(this.filteredEmployees)
    

      },
      error: err => console.log(err)
    })


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

    if (employee) {
      // this.employeeInView = JSON.parse(employee);

      localStorage.setItem('employeeInView', JSON.stringify(employee))
        this.viewEmployee = true


      this.employeeService.getNOKByEmployeeId(employee.id).subscribe((res: any) => {
        employee.nextOfKin = res;
        localStorage.setItem('employeeInView', JSON.stringify(employee))

        this.employeeInView = employee
      })
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
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Employee removed successfully.', key: 'tl', life: 3000 });
            this.fetchEmployees();
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete employee. Please try again.', key: 'tl', life: 3000 });
          }
        });
      }
    });
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
