import { Component } from '@angular/core';

@Component({
  selector: 'app-finance-auditlog',
  templateUrl: './finance-auditlog.component.html',
  styleUrls: ['./finance-auditlog.component.scss']
})
export class FinanceAuditTrailComponent {
  searchQuery = '';
  actionFilter = '';
  entityFilter = '';
  actorFilter = '';

  allLogs = [
    { ts: '30 Jun 2026, 11:42', actor: 'Chioma Eze', action: 'APPROVED', entity: 'EVENT', ref: 'TXN-2026-041', desc: 'Approved Staff Salary Payment — Olawale Adeyemi', ip: '10.0.1.12' },
    { ts: '30 Jun 2026, 11:40', actor: 'SYSTEM', action: 'POSTED', entity: 'JE', ref: 'JE-2026-0842', desc: 'Auto-post: June Payroll — Salaries Payable', ip: 'SYSTEM' },
    { ts: '30 Jun 2026, 10:15', actor: 'Damilola Awe', action: 'MODIFIED', entity: 'SETTING', ref: 'SETTING-FX', desc: 'Exchange rate USD/NGN updated from 1,550 to 1,580', ip: '10.0.1.5' },
    { ts: '29 Jun 2026, 16:30', actor: 'Adaeze Nwosu', action: 'LOCKED', entity: 'PERIOD', ref: 'PERIOD-2026-05', desc: 'May 2026 hard-locked after external audit sign-off', ip: '10.0.2.8' },
    { ts: '29 Jun 2026, 14:22', actor: 'Chioma Eze', action: 'CREATED', entity: 'JE', ref: 'JE-2026-0841', desc: 'Manual adjustment — BANK CHARGES GTBank June', ip: '10.0.1.12' },
    { ts: '28 Jun 2026, 09:00', actor: 'SYSTEM', action: 'CREATED', entity: 'JE', ref: 'JE-2026-0840', desc: 'Auto-post: Paystack transfer received from Dangote Group', ip: 'SYSTEM' },
    { ts: '27 Jun 2026, 15:50', actor: 'Olawale Adeyemi', action: 'EXPORTED', entity: 'REPORT', ref: 'RPT-2026-015', desc: 'Exported Income Statement PDF — June 2026', ip: '10.0.1.9' },
    { ts: '26 Jun 2026, 11:00', actor: 'Chioma Eze', action: 'REJECTED', entity: 'EVENT', ref: 'TXN-2026-039', desc: 'Rejected: Expense Reimbursement — Amaka Okonkwo — insufficient docs', ip: '10.0.1.12' },
  ];

  get filteredLogs() {
    return this.allLogs.filter(l => {
      const q = this.searchQuery.toLowerCase();
      const matchesSearch = !q || l.ref.toLowerCase().includes(q) || l.actor.toLowerCase().includes(q) || l.desc.toLowerCase().includes(q);
      const matchesAction = !this.actionFilter || l.action === this.actionFilter;
      const matchesEntity = !this.entityFilter || l.entity === this.entityFilter;
      const matchesActor = !this.actorFilter || l.actor === this.actorFilter;
      return matchesSearch && matchesAction && matchesEntity && matchesActor;
    });
  }

  actionClass(action: string): string {
    const map: any = {
      APPROVED: 'badge-green',
      POSTED: 'badge-blue',
      MODIFIED: 'badge-amber',
      CREATED: 'badge-blue',
      LOCKED: 'badge-gray',
      EXPORTED: 'badge-purple',
      REJECTED: 'badge-red',
      REVERSED: 'badge-orange'
    };
    return map[action] || 'badge-gray';
  }

  clearFilters() {
    this.searchQuery = '';
    this.actionFilter = '';
    this.entityFilter = '';
    this.actorFilter = '';
  }
}
