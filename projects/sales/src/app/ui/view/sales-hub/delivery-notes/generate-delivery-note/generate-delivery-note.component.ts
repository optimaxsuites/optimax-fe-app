import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable, Subject, forkJoin, of, takeUntil, lastValueFrom } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { SalesService } from '../../../../service/sales/sales.service';
import { SalesEmailService } from '../../../../service/sales/sales-email.service';
import { Customer, SalesDeliveryNote, SalesLpo, MerchantInfo, Quote, QuoteDocumentAttachment, SendSalesEmailRequest } from '../../../../domain/sales/sales.dto';
import { formatApiDate, parseApiDate } from '../../../../service/sales/date.util';
import { BackButtonComponent } from '../../../../shared-component/view/back-button/back-button.component';
import { DeliveryNoteDocumentComponent } from '../delivery-note-document/delivery-note-document.component';
import { TemplateTypesComponent } from '../../template-types/template-types.component';
import { QuoteTemplate, QUOTE_TEMPLATES } from '../../template-types/quote-templates.config';
import { SendEmailModalComponent } from '../../send-email-modal/send-email-modal.component';
import { SalesDocumentEmailService, renderElementToPdf } from '../../../../service/sales/sales-document-email.service';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

/**
 * The quote-driven "Generate Delivery Note" wizard (Conversion -> Receive LPO -> Generate
 * Delivery Note -> Re-upload Signed Delivery Note -> Send Invoice):
 *
 * Step 1 — upload the LPO the customer sent back. Receiving it is the gate: nothing below is
 * created until it's uploaded, since generating a delivery note without a customer's purchase
 * order isn't supposed to be possible under this flow. It's recorded as a SalesLpo
 * (/commerce/sales-lpos), and the scanned file is uploaded to it via /{id}/upload-document.
 *
 * Step 2 — once the LPO is in, the delivery note itself is created/derived (via
 * getOrCreateDeliveryNoteForQuote(), the same item/customer/address derivation
 * getOrCreateDeliveryNote() already does for an order), and the seller picks a document template
 * from the same TemplateTypesComponent gallery Quote/Invoice use. The choice is saved on the
 * note's templateId so the detail page renders it the same way.
 *
 * Step 3 — the note is shown as a live, read-only preview with the chosen template applied.
 * PO number, attention, contact person and date of delivery are editable inline here. From here
 * it's generated: downloaded as a PDF or emailed to the customer via the same sales-email
 * endpoint Quote/Invoice already use.
 */
@Component({
  selector: 'app-generate-delivery-note',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BackButtonComponent, DeliveryNoteDocumentComponent, TemplateTypesComponent, ToastModule, SendEmailModalComponent, MessageModule],
  // No component-level MessageService: toasts go through the app-wide one (shown by app.html's
  // <p-toast>) so a result like "Email sent" stays visible after routing to the detail page.
  templateUrl: './generate-delivery-note.component.html',
  styleUrls: ['./generate-delivery-note.component.scss']
})
export class GenerateDeliveryNoteComponent implements OnInit, OnDestroy {
  @ViewChild(TemplateTypesComponent) private templatePicker?: TemplateTypesComponent;

  currentStep: 1 | 2 | 3 = 1;
  isLoading = true;
  today = new Date();
  quoteId?: number;
  quote: Quote | null = null;
  customers: Customer[] = [];
  merchantInfo: MerchantInfo | null = null;

  // Step 1 — LPO upload
  lpoFileName = '';
  /** Legacy LPO file kept on the quote, from before /sales-lpos/{id}/upload-document existed. */
  private lpoFile: QuoteDocumentAttachment | null = null;
  private lpoFileRaw: File | null = null;
  private lpoFileSize?: number;
  /** The file picked in this visit, not uploaded yet — cleared once it is, so an unchanged
   *  file isn't uploaded again. */
  private lpoUpload: File | null = null;
  poNumberInput = '';
  /** The quote's SalesLpo record, once one exists. */
  lpo: SalesLpo | null = null;
  isSavingLpo = false;

