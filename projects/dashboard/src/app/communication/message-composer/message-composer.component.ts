import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
  SimpleChanges
} from '@angular/core';

export interface AiOutput {
  visible: boolean;
  loading: boolean;
  title: string;
  content: string;
}

export interface PendingAttachment {
  name: string;
  size: string;
  type: string;
}

@Component({
  selector: 'app-message-composer',
  templateUrl: './message-composer.component.html',
  styleUrls: ['./message-composer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageComposerComponent {
  @ViewChild('composerEl') composerEl!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  aiOutputExpanded = false;
  editableAiContent = '';
  // ── Inputs ──────────────────────────────────────────
  @Input() draft = '';
  @Input() placeholder = 'Message…';
  @Input() sendingMessage = false;
  @Input() uploadingAttachment = false;
  @Input() pendingAttachment: PendingAttachment | null = null;
  @Input() showAiToolbar = false;
  @Input() aiOutput: AiOutput = {
    visible: false,
    loading: false,
    title: '',
    content: '',
  };
  @Input() voiceListening = false;
  @Input() voiceSupported = false;
  @Input() typingUsersLabel = '';

  // ── Outputs ─────────────────────────────────────────
  @Output() draftChange = new EventEmitter<string>();
  @Output() messageSent = new EventEmitter<void>();
  @Output() fileSelected = new EventEmitter<File>();
  @Output() attachmentRemoved = new EventEmitter<void>();
  @Output() aiToolbarToggled = new EventEmitter<void>();
  @Output() aiOutputClosed = new EventEmitter<void>();
  @Output() aiRewrite = new EventEmitter<void>();
  @Output() aiSubject = new EventEmitter<void>();
  @Output() aiSummarize = new EventEmitter<void>();
  @Output() voiceCompose = new EventEmitter<void>();
  @Output() emailCompose = new EventEmitter<void>();
  @Output() composerTyping = new EventEmitter<void>();
  @Output() aiOutputUsed = new EventEmitter<string>();

  // ── Actions ─────────────────────────────────────────

  triggerFileInput(): void {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.fileSelected.emit(file);
    input.value = '';
  }

  onComposerKey(e: KeyboardEvent, el: HTMLTextAreaElement): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.messageSent.emit();
      return;
    }
    this.composerTyping.emit();
    setTimeout(() => {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    });
  }

  onComposerInput(el: HTMLTextAreaElement): void {
    this.composerTyping.emit();
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }

  // When AI output changes, sync editable copy
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['aiOutput'] && !this.aiOutput.loading) {
      this.editableAiContent = this.aiOutput.content;
      this.aiOutputExpanded = false; // reset on new content
    }
  }

  expandAiOutput(): void {
    if (!this.aiOutput.loading) {
      this.aiOutputExpanded = true;
      this.editableAiContent = this.aiOutput.content;
    }
  }

  collapseAndClose(): void {
    this.aiOutputExpanded = false;
    this.aiOutputClosed.emit();
  }

  useAiOutputInEmail(): void {
    // Option 2: send content directly to email composer
    // this.emailCompose.emit();
    // Emit the editable content so the parent can pre-fill the email body
    this.aiOutputUsed.emit(this.editableAiContent);
    this.aiOutputExpanded = false;
    this.aiOutputClosed.emit();
  }
}
