import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';
import { RandomTokenService } from '../../../shared-component/service/random-token/random-token.service';
import { LeaveServiceService } from '../../../service/leave-service.service';

@Component({
  selector: 'app-assign-leave',
  templateUrl: './assign-leave.component.html',
  styleUrl: './assign-leave.component.scss',
  providers: [MessageService]

})
export class AssignLeaveComponent {
  constructor(
    private messageService: MessageService,
   private token: RandomTokenService,
   private http: HttpClient,
   private leaveService: LeaveServiceService
  ) {
  }
selectedEmployee: string[] = [];
employees:any[] = []

ngOnInit(): void {
 this.leaveService.getEmployees().subscribe(
  async (data) => {

    if (data) {
      this.employees = [...data]
    } else {
     console.log("error loading data")
    }}
)  
    }


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
fromDate: any;
toDate: any;
comment: any;
selectedLeaveType: any;

getCurrentDateTime(): string {
  const currentDate = new Date();

  const year = currentDate.getFullYear();
  const month = (currentDate.getMonth() + 1).toString().padStart(2, '0'); 
  const day = currentDate.getDate().toString().padStart(2, '0');

  const hours = currentDate.getHours();
  const minutes = currentDate.getMinutes().toString().padStart(2, '0');

  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = (hours % 12 || 12).toString().padStart(2, '0'); 

  return `${year}-${month}-${day}, ${formattedHours}:${minutes} ${ampm}`;
}

assignLeave() {
  let leaveRequests = JSON.parse((localStorage.getItem('leaveRequest')) || '[]');

  if(this.selectedEmployee.length > 0 && this.fromDate && this.toDate && this.selectedLeaveType.length > 0){


    const from = new Date(this.fromDate);
    const to = new Date(this.toDate);

    const timeDiff = to.getTime() - from.getTime();

    const dayDiff = timeDiff / (1000 * 3600 * 24);
       this.selectedEmployee.forEach((employee: any) => {
      const leaveRequest = {
        Employee: employee,
        Date: `${this.fromDate} to ${this.toDate}`,
        LeaveType: this.selectedLeaveType,
        NetLeaveBalance: "5.00 day(s)",
        RequestedDuration: `${dayDiff}.00 day(s)`,
        Status: "Approved",
        RequestComment: '',
        AppliedOn: this.getCurrentDateTime(),
        ApprovalComment: this.comment,
        Id: this.token.getRandomToken()
      };

      leaveRequests.push(leaveRequest);
    });


  // leaveRequests.push(leaveRequest);

  localStorage.setItem('leaveRequest', JSON.stringify(leaveRequests));

  this.selectedEmployee = []
  this.comment = ''
  this.fromDate = ''
  this.toDate = ''
  this.selectedLeaveType = ''
  this.messageService.add({ severity: 'success', summary: 'Leave', detail: `Leave assigned sucessfully`, key: 'tl', life: 3000 });

  }else {
  this.messageService.add({ severity: 'error', summary: 'Leave', detail: "Please ensure all required fields are filled", key: 'tl', life: 3000 });
  }

}

}
