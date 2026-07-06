import { Component } from '@angular/core';
import { EmployeeService } from '../../../service/employee.service';
import { PayrollService } from '../../../service/payroll.service';

type OperationType = 'ADDITION' | 'DEDUCTION';

interface PayrollAdjustmentRecord {
  id: number;
  employee?: any;
  employeeId?: number;
  amount: number;
  operationType: OperationType;
  sourceType: 'AD_HOC' | 'QUERY';
  periodMonth: number;
  periodYear: number;
  reason: string;
  description?: string;
  applied: boolean;
  verdict?: string;
  status?: string;
  createdById?: number;
  createdAt?: number[];
}

@Component({
  selector: 'app-ad-hoc',
  templateUrl: './ad-hoc.component.html',
  styleUrl: './ad-hoc.component.scss'
})
export class AdHocComponent {
  userRole = sessionStorage.getItem('role') || localStorage.getItem('role') || 'Employee';
  isAdmin = this.userRole.toLowerCase().includes('admin');
  currentUserId = Number(sessionStorage.getItem('userid') || localStorage.getItem('userid') || 0);
  currentEmployeeId: number | null = null;
  showCreateForm = false;
  showDetail = false;
  selectedAdjustment: PayrollAdjustmentRecord | null = null;
  searchTerm = '';
  activeTab: 'all' | 'mine' = this.isAdmin ? 'all' : 'mine';
  selectedMonth = new Date().getMonth() + 1;
  selectedYear = new Date().getFullYear();
  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  years = Array.from({ length: 11 }, (_, index) => new Date().getFullYear() - 5 + index);

  createForm = {
    employeeIds: [] as number[],
    amount: null as number | null,
    operationType: 'ADDITION' as OperationType,
    periodMonth: new Date().getMonth() + 1,
    periodYear: new Date().getFullYear(),
    reason: '',
    description: ''
  };

  bonusRecords: PayrollAdjustmentRecord[] = [];
  filteredBonus: PayrollAdjustmentRecord[] = [];
  bonusColumns: any[] = [];
  bonusActions: any[] = [];
  employees: any[] = [];

  constructor(private payrollService: PayrollService, private employeeService: EmployeeService) {}

  ngOnInit() {
    this.loadCurrentEmployeeId();
    this.loadEmployees();
    this.getAdhocs();
  }

  private loadCurrentEmployeeId() {
    if (!this.currentUserId) {
      return;
    }
    this.employeeService.getEmployeeByUserId(this.currentUserId).subscribe({
      next: (employeeId) => {
        this.currentEmployeeId = Number(employeeId) || null;
        this.loadTableData();
      },
      error: () => {
        this.currentEmployeeId = null;
        this.loadTableData();
      }
    });
  }

  private loadEmployees() {
    this.employeeService.getAllEmployee().subscribe({
      next: (data) => {
        this.employees = data || [];
      },
      error: (err) => console.log(err)
    });
  }

  getAdhocs() {
    this.payrollService.getEmployeePayrollBonuses({
      page: 1,
      size: 500,
      sourceType: 'AD_HOC'
    }).subscribe({
      next: (data) => {
        this.bonusRecords = data || [];
        this.loadTableData();
      },
      error: (err) => console.log(err)
    });
  }

