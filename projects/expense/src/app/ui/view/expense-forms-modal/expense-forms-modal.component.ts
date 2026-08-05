import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExpenseLineItemDTO, ExpenseService } from '../../service/expense.service';
import { Router, ActivatedRoute } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { NgForm } from '@angular/forms';
import { Location } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthenticationService } from '../../sharedComponent/service/auth-service/authentication.service';
import { EmailService } from '../../sharedComponent/service/email.service';
import { Subject, Observable, of } from 'rxjs';
import { debounceTime, catchError, map, switchMap } from 'rxjs/operators';
import { RecurringPayment } from '../../sharedComponent/view/recurring-payment-modal/recurring-payment.model';
import { RecurringPaymentModalComponent } from '../../sharedComponent/view/recurring-payment-modal/recurring-payment-modal.component';
import { BillSplit, BillSplitParticipant } from '../../sharedComponent/view/bill-splitting-modal/bill-splitting.model';
import { SideModalComponent } from '../../sharedComponent/view/side-modal/side-modal.component';
import { MatIconModule } from '@angular/material/icon';
import { NgSelectModule } from '@ng-select/ng-select';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { ReceiptScannerService, ScannedReceiptData } from '../../service/receipt-scanner.service';


const FALLBACK_APPROVER_EMAILS: { fullname: string; email: string }[] = [
  { fullname: 'Admin',   email: 'a.olayemi@yahoo.com' },
  { fullname: 'Finance', email: 'damilola@centrifugegroup.com' },
];

const MONTHLY_EXPENSE_LIMIT = 20;

@Component({
  selector: 'app-expense-forms-modal',
  templateUrl: './expense-forms-modal.component.html',
  styleUrls: ['./expense-forms-modal.component.scss'],
  standalone: true,
  providers: [MessageService, ConfirmationService],
  imports: [
    CommonModule, FormsModule, MatIconModule, NgSelectModule,
    ToastModule, TooltipModule, DialogModule, ConfirmDialogModule,
    RecurringPaymentModalComponent, SideModalComponent,
  ],
})
export class ExpenseFormsModalComponent implements OnInit, OnDestroy {

  // ─── Form state───────────────────
  expenseSummary: any = { amount: null, quantity: 1, paidBy: 'COMPANY', lineItems: [] as ExpenseLineItemDTO[] };
  isDragging  = false;
  currentStage = 'to-submit';
  productData: any = {};
  signatureUrl: string | null = null;

  isSubmitting   = false;
  isSendingEmail = false;

  amountMode: 'per_item' | 'total' = 'total';

  // ─── Multi-file attachments───────
  companyReceiptFiles:    File[]   = [];
  companyReceiptPreviews: string[] = [];
  employeeReceiptFiles:   File[]   = [];
  employeeReceiptPreviews: string[] = [];

  get receiptFile(): File | null         { return this.companyReceiptFiles[0]  ?? null; }
  get employeeReceiptFile(): File | null { return this.employeeReceiptFiles[0] ?? null; }

  // ─── Dropdown data────────────────
  categories: { id: number; name: string; description?: string }[] = [];
  categoryNames: string[] = [];
  merchants: { id: number; name: string; phoneNumber: string; address: string; emailAddress: string; contactPersonName: string }[] = [];
  taxRates: { id: number; name: string; rate: number }[] = [];
  selectedCurrency = 'NGN';
  availableCurrencies = ['USD', 'EUR', 'GBP', 'NGN'];

  // ─── Monthly batch check──────────
  currentMonthExpenseCount = 0;
  showMonthlyLimitWarning  = false;
  readonly MONTHLY_LIMIT   = MONTHLY_EXPENSE_LIMIT;

  // ─── Modals───────────────────────
  showCategoryModal   = false;
  showMerchantModal   = false;
  showTaxModal        = false;
  showAdvancedPayment = false;
  showBillSplit       = false;

  newCategoryData = { name: '', description: '' };
  newMerchantData = { name: '', phoneNumber: '', address: '', emailAddress: '', contactPersonName: '' };
  newTaxData      = { name: '', rate: 0, description: '' };

  // ─── Advanced payment / bill split
  advancedPaymentData?: RecurringPayment;
  billSplitData?: BillSplit;
  numParticipants = 2;
  splitError: string | null = null;

  searchTermSubject = new Subject<string>();

  @ViewChild(RecurringPaymentModalComponent) recurringModal?: RecurringPaymentModalComponent;

  public signaturePadOptions: Object = { minWidth: 1, canvasWidth: 500, canvasHeight: 300 };


  scanState: 'idle' | 'scanning' | 'preview' | 'error' = 'idle';
  scannedData: ScannedReceiptData | null = null;
  appliedScanPreview: ScannedReceiptData | null = null;
  scanError = '';
  barcodeMode: 'idle' | 'active' = 'idle';
  barcodeScanValue = '';
  highlightedFields: Set<string> = new Set();
  scanProgress = 0;
  private scanProgressInterval: any = null;
  private scannedReceiptFile: File | null = null;

  @ViewChild('barcodeScannerInput') barcodeScannerInput?: ElementRef<HTMLInputElement>;

