import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import Quill from 'quill';


export interface PlaceholderField {
  key: string;       // inserted as {{key}}
  label: string;     // shown on chip
  source: 'db' | 'manual';
  inputType: 'text' | 'email' | 'url' | 'date' | 'time' | 'datetime' | 'button';
  required: boolean;
  appliesTo?: EmailTemplate['category'][];
  helpText?: string;
}
 
export interface EmailTemplate {
  id: string;
  name: string;
  category: 'Interview' | 'Offer' | 'Rejection' | 'General' | 'Follow-up';
  subject: string;
  body: string;
  customPlaceholders: PlaceholderField[];
}

export interface TemplatePlaceholderUsage {
  key: string;
  label: string;
  source: PlaceholderField['source'];
  inputType: PlaceholderField['inputType'];
  required: boolean;
  locations: Array<'subject' | 'body'>;
  helpText?: string;
  isKnown: boolean;
}

const MAIL_TEMPLATES_STORAGE_KEY = 'settings.hr.mailTemplates';
 
const Inline = Quill.import('blots/inline') as any;
class PlaceholderBlot extends Inline {
  static blotName = 'placeholder';
  static tagName = 'span';
  static className = 'editor-placeholder-token';
  
  static create(value: string) {
    let node = super.create();
    node.setAttribute('contenteditable', 'false');
    node.innerText = value;
    return node;
  }

  static formats(node: HTMLElement) {
    return node.innerText;
  }
}
Quill.register(PlaceholderBlot);

@Component({
  selector: 'app-mail-templates',
  templateUrl: './mail-templates.component.html',
  styleUrl: './mail-templates.component.scss'
})
export class MailTemplatesComponent {
  @ViewChild('subjectEditor')
  set subjectEditor(element: ElementRef<HTMLElement> | undefined) {
    this.subjectEditorRef = element ?? null;
    this.syncSubjectEditorFromModel();
  }

 
// ─── Placeholder Fields ───────────────────────────────────────────────────
  placeholderFields: PlaceholderField[] = [
    {
      key: 'candidateName',
      label: 'Candidate Name',
      source: 'db',
      inputType: 'text',
      required: true,
      appliesTo: ['Interview', 'Offer', 'Rejection', 'General', 'Follow-up'],
      helpText: 'Pulled from the selected candidate record.',
    },
    {
      key: 'declineButton',
      label: 'Decline Button',
      source: 'db',
      inputType: 'button',
      required: true,
      appliesTo: ['Interview', 'Offer', 'Rejection', 'General', 'Follow-up'],
      helpText: 'Pulled from the related vacancy or application.',
    },
    {
      key: 'acceptButton',
      label: 'Accept Button',
      source: 'db',
      inputType: 'button',
      required: true,
      appliesTo: ['Interview', 'Offer', 'Rejection', 'General', 'Follow-up'],
      helpText: 'Pulled from the related vacancy or application.',
    },
    {
      key: 'jobTitle',
      label: 'Job Title',
      source: 'db',
      inputType: 'text',
      required: true,
      appliesTo: ['Interview', 'Offer', 'Rejection', 'General', 'Follow-up'],
      helpText: 'Pulled from the related vacancy or application.',
    },
    {
      key: 'companyName',
      label: 'Company Name',
      source: 'db',
      inputType: 'text',
      required: true,
      appliesTo: ['Interview', 'Offer', 'Rejection', 'General', 'Follow-up'],
      helpText: 'Resolved from company settings.',
    },
    {
      key: 'department',
      label: 'Department',
      source: 'db',
      inputType: 'text',
      required: false,
      appliesTo: ['Interview', 'Offer', 'General', 'Follow-up'],
      helpText: 'Use when the vacancy has a department attached.',
    },
    {
      key: 'location',
      label: 'Location',
      source: 'db',
      inputType: 'text',
      required: false,
      appliesTo: ['Interview', 'Offer', 'General'],
      helpText: 'Resolved from the vacancy or office data when available.',
    },
    {
      key: 'recruiterName',
      label: 'Recruiter Name',
      source: 'db',
      inputType: 'text',
      required: true,
      appliesTo: ['Interview', 'Offer', 'Rejection', 'General', 'Follow-up'],
      helpText: 'Resolved from the logged-in recruiter or assigned owner.',
    },
    {
      key: 'recruiterEmail',
      label: 'Recruiter Email',
      source: 'db',
      inputType: 'email',
      required: true,
      appliesTo: ['Interview', 'Offer', 'Rejection', 'General', 'Follow-up'],
      helpText: 'Resolved from the recruiter profile.',
    },
    {
      key: 'salaryRange',
      label: 'Salary Range',
      source: 'db',
      inputType: 'text',
      required: false,
      appliesTo: ['Offer'],
      helpText: 'Resolved from offer details or compensation settings.',
    },
  ];
 
