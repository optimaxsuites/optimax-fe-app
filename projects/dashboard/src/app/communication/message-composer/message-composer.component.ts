import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
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
  constructor(private cdr: ChangeDetectorRef) {}

  // ── Feature: Voice note recording ───────────────────
  isRecording = false;
  recordingSeconds = 0;
  private mediaRecorder?: MediaRecorder;
  private audioChunks: Blob[] = [];
  private recordingTimer?: ReturnType<typeof setInterval>;

  get recordingLabel(): string {
    const m = Math.floor(this.recordingSeconds / 60).toString().padStart(2, '0');
    const s = (this.recordingSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  startVoiceNote(): void {
    if (this.isRecording || !navigator.mediaDevices?.getUserMedia) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      this.audioChunks = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.audioChunks, { type: mimeType });
        const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: mimeType });
        this.filesSelected.emit([file]);
        stream.getTracks().forEach(t => t.stop());
        this.cdr.markForCheck();
      };
      this.mediaRecorder.start();
      this.isRecording = true;
      this.recordingSeconds = 0;
      this.recordingTimer = setInterval(() => {
        this.recordingSeconds++;
        this.cdr.markForCheck();
      }, 1000);
      this.cdr.markForCheck();
    }).catch(() => {});
  }

  stopVoiceNote(): void {
    if (!this.isRecording) return;
    this.mediaRecorder?.stop();
    this.isRecording = false;
    if (this.recordingTimer) clearInterval(this.recordingTimer);
    this.cdr.markForCheck();
  }

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

  onComposerPaste(e: ClipboardEvent, el: HTMLTextAreaElement): void {
    const html = e.clipboardData?.getData('text/html') || '';
    const plain = e.clipboardData?.getData('text/plain') || '';

    // Only intercept if clipboard HTML contains syntax-highlighter class markup.
    // When pasting from a code block (PrismJS/highlight.js/CodeMirror), the
    // browser puts the raw highlighted HTML in text/html and the class attribute
    // text leaks into text/plain in some Electron webviews.
    const hasSyntaxMarkup = /class=["']token[\s"']/i.test(plain) || /class=["'](?:hljs|cm)-/i.test(plain);
    if (!hasSyntaxMarkup && !html) return;

    e.preventDefault();

    // Prefer stripping the HTML clipboard version which is always complete.
    const source = html || plain;
    const cleaned = this.stripSyntaxMarkup(source);

    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = el.value.slice(0, start) + cleaned + el.value.slice(end);

    this.draftChange.emit(next);
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + cleaned.length;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    });
  }

  private stripSyntaxMarkup(text: string): string {
    // Decode HTML entities first
    const tmp = document.createElement('textarea');
    tmp.innerHTML = text;
    let out = tmp.value;

    // Remove all HTML opening/closing tags (span, pre, code, etc.)
    out = out.replace(/<\/?[a-z][^>]*>/gi, '');
    // Remove leftover class="token..." fragments that appear as raw text
    out = out.replace(/class=["'][\w\s-]*["']\s*>/gi, '');
    // Decode HTML entities a second time in case of double-encoding
    tmp.innerHTML = out;
    out = tmp.value;
    // Normalize non-breaking spaces and excessive whitespace
    out = out.replace(/ /g, ' ');
    out = out.replace(/\r\n/g, '\n');
    out = out.replace(/\r/g, '\n');
    return out;
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
