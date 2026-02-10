import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';
import { RandomTokenService } from '../../../shared-component/service/random-token/random-token.service';
import { LeaveServiceService } from '../../../service/leave-service.service';

interface LeaveType {
  id: string;
  typeName: string;
  isActive: boolean;
}

@Component({
  selector: 'app-assign-leave',
  templateUrl: './assign-leave.component.html',
  styleUrl: './assign-leave.component.scss',
  providers: [MessageService],
})
export class AssignLeaveComponent {
  constructor(
    private messageService: MessageService,
    private token: RandomTokenService,
    private leaveService: LeaveServiceService,
  ) {}
  selectedEmployee: string[] = [];
  employees: any[] = [];

  ngOnInit(): void {
    this.loadLeaveTypes();
    this.leaveService.getEmployees().subscribe(async (data) => {
      if (data) {
        this.employees = [...data];
        console.log(this.employees);
      } else {
        console.log('error loading data');
      }
    });
  }
  loadLeaveTypes(): void {
    const stored = localStorage.getItem('leaveSettings');
    if (stored) {
      const data = JSON.parse(stored);
      this.leaveTypes = data.leaveTypes
        .filter((leave: LeaveType) => leave.isActive)
        .map((leave: LeaveType) => leave.typeName);
    }
  }

  leaveTypes: string[] = [];
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
    let leaveRequests = JSON.parse(
      localStorage.getItem('leaveRequest') || '[]',
    );

    if (
      this.selectedEmployee.length > 0 &&
      this.fromDate &&
      this.toDate &&
      this.selectedLeaveType.length > 0
    ) {
      const from = new Date(this.fromDate);
      const to = new Date(this.toDate);

      const timeDiff = to.getTime() - from.getTime();

      const dayDiff = timeDiff / (1000 * 3600 * 24);
      this.selectedEmployee.forEach((employee: any) => {
        const leaveRequest = {
          Employee: employee,
          Date: `${this.fromDate} to ${this.toDate}`,
          LeaveType: this.selectedLeaveType,
          NetLeaveBalance: '5.00 day(s)',
          RequestedDuration: `${dayDiff}.00 day(s)`,
          Status: 'Approved',
          RequestComment: '',
          AppliedOn: this.getCurrentDateTime(),
          ApprovalComment: this.comment,
          Id: this.token.getRandomToken(),
        };

        leaveRequests.push(leaveRequest);
      });

      // leaveRequests.push(leaveRequest);

      localStorage.setItem('leaveRequest', JSON.stringify(leaveRequests));

      this.selectedEmployee = [];
      this.comment = '';
      this.fromDate = '';
      this.toDate = '';
      this.selectedLeaveType = '';
      this.messageService.add({
        severity: 'success',
        summary: 'Leave',
        detail: `Leave assigned sucessfully`,
        key: 'tl',
        life: 3000,
      });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Leave',
        detail: 'Please ensure all required fields are filled',
        key: 'tl',
        life: 3000,
      });
    }
  }
}
