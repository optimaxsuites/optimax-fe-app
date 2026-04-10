import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ChatMessage, FormatMode } from '../optimax-ai.component';

@Component({
  selector: 'app-chat-message',
  templateUrl: './chat-message.component.html',
  styleUrl: './chat-message.component.scss'
})
export class ChatMessageComponent {
  @Input() msg!: ChatMessage;

  @Output() followUpSelected = new EventEmitter<string>();
  @Output() copyRequested    = new EventEmitter<string>();

  get formatBadgeClass(): string {
    if (this.msg.format === 'chart') return 'bg-violet-50 text-violet-500';
    if (this.msg.format === 'json')  return 'bg-amber-50 text-amber-600';
    return 'bg-[#eaf2f6] text-[#2e6276]';
  }
}