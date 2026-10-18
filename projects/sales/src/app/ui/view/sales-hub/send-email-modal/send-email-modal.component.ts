import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmailAiAssistComponent } from '../email-ai-assist/email-ai-assist.component';

/**
 * The "Send by Email" dialog shared by the Quote / Invoice create forms and their detail pages:
 * an editable subject, the message body (with AI Assistance) that appears above the itemised
 * summary, and Send / Don't Send. It only collects input — the parent does the sending.
 */
@Component({
  selector: 'app-send-email-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, EmailAiAssistComponent],
  templateUrl: './send-email-modal.component.html',
  styleUrls: ['./send-email-modal.component.scss']
})
export class SendEmailModalComponent {
  @Input() title = 'Send by Email';
  /** e.g. "QUO-0012" — shown in the hint line. */
  @Input() documentNumber = '';
  @Input() recipientName = '';
  /** What the message appears above, e.g. "quote" → "…above the quote summary and attached PDF". */
  @Input() documentLabel = 'document';
  @Input() sending = false;
  @Input() dismissLabel = 'Cancel';

  @Input() subject = '';
  @Output() subjectChange = new EventEmitter<string>();
  @Input() message = '';
  @Output() messageChange = new EventEmitter<string>();

  @Output() send = new EventEmitter<void>();
  @Output() dismiss = new EventEmitter<void>();

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.sending) this.dismiss.emit();
  }
}
