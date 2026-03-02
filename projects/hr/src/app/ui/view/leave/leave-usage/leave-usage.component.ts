import { Component, OnInit } from '@angular/core';
import { OverlayPanel } from 'primeng/overlaypanel';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import { LeaveServiceService } from '../../../service/leave-service.service';
import dayGridPlugin from '@fullcalendar/daygrid';
import { Employee, LeaveSettings } from '../../../domain/leave.dto';
import { MessageService } from 'primeng/api';
import { RandomTokenService } from '../../../shared-component/service/random-token/random-token.service';
import { TableAction, TableColumn } from '../../../shared-component/view/table/table.component';

@Component({
  selector: 'app-leave-usage',
  templateUrl: './leave-usage.component.html',
  styleUrl: './leave-usage.component.scss',
  providers: [MessageService],
})
export class LeaveUsageComponent implements OnInit {
  employee!: Employee;
  statuses: string[] = ['Pending Approval', 'Approved', 'Rejected'];
  leaveSettings!: LeaveSettings;
  leaveTypes!: string[];
  allowedLeaveTypes!: string[];
  userInfoRegData: any[] = [];
  userRegData: any = {};
  searchTerm: string = '';
  selectedLeaveType: string[] = [];
  selectedStatus: string[] = [];
  myRequests: any = [];
  filteredRequests: any = [];
  requestInView: any;
  openViewRequest: boolean = false;
  fromDate: any;
  toDate: any;
  today!: string;
  comment: any;
  attachment: any;
  docUploadStatus: string = 'Upload file';
  selectedLeave: string = ''; // Added this too
  openApplyLeave = false;
  requestColumns: TableColumn[] = [
    { header: 'Date', field: 'AppliedOn', sortable: true, className: 'table-item' },
    { header: 'Date Applied for', field: 'Date', sortable: true, className: 'table-item' },
    { header: 'Leave Type', field: 'LeaveType', sortable: true, className: 'table-item' },
    {
      header: 'Net Leave Balance',
      field: 'NetLeaveBalance',
      sortable: true,
      className: 'table-item',
      formatter: (row) => `${row.NetLeaveBalance ?? 0} day(s)`
    },
    { header: 'Requested Duration', field: 'RequestedDuration', sortable: true, className: 'table-item' },
    { header: 'Status', field: 'Status', sortable: true, className: 'table-item' }
  ];
  requestActions: TableAction[] = [
    { id: 'view', label: 'View', icon: 'pi pi-eye' }
  ];

