import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ToneMode, FormatMode } from '../optimax-ai.component';
import { FormatOption } from '../chat-input/chat-input.component';

export interface QuickAction {
  title: string;
  description: string;
  prompt: string;
  iconSvg: string;
}

@Component({
  selector: 'app-welcome-screen',
  templateUrl: './welcome-screen.component.html',
  styleUrl: './welcome-screen.component.scss',
})
export class WelcomeScreenComponent {
  @Input() tone: ToneMode = 'business';
  @Input() responseFormat: FormatMode = 'markdown';
  @Input() formatOptions: FormatOption[] = [];
  @Input() quickActions: QuickAction[] = [];
  @Input() placeholder = 'Ask a question...';
  @Input() moduleLabel = 'All Modules';

  @Output() actionSelected = new EventEmitter<QuickAction>();
  @Output() messageSent = new EventEmitter<string>();
  @Output() toneChanged = new EventEmitter<ToneMode>();
  @Output() formatChanged = new EventEmitter<FormatMode>();
}
