import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { payslipFigures } from '../payslip.util';

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

  /** Same figures as the payslip email (payslip.util). */
  private get figures() { return payslipFigures(this.payslip); }
  get allowanceTotal(): number { return this.figures.allowanceTotal; }
  get bonusTotal(): number { return this.figures.bonusTotal; }
  get overtimePay(): number { return this.figures.overtimePay; }
  get grossPay(): number { return this.figures.grossPay; }
  get deductionLines(): { label: string; amount: number }[] { return this.figures.deductionLines; }
  get totalDeductions(): number { return this.figures.totalDeductions; }
  get netPay(): number { return this.figures.netPay; }
  get unitemisedEarnings(): number { return this.figures.unitemisedEarnings; }
  get unitemisedDeductions(): number { return this.figures.unitemisedDeductions; }
  get notPayable(): boolean { return this.figures.notPayable; }

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
