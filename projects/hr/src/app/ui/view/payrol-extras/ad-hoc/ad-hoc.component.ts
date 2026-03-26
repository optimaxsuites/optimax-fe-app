import { Component } from '@angular/core';
import { TableColumn } from 'exceljs';
import { TableAction } from '../../../shared-component/view/table/table.component';
import { PayrollService } from '../../../service/payroll.service';
import { EmployeeService } from '../../../service/employee.service';

type QueryStatus = 'Open' | 'Responded' | 'Verdict Passed';
type QueryVerdict = 'Approved' | 'Rejected' | 'Pending';

interface QueryRecord {
  id: string;
  employeeId: number, 
  amount: number, 
  reason: string, 
  createdAt: string, 
  applied: boolean
  employee?: any
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
  selectedQuery: QueryRecord = {} as QueryRecord;
  searchTerm = '';
  statusFilter: QueryStatus | 'All' = 'All';
  activeTab: 'all' | 'mine' = this.isAdmin ? 'all' : 'mine';

  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  createForm = {
    employeeId: [],
    amount: "",
    reason: "",
  };



  bonusRecords: any = []

  filteredBonus: any[] = [];
  bonusColumns: any[] = [];
  bonusActions: any[] = [];

  employees: any[] = []

  constructor(private payrollService: PayrollService, private employeeService: EmployeeService){}

  ngOnInit() {
    this.getAdhocs();
    this.employeeService.getAllEmployee().subscribe({
      next: (data) => {
        console.log(data)
        this.employees = data
      },
      error: (err) => {
        console.log(err)
      }
    })
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
 this.filteredBonus = this.bonusRecords.filter((bonus: { createdById: number; employeeId: number; applied: string; issue: string; employeeName: string; employee: any }) => {
      const roleMatch = this.isAdmin ? (this.activeTab === 'all' || bonus.createdById === this.currentUserId) : bonus.employee.id === this.currentUserId;
      const statusMatch = this.statusFilter === 'All' || bonus.applied === this.statusFilter;
      const term = this.searchTerm.toLowerCase();
      const termMatch = !term || bonus.employee.firstName.toLowerCase().includes(term) || bonus.employee.lastName.toLowerCase().includes(term);
      return roleMatch && statusMatch && termMatch;
    });

    this.bonusColumns =  [
          { header: 'Employee', sortable: true, className: 'table-item', formatter: (row: { employee: { firstName: any; lastName: any; }; }) =>
    `${row.employee?.firstName ?? ''} ${row.employee?.lastName ?? ''}`.trim()},
          { header: 'Department', field: 'employee.department.name', sortable: true, className: 'table-item' },
          { header: 'Period', field: 'createdAt', sortable: true, className: 'table-item', formatter: (row: { createdAt?: number[] }) => {
    const d = row?.createdAt;

    if (!Array.isArray(d) || d.length < 3) return '—';

    const date = new Date(
      d[0],        // year
      d[1] - 1,    // month (0-based in JS)
      d[2]         // day
    );

    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric'
    }).format(date);
  } },
          { header: 'Adjustment', field: 'amount', sortable: true, className: 'table-item', formatter: (row: { amount: number; }) => this.formatCurrency(row.amount) },
          { header: 'Status', field: 'status', sortable: true, className: 'table-item',  formatter: (row: { applied: any; }) => row.applied ? 'Applied' : 'Pending',
  badgeClass: (row: { applied: any; }) =>
    row.applied
      ? 'bg-green-100 text-green-700 px-2 py-1 rounded'
      : 'bg-yellow-100 text-yellow-700 px-2 py-1 rounded' },
        ]

    this.bonusActions =  [
          { id: 'view', label: 'View', icon: 'pi pi-eye' },
          
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
createAdHoc(): void {
  if (!this.createForm.employeeId || !this.createForm.amount || !this.createForm.reason) {
    alert('Please fill all fields');
    return;
  }

  this.createForm.employeeId.forEach((id) => {
    const payload = {
      employeeId: id,
      amount: this.createForm.amount,
      reason: this.createForm.reason,
      createdAt: new Date().toISOString(),
      applied: false
    };

    this.payrollService.postEmployeePayrollBonus(payload).subscribe({
      next: (res) => {
        console.log(`Ad Hoc saved for employee ${id}`, res)
        this.createForm = {
           employeeId: [],
          amount: "",
          reason: "",
        }
    },
      error: (err) => console.error(`Failed to save Ad Hoc for employee ${id}`, err)
    });
  });
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
    this.selectedQuery = {} as QueryRecord;
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

  formatPeriod(date: string): string {


    if (!Array.isArray(date) || date.length < 3) return '—';

    const newDate = new Date(
      date[0],        // year
      date[1] - 1,    // month (0-based in JS)
      date[2]         // day
    );

    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric'
    }).format(newDate);

  }
  
}
