import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PaystackService } from '../../../services/paystack.service';
import { DisbursementService } from '../../../services/disbursement.service';
import { ToastService } from '../../../services/toast.service';
import {
  PaystackBalanceDTO,
  PaystackTransactionDTO,
  PaystackTransferPayload
} from '../../domain/accounting.dto';

@Component({
  selector: 'app-paystack',
  templateUrl: './paystack.component.html',
  styleUrls: ['./paystack.component.scss']
})
export class PaystackComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ── Active Tab ────────────────────────────────────────
  activeTab: 'balance' | 'transactions' | 'transfer' = 'balance';

  // ── Balance State ─────────────────────────────────────
  balanceData: PaystackBalanceDTO | null = null;
  balanceLoading = false;
  balanceError: string | null = null;

  // ── Transactions State ────────────────────────────────
  transactions: PaystackTransactionDTO[] = [];
  txLoading = false;
  txError: string | null = null;

  // Filters
  txStartDate = '';
  txEndDate = '';
  txTypeFilter = '';

  // Pagination
  txCurrentPage = 1;
  txPageSize = 10;

  // ── Transaction Detail State ──────────────────────────
  selectedTxDetail: PaystackTransactionDTO | null = null;
  txDetailLoading = false;
  txDetailError: string | null = null;
  showDetailDialog = false;

  // ── Transfer State ────────────────────────────────────
  employees: any[] = [];
  employeesLoading = false;
  selectedEmployeeId: number | null = null;
  transferAmount: number | null = null;
  isTransferring = false;
  showConfirmDialog = false;
  lastTransferReference: string | null = null;
  transferError: string | null = null;

  constructor(
    private paystackService: PaystackService,
    private disbursementService: DisbursementService,
    private toastService: ToastService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadBalance();
    this.loadTransactions();
    this.loadEmployees();
    this.checkVerificationCallback();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==========================================================================
  // TABS
  // ==========================================================================

  setActiveTab(tab: 'balance' | 'transactions' | 'transfer'): void {
    this.activeTab = tab;
  }

  // ==========================================================================
  // BALANCE
  // ==========================================================================

  loadBalance(): void {
    this.balanceLoading = true;
    this.balanceError = null;

    this.paystackService.getBalance()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.balanceData = res.data;
          this.balanceLoading = false;
        },
        error: (err) => {
          this.balanceError = err?.error?.message || 'Failed to load wallet balance. Please try again.';
          this.balanceLoading = false;
        }
      });
  }

  refreshBalance(): void {
    this.loadBalance();
  }

  // ==========================================================================
  // TRANSACTIONS
  // ==========================================================================

  loadTransactions(): void {
    this.txLoading = true;
    this.txError = null;
    this.txCurrentPage = 1;

    this.paystackService
      .getTransactions(
        this.txStartDate || undefined,
        this.txEndDate   || undefined,
        this.txTypeFilter || undefined
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.transactions = res.data || [];
          this.txLoading = false;
        },
        error: (err) => {
          this.txError = err?.error?.message || 'Failed to load transactions.';
          this.txLoading = false;
        }
      });
  }

  applyTxFilters(): void {
    this.loadTransactions();
  }

  clearTxFilters(): void {
    this.txStartDate   = '';
    this.txEndDate     = '';
    this.txTypeFilter  = '';
    this.loadTransactions();
  }

  get paginatedTransactions(): PaystackTransactionDTO[] {
    const start = (this.txCurrentPage - 1) * this.txPageSize;
    return this.transactions.slice(start, start + this.txPageSize);
  }

  get txTotalPages(): number {
    return Math.ceil(this.transactions.length / this.txPageSize) || 1;
  }

  txNextPage(): void {
    if (this.txCurrentPage < this.txTotalPages) this.txCurrentPage++;
  }

  txPrevPage(): void {
    if (this.txCurrentPage > 1) this.txCurrentPage--;
  }

  getTxPageStart(): number {
    if (this.transactions.length === 0) return 0;
    return (this.txCurrentPage - 1) * this.txPageSize + 1;
  }

  getTxPageEnd(): number {
    return Math.min(this.txCurrentPage * this.txPageSize, this.transactions.length);
  }

  // ==========================================================================
  // EMPLOYEES
  // ==========================================================================

  loadEmployees(): void {
    this.employeesLoading = true;

    this.disbursementService.getEmployees()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.employees = res?.content || res || [];
          this.employeesLoading = false;
        },
        error: () => {
          this.employeesLoading = false;
          this.toastService.warn('Could not load employee list.');
        }
      });
  }

  get selectedEmployee(): any {
    return this.employees.find(e => e.id === this.selectedEmployeeId) || null;
  }

  getEmployeeDisplayName(employee: any): string {
    if (!employee) return '';
    return employee.fullName
      || `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
      || employee.name
      || `Employee #${employee.id}`;
  }

  // ==========================================================================
  // TRANSFER
  // ==========================================================================

  get isTransferFormValid(): boolean {
    return !!this.selectedEmployeeId && !!this.transferAmount && this.transferAmount > 0;
  }

  openConfirmDialog(): void {
    if (!this.isTransferFormValid) {
      this.toastService.warn('Please select an employee and enter a valid amount.');
      return;
    }
    this.showConfirmDialog = true;
  }

  cancelTransfer(): void {
    this.showConfirmDialog = false;
  }

  confirmTransfer(): void {
    if (!this.selectedEmployeeId || !this.transferAmount) return;

    const payload: PaystackTransferPayload = {
      employeeId: this.selectedEmployeeId,
      amount:     this.transferAmount
    };

    this.isTransferring    = true;
    this.showConfirmDialog = false;
    this.transferError     = null;
    this.lastTransferReference = null;

    this.paystackService.initiateTransfer(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.lastTransferReference = res.data?.reference || null;
          this.isTransferring = false;
          this.toastService.success(
            `Transfer initiated successfully. Reference: ${res.data?.reference}`
          );
          this.resetTransferForm();
          this.loadBalance();
          this.loadTransactions();
        },
        error: (err) => {
          this.transferError  = err?.error?.message || 'Transfer failed. Please try again.';
          this.isTransferring = false;
          this.toastService.error(this.transferError!);
        }
      });
  }

  resetTransferForm(): void {
    this.selectedEmployeeId = null;
    this.transferAmount     = null;
    this.transferError      = null;
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  formatNaira(amount: number | null | undefined): string {
    if (amount == null) return '—';
    return `₦${Number(amount).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  getTypeClass(type: string): string {
    return type === 'CREDIT'
      ? 'bg-green-100 text-green-700 border border-green-200'
      : 'bg-red-100 text-red-700 border border-red-200';
  }

  getTypeAmountClass(type: string): string {
    return type === 'CREDIT' ? 'text-customGreen font-semibold' : 'text-red-600 font-semibold';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'SUCCESS': return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'PENDING': return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'FAILED':  return 'bg-rose-100 text-rose-800 border border-rose-200';
      default:        return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  }

  formatTxDate(dateStr: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  checkVerificationCallback(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const ref = params['reference'] || params['trxref'];
      if (ref) {
        this.toastService.info(`Verifying transaction: ${ref}...`);
        this.paystackService.verifyPayment(ref)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (res) => {
              if (res.data?.status === 'SUCCESS') {
                this.toastService.success(`Payment verified successfully! Amount: ${this.formatNaira(res.data.amount)}`);
              } else {
                this.toastService.warn(`Payment status: ${res.data?.status || 'UNKNOWN'}`);
              }
              this.loadBalance();
              this.loadTransactions();
            },
            error: (err) => {
              this.toastService.error(err?.error?.message || 'Payment verification failed.');
            }
          });
      }
    });
  }

  viewTransactionDetail(reference: string): void {
    this.txDetailLoading = true;
    this.txDetailError = null;
    this.showDetailDialog = true;
    this.selectedTxDetail = null;

    this.paystackService.getTransactionByReference(reference)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.selectedTxDetail = res.data;
          this.txDetailLoading = false;
        },
        error: (err) => {
          this.txDetailError = err?.error?.message || 'Failed to fetch transaction details.';
          this.txDetailLoading = false;
        }
      });
  }

  closeDetailDialog(): void {
    this.showDetailDialog = false;
    this.selectedTxDetail = null;
    this.txDetailError = null;
  }
}
