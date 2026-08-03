// vendor-resolution-center.component.ts
// ============================================================
// IMPORTS
// ============================================================

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { VendorService } from '../../../service/vendor-management/vendor-management.service';
import {
  MessageThread,
  ThreadStatus,
  ThreadMessage,
  InternalNote,
  CannedTemplate,
  DisputeCase,
  DisputeCategory,
  DisputeStage,
  DisputeOutcome,
  LinkedRecordType,
  ResolutionSummaryStats,
  ResolutionAuditLogEntry,
  getThreadStatusColor,
  getDisputeStageColor,
  getDisputeStageLabel,
  getDisputeCategoryIcon,
  getDisputeOutcomeLabel,
  getSlaStatus,
  formatDurationMinutes
} from '../../../domain/vendor-management/vendor-management.dto';

type MainTab = 'inbox' | 'disputes';
type DisputeViewMode = 'kanban' | 'table';

// ============================================================
// COMPONENT
// ============================================================

@Component({
  selector: 'app-vendor-resolution-center',
  templateUrl: './vendor-resolution-center.component.html',
  styleUrl: './vendor-resolution-center.component.scss'
})
export class VendorResolutionCenterComponent implements OnInit, OnDestroy {

  // Expose enums/consts to template
  readonly disputeStages: DisputeStage[] = ['OPENED', 'VENDOR_NOTIFIED', 'UNDER_REVIEW', 'MEDIATION', 'RESOLVED_ESCALATED', 'CLOSED'];
  readonly disputeCategories: DisputeCategory[] = ['PAYMENT', 'QUALITY', 'DELIVERY_DELAY', 'CONTRACT_BREACH', 'FRAUD_SUSPICION', 'OTHER'];
  readonly disputeOutcomes: DisputeOutcome[] = ['REFUND_ISSUED', 'PENALTY_APPLIED', 'VENDOR_WARNING', 'NO_FAULT_FOUND', 'CONTRACT_TERMINATED'];

  // ============================================================
  // STATE
  // ============================================================

  isLoading = true;
  activeMainTab: MainTab = 'inbox';
  disputeViewMode: DisputeViewMode = 'kanban';

  summary: ResolutionSummaryStats | null = null;
  threads: MessageThread[] = [];
  disputeCases: DisputeCase[] = [];
  cannedTemplates: CannedTemplate[] = [];
  auditLog: ResolutionAuditLogEntry[] = [];

  // Inbox filters
  inboxSearch = '';
  inboxStatusFilter: 'ALL' | ThreadStatus = 'ALL';
  inboxLinkedTypeFilter: 'ALL' | LinkedRecordType = 'ALL';

  // Selected thread
  selectedThreadId: string | null = null;
  composeText = '';
  noteText = '';
  showTemplatePicker = false;
  composingNote = false;

  // Escalate-to-dispute mini form
  showEscalateForm = false;
  escalateCategory: DisputeCategory = 'OTHER';
  escalateSubject = '';

  // New dispute (direct) mini form
  showNewDisputeForm = false;
  newDisputeVendorName = '';
  newDisputeCategory: DisputeCategory = 'OTHER';
  newDisputeSubject = '';
  newDisputeLinkedLabel = '';

  // Selected dispute case
  selectedCaseId: string | null = null;
  showCloseForm = false;
  closeOutcome: DisputeOutcome = 'NO_FAULT_FOUND';
  closeNote = '';

  actionFeedback: string | null = null;

  private subscriptions: Subscription[] = [];

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(private vendorService: VendorService) { }

