import {
  Component, OnInit, ViewChild,
  ElementRef, AfterViewChecked, OnDestroy, ChangeDetectorRef
} from '@angular/core';

interface Channel {
  id: string;
  name: string;
  description?: string;
  hasUnread?: boolean;
  private?: boolean;
}

interface DirectMessage {
  id: string;
  name: string;
  shortName: string;
  initials: string;
  avatarColor: string;
  online: boolean;
  hasUnread?: boolean;
}

interface Reaction {
  emoji: string;
  count: number;
  reacted: boolean;
  reactedBy: string[];
}

interface Attachment {
  name: string;
  size: string;
  type: string;
}

interface ThreadReply {
  id: string;
  author: string;
  shortName: string;
  initials: string;
  avatarColor: string;
  time: string;
  text: string;
}

interface Message {
  id: string;
  author: string;
  shortName: string;
  initials: string;
  avatarColor: string;
  role?: string;
  time: string;
  text: string;
  type?: 'message' | 'system';
  reactions?: Reaction[];
  replies?: ThreadReply[];
  pinned?: boolean;
  edited?: boolean;
  attachment?: Attachment;
  forwarded?: boolean;
  forwardedFrom?: string;
}

interface MessageGroup {
  author: string;
  shortName: string;
  initials: string;
  avatarColor: string;
  role?: string;
  messages: Message[];
}

interface Member {
  id: string;
  name: string;
  shortName: string;
  initials: string;
  avatarColor: string;
  role: string;
  online: boolean;
}

