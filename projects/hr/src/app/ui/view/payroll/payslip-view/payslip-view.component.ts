import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-payslip-view',
  templateUrl: './payslip-view.component.html',
  styleUrl: './payslip-view.component.scss'
})
export class PayslipViewComponent implements OnInit {
  @Input() payslip: any;
  @ViewChild('payslipDoc') payslipDoc!: ElementRef;

  companyName = '';
  logoUrl = '';
  isGeneratingPdf = false;
  today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  readonly monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  ngOnInit(): void {
    try {
      const biz = JSON.parse(sessionStorage.getItem('userPrimaryInfoRegData') || '{}');
      this.companyName = biz?.companyName || biz?.company?.name || 'OptimaX';
      this.logoUrl = biz?.logoUrl || biz?.logo || '';
    } catch {}
  }

  get periodLabel(): string {
    const month = this.monthNames[(this.payslip?.month || 1) - 1] || '';
    return `${month} ${this.payslip?.year || ''}`.trim();
  }

  get payDateLabel(): string {
    const value = this.payslip?.generatedAt || this.payslip?.createdAt;
    if (!Array.isArray(value) || value.length < 3) return '—';
    return new Date(value[0], value[1] - 1, value[2]).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  get allowanceTotal(): number {
    const a = this.payslip?.allowances;
    if (!a) return 0;
    if (typeof a.amount === 'number') return a.amount;
    return Object.values(a).reduce((t: number, v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? t + n : t;
    }, 0) as number;
  }

  get bonusTotal(): number {
    return (this.payslip?.bonuses || []).reduce(
      (t: number, b: any) => t + (Number(b?.amount) || 0), 0
    );
  }

  get overtimePay(): number {
    return Number(this.payslip?.overtimePay) || 0;
  }

  get grossPay(): number {
    if (typeof this.payslip?.grossPay === 'number') return this.payslip.grossPay;
    return (Number(this.payslip?.basePay) || 0) + this.allowanceTotal + this.bonusTotal + this.overtimePay;
  }

  get deductionLines(): { label: string; amount: number }[] {
    const d = this.payslip?.deductions || {};
    return [
      { label: 'Tax (PAYE)',       amount: Number(d.tax)             || 0 },
      { label: 'Pension',          amount: Number(d.pension)         || 0 },
      { label: 'NHF',              amount: Number(d.nhf)             || 0 },
      { label: 'Health Insurance', amount: Number(d.healthInsurance) || 0 },
      { label: 'Loan / Advances',  amount: Number(d.advances)        || 0 },
      { label: 'Cooperatives',     amount: Number(d.cooperatives)    || 0 },
      { label: 'Other',            amount: Number(d.other)           || 0 },
    ].filter(l => l.amount > 0);
  }

  get totalDeductions(): number {
    if (typeof this.payslip?.totalDeductions === 'number') return this.payslip.totalDeductions;
    return this.deductionLines.reduce((t, l) => t + l.amount, 0);
  }

  get netPay(): number {
    return Number(this.payslip?.netPayable) || (this.grossPay - this.totalDeductions);
  }

  statusClass(): string {
    const s = (this.payslip?.runStatus || '').toUpperCase();
    if (s === 'APPROVED' || s === 'COMPLETED') return 'ps-status--green';
    if (s === 'REJECTED') return 'ps-status--red';
    return 'ps-status--amber';
  }

  fmt(value: number): string {
    return `₦${(Number.isFinite(value) ? value : 0).toLocaleString('en-NG', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    })}`;
  }

  async downloadPdf(): Promise<void> {
    if (this.isGeneratingPdf) return;
    this.isGeneratingPdf = true;
    try {
      const el = this.payslipDoc.nativeElement as HTMLElement;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      if (pdfH > pdf.internal.pageSize.getHeight()) {
        pdf.addPage();
      }
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      const safeName = (this.payslip?.name || 'Employee').replace(/\s+/g, '_');
      pdf.save(`Payslip_${safeName}_${this.periodLabel.replace(/\s+/g, '_')}.pdf`);
    } finally {
      this.isGeneratingPdf = false;
    }
  }

  async printPayslip(): Promise<void> {
    if (this.isGeneratingPdf) return;
    this.isGeneratingPdf = true;
    try {
      const el = this.payslipDoc.nativeElement as HTMLElement;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      pdf.autoPrint();
      window.open(pdf.output('bloburl'), '_blank');
    } finally {
      this.isGeneratingPdf = false;
    }
  }
}
