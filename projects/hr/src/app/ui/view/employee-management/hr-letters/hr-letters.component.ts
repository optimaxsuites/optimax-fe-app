import { Component, OnInit } from '@angular/core';
import { CompanyProfileService } from 'projects/settings/src/app/ui/sharedComponents/service/company-profile/company-profile.service';
import { EmployeeService } from '../../../service/employee.service';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export type LetterTone = 'formal' | 'professional' | 'friendly';

export interface LetterType {
  key: string;
  label: string;
  icon: string;
  defaultTemplates: Record<LetterTone, string>;
}

@Component({
  selector: 'app-hr-letters',
  templateUrl: './hr-letters.component.html',
  styleUrl: './hr-letters.component.scss',
})
export class HrLettersComponent implements OnInit {
  employee: any = {};
  companyProfile: any = {};
  salaryDetails: any = null;
  allowanceTypes: any[] = [];
  bonusTypes: any[] = [];
  deductionTypes: any[] = [];
  generatingPdf = false;
  sendingLetter = false;
  includeSalaryBreakdown = false;
  today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  selectedLetterKey = 'employment';
  selectedTone: LetterTone = 'formal';
  editableBody = '';
  isEditing = false;

  showSignaturePad = false;
  signatureDataUrl = '';
  private signatureCanvas: HTMLCanvasElement | null = null;
  private signatureCtx: CanvasRenderingContext2D | null = null;
  private isDrawing = false;

  readonly tones: { key: LetterTone; label: string }[] = [
    { key: 'formal',       label: 'Formal' },
    { key: 'professional', label: 'Professional' },
    { key: 'friendly',     label: 'Friendly' },
  ];

