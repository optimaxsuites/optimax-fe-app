import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, inject, Output } from '@angular/core';
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
export class PreOnboardingImportComponent {
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
    this.previewUrl = null;

    try {
      let imageFile: File;

      if (file.type === 'application/pdf') {
        this.progressLabel = 'Rendering PDF page...';
        this.progress = 20;
        const blob = await this.pdfFirstPageToBlob(file);
        this.previewUrl = URL.createObjectURL(blob);
        imageFile = new File([blob], 'form.jpg', { type: 'image/jpeg' });
      } else {
        imageFile = file;
        this.previewUrl = URL.createObjectURL(file);
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

  // ── PDF → PNG ───────────────────────────────────────────────────────────────
  private async pdfFirstPageToBlob(file: File): Promise<Blob> {
    const arrayBuffer = await file.arrayBuffer();

    const pdfjs: any = (window as any).pdfjsLib;
    if (!pdfjs) throw new Error('PDF library not available. Please ensure pdf.js is loaded.');

    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      const v: string = pdfjs.version || '4.8.69';
      pdfjs.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${v}/pdf.worker.min.js`;
    }

    const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.5 });

    const canvas = document.createElement('canvas');
    canvas.width  = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas export failed')), 'image/jpeg', 0.95);
    });
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

  // ── Actions ─────────────────────────────────────────────────────────────────
  createEmployee() { this.importComplete.emit({ ...this.data }); }

  reset() {
    this.state = 'upload';
    this.data = {};
    this.previewUrl = null;
    this.error = '';
    this.progress = 0;
    this.progressLabel = 'Initialising...';
  }
}
