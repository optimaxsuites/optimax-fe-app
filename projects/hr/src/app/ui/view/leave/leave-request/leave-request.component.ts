import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';
import { RandomTokenService } from '../../../shared-component/service/random-token/random-token.service';
import { LeaveServiceService } from '../../../service/leave-service.service';
import { LeaveRequest } from '../../../domain/leave.dto';
import { TableAction, TableColumn } from '../../../shared-component/view/table/table.component';

@Component({
  selector: 'app-leave-request',
  templateUrl: './leave-request.component.html',
  styleUrl: './leave-request.component.scss',
  providers: [MessageService],
})
export class LeaveRequestComponent {
  // employees = [
  //   {
  //     id: 'EMP-001',
  //     totalLeaveAllowed: 21,
  //     leaveUsed: 0,
  //   },
  // ];
  statuses: string[] = ['Pending Approval', 'Approved', 'Rejected'];
  leaveTypes!: string[];
  selectedLeaveType!: string[];
  selectedStatus: string[] = [];
  acceptModal = false;
  selectedEmployee: any = null;
  searchTerm: string = '';

  comment: string = '';
  employeeInView: any;
  openViewEmployee: boolean = false;
  savedEmployees: any[] = [];
  allLeaveRequest: LeaveRequest[] = [];
  filteredCandidates: LeaveRequest[] = [];
  leaveRequestColumns: TableColumn[] = [
    { header: 'Employee', field: 'Employee', sortable: true, className: 'table-item' },
    { header: 'Date Applied for', field: 'Date', sortable: true, className: 'table-item' },
    { header: 'Leave Type', field: 'LeaveType', sortable: true, className: 'table-item' },
    { header: 'Net Leave Balance', field: 'NetLeaveBalance', sortable: true, className: 'table-item' },
    { header: 'Requested Duration', field: 'RequestedDuration', sortable: true, className: 'table-item' },
    { header: 'Status', field: 'Status', sortable: true, className: 'table-item' },
  ];
  leaveRequestActions: TableAction[] = [
    { id: 'view', label: 'View', icon: 'pi pi-eye' },
    {
      id: 'approveReject',
      label: 'Approve/Reject',
      icon: 'pi pi-download',
      visible: (row) => row?.Status?.includes('Pending Approval'),
    }
  ];

