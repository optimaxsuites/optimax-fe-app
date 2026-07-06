import { Component, OnInit } from '@angular/core';
import { CompanyProfileService } from 'projects/settings/src/app/ui/sharedComponents/service/company-profile/company-profile.service';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-employment-letter',
  templateUrl: './employment-letter.component.html',
  styleUrl: './employment-letter.component.scss'
})
export class EmploymentLetterComponent implements OnInit {
  employee: any = {};
  companyProfile: any = {};
  generatingPdf = false;
  today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  constructor(private companyProfileService: CompanyProfileService) {}

  ngOnInit() {
    const stored = localStorage.getItem('employeeInView');
    if (stored) {
      try { this.employee = JSON.parse(stored); } catch { this.employee = {}; }
    }
    this.companyProfileService.getCompanyProfile().subscribe({
      next: (profile) => { this.companyProfile = profile; },
      error: () => { this.companyProfile = {}; }
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

  get employeeName(): string {
    return `${this.employee?.firstName ?? ''} ${this.employee?.lastName ?? ''}`.trim();
  }

  get startDate(): string {
    const d = this.employee?.employementStartDate || this.employee?.hireDate;
    if (!d) return '_______________';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
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

  get companyName(): string {
    return this.companyProfile?.companyName || 'The Company';
  }

  get logoUrl(): string {
    return this.companyProfile?.logoUrl || '';
  }
}
