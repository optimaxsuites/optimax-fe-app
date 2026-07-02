import { Component, EventEmitter, Output } from '@angular/core';
import { createWorker } from 'tesseract.js';

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
  address?: string;
  jobTitle?: string;
  department?: string;
  employmentType?: string;
  startDate?: string;
  bankName?: string;
  accountNumber?: string;
  bvn?: string;
  nokName?: string;
  nokPhone?: string;
  nokEmail?: string;
  nokRelationship?: string;
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

  state: 'upload' | 'processing' | 'review' = 'upload';
  progress = 0;
  progressLabel = 'Initialising...';
  isDragOver = false;
  error = '';
  previewUrl: string | null = null;

  data: ImportedEmployeeData = {};

  // ── File drop / select ──────────────────────────────────────────────────────
  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave() {
    this.isDragOver = false;
  }

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

  // ── OCR pipeline ───────────────────────────────────────────────────────────
  async handleFile(file: File) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      this.error = 'Please upload a JPG, PNG, WEBP or PDF file.';
      return;
    }

    this.error = '';
    this.state = 'processing';
    this.progress = 0;
    this.previewUrl = null;

    try {
      let ocrSource: File | Blob;

      if (file.type === 'application/pdf') {
        this.progressLabel = 'Rendering PDF page...';
        this.progress = 8;
        ocrSource = await this.pdfFirstPageToBlob(file);
        this.previewUrl = URL.createObjectURL(ocrSource);
      } else {
        ocrSource = file;
        this.previewUrl = URL.createObjectURL(file);
      }

      const worker = await createWorker('eng', 1, {
        logger: (m: any) => {
          if (m.status === 'loading tesseract core') {
            this.progressLabel = 'Loading OCR engine...';
            this.progress = 15;
          } else if (m.status === 'loading language traineddata') {
            this.progressLabel = 'Loading language data...';
            this.progress = 35;
          } else if (m.status === 'recognizing text') {
            this.progressLabel = 'Reading form content...';
            this.progress = 45 + Math.floor(m.progress * 50);
          }
        }
      });

      const { data: { text } } = await worker.recognize(ocrSource);
      await worker.terminate();

      this.progress = 100;
      this.progressLabel = 'Done';
      this.data = this.parseFormText(text);
      this.state = 'review';
    } catch (err: any) {
      this.error = 'Could not read the file. Please try a clearer image or ensure the scan is high quality.';
      this.state = 'upload';
    }
  }

  // ── PDF → image conversion ─────────────────────────────────────────────────
  private async pdfFirstPageToBlob(file: File): Promise<Blob> {
    const arrayBuffer = await file.arrayBuffer();

    let pdfjs: any;
    try {
      pdfjs = (window as any).pdfjsLib || await import('pdfjs-dist');
    } catch {
      pdfjs = (window as any).pdfjsLib;
    }

    if (!pdfjs) throw new Error('PDF library not available.');

    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      const v: string = pdfjs.version || '4.8.69';
      pdfjs.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${v}/pdf.worker.min.mjs`;
    }

    const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const page = await pdf.getPage(1);

    const scale = 2.5;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width  = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to convert PDF page to image.'));
      }, 'image/png');
    });
  }

  // ── Text parsing ───────────────────────────────────────────────────────────
  private parseFormText(raw: string): ImportedEmployeeData {
    const result: ImportedEmployeeData = {};
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

    const emailMatch = raw.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) result.email = emailMatch[0];

    const phoneMatch = raw.match(/\b0[7-9][01]\d{8}\b/);
    if (phoneMatch) result.phone = phoneMatch[0];

    const acctMatch = raw.match(/\b\d{10}\b/);
    if (acctMatch) result.accountNumber = acctMatch[0];

    const bvnMatch = raw.match(/\b\d{11}\b/);
    if (bvnMatch) result.bvn = bvnMatch[0];

    const dobMatch = raw.match(/(\d{1,2})\s*[\/\-]\s*(\d{1,2})\s*[\/\-]\s*(\d{4})/);
    if (dobMatch) {
      result.dob = `${dobMatch[3]}-${dobMatch[2].padStart(2, '0')}-${dobMatch[1].padStart(2, '0')}`;
    }

    if (/[✓✗xX]\s*Male|Male\s*[✓✗xX]/i.test(raw)) result.gender = 'Male';
    else if (/[✓✗xX]\s*Female|Female\s*[✓✗xX]/i.test(raw)) result.gender = 'Female';

    for (const s of ['Single', 'Married', 'Divorced', 'Widowed']) {
      if (new RegExp(`[✓✗xX]\\s*${s}|${s}\\s*[✓✗xX]`, 'i').test(raw)) {
        result.maritalStatus = s;
        break;
      }
    }

    for (const r of ['Christianity', 'Islam']) {
      if (new RegExp(`[✓✗xX]\\s*${r}|${r}\\s*[✓✗xX]`, 'i').test(raw)) {
        result.religion = r;
        break;
      }
    }

    for (const t of ['Full-Time', 'Part-Time', 'Contract']) {
      if (new RegExp(`[✓✗xX]\\s*${t}|${t}\\s*[✓✗xX]`, 'i').test(raw)) {
        result.employmentType = t;
        break;
      }
    }

    result.lastName        = this.after(lines, ['SURNAME', 'Surname']);
    result.firstName       = this.after(lines, ['FIRST NAME', 'First Name']);
    result.middleName      = this.after(lines, ['MIDDLE NAME', 'Middle Name']);
    result.address         = this.after(lines, ['RESIDENTIAL ADDRESS', 'Residential Address']);
    result.department      = this.after(lines, ['DEPARTMENT', 'Department']);
    result.jobTitle        = this.after(lines, ['JOB TITLE', 'POSITION', 'Job Title', 'Position']);
    result.startDate       = this.after(lines, ['PROPOSED START DATE', 'Start Date', 'START DATE']);
    result.bankName        = this.after(lines, ['BANK NAME', 'Bank Name']);
    result.nokName         = this.after(lines, ['NEXT OF KIN']);
    result.nokPhone        = this.after(lines, ['NOK PHONE', 'Next of Kin Phone']);
    result.nokRelationship = this.after(lines, ['RELATIONSHIP', 'Relationship']);
    result.g1Name          = this.after(lines, ['GUARANTOR 1', 'Guarantor 1']);
    result.g2Name          = this.after(lines, ['GUARANTOR 2', 'Guarantor 2']);

    return result;
  }

  private readonly SKIP_LABELS = new Set([
    'SURNAME', 'FIRST NAME', 'MIDDLE NAME', 'DATE OF BIRTH', 'GENDER',
    'MARITAL STATUS', 'RELIGION', 'NATIONALITY', 'STATE OF ORIGIN', 'LGA OF ORIGIN',
    'PHONE NUMBER', 'ALTERNATE PHONE', 'EMAIL ADDRESS', 'PERSONAL EMAIL',
    'RESIDENTIAL ADDRESS', 'PERMANENT ADDRESS', 'DEPARTMENT', 'JOB TITLE',
    'EMPLOYMENT TYPE', 'PROPOSED START DATE', 'BRANCH', 'BANK NAME',
    'ACCOUNT NAME', 'ACCOUNT NUMBER', 'BVN', 'FULL NAME', 'RELATIONSHIP',
    'NEXT OF KIN', 'GUARANTOR 1', 'GUARANTOR 2', 'EMERGENCY CONTACT',
    'PERSONAL INFORMATION', 'EMPLOYMENT DETAILS', 'BANK INFORMATION',
    'DECLARATION', 'OPTIMAX', 'PRE-ONBOARDING'
  ]);

  private after(lines: string[], labels: string[]): string | undefined {
    for (let i = 0; i < lines.length; i++) {
      const up = lines[i].toUpperCase();
      if (labels.some(l => up.includes(l.toUpperCase()))) {
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const candidate = lines[j].trim();
          if (candidate && !this.SKIP_LABELS.has(candidate.toUpperCase()) &&
              candidate.length > 1 && !/^\d{1,2}$/.test(candidate)) {
            return candidate;
          }
        }
      }
    }
    return undefined;
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  createEmployee() {
    this.importComplete.emit({ ...this.data });
  }

  reset() {
    this.state = 'upload';
    this.data = {};
    this.previewUrl = null;
    this.error = '';
    this.progress = 0;
  }
}
