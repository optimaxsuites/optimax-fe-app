import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountingService } from '../../../services/accounting.service';
import { JournalEntryDTO, JournalEntryStatus, PaginationResult } from '../../domain/accounting.dto';
import { formatFlexDate } from '../../sharedComponent/date.util';
import { downloadCsv } from '../../sharedComponent/export.util';

@Component({
  selector: 'app-finance-journals',
  templateUrl: './finance-journals.component.html',
  styleUrls: ['./finance-journals.component.scss'],
})
export class FinanceJournalsComponent implements OnInit, OnDestroy {
  journals: JournalEntryDTO[] = [];
  totalSize = 0;
  page = 0;
  pageSize = 20;
  loading = false;
  saving = false;

  JournalEntryStatus = JournalEntryStatus;

  newEntry = {
    entryDate: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    currency: 'NGN'
  };

  private subs = new Subscription();

  get totalCount(): number { return this.totalSize; }
  get postedCount(): number { return this.journals.filter(j => j.status === JournalEntryStatus.POSTED).length; }
  get draftCount(): number { return this.journals.filter(j => j.status === JournalEntryStatus.DRAFT).length; }

  constructor(private accountingService: AccountingService) {}

  ngOnInit(): void { this.load(); }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  load(): void {
    this.loading = true;
    this.subs.add(
      this.accountingService.getJournalEntries(this.page, this.pageSize).subscribe({
        next: (res: PaginationResult<JournalEntryDTO>) => {
          this.journals = res.content;
          this.totalSize = res.totalSize;
          this.loading = false;
        },
        error: () => { this.loading = false; }
      })
    );
  }

  formatDate(d: any): string { return formatFlexDate(d); }

  postEntry(j: JournalEntryDTO): void {
    this.subs.add(
      this.accountingService.createJournalEntry({ ...j, status: JournalEntryStatus.POSTED }).subscribe({
        next: () => this.load()
      })
    );
  }

  reverseEntry(j: JournalEntryDTO): void {
    if (!confirm(`Reverse journal entry ${this.entryLabel(j)}? This cannot be undone.`)) return;
    this.subs.add(
      this.accountingService.createJournalEntry({
        entryDate: new Date().toISOString().split('T')[0],
        description: `Reversal of ${this.entryLabel(j)} — ${j.description || ''}`,
        status: JournalEntryStatus.DRAFT
      }).subscribe({ next: () => this.load() })
    );
  }

  entryLabel(j: JournalEntryDTO): string {
    const num = j.entryNumber ?? j.id;
    return `JE-${String(num).padStart(4, '0')}`;
  }

  sourceLabel(j: JournalEntryDTO): string {
    return (j.transaction?.sourceModule as string) || 'MANUAL';
  }

  prevPage(): void {
    if (this.page > 0) { this.page--; this.load(); }
  }

  nextPage(): void {
    if ((this.page + 1) * this.pageSize < this.totalSize) { this.page++; this.load(); }
  }

  saveDraft(): void {
    if (!this.newEntry.description) return;
    this.saving = true;
    this.subs.add(
      this.accountingService.createJournalEntry({
        entryDate: this.newEntry.entryDate,
        description: this.newEntry.description,
        status: JournalEntryStatus.DRAFT
      }).subscribe({
        next: () => { this.saving = false; this.resetForm(); this.load(); },
        error: () => { this.saving = false; }
      })
    );
  }

  resetForm(): void {
    this.newEntry = {
      entryDate: new Date().toISOString().split('T')[0],
      description: '', reference: '', currency: 'NGN'
    };
  }

  exportCsv(): void {
    const headers = ['Entry #', 'Date', 'Description', 'Status', 'Source'];
    const rows = this.journals.map(j => [
      this.entryLabel(j),
      this.formatDate(j.entryDate),
      j.description || '',
      j.status,
      this.sourceLabel(j),
    ]);
    downloadCsv(`journal-entries-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  get insightText(): string {
    if (this.loading) return 'Analysing journal entries…';
    const n = this.totalSize;
    if (!n) return 'No journal entries yet. Use the form below to create your first manual journal entry.';
    const parts: string[] = [`${n} total journal entries`];
    if (this.postedCount > 0) parts.push(`${this.postedCount} posted`);
    if (this.draftCount > 0) parts.push(`⚠ ${this.draftCount} draft${this.draftCount > 1 ? 's' : ''} pending`);
    const action = this.draftCount > 0
      ? ` → Review and post ${this.draftCount} draft entr${this.draftCount > 1 ? 'ies' : 'y'} to finalise your ledger.`
      : ' → All entries are posted. Ledger is up to date.';
    return parts.join(' · ') + action;
  }
}
