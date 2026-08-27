import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export interface CallModalState {
  open: boolean;
  type: 'CALL' | 'VIDEO_CALL';
  targetName: string;
  targetUserId: number;
  status: 'ringing' | 'connected' | 'ended' | 'failed';
  duration: number;
  muted: boolean;
  videoOff: boolean;
  jitsiRoomUrl?: string;
  callerDisplayName?: string;
}

@Component({
  selector: 'app-call-modal',
  templateUrl: './call-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CallModalComponent implements OnChanges {
  @Input() state!: CallModalState;
  @Input() contactAvatarUrl?: string;

  @Output() callEnded = new EventEmitter<void>();
  @Output() muteToggled = new EventEmitter<void>();
  @Output() videoToggled = new EventEmitter<void>();

  safeJitsiUrl: SafeResourceUrl | null = null;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['state']) {
      const s: CallModalState = changes['state'].currentValue;
      if (s?.jitsiRoomUrl && s.status === 'connected') {
        this.safeJitsiUrl = this.sanitizer.bypassSecurityTrustResourceUrl(s.jitsiRoomUrl);
      } else if (!s?.open) {
        this.safeJitsiUrl = null;
      }
    }
  }

  get showJitsi(): boolean {
    return this.state.status === 'connected' && !!this.safeJitsiUrl;
  }

  formatCallDuration(secs: number): string {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
}
