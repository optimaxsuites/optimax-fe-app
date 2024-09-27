import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';
import { RandomTokenService } from 'src/app/ui/shared/service/random-token/random-token.service';

@Component({
  selector: 'app-leave-request',
  templateUrl: './leave-request.component.html',
  styleUrl: './leave-request.component.scss',
  providers: [MessageService]

})
export class LeaveRequestComponent {


  statuses: string[] = ['Pending Approval', 'Approved', 'Rejected']
  leaveTypes: string[] = [  "Annual Leave",
    "Sick Leave",
    "Maternity Leave",
    "Paternity Leave",
    "Vacation Leave",
    "Bereavement Leave",
    "Study Leave",
    "Unpaid Leave",
    "Emergency Leave",
    "Compassionate Leave",
    "Sabbatical Leave",
    "Public Holiday Leave",
    "Medical Leave",
    "Parental Leave",
    "Compensatory Leave (Comp Time)",
    "Marriage Leave",
    "Religious Leave",
    "Volunteer Leave"];
  selectedLeaveType: string[] = [];
  selectedStatus: string[] = []
  acceptModal = false
  selectedEmployee: any = null;
  searchTerm: string = '';
  // employee: any[] = [
  //     {
  //         Employee: "Rissa Quan",
  //         Date: "2023-06-04 to 2023-06-10",
  //         LeaveType: "Annual Leave",
  //         NetLeaveBalance: "5.00 day(s)",
  //         RequestedDuration: "3.00 day(s)",
  //         Status: "Pending Approval (3.00 day(s))",
  //         RequestComment: '',
  //         ApprovalComment: "",
  //         AppliedOn: "2023-05-08, 10:27 AM",
  //         Id: this.token.getRandomToken()
  //     },
  //     {
  //         Employee: "Susan Williams",
  //         Date: "2023-06-04 to 2023-06-08",
  //         LeaveType: "Vacation Leave",
  //         NetLeaveBalance: "8.00 day(s)",
  //         RequestedDuration: "4.00 day(s)",
  //         Status: "Pending Approval (4.00 day(s))",
  //         RequestComment: '',
  //         AppliedOn: "2023-05-08, 10:27 AM",
  //         ApprovalComment: "",
  //         Id: this.token.getRandomToken()
  //     },
  //     {
  //         Employee: "Anthony Davies",
  //         Date: "2023-06-03 to 2023-06-07",
  //         LeaveType: "Annual Leave",
  //         NetLeaveBalance: "10.00 day(s)",
  //         RequestedDuration: "2.00 day(s)",
  //         Status: "Approved",
  //         RequestComment: '',
  //         AppliedOn: "2023-05-08, 10:27 AM",
  //         ApprovalComment: "",
  //         Id: this.token.getRandomToken()
  //     },
  //     {
  //         Employee: "Kevin Scott",
  //         Date: "2023-06-02 to 2023-06-05",
  //         LeaveType: "Vacation Leave",
  //         NetLeaveBalance: "4.00 day(s)",
  //         RequestedDuration: "1.00 day(s)",
  //         Status: "Pending Approval (1.00 day(s))",
  //         AppliedOn: "2023-05-08, 10:27 AM",
  //         RequestComment: '',
  //         ApprovalComment: "",
  //         Id: this.token.getRandomToken()
  //     },
  //     {
  //         Employee: "Christopher Morgan",
  //         Date: "2023-06-02 to 2023-06-06",
  //         LeaveType: "Annual Leave",
  //         NetLeaveBalance: "6.00 day(s)",
  //         RequestedDuration: "2.00 day(s)",
  //         Status: "Pending Approval (2.00 day(s))",
  //         RequestComment: '',
  //         AppliedOn: "2023-05-08, 10:27 AM",
  //         ApprovalComment: "",
  //         Id: this.token.getRandomToken()
  //     },
  //     {
  //         Employee: "Emma Johnson",
  //         Date: "2023-06-01 to 2023-06-05",
  //         LeaveType: "Vacation Leave",
  //         NetLeaveBalance: "3.00 day(s)",
  //         RequestedDuration: "2.00 day(s)",
  //         Status: "Approved",
  //         RequestComment: '',
  //         AppliedOn: "2023-05-08, 10:27 AM",
  //         ApprovalComment: "",
  //         Id: this.token.getRandomToken()
  //     },
  //     {
  //         Employee: "Lucas Brown",
  //         Date: "2023-06-05 to 2023-06-09",
  //         LeaveType: "Annual Leave",
  //         AppliedOn: "2023-05-08, 10:27 AM",
  //         NetLeaveBalance: "7.00 day(s)",
  //         RequestedDuration: "4.00 day(s)",
  //         Status: "Pending Approval (4.00 day(s))",
  //         RequestComment: '',
  //         ApprovalComment: "",
  //         Id: this.token.getRandomToken()
  //     },
  //     {
  //         Employee: "Mia Davis",
  //         Date: "2023-06-03 to 2023-06-08",
  //         LeaveType: "Vacation Leave",
  //         NetLeaveBalance: "2.00 day(s)",
  //         RequestedDuration: "1.00 day(s)",
  //         Status: "Pending Approval (1.00 day(s))",
  //         AppliedOn: "2023-05-08, 10:27 AM",
  //         RequestComment: '',
  //         ApprovalComment: "",
  //         Id: this.token.getRandomToken()
  //     },
  //     {
  //         Employee: "Oliver Martinez",
  //         Date: "2023-06-04 to 2023-06-10",
  //         LeaveType: "Annual Leave",
  //         NetLeaveBalance: "9.00 day(s)",
  //         RequestedDuration: "3.00 day(s)",
  //         Status: "Rejected",
  //         AppliedOn: "2023-05-08, 10:27 AM",
  //         RequestComment: '',
  //         ApprovalComment: "",
  //         Id: this.token.getRandomToken()

