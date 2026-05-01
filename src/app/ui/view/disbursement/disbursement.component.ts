// disbursement.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, of, from, Subject } from 'rxjs';
import { catchError, finalize, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

// ============================================================================
// DOMAIN MODELS (matching your backend)
// ============================================================================
export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  currency: string;
  balance: number;
  isVerified: boolean;
}

export interface FundingSource {
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
  type: 'OPERATING' | 'SETTLEMENT' | 'RESERVE';
  availableBalance: number;
  ledgerBalance: number;
  currency: string;
}

export interface Recipient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  currency: string;
}

export interface DisbursementBatch {
  id: string;
  batchReference: string;
  sourceModule: 'HR' | 'HOSPITALITY' | 'EXPENSE' | 'MARKETPLACE';
  totalAmount: number;
  currency: string;
  transactionCount: number;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
  createdAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  disbursedAt?: Date;
  metadata?: any;
}

export interface DisbursementTransaction {
  id: string;
  batchId: string;
  transactionReference: string;
  recipient: Recipient;
  amount: number;
  fee: number;
  totalAmount: number;
  currency?: string;
  narration: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'RETRYING';
  statusMessage?: string;
  retryCount: number;
  createdAt: Date;
  processedAt?: Date;
  paystackReference?: string;
  paystackTransferCode?: string;
}

export interface PaystackTransferResponse {
  status: boolean;
  message: string;
  data: {
    amount: number;
    currency: string;
    domain: string;
    id: number;
    reason: string;
    reference: string;
    source: string;
    source_details: any;
    status: 'pending' | 'success' | 'failed';
    transfer_code: string;
    titan_code: string;
    transferred_at: string | null;
    recipient: {
      active: boolean;
      currency: string;
      description: string;
      domain: string;
      email: string | null;
      id: number;
      name: string;
      recipient_code: string;
      type: string;
      metadata: any;
    };
  };
}

export interface PaystackRecipientResponse {
  status: boolean;
  message: string;
  data: {
    active: boolean;
    createdAt: string;
    currency: string;
    domain: string;
    id: number;
    integration: number;
    name: string;
    recipient_code: string;
    type: string;
    updatedAt: string;
    details: {
      account_number: string;
      account_name: string;
      bank_code: string;
      bank_name: string;
    };
  };
}