  // Sample preview values — replace from context when sending
  previewValues: Record<string, string> = {
    candidateName:   'Amara Okonkwo',
    jobTitle:        'Senior Product Designer',
    companyName:     'Acme Corp',
    department:      'Product & Design',
    location:        'Lagos, Nigeria',
    recruiterName:   'Chisom Eze',
    recruiterEmail:  'chisom@acmecorp.com',
    deadlineDate:    'Friday, 25 April 2025',
    salaryRange:     '₦700,000 – ₦900,000/month',
    offerExpiryDate: 'Monday, 28 April 2025',
  };
 
  templateCategories: EmailTemplate['category'][] = [
    'Interview', 'Offer', 'Rejection', 'General', 'Follow-up',
  ];
 
  templates: EmailTemplate[] = [];
  filteredTemplates: EmailTemplate[] = [];
  selectedTemplate: EmailTemplate | null = null;
 
  templateSearch = '';
  showPreview = false;
  customPlaceholderLabel = '';
  templateFieldUsage: TemplatePlaceholderUsage[] = [];
 
  // Quill editor instance reference
  private quillEditor: any = null;
  private quillRange: any = null;
  private subjectEditorRef: ElementRef<HTMLElement> | null = null;
  private subjectRange: Range | null = null;
  private syncingSubjectEditor = false;
 
  // For subject field drop
  activeField: 'subject' | 'body' = 'body';
 
  constructor(
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private sanitizer: DomSanitizer,
  ) {}
 
  ngOnInit(): void {
    this.templates = this.loadTemplates();
    this.filteredTemplates = [...this.templates];
  }
 
  // ─── Selection & Filtering ────────────────────────────────────────────────
 
  selectTemplate(tpl: EmailTemplate): void {
    this.selectedTemplate = this.cloneTemplate(tpl);
    this.showPreview = false;
    this.activeField = 'body';
    this.subjectRange = null;
    this.refreshTemplateFieldUsage();
    setTimeout(() => this.syncSubjectEditorFromModel());
  }
 
  filterTemplates(): void {
    const q = this.templateSearch.toLowerCase();
    this.filteredTemplates = this.templates.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  }
 
  getTemplatesByCategory(category: string): EmailTemplate[] {
    return this.filteredTemplates.filter(t => t.category === category);
  }
 
  getCategoryIcon(category: string): string {
    const map: Record<string, string> = {
      'Interview':  'fa-calendar-check',
      'Offer':      'fa-envelope-open-text',
      'Rejection':  'fa-circle-xmark',
      'General':    'fa-envelope',
      'Follow-up':  'fa-rotate-right',
    };
    return map[category] ?? 'fa-envelope';
  }
 
  // ─── Create / Save / Delete ───────────────────────────────────────────────
 createNewTemplate(): void {
  const newTpl: EmailTemplate = {
    id: `tpl_${Date.now()}`,
    name: '', // Start empty to trigger placeholder
    category: 'General',
    subject: '',
    body: '',
    customPlaceholders: [],
  };
  this.templates.unshift(newTpl);
  this.filteredTemplates = [...this.templates];
  this.selectTemplate(newTpl);
  
  // Auto-focus the name input
  setTimeout(() => {
    const nameInput = document.querySelector('.template-name-input') as HTMLInputElement;
    nameInput?.focus();
  }, 0);
}
  saveTemplate(): void {
    if (!this.selectedTemplate) return;

    // Process body to convert button placeholders from spans to proper elements
    const processedTemplate = this.cloneTemplate(this.selectedTemplate);
    processedTemplate.body = this.processBodyForButtonPlaceholders(processedTemplate.body);
 
    const idx = this.templates.findIndex(t => t.id === this.selectedTemplate!.id);
    if (idx >= 0) {
      this.templates[idx] = processedTemplate;
    } else {
      this.templates.unshift(processedTemplate);
    }
    this.filteredTemplates = [...this.templates];
    this.persistTemplates();
 
    this.messageService.add({
      severity: 'success',
      summary: 'Saved',
      detail: `"${this.selectedTemplate.name}" saved successfully.`,
      life: 3000,
    });
 
    // TODO: persist via your API/service here
  }

