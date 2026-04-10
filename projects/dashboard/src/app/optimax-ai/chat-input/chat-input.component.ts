import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormatMode, ToneMode } from '../optimax-ai.component';

export interface FormatOption {
  key: FormatMode;
  label: string;
}

@Component({
  selector: 'app-chat-input',
  templateUrl: './chat-input.component.html',
  styleUrl: './chat-input.component.scss',
})
export class ChatInputComponent {
  @Input() placeholder = 'Ask a question...';
  @Input() tone: ToneMode = 'business';
  @Input() responseFormat: FormatMode = 'markdown';
  @Input() formatOptions: FormatOption[] = [];

  @Output() messageSent = new EventEmitter<string>();
  @Output() toneChanged = new EventEmitter<ToneMode>();
  @Output() formatChanged = new EventEmitter<FormatMode>();

  value = '';

  send() {
    if (this.value.trim()) {
      this.messageSent.emit(this.value.trim());
      this.value = '';
    }
  }

  onEnter(event: Event) {
    (event as KeyboardEvent).preventDefault();
    this.send();
  }
}
