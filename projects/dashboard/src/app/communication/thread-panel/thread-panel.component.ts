import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Message } from '../communication.component';
import { CollabMember, EmployeeProfile } from '../../ui/services/collaboration.service';

export type RightPanelMode = 'pinned' | 'thread' | 'details' | null;

export interface ChannelDetailsInput {
  id: string;
  backendId: number;
  name: string;
  description?: string;
  channelType?: 'PUBLIC' | 'PRIVATE';
  createdBy?: number;
}

@Component({
  selector: 'app-thread-panel',
  templateUrl: './thread-panel.component.html',
  styleUrls: ['./thread-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThreadPanelComponent {
  // ── Inputs ──────────────────────────────────────────
  @Input() mode: RightPanelMode = null;
  @Input() activeThread: Message | null = null;
  @Input() activeThreadReplyToId: string | null = null;
  @Input() activeThreadReplyTarget: Message | null = null;
  @Input() threadReplyDraft = '';
  @Input() sendingReply = false;
  @Input() pinnedMessages: Message[] = [];
  @Input() activeChannel: ChannelDetailsInput | null = null;
  @Input() channelMembers: CollabMember[] = [];
  @Input() channelMembersLoading = false;
  @Input() nonMembers: EmployeeProfile[] = [];
  @Input() myUserId = 0;
  @Input() memberMenuOpen = false;
  @Input() memberMenuUserId = 0;

  // ── Reply edit/delete state (passed from parent) ────
  @Input() editingReplyId: string | null = null;
  @Input() editReplyDraft = '';
  @Input() confirmDeleteReplyId: string | null = null;

  // Avatar helpers
  @Input() getMemberAvatarUrl!: (userId: number) => string | undefined;
  @Input() getMemberName!: (userId: number) => string;
  @Input() colorFor!: (seed: number) => string;
  @Input() isUserOnline!: (userId: number) => boolean;
  @Input() getEmpName!: (e: EmployeeProfile) => string;
  @Input() getEmpInitials!: (e: EmployeeProfile) => string;
  @Input() getEmpAvatarColor!: (e: EmployeeProfile) => string;
  @Input() getEmpImageUrl!: (e: EmployeeProfile) => string | undefined;

  // ── Outputs ─────────────────────────────────────────
  // Thread navigation
  @Output() threadClosed = new EventEmitter<void>();
  @Output() threadReplyDraftChange = new EventEmitter<string>();
  @Output() replyTargetSet = new EventEmitter<{ reply: Message; event?: Event }>();
  @Output() replyTargetCleared = new EventEmitter<void>();
  @Output() replySent = new EventEmitter<void>();

  // Reply edit
  @Output() replyEditStarted = new EventEmitter<{ reply: Message; event?: Event }>();
  @Output() replyEditCancelled = new EventEmitter<void>();
  @Output() replyEditSaved = new EventEmitter<{ reply: Message; rootId: string }>();
  @Output() editReplyDraftChange = new EventEmitter<string>();

  // Reply delete
  @Output() replyDeleteRequested = new EventEmitter<{ reply: Message; event?: Event }>();
  @Output() replyDeleteConfirmed = new EventEmitter<{ reply: Message; rootMsg: Message; event?: Event }>();
  @Output() replyDeleteDismissed = new EventEmitter<void>();

  // Reply like
  @Output() replyLikeToggled = new EventEmitter<{ msg: Message; event?: Event }>();

  // Pinned
  @Output() pinnedPanelClosed = new EventEmitter<void>();
  @Output() pinnedJumpTo = new EventEmitter<Message>();
  @Output() pinnedUnpin = new EventEmitter<{ msg: Message; event: Event }>();
  @Output() pinnedOpenThread = new EventEmitter<{ msg: Message; event: Event }>();

  // Channel details
  @Output() detailsClosed = new EventEmitter<void>();
  @Output() editChannelClicked = new EventEmitter<Event>();
  @Output() memberMenuOpened = new EventEmitter<{ member: CollabMember; event: Event }>();
  @Output() memberMenuClosed = new EventEmitter<void>();
  @Output() makeOwner = new EventEmitter<number>();
  @Output() removeMember = new EventEmitter<CollabMember>();
  @Output() addMember = new EventEmitter<number>();
  @Output() leaveChannel = new EventEmitter<void>();
  @Output() deleteChannel = new EventEmitter<void>();

  // ── Helpers ──────────────────────────────────────────

  isChannelOwner(): boolean {
    return this.activeChannel?.createdBy === this.myUserId;
  }

  isOwnReply(reply: Message): boolean {
    return Number(reply.senderUserId) === Number(this.myUserId);
  }

  onThreadKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.replySent.emit();
    }
  }

  trackById(_: number, m: { id: string }): string {
    return m.id;
  }
}