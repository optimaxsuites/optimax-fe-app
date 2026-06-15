import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DisbursementService } from '../../../../services/disbursement.service';
import { AccountingTransactionDTO } from '../../../domain/accounting.dto';

// ─── Mock Types ─────────────────────────────────────────────────────────────

export type PaymentMethod = 'paystack' | 'sterling' | 'zenith' | 'cash' | null;
export type FlowScreen = 'tray' | 'detail' | 'pay' | 'confirm' | 'ledger';

export interface DisbursementRequest {
  id: string;
  employee: string;
  department: string;
  loanType: string;
  amount: number;
  submitted: string;
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  reason: string;
  accountNumber: string;
  bankName: string;
  journalRef: string;
}

export interface LedgerEntry {
  date: string;
  reference: string;
  debit: number | null;
  credit: number | null;
  balance: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-disbursement-flow',
  templateUrl: './disbursement-flow.component.html',
  styleUrls: ['./disbursement-flow.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class DisbursementFlowComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  isLoading = true;

  constructor(private disbursementService: DisbursementService) {}

  // ── Navigation ───────────────────────────────────────────────
  screen: FlowScreen = 'tray';

  readonly steps: { key: FlowScreen; label: string }[] = [
    { key: 'detail',  label: 'Review'  },
    { key: 'pay',     label: 'Pay'     },
    { key: 'confirm', label: 'Confirm' },
    { key: 'ledger',  label: 'Ledger'  },
  ];

  getStepState(key: FlowScreen): 'done' | 'active' | 'idle' {
    const order: FlowScreen[] = ['tray', 'detail', 'pay', 'confirm', 'ledger'];
    const current = order.indexOf(this.screen);
    const target  = order.indexOf(key);
    if (target < current) return 'done';
    if (target === current) return 'active';
    return 'idle';
  }

  // ── Requests Data ────────────────────────────────────────────
  requests: DisbursementRequest[] = [];

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.isLoading = true;
    this.disbursementService.getApprovedTransactions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.requests = (res.content || []).map(trx => this.mapToRequest(trx));
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load transactions for flow', err);
          this.isLoading = false;
        }
      });
  }

  private mapToRequest(trx: AccountingTransactionDTO): DisbursementRequest {
    const meta = trx.metadata || trx.accountingEvent?.metadata || {};
    
    // Fallback names
    const employeeName = meta.recipientName || meta.accountName || meta.employeeName || meta.beneficiaryName || '—';
    const bankName = meta.bankName || meta.bank || '—';
    const accountNumber = meta.accountNumber || meta.account || '—';

    // Format date properly
    let dateStr = '—';
    if (trx.transactionDate) {
      if (Array.isArray(trx.transactionDate)) {
        dateStr = new Date(trx.transactionDate[0], trx.transactionDate[1] - 1, trx.transactionDate[2]).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric'
        });
      } else {
        dateStr = new Date(trx.transactionDate).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric'
        });
      }
    }

    return {
      id: trx.transactionReference || `TX-${trx.id}`,
      employee: employeeName,
      department: trx.sourceModule || '—',
      loanType: trx.description || 'Disbursement',
      amount: trx.amount || 0,
      submitted: dateStr,
      status: 'pending', // Freshly fetched approved transactions start as pending here
      reason: trx.description || '—',
      accountNumber: accountNumber,
      bankName: bankName,
      journalRef: `JE-NEW-${trx.id}`,
    };
  }

  selectedRequest: DisbursementRequest | null = null;

  // ── Payment State ────────────────────────────────────────────
  selectedMethod: PaymentMethod = null;
  proofUploaded = false;

  readonly paymentMethods = [
    { id: 'paystack', label: 'Paystack', sub: 'Automated · Instant',  icon: 'fa-bolt' },
    { id: 'sterling', label: 'Sterling Bank', sub: 'Manual transfer', icon: 'fa-building-columns' },
    { id: 'zenith',   label: 'Zenith Bank',   sub: 'Manual transfer', icon: 'fa-building-columns' },
    { id: 'cash',     label: 'Cash',          sub: 'Physical payment', icon: 'fa-money-bill-wave' },
  ] as const;

  // ── Ledger State ─────────────────────────────────────────────
  openingBalance = 1_200_000;
  ledgerHistory: LedgerEntry[] = [
    { date: '01 Jun', reference: 'Opening', debit: null, credit: null, balance: 1_200_000 },
    { date: '03 Jun', reference: 'JE-2026-0044', debit: 300_000, credit: null, balance: 1_500_000 },
  ];

  get closingBalance(): number {
    const amount = this.selectedRequest?.amount ?? 0;
    return this.openingBalance + (this.ledgerHistory.length > 1
      ? this.ledgerHistory[this.ledgerHistory.length - 1].balance - this.openingBalance
      : 0) + amount;
  }

  get creditAccountLabel(): string {
    const m = this.selectedMethod;
    if (m === 'paystack') return '1000 – Cash / Bank (Paystack)';
    if (m === 'sterling') return '1000 – Sterling Bank Account';
    if (m === 'zenith')   return '1000 – Zenith Bank Account';
    if (m === 'cash')     return '1001 – Cash on Hand';
    return '1000 – Cash / Bank';
  }

  get paymentMethodLabel(): string {
    const m = this.selectedMethod;
    if (m === 'paystack') return 'Paystack (automated)';
    if (m === 'sterling') return 'Sterling Bank Transfer';
    if (m === 'zenith')   return 'Zenith Bank Transfer';
    if (m === 'cash')     return 'Cash Payment';
    return '—';
  }

  // ── Actions ──────────────────────────────────────────────────
  openRequest(req: DisbursementRequest): void {
    if (req.status === 'processing') return;
    this.selectedRequest = req;
    this.screen = 'detail';
  }

  approveRequest(): void {
    if (this.selectedRequest) this.selectedRequest.status = 'approved';
    this.screen = 'pay';
  }

  rejectRequest(): void {
    if (this.selectedRequest) this.selectedRequest.status = 'rejected';
    this.selectedRequest = null;
    this.screen = 'tray';
  }

  selectMethod(m: PaymentMethod): void {
    this.selectedMethod = m;
  }

  sendPayment(): void {
    if (!this.selectedMethod) return;
    this.screen = 'confirm';
  }

  confirmPayment(): void {
    this.screen = 'ledger';
    // push new ledger entry
    const last = this.ledgerHistory[this.ledgerHistory.length - 1];
    const newBalance = (last?.balance ?? this.openingBalance) + (this.selectedRequest?.amount ?? 0);
    this.ledgerHistory = [
      ...this.ledgerHistory,
      {
        date: '09 Jun',
        reference: this.selectedRequest?.journalRef ?? 'JE-NEW',
        debit: this.selectedRequest?.amount ?? 0,
        credit: null,
        balance: newBalance,
      }
    ];
    if (this.selectedRequest) this.selectedRequest.status = 'approved';
  }

  fakeUpload(): void {
    this.proofUploaded = true;
  }

  reset(): void {
    this.screen = 'tray';
    this.selectedRequest = null;
    this.selectedMethod = null;
    this.proofUploaded = false;
    this.ledgerHistory = this.ledgerHistory.slice(0, 2);
  }

  // ── Helpers ──────────────────────────────────────────────────
  formatNaira(n: number): string {
    return '₦' + n.toLocaleString('en-NG');
  }

  isBankTransfer(): boolean {
    return this.selectedMethod === 'sterling' || this.selectedMethod === 'zenith';
  }

  getTotalValue(): number {
    return this.requests.reduce((s, r) => s + r.amount, 0);
  }

  countByStatus(status: string): number {
    return this.requests.filter(r => r.status === status).length;
  }
}
