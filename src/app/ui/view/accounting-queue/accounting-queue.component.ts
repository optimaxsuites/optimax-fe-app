import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AccountingService } from '../../../services/accounting.service';
import { ToastService } from '../../../services/toast.service';
import { AccountDTO, AccountMappingDTO, AccountingEventDTO, PaginationResult, SourceModule } from '../../domain/accounting.dto';

interface QueueEvent {
  id?: number;
  status: string;
  reference: string;
  sourceModule: SourceModule;
  eventType: string;
  amount: number;
  currency: string;
  description: string;
  transactionDate?: any;
  createdAt?: any;
  metadata?: any;
  suggestedDebit?: string;
  suggestedCredit?: string;
  suggestedDebitId?: number;
  suggestedCreditId?: number;
  matchedMapping?: AccountMappingDTO;
  isTransaction?: boolean;
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

  // Filtering
  searchTerm = '';
  selectedType = '';
  selectedModule = '';
  selectedStatus = '';

  // Sorting
  sortField = '';
  sortOrder = 1; // 1 for asc, -1 for desc

  modules = ['POS', 'HR', 'HOSPITALITY', 'BANK', 'EXPENSE', 'MANUAL'];
  statuses = ['UNPROCESSED', 'APPROVED', 'REJECTED', 'PROCESSING'];

  eventTypes = [
    'LOAN_DISBURSEMENT',
    'PRINCIPLE_REPAYMENT',
    'INTEREST_REPAYMENT',
    'LATE_FEE',
    'CONTRIBUTION',
    'PATRONAGE'
  ];

  // Edit modal state
  isEditOpen = false;
  editingEvent: QueueEvent | null = null;
  isViewOnly = false;

  // Custom Confirmation Modal State
  isConfirmOpen = false;
  isProcessingPost = false;
  pendingActionData: { event: QueueEvent, mapping: AccountMappingDTO, createdBy: any } | null = null;

  constructor(
    private accountingService: AccountingService,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    console.log('[Optimax Accounting] AccountingQueueComponent initialized');
    this.loadEvents();
    this.loadMappings();
    this.loadAccounts();
  }

  loadEvents(): void {
    this.loading = true;
    const page = Math.floor(this.first / this.rows);

    // Fetch both raw events and processed transactions to provide a unified view
    forkJoin({
      events: this.accountingService.getEvents(page, this.rows),
      transactions: this.accountingService.getTransactions(page, this.rows)
    }).subscribe({
      next: (res) => {
        const rawEvents = res.events.content || [];
        const processedTransactions = res.transactions.content || [];

        // 1. Map Transactions (These are already processed/approved)
        const txList = processedTransactions.map(tx => ({
          ...tx,
          id: tx.id,
          reference: tx.transactionReference,
          sourceModule: tx.sourceModule,
          eventType: tx.accountingEvent?.eventType || 'MANUAL_ENTRY',
          amount: tx.amount,
          currency: tx.currency,
          description: tx.description || 'Transaction Entry',
          status: tx.status || 'APPROVED',
          suggestedDebit: tx.account?.accountName || '—',
          suggestedCredit: '—',
          isTransaction: true,
          transactionDate: tx.transactionDate,
          createdAt: tx.createdAt
        } as QueueEvent));

        // 2. Map Events (These are raw inputs)
        const eventList = rawEvents
          .filter(ev => !txList.some(tx => tx.reference === ev.reference))
          .map(event => {
            const ref = event.reference || (event as any).instructionReference || `#EV-${event.id}`;

            // Fall back to global mapping rule (suggestion only)
            const mapping = this.mappings.find(m =>
              m.eventType === event.eventType && m.sourceModule === event.sourceModule
            );
            const debitName = mapping?.debitAccount?.accountName
              || this.accounts.find(a => a.id === mapping?.debitAccountId)?.accountName
              || mapping?.debitAccountId?.toString() || '—';
            const creditName = mapping?.creditAccount?.accountName
              || this.accounts.find(a => a.id === mapping?.creditAccountId)?.accountName
              || mapping?.creditAccountId?.toString() || '—';
            return {
              ...event,
              reference: ref,
              status: (event as any).status || 'UNPROCESSED',
              matchedMapping: mapping,
              suggestedDebit: debitName,
              suggestedCredit: creditName,
              isTransaction: false
            } as QueueEvent;
          });

        // 3. Combine and sort (Newest first)
        // NOTE: backend may return dates as Java arrays [year,month,day,hour,min,sec,nano]
        this.events = [...txList, ...eventList].sort((a, b) => {
          const dateA = this.parseEventDate(a['createdAt'] || a['transactionDate']);
          const dateB = this.parseEventDate(b['createdAt'] || b['transactionDate']);
          return dateB - dateA;
        });

        this.events.forEach(ev => {
          if (ev.metadata?.suggestedDebitId && ev.metadata?.suggestedCreditId) {
            const m = ev.metadata;
            ev.suggestedDebitId = m.suggestedDebitId;
            ev.suggestedCreditId = m.suggestedCreditId;
            ev.suggestedDebit = m.suggestedDebitName;
            ev.suggestedCredit = m.suggestedCreditName;

            // Reconstruct a synthetic mapping for the orchestration pipeline
            ev.matchedMapping = {
              sourceModule: ev.sourceModule,
              eventType: ev.eventType,
              debitAccountId: m.suggestedDebitId,
              creditAccountId: m.suggestedCreditId,
              debitAccount: { accountName: m.suggestedDebitName } as any,
              creditAccount: { accountName: m.suggestedCreditName } as any
            } as AccountMappingDTO;
          }
        });

        this.totalRecords = res.events.totalSize + res.transactions.totalSize;
        this.loading = false;
      },
      error: (err) => {
        console.error('Sync failed:', err);
        this.toastService.error('Failed to sync accounting data');
        this.loading = false;
      }
    });
  }

