import { Component, OnInit } from '@angular/core';
import { AccountingService } from '../../../services/accounting.service';
import { ToastService } from '../../../services/toast.service';
import { 
  AccountingEventDTO, 
  AccountingTransactionDTO, 
  AccountMappingDTO,
  TransactionReviewStatus,
  MappingStatus,
  SourceModule,
  AccountDTO,
  PaginationResult,
  UserDTO
} from '../../domain/accounting.dto';
import { ConfirmationService } from 'primeng/api';
import { AuthenticationService } from '../../sharedComponent/service/auth-service/authentication.service';

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.scss']
})
export class TransactionsComponent implements OnInit {
  // Tabs
  activeTab: 'events' | 'transactions' | 'mappings' = 'events';

  // Enum exposure for template
  MappingStatus = MappingStatus;

  // Data
  events: AccountingEventDTO[] = [];
  transactions: AccountingTransactionDTO[] = [];
  mappings: AccountMappingDTO[] = [];
  accounts: AccountDTO[] = [];

  // State
  loading = false;
  totalRecords = 0;
  first = 0;
  rows = 10;

  // Transaction detail panel
  selectedTxDetail: AccountingTransactionDTO | null = null;
  isTxDetailOpen = false;

  // Modals
  isMappingModalOpen = false;
  newMapping: Partial<AccountMappingDTO> = {
    sourceModule: SourceModule.POS,
    eventType: ''
  };

  constructor(
    private accountingService: AccountingService,
    private toastService: ToastService,
    private confirmationService: ConfirmationService,
    private authService: AuthenticationService
  ) {}

  getCurrentUser(): UserDTO {
    try {
      const userData = sessionStorage.getItem('userPrimaryInfoRegData');
      return userData ? JSON.parse(userData) : { id: 1, username: 'system', email: 'system@optimax.com' };
    } catch (e) {
      return { id: 1, username: 'system', email: 'system@optimax.com' } as UserDTO;
    }
  }

  ngOnInit() {
    this.loadAccounts(); // Needed for Mapping dropdowns
    this.loadActiveTabData();
  }

  loadAccounts() {
    this.accountingService.getAccounts(0, 1000).subscribe((res: PaginationResult<AccountDTO>) => {
      this.accounts = res.content || [];
    });
  }

  loadActiveTabData() {
    this.loading = true;
    switch (this.activeTab) {
      case 'events':
        this.loadEvents();
        break;
      case 'transactions':
        this.loadTransactions();
        break;
      case 'mappings':
        this.loadMappings();
        break;
    }
  }

  setTab(tab: 'events' | 'transactions' | 'mappings') {
    this.activeTab = tab;
    this.first = 0;
    this.loadActiveTabData();
  }

  // ── Events & Orchestration ────────────────────────────
  loadEvents() {
    this.accountingService.getEvents(this.first / this.rows, this.rows).subscribe({
      next: (data: PaginationResult<AccountingEventDTO>) => {
        this.events = data.content || [];
        this.totalRecords = data.totalSize || 0;
        this.loading = false;
      },
      error: (err: any) => {
        this.toastService.error('Failed to load events');
        this.loading = false;
      }
    });
  }

  processEvent(event: AccountingEventDTO) {
    // 1. Find the mapping for this event type
    const mapping = this.mappings.find(m => m.eventType === event.eventType);
    
    if (!mapping) {
      this.toastService.warn(`No mapping found for ${event.eventType}. Please create one first.`);
      this.setTab('mappings');
      return;
    }

    this.confirmationService.confirm({
      message: `Running Master Flow: Create Transaction -> Journal -> Lines -> Ledger for this ${event.eventType} event. Proceed?`,
      header: 'Execute End-to-End Orchestration',
      icon: 'pi pi-bolt',
      accept: () => {
        this.loading = true;
        const currentUser = this.getCurrentUser();
        this.accountingService.orchestrateEventExecution(event, mapping, currentUser).subscribe({
          next: (res: any) => {
            this.toastService.success(`Pipeline success: Transaction ${res.transaction.transactionReference} and Journal ${res.journal.entryNumber} created.`);
            this.loadEvents();
          },
          error: (err: any) => {
            this.toastService.error('Orchestration failed midway. Check console for rollback requirements.');
            this.loading = false;
          }
        });
      }
    });
  }

  // ── Transactions ────────────────────────────────────
  loadTransactions() {
    this.accountingService.getTransactions(this.first / this.rows, this.rows).subscribe({
      next: (data: PaginationResult<AccountingTransactionDTO>) => {
        this.transactions = (data.content || []).map(tx => {
          const rawStatus = tx.status || tx.Status || (tx as any).reviewStatus;
          return {
            ...tx,
            date: tx.transactionDate as string | Date,
            reviewStatus: rawStatus || TransactionReviewStatus.UNREVIEWED,
            debitAmount: tx.amount,
            creditAmount: 0
          };
        });
        this.totalRecords = data.totalSize || 0;
        this.loading = false;
      },
      error: (err: any) => {
        this.toastService.error('Failed to load transactions');
        this.loading = false;
      }
    });
  }

  approveTransaction(tx: AccountingTransactionDTO) {
    this.loading = true;
    this.accountingService.approveTransaction(tx).subscribe({
      next: () => {
        this.toastService.success('Transaction approved and posted');
        this.loadTransactions();
      },
      error: () => {
        this.toastService.error('Failed to approve transaction');
        this.loading = false;
      }
    });
  }

