import { Component, OnInit } from '@angular/core';
import { AccountingService } from '../../../services/accounting.service';
import { ToastService } from '../../../services/toast.service';
import { AccountDTO, AccountMappingDTO, AccountingEventDTO, PaginationResult } from '../../domain/accounting.dto';

interface QueueEvent extends AccountingEventDTO {
  status: string;
  suggestedDebit?: string;
  suggestedCredit?: string;
  matchedMapping?: AccountMappingDTO;
}

@Component({
  selector: 'app-accounting-queue',
  templateUrl: './accounting-queue.component.html',
  styleUrls: ['./accounting-queue.component.scss']
})
export class AccountingQueueComponent implements OnInit {
  events: QueueEvent[] = [];
  mappings: AccountMappingDTO[] = [];
  accounts: AccountDTO[] = [];
  loading = false;

  // Pagination
  first = 0;
  rows = 10;
  totalRecords = 0;

  // Edit modal state
  isEditOpen = false;
  editingEvent: QueueEvent | null = null;

  constructor(
    private accountingService: AccountingService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    console.log('[Optimax Accounting] AccountingQueueComponent initialized');
    this.loadEvents();
    this.loadMappings();
    this.loadAccounts();
  }

  loadEvents(): void {
    this.loading = true;
    const page = Math.floor(this.first / this.rows) + 1; // API is 1-indexed for pages
    this.accountingService.getEvents(page, this.rows).subscribe({
      next: (res: PaginationResult<AccountingEventDTO>) => {
        console.log('[Optimax Accounting] Events fetched successfully:', res);
        this.events = (res.content || []).map(ev => ({
          ...ev,
          status: 'UNPROCESSED',
          suggestedDebit: '',
          suggestedCredit: ''
        }));
        this.totalRecords = res.totalSize || 0;
        this.loading = false;
        this.applySuggestions();
      },
      error: (err) => {
        console.error('[Optimax Accounting] Failed to load accounting queue:', err);
        this.toastService.error('Failed to load accounting queue');
        this.loading = false;
      }
    });
  }

  loadMappings(): void {
    this.accountingService.getAccountMappings(0, 100).subscribe({
      next: (res) => {
        this.mappings = res.content || [];
        this.applySuggestions();
      },
      error: () => console.error('Failed to load account mappings')
    });
  }
  
  loadAccounts(): void {
    this.accountingService.getAccounts(0, 100).subscribe({
      next: (res) => {
        this.accounts = res.content || [];
        this.applySuggestions();
      },
      error: () => console.error('Failed to load accounts')
    });
  }

  private applySuggestions(): void {
    if (!this.events.length) return;

    this.events.forEach(event => {
      // 1. Basic Mapping Match (Source Module + Event Type)
      const match = this.mappings.find(m => 
        m.sourceModule === event.sourceModule && 
        m.eventType === event.eventType
      );

      if (match) {
        event.matchedMapping = match;
        if (match.debitAccount) {
          event.suggestedDebit = `${match.debitAccount.accountCode} - ${match.debitAccount.accountName}`;
        }
        if (match.creditAccount) {
          event.suggestedCredit = `${match.creditAccount.accountCode} - ${match.creditAccount.accountName}`;
        }
      }

      // 2. Metadata Override for Credit Account
      // User requirement: If event.metadata.sourceAccountId exists, override suggestedCredit
      const sourceAccountId = event.metadata?.sourceAccountId;
      if (sourceAccountId) {
        const accountOverride = this.accounts.find(a => a.id == sourceAccountId);
        if (accountOverride) {
          event.suggestedCredit = `${accountOverride.accountCode} - ${accountOverride.accountName}`;
          console.log(`[Optimax Accounting] Override applied for event ${event.reference}: Credit Account -> ${event.suggestedCredit}`);
        }
      }
    });
  }

  onPageChange(event: any): void {
    this.first = event.first;
    this.rows = event.rows;
    this.loadEvents();
  }

  approveEvent(event: QueueEvent): void {
    if (!event.matchedMapping) {
      this.toastService.error('Cannot approve: No account mapping found for this event type.');
      return;
    }

    const userDataStr = sessionStorage.getItem('userPrimaryInfoRegData');
    if (!userDataStr) {
      this.toastService.error('Session error: User profile not found. Please log in again.');
      return;
    }

    const createdBy = JSON.parse(userDataStr);
    event.status = 'PROCESSING';

    this.accountingService.orchestrateEventExecution(event, event.matchedMapping, createdBy).subscribe({
      next: (res) => {
        event.status = 'APPROVED';
        this.toastService.success(`Event ${event.reference} successfully processed into Ledger`);
        console.log('Orchestration result:', res);
      },
      error: (err) => {
        event.status = 'UNPROCESSED';
        this.toastService.error(`Failed to process event ${event.reference}: ${err.message || 'Server error'}`);
        console.error('Orchestration error:', err);
      }
    });
  }

  rejectEvent(event: QueueEvent): void {
    event.status = 'REJECTED';
    this.toastService.warn(`Event ${event.reference} rejected`);
  }

  openEdit(event: QueueEvent): void {
    this.editingEvent = { ...event };
    this.isEditOpen = true;
  }

  saveEdit(): void {
    if (!this.editingEvent) return;
    const idx = this.events.findIndex(e => e.reference === this.editingEvent!.reference);
    if (idx !== -1) {
      this.events[idx] = { ...this.editingEvent };
    }
    this.isEditOpen = false;
    this.toastService.success('Event updated');
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'APPROVED':    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'REJECTED':    return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'PROCESSING':  return 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse';
      case 'UNPROCESSED': return 'bg-amber-100 text-amber-800 border-amber-200';
      default:            return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  }

  getModuleBadge(module: string): string {
    const map: Record<string, string> = {
      POS:         'bg-blue-100 text-blue-800',
      HR:          'bg-purple-100 text-purple-800',
      HOSPITALITY: 'bg-indigo-100 text-indigo-800',
      BANK:        'bg-teal-100 text-teal-800',
      EXPENSE:     'bg-orange-100 text-orange-800',
      MANUAL:      'bg-gray-100 text-gray-700',
    };
    return map[module?.toUpperCase()] || 'bg-gray-100 text-gray-700';
  }

  get pendingCount(): number  { return this.events.filter(e => e.status === 'UNPROCESSED').length; }
  get approvedCount(): number { return this.events.filter(e => e.status === 'APPROVED').length; }
  get rejectedCount(): number { return this.events.filter(e => e.status === 'REJECTED').length; }
}
