import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, inject, OnDestroy, Output } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../shared-component/service/environments/environment.prod';

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
      let imageFile: File;

      if (file.type === 'application/pdf') {
        this.progressLabel = 'Rendering PDF page...';
        this.progress = 20;
        const blob = await this.pdfFirstPageToBlob(file);
        this.setPreviewUrl(URL.createObjectURL(blob));
        imageFile = new File([blob], 'form.jpg', { type: 'image/jpeg' });
      } else {
        imageFile = file;
        this.setPreviewUrl(URL.createObjectURL(file));
      }

      this.progressLabel = 'Reading form with AI...';
      this.progress = 50;

      const form = new FormData();
      form.append('file', imageFile);

      let result: any;
      try {
        result = await firstValueFrom(this.http.post<any>(this.extractUrl, form));
      } catch (httpErr: any) {
        const msg = httpErr?.error?.message ?? httpErr?.error ?? httpErr?.message ?? String(httpErr);
        this.error = `Extraction request failed: ${msg}`;
        this.state = 'upload';
        console.error('extract-form HTTP error', httpErr);
        return;
      }

      this.progress = 100;
      this.progressLabel = 'Done';

      if (result?.error) {
        this.error = `AI extraction error: ${result.error}`;
        this.state = 'upload';
        return;
      }

      this.data = this.mapResult(result);
      this.state = 'review';

    } catch (err: any) {
      this.error = `Unexpected error: ${err?.message ?? String(err)}`;
      this.state = 'upload';
      console.error('handleFile error', err);
    }
  }

  // ── PDF → JPEG ──────────────────────────────────────────────────────────────
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

  private async pdfFirstPageToBlob(file: File): Promise<Blob> {
    const pdfjs = await this.loadPdfJs();
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    try {
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2.5 });

      const canvas = document.createElement('canvas');
      canvas.width  = viewport.width;
      canvas.height = viewport.height;
      // The main app installs pdfjs 4 (needs canvasContext); this project declares pdfjs 6 (uses canvas).
      const renderParams: any = { canvas, canvasContext: canvas.getContext('2d'), viewport };
      await page.render(renderParams).promise;

      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas export failed')), 'image/jpeg', 0.95);
      });
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
    this.progress = 0;
    this.progressLabel = 'Initialising...';
  }
}