interface QuickNavItem {
  key: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-communication',
  templateUrl: './communication.component.html',
  styleUrls: ['./communication.component.scss'],
})
export class CommunicationComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('composerArea') composerAreaRef!: ElementRef;

  // ── Current user ──────────────────────────
  currentUser = {
    fullname: 'David Kindness',
    shortName: 'David K.',
    initials: 'DK',
    avatarColor: '#2e6276',
  };

  // ── View state ────────────────────────────
  activeView = 'channel';
  activeChannelId = 'general';
  activeDMId = '';
  searchQuery = '';
  searchResults: { msg: Message; channelId: string; channelName: string }[] = [];
  showSearchResults = false;
  hoveredMsgId: string | null = null;
  showAddChannel = false;
  newChannelName = '';
  newMessageText = '';
  newThreadReply = '';
  replyingTo: Message | null = null;
  rightPanel = false;
  rightPanelType: 'thread' | 'members' | 'pinned' = 'thread';
  rightPanelTitle = '';
  threadParent: Message | null = null;
  typingUsers: string[] = [];
  private typingTimeout: any;
  private scrollPending = false;
  private flashMsgId: string | null = null;

  // Forward state
  forwardingMsg: Message | null = null;
  forwardTargetChannelId = '';
  showForwardDropdown = false;

  // ── Channels ──────────────────────────────
  channels: Channel[] = [
    { id: 'general',        name: 'general',        description: 'Company-wide discussion',     hasUnread: true  },
    { id: 'erp-hr',         name: 'erp-hr',         description: 'HR module discussions',        hasUnread: true  },
    { id: 'erp-accounting', name: 'erp-accounting',  description: 'Finance and accounting'                        },
    { id: 'erp-pos',        name: 'erp-pos',         description: 'Point of Sale operations'                      },
    { id: 'erp-expenses',   name: 'erp-expenses',    description: 'Expense approvals',            hasUnread: true  },
    { id: 'engineering',    name: 'engineering',     description: 'Dev team discussions'                          },
    { id: 'random',         name: 'random',          description: 'Off-topic'                                     },
  ];

  // ── Direct messages ───────────────────────
  directMessages: DirectMessage[] = [
    { id: 'dm-1', name: 'Amara Okonkwo',   shortName: 'Amara O.',   initials: 'AO', avatarColor: '#10b981', online: true,  hasUnread: true  },
    { id: 'dm-2', name: 'Emeka Nwachukwu', shortName: 'Emeka N.',   initials: 'EN', avatarColor: '#6366f1', online: true                   },
    { id: 'dm-3', name: 'Fatima Hassan',   shortName: 'Fatima H.',  initials: 'FH', avatarColor: '#f59e0b', online: false                  },
    { id: 'dm-4', name: 'Tunde Adeyemi',   shortName: 'Tunde A.',   initials: 'TA', avatarColor: '#2e6276', online: true                   },
    { id: 'dm-5', name: 'Ngozi Eze',       shortName: 'Ngozi E.',   initials: 'NE', avatarColor: '#ec4899', online: false                  },
  ];

  // ── Members ───────────────────────────────
  allMembers: Member[] = [
    { id: 'm1', name: 'David Kindness',  shortName: 'David K.',  initials: 'DK', avatarColor: '#2e6276', role: 'System Admin',    online: true  },
    { id: 'm2', name: 'Amara Okonkwo',   shortName: 'Amara O.',  initials: 'AO', avatarColor: '#10b981', role: 'HR Manager',      online: true  },
    { id: 'm3', name: 'Emeka Nwachukwu', shortName: 'Emeka N.',  initials: 'EN', avatarColor: '#6366f1', role: 'Lead Developer',  online: true  },
    { id: 'm4', name: 'Fatima Hassan',   shortName: 'Fatima H.', initials: 'FH', avatarColor: '#f59e0b', role: 'Finance Director',online: false },
    { id: 'm5', name: 'Tunde Adeyemi',   shortName: 'Tunde A.',  initials: 'TA', avatarColor: '#2e6276', role: 'Product Manager', online: true  },
    { id: 'm6', name: 'Ngozi Eze',       shortName: 'Ngozi E.',  initials: 'NE', avatarColor: '#ec4899', role: 'Sales Lead',      online: false },
    { id: 'm7', name: 'Bode Lawal',      shortName: 'Bode L.',   initials: 'BL', avatarColor: '#8b5cf6', role: 'DevOps Engineer', online: true  },
    { id: 'm8', name: 'Chidi Okafor',    shortName: 'Chidi O.',  initials: 'CO', avatarColor: '#0ea5e9', role: 'UI/UX Designer',  online: false },
    { id: 'm9', name: 'Seun Adesanya',   shortName: 'Seun A.',   initials: 'SA', avatarColor: '#14b8a6', role: 'QA Engineer',     online: true  },
  ];

  get onlineMembers()  { return this.allMembers.filter(m => m.online);  }
  get offlineMembers() { return this.allMembers.filter(m => !m.online); }

  // ── Messages store ────────────────────────
  channelMessages: Record<string, Message[]> = {};
  dmMessages: Record<string, Message[]> = {};

  // ── Quick nav ─────────────────────────────
  quickNavItems: QuickNavItem[] = [
    {
      key: 'threads', label: 'Threads',
      icon: `<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>`,
    },
  ];

  // ── Pinned ────────────────────────────────
  get pinnedMessages(): Message[] {
    return (this.channelMessages[this.activeChannelId] || []).filter(m => m.pinned);
  }

  // ── Getters ───────────────────────────────
  get activeChannel(): Channel | undefined {
    return this.channels.find(c => c.id === this.activeChannelId);
  }
  get activeDM(): DirectMessage | undefined {
    return this.directMessages.find(d => d.id === this.activeDMId);
  }
  get activeMessages(): Message[] {
    if (this.activeView === 'dm') return this.dmMessages[this.activeDMId] || [];
    return this.channelMessages[this.activeChannelId] || [];
  }
  get groupedMessages(): MessageGroup[] {
    const msgs = this.activeMessages;
    if (!msgs.length) return [];
    const groups: MessageGroup[] = [];
    let current: MessageGroup | null = null;
    for (const msg of msgs) {
      if (!current || current.author !== msg.author || msg.type === 'system') {
        current = { author: msg.author, shortName: msg.shortName, initials: msg.initials, avatarColor: msg.avatarColor, role: msg.role, messages: [msg] };
        groups.push(current);
      } else {
        current.messages.push(msg);
      }
    }
    return groups;
  }

  get threadReplies(): ThreadReply[] {
    return this.threadParent?.replies || [];
  }

  get allChannelsForForward(): Channel[] {
    return this.channels.filter(c => c.id !== this.activeChannelId);
  }

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.initMessages();
  }

  ngAfterViewChecked() {
    if (this.scrollPending) {
      this.scrollToBottom();
      this.scrollPending = false;
    }
  }

  ngOnDestroy() {
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
  }

  initMessages() {
    const replies1: ThreadReply[] = [
      { id: 'r1', author: 'Tunde Adeyemi', shortName: 'Tunde A.', initials: 'TA', avatarColor: '#2e6276', time: '09:40 AM', text: 'Thanks for the heads up. Will circulate to the team.' },
      { id: 'r2', author: 'Seun Adesanya',  shortName: 'Seun A.',  initials: 'SA', avatarColor: '#14b8a6', time: '10:35 AM', text: 'Noted. Staging environment will be locked during maintenance.' },
    ];

    this.channelMessages['general'] = [
      {
        id: 'msg-1', author: 'Amara Okonkwo', shortName: 'Amara O.', initials: 'AO', avatarColor: '#10b981', role: 'HR Manager',
        time: '09:05 AM', type: 'system', text: 'Amara O. joined the channel'
      },
      {
        id: 'msg-2', author: 'Amara Okonkwo', shortName: 'Amara O.', initials: 'AO', avatarColor: '#10b981', role: 'HR Manager',
        time: '09:10 AM',
        text: 'Good morning everyone. We have a few important HR updates before the week kicks off. Please review the updated leave policy document shared last Friday.',
        reactions: [{ emoji: '👍', count: 3, reacted: false, reactedBy: ['Tunde A.', 'Seun A.', 'Bode L.'] }],
        replies: replies1,
      },
      {
        id: 'msg-3', author: 'Emeka Nwachukwu', shortName: 'Emeka N.', initials: 'EN', avatarColor: '#6366f1', role: 'Lead Developer',
        time: '09:22 AM',
        text: 'The new ERP module deployment is this Saturday at 10 PM. Downtime expected: ~2 hours. Please plan accordingly.',
        reactions: [{ emoji: '👍', count: 4, reacted: true, reactedBy: ['David K.', 'Tunde A.', 'Seun A.', 'Amara O.'] }],
        replies: [],
      },
      {
        id: 'msg-4', author: 'Bode Lawal', shortName: 'Bode L.', initials: 'BL', avatarColor: '#8b5cf6', role: 'DevOps',
        time: '09:30 AM',
        text: 'Server backups are complete. Good to proceed with the Saturday window.',
      },
      {
        id: 'msg-5', author: 'Fatima Hassan', shortName: 'Fatima H.', initials: 'FH', avatarColor: '#f59e0b', role: 'Finance Director',
        time: '10:15 AM',
        text: 'Q3 financial reports are on the shared drive. Department heads — please review budget vs actuals before Thursday\'s CFO call.',
        pinned: true,
        attachment: { name: 'Q3_Financial_Report.pdf', size: '2.4 MB', type: 'pdf' },
        reactions: [{ emoji: '👍', count: 5, reacted: false, reactedBy: ['Amara O.', 'Emeka N.', 'Tunde A.', 'Seun A.', 'Ngozi E.'] }],
        replies: [],
      },
      {
        id: 'msg-6', author: 'Tunde Adeyemi', shortName: 'Tunde A.', initials: 'TA', avatarColor: '#2e6276', role: 'Product Manager',
        time: '11:00 AM',
        text: 'Reminder: Sprint review at 3 PM today. Demos should be ready — we\'re presenting the POS reconciliation feature.',
        replies: [],
      },
      {
        id: 'msg-7', author: 'Ngozi Eze', shortName: 'Ngozi E.', initials: 'NE', avatarColor: '#ec4899', role: 'Sales Lead',
        time: '11:45 AM',
        text: 'September numbers are in. We exceeded target by 12%. Full breakdown on the sales channel.',
        reactions: [{ emoji: '🔥', count: 7, reacted: true, reactedBy: ['David K.', 'Amara O.', 'Emeka N.', 'Tunde A.', 'Bode L.', 'Seun A.', 'Chidi O.'] }],
        replies: [],
      },
    ];

    this.channelMessages['erp-hr'] = [
      {
        id: 'hr-1', author: 'Amara Okonkwo', shortName: 'Amara O.', initials: 'AO', avatarColor: '#10b981', role: 'HR Manager',
        time: '08:30 AM',
        text: 'September payroll processed and approved. All staff should receive credit by end of business today.',
        reactions: [{ emoji: '👍', count: 4, reacted: false, reactedBy: ['Tunde A.', 'Emeka N.', 'Ngozi E.', 'Chidi O.'] }],
        replies: [],
      },
      {
        id: 'hr-2', author: 'Chidi Okafor', shortName: 'Chidi O.', initials: 'CO', avatarColor: '#0ea5e9', role: 'Designer',
        time: '09:15 AM',
        text: 'Hi Amara, I submitted my annual leave request for Oct 14–18. Could you confirm it\'s been received?',
        replies: [],
      },
      {
        id: 'hr-3', author: 'Amara Okonkwo', shortName: 'Amara O.', initials: 'AO', avatarColor: '#10b981', role: 'HR Manager',
        time: '09:20 AM',
        text: 'Confirmed Chidi. Your request is in the system — status PENDING your line manager\'s approval.',
        replies: [],
      },
    ];

    this.channelMessages['engineering'] = [
      {
        id: 'eng-1', author: 'Emeka Nwachukwu', shortName: 'Emeka N.', initials: 'EN', avatarColor: '#6366f1', role: 'Lead Developer',
        time: '08:00 AM',
        text: 'v2.4.1 is branched and in staging. Please hold feature merges until after the Saturday deployment.',
        replies: [],
      },
      {
        id: 'eng-2', author: 'Bode Lawal', shortName: 'Bode L.', initials: 'BL', avatarColor: '#8b5cf6', role: 'DevOps',
        time: '08:15 AM',
        text: 'CI pipeline is green. All regression tests passed.',
        reactions: [{ emoji: '✅', count: 2, reacted: false, reactedBy: ['Emeka N.', 'Seun A.'] }],
        replies: [],
      },
    ];

    this.channelMessages['erp-pos'] = [
      {
        id: 'pos-1', author: 'Ngozi Eze', shortName: 'Ngozi E.', initials: 'NE', avatarColor: '#ec4899', role: 'Sales Lead',
        time: '07:55 AM',
        text: 'All POS terminals at Ikeja branch are online. Opening checks complete.',
        replies: [],
      },
    ];

    this.channelMessages['erp-accounting'] = [];
    this.channelMessages['erp-expenses'] = [];
    this.channelMessages['random'] = [];

    this.dmMessages['dm-1'] = [
      {
        id: 'dm1-1', author: 'Amara Okonkwo', shortName: 'Amara O.', initials: 'AO', avatarColor: '#10b981',
        time: '09:05 AM',
        text: 'Hi David, could you review the updated performance review template? We need to finalise it before Thursday.',
        replies: [],
      },
      {
        id: 'dm1-2', author: 'David Kindness', shortName: 'David K.', initials: 'DK', avatarColor: '#2e6276',
        time: '09:12 AM',
        text: 'Sure, I\'ll look at it within the hour. Any specific section you want me to focus on?',
        replies: [],
      },
      {
        id: 'dm1-3', author: 'Amara Okonkwo', shortName: 'Amara O.', initials: 'AO', avatarColor: '#10b981',
        time: '09:14 AM',
        text: 'Mainly the KPI scoring section — the old template caused a lot of confusion across departments.',
        replies: [],
      },
    ];

    this.dmMessages['dm-2'] = [];
    this.dmMessages['dm-3'] = [];
    this.dmMessages['dm-4'] = [];
    this.dmMessages['dm-5'] = [];
  }

  // ─────────────────────────────────────────
  //  Navigation
  // ─────────────────────────────────────────
  selectChannel(id: string) {
    this.activeChannelId = id;
    this.activeView = 'channel';
    this.activeDMId = '';
    this.rightPanel = false;
    this.replyingTo = null;
    this.showSearchResults = false;
    const ch = this.channels.find(c => c.id === id);
    if (ch) ch.hasUnread = false;
    this.scrollPending = true;
  }

  selectDM(id: string) {
    this.activeDMId = id;
    this.activeView = 'dm';
    this.rightPanel = false;
    this.replyingTo = null;
    this.showSearchResults = false;
    const dm = this.directMessages.find(d => d.id === id);
    if (dm) dm.hasUnread = false;
    this.scrollPending = true;
  }

  selectQuickNav(key: string) {
    this.activeView = key;
    this.rightPanel = false;
  }

  openNewMessage() {
    if (this.directMessages.length) this.selectDM(this.directMessages[0].id);
  }

  addChannel() {
    const name = this.newChannelName.trim().toLowerCase().replace(/\s+/g, '-');
    if (!name || this.channels.find(c => c.id === name)) return;
    this.channels.push({ id: name, name, description: `${name} discussions` });
    this.channelMessages[name] = [];
    this.newChannelName = '';
    this.showAddChannel = false;
    this.selectChannel(name);
  }

  removeChannel(id: string) {
    this.channels = this.channels.filter(c => c.id !== id);
    if (this.activeChannelId === id && this.channels.length) {
      this.selectChannel(this.channels[0].id);
    }
  }

  // ─────────────────────────────────────────
  //  Search
  // ─────────────────────────────────────────
  onSearchInput() {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.searchResults = [];
      this.showSearchResults = false;
      return;
    }
    this.searchResults = [];
    for (const ch of this.channels) {
      const msgs = this.channelMessages[ch.id] || [];
      for (const msg of msgs) {
        if (msg.type === 'system') continue;
        if (msg.text.toLowerCase().includes(q) || msg.shortName.toLowerCase().includes(q)) {
          this.searchResults.push({ msg, channelId: ch.id, channelName: ch.name });
        }
      }
    }
    this.showSearchResults = true;
  }

  jumpToMessage(result: { msg: Message; channelId: string; channelName: string }) {
    this.selectChannel(result.channelId);
    this.searchQuery = '';
    this.showSearchResults = false;
    setTimeout(() => {
      const el = document.getElementById('msg-' + result.msg.id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.flashMsgId = result.msg.id;
        setTimeout(() => { this.flashMsgId = null; this.cdr.detectChanges(); }, 1800);
      }
    }, 200);
  }

  isFlashing(msgId: string): boolean {
    return this.flashMsgId === msgId;
  }

  // ─────────────────────────────────────────
  //  Messaging
  // ─────────────────────────────────────────
  sendMessage() {
    const text = this.newMessageText.trim();
    if (!text) return;

    const msg: Message = {
      id: 'msg-' + Date.now(),
      author: this.currentUser.fullname,
      shortName: this.currentUser.shortName,
      initials: this.currentUser.initials,
      avatarColor: this.currentUser.avatarColor,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: this.replyingTo ? `→ ${this.replyingTo.shortName}: ${text}` : text,
      reactions: [],
      replies: [],
    };

    if (this.activeView === 'dm') {
      if (!this.dmMessages[this.activeDMId]) this.dmMessages[this.activeDMId] = [];
      this.dmMessages[this.activeDMId].push(msg);
    } else {
      if (!this.channelMessages[this.activeChannelId]) this.channelMessages[this.activeChannelId] = [];
      this.channelMessages[this.activeChannelId].push(msg);
    }

    this.newMessageText = '';
    this.replyingTo = null;
    this.scrollPending = true;
  }

  onComposerKeydown(event: KeyboardEvent, el: HTMLTextAreaElement) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
    setTimeout(() => {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    });
  }

  onTyping(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }

  setReplyTo(msg: Message) {
    this.replyingTo = msg;
    setTimeout(() => this.composerAreaRef?.nativeElement.focus(), 50);
  }

  // ─────────────────────────────────────────
  //  Threads
  // ─────────────────────────────────────────
  openThread(msg: Message) {
    this.threadParent = msg;
    this.rightPanelType = 'thread';
    this.rightPanelTitle = 'Thread';
    this.rightPanel = true;
  }

  submitThreadReply() {
    const text = this.newThreadReply.trim();
    if (!text || !this.threadParent) return;
    const reply: ThreadReply = {
      id: 'r-' + Date.now(),
      author: this.currentUser.fullname,
      shortName: this.currentUser.shortName,
      initials: this.currentUser.initials,
      avatarColor: this.currentUser.avatarColor,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text,
    };
    if (!this.threadParent.replies) this.threadParent.replies = [];
    this.threadParent.replies.push(reply);
    this.newThreadReply = '';
  }

  getThreadParticipants(msg: Message): { initials: string; color: string }[] {
    if (!msg.replies || msg.replies.length === 0) return [];
    const seen = new Set<string>();
    const result: { initials: string; color: string }[] = [];
    for (const r of msg.replies) {
      if (!seen.has(r.initials)) {
        seen.add(r.initials);
        result.push({ initials: r.initials, color: r.avatarColor });
      }
    }
    return result.slice(0, 3);
  }
