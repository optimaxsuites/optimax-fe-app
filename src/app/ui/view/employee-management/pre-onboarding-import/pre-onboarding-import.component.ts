import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, inject, OnDestroy, Output } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../shared-component/service/environments/environment.prod';
import { readFilledPreOnboardingForm } from './pdf-form-reader';

export interface ImportedEmployeeData {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  dob?: string;
  maritalStatus?: string;
  religion?: string;
  nationality?: string;
  stateOfOrigin?: string;
  lgaOfOrigin?: string;
  address?: string;
  jobTitle?: string;
  department?: string;
  employmentType?: string;
  startDate?: string;
  branch?: string;
  highestQualification?: string;
  fieldOfStudy?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  bvn?: string;
  nokName?: string;
  nokPhone?: string;
  nokEmail?: string;
  nokRelationship?: string;
  nokAddress?: string;
  g1Name?: string;
  g1Phone?: string;
  g1Email?: string;
  g2Name?: string;
  g2Phone?: string;
  g2Email?: string;
}

/** The same data with empty fields dropped, so merging never blanks out a value. */
function withoutBlanks(data: ImportedEmployeeData): ImportedEmployeeData {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== ''));
}

@Component({
  selector: 'app-pre-onboarding-import',
  templateUrl: './pre-onboarding-import.component.html',
  styleUrl: './pre-onboarding-import.component.scss'
})
export class PreOnboardingImportComponent implements OnDestroy {
  @Output() importComplete = new EventEmitter<ImportedEmployeeData>();
  @Output() cancel = new EventEmitter<void>();

  private readonly http = inject(HttpClient);
  private readonly extractUrl = `${environment.apiBaseUrl}/x/api/v2/ai/document/extract-form`;

  state: 'upload' | 'processing' | 'review' = 'upload';
  progress = 0;
  progressLabel = 'Initialising...';
  isDragOver = false;
  error = '';
  /** Shown above the review fields when part of the form couldn't be read. */
  notice = '';
  previewUrl: string | null = null;

  data: ImportedEmployeeData = {};

