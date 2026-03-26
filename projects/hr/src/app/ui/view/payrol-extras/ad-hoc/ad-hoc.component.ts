import { Component } from '@angular/core';
import { TableColumn } from 'exceljs';
import { TableAction } from '../../../shared-component/view/table/table.component';
import { PayrollService } from '../../../service/payroll.service';

type QueryStatus = 'Open' | 'Responded' | 'Verdict Passed';
type QueryVerdict = 'Approved' | 'Rejected' | 'Pending';

interface QueryRecord {
  id: string;
  employeeId: number, 
  amount: number, 
  reason: string, 
  createdAt: string, 
  applied: boolean
}

@Component({
  selector: 'app-ad-hoc',
  templateUrl: './ad-hoc.component.html',
  styleUrl: './ad-hoc.component.scss'
})
export class AdHocComponent {
   userRole = sessionStorage.getItem('role') || 'Employee';
  isAdmin = this.userRole.toLowerCase().includes('admin');
  currentUserId = this.isAdmin ? 99 : 1;
  currentUserName = this.isAdmin ? 'HR Admin' : 'John Doe';
  showCreateForm = false;
  showDetail = false;
  selectedQuery: QueryRecord | null = null;
  searchTerm = '';
  statusFilter: QueryStatus | 'All' = 'All';
  activeTab: 'all' | 'mine' = this.isAdmin ? 'all' : 'mine';

  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  createForm = {
    employeeId: 0,
    amount: "",
    reason: "",
  };



  bonusRecords: any = []

  filteredBonus: any[] = [];
  bonusColumns: any[] = [];
  bonusActions: any[] = [];

  constructor(private payrollService: PayrollService){}

  ngOnInit() {
    this.getAdhocs();
  }

  getAdhocs() {
    this.payrollService.getEmployeePayrollBonuses().subscribe({
     next: (data) => {
        this.bonusRecords = data;
        this.loadTableData();
     },
     error: (err) => {
      console.log(err)
     }
    })
  }

  loadTableData() {
 this.filteredBonus = this.bonusRecords.filter((bonus: { createdById: number; employeeId: number; status: string; issue: string; employeeName: string; }) => {
      const roleMatch = this.isAdmin ? (this.activeTab === 'all' || bonus.createdById === this.currentUserId) : bonus.employeeId === this.currentUserId;
      const statusMatch = this.statusFilter === 'All' || bonus.status === this.statusFilter;
      const term = this.searchTerm.toLowerCase();
      const termMatch = !term || bonus.issue.toLowerCase().includes(term) || bonus.employeeName.toLowerCase().includes(term);
      return roleMatch && statusMatch && termMatch;
    });

    this.bonusColumns =  [
          { header: 'Employee', field: 'employee.name', sortable: true, className: 'table-item' },
          { header: 'Department', field: 'employee.department', sortable: true, className: 'table-item' },
          { header: 'Period', field: 'period', sortable: true, className: 'table-item' },
          { header: 'Issue', field: 'issue', sortable: true, className: 'table-item' },
          { header: 'Adjustment', field: 'adjustment', sortable: true, className: 'table-item', formatter: (row: { adjustment: number; }) => this.formatCurrency(row.adjustment) },
          { header: 'Status', field: 'status', sortable: true, className: 'table-item' },
          { header: 'Verdict', field: 'verdict', sortable: true, className: 'table-item' }
        ]

    this.bonusActions =  [
          { id: 'view', label: 'Review', icon: 'pi pi-eye' },
          
        ]
 

  }

 

  // formatPeriod(row: QueryRecord): string {
  //   const month = this.monthNames[row.periodMonth - 1] ?? 'Unknown';
  //   return `${month} ${row.periodYear}`;
  // }

  formatCurrency(value: number): string {
    const normalized = Number.isFinite(value) ? value : 0;
    return `₦${normalized.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  onFilterChange() {
        this.getAdhocs();

  }

  setActiveTab(tab: 'all' | 'mine') {
    if (!this.isAdmin) {
      this.activeTab = 'mine';
    } else {
      this.activeTab = tab;
    }
        this.getAdhocs();

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
      // this.setVerdict(event.row, 'Approved');
      return;
    }

    if (event.actionId === 'reject') {
      // this.setVerdict(event.row, 'Rejected');
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
    // if (!this.selectedQuery) return;
    // const trimmed = (this.selectedQuery.response || '').trim();
    // if (!trimmed) return;
    // const index = this.queryRecords.findIndex(record => record.id === this.selectedQuery?.id);
    // if (index === -1) return;
    // this.queryRecords[index] = {
    //   ...this.queryRecords[index],
    //   response: trimmed,
    //   respondedAt: new Date().toISOString().slice(0, 10),
    //   status: 'Responded',
    //   verdict: 'Pending'
    // };
    //     this.getAdhocs();

    // this.openDetail(this.queryRecords[index]);
  }

  // setVerdict(query: QueryRecord, verdict: QueryVerdict) {
  //   const index = this.queryRecords.findIndex(record => record.id === query.id);
  //   if (index === -1) return;
  //   this.queryRecords[index] = {
  //     ...this.queryRecords[index],
  //   };
  //       this.getAdhocs();

  //   if (this.selectedQuery?.id === query.id) {
  //     this.selectedQuery = { ...this.queryRecords[index] };
  //   }
  // }

  createQuery() {
    const issue = this.createForm.reason.trim();
    if (!issue) return;
    // const employee = this.queryRecords.find(q => q.employeeId === this.createForm.employeeId);
    // const employeeName = employee?.employeeName ?? `Employee ${this.createForm.employeeId}`;
    // const department = employee?.department ?? 'Unassigned';
    const newQuery: QueryRecord = {
      id: `Q-${Math.floor(1000 + Math.random() * 9000)}`,
      employeeId: this.createForm.employeeId,
      // employeeName,
      // department,
      // createdById: this.currentUserId,
      // createdByName: this.currentUserName,

      // issue: issue,

      // status: 'Open',
      // verdict: 'Pending',
      createdAt: new Date().toISOString().slice(0, 10)
    } as QueryRecord;
    // this.queryRecords = [newQuery, ...this.queryRecords];

    this.showCreateForm = false;
        this.getAdhocs();

  }

  // get employees() {
  //   // return Array.from(new Map(this.queryRecords.map(query => [query.employeeId, query])).values());
  // }
}