  private processBodyForButtonPlaceholders(html: string): string {
    return html.replace(/<span[^>]*class="editor-placeholder-token"[^>]*>\{\{(\w+)\}\}<\/span>/g, (match, key) => {
      const field = this.getPlaceholderField(key, this.selectedTemplate?.category ?? 'General');
      
      if (field?.inputType === 'button') {
        // For button types, convert to <a> tag with href as the placeholder value
        return `<a href="{{${key}}}" class="email-button" style="display: inline-block; padding: 10px 20px; margin: 10px 0; background-color: #2563eb; color: white; text-decoration: none; border-radius: 4px;">${field.label}</a>`;
      }
      
      // Keep non-button placeholders as spans
      return match;
    });
  }
 
  deleteTemplate(tpl: EmailTemplate, event: Event): void {
    event.stopPropagation();
    this.confirmationService.confirm({
      message: `Delete "${tpl.name}"? This cannot be undone.`,
      accept: () => {
        this.templates = this.templates.filter(t => t.id !== tpl.id);
        this.filteredTemplates = [...this.templates];
        this.persistTemplates();
        if (this.selectedTemplate?.id === tpl.id) {
          this.selectedTemplate = null;
        }
        this.messageService.add({
          severity: 'info',
          summary: 'Deleted',
          detail: `"${tpl.name}" removed.`,
          life: 2500,
        });
      }
    });
  }
 
  // ─── Quill Editor ─────────────────────────────────────────────────────────
 
