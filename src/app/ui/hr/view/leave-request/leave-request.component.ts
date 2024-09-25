import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-leave-request',
  templateUrl: './leave-request.component.html',
  styleUrl: './leave-request.component.scss',
  providers: [MessageService]

})
export class LeaveRequestComponent {


  stages = ['Application Received', 'Shortlisted'];
  statuses: string[] = ['Pending Approval', 'Approved', 'Rejected']
  leaveTypes: string[] = ['Annual Leave', 'Vacation Leave'];
  selectedLeaveType: string[] = [];
  selectedStatus: string[] = []
  acceptModal = false
  selectedEmployee: any = null;
  searchTerm: string = '';
  employee: any[] = [
      {
          Employee: "Rissa Quan",
          Date: "2023-06-04 to 2023-06-10",
          LeaveType: "Annual Leave",
          NetLeaveBalance: "5.00 day(s)",
          RequestedDuration: "3.00 day(s)",
          Status: "Pending Approval (3.00 day(s))"
      },
      {
          Employee: "Susan Williams",
          Date: "2023-06-04 to 2023-06-08",
          LeaveType: "Vacation Leave",
          NetLeaveBalance: "8.00 day(s)",
          RequestedDuration: "4.00 day(s)",
          Status: "Pending Approval (4.00 day(s))"
      },
      {
          Employee: "Anthony Davies",
          Date: "2023-06-03 to 2023-06-07",
          LeaveType: "Annual Leave",
          NetLeaveBalance: "10.00 day(s)",
          RequestedDuration: "2.00 day(s)",
          Status: "Approved"
      },
      {
          Employee: "Kevin Scott",
          Date: "2023-06-02 to 2023-06-05",
          LeaveType: "Vacation Leave",
          NetLeaveBalance: "4.00 day(s)",
          RequestedDuration: "1.00 day(s)",
          Status: "Pending Approval (1.00 day(s))"
      },
      {
          Employee: "Christopher Morgan",
          Date: "2023-06-02 to 2023-06-06",
          LeaveType: "Annual Leave",
          NetLeaveBalance: "6.00 day(s)",
          RequestedDuration: "2.00 day(s)",
          Status: "Pending Approval (2.00 day(s))"
      },
      {
          Employee: "Emma Johnson",
          Date: "2023-06-01 to 2023-06-05",
          LeaveType: "Vacation Leave",
          NetLeaveBalance: "3.00 day(s)",
          RequestedDuration: "2.00 day(s)",
          Status: "Approved"
      },
      {
          Employee: "Lucas Brown",
          Date: "2023-06-05 to 2023-06-09",
          LeaveType: "Annual Leave",
          NetLeaveBalance: "7.00 day(s)",
          RequestedDuration: "4.00 day(s)",
          Status: "Pending Approval (4.00 day(s))"
      },
      {
          Employee: "Mia Davis",
          Date: "2023-06-03 to 2023-06-08",
          LeaveType: "Vacation Leave",
          NetLeaveBalance: "2.00 day(s)",
          RequestedDuration: "1.00 day(s)",
          Status: "Pending Approval (1.00 day(s))"
      },
      {
          Employee: "Oliver Martinez",
          Date: "2023-06-04 to 2023-06-10",
          LeaveType: "Annual Leave",
          NetLeaveBalance: "9.00 day(s)",
          RequestedDuration: "3.00 day(s)",
          Status: "Rejected"

      },
      {
          Employee: "Sophia Garcia",
          Date: "2023-06-01 to 2023-06-04",
          LeaveType: "Vacation Leave",
          NetLeaveBalance: "5.00 day(s)",
          RequestedDuration: "2.00 day(s)",
          Status: "Pending Approval (2.00 day(s))"
      }
  ];

  constructor(
    private messageService: MessageService,
   
  ) {
  }
  ngOnInit() {
    this.sortByStatus();
  }
  sortByStatus() {
    this.filteredCandidates.sort((a, b) => {
      const statusA = a.Status.includes('Pending Approval') ? 0 : 1;
      const statusB = b.Status.includes('Pending Approval') ? 0 : 1;
      return statusA - statusB;
    });
  }
  filteredCandidates: any[] = [...this.employee];

filterCandidates() {
    this.filteredCandidates = this.employee.filter(employee => 
      employee.Employee.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
    this.sortByStatus();
}
  filterBySelectedStatus() {
    console.log(this.selectedStatus)
    if (this.selectedStatus.length == 0 ) {
   
        this.filteredCandidates = [...this.employee]; 
      } else {
        this.filteredCandidates = this.employee.filter(employee => 
            this.selectedStatus.some(status => 
              employee.Status.toLowerCase().includes(status.toLowerCase()) 
            )
          );
      }

      if (this.searchTerm && this.searchTerm.trim() !== '') {
        this.filterCandidates();
      }
      this.sortByStatus();
    }
    
    filterBySelectedLeaveType() {
        if (this.selectedLeaveType.length == 0 ) {
            this.filteredCandidates = [...this.employee]; 
          } else {
            this.filteredCandidates = this.employee.filter(employee => 
                this.selectedLeaveType.some(status => 
                  employee.LeaveType.toLowerCase().includes(status.toLowerCase()) 
                )
              );
          }
    
          if (this.searchTerm && this.searchTerm.trim() !== '') {
            this.filterCandidates();
          }
          this.sortByStatus();
    }
  openAcceptRejectModal(employee: any) {
    this.selectedEmployee = employee;
    this.acceptModal = true;
  }

  acceptLeave() {

    if (this.selectedEmployee) {

      this.selectedEmployee.Status = 'Approved';
      this.messageService.add({ severity: 'success', summary: 'Leave', detail: `${this.selectedEmployee?.Employee}'s leave has been accepted`, key: 'tl', life: 3000 });

      this.closeModal();

    this.sortByStatus();

    }
  }

  rejectLeave() {

    if (this.selectedEmployee) {
      this.selectedEmployee.Status = 'Rejected';
      this.messageService.add({ severity: 'warn', summary: 'Leave', detail: `${this.selectedEmployee?.Employee}'s leave has been rejected`, key: 'tl', life: 3000 });

      this.closeModal();

    this.sortByStatus();

    }
  }


  closeModal() {
    this.acceptModal = false;
    this.selectedEmployee = null;
  }

  selectedEmployees: any[] = [];

  bulkApprove() {

    this.selectedEmployees.forEach((employee) => {
        if (employee.Status.includes('Pending Approval')) {
            employee.Status = 'Approved';
          }
    });
    
    this.messageService.add({ severity: 'success', summary: 'Leave', detail: `Selected leave(s) has been accepted`, key: 'tl', life: 3000 });

    this.selectedEmployees = [];
    this.sortByStatus();

  }

  bulkReject() {

    this.selectedEmployees.forEach((employee) => {
        if (employee.Status.includes('Pending Approval')) {
            employee.Status = 'Rejected';
           
          }
    });
    this.messageService.add({ severity: 'success', summary: 'Leave', detail: `Selected leave(s) has been rejected`, key: 'tl', life: 3000 });
    this.selectedEmployees = [];
    this.sortByStatus();

  }
}
