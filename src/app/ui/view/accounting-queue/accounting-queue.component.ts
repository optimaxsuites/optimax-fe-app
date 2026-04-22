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

  // Custom Confirmation Modal State
  isConfirmOpen = false;
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

  get filteredEvents(): QueueEvent[] {
    return this.events.filter(event => {
      const matchesSearch = !this.searchTerm || 
        (event.reference?.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (event.description?.toLowerCase().includes(this.searchTerm.toLowerCase()));
      
      const matchesType = !this.selectedType || event.eventType === this.selectedType;
      const matchesModule = !this.selectedModule || event.sourceModule === this.selectedModule;
      const matchesStatus = !this.selectedStatus || event.status === this.selectedStatus;
      
      return matchesSearch && matchesType && matchesModule && matchesStatus;
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
    // ── Irreversible Processing Check ──
    if (event.status === 'PROCESSING' || event.status === 'APPROVED') {
      this.toastService.warn('This event is already processed or being processed.');
      return;
    }

    // Build mapping from current account suggestions on the event, if they exist
    const debitAcc = this.resolveAccountByName(event.suggestedDebit);
    const creditAcc = this.resolveAccountByName(event.suggestedCredit);

    if (!debitAcc || !creditAcc) {
      this.toastService.error('Cannot approve: Please assign both Debit and Credit accounts first.');
      return;
    }

    // Build or use existing mapping
    const mapping: AccountMappingDTO = event.matchedMapping || {
      id: 0,
      sourceModule: event.sourceModule,
      eventType: event.eventType,
      debitAccount: debitAcc,
      creditAccount: creditAcc,
      debitAccountId: debitAcc.id,
      creditAccountId: creditAcc.id,
      createdAt: new Date().toISOString()
    };

    const userDataStr = sessionStorage.getItem('userPrimaryInfoRegData');
    if (!userDataStr) {
      this.toastService.error('Session error: User profile not found. Please log in again.');
      return;
    }

    const createdBy = JSON.parse(userDataStr);

    // ── Open Custom Confirmation Modal ──
    this.pendingActionData = { event, mapping, createdBy };
    this.isConfirmOpen = true;
  }

  executePostToLedger(): void {
    if (!this.pendingActionData) return;

    const { event, mapping, createdBy } = this.pendingActionData;
    
    event.status = 'PROCESSING';
    this.isConfirmOpen = false; // Close modal immediately to show status change in background

    this.accountingService.orchestrateEventExecution(event, mapping, createdBy).subscribe({
      next: (res) => {
        event.status = 'APPROVED';
        this.toastService.success(`Event ${event.reference} successfully posted to the General Ledger`);
        this.pendingActionData = null;
      },
      error: (err) => {
        event.status = 'UNPROCESSED';
        this.toastService.error(`Failed to process event ${event.reference}: ${err.message || 'Server error'}`);
        // Consider whether to reopen the modal or just let the user try again
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
    this.editingEvent = { ...event };
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
            this.editingEvent!.matchedMapping = updated;
            console.log('[Optimax Queue] Mapping updated:', updated);
          },
          error: (err) => {
            this.toastService.error('Failed to update mapping rule. Changes saved locally only.');
            console.error('[Optimax Queue] Mapping update error:', err);
          }
        });
      } else {
        // Create new rule
        this.accountingService.createAccountMapping(mappingPayload).subscribe({
          next: (created) => {
            this.toastService.success('New account mapping rule saved successfully');
            this.editingEvent!.matchedMapping = created;
            console.log('[Optimax Queue] Mapping created:', created);
          },
          error: (err) => {
            this.toastService.error('Failed to save mapping rule. Changes saved locally only.');
            console.error('[Optimax Queue] Mapping create error:', err);
          }
        });
      }
    } else {
      this.toastService.warn('Account mapping not saved — please select valid Debit and Credit accounts.');
    }

    // Always update local state
    const idx = this.events.findIndex(e => e.reference === this.editingEvent!.reference);
    if (idx !== -1) this.events[idx] = { ...this.editingEvent };
    this.isEditOpen = false;
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
