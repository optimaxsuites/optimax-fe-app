import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export interface CallModalState {
  open: boolean;
  type: 'CALL' | 'VIDEO_CALL';
  targetName: string;
  targetUserId: number;
  myUserId?: number;
  status: 'ringing' | 'connected' | 'ended' | 'failed';
  duration: number;
  muted: boolean;
  videoOff: boolean;
  jitsiRoomUrl?: string;
  callerDisplayName?: string;
}

const JITSI_BASE = 'https://test-meet.optimaxsuites.com';

@Component({
  selector: 'app-call-modal',
  templateUrl: './call-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CallModalComponent implements OnChanges, OnDestroy {
  @Input() state!: CallModalState;
  @Input() contactAvatarUrl?: string;

  @Output() callEnded    = new EventEmitter<void>();
  @Output() muteToggled  = new EventEmitter<void>();
  @Output() videoToggled = new EventEmitter<void>();

  @ViewChild('audioFrame') audioFrameRef?: ElementRef<HTMLIFrameElement>;

  trustedIframeUrl: SafeResourceUrl | null = null;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['state']) return;
    const prev: CallModalState | undefined = changes['state'].previousValue;
    const curr: CallModalState             = changes['state'].currentValue;

    // Build iframe URL when status transitions to 'connected'
    if (curr?.status === 'connected' && prev?.status !== 'connected') {
      const url = this.buildIframeUrl(curr);
      this.trustedIframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }

    // Tear down when call ends or modal closes
    if (prev?.status === 'connected' &&
        (curr?.status === 'ended' || curr?.status === 'failed' || !curr?.open)) {
      this.trustedIframeUrl = null;
    }

    // For voice calls: relay mute toggle to the hidden Jitsi iframe via postMessage
    if (curr?.type === 'CALL' && prev && prev.muted !== curr.muted) {
      this.sendJitsiCommand('toggleAudio');
    }
  }

  ngOnDestroy(): void {
    this.trustedIframeUrl = null;
  }

  private sendJitsiCommand(command: string): void {
    const frame = this.audioFrameRef?.nativeElement;
    if (!frame?.contentWindow) return;
    try {
      frame.contentWindow.postMessage(
        JSON.stringify({ type: 'execute', name: command }),
        JITSI_BASE,
      );
    } catch (_) {}
  }

  private buildIframeUrl(s: CallModalState): string {
    const isAudio = s.type === 'CALL';
    let room = '';
    let jwt  = '';

    if (s.jitsiRoomUrl) {
      try {
        const clean = s.jitsiRoomUrl.split('#')[0];
        const u     = new URL(clean);
        room = u.pathname.replace(/^\//, '');
        jwt  = u.searchParams.get('jwt') || '';
      } catch {
        room = s.jitsiRoomUrl.replace(/^\//, '');
      }
    }

    if (!room) {
      const a = Math.min(s.myUserId ?? 0, s.targetUserId);
      const b = Math.max(s.myUserId ?? 0, s.targetUserId);
      room = `dm-${a}-${b}`;
    }

    let url = `${JITSI_BASE}/${room}`;
    if (jwt) url += `?jwt=${jwt}`;

    // For video calls: show mic + camera in Jitsi's own toolbar (cross-origin iframe
    // cannot be controlled from outside). End Call lives in our strip below the iframe.
    // For audio calls: no toolbar — iframe is hidden; mute via postMessage instead.
    const toolbarButtons = isAudio ? '[]' : '["microphone","camera"]';

    url += '#config.prejoinPageEnabled=false'
         + `&config.startWithVideoMuted=${isAudio}`
         + '&config.startWithAudioMuted=false'
         + '&config.disableDeepLinking=true'
         + '&config.disableHangupButton=true'
         + `&config.toolbarButtons=${toolbarButtons}`
         + '&interfaceConfig.SHOW_JITSI_WATERMARK=false'
         + '&interfaceConfig.SHOW_BRAND_WATERMARK=false'
         + '&interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false'
         + `&interfaceConfig.TOOLBAR_ALWAYS_VISIBLE=${!isAudio}`
         + '&interfaceConfig.MOBILE_APP_PROMO=false'
         + '&interfaceConfig.DISABLE_JOIN_LEAVE_NOTIFICATIONS=true';

    return url;
  }

  formatCallDuration(secs: number): string {
    if (secs < 0) return 'Calling…';
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
}