  constructor(
    private expenseService:  ExpenseService,
    private router:          Router,
    private route:           ActivatedRoute,
    private messageService:  MessageService,
    private location:        Location,
    private http:            HttpClient,
    private emailService:    EmailService,
    private authService:     AuthenticationService,
    private receiptScanner:  ReceiptScannerService,
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadMerchants();
    this.loadTaxRates();
    this.checkMonthlyLimit();
    this.searchTermSubject.pipe(debounceTime(300)).subscribe(() => this.applyFilters());

    this.route.queryParams.subscribe((params) => {
      const expenseId = params['id'];
      if (expenseId) {
        this.expenseService.getExpenseById(expenseId).subscribe((expense) => {
          if (expense) {
            this.expenseSummary = { ...expense };
            this.signatureUrl   = expense.signature || null;
          }
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.revokeAllPreviews();
    this.receiptScanner.terminateWorker().catch(() => {});
    if (this.scanProgressInterval) clearInterval(this.scanProgressInterval);
  }

  // ─── Resolve current user─────────
  private resolveCurrentUser(): { id: number | null; fullname: string; email: string } {
    try {
      const primaryRaw =
        sessionStorage.getItem('userPrimaryInfoRegData') ||
        localStorage.getItem('userPrimaryInfoRegData');
      const primary = primaryRaw ? JSON.parse(primaryRaw) : null;

      const regRaw =
        sessionStorage.getItem('userRegData') ||
        localStorage.getItem('userRegData');
      const reg = regRaw ? JSON.parse(regRaw) : null;

      const storedId =
        sessionStorage.getItem('userid') ||
        localStorage.getItem('userid');

      const id: number | null =
        (primary?.user?.id && typeof primary.user.id === 'number') ? primary.user.id :
        (reg?.id           && typeof reg.id           === 'number') ? reg.id           :
        storedId ? (Number(storedId) || null) : null;

      const fullname =
        primary?.fullname || primary?.name ||
        sessionStorage.getItem('username') || localStorage.getItem('username') || 'Unknown User';

      const email =
        primary?.email ||
        sessionStorage.getItem('email') || localStorage.getItem('email') || '';

      return { id, fullname, email };
    } catch {
      return { id: null, fullname: 'Unknown User', email: '' };
    }
  }

  //─────────────────────────────────
  // ── RECEIPT SCANNING─────────────
  //─────────────────────────────────

  // triggerScanFileInput
  // Opens a hidden <input type="file"> for the user to pick the receipt image.
  // Accepts JPG, PNG, and PDF. Called when the "Scan / Upload Receipt" button
  // is clicked.
  triggerScanFileInput(): void {
    const input = document.getElementById('receipt-scan-input') as HTMLInputElement;
    if (input) input.click();
  }

  // onScanFileSelected
  // Fires when the user picks a file via the hidden input.
  // Validates the file type, then kicks off OCR processing.
  async onScanFileSelected(event: Event): Promise<void> {
    const input  = event.target as HTMLInputElement;
    const file   = input.files?.[0];
    if (!file) return;

    // Reset the input so the same file can be re-selected if needed
    input.value = '';

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Unsupported File',
        detail: 'Please upload a JPG, PNG, WebP, or PDF image of your receipt.'
      });
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      this.messageService.add({
        severity: 'error',
        summary: 'File Too Large',
        detail: 'Receipt image must be under 15 MB.'
      });
      return;
    }

    await this._runOcr(file);
  }

  // triggerBarcodeScan
  // When a barcode scanner is attached, this focuses a small hidden input
  // so the scanner can paste the code directly and fill merchant/expense.
  triggerBarcodeScan(): void {
    this.barcodeMode = 'active';
    this.barcodeScanValue = '';
    setTimeout(() => this.barcodeScannerInput?.nativeElement.focus(), 100);
  }

  @HostListener('window:keydown', ['$event'])
  handleBarcodeKey(event: KeyboardEvent): void {
    if (this.barcodeMode !== 'active') return;
    if (event.key === 'Enter') {
      event.preventDefault();
      this.completeBarcodeScan();
      return;
    }

    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      this.barcodeScanValue += event.key;
    }
  }

  completeBarcodeScan(): void {
    const code = this.barcodeScanValue?.trim();
    if (!code) return;

    const matched = this._lookupMerchantFromBarcode(code);
    this.expenseSummary.name = code;
    this.expenseSummary.merchant = matched?.name || code;
    this.highlightedFields.add('name');
    this.highlightedFields.add('merchant');

    this.barcodeMode = 'idle';
    this.barcodeScanValue = '';

    this.messageService.add({
      severity: 'success',
      summary: 'Barcode Scanned',
      detail: matched
        ? `Matched merchant ${matched.name} from scanned barcode.`
        : 'Merchant and expense name auto-filled from barcode.',
      life: 4000,
    });
  }

  cancelBarcodeScan(): void {
    this.barcodeMode = 'idle';
    this.barcodeScanValue = '';
  }

  private _lookupMerchantFromBarcode(code: string): { id: number; name: string } | null {
    const normalized = code.toLowerCase();
    const numeric = code.replace(/\D/g, '');

    return this.merchants.find((m) => {
      const name = (m.name || '').toLowerCase();
      const phone = (m.phoneNumber || '').replace(/\D/g, '');
      const address = (m.address || '').toLowerCase();
      const email = (m.emailAddress || '').toLowerCase();
      const contact = (m.contactPersonName || '').toLowerCase();

      return (
        (name && name.includes(normalized)) ||
        (address && address.includes(normalized)) ||
        (email && email.includes(normalized)) ||
        (contact && contact.includes(normalized)) ||
        (numeric && phone.includes(numeric))
      );
    }) ?? null;
  }

  // _runOcr
  // Core OCR pipeline:
  //   1. Sets scanState = 'scanning' (shows progress indicator)
  //   2. Calls ReceiptScannerService.scanImage()
  //   3. On success: sets scanState = 'preview' (shows extracted data panel)
  //   4. On failure: sets scanState = 'error'
  private async _runOcr(file: File): Promise<void> {
    this.scanState    = 'scanning';
    this.scanError    = '';
    this.scannedData  = null;
    this.scannedReceiptFile = file;
    this.scanProgress = 0;

    // Animate the progress bar while Tesseract works (it doesn't emit granular events)
    this.scanProgressInterval = setInterval(() => {
      if (this.scanProgress < 85) this.scanProgress += Math.random() * 8;
    }, 400);

    try {
      const data = await this.receiptScanner.scanImage(file);

      clearInterval(this.scanProgressInterval);
      this.scanProgress = 100;

      if (!data.merchantName && data.amount === null && !data.date) {
        // Essentially nothing was extracted — show error
        this.scanState = 'error';
        this.scanError = 'Couldn\'t read this receipt clearly. Please fill the form manually or try a clearer image.';
        return;
      }

    this.scannedData  = data;
    this.scanState    = 'preview';

      // Show any partial-data warnings as toasts
      data.warnings.forEach(w =>
        this.messageService.add({ severity: 'warn', summary: 'Partial Read', detail: w, life: 6000 })
      );

    } catch (err: any) {
      clearInterval(this.scanProgressInterval);
      console.error('[ReceiptScan] OCR failed:', err);
      this.scanState = 'error';
      this.scanError = 'Receipt processing failed. Please try a different image or fill the form manually.';
    }
  }

  // confirmScanFill
  // Called when the user clicks "Use These Details" in the preview panel.
  // Copies the extracted fields into expenseSummary, then resets scanner state.
  confirmScanFill(): void {
    if (!this.scannedData) return;

    const d = this.scannedData;
    this.appliedScanPreview = d;
    this.highlightedFields.clear();

    // ── Expense name (= merchant name from receipt) ───────────────────────
    if (d.merchantName) {
      this.expenseSummary.name = d.merchantName;
      this.highlightedFields.add('name');
    }

    const scannedLineItems = d.lineItems.length > 0
      ? d.lineItems.map(item => this.normalizeExpenseLineItem({
          name: item.name,
          quantity: item.qty || 1,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        }))
      : [this.normalizeExpenseLineItem({
          name: d.merchantName || d.expenseName || 'Receipt item',
          quantity: d.quantity || 1,
          unitPrice: this.roundCurrency((d.amount ?? d.subTotal ?? 0) / Math.max(d.quantity || 1, 1)),
          totalPrice: d.amount ?? d.subTotal ?? 0,
        })];

    this.expenseSummary.lineItems = scannedLineItems;
    this.syncLineItemSummary();
    this.highlightedFields.add('lineItems');
    this.highlightedFields.add('quantity');

    // ── Amount — use tax-inclusive TOTAL as the primary amount ────────────
    // If no total was found but subtotal was, use subtotal as fallback
    const amountToFill = d.amount ?? d.subTotal;
    if (amountToFill !== null) {
      this.expenseSummary.amount = amountToFill;
      this.amountMode = 'total';
      this.highlightedFields.add('amount');
    }

    // ── Tax ───────────────────────────────────────────────────────────────
    // Strategy:
    //   1. If a tax RATE (%) was detected (e.g. 7.5), try to match it against
    //      the loaded taxRates list by rate value first, then by label.
    //   2. If no rate but a monetary tax AMOUNT was found, calculate the
    //      implied rate from (taxAmount / subTotal * 100) and try to match.
    //   3. If a match is found, set expenseSummary.taxPercentage to that rate
    //      so the ng-select dropdown auto-selects the right entry.
    //   4. If no match in the list but a rate was found, still fill the field
    //      so the user can see it and optionally add a new tax rate.

    let resolvedTaxRate: number | null = null;

    if (d.taxRate !== null) {
      resolvedTaxRate = d.taxRate;
    } else if (d.taxAmount !== null && d.subTotal !== null && d.subTotal > 0) {
      // Derive implied rate from subtotal + taxAmount
      resolvedTaxRate = Math.round((d.taxAmount / d.subTotal) * 100 * 100) / 100;
      console.log('[confirmScanFill] Implied tax rate from amount:', resolvedTaxRate, '%');
    }

    if (resolvedTaxRate !== null) {
      // Try to match an existing tax rate entry (within ±0.1% tolerance)
      const matched = this.taxRates.find(t =>
        Math.abs(Number(t.rate) - resolvedTaxRate!) < 0.1
      );

      if (matched) {
        this.expenseSummary.taxPercentage = matched.rate;
        console.log('[confirmScanFill] Matched tax rate:', matched.name, matched.rate);
      } else {
        // No match — fill with the detected rate anyway
        this.expenseSummary.taxPercentage = resolvedTaxRate;
        console.warn('[confirmScanFill] Tax rate', resolvedTaxRate,
          '% not found in taxRates list. User may need to add it manually.');

        // Show a toast nudging the user to add this tax rate
        this.messageService.add({
          severity: 'info',
          summary: 'Tax Rate Not Found',
          detail: `Receipt shows ${d.taxLabel || 'tax'} at ${resolvedTaxRate}%. ` +
                  `Add this rate in the Tax section if it does not already exist.`,
          life: 7000,
        });
      }
      this.highlightedFields.add('taxPercentage');
    }

    // ── Date ─────────────────────────────────────────────────────────────
    if (d.date) {
      this.expenseSummary.eventDate = d.date;
      this.highlightedFields.add('eventDate');
    }

    if (this.scannedReceiptFile) {
      this.replaceFiles('receipt', this.scannedReceiptFile);
      this.highlightedFields.add('receipt');
    }

    // ── Merchant — fuzzy-match against loaded merchants list ──────────────
    if (d.merchantName) {
      const matched = this._matchMerchant(d.merchantName);
      if (matched) {
        this.expenseSummary.merchant = matched.name;
        this.highlightedFields.add('merchant');
      } else {
        // Pre-populate new merchant modal fields so user can add it in one click
        this.expenseSummary.merchant = d.merchantName;
        this.highlightedFields.add('merchant');
        this.newMerchantData = {
          name:              d.merchantName,
          phoneNumber:       d.merchantPhone    || '',
          address:           d.merchantAddress  || '',
          emailAddress:      d.merchantEmail    || '',
          contactPersonName: d.merchantContact  || '',
        };
      }
    }

    // ── Reset scanner state ─────────────────────────────────────────────────
    this.scanState   = 'idle';
    this.scannedData = null;
    this.scannedReceiptFile = null;

    this.messageService.add({
      severity: 'success',
      summary:  'Receipt Scanned',
      detail:   'Form pre-filled from receipt. Please review highlighted fields before submitting.',
      life:     5000,
    });

    // Clear amber highlights after 8 seconds
    setTimeout(() => this.highlightedFields.clear(), 8000);
  }

  // _matchMerchant
  // Fuzzy-matches the scanned merchant name against the loaded merchants list.
  // Returns the best match if the normalised name contains the scanned name
  // or vice versa.
  private _matchMerchant(name: string): { id: number; name: string } | null {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const target = norm(name);
    return this.merchants.find(m => {
      const n = norm(m.name);
      return n.includes(target) || target.includes(n);
    }) ?? null;
  }

  // dismissScan
  // User clicked "Cancel" in the preview panel — discard extracted data.
  dismissScan(): void {
    this.scanState   = 'idle';
    this.scannedData = null;
    this.scanError   = '';
    this.scannedReceiptFile = null;
    this.scanProgress = 0;
    if (this.scanProgressInterval) clearInterval(this.scanProgressInterval);
  }

  // retryScan
  // After an error, re-opens the file picker so the user can try again.
  retryScan(): void {
    this.scanState = 'idle';
    this.scanError = '';
    this.scanProgress = 0;
    setTimeout(() => this.triggerScanFileInput(), 100);
  }

  // isHighlighted
  // Returns true when a given form field was populated by the scanner,
  // so the template can apply the amber highlight border.
  isHighlighted(field: string): boolean {
    return this.highlightedFields.has(field);
  }

  //─────────────────────────────────
  // ── END RECEIPT SCANNING─────────
  //─────────────────────────────────

  private fetchApprovers(): Observable<{ fullname: string; email: string }[]> {
    return of(FALLBACK_APPROVER_EMAILS);
  }

  private notifyAdmins(
    submitterName: string,
    expenseId:     number | string,
    expenseName:   string,
    amount:        number,
    currency:      string,
    submitterEmail: string
  ): void {
    this.fetchApprovers().subscribe({
      next: (approvers) => {
        if (!approvers.length) return;
        approvers.forEach(approver => {
          if (!approver.email || approver.email.toLowerCase() === submitterEmail.toLowerCase()) return;
          this.emailService
            .sendExpenseSubmissionAlert(submitterName, approver.email, expenseName, expenseId, amount, currency)
            .pipe(catchError(err => { console.error(`[notifyAdmins] email failed for ${approver.email}:`, err); return of(null); }))
            .subscribe();
        });

        if (submitterEmail) {
          this.emailService.sendNotificationEmail({
            name:          submitterName,
            receiverEmail: submitterEmail,
            subject:       '📋 Expense Submitted — Awaiting Approval',
            body: `<p>Hi ${submitterName},</p>
                   <p>Your expense <strong>${expenseName}</strong> of
                   <strong>${currency} ${amount.toLocaleString()}</strong>
                   has been submitted and is pending approval.</p>
                   <p>You will be notified once reviewed.</p>
                   <br/><p style="color:#666;">Optimax Finance Team</p>`
          }).pipe(catchError(err => { console.error('[notifyAdmins] submitter copy failed:', err); return of(null); }))
            .subscribe();
        }
      },
    });
  }

  // ─── Monthly batch check──────────
  private checkMonthlyLimit(): void {
    const currentUser = this.resolveCurrentUser();
    if (!currentUser.id) return;

    this.expenseService.getExpenses().subscribe({
      next: (expenses) => {
        const now = new Date();
        const thisMonth = expenses.filter(e => {
          const uid = typeof e.expenseBy === 'object' && e.expenseBy !== null
            ? (e.expenseBy as any).id ?? (e.expenseBy as any).userId
            : Number(e.expenseBy);
          if (uid !== currentUser.id) return false;

          const d = Array.isArray(e.eventDate)
            ? new Date((e.eventDate as any)[0], (e.eventDate as any)[1] - 1)
            : new Date(e.eventDate as string);
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        });

        this.currentMonthExpenseCount = thisMonth.length;
        this.showMonthlyLimitWarning  = thisMonth.length >= MONTHLY_EXPENSE_LIMIT;

        if (this.showMonthlyLimitWarning) {
          this.messageService.add({
            severity: 'warn',
            summary:  'Monthly Limit Reached',
            detail:   `You have submitted ${thisMonth.length} expenses this month (limit: ${MONTHLY_EXPENSE_LIMIT}). Please contact your manager.`,
            life:     8000
          });
        }
      },
      error: () => {}
    });
  }

  // ─── Computed totals──────────────
  get computedTotal(): number {
    if (this.hasLineItems()) {
      return this.getLineItemsSubtotal();
    }
    const amount = Number(this.expenseSummary.amount) || 0;
    const qty    = Number(this.expenseSummary.quantity) || 1;
    return this.amountMode === 'per_item' ? amount * qty : amount;
  }

  get computedTotalWithTax(): number {
    const tax = Number(this.expenseSummary.taxPercentage) || 0;
    return this.computedTotal + (this.computedTotal * tax / 100);
  }

  get receiptExpectedLineItemTotal(): number | null {
    if (!this.appliedScanPreview) return null;
    if (this.appliedScanPreview.subTotal !== null) return this.roundCurrency(this.appliedScanPreview.subTotal);
    if (this.appliedScanPreview.amount !== null) return this.roundCurrency(this.appliedScanPreview.amount);
    return null;
  }

  get receiptGrandTotal(): number | null {
    if (!this.appliedScanPreview || this.appliedScanPreview.amount === null) return null;
    return this.roundCurrency(this.appliedScanPreview.amount);
  }

  get hasReceiptLineItemMismatch(): boolean {
    const expected = this.receiptExpectedLineItemTotal;
    if (expected === null) return false;
    return Math.abs(this.computedTotal - expected) > 0.01;
  }

  // ─── SUBMIT───────────────────────
  submitExpense(form: NgForm): void {
    if (this.categories.length === 0) {
      this.messageService.add({ severity: 'error', summary: 'No Categories', detail: 'Please add at least one category.' }); return;
    }
    if (this.merchants.length === 0) {
      this.messageService.add({ severity: 'error', summary: 'No Merchants', detail: 'Please add at least one merchant.' }); return;
    }
    if (form.invalid) {
      form.control.markAllAsTouched();
      this.messageService.add({ severity: 'error', summary: 'Form Invalid', detail: 'Please fill in all required fields.' }); return;
    }
    if (!this.expenseSummary.quantity || Number(this.expenseSummary.quantity) < 1) {
      this.messageService.add({ severity: 'error', summary: 'Invalid Quantity', detail: 'Quantity must be at least 1.' }); return;
    }
    if (!this.hasValidLineItems()) {
      this.messageService.add({ severity: 'error', summary: 'Invalid Line Items', detail: 'Add at least one line item with quantity and prices greater than zero.' }); return;
    }
    if (!this.expenseSummary.amount || Number(this.expenseSummary.amount) <= 0) {
      this.messageService.add({ severity: 'error', summary: 'Invalid Amount', detail: 'Amount must be greater than 0.' }); return;
    }
    if (this.companyReceiptFiles.length === 0) {
      this.messageService.add({ severity: 'error', summary: 'Missing Receipt', detail: 'Please upload at least one receipt file.' }); return;
    }
    if (this.expenseSummary.paidBy === 'EMPLOYEE' && this.employeeReceiptFiles.length === 0) {
      this.messageService.add({ severity: 'error', summary: 'Missing Employee Receipt', detail: 'Please upload the employee receipt file.' }); return;
    }

    const selectedCategory = this.categories.find(c => c.name === this.expenseSummary.category);
    const selectedTax      = this.taxRates.find(t => t.rate === this.expenseSummary.taxPercentage);

    if (!selectedCategory) {
      this.messageService.add({ severity: 'error', summary: 'Invalid Category', detail: `Category "${this.expenseSummary.category}" not found.` }); return;
    }
    const currentUser = this.resolveCurrentUser();
    const finalAmount = this.computedTotal;
    const lineItems = this.normalizedLineItems();

    this.isSubmitting = true;
    this.resolveMerchantForSubmission().pipe(
      switchMap((selectedMerchant) => {
        const employeeData: any = {
          name:               this.expenseSummary.name || '',
          description:        this.buildExpenseDescription(),
          eventDate:          this.expenseSummary.eventDate
                                ? new Date(this.expenseSummary.eventDate).toISOString()
                                : new Date().toISOString(),
          quantity:           this.getLineItemsQuantity(),
          currency:           this.selectedCurrency,
          amount:             finalAmount,
          status:             'PENDING',
          paidBy:             (this.expenseSummary.paidBy || 'EMPLOYEE').toUpperCase(),
          receiptReference:   this.expenseSummary.receiptReference || '',
          bankName:           this.expenseSummary.bankName || null,
          accountName:        this.expenseSummary.accountName || null,
          accountNumber:      this.expenseSummary.accountNumber || null,
          merchantId:         selectedMerchant.id,
          categoryId:         selectedCategory.id,
          taxId:              selectedTax?.id ?? null,
          scheduledPaymentId: null,
          expenseBy:          currentUser.id,
          lineItems,
        };

        if (this.advancedPaymentData) employeeData.recurringPayment = this.advancedPaymentData;
        if (this.billSplitData)       employeeData.billSplit         = this.convertBillSplitToDTO(this.billSplitData);

        return this.expenseService.addExpense(
          employeeData,
          this.companyReceiptFiles[0]  || undefined,
          this.employeeReceiptFiles[0] || undefined
        );
      })
    ).subscribe({
      next: (createdExpense: any) => {
        this.isSubmitting = false;
        this.expensesLastCreatedId = createdExpense?.id ?? null;
        this.messageService.add({
          severity: 'success',
          summary:  'Expense Submitted',
          detail:   'Your expense has been submitted and is pending review.'
        });

        this.notifyAdmins(
          currentUser.fullname,
          createdExpense?.id ?? 'pending',
          createdExpense?.name || this.expenseSummary.name || '',
          finalAmount,
          this.selectedCurrency,
          currentUser.email
        );

        this.resetForm();
        form.resetForm();
        this.advancedPaymentData = undefined;
        this.billSplitData       = undefined;
        this.showAdvancedPayment = false;
        this.showBillSplit       = false;
        this.router.navigate(['/admin/expenses']);
      },
      error: (error: any) => {
        this.isSubmitting = false;
        console.error('[ExpenseForm] submitExpense failed:', error);
        this.messageService.add({
          severity: 'error',
          summary:  'Submission Failed',
          detail:   error.error?.message || error.message || 'An error occurred. Please try again.'
        });
      }
    });
  }

  // ─── Data loaders─────────────────
  private loadCategories(): void {
    this.expenseService.getCategories().subscribe({
      next:  (c) => { this.categories = c; this.categoryNames = c.map(x => x.name); },
      error: (err) => { console.error(err); this.categories = []; this.categoryNames = []; }
    });
  }

  private loadMerchants(): void {
    this.expenseService.getMerchants().subscribe({
      next:  (m) => { this.merchants = m; },
      error: (err) => { console.error(err); this.merchants = []; }
    });
  }

  private loadTaxRates(): void {
    this.expenseService.getTaxRates().subscribe({
      next:  (t) => { this.taxRates = t; },
      error: (err) => { console.error(err); this.taxRates = []; }
    });
  }

  // ─── Multi-file handling──────────
  onDragOver(e: DragEvent)  { e.preventDefault(); e.stopPropagation(); this.isDragging = true; }
  onDragLeave(e: DragEvent) { e.preventDefault(); e.stopPropagation(); this.isDragging = false; }

  onFileDrop(e: DragEvent, type: string): void {
    e.preventDefault(); e.stopPropagation(); this.isDragging = false;
    const files = Array.from(e.dataTransfer?.files || []);
    files.forEach(f => this.assignFile(f, type));
  }

  onFileSelect(e: Event, type: string): void {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    files.forEach(f => this.assignFile(f, type));
    input.value = '';
  }

  assignFile(file: File, type: string): void {
    if (file.size > 10 * 1024 * 1024) {
      this.messageService.add({ severity: 'error', summary: 'File Too Large', detail: `${file.name} exceeds 10 MB.` }); return;
    }
    if (!['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(file.type)) {
      this.messageService.add({ severity: 'error', summary: 'Invalid Type', detail: 'JPG, PNG or PDF only.' }); return;
    }

    if (type === 'receipt') {
      this.companyReceiptFiles.push(file);
      this.companyReceiptPreviews.push(this.isImageFile(file) ? URL.createObjectURL(file) : '');
    } else if (type === 'employeeReceipt') {
      this.employeeReceiptFiles.push(file);
      this.employeeReceiptPreviews.push(this.isImageFile(file) ? URL.createObjectURL(file) : '');
    }
  }

  removeFile(type: string, index: number): void {
    if (type === 'receipt') {
      if (this.companyReceiptPreviews[index]) URL.revokeObjectURL(this.companyReceiptPreviews[index]);
      this.companyReceiptFiles.splice(index, 1);
      this.companyReceiptPreviews.splice(index, 1);
    } else if (type === 'employeeReceipt') {
      if (this.employeeReceiptPreviews[index]) URL.revokeObjectURL(this.employeeReceiptPreviews[index]);
      this.employeeReceiptFiles.splice(index, 1);
      this.employeeReceiptPreviews.splice(index, 1);
    }
  }

  isImageFile(f: File | null): boolean { return !!f && f.type.startsWith('image/'); }
  isPdfFile(f: File | null): boolean   { return !!f && f.type === 'application/pdf'; }

  replaceFiles(type: 'receipt' | 'employeeReceipt', file: File): void {
    if (type === 'receipt') {
      this.companyReceiptPreviews.filter(Boolean).forEach(url => URL.revokeObjectURL(url));
      this.companyReceiptFiles = [];
      this.companyReceiptPreviews = [];
    } else {
      this.employeeReceiptPreviews.filter(Boolean).forEach(url => URL.revokeObjectURL(url));
      this.employeeReceiptFiles = [];
      this.employeeReceiptPreviews = [];
    }
    this.assignFile(file, type);
  }

  private revokeAllPreviews(): void {
    [...this.companyReceiptPreviews, ...this.employeeReceiptPreviews]
      .filter(Boolean).forEach(url => URL.revokeObjectURL(url));
    this.companyReceiptPreviews  = [];
    this.employeeReceiptPreviews = [];
  }

  // ─── Category / Merchant / Tax modals ────────────────────────────────────
  openModal(type: 'category' | 'merchant' | 'tax') {
    if (type === 'category') this.showCategoryModal = true;
    else if (type === 'merchant') this.showMerchantModal = true;
    else this.showTaxModal = true;
  }

  closeModal(type: 'category' | 'merchant' | 'tax') {
    if (type === 'category')      { this.showCategoryModal = false; this.newCategoryData = { name: '', description: '' }; }
    else if (type === 'merchant') { this.showMerchantModal = false; this.newMerchantData = { name: '', phoneNumber: '', address: '', emailAddress: '', contactPersonName: '' }; }
    else                          { this.showTaxModal      = false; this.newTaxData = { name: '', rate: 0, description: '' }; }
  }

  addNewCategory() {
    const name = this.newCategoryData.name?.trim();
    if (!name) return;
    if (this.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      this.messageService.add({ severity: 'error', summary: 'Duplicate', detail: 'Category already exists.' }); return;
    }
    this.expenseService.addCategory({ id: 0, name, description: this.newCategoryData.description?.trim() || '' }).subscribe({
      next: (s) => {
        this.categories = [...this.categories, s];
        this.expenseSummary.category = s.name;
        this.messageService.add({ severity: 'success', summary: 'Added', detail: `"${name}" created.` });
        this.closeModal('category');
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Failed', detail: 'Could not save category.' })
    });
  }

  removeCategory(id: number) {
    const cat = this.categories.find(c => c.id === id); if (!cat) return;
    this.categories = this.categories.filter(c => c.id !== id);
    if (this.expenseSummary.category === cat.name) this.expenseSummary.category = null;
    this.messageService.add({ severity: 'success', summary: 'Removed', detail: `"${cat.name}" removed.` });
  }

  addNewMerchant() {
    const name = this.newMerchantData.name?.trim();
    if (!name) { this.messageService.add({ severity: 'error', summary: 'Required', detail: 'Merchant name is required.' }); return; }
    this.expenseService.addMerchant({ id: 0, ...this.newMerchantData, name } as any).subscribe({
      next: (s) => {
        this.merchants = [...this.merchants, s];
        this.expenseSummary.merchant = s.name;
        this.messageService.add({ severity: 'success', summary: 'Added', detail: `"${name}" created.` });
        this.closeModal('merchant');
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Failed', detail: 'Could not save merchant.' })
    });
  }

  private expensesLastCreatedId: number | null = null;

  private resolveMerchantForSubmission(): Observable<{ id: number; name: string }> {
    const merchantName = (this.expenseSummary.merchant || '').trim();
    const selectedMerchant = this.merchants.find(m => m.name === merchantName);
    if (selectedMerchant) {
      return of({ id: selectedMerchant.id, name: selectedMerchant.name });
    }

    if (!merchantName) {
      return new Observable((subscriber) => {
        subscriber.error(new Error('Merchant is required.'));
      });
    }

    const payload = {
      id: 0,
      name: merchantName,
      phoneNumber: this.newMerchantData.phoneNumber || '',
      address: this.newMerchantData.address || '',
      emailAddress: this.newMerchantData.emailAddress || '',
      contactPersonName: this.newMerchantData.contactPersonName || '',
    };

    return this.expenseService.addMerchant(payload as any).pipe(
      map((saved) => {
        this.merchants = [...this.merchants, saved];
        this.expenseSummary.merchant = saved.name;
        return { id: saved.id, name: saved.name };
      })
    );
  }

  addNewTaxRate() {
    const name = this.newTaxData.name?.trim();
    if (!name || this.newTaxData.rate < 0) {
      this.messageService.add({ severity: 'error', summary: 'Invalid', detail: 'Name and valid rate required.' }); return;
    }
    if (this.taxRates.some(t => t.name.toLowerCase() === name.toLowerCase())) {
      this.messageService.add({ severity: 'error', summary: 'Duplicate', detail: 'Tax rate already exists.' }); return;
    }
    this.expenseService.addTaxRate({ id: 0, name, rate: this.newTaxData.rate, description: this.newTaxData.description?.trim() }).subscribe({
      next: (s) => {
        this.taxRates = [...this.taxRates, s];
        this.expenseSummary.taxPercentage = s.rate;
        this.messageService.add({ severity: 'success', summary: 'Added', detail: `"${name}" created.` });
        this.closeModal('tax');
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Failed', detail: 'Could not save tax rate.' })
    });
  }

  // ─── Advanced payment─────────────
  onAdvancedPaymentSave(p: RecurringPayment)  { this.advancedPaymentData = p; this.showAdvancedPayment = false; }
  onAdvancedPaymentCancel()                    { this.showAdvancedPayment = false; }

  // ─── Bill split───────────────────
  openBillSplit() {
    this.billSplitData = { enabled: true, method: 'equal', participants: [], totalAmount: this.computedTotal };
    this.generateParticipants();
    this.showBillSplit = true;
  }

  generateParticipants() {
    if (!this.billSplitData) return;
    this.billSplitData.participants = Array.from({ length: this.numParticipants }, (_, i) =>
      ({ id: `${i + 1}`, name: `Person ${i + 1}`, shareAmount: 0, sharePercent: 0 } as BillSplitParticipant));
    if (this.billSplitData.method === 'equal') this.autoDistributeEqual();
  }

  autoDistributeEqual() {
    if (!this.billSplitData?.participants.length) return;
    const pp = this.computedTotal / this.billSplitData.participants.length;
    this.billSplitData.participants.forEach(p => (p.shareAmount = pp));
    this.billSplitData.totalAmount = this.computedTotal;
  }

  saveBillSplit() {
    this.splitError = null; if (!this.billSplitData) return;
    const total = this.computedTotal;
    if (this.billSplitData.method === 'equal') this.autoDistributeEqual();
    if (this.billSplitData.method === 'percentage') {
      const s = this.billSplitData.participants.reduce((a, p) => a + (p.sharePercent || 0), 0);
      if (s !== 100) { this.splitError = 'Percentages must add up to 100%.'; return; }
      this.billSplitData.participants.forEach(p => (p.shareAmount = (p.sharePercent! / 100) * total));
    }
    if (this.billSplitData.method === 'amount') {
      const s = this.billSplitData.participants.reduce((a, p) => a + (p.shareAmount || 0), 0);
      if (s !== total) { this.splitError = `Amounts must add up to ${total}.`; return; }
    }
    this.billSplitData.totalAmount = total;
    this.showBillSplit = false;
  }

  removeBillSplit() { this.billSplitData = undefined; this.showBillSplit = false; }

  private convertBillSplitToDTO(b: BillSplit | undefined): any {
    if (!b) return undefined;
    return {
      splitMethod:    b.method.toUpperCase(),
      numberOfPeople: b.participants.length,
      totalAmount:    b.totalAmount || 0,
      shares:         b.participants.map(p => ({ personName: p.name || 'Unknown', shareAmount: p.shareAmount || 0 }))
    };
  }

  // ─── Misc helpers─────────────────
  applyFilters(): void {}
  cancelExpenses()  { this.router.navigate(['/admin/expenses']); }
  goBack()          { this.router.navigate(['/admin/expenses']); }
  generateId(): string { return Math.random().toString(36).substr(2, 9); }

  addLineItem(): void {
    this.expenseSummary.lineItems = [
      ...(this.expenseSummary.lineItems || []),
      this.normalizeExpenseLineItem({ name: '', quantity: 1, unitPrice: 0, totalPrice: 0 })
    ];
  }

  removeLineItem(index: number): void {
    this.expenseSummary.lineItems.splice(index, 1);
    this.syncLineItemSummary();
  }

  updateLineItem(index: number, field: 'quantity' | 'unitPrice' | 'totalPrice', value: any): void {
    const item = this.expenseSummary.lineItems[index];
    if (!item) return;

    const numericValue = Number(value) || 0;
    if (field === 'quantity') {
      item.quantity = Math.max(1, Math.round(numericValue || 1));
    } else if (field === 'unitPrice') {
      item.unitPrice = numericValue;
    } else {
      item.totalPrice = numericValue;
      const quantity = Math.max(Number(item.quantity) || 1, 1);
      item.unitPrice = quantity > 0 ? this.roundCurrency(numericValue / quantity) : this.roundCurrency(numericValue);
    }

    this.expenseSummary.lineItems[index] = this.normalizeExpenseLineItem(item);
    this.syncLineItemSummary();
  }

  lineItemTrackBy(index: number): number {
    return index;
  }

  resetForm(): void {
    this.expenseSummary = { name: '', description: '', amount: null, merchant: '', category: null, quantity: 1, taxPercentage: null, eventDate: '', paidBy: 'COMPANY', lineItems: [] };
    this.companyReceiptFiles   = [];
    this.employeeReceiptFiles  = [];
    this.revokeAllPreviews();
    this.signatureUrl          = null;
    this.amountMode            = 'total';
    this.highlightedFields.clear();
    this.scanState             = 'idle';
    this.scannedData           = null;
    this.appliedScanPreview    = null;
    this.scannedReceiptFile    = null;
    this.scanError             = '';
    this.scanProgress          = 0;
  }

  formatAmount(value: number | string | null): string {
    const n = Number(value);
    return !isNaN(n) && value !== null ? n.toLocaleString() : '';
  }

  updateAmount(event: any): void {
    const n = Number((event.target.value || '').toString().replace(/,/g, ''));
    this.expenseSummary.amount = !isNaN(n) ? n : null;
  }

  calculateTotalAmount(): number { return this.computedTotalWithTax; }

  saveExpenseToLocalStorage(expense: any): void {
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    expenses.push(expense);
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }

  hasLineItems(): boolean {
    return Array.isArray(this.expenseSummary.lineItems) && this.expenseSummary.lineItems.length > 0;
  }

  hasValidLineItems(): boolean {
    return this.normalizedLineItems().length > 0;
  }

  getLineItemsQuantity(): number {
    return this.normalizedLineItems()
      .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 1;
  }

  getLineItemsSubtotal(): number {
    return this.roundCurrency(
      this.normalizedLineItems().reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0)
    );
  }

  private normalizedLineItems(): ExpenseLineItemDTO[] {
    return (this.expenseSummary.lineItems || [])
      .map((item: ExpenseLineItemDTO) => this.normalizeExpenseLineItem(item))
      .filter((item: ExpenseLineItemDTO) => item.name && item.quantity > 0 && item.unitPrice >= 0 && item.totalPrice > 0);
  }

  private syncLineItemSummary(): void {
    this.expenseSummary.quantity = this.getLineItemsQuantity();
    this.expenseSummary.amount = this.getLineItemsSubtotal();
  }

  private buildExpenseDescription(): string {
    const lineSummary = this.normalizedLineItems()
      .map(item => `${item.quantity} x ${item.name} @ ${item.unitPrice} = ${item.totalPrice}`)
      .join('; ');
    const notes = (this.expenseSummary.description || '').trim();
    return [lineSummary, notes].filter(Boolean).join(' | ');
  }

  private roundCurrency(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private pushBellNotification(detail: { title: string; body: string; route?: string }): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('optimax-notification', {
      detail: {
        ...detail,
        category: 'module',
      }
    }));
  }

  private generateExpenseRouteUuid(): string {
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (char) =>
      (Number(char) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(char) / 4).toString(16)
    );
  }

  private normalizeExpenseLineItem(item: Partial<ExpenseLineItemDTO>): ExpenseLineItemDTO {
    const name = (item?.name || '').trim();
    const quantity = Math.max(1, Math.round(Number(item?.quantity) || 1));
    const providedUnitPrice = Number(item?.unitPrice);
    const providedTotalPrice = Number(item?.totalPrice);

    const unitPrice = Number.isFinite(providedUnitPrice) && providedUnitPrice > 0
      ? this.roundCurrency(providedUnitPrice)
      : (Number.isFinite(providedTotalPrice) && providedTotalPrice > 0
          ? this.roundCurrency(providedTotalPrice / quantity)
          : 0);

    const totalPrice = this.roundCurrency(quantity * unitPrice);

    return {
      name,
      quantity,
      unitPrice,
      totalPrice,
    };
  }
}
