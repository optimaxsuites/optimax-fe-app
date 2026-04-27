import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';

export interface CallModalState {
  open: boolean;
  type: 'CALL' | 'VIDEO_CALL';
  targetName: string;
  targetUserId: number;
  status: 'ringing' | 'connected' | 'ended' | 'failed';
  duration: number;
  muted: boolean;
  videoOff: boolean;
}

@Component({
  selector: 'app-call-modal',
  templateUrl: './call-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CallModalComponent {
  @Input() state!: CallModalState;
  @Input() contactAvatarUrl?: string;

  @Output() callEnded = new EventEmitter<void>();
  @Output() muteToggled = new EventEmitter<void>();
  @Output() videoToggled = new EventEmitter<void>();

  formatCallDuration(secs: number): string {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
}