  getApprovedTxCount(): number {
    return this.transactions.filter(tx => tx.reviewStatus === TransactionReviewStatus.APPROVED).length;
  }

  getUnreviewedTxCount(): number {
    return this.transactions.filter(tx => tx.reviewStatus === TransactionReviewStatus.UNREVIEWED).length;
  }

  // ── Transaction Detail Panel ─────────────────────────
  openTxDetail(tx: AccountingTransactionDTO): void {
    this.selectedTxDetail = tx;
    this.isTxDetailOpen = true;
  }

  closeTxDetail(): void {
    this.isTxDetailOpen = false;
    this.selectedTxDetail = null;
  }

  getTxMappedBy(tx: AccountingTransactionDTO): string {
    const mb = tx.mappedBy;
    if (mb && typeof mb === 'object') return mb.fullname || mb.username || '—';
    return tx.metadata?.mappedBy || '—';
  }

  getTxApprovedBy(tx: AccountingTransactionDTO): string {
    const ab = tx.approvedBy;
    if (ab && typeof ab === 'object') return ab.fullname || ab.username || '—';
    if (typeof ab === 'string') return ab as string;
    return tx.metadata?.approvedBy || '—';
  }

  getTxApprovalDate(tx: AccountingTransactionDTO): string {
    const d = tx.approvalDate || tx.metadata?.approvalDate || tx.metadata?.approvedAt;
    if (!d) return '—';
    return new Date(d as string).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getTxMappingId(tx: AccountingTransactionDTO): number | null {
    return tx.mapping?.id ?? tx.mappingMetadata?.id ?? tx.metadata?.mappingId ?? null;
  }

  // ── Mappings ────────────────────────────────────────
  loadMappings() {
    this.accountingService.getAccountMappings(this.first / this.rows, this.rows).subscribe({
      next: (data: PaginationResult<AccountMappingDTO>) => {
        this.mappings = data.content || [];
        this.totalRecords = data.totalSize || 0;
        this.loading = false;
      },
      error: (err: any) => {
        this.toastService.error('Failed to load mappings');
        this.loading = false;
      }
    });
  }

  openNewMapping() {
    this.newMapping = {
      sourceModule: SourceModule.POS,
      eventType: '',
      description: ''
    };
    this.isMappingModalOpen = true;
  }

  saveMapping() {
    if (!this.newMapping.eventType || !this.newMapping.debitAccountId || !this.newMapping.creditAccountId) {
      this.toastService.warn('Please fill all required mapping fields');
      return;
    }

    this.loading = true;
    const mappingToSave = {
      ...this.newMapping,
      createdBy: this.getCurrentUser()
    };
    
    this.accountingService.createAccountMapping(mappingToSave).subscribe({
      next: () => {
        this.toastService.success('New posting rule established');
        this.isMappingModalOpen = false;
        this.loadMappings();
      },
      error: () => {
        this.toastService.error('Failed to save mapping');
        this.loading = false;
      }
    });
  }

  deleteMapping(map: AccountMappingDTO) {
    this.confirmationService.confirm({
      message: `Delete accounting rule for ${map.eventType}?`,
      header: 'Delete Mapping',
      icon: 'pi pi-trash',
      accept: () => {
        this.loading = true;
        this.accountingService.deleteAccountMapping(map.id).subscribe({
          next: () => {
            this.toastService.success('Rule retired');
            this.loadMappings();
          },
          error: () => {
            this.toastService.error('Failed to delete mapping');
            this.loading = false;
          }
        });
      }
    });
  }

  approveMapping(mappingId: number): void {
    this.loading = true;
    this.accountingService.approveMapping(mappingId).subscribe({
      next: () => {
        this.toastService.success('Mapping approved. Transaction created and ready for disbursement.');
        this.loadMappings();
        this.loadTransactions();
      },
      error: () => {
        this.toastService.error('Failed to approve mapping');
        this.loading = false;
      }
    });
  }

  rejectMapping(mappingId: number): void {
    this.loading = true;
    this.accountingService.rejectMapping(mappingId).subscribe({
      next: () => {
        this.toastService.success('Mapping rejected.');
        this.loadMappings();
      },
      error: () => {
        this.toastService.error('Failed to reject mapping');
        this.loading = false;
      }
    });
  }

  // ── Helpers ─────────────────────────────────────────
  onPageChange(event: any) {
    this.first = event.first;
    this.rows = event.rows;
    this.loadActiveTabData();
  }

  getSourceBadge(source: SourceModule): string {
    switch (source) {
      case SourceModule.POS: return 'bg-blue-100 text-blue-800';
      case SourceModule.HOSPITALITY: return 'bg-indigo-100 text-indigo-800';
      case SourceModule.HR: return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusBadge(status: TransactionReviewStatus | undefined): string {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status) {
      case TransactionReviewStatus.APPROVED: return 'bg-emerald-100 text-emerald-800';
      case TransactionReviewStatus.UNREVIEWED: return 'bg-amber-100 text-amber-800';
      case TransactionReviewStatus.REJECTED: return 'bg-rose-100 text-rose-800';
      case TransactionReviewStatus.DISBURSED: return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}
