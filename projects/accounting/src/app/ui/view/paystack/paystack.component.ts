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

  // ── Transactions State (legacy tabs) ─────────────────
  transactions: PaystackTransactionDTO[] = [];
  txLoading = false;
  txError: string | null = null;
  txStartDate = '';
  txEndDate = '';
  txTypeFilter = '';
  txCurrentPage = 1;
  txPageSize = 10;

  // ── Transaction Detail State ──────────────────────────
  selectedTxDetail: PaystackTransactionDTO | null = null;
  txDetailLoading = false;
  txDetailError: string | null = null;
  showDetailDialog = false;

  // ── Paystack-style Transactions Table (Dummy Data) ────
  paystackTxData: any[] = [
    { amount: 100,   currency: 'NGN', status: 'success',   customer: 'adebayoadek@gmail.com',              reference: '707003251', channel: 'bank',          paidOn: new Date('2026-02-01T22:05:00') },
    { amount: 100,   currency: 'NGN', status: 'success',   customer: 'eseose.odion@centrifugegroup.com',   reference: '746441586', channel: 'bank_transfer',  paidOn: new Date('2026-01-30T21:25:00') },
    { amount: 25000, currency: 'NGN', status: 'abandoned', customer: 'eseose.odion@centrifugegroup.com',   reference: '868918599', channel: 'card',           paidOn: new Date('2026-01-30T21:16:00') },
    { amount: 100,   currency: 'NGN', status: 'abandoned', customer: 'eseose.odion@centrifugegroup.com',   reference: '569812400', channel: 'card',           paidOn: new Date('2026-01-30T21:16:00') },
    { amount: 25000, currency: 'NGN', status: 'abandoned', customer: 'eseose.odion@centrifugegroup.com',   reference: '5350382',   channel: 'card',           paidOn: new Date('2026-01-30T21:16:00') },
    { amount: 25000, currency: 'NGN', status: 'abandoned', customer: 'eseose.odion@centrifugegroup.com',   reference: '722817376', channel: 'card',           paidOn: new Date('2026-01-30T21:16:00') },
    { amount: 100,   currency: 'NGN', status: 'abandoned', customer: 'eseose.odion@centrifugegroup.com',   reference: '682374062', channel: 'bank',           paidOn: new Date('2026-01-30T21:16:00') },
    { amount: 100,   currency: 'NGN', status: 'abandoned', customer: 'eseose.odion@centrifugegroup.com',   reference: '88615132',  channel: 'card',           paidOn: new Date('2026-01-30T21:16:00') },
    { amount: 5000,  currency: 'NGN', status: 'success',   customer: 'john.doe@acmecorp.com',             reference: '334521987', channel: 'card',           paidOn: new Date('2026-01-28T10:33:00') },
    { amount: 15000, currency: 'NGN', status: 'success',   customer: 'mary.jones@techpeak.io',            reference: '991234560', channel: 'bank_transfer',  paidOn: new Date('2026-01-27T08:15:00') },
    { amount: 750,   currency: 'NGN', status: 'abandoned', customer: 'kwame.asante@gmail.com',            reference: '112233445', channel: 'ussd',           paidOn: new Date('2026-01-26T18:45:00') },
    { amount: 3200,  currency: 'NGN', status: 'success',   customer: 'tunde.bakare@outlook.com',          reference: '556677889', channel: 'card',           paidOn: new Date('2026-01-25T13:02:00') },
  ];

  // ── Filter Panel State ────────────────────────────────
  showAddFilterPanel = false;
  showDateFilterPanel = false;

  readonly availableFilterOptions: { key: string; label: string; type: 'select' | 'input'; options?: string[]; placeholder?: string }[] = [
    { key: 'status',     label: 'Status',          type: 'select', options: ['Show all', 'Success', 'Abandoned', 'Failed', 'Ongoing', 'Pending', 'Reversed'] },
    { key: 'channel',    label: 'Channel',         type: 'select', options: ['Show all', 'Card', 'Bank', 'Bank transfer', 'USSD', 'QR', 'Mobile money'] },
    { key: 'amount',     label: 'Amount',          type: 'input',  placeholder: 'Transaction amount' },
    { key: 'receipt',    label: 'Receipt number',  type: 'input',  placeholder: 'Receipt number' },
    { key: 'email',      label: 'Customer email',  type: 'input',  placeholder: 'Customer email' },
    { key: 'page',       label: 'Payment page',    type: 'input',  placeholder: 'Payment page' },
    { key: 'terminal',   label: 'Terminal ID',     type: 'input',  placeholder: 'Terminal ID' },
    { key: 'subaccount', label: 'Subaccount',      type: 'input',  placeholder: 'Subaccount' },
  ];

  activeFilterKeys: string[] = [];
  filterValues: { [key: string]: string } = {};

  // Date filter
  selectedDatePreset = '';
  appliedDateLabel   = '';
  customRangeStart   = '';
  customRangeEnd     = '';

  // Pagination for dummy table
  psTxPage     = 1;
  psTxPageSize = 10;

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
          this.balanceData = { ...res, balance: res.availableBalance } as any;
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

  // ==========================================================================
  // PAYSTACK-STYLE FILTER PANEL
  // ==========================================================================

  toggleAddFilterPanel(): void {
    this.showAddFilterPanel = !this.showAddFilterPanel;
    if (this.showAddFilterPanel) this.showDateFilterPanel = false;
  }

  toggleDateFilterPanel(): void {
    this.showDateFilterPanel = !this.showDateFilterPanel;
    if (this.showDateFilterPanel) this.showAddFilterPanel = false;
  }

  closeAllPanels(): void {
    this.showAddFilterPanel = false;
    this.showDateFilterPanel = false;
  }

  addFilter(key: string): void {
    if (!this.activeFilterKeys.includes(key)) {
      this.activeFilterKeys.push(key);
      this.filterValues[key] = '';
    }
  }

  removeFilter(key: string): void {
    this.activeFilterKeys = this.activeFilterKeys.filter(k => k !== key);
    delete this.filterValues[key];
  }

  applyAddFilters(): void {
    this.showAddFilterPanel = false;
  }

  resetAddFilters(): void {
    this.activeFilterKeys = [];
    this.filterValues = {};
  }

  applyDateFilter(): void {
    const labels: { [k: string]: string } = {
      last7:     'Last 7 days',
      today:     'Today',
      alltime:   'All time',
      thismonth: 'This month',
      lastmonth: 'Last month',
    };
    this.appliedDateLabel = this.selectedDatePreset === 'custom'
      ? (this.customRangeStart && this.customRangeEnd
          ? `${this.customRangeStart} – ${this.customRangeEnd}`
          : 'Custom period')
      : (labels[this.selectedDatePreset] || '');
    this.showDateFilterPanel = false;
  }

  resetDateFilter(): void {
    this.selectedDatePreset = '';
    this.appliedDateLabel   = '';
    this.customRangeStart   = '';
    this.customRangeEnd     = '';
  }

  clearAllFilters(): void {
    this.resetAddFilters();
    this.resetDateFilter();
  }

  getFilterOption(key: string): any {
    return this.availableFilterOptions.find(f => f.key === key);
  }

  get inactiveFilterOptions(): any[] {
    return this.availableFilterOptions.filter(f => !this.activeFilterKeys.includes(f.key));
  }

  get hasAnyAppliedFilter(): boolean {
    return !!this.appliedDateLabel || this.activeFilterKeys.length > 0;
  }

  // ==========================================================================
  // PAYSTACK-STYLE TABLE HELPERS
  // ==========================================================================

  get filteredPsTx(): any[] {
    return this.paystackTxData; // filtering applied once endpoint is wired
  }

  get paginatedPsTx(): any[] {
    const start = (this.psTxPage - 1) * this.psTxPageSize;
    return this.filteredPsTx.slice(start, start + this.psTxPageSize);
  }

  get psTxTotalPages(): number {
    return Math.ceil(this.filteredPsTx.length / this.psTxPageSize) || 1;
  }

  psTxNext(): void { if (this.psTxPage < this.psTxTotalPages) this.psTxPage++; }
  psTxPrev(): void { if (this.psTxPage > 1) this.psTxPage--; }

  formatPsAmount(amount: number, currency: string = 'NGN'): string {
    return `${currency} ${Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatPsDate(date: Date): string {
    if (!date) return '—';
    const d    = new Date(date);
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const mons = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const h    = d.getHours();
    const min  = d.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12  = (h % 12) || 12;
    return `${days[d.getDay()]}, ${mons[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${h12}:${min} ${ampm}`;
  }

  getChannelLabel(channel: string): string {
    const map: { [k: string]: string } = {
      bank: 'Bank', bank_transfer: 'Bank transfer',
      card: 'Card', ussd: 'USSD', qr: 'QR', mobile_money: 'Mobile money',
    };
    return map[channel] || channel;
  }
}

