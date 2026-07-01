import { Component } from '@angular/core';

@Component({
  selector: 'app-finance-events',
  templateUrl: './finance-events.component.html',
  styleUrls: ['./finance-events.component.scss'],
})
export class FinanceEventsComponent {
  events = [
    { date: '14 Jun 2026', ref: 'TXN-2026-041', def: 'Staff Salary Payment', party: 'Olawale Adeyemi', module: 'PAYROLL', dir: 'OUT', amount: '&#8358;150,000', currency: 'NGN', status: 'PENDING' },
    { date: '13 Jun 2026', ref: 'TXN-2026-040', def: 'Client Invoice Settlement', party: 'Dangote Group', module: 'SALES', dir: 'IN', amount: '$5,200', currency: 'USD', status: 'COMPLETED' },
    { date: '12 Jun 2026', ref: 'TXN-2026-039', def: 'Expense Reimbursement', party: 'Amaka Okonkwo', module: 'EXPENSE', dir: 'OUT', amount: '&#8358;45,000', currency: 'NGN', status: 'REJECTED' },
  ];

  approve(ev: any) { if (ev.status === 'PENDING') ev.status = 'APPROVED'; }
  reject(ev: any)  { if (ev.status === 'PENDING') ev.status = 'REJECTED'; }
}
