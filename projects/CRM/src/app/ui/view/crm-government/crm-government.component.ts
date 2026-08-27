import { Component, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CrmApiService } from '../../service/crm-api.service';
import { Contact, Ticket } from '../../domain/crm.model';

@Component({
  selector: 'app-crm-government',
  templateUrl: './crm-government.component.html',
  styleUrls: ['./crm-government.component.scss'],
})
export class CrmGovernmentComponent implements OnInit {
  activeTab = 'citizens';
  loading$ = new BehaviorSubject(true);

  contacts: Contact[] = [];
  tickets: Ticket[] = [];

  searchTerm = '';
  caseSearch = '';

  constructor(private api: CrmApiService, private snack: MatSnackBar) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading$.next(true);
    this.api.getContacts(1, 500).subscribe({
      next: (data) => { this.contacts = data || []; this.loading$.next(false); },
      error: () => this.loading$.next(false),
    });
    this.api.getTickets(1, 200).subscribe({
      next: (data) => { this.tickets = data || []; },
      error: () => {},
    });
  }

  setTab(tab: string) { this.activeTab = tab; }

  get filteredContacts(): Contact[] {
    const q = this.searchTerm.toLowerCase();
    if (!q) return this.contacts;
    return this.contacts.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.nin || '').includes(q) ||
      (c.city || '').toLowerCase().includes(q)
    );
  }

  get filteredTickets(): Ticket[] {
    const q = this.caseSearch.toLowerCase();
    if (!q) return this.tickets;
    return this.tickets.filter(t =>
      (t.subject || '').toLowerCase().includes(q) ||
      (t.accountName || '').toLowerCase().includes(q) ||
      (t.contactName || '').toLowerCase().includes(q)
    );
  }

  initials(c: Contact): string {
    return `${c.firstName?.[0] || ''}${c.lastName?.[0] || ''}`.toUpperCase();
  }

  avatarColor(c: Contact): string {
    const colors = ['#25925B', '#2E6276', '#7c3aed', '#0ea5e9', '#f59e0b', '#10b981'];
    return colors[(c.id || 0) % colors.length];
  }

  ticketStatusClass(status?: string): string {
    const map: Record<string, string> = {
      OPEN: 'case-status open', IN_PROGRESS: 'case-status in-progress',
      RESOLVED: 'case-status resolved', CLOSED: 'case-status resolved',
      ESCALATED: 'case-status escalated',
    };
    return map[status || ''] || 'case-status open';
  }

  ticketPriorityClass(p?: string): string {
    const map: Record<string, string> = {
      CRITICAL: 'case-priority critical', HIGH: 'case-priority high',
      NORMAL: 'case-priority normal', LOW: 'case-priority normal',
    };
    return map[p || ''] || 'case-priority normal';
  }

  newRecord() {
    this.snack.open('Use the Contacts menu to register a new citizen record', 'OK', { duration: 4000 });
  }

  newCase() {
    this.snack.open('Use the Tickets menu to create a new case', 'OK', { duration: 4000 });
  }
}
