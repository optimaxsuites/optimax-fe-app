import { Component, OnInit } from '@angular/core';
import { EmployeeService } from '../../../service/employee.service';
import { PayrollService } from '../../../service/payroll.service';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { SelectedEmployeeStore } from '../selected-employee.store';

@Component({
  selector: 'app-employment-letter',
  templateUrl: './employment-letter.component.html',
  styleUrl: './employment-letter.component.scss'
})
export class EmploymentLetterComponent implements OnInit {
  employee: any = {};
  companyProfile: any = {};
  salaryDetails: any = null;
  generatingPdf = false;
  salaryInputMode: 'monthly' | 'yearly' = 'monthly';
  today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  constructor(
    private employeeService: EmployeeService,
    private payrollService: PayrollService,
    private selectedEmployee: SelectedEmployeeStore,
  ) {}

  ngOnInit() {
    this.employee = this.selectedEmployee.get() ?? {};

    if (this.employee?.salaryDetails) {
      this.salaryDetails = this.employee.salaryDetails;
    } else if (this.employee?.level?.id) {
      this.employeeService.getSalaryById(this.employee.level.id).subscribe({
        next: (data: any) => { this.salaryDetails = Array.isArray(data) ? data[0] : data; },
        error: () => {}
      });
    }

    this.payrollService.getGeneralSettingsById().subscribe({
      next: (res: any) => {
        this.salaryInputMode = (res?.salaryInputMode as 'monthly' | 'yearly') || 'monthly';
      },
      error: () => {}
    });
  }

  async generatePdf() {
    this.generatingPdf = true;
    try {
      const target = document.getElementById('employment-letter-content');
      if (!target) return;
      const canvas = await html2canvas(target, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`employment-letter-${this.employee?.firstName ?? ''}-${this.employee?.lastName ?? ''}.pdf`);
    } finally {
      this.generatingPdf = false;
    }
  }

  // ── Identity getters ──────────────────────────────────────

  get employeeName(): string {
    return `${this.employee?.firstName ?? ''} ${this.employee?.lastName ?? ''}`.trim();
  }

  get startDate(): string {
    return this.fmt(this.employee?.employementStartDate || this.employee?.hireDate);
  }

  get department(): string {
    return this.employee?.department?.name || this.employee?.department || '_______________';
  }

  get jobTitle(): string {
    return this.employee?.jobTitle || '_______________';
  }

  get employmentType(): string {
    return this.employee?.employmentType?.name || this.employee?.employmentType || 'Full-Time';
  }

  get employeeStatus(): string {
    return this.employee?.employeeStatus || '_______________';
  }

  get isProbation(): boolean {
    const t = this.employmentType.toUpperCase();
    const s = this.employeeStatus.toUpperCase();
    return t.includes('PROBAT') || s.includes('PROBAT') || s === 'JOINING';
  }

  get probationStart(): string {
    return this.fmt(this.employee?.probationStartDate);
  }

  get probationEnd(): string {
    return this.fmt(this.employee?.probationEndDate);
  }

  get appraisalDate(): string {
    return this.fmt(this.employee?.appraisalDueDate);
  }

  // ── Company getters ───────────────────────────────────────

  get companyName(): string {
    return this.companyProfile?.companyName || 'The Company';
  }

  get logoUrl(): string {
    return this.companyProfile?.logoUrl || '';
  }

  // HR letters always show annual figures regardless of input mode
  private toAnnual(amount: number): number {
    return this.salaryInputMode === 'monthly' ? Math.round(amount * 12) : amount;
  }

  get isConsultant(): boolean {
    const t = (this.employee?.jobType?.name || this.employee?.jobType || '').toString().toUpperCase();
    return t.includes('CONSULT') || t.includes('CONTRACT') || t.includes('FREELAN');
  }

  // ── Salary getters (always annual) ───────────────────────

  get baseSalary(): number {
    return this.toAnnual(this.n(this.salaryDetails?.baseSalary));
  }

  get allowancesTotal(): number {
    return this.toAnnual(this.sumAmounts(this.salaryDetails?.allowance));
  }

  get bonusesTotal(): number {
    return this.toAnnual(this.sumAmounts(this.salaryDetails?.bonuses));
  }

  get deductionsTotal(): number {
    return this.toAnnual(this.sumAmounts(this.salaryDetails?.deductions));
  }

  get grossSalary(): number {
    return this.baseSalary + this.allowancesTotal + this.bonusesTotal;
  }

  get netSalary(): number {
    return this.grossSalary - this.deductionsTotal;
  }

  get hasSalaryData(): boolean {
    return this.baseSalary > 0;
  }

  get allowanceLines(): { label: string; amount: number }[] {
    return this.toLines(this.salaryDetails?.allowance);
  }

  get deductionLines(): { label: string; amount: number }[] {
    return this.toLines(this.salaryDetails?.deductions);
  }

  // ── Helpers ───────────────────────────────────────────────

  private fmt(d: any): string {
    if (!d) return '_______________';
    try {
      let date: Date;
      if (Array.isArray(d)) {
        const [year, month, day] = d;
        date = new Date(Number(year), Number(month) - 1, Number(day));
      } else {
        date = new Date(d);
      }
      if (Number.isNaN(date.getTime())) return String(d);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch { return String(d); }
  }

  private n(v: any): number {
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private sumAmounts(arr: any): number {
    if (!Array.isArray(arr)) return 0;
    return arr.reduce((s: number, i: any) => s + this.n(i?.amount ?? i?.value), 0);
  }

  private toLines(arr: any): { label: string; amount: number }[] {
    if (!Array.isArray(arr)) return [];
    return arr.map((i: any) => ({ label: i?.name || i?.type || i?.allowanceType?.name || i?.deductionType?.name || 'Item', amount: this.toAnnual(this.n(i?.amount ?? i?.value)) }));
  }

  fmt2(n: number): string {
    return n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
