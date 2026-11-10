import { Component, OnInit } from '@angular/core';
import { EmployeeService } from '../../../service/employee.service';
import { PayrollService } from '../../../service/payroll.service';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { SelectedEmployeeStore } from '../selected-employee.store';
import { pickSalaryRecordForLevel } from '../../../service/loan/level-salary.util';
import { resolveSalaryStructure, SalaryLine, SalaryStructure } from '../../../service/payroll-calculation';

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
        next: (data: any) => { this.salaryDetails = (Array.isArray(data) ? pickSalaryRecordForLevel(data) : data) ?? null; },
        error: () => {}
      });
    }
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

  /** Monthly structure (payroll-calculation.ts); the letter shows it as annual figures. */
  private get structure(): SalaryStructure | null {
    return resolveSalaryStructure(this.salaryDetails);
  }

  private toAnnual(monthly: number): number {
    return Math.round(monthly * 12 * 100) / 100;
  }

  get isConsultant(): boolean {
    const t = (this.employee?.jobType?.name || this.employee?.jobType || '').toString().toUpperCase();
    return t.includes('CONSULT') || t.includes('CONTRACT') || t.includes('FREELAN');
  }

  // ── Salary getters (always annual) ───────────────────────

  get baseSalary(): number {
    return this.toAnnual(this.structure?.baseSalary ?? 0);
  }

  get allowancesTotal(): number {
    return this.toAnnual(this.structure?.allowanceTotal ?? 0);
  }

  get deductionsTotal(): number {
    return this.toAnnual(this.structure?.deductionTotal ?? 0);
  }

  /** Base + allowances. Bonuses are paid when awarded, so they're not part of the contracted salary. */
  get grossSalary(): number {
    return this.toAnnual(this.structure?.grossPay ?? 0);
  }

  get netSalary(): number {
    return this.toAnnual(this.structure?.netPay ?? 0);
  }

  get hasSalaryData(): boolean {
    return this.baseSalary > 0;
  }

  get allowanceLines(): { label: string; amount: number }[] {
    return this.toLines(this.structure?.allowances);
  }

  get deductionLines(): { label: string; amount: number }[] {
    return this.toLines(this.structure?.deductions);
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

  private toLines(lines: SalaryLine[] | undefined): { label: string; amount: number }[] {
    return (lines || []).map(l => {
      const i = l.raw;
      return { label: i?.name || i?.type || i?.allowanceType?.name || i?.deductionType?.name || 'Item', amount: this.toAnnual(l.amount) };
    });
  }

  fmt2(n: number): string {
    return n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
