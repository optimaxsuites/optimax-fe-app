import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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

  // CSV import state
  importing = false;
  importProgress = 0;
  importTotal = 0;
  importErrors: string[] = [];
  showImportSummary = false;
  importDone = 0;

  // Business card scan state
  scanning = false;

  @ViewChild('csvInput') csvInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('cardInput') cardInputRef!: ElementRef<HTMLInputElement>;

  get customerCount(): number { return this.contacts.filter(c => c.contactType === 'CUSTOMER').length; }
  get leadCount(): number { return this.contacts.filter(c => c.contactType === 'LEAD').length; }
  get prospectCount(): number { return this.contacts.filter(c => c.contactType === 'PROSPECT').length; }

  constructor(
    private api: CrmApiService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading$.next(true);
    this.api.getContacts(1, 500).subscribe({
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

  // ── CSV Import ─────────────────────────────────────────────────────────────

  importCsv() {
    this.csvInputRef.nativeElement.value = '';
    this.csvInputRef.nativeElement.click();
  }

  onCsvFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const contacts = this.parseCsv(text);
      if (!contacts.length) {
        this.snack.open('No valid rows found in CSV. Check column headers.', 'Close', { duration: 5000 });
        return;
      }
      this.runImport(contacts);
    };
    reader.readAsText(file);
  }

  private parseCsv(csv: string): Partial<Contact>[] {
    const lines = csv.replace(/\r/g, '').split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z]/g, ''));
    const colMap: Record<string, keyof Contact> = {
      firstname: 'firstName', first: 'firstName', fname: 'firstName',
      lastname: 'lastName', last: 'lastName', lname: 'lastName', surname: 'lastName',
      email: 'email', emailaddress: 'email',
      phone: 'phone', mobile: 'phone', telephone: 'phone', tel: 'phone',
      whatsapp: 'whatsapp',
      jobtitle: 'jobTitle', title: 'jobTitle', position: 'jobTitle', role: 'jobTitle',
      company: 'companyName', companyname: 'companyName', organisation: 'companyName', organization: 'companyName', employer: 'companyName',
      contacttype: 'contactType', type: 'contactType',
      leadsource: 'leadSource', source: 'leadSource',
      owner: 'ownerName', ownername: 'ownerName', assignedto: 'ownerName',
      address: 'address',
      city: 'city',
      state: 'state',
      linkedin: 'linkedinUrl', linkedinurl: 'linkedinUrl',
      tags: 'tags',
      nin: 'nin', bvn: 'bvn', tin: 'tin',
    };

    const contacts: Partial<Contact>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      if (values.every(v => !v.trim())) continue;
      const contact: Partial<Contact> = {};
      headers.forEach((h, idx) => {
        const field = colMap[h];
        if (field && values[idx]) {
          (contact as any)[field] = values[idx].trim();
        }
      });
      if (contact.firstName || contact.email) {
        contact.firstName = contact.firstName || 'Unknown';
        contact.lastName = contact.lastName || '';
        contacts.push(contact);
      }
    }
    return contacts;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue; }
      current += ch;
    }
    result.push(current);
    return result;
  }

  private runImport(contacts: Partial<Contact>[]) {
    this.importing = true;
    this.importProgress = 50;
    this.importTotal = contacts.length;
    this.importDone = 0;
    this.importErrors = [];
    this.showImportSummary = false;

    this.snack.open(`Sending ${contacts.length} contacts to server…`, '', { duration: 2500 });

    this.api.bulkCreateContacts(contacts as Contact[]).subscribe({
      next: (res) => {
        this.importing = false;
        this.importProgress = 100;
        this.importDone = res.created;
        this.importErrors = res.errors || [];
        this.showImportSummary = true;
        this.snack.open(`Import complete: ${res.created} created, ${res.failed} failed.`, 'Close', { duration: 6000 });
        this.load();
      },
      error: (e) => {
        this.importing = false;
        this.snack.open(`Import failed: ${e}`, 'Close', { duration: 5000 });
      },
    });
  }

  // ── Business Card Scanning ─────────────────────────────────────────────────

  scanBusinessCard() {
    this.cardInputRef.nativeElement.value = '';
    this.cardInputRef.nativeElement.click();
  }

  onCardFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.scanning = true;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      this.api.scanBusinessCard(base64, file.type).subscribe({
        next: (contact) => {
          this.scanning = false;
          const ref = this.dialog.open(CrmContactFormComponent, {
            data: contact,
            width: '640px',
            maxHeight: '90vh',
          });
          ref.afterClosed().subscribe(saved => { if (saved) this.load(); });
        },
        error: () => {
          this.scanning = false;
          this.snack.open('Card scan failed — please fill in the form manually', 'OK', { duration: 3000 });
          this.openForm();
        },
      });
    };
    reader.readAsDataURL(file);
  }

  // ── Utils ─────────────────────────────────────────────────────────────────

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