  onEditorInit(event: any): void {
    this.quillEditor = event.editor;
 
    // Track cursor position
    this.quillEditor.on('selection-change', (range: any) => {
      if (range) {
        this.quillRange = range;
        this.activeField = 'body';
      }
    });
 
    // Allow drop on editor
    const editorEl = this.quillEditor.root as HTMLElement;
    editorEl.addEventListener('dragover', (e) => e.preventDefault());
    editorEl.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault();
      const key = e.dataTransfer?.getData('text/plain');
      if (key) {
        const range = this.quillEditor.getSelection(true);
        this.insertAtQuillCursor(range, key);
      }
    });
  }
 
  onEditorSelectionChange(event: any): void {
    if (event.range) {
      this.quillRange = event.range;
      this.activeField = 'body';
    }
  }
 
  // ─── Drag & Drop ──────────────────────────────────────────────────────────
 
  onDragStart(event: DragEvent, field: PlaceholderField): void {
    event.dataTransfer?.setData('text/plain', field.key);
  }

  onSubjectDragOver(event: DragEvent): void {
    event.preventDefault();
    this.activeField = 'subject';
  }

  onSubjectEditorFocus(): void {
    this.activeField = 'subject';
    this.captureSubjectSelection();
  }

  onSubjectEditorClick(event: MouseEvent): void {
    this.activeField = 'subject';

    const target = event.target as HTMLElement | null;
    if (this.isSubjectPlaceholderNode(target)) {
      this.placeCaretAfterNode(target);
      return;
    }

    this.captureSubjectSelection();
  }

  onSubjectEditorKeydown(event: KeyboardEvent): void {
    this.activeField = 'subject';

    if (event.key === 'Enter') {
      event.preventDefault();
    }
  }

  onSubjectEditorKeyup(): void {
    this.captureSubjectSelection();
  }

  onSubjectEditorMouseup(): void {
    this.captureSubjectSelection();
  }

  onSubjectEditorInput(): void {
    if (this.syncingSubjectEditor) return;

    this.updateSubjectModelFromEditor();
    this.refreshTemplateFieldUsage();
    this.captureSubjectSelection();
  }

  onSubjectEditorPaste(event: ClipboardEvent): void {
    event.preventDefault();

    const text = event.clipboardData?.getData('text/plain');
    if (!text) return;

    this.insertTextIntoSubjectEditor(text.replace(/[\r\n]+/g, ' '));
  }
 
  // ─── Insert Placeholder ───────────────────────────────────────────────────
 
  insertPlaceholder(field: PlaceholderField): void {
    if (!this.selectedTemplate) return;

    if (this.activeField === 'subject') {
      this.insertPlaceholderIntoSubjectEditor(field.key);
      return;
    }

    if (this.quillEditor) {
      const range = this.quillRange ?? this.quillEditor.getSelection(true) ?? { index: this.quillEditor.getLength(), length: 0 };
      this.insertAtQuillCursor(range, field.key);
    }
  }

  onBodyTemplateChange(): void {
    this.refreshTemplateFieldUsage();
  }

  getAutoResolvedFields(): TemplatePlaceholderUsage[] {
    return this.templateFieldUsage.filter((field) => field.source === 'db');
  }

  getManualFields(): TemplatePlaceholderUsage[] {
    return this.templateFieldUsage.filter((field) => field.source === 'manual');
  }

  getFieldLocationLabel(field: TemplatePlaceholderUsage): string {
    if (field.locations.length === 2) {
      return 'Subject & Body';
    }

    return field.locations[0] === 'subject' ? 'Subject' : 'Body';
  }

  getFieldSourceLabel(field: PlaceholderField): string {
    return field.source === 'db' ? 'Auto' : 'Send-time';
  }

  getBuiltInPlaceholderFields(): PlaceholderField[] {
    return this.placeholderFields;
  }

  getCustomPlaceholderFields(): PlaceholderField[] {
    return this.selectedTemplate?.customPlaceholders ?? [];
  }

  createCustomPlaceholder(): void {
    if (!this.selectedTemplate) return;

    const label = this.customPlaceholderLabel.trim();
    if (!label) return;

    const key = this.toPlaceholderKey(label);
    if (!key) return;

    const existingField = this.getPlaceholderField(key, this.selectedTemplate.category);
    const customField = existingField ?? {
      key,
      label,
      source: 'manual' as const,
      inputType: 'text' as const,
      required: true,
      helpText: 'This custom field will be filled when the template is used.',
    };

    if (!existingField) {
      const alreadyExists = this.selectedTemplate.customPlaceholders.some((field) => field.key === key);
      if (!alreadyExists) {
        this.selectedTemplate.customPlaceholders = [
          ...this.selectedTemplate.customPlaceholders,
          customField,
        ];
      }
    }

    this.refreshTemplateFieldUsage();
    this.insertPlaceholder(customField);

    this.customPlaceholderLabel = '';
  }
 
  private insertAtQuillCursor(range: any, key: string): void {
  const token = `{{${key}}}`;
  const index = range ? range.index : this.quillEditor.getLength();

  // Use the custom blot instead of manual styling
  this.quillEditor.insertEmbed(index, 'placeholder', token, Quill.sources.USER);
  this.quillEditor.setSelection(index + 1, Quill.sources.SILENT);
}

  // ─── Preview ──────────────────────────────────────────────────────────────
 
  togglePreview(): void {
    this.showPreview = !this.showPreview;
  }
 
  resolvePreview(text: string): string {
    if (!text) return '';
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) =>
      this.previewValues[key] ?? `{{${key}}}`
    );
  }
 
  resolvePreviewHtml(html: string): SafeHtml {
    if (!html) return '';
    let resolved = html;
    
    // Handle span-wrapped placeholders: <span class="editor-placeholder-token">{{key}}</span>
    resolved = resolved.replace(/<span[^>]*class="editor-placeholder-token"[^>]*>\{\{(\w+)\}\}<\/span>/g, (match, key) => {
      const field = this.getPlaceholderField(key, this.selectedTemplate?.category ?? 'General');
      const val = this.previewValues[key] ?? field?.label ?? `{{${key}}}`;
      if (field?.inputType === 'button') {
        return `<button type="button" class="preview-placeholder-button">${val}</button>`;
      }
      return `<span class="placeholder-token">${val}</span>`;
    });
    
    // Handle bare placeholders: {{key}}
    resolved = resolved.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const field = this.getPlaceholderField(key, this.selectedTemplate?.category ?? 'General');
      const val = this.previewValues[key] ?? field?.label ?? `{{${key}}}`;
      if (field?.inputType === 'button') {
        return `<button type="button" class="preview-placeholder-button">${val}</button>`;
      }
      return `<span class="placeholder-token">${val}</span>`;
    });
    
    return this.sanitizer.bypassSecurityTrustHtml(resolved);
  }
 
  // ─── Default Templates ────────────────────────────────────────────────────
 
  private getDefaultTemplates(): EmailTemplate[] {
    return [
      {
        id: 'tpl_interview_1',
        name: 'Interview Invitation',
        category: 'Interview',
        subject: 'Interview Invitation – {{jobTitle}} at {{companyName}}',
        customPlaceholders: [],
        body: `<p>Dear {{candidateName}},</p>
<p>Thank you for applying for the <strong>{{jobTitle}}</strong> position at <strong>{{companyName}}</strong>. We were impressed with your application and would like to invite you to an interview.</p>
<p><strong>Interview Details:</strong><br>
Date: {{interviewDate}}<br>
Time: {{interviewTime}}<br>
Format: {{interviewType}}<br>
Link: {{interviewLink}}</p>
<p>Please confirm your availability by replying to this email or contacting {{recruiterName}} at {{recruiterEmail}}.</p>
<p>We look forward to speaking with you.</p>
<p>Kind regards,<br>{{recruiterName}}<br>{{companyName}}</p>`,
      },
      {
        id: 'tpl_interview_2',
        name: 'Second Round Invite',
        category: 'Interview',
        subject: 'Second Interview – {{jobTitle}}',
        customPlaceholders: [],
        body: `<p>Dear {{candidateName}},</p>
<p>Following your initial interview for the <strong>{{jobTitle}}</strong> role, we are pleased to invite you to a second-round interview with our {{department}} team.</p>
<p><strong>Details:</strong><br>
Date: {{interviewDate}}<br>
Time: {{interviewTime}}<br>
Location / Link: {{interviewLink}}</p>
<p>Please let us know if you have any questions.</p>
<p>Best regards,<br>{{recruiterName}}</p>`,
      },
      {
        id: 'tpl_offer_1',
        name: 'Job Offer Letter',
        category: 'Offer',
        subject: 'Job Offer – {{jobTitle}} at {{companyName}}',
        customPlaceholders: [],
        body: `<p>Dear {{candidateName}},</p>
<p>We are delighted to offer you the position of <strong>{{jobTitle}}</strong> within our {{department}} team at {{companyName}}, based in {{location}}.</p>
<p><strong>Offer Summary:</strong><br>
Salary: {{salaryRange}}<br>
Start Date: {{interviewDate}}<br>
This offer is valid until: {{offerExpiryDate}}</p>
<p>Please review the attached offer letter and return a signed copy by the expiry date.</p>
<p>We are excited to welcome you to the team.</p>
<p>Warm regards,<br>{{recruiterName}}<br>{{companyName}}</p>`,
      },
      {
        id: 'tpl_rejection_1',
        name: 'Application Rejection',
        category: 'Rejection',
        subject: 'Your Application for {{jobTitle}} at {{companyName}}',
        customPlaceholders: [],
        body: `<p>Dear {{candidateName}},</p>
<p>Thank you for taking the time to apply for the <strong>{{jobTitle}}</strong> position at {{companyName}} and for your patience during our review process.</p>
<p>After careful consideration, we have decided to move forward with other candidates whose experience more closely matches our current requirements.</p>
<p>We appreciate your interest in {{companyName}} and encourage you to apply for future roles that align with your skills.</p>
<p>We wish you all the best in your career journey.</p>
<p>Kind regards,<br>{{recruiterName}}<br>{{companyName}}</p>`,
      },
      {
        id: 'tpl_followup_1',
        name: 'Post-Interview Follow-up',
        category: 'Follow-up',
        subject: 'Following Up – {{jobTitle}} Interview',
        customPlaceholders: [],
        body: `<p>Dear {{candidateName}},</p>
<p>Thank you for attending the interview for the <strong>{{jobTitle}}</strong> role. We enjoyed learning more about your background and experience.</p>
<p>We are currently completing our review and aim to get back to you by <strong>{{deadlineDate}}</strong>. If you have any questions in the meantime, please feel free to reach out to {{recruiterName}} at {{recruiterEmail}}.</p>
<p>Thank you again for your time.</p>
<p>Best regards,<br>{{recruiterName}}<br>{{companyName}}</p>`,
      },
      {
        id: 'tpl_general_1',
        name: 'Request for Documents',
        category: 'General',
        subject: 'Document Request – {{jobTitle}} Application',
        customPlaceholders: [],
        body: `<p>Dear {{candidateName}},</p>
<p>As part of the application process for the <strong>{{jobTitle}}</strong> role at {{companyName}}, we kindly request you submit the following documents by <strong>{{deadlineDate}}</strong>:</p>
<ul>
  <li>Updated CV / Resume</li>
  <li>Proof of qualification(s)</li>
  <li>Any other supporting documents</li>
</ul>
<p>Please send these to {{recruiterEmail}} or upload them via the candidate portal.</p>
<p>Thank you for your cooperation.</p>
<p>Kind regards,<br>{{recruiterName}}<br>{{companyName}}</p>`,
      },
    ];
  }

  private loadTemplates(): EmailTemplate[] {
    if (typeof window === 'undefined' || !window.localStorage) {
      return this.getDefaultTemplates();
    }

    try {
      const storedTemplates = window.localStorage.getItem(MAIL_TEMPLATES_STORAGE_KEY);
      if (!storedTemplates) {
        return this.getDefaultTemplates();
      }

      const parsedTemplates = JSON.parse(storedTemplates);
      if (!Array.isArray(parsedTemplates)) {
        return this.getDefaultTemplates();
      }

      const validTemplates = parsedTemplates.filter((template): template is EmailTemplate =>
        !!template
        && typeof template.id === 'string'
        && typeof template.name === 'string'
        && typeof template.category === 'string'
        && typeof template.subject === 'string'
        && typeof template.body === 'string'
        && Array.isArray(template.customPlaceholders ?? [])
      );

      return validTemplates.map((template) => this.normalizeTemplate(template));
    } catch {
      return this.getDefaultTemplates();
    }
  }

  private persistTemplates(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      window.localStorage.setItem(
        MAIL_TEMPLATES_STORAGE_KEY,
        JSON.stringify(this.templates),
      );
    } catch {
      // Ignore storage quota / availability issues and keep the editor usable.
    }
  }

  private refreshTemplateFieldUsage(): void {
    this.templateFieldUsage = this.selectedTemplate
      ? this.extractTemplatePlaceholderUsage(this.selectedTemplate)
      : [];
  }

  private extractTemplatePlaceholderUsage(template: EmailTemplate): TemplatePlaceholderUsage[] {
    const locationsByKey = new Map<string, Set<'subject' | 'body'>>();
    this.collectPlaceholdersFromText(template.subject, 'subject', locationsByKey);
    this.collectPlaceholdersFromText(template.body, 'body', locationsByKey);

    return Array.from(locationsByKey.entries()).map(([key, locations]) => {
      const field = this.getPlaceholderField(key, template.category);

      if (field) {
        return {
          key: field.key,
          label: field.label,
          source: field.source,
          inputType: field.inputType,
          required: field.required,
          locations: Array.from(locations),
          helpText: field.helpText,
          isKnown: true,
        };
      }

      return {
        key,
        label: this.formatPlaceholderLabel(key),
        source: 'manual',
        inputType: 'text',
        required: true,
        locations: Array.from(locations),
        helpText: 'This custom placeholder will be filled when the template is used.',
        isKnown: false,
      };
    });
  }

  private collectPlaceholdersFromText(
    text: string,
    location: 'subject' | 'body',
    locationsByKey: Map<string, Set<'subject' | 'body'>>,
  ): void {
    const regex = /\{\{(\w+)\}\}/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const key = match[1];

      if (!locationsByKey.has(key)) {
        locationsByKey.set(key, new Set());
      }

      locationsByKey.get(key)?.add(location);
    }
  }

  private getPlaceholderField(
    key: string,
    category?: EmailTemplate['category'],
  ): PlaceholderField | undefined {
    const availableFields = [
      ...this.placeholderFields,
      ...(this.selectedTemplate?.customPlaceholders ?? []),
    ];

    return availableFields.find((field) =>
      field.key === key
      && (!category || !field.appliesTo?.length || field.appliesTo.includes(category))
    );
  }

  private normalizeTemplate(template: EmailTemplate): EmailTemplate {
    return {
      ...template,
      customPlaceholders: Array.isArray(template.customPlaceholders)
        ? template.customPlaceholders.filter((field): field is PlaceholderField =>
            !!field
            && typeof field.key === 'string'
            && typeof field.label === 'string'
            && field.source === 'manual'
            && typeof field.inputType === 'string'
            && typeof field.required === 'boolean',
          )
        : [],
    };
  }

  private cloneTemplate(template: EmailTemplate): EmailTemplate {
    return {
      ...template,
      customPlaceholders: template.customPlaceholders.map((field) => ({ ...field })),
    };
  }

  private formatPlaceholderLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (value) => value.toUpperCase())
      .trim();
  }

  private toPlaceholderKey(label: string): string {
    const cleaned = label
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .split(' ')
      .filter(Boolean);

    if (cleaned.length === 0) {
      return '';
    }

    return cleaned
      .map((part, index) => {
        const lower = part.toLowerCase();
        return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join('');
  }

  onSubjectDrop(event: DragEvent): void {
    event.preventDefault();

    const key = event.dataTransfer?.getData('text/plain');
    const editor = this.subjectEditorRef?.nativeElement;
    if (!key || !this.selectedTemplate || !editor) return;

    this.activeField = 'subject';
    editor.focus();

    const range = this.getSubjectRangeFromPoint(event.clientX, event.clientY);
    if (range) {
      this.applySubjectRange(range);
    } else {
      this.placeCaretAtSubjectEnd();
    }

    this.insertPlaceholderIntoSubjectEditor(key);
  }

  private insertPlaceholderIntoSubjectEditor(key: string): void {
    const editor = this.subjectEditorRef?.nativeElement;
    if (!editor || !this.selectedTemplate) return;

    editor.focus();

    const range = this.getStoredSubjectRange() ?? this.createCollapsedRangeAtEnd(editor);
    const tokenNode = this.createSubjectPlaceholderNode(key);

    range.deleteContents();
    range.insertNode(tokenNode);
    this.placeCaretAfterNode(tokenNode);
    this.updateSubjectModelFromEditor();
    this.refreshTemplateFieldUsage();
  }

  private insertTextIntoSubjectEditor(text: string): void {
    const editor = this.subjectEditorRef?.nativeElement;
    if (!editor || !this.selectedTemplate) return;

    editor.focus();

    const range = this.getStoredSubjectRange() ?? this.createCollapsedRangeAtEnd(editor);
    const textNode = document.createTextNode(text);

    range.deleteContents();
    range.insertNode(textNode);
    this.placeCaretAfterNode(textNode);
    this.updateSubjectModelFromEditor();
    this.refreshTemplateFieldUsage();
  }

  private syncSubjectEditorFromModel(): void {
    const editor = this.subjectEditorRef?.nativeElement;
    const subject = this.selectedTemplate?.subject ?? '';
    if (!editor) return;

    if (this.serializeSubjectContent(editor) === subject && editor.childNodes.length > 0) {
      return;
    }

    this.syncingSubjectEditor = true;
    editor.innerHTML = '';

    const regex = /\{\{(\w+)\}\}/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(subject)) !== null) {
      if (match.index > lastIndex) {
        editor.appendChild(document.createTextNode(subject.slice(lastIndex, match.index)));
      }

      editor.appendChild(this.createSubjectPlaceholderNode(match[1]));
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < subject.length) {
      editor.appendChild(document.createTextNode(subject.slice(lastIndex)));
    }

    this.syncingSubjectEditor = false;
  }

  private createSubjectPlaceholderNode(key: string): HTMLSpanElement {
    const token = `{{${key}}}`;
    const node = document.createElement('span');
    node.className = 'editor-placeholder-token subject-placeholder-token';
    node.setAttribute('contenteditable', 'false');
    node.dataset['token'] = token;
    node.dataset['key'] = key;
    node.textContent = token;
    return node;
  }

  private updateSubjectModelFromEditor(): void {
    if (!this.selectedTemplate || !this.subjectEditorRef) return;
    this.selectedTemplate.subject = this.serializeSubjectContent(this.subjectEditorRef.nativeElement);
  }

  private serializeSubjectContent(root: Node): string {
    let value = '';

    root.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        value += node.textContent ?? '';
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      const element = node as HTMLElement;
      if (this.isSubjectPlaceholderNode(element)) {
        value += element.dataset['token'] ?? element.textContent ?? '';
        return;
      }

      value += this.serializeSubjectContent(element);
    });

    return value.replace(/\u00a0/g, ' ');
  }

  private captureSubjectSelection(): void {
    const editor = this.subjectEditorRef?.nativeElement;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!this.isRangeInsideSubjectEditor(range, editor)) return;

    this.subjectRange = range.cloneRange();
  }

  private getStoredSubjectRange(): Range | null {
    const editor = this.subjectEditorRef?.nativeElement;
    if (!editor) return null;

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const liveRange = selection.getRangeAt(0);
      if (this.isRangeInsideSubjectEditor(liveRange, editor)) {
        this.subjectRange = liveRange.cloneRange();
        return liveRange.cloneRange();
      }
    }

    if (this.subjectRange && this.isRangeInsideSubjectEditor(this.subjectRange, editor)) {
      return this.subjectRange.cloneRange();
    }

    return null;
  }

  private getSubjectRangeFromPoint(clientX: number, clientY: number): Range | null {
    const editor = this.subjectEditorRef?.nativeElement;
    if (!editor) return null;

    const doc = document as Document & {
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
      caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    };

    let range: Range | null = null;

    if (doc.caretRangeFromPoint) {
      range = doc.caretRangeFromPoint(clientX, clientY);
    } else if (doc.caretPositionFromPoint) {
      const position = doc.caretPositionFromPoint(clientX, clientY);
      if (position) {
        range = document.createRange();
        range.setStart(position.offsetNode, position.offset);
        range.collapse(true);
      }
    }

    if (!range || !this.isRangeInsideSubjectEditor(range, editor)) {
      return this.createCollapsedRangeAtEnd(editor);
    }

    return range;
  }

  private placeCaretAfterNode(node: Node): void {
    const range = document.createRange();
    range.setStartAfter(node);
    range.collapse(true);
    this.applySubjectRange(range);
  }

  private placeCaretAtSubjectEnd(): void {
    const editor = this.subjectEditorRef?.nativeElement;
    if (!editor) return;

    this.applySubjectRange(this.createCollapsedRangeAtEnd(editor));
  }

  private applySubjectRange(range: Range): void {
    const selection = window.getSelection();
    if (!selection) return;

    selection.removeAllRanges();
    selection.addRange(range);
    this.subjectRange = range.cloneRange();
  }

  private createCollapsedRangeAtEnd(editor: HTMLElement): Range {
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    return range;
  }

  private isRangeInsideSubjectEditor(range: Range, editor: HTMLElement): boolean {
    return this.isNodeInsideSubjectEditor(range.startContainer, editor)
      && this.isNodeInsideSubjectEditor(range.endContainer, editor);
  }

  private isNodeInsideSubjectEditor(node: Node | null, editor: HTMLElement): boolean {
    return !!node && (node === editor || editor.contains(node));
  }

  private isSubjectPlaceholderNode(node: EventTarget | Node | null): node is HTMLElement {
    return node instanceof HTMLElement && node.classList.contains('subject-placeholder-token');
  }
}