  readonly letterTypes: LetterType[] = [
    {
      key: 'employment',
      label: 'Employment Confirmation',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      defaultTemplates: {
        formal: `<p>Dear <strong>[Employee Name]</strong>,</p>
<p>We write to confirm your employment with <strong>[Company Name]</strong> in the capacity of <strong>[Job Title]</strong> in the <strong>[Department]</strong> department, effective <strong>[Start Date]</strong>.</p>
<p>This letter confirms that you are a full-time member of staff and that your employment is subject to the terms and conditions contained in your employment contract and the staff handbook.</p>
<p>Your remuneration and conditions of employment are as specified in your employment contract. Any changes will be communicated to you in writing.</p>
<p>We trust that your continued commitment will contribute to the success of this organisation.</p>
<p>Yours faithfully,</p>`,
        professional: `<p>Dear <strong>[Employee Name]</strong>,</p>
<p>This letter serves to confirm that you are employed with <strong>[Company Name]</strong> as a <strong>[Job Title]</strong> in the <strong>[Department]</strong> department. Your employment commenced on <strong>[Start Date]</strong>.</p>
<p>Your role and responsibilities are as defined in your job description, and your employment terms remain as agreed in your contract of employment.</p>
<p>Should you require any further clarification regarding your employment status, please do not hesitate to contact the HR department.</p>
<p>Best regards,</p>`,
        friendly: `<p>Hi <strong>[Employee Name]</strong>,</p>
<p>Just to confirm — you are officially a member of the <strong>[Company Name]</strong> team, working as a <strong>[Job Title]</strong> in the <strong>[Department]</strong> department since <strong>[Start Date]</strong>.</p>
<p>Your employment terms are set out in the contract you signed, and nothing has changed on that front. Feel free to reach out to HR if you have any questions.</p>
<p>Thanks,</p>`,
      },
    },
    {
      key: 'promotion',
      label: 'Promotion Letter',
      icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
      defaultTemplates: {
        formal: `<p>Dear <strong>[Employee Name]</strong>,</p>
<p>I am pleased to inform you that, following a thorough review of your performance and contribution to <strong>[Company Name]</strong>, the management has approved your promotion to the position of <strong>[New Job Title]</strong> in the <strong>[Department]</strong> department, effective <strong>[Effective Date]</strong>.</p>
<p>This promotion is a recognition of your dedication, professionalism, and the value you have consistently added to the organisation. Your new responsibilities and revised terms of employment will be communicated to you separately.</p>
<p>We have every confidence that you will continue to excel in your new role and look forward to your continued contribution to the success of our organisation.</p>
<p>Yours sincerely,</p>`,
        professional: `<p>Dear <strong>[Employee Name]</strong>,</p>
<p>Congratulations on your promotion. Following a performance review, management is pleased to confirm your appointment as <strong>[New Job Title]</strong> in the <strong>[Department]</strong> department, effective <strong>[Effective Date]</strong>.</p>
<p>Your revised responsibilities and updated compensation details will be shared with you by the HR department. We expect you to continue maintaining the high standards you have demonstrated in your previous role.</p>
<p>Best regards,</p>`,
        friendly: `<p>Hi <strong>[Employee Name]</strong>,</p>
<p>Great news — you have been promoted to <strong>[New Job Title]</strong> in the <strong>[Department]</strong> department, starting from <strong>[Effective Date]</strong>!</p>
<p>This is well deserved, and the team is excited to see what you will achieve in this new role. HR will be in touch with updated contract details shortly.</p>
<p>Congratulations again!</p>`,
      },
    },
    {
      key: 'warning',
      label: 'Warning Letter',
      icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      defaultTemplates: {
        formal: `<p>Dear <strong>[Employee Name]</strong>,</p>
<p>This letter constitutes a formal warning regarding your conduct/performance at <strong>[Company Name]</strong>.</p>
<p>It has come to the attention of management that on <strong>[Date of Incident]</strong>, you were found to have <strong>[Description of Issue]</strong>. This is in contravention of the company's policies and code of conduct.</p>
<p>You are hereby warned that a recurrence of this conduct or failure to meet the required performance standards within the stipulated period will result in further disciplinary action, which may include termination of employment.</p>
<p>You are advised to treat this matter with the utmost seriousness. A copy of this letter will be placed on your personnel file.</p>
<p>Yours sincerely,</p>`,
        professional: `<p>Dear <strong>[Employee Name]</strong>,</p>
<p>This letter serves as a formal warning regarding <strong>[Description of Issue]</strong> which occurred on <strong>[Date of Incident]</strong>.</p>
<p>This behaviour is inconsistent with the standards expected by <strong>[Company Name]</strong>. You are required to address this issue immediately and ensure it does not recur.</p>
<p>Failure to improve may result in further disciplinary action. You have the right to respond to this warning in writing within 5 working days.</p>
<p>Best regards,</p>`,
        friendly: `<p>Hi <strong>[Employee Name]</strong>,</p>
<p>We need to bring something to your attention. On <strong>[Date of Incident]</strong>, there was an issue regarding <strong>[Description of Issue]</strong> that did not meet our expected standards.</p>
<p>We want to give you the opportunity to address this and get back on track. Please take this seriously and reach out to your manager or HR if you need support.</p>
<p>This note will be on record. Let's work together to move forward positively.</p>`,
      },
    },
    {
      key: 'query',
      label: 'Query Letter',
      icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      defaultTemplates: {
        formal: `<p>Dear <strong>[Employee Name]</strong>,</p>
<p>It has come to the attention of management that on <strong>[Date of Incident]</strong>, you were involved in/engaged in <strong>[Description of Issue]</strong>.</p>
<p>You are hereby requested to provide a written explanation of your conduct/action within <strong>48 hours</strong> of receipt of this letter. Your response will be reviewed by management, and a decision will be made thereafter.</p>
<p>Please note that failure to respond within the stipulated time will be treated as admission of the allegation and appropriate disciplinary action will be taken.</p>
<p>Yours sincerely,</p>`,
        professional: `<p>Dear <strong>[Employee Name]</strong>,</p>
<p>This is to formally query you regarding <strong>[Description of Issue]</strong> which took place on <strong>[Date of Incident]</strong>.</p>
<p>Kindly submit a written response within <strong>48 hours</strong> explaining your actions. Your response will be taken into consideration before any disciplinary decision is made.</p>
<p>Best regards,</p>`,
        friendly: `<p>Hi <strong>[Employee Name]</strong>,</p>
<p>We need to hear your side of things regarding what happened on <strong>[Date of Incident]</strong> concerning <strong>[Description of Issue]</strong>.</p>
<p>Please send us a written response within <strong>48 hours</strong> so we can understand the full picture before taking any further steps.</p>`,
      },
    },
    {
      key: 'suspension',
      label: 'Suspension Letter',
      icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
      defaultTemplates: {
        formal: `<p>Dear <strong>[Employee Name]</strong>,</p>
<p>Further to the investigation into the matter of <strong>[Description of Issue]</strong>, and pending the conclusion of the disciplinary process, you are hereby suspended from duty without pay/with pay effective <strong>[Suspension Start Date]</strong> until further notice.</p>
<p>During the period of suspension, you are required to remain available for questioning and to cooperate fully with the investigation. You are not to attend your place of work or contact colleagues regarding this matter without prior authorisation from management.</p>
<p>You will be notified in writing when the suspension is lifted. This letter shall serve as your official notification.</p>
<p>Yours sincerely,</p>`,
        professional: `<p>Dear <strong>[Employee Name]</strong>,</p>
<p>This is to inform you that you are suspended from work effective <strong>[Suspension Start Date]</strong> pending an investigation into <strong>[Description of Issue]</strong>.</p>
<p>You are required to cooperate with the investigation and must not attend work during this period. You will be notified of the outcome in writing.</p>
<p>Best regards,</p>`,
        friendly: `<p>Hi <strong>[Employee Name]</strong>,</p>
<p>As a result of the situation surrounding <strong>[Description of Issue]</strong>, you are being suspended from work starting <strong>[Suspension Start Date]</strong> while we carry out an investigation.</p>
<p>Please stay available and cooperate with the process. We will get back to you with an update as soon as possible.</p>`,
      },
    },
    {
      key: 'experience',
      label: 'Experience / Reference Letter',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      defaultTemplates: {
        formal: `<p>To Whom It May Concern,</p>
<p>This is to certify that <strong>[Employee Name]</strong> was employed by <strong>[Company Name]</strong> from <strong>[Start Date]</strong> to <strong>[End Date]</strong> in the capacity of <strong>[Job Title]</strong> in the <strong>[Department]</strong> department.</p>
<p>During their tenure, <strong>[Employee Name]</strong> demonstrated a high level of professionalism, dedication, and competence in carrying out assigned responsibilities. Their conduct was exemplary and they were a valued member of the team.</p>
<p>We wish <strong>[Employee Name]</strong> the very best in their future endeavours and have no hesitation in recommending them for similar roles.</p>
<p>Yours faithfully,</p>`,
        professional: `<p>To Whom It May Concern,</p>
<p><strong>[Employee Name]</strong> was employed at <strong>[Company Name]</strong> as a <strong>[Job Title]</strong> from <strong>[Start Date]</strong> to <strong>[End Date]</strong>.</p>
<p>They performed their duties satisfactorily and maintained a good standing within the organisation. We recommend them as a capable and reliable professional.</p>
<p>Best regards,</p>`,
        friendly: `<p>To Whom It May Concern,</p>
<p>I am happy to confirm that <strong>[Employee Name]</strong> worked with us at <strong>[Company Name]</strong> as a <strong>[Job Title]</strong> from <strong>[Start Date]</strong> to <strong>[End Date]</strong>.</p>
<p>They were a great team member and we have no hesitation in recommending them. Feel free to reach out if you need more information.</p>`,
      },
    },
    {
      key: 'termination',
      label: 'Termination Letter',
      icon: 'M6 18L18 6M6 6l12 12',
      defaultTemplates: {
        formal: `<p>Dear <strong>[Employee Name]</strong>,</p>
<p>Following the conclusion of the disciplinary process/investigation/restructuring exercise at <strong>[Company Name]</strong>, and after careful consideration, we regret to inform you that your employment is hereby terminated with effect from <strong>[Termination Date]</strong>.</p>
<p>The grounds for this decision are as follows: <strong>[Reason for Termination]</strong>.</p>
<p>You are required to return all company property, equipment, and access materials on or before your last working day. Your final salary, including any outstanding entitlements, will be computed and paid in accordance with the terms of your employment contract and the company's HR policy.</p>
<p>Yours sincerely,</p>`,
        professional: `<p>Dear <strong>[Employee Name]</strong>,</p>
<p>This letter is to formally notify you that your employment with <strong>[Company Name]</strong> is terminated effective <strong>[Termination Date]</strong> due to <strong>[Reason for Termination]</strong>.</p>
<p>Please ensure that all company assets are returned on your last day. Your final pay and any outstanding entitlements will be processed accordingly. HR will be in touch with further details.</p>
<p>Best regards,</p>`,
        friendly: `<p>Hi <strong>[Employee Name]</strong>,</p>
<p>This is to let you know that your employment at <strong>[Company Name]</strong> is ending on <strong>[Termination Date]</strong>.</p>
<p>The reason for this decision is <strong>[Reason for Termination]</strong>. Please return any company items by your last working day. HR will reach out regarding your final pay.</p>
<p>We wish you the best going forward.</p>`,
      },
    },
  ];

