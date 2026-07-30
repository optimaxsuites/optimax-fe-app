import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef
} from '@angular/core';
import {
  ProcurementMessagingService,
  ProcurementMessage
} from '../../../service/procurement/procurement-messaging.service';

@Component({
  selector: 'app-procurement-messaging',
  templateUrl: './procurement-messaging.component.html',
  styleUrls: ['./procurement-messaging.component.scss']
})
export class ProcurementMessagingComponent implements OnInit, OnDestroy {

  @Input() rfqId: string | number = '';
  @Input() currentUserRole: 'REQUESTER' | 'VENDOR' = 'REQUESTER';
  @Input() vendorName: string = '';
  @Input() requesterName: string = 'Procurement Team';

  @ViewChild('messageThread') messageThread!: ElementRef<HTMLDivElement>;

  messages: ProcurementMessage[] = [];
  newMessage = '';
  isSending = false;
  isLoading = false;
  showCompose = false;
  selectedMessageType: 'TEXT' | 'REVISION_REQUEST' | 'CLARIFICATION' | 'SYSTEM_NOTIFICATION' = 'TEXT';

  readonly maxLength = 1000;

  readonly quickReplies: { label: string; text: string; type: 'TEXT' | 'CLARIFICATION' | 'REVISION_REQUEST' }[] = [
    { label: 'Please clarify...', text: 'Please clarify the following:', type: 'CLARIFICATION' },
    { label: 'Confirmed', text: 'Confirmed. We have received your message.', type: 'TEXT' },
    { label: 'Need revision', text: 'We require a revision on the submitted quotation. Please review and resubmit.', type: 'REVISION_REQUEST' }
  ];

  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private messagingService: ProcurementMessagingService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.rfqId) {
      this.loadMessages();
      this.pollInterval = setInterval(() => this.pollMessages(), 30000);
    }
  }

  ngOnDestroy(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  loadMessages(): void {
    this.isLoading = true;
    this.messagingService.getMessages(this.rfqId).subscribe({
      next: (msgs) => {
        this.messages = msgs;
        this.isLoading = false;
        this.cdr.detectChanges();
        this.scrollToBottom();
        this.markUnreadAsRead(msgs);
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  private pollMessages(): void {
    if (!this.rfqId) return;
    this.messagingService.getMessages(this.rfqId).subscribe({
      next: (msgs) => {
        if (msgs.length !== this.messages.length) {
          this.messages = msgs;
          this.cdr.detectChanges();
          this.scrollToBottom();
          this.markUnreadAsRead(msgs);
        }
      }
    });
  }

  private markUnreadAsRead(msgs: ProcurementMessage[]): void {
    msgs
      .filter(m => !m.isRead && !this.isOwnMessage(m))
      .forEach(m => this.messagingService.markAsRead(m.id).subscribe());
  }

  sendMessage(): void {
    const content = this.newMessage.trim();
    if (!content || this.isSending) return;

    this.isSending = true;
    const type = this.selectedMessageType;

    this.messagingService.sendMessage(this.rfqId, content, this.currentUserRole, type).subscribe({
      next: (msg) => {
        this.messages = [...this.messages, msg];
        this.newMessage = '';
        this.selectedMessageType = 'TEXT';
        this.isSending = false;
        this.cdr.detectChanges();
        this.scrollToBottom();
      },
      error: () => {
        this.isSending = false;
      }
    });
  }

  applyQuickReply(reply: { label: string; text: string; type: 'TEXT' | 'CLARIFICATION' | 'REVISION_REQUEST' }): void {
    this.newMessage = reply.text;
    this.selectedMessageType = reply.type;
    this.showCompose = true;
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name
      .split(' ')
      .map(w => w.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  formatTime(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const diffDays = Math.round((today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    if (diffDays === 1) {
      return 'Yesterday';
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  isOwnMessage(msg: ProcurementMessage): boolean {
    return msg.senderRole === this.currentUserRole;
  }

  getRoleBadgeLabel(role: 'REQUESTER' | 'VENDOR' | 'SYSTEM'): string {
    const map: Record<string, string> = {
      REQUESTER: 'Procurement',
      VENDOR: 'Vendor',
      SYSTEM: 'System'
    };
    return map[role] || role;
  }

  getAvatarColor(role: 'REQUESTER' | 'VENDOR' | 'SYSTEM'): string {
    const colors: Record<string, string> = {
      REQUESTER: '#184440',
      VENDOR: '#3b82f6',
      SYSTEM: '#6b7280'
    };
    return colors[role] || '#6b7280';
  }

  getMessageTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      TEXT: '',
      REVISION_REQUEST: 'Revision Request',
      CLARIFICATION: 'Clarification',
      SYSTEM_NOTIFICATION: 'System'
    };
    return labels[type] || '';
  }

  onTextareaKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  autoResize(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messageThread?.nativeElement) {
        this.messageThread.nativeElement.scrollTop = this.messageThread.nativeElement.scrollHeight;
      }
    }, 50);
  }

  get charCount(): number {
    return this.newMessage.length;
  }

  get canSend(): boolean {
    return this.newMessage.trim().length > 0 && !this.isSending;
  }
}
