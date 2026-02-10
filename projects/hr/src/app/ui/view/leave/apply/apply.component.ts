import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { RandomTokenService } from '../../../shared-component/service/random-token/random-token.service';
import { LeaveServiceService } from '../../../service/leave-service.service';
import { Employee, LeaveSettings } from '../../../domain/leave.dto';

@Component({
  selector: 'app-apply',
  templateUrl: './apply.component.html',
  styleUrl: './apply.component.scss',
  providers: [MessageService],
})
export class ApplyComponent implements OnInit {
  leaveSettings!: LeaveSettings;
  employee!: Employee;
  userInfoRegData: any[] = [];
  userRegData: any = {};
  fromDate: any;
  toDate: any;
  today!: string;
  leaveTypes: string[] = [];
  comment: any;
  selectedLeaveType: any;
  attachment: any;
  docUploadStatus: string = 'Upload file';
  constructor(
    private messageService: MessageService,
    private token: RandomTokenService,
    private leaveService: LeaveServiceService,
  ) {}
  ngOnInit() {
    // this.loadLeaveSettings();
    this.leaveSettings = this.leaveService.getLeaveSettings();
    this.leaveTypes = this.leaveSettings.leaveTypes
      .filter((leave) => leave.isActive)
      .map((leave) => leave.typeName);
      console.log('Leave Types:', this.leaveTypes);
    this.employee = this.leaveService.getEmployeeById('EMP-001');
    this.today = new Date().toISOString().split('T')[0];
    // this.userInfoRegData = JSON.parse(sessionStorage["userPrimaryInfoRegData"]);
    this.userRegData = this.userInfoRegData;
  }

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

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.attachment = file;
      this.docUploadStatus = 'File attached';
    }
  }
  resetForm() {
    this.comment = '';
    this.fromDate = '';
    this.toDate = '';
    this.selectedLeaveType = '';
    this.attachment = null;
  }

  assignLeave() {
    let leaveRequests = JSON.parse(
      localStorage.getItem('leaveRequest') || '[]',
    );

    if (this.fromDate && this.toDate && this.selectedLeaveType.length > 0) {
      const from = new Date(this.fromDate);
      const to = new Date(this.toDate);
      const timeDiff = to.getTime() - from.getTime();
      const dayDiff = timeDiff / (1000 * 3600 * 24) + 1;

      const createLeaveRequest = (attachmentData: any) => {
        if (this.employee) {
          const leaveRequest = {
            Employee: this.userRegData.fullname,
            EmployeeId: this.employee.id,
            Date: `${this.fromDate} to ${this.toDate}`,
            LeaveType: this.selectedLeaveType,
            NetLeaveBalance:
              this.leaveSettings.totalLeaveDaysAllowed -
              this.employee.leaveUsed,
            RequestedDuration: `${dayDiff}.00 day(s)`,
            Status: `Pending Approval (${dayDiff}.00 day(s))`,
            RequestComment: this.comment ? this.comment : 'No comment',
            AppliedOn: this.getCurrentDateTime(),
            ApprovalComment: '',
            Id: this.token.getRandomToken(),
            Attachment: attachmentData,
          };

          leaveRequests.push(leaveRequest);
          localStorage.setItem('leaveRequest', JSON.stringify(leaveRequests));

          this.resetForm();
          this.messageService.add({
            severity: 'success',
            summary: 'Leave',
            detail: `Leave requested successfully`,
            key: 'tl',
            life: 3000,
          });
        }
      };

      const handleFileRead = (): Promise<any> => {
        return new Promise((resolve, reject) => {
          if (this.attachment) {
            const file = this.attachment;
            const reader = new FileReader();

            reader.onload = () => {
              const attachmentData = {
                fileName: file.name,
                fileType: file.type,
                fileData: reader.result,
              };
              resolve(attachmentData);
            };

            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
          } else {
            resolve(null);
          }
        });
      };

      handleFileRead()
        .then((attachmentData) => {
          createLeaveRequest(attachmentData);
        })
        .catch((error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'File Error',
            detail: 'Error reading the file',
            life: 3000,
          });
          console.error('File reading error:', error);
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
  preventTyping(event: KeyboardEvent) {
    event.preventDefault();
  }
  onFromDateChange() {
    if (this.toDate && this.fromDate > this.toDate) {
      this.toDate = ''; // reset invalid selection
    }
  }
}
