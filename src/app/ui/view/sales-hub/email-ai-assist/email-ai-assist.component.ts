import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';

export type EmailAiAction = 'write' | 'rewrite' | 'grammar' | 'shorten' | 'formal' | 'friendly' | 'subject';

interface EmailAiOption {
  id: EmailAiAction;
  label: string;
  icon: string;
  /** Needs existing message text to work on (disabled while the message is empty). */
  needsText: boolean;
}

/**
 * Composer frame for the "Send by Email" modals (quote, invoice, delivery note): wraps the
 * projected message <textarea> and adds an "AI Assistance" button that reveals writing options.
 *
 * UI only for now — the backend AI endpoint doesn't exist yet, so picking an option just shows
 * a "coming soon" toast. Wire the real call into onSelect() once it's available.
 */
@Component({
  selector: 'app-email-ai-assist',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './email-ai-assist.component.html',
  styleUrls: ['./email-ai-assist.component.scss']
})
export class EmailAiAssistComponent {
  /** Current message body — used to disable options that need existing text. */
  @Input() message = '';

  showOptions = false;

  readonly options: EmailAiOption[] = [
    { id: 'write',    label: 'Write for me',    icon: 'fa-pen-nib',          needsText: false },
    { id: 'rewrite',  label: 'Rewrite',         icon: 'fa-pen-to-square',    needsText: true },
    { id: 'grammar',  label: 'Fix grammar',     icon: 'fa-spell-check',      needsText: true },
    { id: 'shorten',  label: 'Shorten',         icon: 'fa-compress',         needsText: true },
    { id: 'formal',   label: 'More formal',     icon: 'fa-user-tie',         needsText: true },
    { id: 'friendly', label: 'More friendly',   icon: 'fa-face-smile',       needsText: true },
    { id: 'subject',  label: 'Suggest subject', icon: 'fa-tag',              needsText: false }
  ];

  constructor(private messageService: MessageService) {}

  get hasText(): boolean {
    return !!this.message?.trim();
  }

  toggleOptions(): void {
    this.showOptions = !this.showOptions;
  }

  onSelect(option: EmailAiOption): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Coming Soon',
      detail: `AI "${option.label}" will be available soon.`
    });
  }
}
