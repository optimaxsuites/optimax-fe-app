import { Component, Input  } from '@angular/core';
import { CompanyProfileService } from '@services/company-profile/company-profile.service';

@Component({
  selector: 'app-payslip-view',
  templateUrl: './payslip-view.component.html',
  styleUrl: './payslip-view.component.scss'
})
export class PayslipViewComponent {
  @Input() payslip: any;
  get companyProfile$() { return this.companyProfileService.companyProfile$; }

  constructor(private companyProfileService: CompanyProfileService) {}
  monthNames = [
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
  ];

  get payDateLabel(): string {
    const value = this.payslip?.generatedAt || this.payslip?.createdAt;
    if (!Array.isArray(value) || value.length < 3) {
      return '-';
    }
    return new Date(value[0], value[1] - 1, value[2]).toLocaleDateString('en-US');
  }

  get periodLabel(): string {
    const month = this.monthNames[(this.payslip?.month || 1) - 1] || '';
    return `${month} ${this.payslip?.year || ''}`.trim();
  }

  get allowanceTotal(): number {
    const allowances = this.payslip?.allowances;
    if (!allowances) return 0;

    if (typeof allowances.amount === 'number') {
      return allowances.amount;
    }

    return Object.values(allowances).reduce((total: number, value: any) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? total + parsed : total;
    }, 0) as number;
  }

  get additionsTotal(): number {
    return (this.payslip?.bonuses || []).reduce((total: number, item: any) => total + (Number(item?.amount) || 0), 0);
  }

  get deductionsTotal(): number {
    if (typeof this.payslip?.totalDeductions === 'number') {
      return this.payslip.totalDeductions;
    }
    return (this.payslip?.deductions || []).reduce((total: number, item: any) => total + (Number(item?.amount) || 0), 0);
  }

  get grossPay(): number {
    if (typeof this.payslip?.grossPay === 'number') {
      return this.payslip.grossPay;
    }
    return (Number(this.payslip?.salary) || 0) + this.allowanceTotal + this.additionsTotal;
  }

  formatMoney(value: number): string {
    const amount = Number.isFinite(value) ? value : 0;
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