  ngOnInit(): void {
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  // ============================================================
  // DATA LOADING
  // ============================================================

  loadAll(): void {
    this.isLoading = true;

    this.subscriptions.push(
      this.vendorService.getResolutionSummaryStats().subscribe(s => this.summary = s)
    );

    this.subscriptions.push(
      this.vendorService.getMessageThreads().subscribe(data => {
        this.threads = data;
        if (data.length && !this.selectedThreadId) this.selectedThreadId = data[0].id;
        this.isLoading = false;
      })
    );

    this.subscriptions.push(
      this.vendorService.getDisputeCases().subscribe(data => {
        this.disputeCases = data;
        if (data.length && !this.selectedCaseId) this.selectedCaseId = data[0].id;
      })
    );

    this.subscriptions.push(
      this.vendorService.getCannedTemplates().subscribe(data => this.cannedTemplates = data)
    );

    this.subscriptions.push(
      this.vendorService.getResolutionAuditLog().subscribe(data => this.auditLog = data)
    );
  }

  refreshSummary(): void {
    this.vendorService.getResolutionSummaryStats().subscribe(s => this.summary = s);
  }

  setMainTab(tab: MainTab): void {
    this.activeMainTab = tab;
  }

  private clearFeedbackSoon(): void {
    setTimeout(() => this.actionFeedback = null, 4000);
  }

  formatDuration(minutes: number | null): string {
    return formatDurationMinutes(minutes);
  }

  timeAgo(date: Date): string {
    const diffMs = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  // ============================================================
  // INBOX
  // ============================================================

  get filteredThreads(): MessageThread[] {
    let result = [...this.threads];

    if (this.inboxSearch.trim()) {
      const q = this.inboxSearch.trim().toLowerCase();
      result = result.filter(t =>
        t.vendorName.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.linkedRecord.label.toLowerCase().includes(q)
      );
    }
    if (this.inboxStatusFilter !== 'ALL') {
      result = result.filter(t => t.status === this.inboxStatusFilter);
    }
    if (this.inboxLinkedTypeFilter !== 'ALL') {
      result = result.filter(t => t.linkedRecord.type === this.inboxLinkedTypeFilter);
    }

    return result.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }

  get selectedThread(): MessageThread | null {
    return this.threads.find(t => t.id === this.selectedThreadId) || null;
  }

  selectThread(threadId: string): void {
    this.selectedThreadId = threadId;
    this.composeText = '';
    this.noteText = '';
    this.showTemplatePicker = false;
    this.composingNote = false;
    this.showEscalateForm = false;

    const thread = this.threads.find(t => t.id === threadId);
    if (thread && thread.unreadCount > 0) {
      this.threads = this.threads.map(t => t.id === threadId ? { ...t, unreadCount: 0 } : t);
    }
  }

  statusColor(status: ThreadStatus): string {
    return getThreadStatusColor(status);
  }

  statusLabel(status: ThreadStatus): string {
    const map: Record<ThreadStatus, string> = {
      OPEN: 'Open',
      AWAITING_VENDOR: 'Awaiting Vendor',
      AWAITING_STAFF: 'Awaiting Staff',
      RESOLVED: 'Resolved',
      ARCHIVED: 'Archived'
    };
    return map[status];
  }

  linkedTypeIcon(type: LinkedRecordType): string {
    const map: Record<LinkedRecordType, string> = {
      RFQ: 'fa-file-invoice',
      PO: 'fa-cart-shopping',
      INVOICE: 'fa-receipt',
      CONTRACT: 'fa-file-contract',
      DOCUMENT: 'fa-file-lines',
      NONE: 'fa-comment-dots'
    };
    return map[type];
  }

  sendMessage(): void {
    if (!this.selectedThreadId || !this.composeText.trim()) return;
    this.vendorService.sendThreadMessage(this.selectedThreadId, this.composeText.trim()).subscribe(() => {
      this.vendorService.getMessageThreads().subscribe(data => this.threads = data);
      this.composeText = '';
      this.actionFeedback = 'Message sent.';
      this.refreshSummary();
      this.clearFeedbackSoon();
    });
  }

  toggleNoteComposer(): void {
    this.composingNote = !this.composingNote;
  }

  addNote(): void {
    if (!this.selectedThreadId || !this.noteText.trim()) return;
    this.vendorService.addInternalNote(this.selectedThreadId, this.noteText.trim()).subscribe(() => {
      this.vendorService.getMessageThreads().subscribe(data => this.threads = data);
      this.noteText = '';
      this.composingNote = false;
      this.actionFeedback = 'Internal note added — not visible to the vendor.';
      this.clearFeedbackSoon();
    });
  }

  applyTemplate(template: CannedTemplate): void {
    this.composeText = template.content;
    this.showTemplatePicker = false;
  }

  markResolved(): void {
    if (!this.selectedThreadId) return;
    this.vendorService.updateThreadStatus(this.selectedThreadId, 'RESOLVED').subscribe(updated => {
      this.threads = updated;
      this.actionFeedback = 'Thread marked as resolved.';
      this.refreshSummary();
      this.clearFeedbackSoon();
    });
  }

  archiveThread(): void {
    if (!this.selectedThreadId) return;
    this.vendorService.updateThreadStatus(this.selectedThreadId, 'ARCHIVED').subscribe(updated => {
      this.threads = updated;
      this.actionFeedback = 'Thread archived.';
      this.refreshSummary();
      this.clearFeedbackSoon();
    });
  }

  openEscalateForm(): void {
    const thread = this.selectedThread;
    if (!thread) return;
    this.escalateSubject = `Re: ${thread.linkedRecord.label !== '' ? thread.linkedRecord.label : thread.subject}`;
    this.showEscalateForm = true;
  }

  cancelEscalateForm(): void {
    this.showEscalateForm = false;
  }

  confirmEscalate(): void {
    const thread = this.selectedThread;
    if (!thread || !this.escalateSubject.trim()) return;

    this.vendorService.openDisputeCase({
      vendorId: thread.vendorId,
      vendorName: thread.vendorName,
      category: this.escalateCategory,
      subject: this.escalateSubject.trim(),
      linkedRecord: thread.linkedRecord,
      ownerName: 'You',
      threadId: thread.id
    }).subscribe(newCase => {
      this.disputeCases = [newCase, ...this.disputeCases];
      this.threads = this.threads.map(t => t.id === thread.id ? { ...t, hasLinkedDispute: true, disputeCaseId: newCase.id } : t);
      this.showEscalateForm = false;
      this.selectedCaseId = newCase.id;
      this.activeMainTab = 'disputes';
      this.actionFeedback = `Dispute case ${newCase.caseNumber} opened for ${thread.vendorName}.`;
      this.refreshSummary();
      this.clearFeedbackSoon();
    });
  }

  // ============================================================
  // DISPUTES
  // ============================================================

  disputeStageFilter: 'ALL' | DisputeStage = 'ALL';

  get filteredDisputeCases(): DisputeCase[] {
    let result = [...this.disputeCases];
    if (this.disputeStageFilter !== 'ALL') {
      result = result.filter(c => c.stage === this.disputeStageFilter);
    }
    return result.sort((a, b) => new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime());
  }

  casesByStage(stage: DisputeStage): DisputeCase[] {
    return this.filteredDisputeCases.filter(c => c.stage === stage);
  }

  get selectedCase(): DisputeCase | null {
    return this.disputeCases.find(c => c.id === this.selectedCaseId) || null;
  }

  selectCase(caseId: string): void {
    this.selectedCaseId = caseId;
    this.showCloseForm = false;
  }

  stageColor(stage: DisputeStage): string {
    return getDisputeStageColor(stage);
  }

  stageLabel(stage: DisputeStage): string {
    return getDisputeStageLabel(stage);
  }

  categoryIcon(category: DisputeCategory): string {
    return getDisputeCategoryIcon(category);
  }

  categoryLabel(category: DisputeCategory): string {
    const map: Record<DisputeCategory, string> = {
      PAYMENT: 'Payment',
      QUALITY: 'Quality',
      DELIVERY_DELAY: 'Delivery Delay',
      CONTRACT_BREACH: 'Contract Breach',
      FRAUD_SUSPICION: 'Fraud / Suspicion',
      OTHER: 'Other'
    };
    return map[category];
  }

  outcomeLabel(outcome: DisputeOutcome): string {
    return getDisputeOutcomeLabel(outcome);
  }

  slaStatus(dcase: DisputeCase): 'on-track' | 'at-risk' | 'overdue' {
    return getSlaStatus(dcase.slaDeadline, dcase.stage);
  }

  slaRemainingLabel(dcase: DisputeCase): string {
    if (dcase.stage === 'CLOSED') return 'Closed';
    const diffMs = new Date(dcase.slaDeadline).getTime() - Date.now();
    const overdue = diffMs < 0;
    const hours = Math.abs(Math.round(diffMs / (1000 * 60 * 60)));
    const days = Math.floor(hours / 24);
    const label = days > 0 ? `${days}d ${hours % 24}h` : `${hours}h`;
    return overdue ? `${label} overdue` : `${label} left`;
  }

  nextStage(stage: DisputeStage): DisputeStage | null {
    const idx = this.disputeStages.indexOf(stage);
    if (idx === -1 || idx >= this.disputeStages.length - 1) return null;
    return this.disputeStages[idx + 1];
  }

  advanceStage(dcase: DisputeCase): void {
    const next = this.nextStage(dcase.stage);
    if (!next) return;
    if (next === 'CLOSED') {
      this.showCloseForm = true;
      return;
    }
    this.vendorService.advanceDisputeStage(dcase.id, next).subscribe(updated => {
      this.disputeCases = updated;
      this.actionFeedback = `${dcase.caseNumber} moved to ${this.stageLabel(next)}.`;
      this.refreshSummary();
      this.clearFeedbackSoon();
    });
  }

  confirmClose(dcase: DisputeCase): void {
    this.vendorService.closeDisputeCase(dcase.id, this.closeOutcome, 'You', this.closeNote.trim() || undefined).subscribe(updated => {
      this.disputeCases = updated;
      this.showCloseForm = false;
      this.closeNote = '';
      this.actionFeedback = `${dcase.caseNumber} closed — outcome: ${this.outcomeLabel(this.closeOutcome)}.`;
      this.refreshSummary();
      this.clearFeedbackSoon();
    });
  }

  cancelClose(): void {
    this.showCloseForm = false;
  }

  openNewDisputeForm(): void {
    this.showNewDisputeForm = true;
    this.newDisputeVendorName = '';
    this.newDisputeCategory = 'OTHER';
    this.newDisputeSubject = '';
    this.newDisputeLinkedLabel = '';
  }

  cancelNewDisputeForm(): void {
    this.showNewDisputeForm = false;
  }

  confirmNewDispute(): void {
    if (!this.newDisputeVendorName.trim() || !this.newDisputeSubject.trim()) return;

    this.vendorService.openDisputeCase({
      vendorId: 'v-manual-' + Math.random().toString(36).slice(2, 7),
      vendorName: this.newDisputeVendorName.trim(),
      category: this.newDisputeCategory,
      subject: this.newDisputeSubject.trim(),
      linkedRecord: { type: 'NONE', id: '', label: this.newDisputeLinkedLabel.trim() || 'Manual case' },
      ownerName: 'You'
    }).subscribe(newCase => {
      this.disputeCases = [newCase, ...this.disputeCases];
      this.showNewDisputeForm = false;
      this.selectedCaseId = newCase.id;
      this.actionFeedback = `Dispute case ${newCase.caseNumber} opened.`;
      this.refreshSummary();
      this.clearFeedbackSoon();
    });
  }
}
