import { Component } from '@angular/core';
import { TableAction, TableColumn } from '../../shared-component/view/table/table.component';

type QueryRole = 'Admin' | 'Employee';
type QueryStatus = 'Open' | 'Responded' | 'Verdict Passed';
type QueryVerdict = 'Approved' | 'Rejected' | 'Pending';

interface QueryRecord {
  id: string;
  employeeId: number;
  employeeName: string;
  department: string;
  periodMonth: number;
  periodYear: number;
  issue: string;
  description: string;
  adjustment: number;
  status: QueryStatus;
  verdict: QueryVerdict;
  createdAt: string;
  response?: string;
  respondedAt?: string;
}

@Component({
  selector: 'app-query',
  templateUrl: './query.component.html',
  styleUrl: './query.component.scss'
})
export class QueryComponent {
  viewRole: QueryRole = 'Admin';
  currentEmployeeId = 1;
  showCreateForm = false;
  showDetail = false;
  selectedQuery: QueryRecord | null = null;
  searchTerm = '';
  statusFilter: QueryStatus | 'All' = 'All';

  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  createForm = {
    employeeId: 1,
    periodMonth: 10,
    periodYear: 2024,
    issue: '',
    description: '',
    adjustment: 0
  };

  queryRecords: QueryRecord[] = [
    {
      id: 'Q-1001',
      employeeId: 1,
      employeeName: 'Adebayo Oluwaseun',
      department: 'Sales',
      periodMonth: 10,
      periodYear: 2024,
      issue: 'Late arrival dispute',
      description: 'Attendance flagged as late. Employee claims client visit.',
      adjustment: -1000,
      status: 'Open',
      verdict: 'Pending',
      createdAt: '2024-10-18'
    },
    {
      id: 'Q-1002',
      employeeId: 4,
      employeeName: 'Yemi Adesanya',
      department: 'Marketing',
      periodMonth: 10,
      periodYear: 2024,
      issue: 'Overtime correction',
      description: 'Overtime hours mismatch between attendance and payroll.',
      adjustment: 2500,
      status: 'Responded',
      verdict: 'Pending',
      createdAt: '2024-10-19',
      response: 'Overtime approved by team lead.',
      respondedAt: '2024-10-20'
    },
    {
      id: 'Q-1003',
      employeeId: 2,
      employeeName: 'Chinaza Okeke',
      department: 'Finance',
      periodMonth: 9,
      periodYear: 2024,
      issue: 'Attendance penalty review',
      description: 'Penalty applied despite approved leave.',
      adjustment: 0,
      status: 'Verdict Passed',
      verdict: 'Approved',
      createdAt: '2024-09-20',
      response: 'Leave was approved on portal.',
      respondedAt: '2024-09-21'
    }
  ];

  filteredQueries: QueryRecord[] = [];
  queryColumns: TableColumn[] = [];
  queryActions: TableAction[] = [];

  ngOnInit() {
    this.refreshView();
  }

