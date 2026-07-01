import { Component } from '@angular/core';

@Component({
  selector: 'app-finance-payments',
  templateUrl: './finance-payments.component.html',
  styleUrls: ['./finance-payments.component.scss'],
})
export class FinancePaymentsComponent {
  activeFilter = 'all';
  wizardStep = 1;

  setFilter(f: string) { this.activeFilter = f; }
  setStep(s: number) { this.wizardStep = s; }

  allRequests = [
    { name: 'Jun 2026 Salary Run', meta: 'HR / All Staff · Monthly Salaries', amount: '&#8358;8,450,000', ref: 'PR-2026-020', module: 'PAYROLL' },
    { name: 'Staff Reimbursements — Jun', meta: 'Finance / Multiple · Staff Expenses', amount: '&#8358;320,000', ref: 'EXP-2026-055', module: 'EXPENSE' },
    { name: 'Julius Berger Invoice', meta: 'Procurement / Vendor · Construction', amount: '&#8358;1,800,000', ref: 'BILL-2026-041', module: 'VENDOR' },
    { name: 'Olawale Adeyemi', meta: 'Engineering · Staff Loan', amount: '&#8358;150,000', ref: 'PR-2026-014', module: 'LOANS' },
  ];

  get requests() {
    if (this.activeFilter === 'all') return this.allRequests;
    return this.allRequests.filter(r => r.module === this.activeFilter);
  }

  moduleClass(m: string): string {
    return ({ PAYROLL: 'payroll', EXPENSE: 'expense', VENDOR: 'vendor', LOANS: 'loans' } as any)[m] || '';
  }

  avatarClass(m: string): string {
    return ({ PAYROLL: 'payroll-bg', EXPENSE: 'expense-bg', VENDOR: 'vendor-bg', LOANS: 'loans-bg' } as any)[m] || '';
  }

  tagClass(m: string): string {
    return ({ PAYROLL: 'payroll-tag', EXPENSE: 'expense-tag', VENDOR: 'vendor-tag', LOANS: 'loans-tag' } as any)[m] || '';
  }

  avatarText(r: any): string {
    return r.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  }
}
