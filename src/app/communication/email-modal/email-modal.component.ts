import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ChangeDetectionStrategy,
} from '@angular/core';

export interface EmailRecipient {
  email: string;
  name: string;
  locked: boolean;
}

export interface EmailModalState {
  open: boolean;
  recipients: EmailRecipient[];
  toInput: string;
  subject: string;
  body: string;
  sending: boolean;
  result: string;
  width: number;
}

@Component({
  selector: 'app-email-modal',
  templateUrl: './email-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailModalComponent {
  @Input() state!: EmailModalState;

  @Output() closed = new EventEmitter<void>();
  @Output() sent = new EventEmitter<void>();
  @Output() aiCompose = new EventEmitter<void>();
  @Output() subjectChange = new EventEmitter<string>();
  @Output() bodyChange = new EventEmitter<string>();
  @Output() toInputChange = new EventEmitter<string>();
  @Output() recipientAdded = new EventEmitter<void>();
  @Output() recipientRemoved = new EventEmitter<number>();
  @Output() widthChange = new EventEmitter<number>();

  readonly EMAIL_MODAL_MIN = 480;
  readonly EMAIL_MODAL_MAX = 900;

  resizing = false;
  private resizeStartX = 0;
  private resizeStartWidth = 0;

  startResize(e: MouseEvent): void {
    this.resizing = true;
    this.resizeStartX = e.clientX;
    this.resizeStartWidth = this.state.width;
    e.preventDefault();
    e.stopPropagation();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (!this.resizing) return;
    const delta = this.resizeStartX - e.clientX;
    const newWidth = Math.min(this.EMAIL_MODAL_MAX, Math.max(this.EMAIL_MODAL_MIN, this.resizeStartWidth + delta));
    this.widthChange.emit(newWidth);
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.resizing = false;
  }

  onToInputKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      this.recipientAdded.emit();
    }
    if (e.key === 'Backspace' && !this.state.toInput && this.state.recipients.length) {
      const last = this.state.recipients[this.state.recipients.length - 1];
      if (!last.locked) this.recipientRemoved.emit(this.state.recipients.length - 1);
    }
  }
}