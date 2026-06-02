import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PaystackService } from '../../../services/paystack.service';
import { ToastService } from '../../../services/toast.service';

export type TransferStep = 'select-recipient' | 'enter-amount' | 'confirm' | 'result';
export type TransferResult = 'success' | 'pending' | 'failed' | null;

@Component({
  selector: 'app-paystack-initiate-transfer',
  templateUrl: './paystack-initiate-transfer.component.html',
  styleUrls: ['./paystack-initiate-transfer.component.scss']
})
export class PaystackInitiateTransferComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ── Wizard State ──────────────────────────────────────
  currentStep: TransferStep = 'select-recipient';
  readonly progressSteps: TransferStep[] = ['select-recipient', 'enter-amount', 'confirm'];

  // ── Recipients ────────────────────────────────────────
  recipients: any[] = [];
  filteredRecipients: any[] = [];
  recipientsLoading = false;
  recipientsError: string | null = null;
  searchQuery = '';
  selectedRecipient: any = null;

  // ── Transfer Form ─────────────────────────────────────
  amountNaira: number | null = null;
  reason = '';
  generatedReference = '';

  // ── Submission / Verification State ──────────────────
  isSubmitting   = false;
  isVerifying    = false;
  transferResult: TransferResult = null;
  transferResponse: any = null;
  transferError: string | null = null;

  // ── Balance ───────────────────────────────────────────
  walletBalance: number | null = null;
  balanceLoading = false;

  // ==========================================================================
  // OTP MODAL — shown when a transfer returns status: "otp"
  // ==========================================================================
  showOtpModal        = false;
  otpModalValue       = '';
  pendingTransferCode = '';   // transfer_code from the otp response
  isFinalisingOtp     = false;
  isResendingOtp      = false;
  otpResendCooldown   = 0;   // countdown seconds before resend is allowed
  private resendTimer: any   = null;

  // ==========================================================================
  // OTP ENABLE / DISABLE TOGGLE
  // ==========================================================================
  /** Whether OTP is currently required for transfers on this integration */
  otpEnabled              = true;    // start as true (safe default)
  isTogglingOtp           = false;

  /** Step 1: clicking the toggle calls initiateDisableOtp() — this modal collects the OTP */
  showDisableOtpModal     = false;
  disableOtpPinValue      = '';
  isFinalisingDisableOtp  = false;
  isEnablingOtp           = false;

  constructor(
    private paystackService: PaystackService,
    private toastService: ToastService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadRecipients();
    this.loadBalance();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.resendTimer) clearInterval(this.resendTimer);
  }

  // ==========================================================================
  // DATA LOADING
  // ==========================================================================

  loadRecipients(): void {
    this.recipientsLoading = true;
    this.recipientsError = null;
    this.paystackService.listRecipients()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const raw = res?.data || res?.content || res;
          const list = Array.isArray(raw) ? raw : [];
          // Support both snake_case (Paystack API) and camelCase (backend DTO)
          this.recipients = list.map((r: any) => ({
            ...r,
            recipientCode: r.recipient_code || r.recipientCode || ''
          }));
          this.filteredRecipients = [...this.recipients];
          this.recipientsLoading = false;
          // If API returns empty, fall back to known test recipients
          if (this.recipients.length === 0) this.loadMockRecipients();
        },
        error: () => {
          this.recipientsError = 'Could not load recipients from the server.';
          this.recipientsLoading = false;
          this.loadMockRecipients();
        }
      });
  }

  private loadMockRecipients(): void {
    // Real registered Paystack recipients for this integration
    this.recipients = [
      {
        recipientCode: 'RCP_ehe1m3widgt6617',
        recipient_code: 'RCP_ehe1m3widgt6617',
        name: 'Queensheba Oluwadare',
        type: 'nuban',
        currency: 'NGN',
        details: {
          bank_name: 'Unity Bank',
          account_number: '0060953382',
          account_name: 'OLUWADARE QUEENSHEBA IREOLUWAT',
          bank_code: '215'
        }
      },
      {
        recipientCode: 'RCP_lpk7i9bb6wcsdsp',
        recipient_code: 'RCP_lpk7i9bb6wcsdsp',
        name: 'CENTRIFUGE INFORMATION TECHNOLOGY LIMITED',
        type: 'nuban',
        currency: 'NGN',
        details: {
          bank_name: 'Stanbic IBTC Bank',
          account_number: '0013604661',
          account_name: 'CENTRIFUGE INFORMATION TECHNOLOGY LIMITED',
          bank_code: '221'
        }
      }
    ];
    this.filteredRecipients = [...this.recipients];
    this.recipientsError = null;
  }

  loadBalance(): void {
    this.balanceLoading = true;
    this.paystackService.getBalance()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          // Paystack API always returns balance in kobo — divide by 100 to get Naira
          const dataObj = res?.data && res.data[0] ? res.data[0] : res;
          const raw = dataObj?.balance !== undefined
            ? dataObj.balance
            : (dataObj?.availableBalance ?? 0);
          this.walletBalance = raw / 100;
          this.balanceLoading = false;
        },
        error: () => { this.walletBalance = null; this.balanceLoading = false; }
      });
  }

  // ==========================================================================
  // SEARCH & SELECTION
  // ==========================================================================

  onSearch(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) { this.filteredRecipients = [...this.recipients]; return; }
    this.filteredRecipients = this.recipients.filter(r =>
      r.name?.toLowerCase().includes(q) ||
      r.details?.bank_name?.toLowerCase().includes(q) ||
      r.details?.account_number?.includes(q) ||
      r.recipientCode?.toLowerCase().includes(q)
    );
  }

  selectRecipient(r: any): void { this.selectedRecipient = r; }

  clearRecipient(): void {
    this.selectedRecipient = null;
    this.searchQuery = '';
    this.filteredRecipients = [...this.recipients];
  }

  // ==========================================================================
  // WIZARD NAVIGATION
  // ==========================================================================

  get progressStepIndex(): number { return this.progressSteps.indexOf(this.currentStep); }

  get stepPercent(): number {
    const idx = this.progressStepIndex;
    return idx < 0 ? 100 : Math.round((idx / (this.progressSteps.length - 1)) * 100);
  }

  proceedFromRecipient(): void {
    if (!this.selectedRecipient) { this.toastService.warn('Please select a recipient to continue.'); return; }
    this.currentStep = 'enter-amount';
  }

  proceedFromAmount(): void {
    if (!this.amountNaira || this.amountNaira <= 0) { this.toastService.warn('Please enter a valid amount greater than zero.'); return; }
    if (!this.reason.trim()) { this.toastService.warn('Please enter a reason / narration for the transfer.'); return; }
    this.generatedReference = this.generateReference();
    this.currentStep = 'confirm';
  }

  goBack(): void {
    const map: Partial<Record<TransferStep, TransferStep>> = {
      'enter-amount': 'select-recipient',
      'confirm':      'enter-amount',
    };
    const prev = map[this.currentStep];
    if (prev) { this.currentStep = prev; } else { this.resetWizard(); }
  }

  goToStep(step: TransferStep): void { this.currentStep = step; }

  // ==========================================================================
  // SUBMIT TRANSFER  (POST /transfer)
  // ==========================================================================

  submitTransfer(): void {
    if (!this.selectedRecipient || !this.amountNaira) return;
    this.isSubmitting  = true;
    this.transferError = null;

    const payload = {
      source:    'balance',
      amount:    Math.round(this.amountNaira * 100),   // kobo
      recipient: this.selectedRecipient.recipientCode,
      reference: this.generatedReference,
      reason:    this.reason.trim(),
      currency:  'NGN'
    };

    this.paystackService.initiateDirectTransfer(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.transferResponse = res?.data || res;
          this.isSubmitting = false;
          this.handleTransferStatus(this.transferResponse?.status);
        },
        error: (err) => {
          this.transferError  = err?.error?.message || 'Transfer initiation failed. Please try again.';
          this.transferResult = 'failed';
          this.isSubmitting   = false;
          this.currentStep    = 'result';
          this.toastService.error(this.transferError!);
        }
      });
  }

  private handleTransferStatus(status: string): void {
    const s = (status || '').toLowerCase();
    if (s === 'otp') {
      // Show OTP modal overlay instead of navigating to a separate step
      this.pendingTransferCode = this.transferResponse?.transfer_code || '';
      this.otpModalValue       = '';
      this.showOtpModal        = true;
      this.startResendCooldown();
      this.toastService.info('OTP sent to your registered phone. Enter it in the modal to complete the transfer.');
    } else if (s === 'success') {
      this.transferResult = 'success';
      this.currentStep    = 'result';
      this.toastService.success('Transfer initiated successfully!');
      this.loadBalance();
    } else {
      this.transferResult = 'pending';
      this.currentStep    = 'result';
      this.toastService.info('Transfer queued. You will be notified via webhook when complete.');
      this.loadBalance();
    }
  }

  // ==========================================================================
  // OTP MODAL — Finalise a transfer that returned status: "otp"
  // ==========================================================================

  closeOtpModal(): void {
    this.showOtpModal  = false;
    this.otpModalValue = '';
    if (this.resendTimer) { clearInterval(this.resendTimer); this.otpResendCooldown = 0; }
  }

  submitOtpModal(): void {
    if (!this.otpModalValue.trim()) { this.toastService.warn('Please enter the OTP.'); return; }
    if (!this.pendingTransferCode)  { this.toastService.error('Transfer code missing. Please restart.'); return; }
    this.isFinalisingOtp = true;

    this.paystackService.finalizeTransfer(this.pendingTransferCode, this.otpModalValue.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.transferResponse = res?.data || res;
          this.isFinalisingOtp  = false;
          this.showOtpModal     = false;
          this.otpModalValue    = '';
          if (this.resendTimer) clearInterval(this.resendTimer);
          this.handleTransferStatus(this.transferResponse?.status);
        },
        error: (err) => {
          this.isFinalisingOtp = false;
          this.toastService.error(err?.error?.message || 'OTP verification failed. Check the code and retry.');
        }
      });
  }

  resendTransferOtp(): void {
    if (this.otpResendCooldown > 0 || !this.pendingTransferCode) return;
    this.isResendingOtp = true;
    this.paystackService.resendOtp(this.pendingTransferCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isResendingOtp = false;
          this.toastService.success('OTP has been resent to your phone.');
          this.startResendCooldown();
        },
        error: (err) => {
          this.isResendingOtp = false;
          this.toastService.error(err?.error?.message || 'Could not resend OTP.');
        }
      });
  }

  private startResendCooldown(seconds = 60): void {
    this.otpResendCooldown = seconds;
    if (this.resendTimer) clearInterval(this.resendTimer);
    this.resendTimer = setInterval(() => {
      this.otpResendCooldown--;
      if (this.otpResendCooldown <= 0) { clearInterval(this.resendTimer); this.otpResendCooldown = 0; }
    }, 1000);
  }

  // ==========================================================================
  // OTP ENABLE / DISABLE TOGGLE
  // ==========================================================================

  /**
   * Toggle click handler.
   *  - If OTP is currently ENABLED  → initiate disabling (2-step: sends OTP to phone)
   *  - If OTP is currently DISABLED → immediately re-enable (1-step)
   */
  onOtpToggleClick(): void {
    if (this.isTogglingOtp) return;
    if (this.otpEnabled) {
      this.initiateDisableOtp();
    } else {
      this.enableOtpNow();
    }
  }

  /** Step 1 of disabling OTP — triggers OTP to be sent to business phone */
  private initiateDisableOtp(): void {
    this.isTogglingOtp = true;
    this.paystackService.initiateDisableOtp()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.isTogglingOtp     = false;
          this.showDisableOtpModal = true;
          this.disableOtpPinValue  = '';
          this.toastService.info(res?.message || 'OTP sent to your registered phone to confirm disabling.');
        },
        error: (err) => {
          this.isTogglingOtp = false;
          this.toastService.error(err?.error?.message || 'Could not initiate OTP disable request.');
        }
      });
  }

  /** Step 2 of disabling OTP — finalize with the received OTP */
  finalizeDisableOtpConfirm(): void {
    if (!this.disableOtpPinValue.trim()) { this.toastService.warn('Please enter the OTP.'); return; }
    this.isFinalisingDisableOtp = true;
    this.paystackService.finalizeDisableOtp(this.disableOtpPinValue.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.isFinalisingDisableOtp = false;
          this.showDisableOtpModal    = false;
          this.otpEnabled             = false;
          this.disableOtpPinValue     = '';
          this.toastService.success(res?.message || 'OTP requirement for transfers has been disabled.');
        },
        error: (err) => {
          this.isFinalisingDisableOtp = false;
          this.toastService.error(err?.error?.message || 'Failed to disable OTP. Check your code and retry.');
        }
      });
  }

  closeDisableOtpModal(): void {
    this.showDisableOtpModal = false;
    this.disableOtpPinValue  = '';
  }

  /** Re-enable OTP (single call, no confirmation needed) */
  private enableOtpNow(): void {
    this.isEnablingOtp = true;
    this.paystackService.enableOtp()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.isEnablingOtp = false;
          this.otpEnabled    = true;
          this.toastService.success(res?.message || 'OTP requirement for transfers has been enabled.');
        },
        error: (err) => {
          this.isEnablingOtp = false;
          this.toastService.error(err?.error?.message || 'Could not enable OTP.');
        }
      });
  }

  // ==========================================================================
  // VERIFY TRANSFER  (GET /transfer/verify/:reference)
  // ==========================================================================

  verifyTransfer(): void {
    if (!this.generatedReference) return;
    this.isVerifying = true;
    this.paystackService.verifyTransfer(this.generatedReference)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const data   = res?.data || res;
          const status = (data?.status || '').toLowerCase();
          this.isVerifying = false;
          if (status === 'success') {
            this.transferResult  = 'success';
            this.transferResponse = data;
            this.toastService.success('Transfer verified: Successful.');
            this.loadBalance();
          } else if (status === 'failed' || status === 'reversed') {
            this.transferResult   = 'failed';
            this.transferResponse = data;
            this.toastService.error(`Transfer status: ${status}`);
          } else {
            this.toastService.info(`Transfer status: ${status || 'pending'}. Still processing.`);
          }
        },
        error: () => { this.isVerifying = false; this.toastService.error('Could not verify transfer. Try again shortly.'); }
      });
  }

  // ==========================================================================
  // REFERENCE GENERATION
  // ==========================================================================

  generateReference(): string {
    const hex = () => Math.floor(Math.random() * 16).toString(16);
    const uid = [
      Array.from({ length: 8  }, hex).join(''),
      Array.from({ length: 4  }, hex).join(''),
      '4' + Array.from({ length: 3 }, hex).join(''),
      (8 + Math.floor(Math.random() * 4)).toString(16) + Array.from({ length: 3 }, hex).join(''),
      Array.from({ length: 12 }, hex).join('')
    ].join('-');
    return `opt_${uid}`;  // 40 chars, all lowercase ✅
  }

  regenerateReference(): void { this.generatedReference = this.generateReference(); }

  // ==========================================================================
  // WIZARD RESET & NAVIGATION
  // ==========================================================================

  resetWizard(): void {
    this.currentStep         = 'select-recipient';
    this.selectedRecipient   = null;
    this.amountNaira         = null;
    this.reason              = '';
    this.generatedReference  = '';
    this.transferResult      = null;
    this.transferResponse    = null;
    this.transferError       = null;
    this.searchQuery         = '';
    this.filteredRecipients  = [...this.recipients];
    this.showOtpModal        = false;
    this.otpModalValue       = '';
    this.pendingTransferCode = '';
  }

  navigateToOverview(): void {
    const uuid = this.route.snapshot.params['uuid'] || 'default';
    this.router.navigate(['/bankaccountoverview', uuid], { queryParams: { source: 'paystack' } });
  }

  // ==========================================================================
  // DISPLAY HELPERS
  // ==========================================================================

  formatNaira(amount: number | null | undefined, inKobo = false): string {
    if (amount == null) return '₦—';
    const val = inKobo ? amount / 100 : amount;
    return '₦' + val.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  getRecipientInitials(name: string | undefined): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts.length === 1
      ? (parts[0][0] || '?').toUpperCase()
      : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  get insufficientBalance(): boolean {
    return !!(this.amountNaira && this.walletBalance != null && this.amountNaira > this.walletBalance);
  }

  get resultStatusClass(): string {
    switch (this.transferResult) {
      case 'success': return 'result--success';
      case 'pending': return 'result--pending';
      case 'failed':  return 'result--failed';
      default:        return '';
    }
  }

  get resultIcon(): string {
    switch (this.transferResult) {
      case 'success': return 'fa-circle-check';
      case 'pending': return 'fa-clock';
      case 'failed':  return 'fa-circle-xmark';
      default:        return 'fa-circle-question';
    }
  }

  get resultTitle(): string {
    switch (this.transferResult) {
      case 'success': return 'Transfer Successful';
      case 'pending': return 'Transfer Pending';
      case 'failed':  return 'Transfer Failed';
      default:        return 'Transfer Submitted';
    }
  }

  get otpToggleWorking(): boolean {
    return this.isTogglingOtp || this.isEnablingOtp;
  }
}