  constructor(
    private messageService: MessageService,
    private token: RandomTokenService,
    private leaveService: LeaveServiceService,
  ) {}
  ngOnInit() {
    this.allLeaveRequest = this.leaveService.getAllLeaveRequests();
    this.leaveTypes = this.getLeaveTypes();
    this.filteredCandidates = [...this.allLeaveRequest];
    // this.savedEmployees = JSON.parse(
    //   localStorage.getItem('leaveRequest') || '[]',
    // );
    // this.filteredCandidates = [...this.savedEmployees];
    this.sortByStatus();
  }
  getLeaveTypes() {
    // return this.allLeaveRequest.map((request) => request.LeaveType);
    return this.leaveService
      .getLeaveSettings()
      .leaveTypes.map((lt) => lt.typeName);
  }
  // getEmployeebyId(employeeId: string) {
  //   return this.employees.find((emp) => emp.id === employeeId);
  // }
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
    this.filteredCandidates = this.allLeaveRequest.filter(
      (employee) =>
        employee.EmployeeId.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
    this.filteredCandidates = this.allLeaveRequest.filter((employee) => {
      const matchesSearchTerm = employee.EmployeeId.toLowerCase().includes(
        this.searchTerm.toLowerCase(),
      );
      const matchesLeaveType =
        this.selectedLeaveType.length === 0 ||
        this.selectedLeaveType.includes(employee.LeaveType);
      const matchesStatus =
        this.selectedStatus.length === 0 ||
        this.selectedStatus.includes(employee.Status);
      return matchesSearchTerm && matchesLeaveType && matchesStatus;
    });
    this.sortByStatus();
  }
  filterBySelectedStatus() {
    if (this.selectedStatus.length == 0) {
      this.filteredCandidates = [...this.allLeaveRequest];
    } else {
      this.filteredCandidates = this.allLeaveRequest.filter(
        (employee: { Status: string }) =>
          this.selectedStatus.some((status) =>
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
      this.filteredCandidates = [...this.allLeaveRequest];
    } else {
      this.filteredCandidates = this.allLeaveRequest.filter(
        (employee: { LeaveType: string }) =>
          this.selectedLeaveType.some((status) =>
            employee.LeaveType.toLowerCase().includes(status.toLowerCase()),
          ),
      );
    }

    if (this.searchTerm && this.searchTerm.trim() !== '') {
      this.filterCandidates();
    }
    this.sortByStatus();
  }
  openAcceptRejectModal(employee: any) {
    this.openViewEmployee = false;
    this.selectedEmployee = employee;
    this.acceptModal = true;
  }

  // acceptLeave() {
  //   if (
  //     this.selectedEmployee &&
  //     this.selectedEmployee.Status.includes('Pending Approval')
  //   ) {
  //     let employee = this.getEmployeebyId(this.selectedEmployee.EmployeeId);
  //     if (!employee) return;
  //     let requestedDays = Number(
  //       parseFloat(this.selectedEmployee.requestedDuration),
  //     );
  //     if (employee.leaveUsed + requestedDays > employee.totalLeaveAllowed) {
  //       this.selectedEmployee.status = 'Rejected';
  //     } else {
  //       this.selectedEmployee.status = 'Approved';
  //       employee.leaveUsed += requestedDays;
  //     }
  //     this.selectedEmployee.Status = 'Approved';

  //     this.selectedEmployee.ApprovalComment = this.comment
  //       ? this.comment
  //       : 'No comment';

  //     this.comment = '';
  //     this.messageService.add({
  //       severity: 'success',
  //       summary: 'Leave',
  //       detail: `${this.selectedEmployee?.Employee}'s leave has been accepted`,
  //       key: 'tl',
  //       life: 3000,
  //     });

  //     this.closeModal();
  //     this.updateLocalStorage();

  //     this.sortByStatus();
  //   }
  // }
  acceptLeave() {
    if (!this.selectedEmployee) return;

    if (!this.selectedEmployee.Status.includes('Pending')) return;

    const employee = this.leaveService.getEmployeeById(
      this.selectedEmployee.EmployeeId,
    );
    if (!employee) return;

    const requestedDays = Number(
      parseFloat(this.selectedEmployee.RequestedDuration),
    );

    const leaveType = employee.leaveTypes.find(
      (lt) => lt.typeName === this.selectedEmployee.LeaveType,
    );

    if (!leaveType) {
      // this.rejectWithComment('Invalid leave type');
      return;
    }

    const remaining = leaveType.allocatedDays - leaveType.daysUsed;

    if (requestedDays > remaining) {
      // this.rejectWithComment('Insufficient leave balance');
      return;
    }

    // ✅ Apply approval
    leaveType.daysUsed += requestedDays;
    employee.leaveUsed += requestedDays;

    this.leaveService.updateEmployee(employee);

    this.selectedEmployee.Status = 'Approved';
    this.selectedEmployee.ApprovalComment = this.comment || 'No comment';

    this.updateLocalStorage();

    this.comment = '';
    this.closeModal();
  }

  rejectLeave() {
    if (
      this.selectedEmployee &&
      this.selectedEmployee.Status.includes('Pending Approval')
    ) {
      this.selectedEmployee.Status = 'Rejected';

      this.selectedEmployee.ApprovalComment = this.comment
        ? this.comment
        : 'No comment';

      this.comment = '';
      this.messageService.add({
        severity: 'warn',
        summary: 'Leave',
        detail: `${this.selectedEmployee?.Employee}'s leave has been rejected`,
        key: 'tl',
        life: 3000,
      });

      this.closeModal();
      this.updateLocalStorage();

      this.sortByStatus();
    }
  }

  closeModal() {
    this.acceptModal = false;
    this.selectedEmployee = null;
  }

  selectedEmployees: any[] = [];

  bulkApprove() {
    if (this.selectedEmployees.length == 0) return;
    if (
      this.selectedEmployees.every(
        (emp) =>
          emp.Status.includes('Approved') || emp.Status.includes('Rejected'),
      )
    ) {
      this.selectedEmployees = [];
      this.messageService.add({
        severity: 'warn',
        summary: 'Leave',
        detail: `Selected leave(s) has already been decided`,
        key: 'tl',
        life: 3000,
      });
      return;
    }

    this.selectedEmployees.forEach((employee) => {
      if (employee.Status.includes('Pending Approval')) {
        employee.Status = 'Approved';
      }
    });

    this.messageService.add({
      severity: 'success',
      summary: 'Leave',
      detail: `Selected leave(s) has been accepted`,
      key: 'tl',
      life: 3000,
    });
    this.updateLocalStorage();

    this.selectedEmployees = [];
    this.sortByStatus();
  }

  bulkReject() {
    if (this.selectedEmployees.length == 0) return;
    if (
      this.selectedEmployees.every(
        (emp) =>
          emp.Status.includes('Approved') || emp.Status.includes('Rejected'),
      )
    ) {
      this.selectedEmployees = [];
      this.messageService.add({
        severity: 'warn',
        summary: 'Leave',
        detail: `Selected leave(s) has already been decided`,
        key: 'tl',
        life: 3000,
      });
      return;
    }

    this.selectedEmployees.forEach((employee) => {
      if (employee.Status.includes('Pending Approval')) {
        employee.Status = 'Rejected';
      }
    });
    this.updateLocalStorage();
    this.messageService.add({
      severity: 'warn',
      summary: 'Leave',
      detail: `Selected leave(s) has been rejected`,
      key: 'tl',
      life: 3000,
    });
    this.selectedEmployees = [];
    this.sortByStatus();
  }

  updateLocalStorage() {
    localStorage.setItem(
      'leaveRequest',
      JSON.stringify(this.filteredCandidates),
    );
  }

  viewEmployee(employee: any, op?: any) {
    this.employeeInView = employee;
    console.log(employee);
    this.openViewEmployee = true;
    op?.hide?.();
  }

  handleLeaveRequestAction(event: { actionId: string; row: any }) {
    if (event.actionId === 'view') {
      this.viewEmployee(event.row);
    }
    if (event.actionId === 'approveReject') {
      this.openAcceptRejectModal(event.row);
    }
  }

  downloadAttachment(leaveRequest: any) {
    if (leaveRequest.Attachment != 'Null') {
      const link = document.createElement('a');
      link.href = leaveRequest.Attachment.fileData;
      link.download = leaveRequest.Attachment.fileName;
      link.click();
    } else {
      this.messageService.add({
        severity: 'info',
        summary: 'No Attachment',
        detail: 'No file attached to this request.',
        key: 'tl',
        life: 3000,
      });
    }
  }
}