  get selectedLetter(): LetterType {
    return this.letterTypes.find(l => l.key === this.selectedLetterKey) ?? this.letterTypes[0];
  }

  get companyName(): string { return this.companyProfile?.companyName || 'Company Name'; }
  get logoUrl(): string | null { return this.companyProfile?.logoUrl || null; }
  get employeeName(): string { return `${this.employee?.firstName ?? ''} ${this.employee?.lastName ?? ''}`.trim(); }
  get jobTitle(): string { return this.employee?.jobTitle || this.employee?.position || ''; }
  get department(): string { return this.employee?.department?.name || this.employee?.department || ''; }
  get startDate(): string {
    const raw: any = this.employee?.hireDate ?? this.employee?.employementStartDate ?? this.employee?.employmentStartDate ?? '';
    return this.formatDateValue(raw);
  }

  get salaryBreakdown(): {
    baseSalary: number;
    allowances: { name: string; amount: number }[];
    bonuses: { name: string; amount: number }[];
    grossTotal: number;
    deductions: { name: string; amount: number; isTax: boolean }[];
    payeMonthly: number;
    hasConfiguredTax: boolean;
    deductionsTotal: number;
    netSalary: number;
  } {
    const d = this.salaryDetails;
    const base = this.toNum(d?.baseSalary);

    const allowances = (d?.allowance ?? []).map((a: any) => ({
      name: this.allowanceTypes.find(t => t.id === (a.allowanceTypeId ?? a.typeId))?.name ?? 'Allowance',
      amount: this.toNum(a.amount ?? a.value),
    }));

    const bonuses = (d?.bonus ?? []).map((b: any) => ({
      name: this.bonusTypes.find(t => t.id === (b.bonusTypeId ?? b.typeId))?.name ?? 'Bonus',
      amount: this.toNum(b.amount ?? b.value),
    }));

    const grossTotal = base
      + allowances.reduce((s: number, a: any) => s + a.amount, 0)
      + bonuses.reduce((s: number, b: any) => s + b.amount, 0);

    const deductions = (d?.deductions ?? []).map((x: any) => {
      const type = this.deductionTypes.find(t => t.id === (x.deductionsTypeId ?? x.typeId));
      return {
        name: type?.name ?? 'Deduction',
        amount: this.toNum(x.amount ?? x.value),
        isTax: type?.isTax === true,
      };
    });

    const hasConfiguredTax = deductions.some((x: any) => x.isTax);
    const payeMonthly = hasConfiguredTax ? 0 : this.computeMonthlyPAYE(grossTotal);

    const deductionsTotal = deductions.reduce((s: number, x: any) => s + x.amount, 0) + payeMonthly;
    const netSalary = grossTotal - deductionsTotal;

    return { baseSalary: base, allowances, bonuses, grossTotal, deductions, payeMonthly, hasConfiguredTax, deductionsTotal, netSalary };
  }