getLastReplyTime(msg: any): string | null {
  if (!msg.replies || msg.replies.length === 0) return null;
  return msg.replies[msg.replies.length - 1].time;
}
  // ─────────────────────────────────────────
  //  Reactions
  // ─────────────────────────────────────────
  toggleReaction(msg: Message, emoji: string) {
    if (!msg.reactions) msg.reactions = [];
    let r = msg.reactions.find(x => x.emoji === emoji);
    if (!r) {
      msg.reactions.push({ emoji, count: 1, reacted: true, reactedBy: [this.currentUser.shortName] });
    } else {
      if (r.reacted) {
        r.count--;
        r.reactedBy = r.reactedBy.filter(n => n !== this.currentUser.shortName);
        r.reacted = false;
        if (r.count <= 0) msg.reactions = msg.reactions.filter(x => x.emoji !== emoji);
      } else {
        r.count++;
        r.reacted = true;
        r.reactedBy.push(this.currentUser.shortName);
      }
    }
  }

  addQuickReaction(msg: Message, emoji: string) {
    this.toggleReaction(msg, emoji);
  }

  // ─────────────────────────────────────────
  //  Pin / Forward
  // ─────────────────────────────────────────
  pinMessage(msg: Message) {
    msg.pinned = !msg.pinned;
  }

  scrollToPinned(msg: Message) {
    const el = document.getElementById('msg-' + msg.id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.flashMsgId = msg.id;
      setTimeout(() => { this.flashMsgId = null; this.cdr.detectChanges(); }, 1800);
    }
  }

  startForward(msg: Message) {
    this.forwardingMsg = msg;
    this.showForwardDropdown = true;
  }

  confirmForward(targetChannelId: string) {
    if (!this.forwardingMsg) return;
    if (!this.channelMessages[targetChannelId]) this.channelMessages[targetChannelId] = [];
    const fwd: Message = {
      id: 'msg-' + Date.now(),
      author: this.currentUser.fullname,
      shortName: this.currentUser.shortName,
      initials: this.currentUser.initials,
      avatarColor: this.currentUser.avatarColor,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: this.forwardingMsg.text,
      forwarded: true,
      forwardedFrom: this.forwardingMsg.shortName,
      reactions: [],
      replies: [],
    };
    this.channelMessages[targetChannelId].push(fwd);
    this.forwardingMsg = null;
    this.showForwardDropdown = false;
  }

  cancelForward() {
    this.forwardingMsg = null;
    this.showForwardDropdown = false;
  }

  // ─────────────────────────────────────────
  //  Right panel
  // ─────────────────────────────────────────
  toggleRightPanel(type: 'thread' | 'members' | 'pinned', title: string) {
    if (this.rightPanel && this.rightPanelType === type) {
      this.rightPanel = false;
    } else {
      this.rightPanelType = type;
      this.rightPanelTitle = title;
      this.rightPanel = true;
    }
  }

  closeRightPanel() { this.rightPanel = false; }

  // ─────────────────────────────────────────
  //  Composer helpers
  // ─────────────────────────────────────────
  wrapSelection(open: string, close: string) {
    const el = this.composerAreaRef?.nativeElement as HTMLTextAreaElement;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const sel = this.newMessageText.substring(start, end);
    this.newMessageText = this.newMessageText.substring(0, start) + open + sel + close + this.newMessageText.substring(end);
    setTimeout(() => { el.selectionStart = start + open.length; el.selectionEnd = end + open.length; el.focus(); });
  }

  // ─────────────────────────────────────────
  //  Scroll
  // ─────────────────────────────────────────
  private scrollToBottom() {
    try {
      if (this.messagesContainer) {
        const el = this.messagesContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    } catch {}
  }
}