import { Component } from '@angular/core';
import { EmployeeService } from '../../../service/employee.service';
import { PayrollService } from '../../../service/payroll.service';
import { TableAction, TableColumn } from '../../../shared-component/view/table/table.component';

type QueryStatus = 'OPEN' | 'RESPONDED' | 'VERDICT_PASSED';
type QueryVerdict = 'APPROVED' | 'REJECTED' | 'PENDING';
type OperationType = 'ADDITION' | 'DEDUCTION';

interface QueryRecord {
  id: number;
  employee?: any;
  employeeId?: number;
  createdById?: number;
  periodMonth: number;
  periodYear: number;
  issue: string;
  description: string;
  amount: number;
  operationType: OperationType;
  requiresJustification: boolean;
  status: QueryStatus;
  verdict: QueryVerdict;
  response?: string;
  respondedAt?: number[];
}

@Component({
  selector: 'app-query',
  templateUrl: './query.component.html',
  styleUrl: './query.component.scss'
})
export class QueryComponent {
  userRole = sessionStorage.getItem('role') || localStorage.getItem('role') || 'Employee';
  isAdmin = this.userRole.toLowerCase().includes('admin');
  currentUserId = Number(sessionStorage.getItem('userid') || localStorage.getItem('userid') || 0);
  currentEmployeeId: number | null = null;
  showCreateForm = false;
  showDetail = false;
  selectedQuery: QueryRecord | null = null;
  searchTerm = '';
  statusFilter: QueryStatus | 'All' = 'All';
  activeTab: 'all' | 'mine' = this.isAdmin ? 'all' : 'mine';
  queryRecords: QueryRecord[] = [];
  filteredQueries: QueryRecord[] = [];
  queryColumns: TableColumn[] = [];
  queryActions: TableAction[] = [];
  employees: any[] = [];
  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  years = Array.from({ length: 11 }, (_, index) => new Date().getFullYear() - 5 + index);

  createForm = {
    employeeId: null as number | null,
    periodMonth: new Date().getMonth() + 1,
    periodYear: new Date().getFullYear(),
    issue: '',
    description: '',
    amount: null as number | null,
    operationType: 'DEDUCTION' as OperationType,
    requiresJustification: true
  };

  constructor(private employeeService: EmployeeService, private payrollService: PayrollService) {}

  ngOnInit() {
    this.loadCurrentEmployeeId();
    this.loadEmployees();
    this.fetchQueries();
  }

  private loadCurrentEmployeeId() {
    if (!this.currentUserId) {
      return;
    }
    this.employeeService.getEmployeeByUserId(this.currentUserId).subscribe({
      next: (employeeId) => {
        this.currentEmployeeId = Number(employeeId) || null;
        this.refreshView();
      },
      error: () => {
        this.currentEmployeeId = null;
        this.refreshView();
      }
    });
  }

  private loadEmployees() {
    this.employeeService.getAllEmployee().subscribe({
      next: (employees) => {
        this.employees = employees || [];
      },
      error: (err) => console.log(err)
    });
  }

  private fetchQueries() {
    this.payrollService.getEmployeePayrollBonuses({
      page: 1,
      size: 500,
      sourceType: 'QUERY'
    }).subscribe({
      next: (data) => {
        this.queryRecords = data || [];
        this.refreshView();
      },
      error: (err) => console.log(err)
    });
  }

  refreshView() {
    const term = this.searchTerm.toLowerCase();
    this.filteredQueries = this.queryRecords.filter((query) => {
      const isMine = this.currentEmployeeId ? query.employee?.id === this.currentEmployeeId : false;
      const roleMatch = this.isAdmin ? (this.activeTab === 'all' || query.createdById === this.currentUserId) : isMine;
      const statusMatch = this.statusFilter === 'All' || query.status === this.statusFilter;
      const employeeName = `${query.employee?.firstName ?? ''} ${query.employee?.lastName ?? ''}`.trim().toLowerCase();
      const termMatch = !term
        || (query.issue || '').toLowerCase().includes(term)
        || employeeName.includes(term)
        || (query.description || '').toLowerCase().includes(term);
      return roleMatch && statusMatch && termMatch;
    });

    this.queryColumns = this.isAdmin
      ? [
          { header: 'Employee', sortable: true, className: 'table-item', formatter: (row) => `${row.employee?.firstName ?? ''} ${row.employee?.lastName ?? ''}`.trim() },
          { header: 'Department', field: 'employee.department.name', sortable: true, className: 'table-item' },
          { header: 'Period', sortable: true, className: 'table-item', formatter: (row) => this.formatPeriod(row) },
          { header: 'Issue', field: 'issue', sortable: true, className: 'table-item' },
          { header: 'Adjustment', sortable: true, className: 'table-item', formatter: (row) => this.formatSignedCurrency(row.amount, row.operationType) },
          { header: 'Status', sortable: true, className: 'table-item', formatter: (row) => this.formatStatus(row.status) },
          { header: 'Verdict', sortable: true, className: 'table-item', formatter: (row) => this.formatVerdict(row.verdict) }
        ]
      : [
          { header: 'Period', sortable: true, className: 'table-item', formatter: (row) => this.formatPeriod(row) },
          { header: 'Issue', field: 'issue', sortable: true, className: 'table-item' },
          { header: 'Adjustment', sortable: true, className: 'table-item', formatter: (row) => this.formatSignedCurrency(row.amount, row.operationType) },
          { header: 'Status', sortable: true, className: 'table-item', formatter: (row) => this.formatStatus(row.status) },
          { header: 'Verdict', sortable: true, className: 'table-item', formatter: (row) => this.formatVerdict(row.verdict) }
        ];

    this.queryActions = this.isAdmin
      ? [
          { id: 'review', label: 'Review', icon: 'pi pi-eye' },
          { id: 'approve', label: 'Approve', icon: 'pi pi-check', visible: (row) => row.status === 'RESPONDED' || (!row.requiresJustification && row.status === 'OPEN') },
          { id: 'reject', label: 'Reject', icon: 'pi pi-times', visible: (row) => row.status === 'RESPONDED' || (!row.requiresJustification && row.status === 'OPEN') }
        ]
      : [
          { id: 'respond', label: 'Respond', icon: 'pi pi-comment', visible: (row) => row.status === 'OPEN' && row.requiresJustification },
          { id: 'view', label: 'View', icon: 'pi pi-eye' }
        ];
  }

