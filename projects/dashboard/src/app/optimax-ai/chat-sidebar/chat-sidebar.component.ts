import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface ChatSession {
  id: string;
  title: string;
  module: string;
  time: string;
}

@Component({
  selector: 'app-chat-sidebar',
  templateUrl: './chat-sidebar.component.html',
})
export class ChatSidebarComponent {
  @Input() sessions: ChatSession[] = [];
  @Input() activeChatId = '';

  @Output() sessionSelected = new EventEmitter<string>();
  @Output() newChatClicked  = new EventEmitter<void>();
}