  loadMappings(): void {
    this.accountingService.getAccountMappings(0, 100).subscribe({
      next: (res) => {
        this.mappings = res.content || [];
      },
      error: () => console.error('Failed to load account mappings')
    });
  }

  loadAccounts(): void {
    this.accountingService.getAccounts(0, 100).subscribe({
      next: (res) => {
        this.accounts = res.content || [];
      },
      error: () => console.error('Failed to load accounts')
    });
  }

  private applySuggestions(): void {
    // Overridden by loadTransactions mapping for now
  }

  get filteredEvents(): QueueEvent[] {
    let list = this.events.filter(event => {
      const matchesSearch = !this.searchTerm ||
        (event.reference?.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (event.description?.toLowerCase().includes(this.searchTerm.toLowerCase()));

      const matchesModule = !this.selectedModule || event.sourceModule === this.selectedModule;
      const matchesStatus = !this.selectedStatus || event.status === this.selectedStatus;
      const matchesType = !this.selectedType || event.eventType === this.selectedType;

      return matchesSearch && matchesModule && matchesStatus && matchesType;
    });

    if (this.sortField) {
      list.sort((a, b) => {
        let valA = (a as any)[this.sortField];
        let valB = (b as any)[this.sortField];

        if (valA === undefined || valA === null) valA = 0;
        if (valB === undefined || valB === null) valB = 0;

        if (typeof valA === 'string') {
          return valA.localeCompare(valB) * this.sortOrder;
        } else {
          return (valA - valB) * this.sortOrder;
        }
      });
    }
    return list;
  }


  onPageChange(event: any): void {
    this.first = event.first;
    this.rows = event.rows;
    this.loadEvents();
  }

  approveEvent(event: QueueEvent): void {
    if (event.status === 'APPROVED' || event.status === 'POSTED') {
      this.toastService.warn('This transaction is already approved and locked.');
      return;
    }

    if (!event.matchedMapping) {
      this.toastService.warn('Please complete the account mapping before approval.');
      return;
    }

    // Prepare data for the confirmation modal
    this.pendingActionData = {
      event: event,
      mapping: event.matchedMapping,
      createdBy: this.getCurrentUser()
    };

    this.isConfirmOpen = true;
  }

  getCurrentUser(): any {
    try {
      const userData = sessionStorage.getItem('userPrimaryInfoRegData');
      return userData ? JSON.parse(userData) : { id: 1, username: 'system' };
    } catch (e) {
      return { id: 1, username: 'system' };
    }
  }

  viewEvent(event: QueueEvent): void {
    this.editingEvent = { ...event };
    this.isViewOnly = true;
    this.isEditOpen = true;
  }

  executePostToLedger(): void {
    if (!this.pendingActionData) return;

    const { event, mapping, createdBy } = this.pendingActionData;

    this.isProcessingPost = true; // Show loader

    // Reverting to Orchestration: This converts the raw Event into a full Ledger Transaction
    // The previous PUT failed with NotFoundException because the Transaction didn't exist yet.
    this.accountingService.orchestrateEventExecution(event as any, mapping, createdBy).subscribe({
      next: (res) => {
        // Mark as approved locally to trigger locking
        event.status = 'APPROVED';
        this.toastService.success(`Event ${event.reference} successfully orchestrated and posted to the General Ledger.`);

        const idx = this.events.findIndex(e => e.reference === event.reference);
        if (idx !== -1) {
          this.events[idx] = { ...event, status: 'APPROVED' };
        }

        this.pendingActionData = null;
        this.isProcessingPost = false;
        this.isConfirmOpen = false;
      },
      error: (err) => {
        const errorMsg = err?.error?.message || err?.message || 'Server error';
        this.toastService.error(`Orchestration failed for ${event.reference}: ${errorMsg}`);
        this.isProcessingPost = false;
        this.isConfirmOpen = false;
        this.pendingActionData = null;
      }
    });
  }

  cancelConfirm(): void {
    this.isConfirmOpen = false;
    this.pendingActionData = null;
  }

  rejectEvent(event: QueueEvent): void {
    // Replace the item in the array (immutable update) so Angular detects the change.
    const idx = this.events.findIndex(e => e.reference === event.reference);
    if (idx !== -1) {
      this.events[idx] = { ...this.events[idx], status: 'REJECTED' };
      this.events = [...this.events]; // new array reference triggers change detection
    }
    this.toastService.warn(`Event ${event.reference} has been rejected.`);
  }

  openEdit(event: QueueEvent): void {
    if (event.status === 'APPROVED' || event.status === 'POSTED') {
      this.toastService.warn('Approved transactions cannot be edited.');
      return;
    }
    this.editingEvent = { ...event };
    this.isViewOnly = false;
    this.isEditOpen = true;
  }

  saveEdit(): void {
    if (!this.editingEvent || !this.editingEvent.suggestedDebit || !this.editingEvent.suggestedCredit) {
      this.toastService.warn('Please ensure both debit and credit accounts are selected.');
      return;
    }

    const debitAcc = this.accounts.find(a => a.accountName === this.editingEvent!.suggestedDebit);
    const creditAcc = this.accounts.find(a => a.accountName === this.editingEvent!.suggestedCredit);

    if (!debitAcc || !creditAcc) {
      this.toastService.warn('Could not resolve selected accounts. Please try again.');
      return;
    }

    // 1. Update UI state for this event
    const syntheticMapping: AccountMappingDTO = {
      sourceModule: this.editingEvent.sourceModule,
      eventType: this.editingEvent.eventType,
      debitAccountId: debitAcc.id,
      creditAccountId: creditAcc.id,
      debitAccount: debitAcc,
      creditAccount: creditAcc
    } as AccountMappingDTO;

    const targetEvent = this.events.find(e => e.reference === this.editingEvent!.reference);
    if (targetEvent) {
      targetEvent.suggestedDebit = debitAcc.accountName;
      targetEvent.suggestedCredit = creditAcc.accountName;
      targetEvent.suggestedDebitId = debitAcc.id;
      targetEvent.suggestedCreditId = creditAcc.id;
      targetEvent.matchedMapping = syntheticMapping;
    }

    // 2. Persist to Backend Event Metadata
    const updatedMetadata = {
      ...(this.editingEvent.metadata || {}),
      suggestedDebitId: debitAcc.id,
      suggestedCreditId: creditAcc.id,
      suggestedDebitName: debitAcc.accountName,
      suggestedCreditName: creditAcc.accountName
    };

    if (this.editingEvent.id) {
      const fullEvent: Partial<AccountingEventDTO> = {
        id: this.editingEvent.id,
        sourceModule: this.editingEvent.sourceModule,
        eventType: this.editingEvent.eventType,
        amount: this.editingEvent.amount,
        currency: this.editingEvent.currency,
        reference: this.editingEvent.reference,
        description: this.editingEvent.description,
        transactionDate: this.editingEvent.transactionDate,
        metadata: updatedMetadata
      };

      this.accountingService.updateEvent(this.editingEvent.id, fullEvent).subscribe({
        next: () => {
          this.toastService.success('Mapping suggestions saved to backend.');
        },
        error: (err) => {
          console.error('Failed to persist mapping suggestion', err);
          this.toastService.warn('Suggestions updated locally but failed to save to backend.');
        }
      });
    }

    this.isEditOpen = false;
    this.editingEvent = null;
  }

  private updateLocalEventMapping(mapping: AccountMappingDTO): void {
    if (!this.editingEvent) return;

    // Resolve account names from the local accounts cache.
    // The backend often returns only IDs (not full objects), so we look them up locally.
    const debitName = mapping.debitAccount?.accountName
      || this.accounts.find(a => a.id === mapping.debitAccountId)?.accountName
      || mapping.debitAccountId?.toString();
    const creditName = mapping.creditAccount?.accountName
      || this.accounts.find(a => a.id === mapping.creditAccountId)?.accountName
      || mapping.creditAccountId?.toString();

    this.editingEvent.matchedMapping = {
      ...mapping,
      debitAccount: mapping.debitAccount || this.accounts.find(a => a.id === mapping.debitAccountId),
      creditAccount: mapping.creditAccount || this.accounts.find(a => a.id === mapping.creditAccountId),
    } as AccountMappingDTO;
    this.editingEvent.suggestedDebit = debitName;
    this.editingEvent.suggestedCredit = creditName;

    this.syncLocalState();
    this.isEditOpen = false;
  }

  private syncLocalState(): void {
    if (!this.editingEvent) return;
    const idx = this.events.findIndex(e => e.reference === this.editingEvent!.reference);
    if (idx !== -1) {
      this.events[idx] = { ...this.editingEvent };
    }
  }

  /** Resolve an AccountDTO from the display string "Code - Name" or just a plain name */
  private resolveAccountByName(nameOrLabel: string | undefined): AccountDTO | undefined {
    if (!nameOrLabel) return undefined;
    // Handles both "6001 - Salaries" and "Salaries" formats
    const bare = nameOrLabel.includes(' - ')
      ? nameOrLabel.split(' - ').slice(1).join(' - ').trim()
      : nameOrLabel.trim();
    return this.accounts.find(a => a.accountName === bare || a.accountName === nameOrLabel);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedType = '';
    this.selectedModule = '';
    this.selectedStatus = '';
    this.sortField = '';
    this.sortOrder = 1;
    this.toastService.info('Filters cleared');
  }

  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 1 ? -1 : 1;
    } else {
      this.sortField = field;
      this.sortOrder = 1;
    }
  }

  formatLabel(key: any): string {
    if (!key || typeof key !== 'string') return String(key || '');
    return key
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, str => str.toUpperCase())
      .trim();
  }

  getMetadataEntries(metadata: any): { key: string, value: any }[] {
    if (!metadata) return [];
    return Object.entries(metadata)
      .map(([key, value]) => ({ key, value }))
      .filter(item => item.value !== null && item.value !== undefined && item.value !== '');
  }

  isCurrencyField(key: any): boolean {
    if (!key || typeof key !== 'string') return false;
    const currencyKeys = ['amount', 'repayable', 'rate', 'interest', 'balance', 'bankBalance', 'approvedAmount', 'totalRepayable'];
    const lowerKey = key.toLowerCase();
    return currencyKeys.some(ck => lowerKey.includes(ck));
  }

  isDateField(key: any): boolean {
    if (!key || typeof key !== 'string') return false;
    const dateKeys = ['initiatedat', 'approveddate', 'createdat', 'updatedat', 'expecteddate', 'date'];
    const lowerKey = key.toLowerCase();
    return dateKeys.some(dk => lowerKey.includes(dk));
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'REJECTED': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'PROCESSING': return 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse';
      case 'UNPROCESSED': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  }

  getModuleBadge(module: string): string {
    const map: Record<string, string> = {
      POS: 'bg-blue-100 text-blue-800',
      HR: 'bg-purple-100 text-purple-800',
      HOSPITALITY: 'bg-indigo-100 text-indigo-800',
      BANK: 'bg-teal-100 text-teal-800',
      EXPENSE: 'bg-orange-100 text-orange-800',
      MANUAL: 'bg-gray-100 text-gray-700',
    };
    return map[module?.toUpperCase()] || 'bg-gray-100 text-gray-700';
  }

  get pendingCount(): number { return this.events.filter(e => e.status === 'UNPROCESSED').length; }
  get approvedCount(): number { return this.events.filter(e => e.status === 'APPROVED').length; }
  get rejectedCount(): number { return this.events.filter(e => e.status === 'REJECTED').length; }

  /**
   * Parse a date value that may be:
   *  - A Java date array: [year, month, day, hour, min, sec, nano]  (months are 1-based)
   *  - An ISO 8601 string: "2026-05-06T10:30:00"
   *  - A JS Date object
   *  - null / undefined
   * Returns a millisecond timestamp (0 if unparseable).
   */
  parseEventDate(value: any): number {
    if (!value) return 0;
    if (Array.isArray(value) && value.length >= 3) {
      // Java LocalDateTime array: [year, month(1-based), day, hour?, min?, sec?]
      return new Date(value[0], value[1] - 1, value[2], value[3] ?? 0, value[4] ?? 0, value[5] ?? 0).getTime();
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  /** Format a raw event date for display in the table. */
  formatEventDate(value: any): string {
    const ms = this.parseEventDate(value);
    if (!ms) return '—';
    const d = new Date(ms);
    const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${date} · ${time}`;
  }
}