  private toNum(v: any): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  private computeMonthlyPAYE(monthlyGross: number): number {
    if (!monthlyGross) return 0;
    const annual = monthlyGross * 12;
    const cra = Math.max(200000, annual * 0.01) + annual * 0.20;
    const taxable = Math.max(0, annual - cra);

    const bands = [
      { limit: 300000, rate: 0.07 },
      { limit: 300000, rate: 0.11 },
      { limit: 500000, rate: 0.15 },
      { limit: 500000, rate: 0.19 },
      { limit: 1600000, rate: 0.21 },
      { limit: Infinity, rate: 0.24 },
    ];

    let remaining = taxable;
    let paye = 0;
    for (const band of bands) {
      if (remaining <= 0) break;
      const chunk = Math.min(remaining, band.limit);
      paye += chunk * band.rate;
      remaining -= chunk;
    }
    return paye / 12;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }).format(amount);
  }

  private formatDateValue(value: any): string {
    if (!value) return '';
    let d: Date;
    if (Array.isArray(value)) {
      // Java LocalDate/LocalDateTime: [year, month, day] — month is 1-indexed
      d = new Date(value[0], (value[1] ?? 1) - 1, value[2] ?? 1);
    } else {
      d = new Date(value);
    }
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  private get storageKey(): string { return `hrLetterTemplate_${this.selectedLetterKey}_${this.selectedTone}`; }
  private get toneStorageKey(): string { return 'hrLetterDefaultTone'; }

  constructor(
    private companyProfileService: CompanyProfileService,
    private employeeService: EmployeeService,
  ) {}

  ngOnInit(): void {
    const stored = localStorage.getItem('employeeInView');
    if (stored) {
      try { this.employee = JSON.parse(stored); } catch { this.employee = {}; }
    }

    if (this.employee?.salaryDetails) {
      this.salaryDetails = this.employee.salaryDetails;
    } else if (this.employee?.level?.id) {
      this.employeeService.getSalaryById(this.employee.level.id).subscribe({
        next: (data: any) => { this.salaryDetails = Array.isArray(data) ? data[0] : data; },
        error: () => {}
      });
    }

    const cached = this.companyProfileService.get();
    if (cached) {
      this.companyProfile = cached;
    }
    this.companyProfileService.companyProfile$.subscribe((profile: any) => {
      if (profile) this.companyProfile = profile;
    });

    const savedTone = localStorage.getItem(this.toneStorageKey) as LetterTone | null;
    if (savedTone && this.tones.find(t => t.key === savedTone)) this.selectedTone = savedTone;

    this.employeeService.getAllAllowanceTypes().subscribe({ next: (d: any) => this.allowanceTypes = Array.isArray(d) ? d : (d?.content ?? []), error: () => {} });
    this.employeeService.getAllBonusTypes().subscribe({ next: (d: any) => this.bonusTypes = Array.isArray(d) ? d : (d?.content ?? []), error: () => {} });
    this.employeeService.getAllDeductionTypes().subscribe({ next: (d: any) => this.deductionTypes = Array.isArray(d) ? d : (d?.content ?? []), error: () => {} });

    this.loadTemplate();
  }

  selectLetter(key: string): void {
    this.selectedLetterKey = key;
    this.isEditing = false;
    this.loadTemplate();
  }

  selectTone(tone: LetterTone): void {
    this.selectedTone = tone;
    localStorage.setItem(this.toneStorageKey, tone);
    this.loadTemplate();
  }

  private loadTemplate(): void {
    const saved = localStorage.getItem(this.storageKey);
    this.editableBody = saved ?? this.selectedLetter.defaultTemplates[this.selectedTone];
  }

  saveTemplate(): void {
    localStorage.setItem(this.storageKey, this.editableBody);
    this.isEditing = false;
  }

  resetTemplate(): void {
    localStorage.removeItem(this.storageKey);
    this.editableBody = this.selectedLetter.defaultTemplates[this.selectedTone];
    this.isEditing = false;
  }

  getFilledBody(): string {
    return this.editableBody
      .replace(/\[Employee Name\]/g, this.employeeName || '[Employee Name]')
      .replace(/\[Company Name\]/g, this.companyName)
      .replace(/\[Job Title\]/g, this.jobTitle || '[Job Title]')
      .replace(/\[Department\]/g, this.department || '[Department]')
      .replace(/\[Start Date\]/g, this.startDate || '[Start Date]');
  }

  async generatePdf(): Promise<void> {
    this.generatingPdf = true;
    try {
      const target = document.getElementById('hr-letter-content');
      if (!target) return;
      const canvas = await html2canvas(target, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const slug = this.selectedLetter.label.toLowerCase().replace(/\s+/g, '-');
      pdf.save(`${slug}-${this.employee?.firstName ?? ''}-${this.employee?.lastName ?? ''}.pdf`);
    } finally {
      this.generatingPdf = false;
    }
  }

  hasCustomTemplate(): boolean {
    return !!localStorage.getItem(this.storageKey);
  }

  async sendToRecipient(): Promise<void> {
    const email = this.employee?.email || this.employee?.workEmail;
    if (!email) { alert('No recipient email address found for this employee.'); return; }
    this.sendingLetter = true;
    try {
      const target = document.getElementById('hr-letter-content');
      if (!target) return;
      const subject = `${this.selectedLetter.label} — ${this.employeeName}`;
      const htmlBody = target.innerHTML;
      this.employeeService.sendNotificationEmail(email, subject, htmlBody).subscribe({
        next: () => { alert(`Letter sent to ${email} successfully.`); },
        error: () => { alert('Failed to send letter. Please try again.'); },
      });
    } finally {
      this.sendingLetter = false;
    }
  }

  toggleSignaturePad(): void {
    this.showSignaturePad = !this.showSignaturePad;
    if (this.showSignaturePad) {
      setTimeout(() => this.initSignatureCanvas(), 50);
    }
  }

  private initSignatureCanvas(): void {
    this.signatureCanvas = document.getElementById('signature-canvas') as HTMLCanvasElement;
    if (!this.signatureCanvas) return;
    this.signatureCtx = this.signatureCanvas.getContext('2d');
    if (this.signatureCtx) {
      this.signatureCtx.strokeStyle = '#1a1a2e';
      this.signatureCtx.lineWidth = 2;
      this.signatureCtx.lineCap = 'round';
      this.signatureCtx.lineJoin = 'round';
    }
    this.signatureCanvas.addEventListener('mousedown', this.startDraw.bind(this));
    this.signatureCanvas.addEventListener('mousemove', this.draw.bind(this));
    this.signatureCanvas.addEventListener('mouseup', this.stopDraw.bind(this));
    this.signatureCanvas.addEventListener('mouseleave', this.stopDraw.bind(this));
    this.signatureCanvas.addEventListener('touchstart', this.touchStart.bind(this), { passive: false });
    this.signatureCanvas.addEventListener('touchmove', this.touchMove.bind(this), { passive: false });
    this.signatureCanvas.addEventListener('touchend', this.stopDraw.bind(this));
  }

  private startDraw(e: MouseEvent): void {
    if (!this.signatureCtx || !this.signatureCanvas) return;
    this.isDrawing = true;
    const rect = this.signatureCanvas.getBoundingClientRect();
    this.signatureCtx.beginPath();
    this.signatureCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }

  private draw(e: MouseEvent): void {
    if (!this.isDrawing || !this.signatureCtx || !this.signatureCanvas) return;
    const rect = this.signatureCanvas.getBoundingClientRect();
    this.signatureCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    this.signatureCtx.stroke();
  }

  private touchStart(e: TouchEvent): void {
    e.preventDefault();
    if (!this.signatureCtx || !this.signatureCanvas) return;
    const touch = e.touches[0];
    const rect = this.signatureCanvas.getBoundingClientRect();
    this.isDrawing = true;
    this.signatureCtx.beginPath();
    this.signatureCtx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
  }

  private touchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.isDrawing || !this.signatureCtx || !this.signatureCanvas) return;
    const touch = e.touches[0];
    const rect = this.signatureCanvas.getBoundingClientRect();
    this.signatureCtx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    this.signatureCtx.stroke();
  }

  private stopDraw(): void {
    if (this.isDrawing && this.signatureCanvas) {
      this.signatureDataUrl = this.signatureCanvas.toDataURL('image/png');
    }
    this.isDrawing = false;
  }

  clearSignature(): void {
    if (!this.signatureCanvas || !this.signatureCtx) return;
    this.signatureCtx.clearRect(0, 0, this.signatureCanvas.width, this.signatureCanvas.height);
    this.signatureDataUrl = '';
  }

  applySignature(): void {
    if (this.signatureCanvas) {
      this.signatureDataUrl = this.signatureCanvas.toDataURL('image/png');
    }
    this.showSignaturePad = false;
  }
}
