import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import Quill from 'quill';


export interface PlaceholderField {
  key: string;       // inserted as {{key}}
  label: string;     // shown on chip
}
 
export interface EmailTemplate {
  id: string;
  name: string;
  category: 'Interview' | 'Offer' | 'Rejection' | 'General' | 'Follow-up';
  subject: string;
  body: string;
}
 
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

 
// ─── Placeholder Fields ────────────────────────────────────────────────────
  placeholderFields: PlaceholderField[] = [
    { key: 'candidateName',    label: 'Candidate Name'    },
    { key: 'jobTitle',         label: 'Job Title'         },
    { key: 'companyName',      label: 'Company Name'      },
    { key: 'department',       label: 'Department'        },
    { key: 'location',         label: 'Location'          },
    { key: 'interviewDate',    label: 'Interview Date'    },
    { key: 'interviewTime',    label: 'Interview Time'    },
    { key: 'interviewLink',    label: 'Interview Link'    },
    { key: 'interviewType',    label: 'Interview Type'    },
    { key: 'recruiterName',    label: 'Recruiter Name'    },
    { key: 'recruiterEmail',   label: 'Recruiter Email'   },
    { key: 'deadlineDate',     label: 'Deadline Date'     },
    { key: 'salaryRange',      label: 'Salary Range'      },
    { key: 'offerExpiryDate',  label: 'Offer Expiry Date' },
  ];
 
  // Sample preview values — replace from context when sending
  previewValues: Record<string, string> = {
    candidateName:   'Amara Okonkwo',
    jobTitle:        'Senior Product Designer',
    companyName:     'Acme Corp',
    department:      'Product & Design',
    location:        'Lagos, Nigeria',
    interviewDate:   'Thursday, 24 April 2025',
    interviewTime:   '10:00 AM WAT',
    interviewLink:   'https://meet.example.com/interview/abc123',
    interviewType:   'Video Call (Google Meet)',
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
    this.templates = this.getDefaultTemplates();
    this.filteredTemplates = [...this.templates];
  }
 
  // ─── Selection & Filtering ────────────────────────────────────────────────
 
  selectTemplate(tpl: EmailTemplate): void {
    this.selectedTemplate = { ...tpl };
    this.showPreview = false;
    this.activeField = 'body';
    this.subjectRange = null;
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
 
    const idx = this.templates.findIndex(t => t.id === this.selectedTemplate!.id);
    if (idx >= 0) {
      this.templates[idx] = { ...this.selectedTemplate };
    } else {
      this.templates.unshift({ ...this.selectedTemplate });
    }
    this.filteredTemplates = [...this.templates];
 
    this.messageService.add({
      severity: 'success',
      summary: 'Saved',
      detail: `"${this.selectedTemplate.name}" saved successfully.`,
      life: 3000,
    });
 
    // TODO: persist via your API/service here
  }
 
  deleteTemplate(tpl: EmailTemplate, event: Event): void {
    event.stopPropagation();
    this.confirmationService.confirm({
      message: `Delete "${tpl.name}"? This cannot be undone.`,
      accept: () => {
        this.templates = this.templates.filter(t => t.id !== tpl.id);
        this.filteredTemplates = [...this.templates];
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
    const resolved = html.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const val = this.previewValues[key] ?? `{{${key}}}`;
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
