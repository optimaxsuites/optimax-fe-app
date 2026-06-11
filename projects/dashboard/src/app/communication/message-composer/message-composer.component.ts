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

// dami just modified this to improve attachments, rich composer flow, and messaging actions.
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
  previewUrl?: string;
}

export interface ComposerLinkPreview {
  url: string;
  displayUrl: string;
  title: string;
  subtitle: string;
  thumbnailUrl: string;
}

export interface ComposerMentionOption {
  id: number;
  firstName?: string;
  lastName?: string;
  fullname?: string;
  username?: string;
  email?: string;
  profileImage?: string;
  userId?: number;
  user?: {
    id?: number;
    fullname?: string;
    userId?: number;
    username?: string;
    email?: string;
  };
}

@Component({
  selector: 'app-message-composer',
  templateUrl: './message-composer.component.html',
  styleUrls: ['./message-composer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageComposerComponent {
  readonly emojiChoices = [
    '😀',
    '😄',
    '😂',
    '😊',
    '😍',
    '😎',
    '🤔',
    '👏',
    '👍',
    '🙌',
    '🙏',
    '🔥',
    '💯',
    '🎉',
    '❤️',
    '🚀',
  ];
  @ViewChild('composerEl') composerEl!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  aiOutputExpanded = false;
  editableAiContent = '';
  emojiMenuOpen = false;
  // ── Inputs ──────────────────────────────────────────
  @Input() draft = '';
  @Input() placeholder = 'Message…';
  @Input() sendingMessage = false;
  @Input() uploadingAttachment = false;
  @Input() pendingAttachments: PendingAttachment[] = [];
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
  @Input() linkPreview: ComposerLinkPreview | null = null;
  @Input() mentionResults: ComposerMentionOption[] = [];
  @Input() showMentionMenu = false;
  @Input() mentionLabel: (employee: ComposerMentionOption) => string = () => '';

  // ── Outputs ─────────────────────────────────────────
  @Output() draftChange = new EventEmitter<string>();
  @Output() messageSent = new EventEmitter<void>();
  @Output() filesSelected = new EventEmitter<File[]>();
  @Output() attachmentRemoved = new EventEmitter<number>();
  @Output() aiToolbarToggled = new EventEmitter<void>();
  @Output() aiOutputClosed = new EventEmitter<void>();
  @Output() aiRewrite = new EventEmitter<void>();
  @Output() aiSubject = new EventEmitter<void>();
  @Output() aiSummarize = new EventEmitter<void>();
  @Output() voiceCompose = new EventEmitter<void>();
  @Output() emailCompose = new EventEmitter<void>();
  @Output() composerTyping = new EventEmitter<void>();
  @Output() aiOutputUsed = new EventEmitter<string>();
  @Output() mentionSelected = new EventEmitter<ComposerMentionOption>();

  // ── Actions ─────────────────────────────────────────

  triggerFileInput(): void {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    this.filesSelected.emit(files);
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

  toggleEmojiMenu(): void {
    this.emojiMenuOpen = !this.emojiMenuOpen;
  }

  appendEmoji(emoji: string): void {
    const next = `${this.draft || ''}${emoji}`;
    this.draftChange.emit(next);
    this.emojiMenuOpen = false;
    setTimeout(() => this.focusComposer(), 0);
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

  focusComposer(moveCursorToEnd = true): void {
    const textarea = this.composerEl?.nativeElement;
    if (!textarea) return;
    textarea.focus();
    if (moveCursorToEnd) {
      const end = textarea.value?.length || 0;
      textarea.setSelectionRange(end, end);
    }
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
  }
}