  // Step 2 — template choice (applied to the step 3 preview, PDF and emailed copy)
  selectedTemplate: QuoteTemplate | null = null;
  isSavingTemplate = false;

  // Step 3 — the generated note + inline-editable delivery details. poNumber saves to the
  // SalesLpo's lpoNumber; the rest save to the same-named SalesDeliveryNote fields.
  deliveryNote: SalesDeliveryNote | null = null;
  poNumber = '';
  attention = '';
  contactPerson = '';
  deliveryDate = '';
  isSavingDetails = false;
  isSavingDraft = false;

  // Logo — uploaded here, or else the quote's own (falls back to the company profile logo)
  logo: string | null = null;
  logoFileName = '';
  private pendingLogo: QuoteDocumentAttachment | null = null;
  isDownloading = false;
  isEmailing = false;

  showSendModal = false;
  /** Inline result of the last email attempt (shown on step 3 when it failed). */
  emailOutcome: { severity: 'success' | 'info' | 'error'; text: string } | null = null;
  emailSubject = '';
  emailMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private salesService: SalesService,
    private salesEmailService: SalesEmailService,
    private messageService: MessageService,
    private documentEmail: SalesDocumentEmailService
  ) {}

  ngOnInit(): void {
    const quoteIdParam = this.route.snapshot.queryParamMap.get('quoteId');
    this.quoteId = quoteIdParam ? Number(quoteIdParam) : undefined;
    if (!this.quoteId) {
      this.isLoading = false;
      return;
    }

    forkJoin({
      quote: this.salesService.getQuoteById(this.quoteId),
      customers: this.salesService.getCustomers({ page: 0, size: 200 }),
      merchant: this.salesService.getMyMerchantInfo(),
      noteByQuoteId: this.salesService.getQuoteDeliveryNoteMap(),
      lpo: this.salesService.getSalesLpoForQuote(this.quoteId)
    }).pipe(takeUntil(this.destroy$)).subscribe(({ quote, customers, merchant, noteByQuoteId, lpo }) => {
      this.quote = quote;
      this.customers = customers.data;
      this.merchantInfo = merchant;
      this.lpo = lpo;
      this.isLoading = false;

      // Legacy fallback for notes generated before these fields had backend columns
      const meta = this.salesService.getDeliveryNoteMeta(quote);
      const existingNote = this.quoteId ? noteByQuoteId.get(this.quoteId) : undefined;
      this.poNumberInput = lpo?.lpoNumber || meta.poNumber || '';
      // A previously saved LPO (draft or not) — show it so it doesn't have to be uploaded again
      this.logo = this.salesService.getDeliveryNoteLogo(quote);
      const savedFile = this.salesService.getQuoteLpoDocument(quote);
      if (savedFile) {
        this.lpoFile = savedFile;
        this.lpoFileName = savedFile.fileName;
      }
      if (lpo?.document?.fileUrl) this.lpoFileName = lpo.document.fileName || 'LPO';
      this.attention = existingNote?.attention || meta.attention || this.selectedCustomer?.name || '';
      this.contactPerson = existingNote?.contactPerson || meta.contactPerson || merchant?.name || merchant?.companyName || '';

      if (existingNote) {
        // Already generated for this quote (e.g. they navigated back here) — skip straight to
        // the preview instead of re-asking for the LPO.
        this.deliveryNote = existingNote;
        this.poNumber = this.poNumberInput;
        this.deliveryDate = this.toDateInputValue(existingNote.deliveryDate)
          || meta.deliveryDate
          || this.toDateInputValue(existingNote.dispatchedAt || existingNote.createdAt || new Date());
        this.selectedTemplate = QUOTE_TEMPLATES.find(t => t.id === (existingNote.templateId || meta.templateId)) || null;
        this.backfillFromQuote(existingNote);
        // Straight to the preview if a template was already picked, otherwise to the template step
        this.currentStep = this.selectedTemplate ? 3 : 2;
      }
    });
  }

  /** Notes saved before they picked everything up from their quote can be missing lines, the
   *  address or the recipient — fill those in from the quote and save, so the preview, PDF and
   *  detail page all have them. */
  private backfillFromQuote(note: SalesDeliveryNote): void {
    if (!note.id) return;
    const patched = this.salesService.fillMissingFromQuote(note, this.quote, this.selectedCustomer);
    if (!patched) return;
    this.deliveryNote = patched;
    this.salesService.updateDeliveryNote(note.id, patched).pipe(takeUntil(this.destroy$)).subscribe({
      next: saved => this.deliveryNote = { ...patched, ...(saved || {}), items: saved?.items?.length ? saved.items : patched.items },
      error: err => console.error('Error filling in the delivery note from its quote:', err)
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** The customer's address on file, shown when the note itself has none saved. */
  get deliveryAddressFallback(): string {
    return this.salesService.deliveryAddressFor(this.salesService.quoteCustomer(this.quote), this.selectedCustomer);
  }

  onLogoSelected(event: any): void {
    const file: File | undefined = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.messageService.add({ severity: 'warn', summary: 'Not an Image', detail: 'Please choose an image file for the logo.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.logo = dataUrl;
      this.logoFileName = file.name;
      this.pendingLogo = {
        fileName: file.name,
        base64Content: dataUrl.split(',')[1] || '',
        contentType: file.type,
        uploadedAt: new Date().toISOString()
      };
      // Saved straight away, so a download or email right after still uses it
      this.saveLogo().subscribe({
        error: err => {
          console.error('Error saving delivery note logo:', err);
          this.messageService.add({ severity: 'error', summary: 'Logo Not Saved', detail: 'The logo shows on this preview but could not be saved. Try Save again.' });
        }
      });
    };
    reader.readAsDataURL(file);
  }

  get selectedCustomer(): Customer | null {
    const customerId = (this.quote?.customerId as any)?.id ?? this.quote?.customerId;
    return this.customers.find(c => String(c.id) === String(customerId)) || null;
  }

  // ============================================================
  // STEP 1 — UPLOAD LPO
  // ============================================================

  onLpoFileSelected(event: any): void {
    const file: File | undefined = event.target.files?.[0];
    if (!file) return;
    this.lpoFileName = file.name;
    this.lpoFileSize = file.size;
    this.lpoFileRaw = file;
    this.lpoUpload = file;
    this.lpoFile = {
      fileName: file.name,
      base64Content: '',
      contentType: file.type || 'application/pdf',
      uploadedAt: new Date()
    };
  }

  /** Creates/updates the quote's SalesLpo, then uploads a newly picked file to the dedicated
   *  endpoint — avoids embedding base64 in the quote PUT which causes ERR_CONNECTION_CLOSED on
   *  large PDFs. The record is kept before the upload, so a failed upload retries against the
   *  same LPO instead of creating another. Shared by Continue and Save Draft on step 1. */
  private saveLpo(): Observable<SalesLpo | null> {
    const upload = this.lpoUpload;
    let record$: Observable<SalesLpo>;
    if (this.lpo?.id) {
      record$ = (this.lpo.lpoNumber || '') === this.poNumberInput
        ? of(this.lpo)
        : this.salesService.updateSalesLpo(this.lpo.id, { ...this.lpo, lpoNumber: this.poNumberInput });
    } else {
      record$ = this.salesService.createSalesLpo(this.buildLpo(this.poNumberInput, this.lpoFile));
    }
    return record$.pipe(
      map(lpo => {
        this.lpo = lpo;
        this.poNumber = this.poNumberInput;
        return lpo;
      }),
      switchMap(lpo => !upload || lpo?.id == null ? of(lpo) :
        this.salesService.uploadSalesLpoDocument(lpo.id, upload).pipe(
          map(uploaded => {
            if (this.lpoUpload === upload) this.lpoUpload = null;
            this.lpoFileRaw = null;
            return this.lpo = { ...lpo, ...uploaded };
          }),
          catchError(() => of(lpo))
        ))
    );
  }

  /** Saves the LPO, then creates the delivery note linked to it (or picks up the existing one
   *  when coming back to this step) and moves on to the template. */
  submitLpo(): void {
    if (!this.quoteId || !this.lpoFileName || this.isSavingLpo) return;
    this.isSavingLpo = true;
    this.saveLpo().pipe(
      switchMap(lpo => this.salesService.getOrCreateDeliveryNoteForQuote(this.quoteId!, {
        lpoId: lpo?.id,
        attention: this.attention || undefined,
        contactPerson: this.contactPerson || undefined
      }))
    ).subscribe({
      next: (note) => {
        this.isSavingLpo = false;
        if (!note?.id) {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'LPO saved, but the delivery note could not be generated. Please try again.' });
          return;
        }
        this.deliveryNote = note;
        this.backfillFromQuote(note);
        // Keep a date already set in this visit (e.g. after coming back to step 1)
        this.deliveryDate ||= this.toDateInputValue(note.deliveryDate || note.dispatchedAt || note.createdAt || new Date());
        this.currentStep = 2;
      },
      error: (err) => {
        console.error('Error saving LPO / generating delivery note:', err);
        this.isSavingLpo = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save the LPO. Please try again.' });
      }
    });
  }

  // ============================================================
  // SAVE DRAFT — available on every step; saves and stays put
  // ============================================================

  saveDraft(): void {
    if (!this.quoteId || this.isSavingDraft) return;
    let save$: Observable<unknown>;
    if (this.currentStep === 1) {
      if (!this.lpoFileName && !this.poNumberInput) {
        this.messageService.add({ severity: 'warn', summary: 'Nothing to Save', detail: 'Choose the LPO file or enter its PO number first.' });
        return;
      }
      save$ = this.saveLpo();
    } else {
      if (!this.deliveryNote?.id) return;
      if (this.currentStep === 2) {
        this.selectedTemplate = this.templatePicker?.selectedTemplate || this.selectedTemplate || QUOTE_TEMPLATES[0];
      }
      save$ = this.persistDetails();
    }
    this.isSavingDraft = true;
    save$.subscribe({
      next: () => {
        this.isSavingDraft = false;
        this.messageService.add({ severity: 'success', summary: 'Draft Saved', detail: 'Delivery note saved as draft — you can pick up where you left off.' });
      },
      error: (err) => {
        console.error('Error saving delivery note draft:', err);
        this.isSavingDraft = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save draft. Please try again.' });
      }
    });
  }

  /** SalesLpo body for this quote. document.fileUrl starts empty — upload-document fills the
   *  document in; `file` is only a legacy one kept on the quote. */
  private buildLpo(lpoNumber: string, file: QuoteDocumentAttachment | null): Partial<SalesLpo> {
    const customerId = this.selectedCustomer?.id ?? (this.quote?.customerId as any)?.id;
    return {
      lpoNumber: lpoNumber || '',
      quoteId: this.quoteId!,
      customerId,
      amount: this.quote?.totalAmount,
      currency: this.quote?.currency,
      status: 'RECEIVED',
      document: {
        fileName: file?.fileName || '',
        fileUrl: '',
        contentType: file?.contentType || '',
        uploadedAt: new Date(file?.uploadedAt || new Date()).toISOString()
      },
      receivedBy: Number(sessionStorage.getItem('userid')) || undefined
    };
  }

  // ============================================================
  // STEP 2 — TEMPLATE
  // ============================================================

  /** Any step can be revisited: step 1 always (to change the LPO), steps 2 and 3 once the note
   *  exists. Moving forward from the template saves it first. */
  goToStep(step: 1 | 2 | 3): void {
    if (step === this.currentStep) return;
    if (step === 1) {
      this.currentStep = 1;
      return;
    }
    if (!this.deliveryNote) return;
    if (step === 3 && this.currentStep === 2) {
      this.confirmTemplate();
      return;
    }
    this.currentStep = step;
  }

  /** Saves the picked template (the gallery pre-selects its first one without emitting, so read
   *  it off the picker) and moves on to the preview. */
  confirmTemplate(): void {
    if (!this.deliveryNote?.id || this.isSavingTemplate) return;
    this.selectedTemplate = this.templatePicker?.selectedTemplate || this.selectedTemplate || QUOTE_TEMPLATES[0];
    this.isSavingTemplate = true;
    this.persistDetails().subscribe({
      next: () => {
        this.isSavingTemplate = false;
        this.currentStep = 3;
      },
      error: (err) => {
        console.error('Error saving delivery note template:', err);
        this.isSavingTemplate = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save the template choice. Please try again.' });
      }
    });
  }

  // ============================================================
  // STEP 3 — DELIVERY DETAILS + GENERATE
  // ============================================================

  saveDetails(): void {
    if (!this.deliveryNote?.id || this.isSavingDetails) return;
    this.isSavingDetails = true;
    this.persistDetails().subscribe({
      next: () => {
        this.isSavingDetails = false;
        this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Delivery details saved.' });
      },
      error: (err) => {
        console.error('Error saving delivery details:', err);
        this.isSavingDetails = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save delivery details. Please try again.' });
      }
    });
  }

  /** Saves the LPO number to the SalesLpo first (so its id can be linked), then PUTs the full
   *  note with the edited attention / contact / date / template. */
  private persistDetails(): Observable<SalesDeliveryNote> {
    const note = this.deliveryNote!;
    return this.saveLogo().pipe(
      switchMap(() => this.syncLpoNumber()),
      switchMap(lpo => {
        this.lpo = lpo;
        return this.salesService.updateDeliveryNote(note.id!, {
          ...note,
          lpoId: lpo?.id ?? note.lpoId,
          attention: this.attention || undefined,
          contactPerson: this.contactPerson || undefined,
          deliveryDate: this.deliveryDate ? new Date(this.deliveryDate).toISOString() : undefined,
          templateId: this.selectedTemplate?.id
        });
      }),
      map(updated => (this.deliveryNote = { ...note, ...(updated || {}) }))
    );
  }

  /** Stores a newly uploaded logo on the quote (no upload endpoint for logos yet). */
  private saveLogo(): Observable<unknown> {
    if (!this.pendingLogo || !this.quoteId) return of(null);
    const logo = this.pendingLogo;
    return this.salesService.saveDeliveryNoteLogo(this.quoteId, logo).pipe(
      map(quote => {
        this.quote = quote;
        if (this.pendingLogo === logo) this.pendingLogo = null;
        return quote;
      })
    );
  }

  /** Keeps the SalesLpo's number in step with the LPO Number field — updates the existing record,
   *  or creates one for notes generated before SalesLpo existed. */
  private syncLpoNumber(): Observable<SalesLpo | null> {
    if (this.lpo?.id) {
      if ((this.lpo.lpoNumber || '') === this.poNumber) return of(this.lpo);
      return this.salesService.updateSalesLpo(this.lpo.id, { ...this.lpo, lpoNumber: this.poNumber });
    }
    if (!this.poNumber) return of(null);
    const legacyFile = this.salesService.getQuoteLpoDocument(this.quote);
    return this.salesService.createSalesLpo(this.buildLpo(this.poNumber, legacyFile));
  }

  /** API dates can arrive as ISO strings or epoch seconds/ms — parseApiDate handles all of them
   *  (a bare `new Date(seconds)` lands in January 1970). */
  private toDateInputValue(date: unknown): string {
    const d = parseApiDate(date);
    return d ? d.toISOString().substring(0, 10) : '';
  }

  private async generatePdfBlob(): Promise<Blob> {
    const element = document.getElementById('generate-dn-preview');
    if (!element) throw new Error('Preview element not found');
    // Shared renderer: compressed (the old uncompressed one made ~9 MB email attachments) and multi-page.
    return renderElementToPdf(element);
  }

  async downloadPDF(): Promise<void> {
    if (this.isDownloading) return;
    this.isDownloading = true;
    try {
      const blob = await this.generatePdfBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DeliveryNote-${this.deliveryNote?.deliveryNumber || 'note'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      this.goToDetail();
    } catch (err) {
      console.error('Error generating PDF:', err);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to build PDF document.' });
    } finally {
      this.isDownloading = false;
    }
  }

  /** Opens the Send modal, pre-filled with an editable subject/message — confirmSendEmail()
   *  does the actual send once the seller confirms. */
  openSendModal(): void {
    if (!this.quote || !this.deliveryNote) return;
    const customer = this.selectedCustomer;
    const email = customer?.email || (this.quote.customerName as any)?.email || (this.quote.customerId as any)?.email || '';
    if (!email) {
      this.messageService.add({ severity: 'warn', summary: 'Missing Email', detail: 'Could not find a recipient email address for this customer.' });
      return;
    }
    const company = this.merchantInfo?.companyName || this.merchantInfo?.name || 'our company';
    this.emailSubject = `Delivery Note ${this.deliveryNote.deliveryNumber} from ${company}`;
    this.emailMessage = `Hi ${customer?.name || 'there'},\n\nPlease find attached the delivery note ${this.deliveryNote.deliveryNumber} for your order.`;
    this.showSendModal = true;
  }

  /** Sends through the shared SalesDocumentEmailService (same request as quotes/invoices, with a
   *  fallback endpoint). Sent → the note's detail page, carrying a confirmation message; not
   *  sent → stays here with the reason shown inline so it can be retried. */
  async confirmSendEmail(): Promise<void> {
    if (this.isEmailing || !this.quote || !this.deliveryNote) return;
    const note = this.deliveryNote;
    const customer = this.selectedCustomer;
    const email = customer?.email || (this.quote.customerName as any)?.email || (this.quote.customerId as any)?.email || '';

    this.isEmailing = true;
    this.emailOutcome = null;
    const pdfBlob = await this.generatePdfBlob().catch(err => {
      console.warn('[GenerateDeliveryNoteComponent] PDF attachment generation failed, sending without attachment:', err);
      return null;
    });
    const outcome = await this.documentEmail.sendDeliveryNote(note, {
      to: email,
      recipientName: note.recipientName || customer?.name || 'there',
      subject: this.emailSubject,
      message: this.emailMessage,
      companyName: this.merchantInfo?.companyName || this.merchantInfo?.name || 'our company',
      sentBy: this.merchantInfo?.email,
      pdfBlob
    });
    this.isEmailing = false;
    this.showSendModal = false;

    if (!this.documentEmail.isSent(outcome.result)) {
      this.emailOutcome = { severity: 'error', text: outcome.detail };
      return;
    }
    // Record when it went out (best-effort — the email itself already succeeded)
    this.salesService.updateDeliveryNote(note.id!, { ...note, sentAt: new Date().toISOString() }).subscribe({
      error: err => console.error('Error recording delivery note sentAt:', err)
    });
    this.goToDetail({ severity: outcome.result === 'SENT' ? 'success' : 'info', text: outcome.detail });
  }

  // ============================================================
  // NAVIGATION / UTIL
  // ============================================================

  goBack(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (this.quoteId) {
      const path = uuid ? ['/admin/sales/quotes', this.quoteId, uuid] : ['/admin/sales/quotes', this.quoteId];
      this.router.navigate(path);
      return;
    }
    this.router.navigate(['/admin/sales/sales-hub']);
  }

  finish(): void {
    this.goToDetail();
  }

  /** The generated note's detail page — where the wizard lands after a download, a successful
   *  email, or Done. Replaces the wizard's history entry so Back doesn't return to it. */
  goToDetail(flash?: { severity: string; text: string }): void {
    if (!this.deliveryNote?.id) {
      this.goBack();
      return;
    }
    const uuid = this.route.snapshot.paramMap.get('uuid');
    const path = uuid ? ['/admin/sales/delivery-notes', this.deliveryNote.id, uuid] : ['/admin/sales/delivery-notes', this.deliveryNote.id];
    // `flash` is shown as an inline message on the detail page (see DeliveryNoteDetailComponent)
    this.router.navigate(path, { replaceUrl: true, state: flash ? { flash } : undefined });
  }

  formatDate(date: unknown): string {
    return formatApiDate(date);
  }
}