@Component({
  selector: 'app-disbursement',
  templateUrl: './disbursement.component.html',
  styleUrls: ['./disbursement.component.scss']
})
export class DisbursementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // State Management
  isLoading = false;
  isProcessing = false;
  errorMessage: string | null = null;
  
  // View Mode
  viewMode: string = 'DASHBOARD';
  
  // Styling properties
  customBlue = '#2E6276';
  customBlueHover = '#245061';
  customGreen = '#2EB270';
  
  // Data
  allBatches: DisbursementBatch[] = [];
  filteredBatches: DisbursementBatch[] = [];
  selectedBatch: DisbursementBatch | null = null;
  batchTransactions: DisbursementTransaction[] = [];
  fundingSources: FundingSource[] = [];
  
  // Filters
  activeStatusFilter: string = 'ALL';
  selectedModule: string = '';
  dateRangeStart: Date | null = null;
  dateRangeEnd: Date | null = null;
  
  // Multi-select for batch operations
  selectedBatchIds: Set<string> = new Set();
  masterCheckbox = false;
  
  // Checkout state
  checkoutForm: FormGroup;
  selectedFundingSourceId: string | null = null;
  processingProgress: { current: number; total: number; status: string } | null = null;
  failedTransactions: DisbursementTransaction[] = [];
  
  // Execution monitoring
  pollingInterval: any = null;
  
  // Paystack config (should come from environment)
  private paystackSecretKey = 'your_paystack_secret_key';
  
  constructor(
    private fb: FormBuilder,
    private http: HttpClient
  ) {
    this.checkoutForm = this.fb.group({
      batchId: [{ value: '', disabled: true }],
      totalAmount: [{ value: 0, disabled: true }],
      transactionCount: [{ value: 0, disabled: true }],
      fundingSourceId: ['', Validators.required],
      batchNarration: ['', [Validators.required, Validators.maxLength(200)]],
      reviewNotes: ['']
    });
  }
  
  ngOnInit(): void {
    this.loadBatches();
    this.loadFundingSources();
  }
  
  ngOnDestroy(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  // ==========================================================================
  // DATA LOADING
  // ==========================================================================
  
  loadBatches(): void {
    this.isLoading = true;
    // Simulate API call - replace with actual service
    setTimeout(() => {
      this.allBatches = this.generateMockBatches();
      this.filteredBatches = [...this.allBatches];
      this.isLoading = false;
    }, 500);
  }
  
  loadFundingSources(): void {
    // Simulate API call
    setTimeout(() => {
      this.fundingSources = this.generateMockFundingSources();
    }, 300);
  }
  
  loadBatchTransactions(batchId: string): void {
    this.isLoading = true;
    // Simulate API call
    setTimeout(() => {
      this.batchTransactions = this.generateMockTransactions(batchId);
      this.isLoading = false;
    }, 500);
  }
  
  // ==========================================================================
  // BATCH OPERATIONS
  // ==========================================================================
  
  openBatchForReview(batch: DisbursementBatch): void {
    this.selectedBatch = batch;
    this.loadBatchTransactions(batch.id);
    this.viewMode = 'BATCH_REVIEW';
  }
  
  approveBatch(batch: DisbursementBatch): void {
    this.isProcessing = true;
    // Simulate approval API call
    setTimeout(() => {
      batch.status = 'APPROVED';
      batch.approvedBy = 'Current User';
      batch.approvedAt = new Date();
      this.isProcessing = false;
      this.updateBatchInList(batch);
    }, 800);
  }
  
  rejectBatch(batch: DisbursementBatch, reason: string): void {
    this.isProcessing = true;
    // Simulate rejection
    setTimeout(() => {
      batch.status = 'FAILED';
      batch.metadata = { ...batch.metadata, rejectionReason: reason, rejectedAt: new Date() };
      this.isProcessing = false;
      this.updateBatchInList(batch);
    }, 500);
  }
  
  private updateBatchInList(updatedBatch: DisbursementBatch): void {
    const index = this.allBatches.findIndex(b => b.id === updatedBatch.id);
    if (index !== -1) {
      this.allBatches[index] = updatedBatch;
    }
    this.filterBatches();
  }
  
  // ==========================================================================
  // CHECKOUT / SETTLEMENT
  // ==========================================================================
  
  initiateCheckout(batch: DisbursementBatch): void {
    this.selectedBatch = batch;
    this.checkoutForm.patchValue({
      batchId: batch.batchReference,
      totalAmount: batch.totalAmount,
      transactionCount: batch.transactionCount
    });
    this.viewMode = 'CHECKOUT';
  }
  
  executePayout(): void {
    if (this.checkoutForm.invalid || !this.selectedFundingSourceId) {
      this.errorMessage = 'Please select a funding source and fill all required fields';
      return;
    }
    
    this.isProcessing = true;
    this.errorMessage = null;
    this.processingProgress = { current: 0, total: this.batchTransactions.length, status: 'Initializing...' };
    this.failedTransactions = [];
    
    const batchNarration = this.checkoutForm.get('batchNarration')?.value;
    const fundingSource = this.fundingSources.find(f => f.id === this.selectedFundingSourceId);
    
    // Update batch status to PROCESSING
    if (this.selectedBatch) {
      this.selectedBatch.status = 'PROCESSING';
    }
    
    // Process each transaction sequentially with Paystack
    this.processTransactionsSequentially(0, batchNarration, fundingSource);
  }
  
  private processTransactionsSequentially(
    index: number, 
    batchNarration: string, 
    fundingSource: FundingSource | undefined
  ): void {
    if (index >= this.batchTransactions.length) {
      // All transactions processed
      this.finalizeBatchProcessing();
      return;
    }
    
    const transaction = this.batchTransactions[index];
    transaction.status = 'PROCESSING';
    this.processingProgress = {
      current: index + 1,
      total: this.batchTransactions.length,
      status: `Processing ${transaction.recipient.accountName} - ${transaction.amount} ${transaction.currency}`
    };
    
    this.processSinglePayout(transaction, batchNarration, fundingSource).subscribe({
      next: (response) => {
        transaction.status = 'SUCCESS';
        transaction.processedAt = new Date();
        transaction.paystackReference = response.data.reference;
        transaction.paystackTransferCode = response.data.transfer_code;
        this.processTransactionsSequentially(index + 1, batchNarration, fundingSource);
      },
      error: (error) => {
        console.error(`Failed to process transaction ${transaction.transactionReference}:`, error);
        transaction.status = 'FAILED';
        transaction.statusMessage = error.message || 'Payout failed. Please check recipient details.';
        this.failedTransactions.push(transaction);
        this.processTransactionsSequentially(index + 1, batchNarration, fundingSource);
      }
    });
  }
  
  private processSinglePayout(
    transaction: DisbursementTransaction,
    narration: string,
    fundingSource: FundingSource | undefined
  ) {
    // Step 1: Create or get Paystack recipient
    return this.createPaystackRecipient(transaction.recipient).pipe(
      switchMap(recipientResponse => {
        // Step 2: Initiate transfer
        return this.initiatePaystackTransfer(transaction, recipientResponse.data.recipient_code, narration);
      }),
      catchError(error => {
        console.error('Paystack API error:', error);
        throw error;
      })
    );
  }
  
  private createPaystackRecipient(recipient: Recipient) {
    const payload = {
      type: 'nuban',
      name: recipient.name,
      account_number: recipient.accountNumber,
      bank_code: recipient.bankCode,
      currency: recipient.currency
    };
    
    return this.http.post<PaystackRecipientResponse>(
      'https://api.paystack.co/transferrecipient',
      payload,
      { headers: { Authorization: `Bearer ${this.paystackSecretKey}` } }
    );
  }
  
  private initiatePaystackTransfer(
    transaction: DisbursementTransaction,
    recipientCode: string,
    narration: string
  ) {
    const payload = {
      source: 'balance',
      amount: Math.round(transaction.totalAmount * 100), // Paystack expects kobo
      recipient: recipientCode,
      reason: narration || transaction.narration,
      currency: transaction.currency,
      reference: `TXP_${transaction.transactionReference}_${Date.now()}`
    };
    
    return this.http.post<PaystackTransferResponse>(
      'https://api.paystack.co/transfer',
      payload,
      { headers: { Authorization: `Bearer ${this.paystackSecretKey}` } }
    );
  }
  
  private finalizeBatchProcessing(): void {
    const hasFailures = this.failedTransactions.length > 0;
    const allSuccess = this.failedTransactions.length === 0;
    
    if (this.selectedBatch) {
      if (allSuccess) {
        this.selectedBatch.status = 'COMPLETED';
        this.selectedBatch.disbursedAt = new Date();
      } else if (hasFailures) {
        this.selectedBatch.status = 'PARTIAL';
        this.selectedBatch.metadata = {
          ...this.selectedBatch.metadata,
          failedCount: this.failedTransactions.length,
          failedReferences: this.failedTransactions.map(t => t.transactionReference)
        };
      }
      
      // Update batch in the list
      this.updateBatchInList(this.selectedBatch);
    }
    
    this.isProcessing = false;
    this.processingProgress = null;
    
    if (hasFailures) {
      this.errorMessage = `${this.failedTransactions.length} transaction(s) failed. You can retry them individually.`;
    } else {
      this.viewMode = 'EXECUTION';
      // Start polling for successful transfers to confirm final status
      this.startPollingForConfirmation();
    }
  }
  
  // ==========================================================================
  // RETRY FAILED TRANSACTIONS
  // ==========================================================================
  
  retryTransaction(transaction: DisbursementTransaction): void {
    transaction.status = 'RETRYING';
    transaction.retryCount++;
    
    const fundingSource = this.fundingSources.find(f => f.id === this.selectedFundingSourceId);
    
    this.processSinglePayout(transaction, this.checkoutForm.get('batchNarration')?.value, fundingSource).subscribe({
      next: (response) => {
        transaction.status = 'SUCCESS';
        transaction.processedAt = new Date();
        transaction.statusMessage = undefined;
        transaction.paystackReference = response.data.reference;
        
        // Remove from failed list if present
        const failedIndex = this.failedTransactions.findIndex(t => t.id === transaction.id);
        if (failedIndex !== -1) {
          this.failedTransactions.splice(failedIndex, 1);
        }
        
        // If no more failures, mark batch as COMPLETED
        if (this.failedTransactions.length === 0 && this.selectedBatch) {
          this.selectedBatch.status = 'COMPLETED';
          this.selectedBatch.disbursedAt = new Date();
          this.updateBatchInList(this.selectedBatch);
          this.viewMode = 'EXECUTION';
        }
      },
      error: (error) => {
        transaction.status = 'FAILED';
        transaction.statusMessage = error.message || 'Retry failed. Please check recipient details.';
      }
    });
  }
  
  retryAllFailed(): void {
    if (this.failedTransactions.length === 0) return;
    
    const transactionsToRetry = [...this.failedTransactions];
    this.failedTransactions = [];
    
    this.isProcessing = true;
    this.processingProgress = { current: 0, total: transactionsToRetry.length, status: 'Retrying failed transactions...' };
    
    this.retryTransactionsSequentially(transactionsToRetry, 0);
  }
  
  private retryTransactionsSequentially(transactions: DisbursementTransaction[], index: number): void {
    if (index >= transactions.length) {
      this.isProcessing = false;
      this.processingProgress = null;
      return;
    }
    
    const transaction = transactions[index];
    transaction.status = 'RETRYING';
    this.processingProgress = {
      current: index + 1,
      total: transactions.length,
      status: `Retrying ${transaction.recipient.accountName}...`
    };
    
    const fundingSource = this.fundingSources.find(f => f.id === this.selectedFundingSourceId);
    
    this.processSinglePayout(transaction, this.checkoutForm.get('batchNarration')?.value, fundingSource).subscribe({
      next: (response) => {
        transaction.status = 'SUCCESS';
        transaction.processedAt = new Date();
        transaction.statusMessage = undefined;
        this.retryTransactionsSequentially(transactions, index + 1);
      },
      error: (error) => {
        transaction.status = 'FAILED';
        transaction.statusMessage = error.message || 'Retry failed.';
        this.failedTransactions.push(transaction);
        this.retryTransactionsSequentially(transactions, index + 1);
      }
    });
  }
  
  // ==========================================================================
  // EXECUTION MONITORING
  // ==========================================================================
  
  private startPollingForConfirmation(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    this.pollingInterval = setInterval(() => {
      if (this.selectedBatch && this.selectedBatch.id) {
        this.checkTransferStatus(this.selectedBatch.id);
      }
    }, 5000); // Poll every 5 seconds
    
    // Stop polling after 2 minutes
    setTimeout(() => {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
    }, 120000);
  }
  
  private checkTransferStatus(batchId: string): void {
    // Simulate status check - replace with actual API call
    // This would call Paystack's verify transfer endpoint
    console.log(`Checking status for batch ${batchId}`);
  }
  
  // ==========================================================================
  // FILTERING & UI HELPERS
  // ==========================================================================
  
  filterBatches(): void {
    let filtered = [...this.allBatches];
    
    if (this.activeStatusFilter !== 'ALL') {
      filtered = filtered.filter(b => b.status === this.activeStatusFilter);
    }
    
    if (this.selectedModule) {
      filtered = filtered.filter(b => b.sourceModule === this.selectedModule);
    }
    
    if (this.dateRangeStart) {
      filtered = filtered.filter(b => new Date(b.createdAt) >= this.dateRangeStart!);
    }
    
    if (this.dateRangeEnd) {
      filtered = filtered.filter(b => new Date(b.createdAt) <= this.dateRangeEnd!);
    }
    
    this.filteredBatches = filtered;
    this.updateSelectAllCheckbox();
  }
  
  setStatusFilter(status: string): void {
    this.activeStatusFilter = this.activeStatusFilter === status ? 'ALL' : status;
    this.filterBatches();
  }
  
  toggleBatchSelection(batchId: string): void {
    if (this.selectedBatchIds.has(batchId)) {
      this.selectedBatchIds.delete(batchId);
    } else {
      this.selectedBatchIds.add(batchId);
    }
    this.updateSelectAllCheckbox();
  }
  
  toggleSelectAll(): void {
    if (this.masterCheckbox) {
      this.selectedBatchIds.clear();
      this.masterCheckbox = false;
    } else {
      this.filteredBatches.forEach(b => this.selectedBatchIds.add(b.id));
      this.masterCheckbox = true;
    }
  }
  
  private updateSelectAllCheckbox(): void {
    this.masterCheckbox = this.filteredBatches.length > 0 && 
      this.filteredBatches.every(b => this.selectedBatchIds.has(b.id));
  }
  
  getSelectedBatchesCount(): number {
    return this.selectedBatchIds.size;
  }
  
  getSelectedBatchesTotal(): number {
    return this.allBatches
      .filter(b => this.selectedBatchIds.has(b.id))
      .reduce((sum, b) => sum + b.totalAmount, 0);
  }
  
  getSelectedBatches(): DisbursementBatch[] {
    return this.allBatches.filter(b => this.selectedBatchIds.has(b.id));
  }
  
  // ==========================================================================
  // STATISTICS
  // ==========================================================================
  
  getTotalDisbursedToday(): number {
    const today = new Date().toDateString();
    return this.allBatches
      .filter(b => b.status === 'COMPLETED' && new Date(b.disbursedAt!).toDateString() === today)
      .reduce((sum, b) => sum + b.totalAmount, 0);
  }
  
  getPendingCount(): number {
    return this.allBatches.filter(b => b.status === 'PENDING_APPROVAL' || b.status === 'APPROVED').length;
  }
  
  getApprovedCount(): number {
    return this.allBatches.filter(b => b.status === 'APPROVED').length;
  }
  
  getFailedCount(): number {
    return this.allBatches.filter(b => b.status === 'FAILED').length;
  }
  
  getProcessingCount(): number {
    return this.allBatches.filter(b => b.status === 'PROCESSING').length;
  }
  
  // ==========================================================================
  // NAVIGATION
  // ==========================================================================
  
  backToDashboard(): void {
    this.viewMode = 'DASHBOARD';
    this.selectedBatch = null;
    this.batchTransactions = [];
    this.selectedBatchIds.clear();
    this.masterCheckbox = false;
    this.processingProgress = null;
    this.failedTransactions = [];
    this.errorMessage = null;
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
  
  closeBatchReview(): void {
    this.viewMode = 'DASHBOARD';
    this.selectedBatch = null;
  }
  
  goToCheckoutFromReview(): void {
    if (this.selectedBatch) {
      this.initiateCheckout(this.selectedBatch);
    }
  }
  
  // ==========================================================================
  // STATUS STYLES
  // ==========================================================================
  
  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      'DRAFT': 'bg-gray-100 text-gray-600 border-gray-200',
      'PENDING_APPROVAL': 'bg-amber-50 text-amber-600 border-amber-200',
      'APPROVED': 'bg-emerald-50 text-customGreen border-emerald-200',
      'PROCESSING': 'bg-blue-50 text-customBlue border-blue-200',
      'COMPLETED': 'bg-emerald-100 text-emerald-700 border-emerald-300',
      'FAILED': 'bg-red-50 text-red-600 border-red-200',
      'PARTIAL': 'bg-orange-50 text-orange-600 border-orange-200'
    };
    return classes[status] || 'bg-gray-50 text-gray-500 border-gray-200';
  }
  
  getTransactionStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'PENDING': 'bg-amber-50 text-amber-600 border-amber-200',
      'PROCESSING': 'bg-blue-50 text-customBlue border-blue-200',
      'SUCCESS': 'bg-emerald-50 text-customGreen border-emerald-200',
      'FAILED': 'bg-red-50 text-red-600 border-red-200',
      'RETRYING': 'bg-purple-50 text-purple-600 border-purple-200'
    };
    return classes[status] || 'bg-gray-50 text-gray-500 border-gray-200';
  }
  
  getModuleIcon(module: string): string {
    const icons: Record<string, string> = {
      'HR': 'fa-users',
      'HOSPITALITY': 'fa-hotel',
      'EXPENSE': 'fa-receipt',
      'MARKETPLACE': 'fa-store'
    };
    return icons[module] || 'fa-layer-group';
  }
  
  // ==========================================================================
  // MOCK DATA GENERATORS (Replace with actual API calls)
  // ==========================================================================
  
  private generateMockBatches(): DisbursementBatch[] {
    return [
      {
        id: '1',
        batchReference: 'BATCH-HR-2024-001',
        sourceModule: 'HR',
        totalAmount: 2450000,
        currency: 'NGN',
        transactionCount: 28,
        status: 'COMPLETED',
        createdAt: new Date(),
        disbursedAt: new Date()
      },
      {
        id: '2',
        batchReference: 'BATCH-EXP-2024-015',
        sourceModule: 'EXPENSE',
        totalAmount: 675000,
        currency: 'NGN',
        transactionCount: 12,
        status: 'APPROVED',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        approvedBy: 'Finance Manager',
        approvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        id: '3',
        batchReference: 'BATCH-HSP-2024-008',
        sourceModule: 'HOSPITALITY',
        totalAmount: 189000,
        currency: 'NGN',
        transactionCount: 6,
        status: 'PROCESSING',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        id: '4',
        batchReference: 'BATCH-MKT-2024-042',
        sourceModule: 'MARKETPLACE',
        totalAmount: 3450000,
        currency: 'NGN',
        transactionCount: 45,
        status: 'PENDING_APPROVAL',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        id: '5',
        batchReference: 'BATCH-HR-2024-003',
        sourceModule: 'HR',
        totalAmount: 1200000,
        currency: 'NGN',
        transactionCount: 8,
        status: 'FAILED',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        metadata: { failureReason: 'Insufficient funds in settlement account' }
      }
    ];
  }
  
  private generateMockFundingSources(): FundingSource[] {
    return [
      {
        id: 'fs1',
        name: 'Operating Account - GTBank',
        bankName: 'Guaranty Trust Bank',
        accountNumber: '0123456789',
        type: 'OPERATING',
        availableBalance: 12500000,
        ledgerBalance: 12500000,
        currency: 'NGN'
      },
      {
        id: 'fs2',
        name: 'Settlement Account - Zenith',
        bankName: 'Zenith Bank',
        accountNumber: '9876543210',
        type: 'SETTLEMENT',
        availableBalance: 8500000,
        ledgerBalance: 8500000,
        currency: 'NGN'
      },
      {
        id: 'fs3',
        name: 'Reserve Account - First Bank',
        bankName: 'First Bank of Nigeria',
        accountNumber: '4567890123',
        type: 'RESERVE',
        availableBalance: 5000000,
        ledgerBalance: 5000000,
        currency: 'NGN'
      }
    ];
  }
  
  private generateMockTransactions(batchId: string): DisbursementTransaction[] {
    return [
      {
        id: 'tx1',
        batchId: batchId,
        transactionReference: `TXP-${batchId}-001`,
        recipient: {
          id: 'rec1',
          name: 'John Oluwaseun',
          email: 'john.oluwaseun@example.com',
          bankCode: '058',
          bankName: 'Guaranty Trust Bank',
          accountNumber: '0123456789',
          accountName: 'John Oluwaseun',
          currency: 'NGN'
        },
        amount: 150000,
        fee: 0,
        totalAmount: 150000,
        narration: 'Salary payment - October 2024',
        status: 'PENDING',
        retryCount: 0,
        createdAt: new Date()
      },
      {
        id: 'tx2',
        batchId: batchId,
        transactionReference: `TXP-${batchId}-002`,
        recipient: {
          id: 'rec2',
          name: 'Adebayo Ventures',
          email: 'accounts@adebayoventures.com',
          bankCode: '057',
          bankName: 'Zenith Bank',
          accountNumber: '9876543210',
          accountName: 'Adebayo Ventures',
          currency: 'NGN'
        },
        amount: 350000,
        fee: 0,
        totalAmount: 350000,
        narration: 'Vendor payment - Office supplies',
        status: 'PENDING',
        retryCount: 0,
        createdAt: new Date()
      },
      {
        id: 'tx3',
        batchId: batchId,
        transactionReference: `TXP-${batchId}-003`,
        recipient: {
          id: 'rec3',
          name: 'Peace Hospitality Ltd',
          email: 'finance@peacehospitality.com',
          bankCode: '011',
          bankName: 'First Bank',
          accountNumber: '4567890123',
          accountName: 'Peace Hospitality Ltd',
          currency: 'NGN'
        },
        amount: 89500,
        fee: 0,
        totalAmount: 89500,
        narration: 'Hotel service settlement',
        status: 'PENDING',
        retryCount: 0,
        createdAt: new Date()
      }
    ];
  }
}