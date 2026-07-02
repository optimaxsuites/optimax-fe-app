import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject } from 'rxjs';
import { CrmApiService } from '../../service/crm-api.service';
import { Contact } from '../../domain/crm.model';
import { CrmContactFormComponent } from './crm-contact-form.component';

@Component({
  selector: 'app-crm-contacts',
  templateUrl: './crm-contacts.component.html',
  styleUrls: ['./crm-contacts.component.scss'],
})
export class CrmContactsComponent implements OnInit {
  loading$ = new BehaviorSubject(true);
  contacts: Contact[] = [];
  filtered: Contact[] = [];
  searchTerm = '';
  typeFilter = '';
  sourceFilter = '';

  constructor(
    private api: CrmApiService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading$.next(true);
    this.api.getContacts(1, 200).subscribe({
      next: (data) => {
        this.contacts = data || [];
        this.applyFilters();
        this.loading$.next(false);
      },
      error: () => this.loading$.next(false),
    });
  }

  applyFilters() {
    const q = this.searchTerm.toLowerCase();
    this.filtered = this.contacts.filter(c => {
      const matchSearch = !q ||
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.companyName || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q);
      const matchType = !this.typeFilter || c.contactType === this.typeFilter;
      const matchSource = !this.sourceFilter || c.leadSource === this.sourceFilter;
      return matchSearch && matchType && matchSource;
    });
  }

  openForm(contact?: Contact) {
    const ref = this.dialog.open(CrmContactFormComponent, {
      data: contact || null,
      width: '640px',
      maxHeight: '90vh',
    });
    ref.afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  delete(c: Contact) {
    if (!confirm(`Delete ${c.firstName} ${c.lastName}?`)) return;
    this.api.deleteContact(c.id!).subscribe({
      next: () => { this.snack.open('Contact deleted', 'Close', { duration: 3000 }); this.load(); },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  initials(c: Contact) {
    return `${c.firstName?.[0] || ''}${c.lastName?.[0] || ''}`.toUpperCase();
  }

  avatarColor(c: Contact) {
    const colors = ['#25925B','#2E6276','#f59e0b','#ec4899','#0ea5e9','#10b981','#6366f1','#7c3aed'];
    return colors[(c.id || 0) % colors.length];
  }

  scoreClass(score?: number): string {
    if (!score) return 'low';
    if (score >= 80) return 'high';
    if (score >= 50) return 'med';
    return 'low';
  }

  sourceClass(source?: string): string {
    const map: Record<string, string> = {
      REFERRAL: 'referral', WEBSITE: 'website', COLD_CALL: 'cold',
      EVENT: 'trade', LINKEDIN: 'referral', DIRECT: 'website',
    };
    return `badge-source ${map[source || ''] || ''}`;
  }
}