  loadTableData() {
    const term = this.searchTerm.toLowerCase();
    this.filteredBonus = this.bonusRecords.filter((bonus) => {
      const isMine = this.currentEmployeeId
        ? bonus.employee?.id === this.currentEmployeeId
        : bonus.createdById === this.currentUserId;
      const roleMatch = this.isAdmin ? (this.activeTab === 'all' || bonus.createdById === this.currentUserId) : isMine;
      const periodMatch = bonus.periodMonth === this.selectedMonth && bonus.periodYear === this.selectedYear;
      const employeeName = `${bonus.employee?.firstName ?? ''} ${bonus.employee?.lastName ?? ''}`.trim().toLowerCase();
      const reason = (bonus.reason || '').toLowerCase();
      const description = (bonus.description || '').toLowerCase();
      const termMatch = !term || employeeName.includes(term) || reason.includes(term) || description.includes(term);
      return roleMatch && periodMatch && termMatch;
    });

    this.bonusColumns = [
      {
        header: 'Employee',
        sortable: true,
        className: 'table-item',
        formatter: (row: PayrollAdjustmentRecord) => `${row.employee?.firstName ?? ''} ${row.employee?.lastName ?? ''}`.trim()
      },
      { header: 'Department', field: 'employee.department.name', sortable: true, className: 'table-item' },
      { header: 'Period', sortable: true, className: 'table-item', formatter: (row: PayrollAdjustmentRecord) => this.formatPeriod(row.periodMonth, row.periodYear) },
      {
        header: 'Type',
        field: 'operationType',
        sortable: true,
        className: 'table-item',
        formatter: (row: PayrollAdjustmentRecord) => row.operationType === 'DEDUCTION' ? 'Deduction' : 'Addition'
      },
      {
        header: 'Adjustment',
        field: 'amount',
        sortable: true,
        className: 'table-item',
        formatter: (row: PayrollAdjustmentRecord) => this.formatSignedCurrency(row.amount, row.operationType)
      },
      {
        header: 'Status',
        sortable: true,
        className: 'table-item',
        formatter: (row: PayrollAdjustmentRecord) => row.applied ? 'Applied' : 'Pending Payroll',
        badgeClass: (row: PayrollAdjustmentRecord) =>
          row.applied
            ? 'bg-green-100 text-green-700 px-2 py-1 rounded'
            : 'bg-yellow-100 text-yellow-700 px-2 py-1 rounded'
      }
    ];

    this.bonusActions = [{ id: 'view', label: 'View', icon: 'pi pi-eye' }];
  }

  formatCurrency(value: number): string {
    const normalized = Number.isFinite(value) ? value : 0;
    return `₦${normalized.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatSignedCurrency(value: number, operationType: OperationType): string {
    const prefix = operationType === 'DEDUCTION' ? '-' : '+';
    return `${prefix} ${this.formatCurrency(value)}`;
  }

  formatPeriod(month: number, year: number): string {
    const monthName = this.monthNames[(month || 1) - 1] ?? 'Unknown';
    return `${monthName} ${year || ''}`.trim();
  }

  onFilterChange() {
    this.loadTableData();
  }

  setActiveTab(tab: 'all' | 'mine') {
    this.activeTab = this.isAdmin ? tab : 'mine';
    this.loadTableData();
  }

  toggleCreateForm() {
    this.showCreateForm = !this.showCreateForm;
  }

  createAdHoc(): void {
    const employeeIds = this.createForm.employeeIds || [];
    if (!employeeIds.length || !this.createForm.amount || !this.createForm.reason.trim()) {
      return;
    }

    employeeIds.forEach((id) => {
      const payload = {
        employeeId: id,
        amount: Number(this.createForm.amount),
        operationType: this.createForm.operationType,
        sourceType: 'AD_HOC',
        periodMonth: this.createForm.periodMonth,
        periodYear: this.createForm.periodYear,
        reason: this.createForm.reason.trim(),
        description: this.createForm.description.trim(),
        createdById: this.currentUserId,
        applied: false
      };

      this.payrollService.postEmployeePayrollBonus(payload).subscribe({
        next: () => {
          this.createForm = {
            employeeIds: [],
            amount: null,
            operationType: 'ADDITION',
            periodMonth: new Date().getMonth() + 1,
            periodYear: new Date().getFullYear(),
            reason: '',
            description: ''
          };
          this.showCreateForm = false;
          this.getAdhocs();
        },
        error: (err) => console.error(`Failed to save ad hoc for employee ${id}`, err)
      });
    });
  }

  handleAction(event: { actionId: string; row: PayrollAdjustmentRecord }) {
    if (event.actionId === 'view') {
      this.openDetail(event.row);
    }
  }

  openDetail(adjustment: PayrollAdjustmentRecord) {
    this.selectedAdjustment = { ...adjustment };
    this.showDetail = true;
  }

  closeDetail() {
    this.showDetail = false;
    this.selectedAdjustment = null;
  }
}
