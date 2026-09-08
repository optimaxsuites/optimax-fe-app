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

  // ── Voice note preview (after recording, before sending) ─
  voicePreview: { file: File; blobUrl: string } | null = null;
  vnpPlaying = false;
  vnpCurrentTime = 0;
  vnpDuration = 0;

  get recordingLabel(): string {
    const m = Math.floor(this.recordingSeconds / 60).toString().padStart(2, '0');
    const s = (this.recordingSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  vnpFormatTime(secs: number): string {
    if (!secs || isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
  vnpProgress(): number {
    return this.vnpDuration ? (this.vnpCurrentTime / this.vnpDuration) * 100 : 0;
  }
  vnpToggle(el: HTMLAudioElement): void {
    if (this.vnpPlaying) { el.pause(); this.vnpPlaying = false; }
    else { el.play().catch(() => {}); this.vnpPlaying = true; }
    this.cdr.markForCheck();
  }
  vnpMeta(e: Event): void {
    const el = e.target as HTMLAudioElement;
    if (!isFinite(el.duration)) {
      // Chrome WebM: no duration header — seek to end to force calculation
      el.currentTime = 1e101;
      el.addEventListener('seeked', () => {
        this.vnpDuration = isFinite(el.duration) ? el.duration : 0;
        el.currentTime = 0;
        this.cdr.markForCheck();
      }, { once: true });
      return;
    }
    this.vnpDuration = el.duration;
    this.cdr.markForCheck();
  }
  vnpTimeUpdate(e: Event): void {
    this.vnpCurrentTime = (e.target as HTMLAudioElement).currentTime;
    this.cdr.markForCheck();
  }
  vnpEnded(): void {
    this.vnpPlaying = false;
    this.vnpCurrentTime = 0;
    this.cdr.markForCheck();
  }
  vnpSeek(el: HTMLAudioElement, e: Event): void {
    const t = Number((e.target as HTMLInputElement).value);
    el.currentTime = t;
    this.vnpCurrentTime = t;
    this.cdr.markForCheck();
  }
  sendVoiceNote(): void {
    if (!this.voicePreview) return;
    this.filesSelected.emit([this.voicePreview.file]);
    this._clearVoicePreview();
    this.messageSent.emit();
  }
  discardVoiceNote(): void {
    this._clearVoicePreview();
  }
  private _clearVoicePreview(): void {
    if (this.voicePreview) {
      URL.revokeObjectURL(this.voicePreview.blobUrl);
      this.voicePreview = null;
    }
    this.vnpPlaying = false;
    this.vnpCurrentTime = 0;
    this.vnpDuration = 0;
    this.cdr.markForCheck();
  }

  startVoiceNote(): void {
    if (this.isRecording || !navigator.mediaDevices?.getUserMedia) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      this.audioChunks = [];

      const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/mp4',
      ];
      const mimeType = candidates.find(t => MediaRecorder.isTypeSupported(t)) ?? '';

      let recorder: MediaRecorder;
      try {
        recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
      } catch {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      this.mediaRecorder = recorder;

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(this.audioChunks, { type });
        const ext = type.includes('ogg') ? 'ogg' : type.includes('mp4') ? 'mp4' : 'webm';
        const file = new File([blob], `voice-note-${Date.now()}.${ext}`, { type });
        // Show preview instead of uploading immediately
        this.voicePreview = { file, blobUrl: URL.createObjectURL(blob) };
        stream.getTracks().forEach(t => t.stop());
        this.cdr.markForCheck();
      };

      recorder.start();
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
    this.isRecording = false;
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = undefined;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
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
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
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

  formatText(format: 'bold' | 'italic' | 'strike' | 'code' | 'ol' | 'ul' | 'quote'): void {
    const el = this.composerEl?.nativeElement;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const selected = el.value.slice(start, end);
    let next = el.value;
    let newStart = start;
    let newEnd = end;
    if (format === 'ol' || format === 'ul' || format === 'quote') {
      const prefix = format === 'ol' ? '1. ' : format === 'ul' ? '- ' : '> ';
      const lines = selected ? selected.split('\n').map(l => prefix + l).join('\n') : prefix;
      next = el.value.slice(0, start) + lines + el.value.slice(end);
      newStart = start + prefix.length;
      newEnd = start + lines.length;
    } else {
      const markers: Record<string, string> = { bold: '**', italic: '_', strike: '~~', code: '`' };
      const m = markers[format];
      const wrapped = `${m}${selected}${m}`;
      next = el.value.slice(0, start) + wrapped + el.value.slice(end);
      newStart = start + m.length;
      newEnd = start + m.length + selected.length;
    }
    this.draftChange.emit(next);
    setTimeout(() => {
      el.focus();
      el.selectionStart = newStart;
      el.selectionEnd = newEnd;
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

  private stripSyntaxMarkup(html: string): string {
    if (!html || typeof document === 'undefined') return html;
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      doc.querySelectorAll('br').forEach(el => el.replaceWith('\n'));
      doc.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6, tr').forEach(el => {
        el.after('\n');
      });
      return (doc.body?.textContent ?? '')
        .replace(/\u00a0/g, ' ')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    } catch {
      return html
        .replace(/<br\s*\/?>\s*/gi, '\n')
        .replace(/<\/(?:p|div|li|h[1-6])>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'"  ).replace(/&nbsp;/g, ' ')
        .replace(/\u00a0/g, ' ')
        .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
        .trim();
    }
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
