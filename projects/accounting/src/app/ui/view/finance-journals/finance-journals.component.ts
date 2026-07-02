import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountingService } from '../../../services/accounting.service';
import { JournalEntryDTO, JournalEntryStatus, PaginationResult } from '../../domain/accounting.dto';

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

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
}
