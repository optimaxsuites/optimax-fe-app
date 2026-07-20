import { Component, OnInit } from '@angular/core';
import { TableAction, TableColumn } from '../../../shared-component/view/table/table.component';
import { PayrollService } from '../../../service/payroll.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-employee-payslip-list',
  templateUrl: './employee-payslip-list.component.html',
  styleUrl: './employee-payslip-list.component.scss'
})
export class EmployeePayslipListComponent implements OnInit {
  viewSlip = false;
  activeSlip: any = {};
  loading = true;

  employeeInfo: any = {};
  payslips: any[] = [];
  filteredPayslips: any[] = [];

  searchTerm = '';
  selectedYear: string | null = null;
  selectedMonth: string | null = null;

  years: string[] = [];

  monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  payslipColumns: TableColumn[] = [
    {
      header: 'Period',
      sortable: true,
      sortField: 'month',
      className: 'table-item',
      formatter: (row) => `${this.monthNames[(row?.month || 1) - 1]} ${row?.year ?? ''}`.trim()
    },
    {
      header: 'Base Pay',
      className: 'table-item',
      formatter: (row) => this.fmtCurrency(row?.basePay ?? 0)
    },
    {
      header: 'Allowances',
      className: 'table-item',
      formatter: (row) => this.fmtCurrency(row?.allowances?.amount ?? 0)
    },
    {
      header: 'Gross Pay',
      className: 'table-item',
      formatter: (row) => this.fmtCurrency(row?.grossPay ?? 0)
    },
    {
      header: 'Total Deductions',
      className: 'table-item',
      formatter: (row) => this.fmtCurrency(row?.totalDeductions ?? 0)
    },
    {
      header: 'Net Pay',
      className: 'table-item',
      formatter: (row) => this.fmtCurrency(row?.netPayable ?? 0)
    },
    {
      header: 'Status',
      className: 'table-item',
      formatter: (row) => row?.runStatus ?? 'COMPLETED'
    }
  ];

  payslipActions: TableAction[] = [
    { id: 'view', label: 'View Payslip', icon: 'pi pi-eye' }
  ];

  constructor(private payrollService: PayrollService) {}

  ngOnInit(): void {
    const stored = localStorage.getItem('sharedData');
    this.employeeInfo = stored ? JSON.parse(stored) : {};
    this.loadPayslips();
  }

  loadPayslips(): void {
    this.loading = true;
    this.payrollService.getPayrollGenerationResponses(1, 500).pipe(
      catchError(() => of([]))
    ).subscribe({
      next: (response: any) => {
        const runs: any[] = Array.isArray(response) ? response : (response?.content ?? []);
        const empId = this.employeeInfo?.id;

        const slips: any[] = [];
        runs.forEach(run => {
          const employees: any[] = run?.employees ?? [];
          const match = employees.find(e =>
            e?.employee?.id === empId || e?.employeeId === empId || e?.id === empId
          );
          if (match) {
            slips.push({
              ...match,
              month: run.month,
              year: run.year,
              runStatus: (run.payrollApprovalInstance?.status || run.status || 'COMPLETED').toUpperCase()
            });
          }
        });

        slips.sort((a, b) => (+b.year - +a.year) || (+b.month - +a.month));
        this.payslips = slips;
        this.filteredPayslips = [...slips];
        this.years = [...new Set(slips.map(s => String(s.year)))].sort((a, b) => +b - +a);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  filterPayroll(): void {
    let result = [...this.payslips];
    if (this.selectedYear) {
      result = result.filter(s => String(s.year) === this.selectedYear);
    }
    if (this.selectedMonth) {
      const mIdx = this.monthNames.indexOf(this.selectedMonth) + 1;
      result = result.filter(s => s.month === mIdx);
    }
    if (this.searchTerm?.trim()) {
      const q = this.searchTerm.toLowerCase();
      result = result.filter(s =>
        this.monthNames[s.month - 1]?.toLowerCase().includes(q) ||
        String(s.year).includes(q)
      );
    }
    this.filteredPayslips = result;
  }

  filterBySelectedYear(): void { this.filterPayroll(); }
  filterBySelectedMonth(): void { this.filterPayroll(); }

  viewPayrollDetails(slip: any): void {
    this.viewSlip = true;
    this.activeSlip = {
      empId: this.employeeInfo.id,
      name: `${this.employeeInfo.firstName ?? ''} ${this.employeeInfo.lastName ?? ''}`.trim() || this.employeeInfo.name,
      type: this.employeeInfo.type,
      level: this.employeeInfo.level,
      department: this.employeeInfo.department,
      accountNumber: this.employeeInfo.accountNumber,
      bank: this.employeeInfo.bank,
      ...slip
    };
  }

  handlePayslipAction(event: { actionId: string; row: any }): void {
    if (event.actionId === 'view') {
      this.viewPayrollDetails(event.row);
    }
  }

  fmtCurrency(val: number): string {
    if (!val) return '₦0.00';
    return '₦' + Number(val).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