  formatPeriod(row: QueryRecord): string {
    const month = this.monthNames[(row.periodMonth || 1) - 1] ?? 'Unknown';
    return `${month} ${row.periodYear}`;
  }

  formatCurrency(value: number): string {
    const normalized = Number.isFinite(value) ? value : 0;
    return `₦${normalized.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatSignedCurrency(value: number, operationType: OperationType): string {
    return `${operationType === 'DEDUCTION' ? '-' : '+'} ${this.formatCurrency(value)}`;
  }

  formatStatus(status: QueryStatus): string {
    return status.replace(/_/g, ' ');
  }

  formatVerdict(verdict: QueryVerdict): string {
    return verdict.charAt(0) + verdict.slice(1).toLowerCase();
  }

  onFilterChange() {
    this.refreshView();
  }

  setActiveTab(tab: 'all' | 'mine') {
    this.activeTab = this.isAdmin ? tab : 'mine';
    this.refreshView();
  }

  toggleCreateForm() {
    this.showCreateForm = !this.showCreateForm;
  }

  handleAction(event: { actionId: string; row: QueryRecord }) {
    if (event.actionId === 'review' || event.actionId === 'view' || event.actionId === 'respond') {
      this.openDetail(event.row);
      return;
    }

    if (event.actionId === 'approve') {
      this.setVerdict(event.row, 'APPROVED');
      return;
    }

    if (event.actionId === 'reject') {
      this.setVerdict(event.row, 'REJECTED');
    }
  }

  openDetail(query: QueryRecord) {
    this.selectedQuery = { ...query };
    this.showDetail = true;
  }

  closeDetail() {
    this.showDetail = false;
    this.selectedQuery = null;
  }

  submitResponse() {
    if (!this.selectedQuery?.id) {
      return;
    }
    const trimmed = (this.selectedQuery.response || '').trim();
    if (!trimmed) {
      return;
    }
    this.payrollService.updateEmployeePayrollBonus(this.selectedQuery.id, {
      response: trimmed,
      respondedAt: new Date().toISOString(),
      status: 'RESPONDED',
      verdict: 'PENDING'
    }).subscribe({
      next: () => {
        this.fetchQueries();
        this.closeDetail();
      },
      error: (err) => console.log(err)
    });
  }

  setVerdict(query: QueryRecord, verdict: QueryVerdict) {
    this.payrollService.updateEmployeePayrollBonus(query.id, {
      verdict,
      status: 'VERDICT_PASSED'
    }).subscribe({
      next: () => {
        this.fetchQueries();
        if (this.selectedQuery?.id === query.id) {
          this.closeDetail();
        }
      },
      error: (err) => console.log(err)
    });
  }

  createQuery() {
    const issue = this.createForm.issue.trim();
    if (!issue || !this.createForm.employeeId || !this.createForm.amount) {
      return;
    }

    const payload = {
      employeeId: this.createForm.employeeId,
      amount: Number(this.createForm.amount),
      operationType: this.createForm.operationType,
      sourceType: 'QUERY',
      periodMonth: this.createForm.periodMonth,
      periodYear: this.createForm.periodYear,
      issue,
      description: this.createForm.description.trim() || issue,
      reason: issue,
      requiresJustification: this.createForm.requiresJustification,
      createdById: this.currentUserId
    };

    this.payrollService.postEmployeePayrollBonus(payload).subscribe({
      next: () => {
        this.createForm = {
          employeeId: null,
          periodMonth: new Date().getMonth() + 1,
          periodYear: new Date().getFullYear(),
          issue: '',
          description: '',
          amount: null,
          operationType: 'DEDUCTION',
          requiresJustification: true
        };
        this.showCreateForm = false;
        this.fetchQueries();
      },
      error: (err) => console.log(err)
    });
  }
}
