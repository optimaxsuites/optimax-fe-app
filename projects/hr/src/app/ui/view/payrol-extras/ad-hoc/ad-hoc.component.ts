import { Component, OnInit } from '@angular/core';
import { EmployeeService } from '../../../service/employee.service';
import { PayrollService } from '../../../service/payroll.service';
import { DataService } from '../../../service/data.service';
import { timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

type OperationType = 'ADDITION' | 'DEDUCTION';
type TargetType = 'EMPLOYEE' | 'LEVEL' | 'POSITION';

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
  targetType?: TargetType;
  targetLabel?: string;
}

@Component({
  selector: 'app-ad-hoc',
  templateUrl: './ad-hoc.component.html',
  styleUrl: './ad-hoc.component.scss'
})
export class AdHocComponent implements OnInit {
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
  submitting = false;
  submitProgress = 0;
  submitError = '';
  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  years = Array.from({ length: 11 }, (_, index) => new Date().getFullYear() - 5 + index);

  createForm = {
    targetType: 'EMPLOYEE' as TargetType,
    employeeIds: [] as number[],
    selectedLevelId: null as number | null,
    selectedPosition: null as string | null,
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
  levels: any[] = [];
  uniquePositions: string[] = [];

  constructor(
    private payrollService: PayrollService,
    private employeeService: EmployeeService,
    private dataService: DataService
  ) {}

  ngOnInit() {
    this.loadCurrentEmployeeId();
    this.loadEmployees();
    this.loadLevels();
    this.getAdhocs();
  }

  private loadCurrentEmployeeId() {
    if (!this.currentUserId) return;
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
        this.uniquePositions = [...new Set(
          this.employees
            .map((e: any) => e.jobTitle)
            .filter((t: any) => !!t)
        )] as string[];
      },
      error: (err) => console.log(err)
    });
  }

  private loadLevels() {
    this.dataService.getAllLevels().subscribe({
      next: (data) => { this.levels = data || []; },
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
      const roleMatch = this.isAdmin
        ? (this.activeTab === 'all' || bonus.createdById === this.currentUserId)
        : isMine;
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
        formatter: (row: PayrollAdjustmentRecord) =>
          `${row.employee?.firstName ?? ''} ${row.employee?.lastName ?? ''}`.trim()
      },
      { header: 'Department', field: 'employee.department.name', sortable: true, className: 'table-item' },
      {
        header: 'Period',
        sortable: true,
        className: 'table-item',
        formatter: (row: PayrollAdjustmentRecord) => this.formatPeriod(row.periodMonth, row.periodYear)
      },
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

    this.bonusActions = [
      { id: 'view', label: 'View', icon: 'pi pi-eye' },
      ...(this.isAdmin ? [{ id: 'delete', label: 'Delete', icon: 'pi pi-trash' }] : [])
    ];
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
    if (!this.showCreateForm) this.resetForm();
  }

  private resetForm() {
    this.createForm = {
      targetType: 'EMPLOYEE',
      employeeIds: [],
      selectedLevelId: null,
      selectedPosition: null,
      amount: null,
      operationType: 'ADDITION',
      periodMonth: new Date().getMonth() + 1,
      periodYear: new Date().getFullYear(),
      reason: '',
      description: ''
    };
    this.submitting = false;
    this.submitProgress = 0;
    this.submitError = '';
  }

  onTargetTypeChange() {
    this.createForm.employeeIds = [];
    this.createForm.selectedLevelId = null;
    this.createForm.selectedPosition = null;
  }

  private resolveEmployeeIds(): number[] {
    switch (this.createForm.targetType) {
      case 'EMPLOYEE':
        return this.createForm.employeeIds;
      case 'LEVEL':
        return this.employees
          .filter((e: any) => e.level?.id === this.createForm.selectedLevelId || e.level === this.createForm.selectedLevelId)
          .map((e: any) => e.id);
      case 'POSITION':
        return this.employees
          .filter((e: any) => e.jobTitle === this.createForm.selectedPosition)
          .map((e: any) => e.id);
      default:
        return [];
    }
  }

  isFormValid(): boolean {
    const ids = this.resolveEmployeeIds();
    return ids.length > 0
      && !!this.createForm.amount
      && this.createForm.amount > 0
      && this.createForm.reason.trim().length > 0;
  }

  createAdHoc(): void {
    if (!this.isFormValid() || this.submitting) return;

    const employeeIds = this.resolveEmployeeIds();
    if (!employeeIds.length) return;

    this.submitting = true;
    this.submitProgress = 0;
    this.submitError = '';
    let completed = 0;
    let failed = 0;

    const finish = () => {
      this.submitting = false;
      this.submitProgress = 0;
      if (failed === 0) {
        this.showCreateForm = false;
        this.resetForm();
        this.getAdhocs();
      } else {
        this.submitError = `${failed} submission(s) failed. Check your connection and try again.`;
      }
    };

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

      this.payrollService.postEmployeePayrollBonus(payload).pipe(
        timeout(20000),
        catchError(err => {
          failed++;
          if (completed + failed === employeeIds.length) finish();
          return of(null);
        })
      ).subscribe({
        next: (res) => {
          if (res !== null) {
            completed++;
            this.submitProgress = Math.round((completed / employeeIds.length) * 100);
            if (completed + failed === employeeIds.length) finish();
          }
        }
      });
    });
  }

  deleteAdHoc(record: PayrollAdjustmentRecord) {
    if (!this.isAdmin || record.applied) return;
    this.payrollService.deleteEmployeePayrollBonus(record.id).subscribe({
      next: () => {
        this.bonusRecords = this.bonusRecords.filter(r => r.id !== record.id);
        this.loadTableData();
        if (this.selectedAdjustment?.id === record.id) this.closeDetail();
      },
      error: (err) => console.error('Failed to delete ad hoc', err)
    });
  }

  handleAction(event: { actionId: string; row: PayrollAdjustmentRecord }) {
    if (event.actionId === 'view') this.openDetail(event.row);
    if (event.actionId === 'delete') this.deleteAdHoc(event.row);
  }

  openDetail(adjustment: PayrollAdjustmentRecord) {
    this.selectedAdjustment = { ...adjustment };
    this.showDetail = true;
  }

  closeDetail() {
    this.showDetail = false;
    this.selectedAdjustment = null;
  }

  getLevelName(id: number | null): string {
    if (!id) return '';
    return this.levels.find(l => l.id === id)?.name || '';
  }

  countByLevel(levelId: number | null): number {
    if (!levelId) return 0;
    return this.employees.filter((e: any) => e.level?.id === levelId || e.level === levelId).length;
  }

  countByPosition(position: string | null): number {
    if (!position) return 0;
    return this.employees.filter((e: any) => e.jobTitle === position).length;
  }
}