  //     },
  //     {
  //         Employee: "Sophia Garcia",
  //         Date: "2023-06-01 to 2023-06-04",
  //         LeaveType: "Vacation Leave",
  //         NetLeaveBalance: "5.00 day(s)",
  //         RequestedDuration: "2.00 day(s)",
  //         Status: "Pending Approval (2.00 day(s))",
  //         RequestComment: '',
  //         AppliedOn: "2023-05-08, 10:27 AM",
  //         ApprovalComment: "",
  //         Id: this.token.getRandomToken()
  //     }
  // ];
  comment: string = ''
  employeeInView: any;
  openViewEmployee: boolean = false
  savedEmployees: any[]=[]
  filteredCandidates: any[]=[]

  constructor(
    private messageService: MessageService,
   private token: RandomTokenService
  ) {
  }
  ngOnInit() {

    this.savedEmployees = JSON.parse(localStorage.getItem("leaveRequest") || '[]');
    this.filteredCandidates = [...this.savedEmployees];
    this.sortByStatus();


  }
  sortByStatus() {
    this.filteredCandidates.sort((a, b) => {
      const statusA = a.Status.includes('Pending Approval') ? 0 : 1;
      const statusB = b.Status.includes('Pending Approval') ? 0 : 1;
  
      if (statusA !== statusB) {
        return statusA - statusB;
      }
  
      const dateA = new Date(a.AppliedOn);
      const dateB = new Date(b.AppliedOn);
      
      return dateB.getTime() - dateA.getTime();
    });
  }




filterCandidates() {
    this.filteredCandidates = this.savedEmployees.filter((employee: { Employee: string; }) => 
      employee.Employee.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
    this.filteredCandidates = this.savedEmployees.filter(employee => {
      // Check if the candidate matches the search term
      const matchesSearchTerm = employee.Employee.toLowerCase().includes(this.searchTerm.toLowerCase());
  
      // Check if the candidate matches one of the selected leaveType or status (if any)
      const matchesLeaveType = this.selectedLeaveType.length === 0 || this.selectedLeaveType.includes(employee.LeaveType);
      const matchesStatus = this.selectedStatus.length === 0 || this.selectedStatus.includes(employee.Status);

  
      // Return true if all conditions are met
      return matchesSearchTerm && matchesLeaveType && matchesStatus;
    });
    this.sortByStatus();
}
  filterBySelectedStatus() {
    console.log(this.selectedStatus)
    if (this.selectedStatus.length == 0 ) {
   
        this.filteredCandidates = [...this.savedEmployees]; 
      } else {
        this.filteredCandidates = this.savedEmployees.filter((employee: { Status: string; }) => 
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
            this.filteredCandidates = [...this.savedEmployees]; 
          } else {
            this.filteredCandidates = this.savedEmployees.filter((employee: { LeaveType: string; }) => 
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
   this.openViewEmployee = false
    this.selectedEmployee = employee;
    this.acceptModal = true;
  }

  acceptLeave() {

    if (this.selectedEmployee) {

      this.selectedEmployee.Status = 'Approved';
   
      this.selectedEmployee.ApprovalComment = this.comment? this.comment : "No comment"
 
      this.comment = ''
      this.messageService.add({ severity: 'success', summary: 'Leave', detail: `${this.selectedEmployee?.Employee}'s leave has been accepted`, key: 'tl', life: 3000 });

      this.closeModal();
      this.updateLocalStorage()

    this.sortByStatus();

    }
  }

  rejectLeave() {

    if (this.selectedEmployee) {
      this.selectedEmployee.Status = 'Rejected';
 
        this.selectedEmployee.ApprovalComment = this.comment? this.comment : "No comment"
      
      this.comment = ''
      this.messageService.add({ severity: 'warn', summary: 'Leave', detail: `${this.selectedEmployee?.Employee}'s leave has been rejected`, key: 'tl', life: 3000 });

      this.closeModal();
      this.updateLocalStorage()

    this.sortByStatus();

    }
  }


  closeModal() {
    this.acceptModal = false;
    this.selectedEmployee = null;
  }

  selectedEmployees: any[] = [];

  bulkApprove() {
    if(this.selectedEmployees.length == 0) return

    this.selectedEmployees.forEach((employee) => {
        if (employee.Status.includes('Pending Approval')) {
            employee.Status = 'Approved';
          }
    });
    
    this.messageService.add({ severity: 'success', summary: 'Leave', detail: `Selected leave(s) has been accepted`, key: 'tl', life: 3000 });
    this.updateLocalStorage()

    this.selectedEmployees = [];
    this.sortByStatus();

  }

  bulkReject() {

    if(this.selectedEmployees.length == 0) return

    this.selectedEmployees.forEach((employee) => {
        if (employee.Status.includes('Pending Approval')) {
            employee.Status = 'Rejected';
           
          }
    });
    this.updateLocalStorage()
    this.messageService.add({ severity: 'warn', summary: 'Leave', detail: `Selected leave(s) has been rejected`, key: 'tl', life: 3000 });
    this.selectedEmployees = [];
    this.sortByStatus();

  }

  updateLocalStorage() {
    localStorage.setItem('leaveRequest', JSON.stringify(this.filteredCandidates));
  }

  viewEmployee(employee: any, op: any){
    this.employeeInView = employee
    console.log(employee)
    this.openViewEmployee = true
    op.hide();

  }


  downloadAttachment(leaveRequest: any) {
    if (leaveRequest.Attachment != "Null") {
      const link = document.createElement('a');
      link.href = leaveRequest.Attachment.fileData;
      link.download = leaveRequest.Attachment.fileName;
      link.click();
    } else {
      this.messageService.add({ severity: 'info', summary: 'No Attachment', detail: 'No file attached to this request.', key: 'tl', life: 3000 });
    }
  }
  
}