  refreshView() {
    this.filteredQueries = this.queryRecords.filter(query => {
      const roleMatch = this.viewRole === 'Admin' || query.employeeId === this.currentEmployeeId;
      const statusMatch = this.statusFilter === 'All' || query.status === this.statusFilter;
      const term = this.searchTerm.toLowerCase();
      const termMatch = !term || query.issue.toLowerCase().includes(term) || query.employeeName.toLowerCase().includes(term);
      return roleMatch && statusMatch && termMatch;
    });

    this.queryColumns = this.viewRole === 'Admin'
      ? [
          { header: 'Employee', field: 'employeeName', sortable: true, className: 'table-item' },
          { header: 'Department', field: 'department', sortable: true, className: 'table-item' },
          { header: 'Period', field: 'period', sortable: true, className: 'table-item', formatter: (row) => this.formatPeriod(row) },
          { header: 'Issue', field: 'issue', sortable: true, className: 'table-item' },
          { header: 'Adjustment', field: 'adjustment', sortable: true, className: 'table-item', formatter: (row) => this.formatCurrency(row.adjustment) },
          { header: 'Status', field: 'status', sortable: true, className: 'table-item' },
          { header: 'Verdict', field: 'verdict', sortable: true, className: 'table-item' }
        ]
      : [
          { header: 'Period', field: 'period', sortable: true, className: 'table-item', formatter: (row) => this.formatPeriod(row) },
          { header: 'Issue', field: 'issue', sortable: true, className: 'table-item' },
          { header: 'Adjustment', field: 'adjustment', sortable: true, className: 'table-item', formatter: (row) => this.formatCurrency(row.adjustment) },
          { header: 'Status', field: 'status', sortable: true, className: 'table-item' },
          { header: 'Verdict', field: 'verdict', sortable: true, className: 'table-item' }
        ];

    this.queryActions = this.viewRole === 'Admin'
      ? [
          { id: 'review', label: 'Review', icon: 'pi pi-eye' },
          { id: 'approve', label: 'Approve', icon: 'pi pi-check', visible: (row) => row.status === 'Responded' },
          { id: 'reject', label: 'Reject', icon: 'pi pi-times', visible: (row) => row.status === 'Responded' }
        ]
      : [
          { id: 'respond', label: 'Respond', icon: 'pi pi-comment', visible: (row) => row.status === 'Open' },
          { id: 'view', label: 'View', icon: 'pi pi-eye' }
        ];
  }

  formatPeriod(row: QueryRecord): string {
    const month = this.monthNames[row.periodMonth - 1] ?? 'Unknown';
    return `${month} ${row.periodYear}`;
  }

  formatCurrency(value: number): string {
    const normalized = Number.isFinite(value) ? value : 0;
    return `₦${normalized.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  onRoleChange() {
    this.refreshView();
  }

  onFilterChange() {
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
      this.setVerdict(event.row, 'Approved');
      return;
    }

    if (event.actionId === 'reject') {
      this.setVerdict(event.row, 'Rejected');
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
    if (!this.selectedQuery) return;
    const trimmed = (this.selectedQuery.response || '').trim();
    if (!trimmed) return;
    const index = this.queryRecords.findIndex(record => record.id === this.selectedQuery?.id);
    if (index === -1) return;
    this.queryRecords[index] = {
      ...this.queryRecords[index],
      response: trimmed,
      respondedAt: new Date().toISOString().slice(0, 10),
      status: 'Responded',
      verdict: 'Pending'
    };
    this.refreshView();
    this.openDetail(this.queryRecords[index]);
  }

  setVerdict(query: QueryRecord, verdict: QueryVerdict) {
    const index = this.queryRecords.findIndex(record => record.id === query.id);
    if (index === -1) return;
    this.queryRecords[index] = {
      ...this.queryRecords[index],
      verdict,
      status: 'Verdict Passed'
    };
    this.refreshView();
    if (this.selectedQuery?.id === query.id) {
      this.selectedQuery = { ...this.queryRecords[index] };
    }
  }

  createQuery() {
    const issue = this.createForm.issue.trim();
    if (!issue) return;
    const employee = this.queryRecords.find(q => q.employeeId === this.createForm.employeeId);
    const employeeName = employee?.employeeName ?? `Employee ${this.createForm.employeeId}`;
    const department = employee?.department ?? 'Unassigned';
    const newQuery: QueryRecord = {
      id: `Q-${Math.floor(1000 + Math.random() * 9000)}`,
      employeeId: this.createForm.employeeId,
      employeeName,
      department,
      periodMonth: this.createForm.periodMonth,
      periodYear: this.createForm.periodYear,
      issue: issue,
      description: this.createForm.description.trim() || issue,
      adjustment: Number(this.createForm.adjustment) || 0,
      status: 'Open',
      verdict: 'Pending',
      createdAt: new Date().toISOString().slice(0, 10)
    };
    this.queryRecords = [newQuery, ...this.queryRecords];
    this.createForm.issue = '';
    this.createForm.description = '';
    this.createForm.adjustment = 0;
    this.showCreateForm = false;
    this.refreshView();
  }

  get employees() {
    return Array.from(new Map(this.queryRecords.map(query => [query.employeeId, query])).values());
  }
}
