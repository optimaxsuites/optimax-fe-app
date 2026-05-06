import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AccountingService } from '../../../services/accounting.service';
import { ToastService } from '../../../services/toast.service';
import { AccountDTO, AccountMappingDTO, AccountingEventDTO, PaginationResult, SourceModule } from '../../domain/accounting.dto';

interface QueueEvent extends Partial<AccountingEventDTO> {
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
  suggestedDebit?: string;
  suggestedCredit?: string;
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
  ) {}

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
          .filter(ev => !txList.some(tx => tx.reference === ev.reference)) // Hide events already in transactions
          .map(event => {
            const mapping = this.mappings.find(m => 
              m.eventType === event.eventType && m.sourceModule === event.sourceModule
            );
            return {
              ...event,
              reference: event.reference || (event as any).instructionReference || `#EV-${event.id}`,
              status: (event as any).status || 'UNPROCESSED',
              matchedMapping: mapping,
              suggestedDebit: mapping?.debitAccount?.accountName || mapping?.debitAccountId?.toString() || '—',
              suggestedCredit: mapping?.creditAccount?.accountName || mapping?.creditAccountId?.toString() || '—',
              isTransaction: false
            } as QueueEvent;
          });

        // 3. Combine and sort (Newest first)
        this.events = [...txList, ...eventList].sort((a, b) => {
          const dateA = new Date(a['createdAt'] || a['transactionDate'] || 0).getTime();
          const dateB = new Date(b['createdAt'] || b['transactionDate'] || 0).getTime();
          return dateB - dateA;
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
    return this.events.filter(event => {
      const matchesSearch = !this.searchTerm || 
        (event.reference?.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (event.description?.toLowerCase().includes(this.searchTerm.toLowerCase()));
      
      const matchesModule = !this.selectedModule || event.sourceModule === this.selectedModule;
      const matchesStatus = !this.selectedStatus || event.status === this.selectedStatus;
      
      return matchesSearch && matchesModule && matchesStatus;
    });
  }

  formatLabel(val: string | undefined): string {
    if (!val) return '';
    return val.replace(/_/g, ' ');
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
    event.status = 'REJECTED';
    this.toastService.warn(`Event ${event.reference} rejected`);
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
    if (!this.editingEvent) return;

    const debitAcc  = this.resolveAccountByName(this.editingEvent.suggestedDebit);
    const creditAcc = this.resolveAccountByName(this.editingEvent.suggestedCredit);

    // Persist mapping rule to backend if we have valid accounts
    if (debitAcc && creditAcc) {
      const mappingPayload: Partial<AccountMappingDTO> = {
        sourceModule: this.editingEvent.sourceModule,
        eventType:    this.editingEvent.eventType,
        debitAccountId:  debitAcc.id,
        creditAccountId: creditAcc.id,
        description: `Auto-mapped: ${this.editingEvent.eventType} via Queue Manager`
      };

      const existingMapping = this.editingEvent.matchedMapping;

      if (existingMapping?.id) {
        // Update existing rule
        this.accountingService.updateAccountMapping(existingMapping.id, mappingPayload).subscribe({
          next: (updated) => {
            this.toastService.success('Account mapping rule updated successfully');
            this.updateLocalEventMapping(updated);
          },
          error: (err) => {
            this.toastService.error('Failed to update mapping rule.');
            console.error('[Optimax Queue] Mapping update error:', err);
          }
        });
      } else {
        // Create new rule
        this.accountingService.createAccountMapping(mappingPayload).subscribe({
          next: (created) => {
            this.toastService.success('New account mapping rule saved successfully');
            this.updateLocalEventMapping(created);
          },
          error: (err) => {
            this.toastService.error('Failed to save mapping rule.');
            console.error('[Optimax Queue] Mapping create error:', err);
          }
        });
      }
    } else {
      this.toastService.warn('Account mapping not saved — please select valid Debit and Credit accounts.');
      // Still update local state for the current session if requested, 
      // but usually we want to wait for backend success for mappings.
      this.syncLocalState();
    }
  }

  private updateLocalEventMapping(mapping: AccountMappingDTO): void {
    if (!this.editingEvent) return;
    
    this.editingEvent.matchedMapping = mapping;
    this.editingEvent.suggestedDebit = mapping.debitAccount?.accountName || mapping.debitAccountId?.toString();
    this.editingEvent.suggestedCredit = mapping.creditAccount?.accountName || mapping.creditAccountId?.toString();
    
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
    this.toastService.info('Filters cleared');
  }

  formatMetadataKey(key: string): string {
    if (!key) return '';
    // camelCase to Title Case
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  getMetadataEntries(metadata: any): { key: string, value: any }[] {
    if (!metadata) return [];
    return Object.entries(metadata)
      .map(([key, value]) => ({ key, value }))
      .filter(item => item.value !== null && item.value !== undefined && item.value !== '');
  }

  isCurrencyField(key: string): boolean {
    const currencyKeys = ['amount', 'repayable', 'rate', 'interest', 'balance', 'bankBalance', 'approvedAmount', 'totalRepayable'];
    const lowerKey = key.toLowerCase();
    return currencyKeys.some(ck => lowerKey.includes(ck));
  }

  isDateField(key: string): boolean {
    const dateKeys = ['initiatedat', 'approveddate', 'createdat', 'updatedat', 'expecteddate', 'date'];
    const lowerKey = key.toLowerCase();
    return dateKeys.some(dk => lowerKey.includes(dk));
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