  // ── File drop / select ──────────────────────────────────────────────────────
  onDragOver(e: DragEvent) { e.preventDefault(); this.isDragOver = true; }
  onDragLeave() { this.isDragOver = false; }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.isDragOver = false;
    const file = e.dataTransfer?.files[0];
    if (file) this.handleFile(file);
  }

  onFileSelect(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.handleFile(file);
  }

  // ── Extraction pipeline ─────────────────────────────────────────────────────
  // PDF-to-image conversion for the AI read is handled server-side (PdfImageUtil / PDFBox), so the
  // raw file is sent for all types. pdf.js is only used locally to read typed-in PDF form values.
  async handleFile(file: File) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      this.error = 'Please upload a JPG, PNG, WEBP or PDF file.';
      return;
    }

    this.error = '';
    this.state = 'processing';
    this.progress = 10;
    this.setPreviewUrl(null);

    try {
      let fromPdf: ImportedEmployeeData = {};

      // Images get an inline preview; PDFs are rendered server-side so no preview here.
      if (file.type === 'application/pdf') {
        this.progressLabel = 'Reading PDF...';
        this.progress = 20;
        fromPdf = await this.readPdfFormValues(file).catch(() => ({}));
      } else {
        this.setPreviewUrl(URL.createObjectURL(file));
      }

      this.progressLabel = 'Reading form with AI...';
      this.progress = 30;

      const form = new FormData();
      form.append('file', file);

      // The AI read covers scans and photos (and the tick boxes on older copies of the form).
      let fromAi: ImportedEmployeeData = {};
      let aiError = '';
      try {
        const result = await firstValueFrom(this.http.post<any>(this.extractUrl, form));
        const payload = result?.data ?? result?.result ?? result;
        if (payload?.error) aiError = String(payload.error);
        else if (payload && typeof payload === 'object') fromAi = this.mapResult(payload);
      } catch (httpErr: any) {
        const isNetwork = httpErr?.status === 0 || httpErr?.error instanceof ProgressEvent;
        aiError = httpErr?.error?.message
          ?? (typeof httpErr?.error === 'string' ? httpErr.error : null)
          ?? httpErr?.message
          ?? (isNetwork ? 'could not reach the server. Please check your connection.' : `HTTP ${httpErr?.status ?? '?'}`);
        console.error('extract-form HTTP error', httpErr);
      }

      this.progress = 100;
      this.progressLabel = 'Done';

      // What the PDF itself says wins; the AI fills the gaps.
      const merged = { ...withoutBlanks(fromAi), ...withoutBlanks(fromPdf) };
      if (!Object.keys(merged).length) {
        this.error = aiError
          ? `Couldn't read the form: ${aiError}`
          : "Couldn't find any details on this form. Check the file is the filled-in form, or enter the details manually.";
        this.state = 'upload';
        return;
      }

      this.data = merged;
      const unticked = ([['gender', 'gender'], ['maritalStatus', 'marital status'], ['religion', 'religion'], ['employmentType', 'employment type']] as const)
        .filter(([key]) => !merged[key])
        .map(([, label]) => label);
      this.notice = unticked.length
        ? `Couldn't read ${unticked.join(', ')} from the form. Please select them below.`
        : '';
      this.state = 'review';

    } catch (err: any) {
      this.error = `Unexpected error: ${err?.message ?? String(err)}`;
      this.state = 'upload';
      console.error('handleFile error', err);
    }
  }

  // ── PDF form text ───────────────────────────────────────────────────────────
  /**
   * Loads pdf.js from the pdfjs-dist package the first time a PDF is dropped. Its worker code is
   * loaded into the page too (`globalThis.pdfjsWorker`), so parsing runs on the main thread and no
   * separate worker file has to be served; for one page of a form that only takes a moment.
   * The legacy build is used because the modern one needs very recent browsers (Chrome 122+,
   * Safari 18.4+) and fails outright on anything older.
   */
  private async loadPdfJs() {
    const [pdfjs, worker] = await Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.min.mjs'),
    ]);
    (globalThis as any).pdfjsWorker ??= worker;
    return pdfjs;
  }

  /** A form filled in on a computer carries its values as text: read them exactly, no AI needed. */
  private async readPdfFormValues(file: File): Promise<ImportedEmployeeData> {
    const pdfjs = await this.loadPdfJs();
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    try {
      return await readFilledPreOnboardingForm(await loadingTask.promise);
    } finally {
      await loadingTask.destroy();
    }
  }

  // ── Map AI response → ImportedEmployeeData ─────────────────────────────────
  private mapResult(r: any): ImportedEmployeeData {
    const s = (v: any) => (v && String(v).trim()) || undefined;
    return {
      firstName:           s(r.firstName),
      lastName:            s(r.lastName),
      middleName:          s(r.middleName),
      dob:                 s(r.dob),
      gender:              s(r.gender),
      maritalStatus:       s(r.maritalStatus),
      religion:            s(r.religion),
      nationality:         s(r.nationality),
      stateOfOrigin:       s(r.stateOfOrigin),
      lgaOfOrigin:         s(r.lgaOfOrigin),
      phone:               s(r.phone),
      email:               s(r.email),
      address:             s(r.address),
      department:          s(r.department),
      jobTitle:            s(r.jobTitle),
      highestQualification: s(r.highestQualification),
      fieldOfStudy:        s(r.fieldOfStudy),
      employmentType:      s(r.employmentType),
      startDate:           s(r.startDate),
      branch:              s(r.branch),
      bankName:            s(r.bankName),
      accountName:         s(r.accountName),
      accountNumber:       s(r.accountNumber),
      bvn:                 s(r.bvn),
      nokName:             s(r.nokName),
      nokRelationship:     s(r.nokRelationship),
      nokPhone:            s(r.nokPhone),
      nokEmail:            s(r.nokEmail),
      nokAddress:          s(r.nokAddress),
      g1Name:              s(r.g1Name),
      g1Phone:             s(r.g1Phone),
      g1Email:             s(r.g1Email),
      g2Name:              s(r.g2Name),
      g2Phone:             s(r.g2Phone),
      g2Email:             s(r.g2Email),
    };
  }

  ngOnDestroy(): void {
    this.setPreviewUrl(null);
  }

  /** Replaces the preview, releasing the previous object URL. */
  private setPreviewUrl(url: string | null): void {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = url;
  }

  // ── Actions ─────────────────────────────────────────────────────────────────
  createEmployee() { this.importComplete.emit({ ...this.data }); }

  reset() {
    this.state = 'upload';
    this.data = {};
    this.setPreviewUrl(null);
    this.error = '';
    this.notice = '';
    this.progress = 0;
    this.progressLabel = 'Initialising...';
  }
}