  calendarEvents: EventInput[] = [];
  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin],
    events: this.calendarEvents,
  };
  totalDays = 21;
  usedDays = 6;
  total = 53;
  approved = 40;
  rejected = 3;
  pending = 15;
  //End of addition play
  constructor(
    private messageService: MessageService,
    private token: RandomTokenService,
    private leaveService: LeaveServiceService,
  ) {}
  ngOnInit() {
    // this.userInfoRegData = JSON.parse(sessionStorage["userPrimaryInfoRegData"]);
    this.leaveSettings = this.leaveService.getLeaveSettings();
    this.leaveTypes = this.leaveSettings.leaveTypes
      .filter((leave) => leave.isActive)
      .map((leave) => leave.typeName);
    this.employee = this.leaveService.getEmployeeById('EMP-001');
    this.allowedLeaveTypes = this.employee.leaveTypes
      .filter((leave) => leave.allocatedDays > leave.daysUsed)
      .map((leave) => leave.typeName);
    console.log(this.allowedLeaveTypes);
    this.today = new Date().toISOString().split('T')[0];
    this.userRegData = this.userInfoRegData;
    // this.filteredRequests = this.allRequests.filter(
    //   (request: any) => request.Employee === this.userRegData.fullname,
    // );
    this.filteredRequests = this.leaveService.getEmployeeLeaveRequests(
      this.employee.id,
    );
    this.myRequests = [...this.filteredRequests];
    this.sortByStatus();
    this.updateCalendarEvents();
  }
  get remainingDays(): number {
    return this.totalDays - this.usedDays;
  }

  get usedPercentage(): number {
    return (this.usedDays / this.totalDays) * 100;
  }
  getTotalAllocatedDays(): number {
    return this.employee.leaveTypes.reduce(
      (sum, lt) => sum + lt.allocatedDays,
      0,
    );
  }
  getTotalUsedDays(): number {
    return this.employee.leaveTypes.reduce((sum, lt) => sum + lt.daysUsed, 0);
  }
  getRemainingDays(): number {
    return this.getTotalAllocatedDays() - this.getTotalUsedDays();
  }
  openApplyLeaveModal() {
    this.openApplyLeave = true;
  }

  sortByStatus() {
    this.myRequests.sort((a: any, b: any) => {
      const dateA = new Date(a.AppliedOn);
      const dateB = new Date(b.AppliedOn);
      return dateB.getTime() - dateA.getTime();
    });
  }

  filterCandidates() {
    this.myRequests = this.filteredRequests.filter(
      (employee: { Employee: string; LeaveType: any; Status: any }) => {
        const matchesSearchTerm = employee.Employee.toLowerCase().includes(
          this.searchTerm.toLowerCase(),
        );

        // Check if the candidate matches one of the selected leaveType or status (if any)
        const matchesLeaveType =
          this.selectedLeaveType.length === 0 ||
          this.selectedLeaveType.includes(employee.LeaveType);
        const matchesStatus =
          this.selectedStatus.length === 0 ||
          this.selectedStatus.includes(employee.Status);

        // Return true if all conditions are met
        return matchesSearchTerm && matchesLeaveType && matchesStatus;
      },
    );
    this.sortByStatus();
    this.updateCalendarEvents();
  }
  filterBySelectedStatus() {
    console.log(this.selectedStatus);
    if (this.selectedStatus.length == 0) {
      this.myRequests = [...this.filteredRequests];
    } else {
      this.myRequests = this.filteredRequests.filter(
        (employee: { Status: string }) =>
          this.selectedStatus.some((status: string) =>
            employee.Status.toLowerCase().includes(status.toLowerCase()),
          ),
      );
    }

    if (this.searchTerm && this.searchTerm.trim() !== '') {
      this.filterCandidates();
    }
    this.sortByStatus();
  }

  filterBySelectedLeaveType() {
    if (this.selectedLeaveType.length == 0) {
      this.myRequests = [...this.filteredRequests];
    } else {
      this.myRequests = this.filteredRequests.filter(
        (employee: { LeaveType: string }) =>
          this.selectedLeaveType.some((status: string) =>
            employee.LeaveType.toLowerCase().includes(status.toLowerCase()),
          ),
      );
    }

    if (this.searchTerm && this.searchTerm.trim() !== '') {
      this.filterCandidates();
    }
    this.sortByStatus();
  }

  viewLRequest(request: any, op?: OverlayPanel) {
    this.requestInView = request;
    this.openViewRequest = true;
    op?.hide();
  }

  handleRequestAction(event: { actionId: string; row: any }) {
    if (event.actionId === 'view') {
      this.viewLRequest(event.row);
    }
  }
  ////kd added this function
  parseDateRange(dateRange: string) {
    const [start, end] = dateRange.split(' to ');

    return {
      start: start,
      end: end,
    };
  }
  addOneDay(date: string) {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  updateCalendarEvents() {
    this.calendarEvents = this.myRequests.map((req: any) => {
      const { start, end } = this.parseDateRange(req.Date);

      return {
        title: req.LeaveType,
        start,
        end: this.addOneDay(end),
      };
    });

    this.calendarOptions = {
      ...this.calendarOptions,
      events: this.calendarEvents,
    };
  }

  // apply

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
    this.selectedLeave = '';
    this.attachment = null;
  }

  assignLeave() {
    let leaveRequests = JSON.parse(
      localStorage.getItem('leaveRequest') || '[]',
    );

    if (this.fromDate && this.toDate && this.selectedLeave) {
      const from = new Date(this.fromDate);
      const to = new Date(this.toDate);
      const timeDiff = to.getTime() - from.getTime();
      const dayDiff = timeDiff / (1000 * 3600 * 24) + 1;
      const createLeaveRequest = (attachmentData: any) => {
        const leaveRequest = {
          Employee: this.userRegData.fullname,
          EmployeeId: this.employee.id,
          Date: `${this.fromDate} to ${this.toDate}`,
          LeaveType: this.selectedLeave,
          NetLeaveBalance:
            this.leaveSettings.totalLeaveDaysAllowed - this.employee.leaveUsed,
          RequestedDuration: `${dayDiff}.00 day(s)`,
          Status: `Pending Approval (${dayDiff}.00 day(s))`,
          RequestComment: this.comment ? this.comment : 'No comment',
          AppliedOn: this.getCurrentDateTime(),
          ApprovalComment: '',
          Id: this.token.getRandomToken(),
          Attachment: attachmentData,
        };
        leaveRequests.push(leaveRequest);
        this.leaveService.createLeaveRequest(leaveRequest);
        this.filteredRequests = this.leaveService.getEmployeeLeaveRequests(
          this.employee.id,
        );
        this.myRequests = [...this.filteredRequests];

        this.resetForm();
        this.messageService.add({
          severity: 'success',
          summary: 'Leave',
          detail: `Leave requested successfully`,
          key: 'tl',
          life: 3000,
        });
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
