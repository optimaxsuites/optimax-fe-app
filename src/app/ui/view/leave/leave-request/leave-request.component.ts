import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';
import { RandomTokenService } from '../../../shared-component/service/random-token/random-token.service';
import { LeaveServiceService } from '../../../service/leave-service.service';
import { LeaveRequest } from '../../../domain/leave.dto';

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
  selectedRequest!: LeaveRequest | null;
  searchTerm: string = '';

  comment: string = '';
  employeeInView: any;
  openViewEmployee: boolean = false;
  savedEmployees: any[] = [];
  allLeaveRequest: LeaveRequest[] = [];
  filteredCandidates: LeaveRequest[] = [];

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
    this.filteredCandidates = this.allLeaveRequest.filter((employee) =>
      employee.EmployeeId.toLowerCase().includes(this.searchTerm.toLowerCase()),
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
    this.selectedRequest = employee;
    this.acceptModal = true;
  }

  acceptLeave() {
    if (!this.selectedRequest) return;

    if (!this.selectedRequest.Status.includes('Pending')) return;

    const employee = this.leaveService.getEmployeeById(
      this.selectedRequest.EmployeeId,
    );
    if (!employee) return;

    const requestedDays = Number(
      parseFloat(this.selectedRequest.RequestedDuration),
    );

    const leaveType = employee.leaveTypes.find(
      (lt) => lt.typeName === this.selectedRequest?.LeaveType,
    );

    if (!leaveType) {
      // this.rejectWithComment('Invalid leave type');
      return;
    }

    const remaining = leaveType.allocatedDays - leaveType.daysUsed;

    if (requestedDays > remaining) {
      // this.rejectWithComment('Insufficient leave balance');
      this.messageService.add({
        severity: 'warn',
        summary: 'Leave',
        detail: `${this.selectedRequest?.EmployeeId} has insufficient leave balance`,
        key: 'tl',
        life: 3000,
      });
      return;
    }

    // ✅ Apply approval
    leaveType.daysUsed += requestedDays;
    employee.leaveUsed += requestedDays;

    this.leaveService.updateEmployee(employee);

    this.selectedRequest.Status = 'Approved';
    this.selectedRequest.ApprovalComment = this.comment || 'No comment';

    this.updateLocalStorage();

    this.comment = '';
    this.closeModal();
  }

  rejectLeave() {
    if (
      this.selectedRequest &&
      this.selectedRequest.Status.includes('Pending Approval')
    ) {
      this.selectedRequest.Status = 'Rejected';

      this.selectedRequest.ApprovalComment = this.comment
        ? this.comment
        : 'No comment';

      this.comment = '';
      this.messageService.add({
        severity: 'warn',
        summary: 'Leave',
        detail: `${this.selectedRequest?.EmployeeId}'s leave has been rejected`,
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
    this.selectedRequest = null;
  }

  selectedRequests: LeaveRequest[] = [];

  bulkApprove() {
  // Check if any requests selected
  if (this.selectedRequests.length === 0) {
    this.messageService.add({
      severity: 'warn',
      summary: 'No Selection',
      detail: 'Please select requests to approve',
      key: 'tl',
      life: 3000,
    });
    return;
  }

  // Filter only pending requests
  const pendingRequests = this.selectedRequests.filter(req =>
    req.Status.includes('Pending Approval')
  );

  // Check if all selected are already processed
  if (pendingRequests.length === 0) {
    this.messageService.add({
      severity: 'warn',
      summary: 'Already Processed',
      detail: 'Selected requests have already been decided',
      key: 'tl',
      life: 3000,
    });
    this.selectedRequests = [];
    return;
  }

  let approvedCount = 0;
  let rejectedCount = 0;
  const rejectionReasons: string[] = [];

  // Process each pending request
  pendingRequests.forEach((request) => {
    const employee = this.leaveService.getEmployeeById(request.EmployeeId);
    
    if (!employee) {
      rejectedCount++;
      rejectionReasons.push(`${request.EmployeeId}: Employee not found`);
      return;
    }

    const requestedDays = parseFloat(request.RequestedDuration);

    // Find the leave type for this request
    const leaveType = employee.leaveTypes.find(
      (lt) => lt.typeName === request.LeaveType
    );

    if (!leaveType) {
      // Auto-reject if leave type not found
      request.Status = 'Rejected';
      request.ApprovalComment = 'Leave type not found in employee records';
      rejectedCount++;
      rejectionReasons.push(`${request.EmployeeId} (${request.LeaveType}): Leave type not found`);
      return;
    }

    const remaining = leaveType.allocatedDays - leaveType.daysUsed;

    // Check if sufficient balance
    if (requestedDays > remaining) {
      // Auto-reject if insufficient balance
      request.Status = 'Rejected';
      request.ApprovalComment = `Insufficient balance. Only ${remaining} days remaining for ${request.LeaveType}`;
      rejectedCount++;
      rejectionReasons.push(
        `${request.EmployeeId} (${request.LeaveType}): Only ${remaining} days remaining`
      );
    } else {
      // Approve and update balance
      leaveType.daysUsed += requestedDays;
      employee.leaveUsed += requestedDays;
      
      // Update employee in service
      this.leaveService.updateEmployee(employee);
      
      // Update request status
      request.Status = 'Approved';
      request.ApprovalComment = 'Bulk approved by admin';
      approvedCount++;
    }
  });

  // Save all updated requests to localStorage
  localStorage.setItem('leaveRequest', JSON.stringify(this.allLeaveRequest));

  // Show detailed summary message
  if (approvedCount > 0 && rejectedCount === 0) {
    this.messageService.add({
      severity: 'success',
      summary: 'Bulk Approval Complete',
      detail: `${approvedCount} request(s) approved successfully`,
      key: 'tl',
      life: 4000,
    });
  } else if (approvedCount === 0 && rejectedCount > 0) {
    this.messageService.add({
      severity: 'error',
      summary: 'Bulk Approval Failed',
      detail: `${rejectedCount} request(s) rejected due to insufficient balance`,
      key: 'tl',
      life: 4000,
    });
  } else if (approvedCount > 0 && rejectedCount > 0) {
    this.messageService.add({
      severity: 'info',
      summary: 'Bulk Approval Completed',
      detail: `${approvedCount} approved, ${rejectedCount} rejected (insufficient balance)`,
      key: 'tl',
      life: 5000,
    });
  }

  // Log rejection reasons for debugging
  if (rejectionReasons.length > 0) {
    console.warn('Bulk Approval - Rejected Requests:', rejectionReasons);
  }

  // Clear selection and reload data
  this.selectedRequests = [];
  this.ngOnInit(); // Reload data to refresh the view
}

  bulkReject() {
  // Check if any requests selected
  if (this.selectedRequests.length === 0) {
    this.messageService.add({
      severity: 'warn',
      summary: 'No Selection',
      detail: 'Please select requests to reject',
      key: 'tl',
      life: 3000,
    });
    return;
  }

  // Filter only pending requests
  const pendingRequests = this.selectedRequests.filter(req =>
    req.Status.includes('Pending Approval')
  );

  // Check if all selected are already processed
  if (pendingRequests.length === 0) {
    this.messageService.add({
      severity: 'warn',
      summary: 'Already Processed',
      detail: 'Selected requests have already been decided',
      key: 'tl',
      life: 3000,
    });
    this.selectedRequests = [];
    return;
  }

  // Reject all pending requests
  pendingRequests.forEach((request) => {
    request.Status = 'Rejected';
    request.ApprovalComment = 'Bulk rejected by admin';
  });

  // Save all updated requests to localStorage
  localStorage.setItem('leaveRequest', JSON.stringify(this.allLeaveRequest));

  // Show success message
  this.messageService.add({
    severity: 'warn',
    summary: 'Bulk Rejection Complete',
    detail: `${pendingRequests.length} request(s) rejected`,
    key: 'tl',
    life: 3000,
  });

  // Clear selection and reload data
  this.selectedRequests = [];
  this.ngOnInit(); // Reload data to refresh the view
}

  updateLocalStorage() {
    localStorage.setItem(
      'leaveRequest',
      JSON.stringify(this.filteredCandidates),
    );
  }

  viewEmployee(employee: any, op: any) {
    this.employeeInView = employee;
    console.log(employee);
    this.openViewEmployee = true;
    op.hide();
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
