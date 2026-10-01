import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  AudioTranscriptionJob,
  CollaborationService,
  MeetingsAssistantResponse,
  UserPrimaryInfo,
} from '../ui/services/collaboration.service';

type CalendarView = 'Day' | 'Week' | 'Month' | 'Agenda';
type EventKind    = 'Meeting' | 'Appointment';
type EventStatus  =
  | 'Draft' | 'Scheduled' | 'Confirmed' | 'Rescheduled'
  | 'In Progress' | 'Completed' | 'Cancelled' | 'No-show' | 'Archived';

interface MeetingEvent {
  id: string; kind: EventKind; title: string; description: string;
  date: string; time: string; duration: number;
  location: string; onlineLink: string;
  priority: 'Low' | 'Medium' | 'High' | 'Executive';
  status: EventStatus; category: string; color: string;
  confidential: boolean; recurring: 'None' | 'Daily' | 'Weekly' | 'Monthly';
  meetingMode: 'Physical' | 'Virtual' | 'Hybrid'; organizer: string;
  attendees: string[]; attendeeResponses: Record<string, 'Accepted' | 'Declined' | 'Tentative' | 'Reschedule'>;
  attendance: Record<string, 'Present' | 'Absent' | 'Excused' | 'Late'>;
  resources: string[]; agenda: AgendaItem[]; minutes: MeetingMinutes;
  actions: MeetingAction[]; reminders: string[]; attachments: string[];
}

interface AgendaItem {
  id: string; topic: string; presenter: string; duration: number;
  state: 'Draft' | 'Shared' | 'Ready' | 'Done'; notes: string;
}
interface MeetingMinutes {
  summary: string; keyDiscussions: string[]; decisions: string[];
  risks: string[]; approvalState: 'Draft' | 'Review' | 'Approved' | 'Published';
}
interface MeetingAction {
  id: string; owner: string; item: string; due: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'In progress' | 'Completed' | 'Overdue' | 'Escalated';
}
interface ResourceBooking {
  name: string; type: string;
  status: 'Available' | 'Booked' | 'Approval required' | 'Conflict detected';
  details: string; bookedFor?: string;
}

@Component({
  selector: 'app-meetings-appointments',
  templateUrl: './meetings-appointments.component.html',
  styleUrls: ['./meetings-appointments.component.scss'],
})
export class MeetingsAppointmentsComponent implements OnInit, OnDestroy {
  @ViewChild('attachFileInput') attachFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('formDrawerEl')   formDrawerEl!: ElementRef<HTMLElement>;

  private readonly LS_EVENTS_KEY = 'ma_workspace_events';

  // ── Main UI state ────────────────────────────────────────
  activeMainTab: 'calendar' | 'analytics' = 'calendar';
  activeDetailTab = 'overview';
  activeForm: EventKind | null = null;
  selectedEventId = '';
  selectedAgendaId = '';
  conflictWarning = '';
  syncMessage = '';
  backendStatus = 'Connecting…';
  backendOnline = false;
  saveLoading = false;

  // ── Toast notifications ───────────────────────────────────
  toasts: { id: number; message: string; type: 'ok' | 'warn' | 'err' }[] = [];
  private toastSeq = 0;

  addToast(message: string, type: 'ok' | 'warn' | 'err' = 'ok'): void {
    const id = ++this.toastSeq;
    this.toasts = [...this.toasts, { id, message, type }];
    setTimeout(() => this.dismissToast(id), 4500);
  }

  dismissToast(id: number): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  // ── Sidebar resize ────────────────────────────────────────
  sidebarWidth = 380;
  private _resizing = false;
  private _resizeStartX = 0;
  private _resizeStartW = 0;

  // Bound references kept for removeEventListener cleanup
  private _boundResizeMove = (e: MouseEvent) => {
    if (!this._resizing) return;
    const delta = this._resizeStartX - e.clientX;
    const w = Math.max(240, Math.min(640, this._resizeStartW + delta));
    this.ngZone.run(() => { this.sidebarWidth = w; });
  };

  private _boundMouseup = () => {
    if (!this._resizing && !this.dragSelectActive) return;
    this.ngZone.run(() => {
      this._resizing = false;
      if (this.dragSelectActive) this.endDragSelect();
    });
  };

  startResize(event: MouseEvent): void {
    this._resizing = true;
    this._resizeStartX = event.clientX;
    this._resizeStartW = this.sidebarWidth;
    event.preventDefault();
  }

  // ── Multi-day selection ───────────────────────────────────
  dragSelectStart: string | null = null;
  dragSelectEnd: string | null = null;
  dragSelectActive = false;
  pinnedDays: Set<string> = new Set();
  quickCreate = {
    visible: false, startDate: '', endDate: '',
    title: '', kind: 'Meeting' as EventKind, startTime: '09:00', endTime: '10:00',
    description: '', priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Executive',
  };

  // ── Calendar navigation ──────────────────────────────────
  calendarView: CalendarView = 'Week';
  calendarDate = new Date();
  eventSearch = '';
  filterKind: '' | EventKind = '';
  filterStatus: '' | EventStatus = '';
  hours = Array.from({ length: 15 }, (_, i) => i + 7); // 7am – 9pm

  // ── Events ───────────────────────────────────────────────
  events: MeetingEvent[] = [];

  // ── Resources ────────────────────────────────────────────
  resources: ResourceBooking[] = [
    { name: 'Board Room A',      type: 'Conference room', status: 'Available',         details: '18 seats, screen, video conference' },
    { name: 'Training Hall',     type: 'Training hall',  status: 'Approval required',  details: '60 seats, projector, laptops' },
    { name: 'Company Vehicle 04',type: 'Vehicle',         status: 'Available',          details: 'External visit support' },
    { name: 'Cisco Room Kit',    type: 'Video equipment', status: 'Available',          details: 'Hybrid meeting endpoint' },
  ];

  // ── User / employee lookup ───────────────────────────────
  registeredUsers: UserPrimaryInfo[] = [];
  employees: any[] = [];
  employeeSearch = '';
  showEmpSuggestions = false;

  // ── AI ───────────────────────────────────────────────────
  aiLoading = false;
  aiOutput: MeetingsAssistantResponse | null = null;
  notesInput = 'Reviewed revenue variance, procurement blocker, room availability, and the need to publish minutes before Friday.';

  // ── Virtual meeting ──────────────────────────────────────
  jitsiBaseUrl = 'https://test-meet.optimaxsuites.com';
  activeMeetingMode: 'CALL' | 'VIDEO' | null = null;
  meetingRoomName = '';
  meetingRoomUrl = '';
  meetingGuestUrl = '';          // shareable plain URL for external attendees
  trustedMeetingRoomUrl: SafeResourceUrl | null = null;
  meetingRoomOpen = false;
  jitsiJoining = false;          // shows spinner while requesting JWT

  // ── Transcription ─────────────────────────────────────────
  transcriptionTitle = '';
  transcriptionMeetingType = 'Collaboration Meeting';
  transcriptionLanguage = 'en';
  transcriptionSpeakerHints = '';
  transcriptionFormatAsMinutes = true;
  transcriptionStatus = 'No transcription job yet.';
  transcriptionOutput = 'Formatted minutes or transcript will appear here.';
  private transcriptionPollTimer: ReturnType<typeof setInterval> | null = null;

  // ── Forms ─────────────────────────────────────────────────
  form = this.emptyEventForm('Meeting');
  agendaForm = { topic: '', presenter: '', duration: 15, notes: '' };
  actionForm = { owner: '', item: '', due: '', priority: 'Medium' as 'Low' | 'Medium' | 'High' };
  participantInput = '';
  attachmentInput = '';

  // ── Lookup lists ─────────────────────────────────────────
  calendarViews: CalendarView[] = ['Day', 'Week', 'Month', 'Agenda'];
  statuses: EventStatus[] = ['Draft','Scheduled','Confirmed','Rescheduled','In Progress','Completed','Cancelled','No-show','Archived'];
  responseOptions  = ['Accepted', 'Declined', 'Tentative', 'Reschedule'] as const;
  attendanceOptions = ['Present', 'Absent', 'Excused', 'Late'] as const;
  integrations     = ['Google Calendar', 'Microsoft Outlook', 'Exchange Server', 'iCal'];
  virtualPlatforms = ['Zoom', 'Microsoft Teams', 'Google Meet', 'Cisco Webex'];

  constructor(
    private collaborationService: CollaborationService,
    private sanitizer: DomSanitizer,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    console.log('[M&A] ngOnInit — loading workspace');
    this.loadWorkspace();
    this.loadEmployees();
    // Register document listeners outside Angular's zone so that the constant
    // stream of mousemove/touchmove events on mobile does not trigger change
    // detection on every frame — only ngZone.run() inside the handlers does.
    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('mousemove', this._boundResizeMove);
      document.addEventListener('mouseup', this._boundMouseup);
    });
  }

  ngOnDestroy(): void {
    console.log('[M&A] ngOnDestroy');
    this.stopTranscriptionPolling();
    document.removeEventListener('mousemove', this._boundResizeMove);
    document.removeEventListener('mouseup', this._boundMouseup);
  }

  // ── Calendar computed ─────────────────────────────────────

  get selectedEvent(): MeetingEvent | undefined {
    return this.events.find(e => e.id === this.selectedEventId) || this.events[0];
  }

  // Memoized: recomputed only when this.events reference changes.
  // Prevents O(N×52) expansion from running on every change-detection cycle.
  private _expandedCache: { ref: MeetingEvent[]; result: MeetingEvent[] } | null = null;

  get expandedEvents(): MeetingEvent[] {
    if (this._expandedCache?.ref === this.events) return this._expandedCache.result;
    const result: MeetingEvent[] = [];
    const cap = new Date();
    cap.setFullYear(cap.getFullYear() + 1);
    const maxIso = cap.toISOString().slice(0, 10);
    for (const ev of this.events) {
      result.push(ev);
      if (ev.recurring === 'None') continue;
      const base = new Date(ev.date + 'T12:00:00');
      for (let i = 1; i <= 52; i++) {
        const d = new Date(base);
        if (ev.recurring === 'Daily')   d.setDate(d.getDate() + i);
        else if (ev.recurring === 'Weekly')  d.setDate(d.getDate() + i * 7);
        else if (ev.recurring === 'Monthly') d.setMonth(d.getMonth() + i);
        const iso = d.toISOString().slice(0, 10);
        if (iso > maxIso) break;
        result.push({ ...ev, id: `${ev.id}-r${i}`, date: iso, status: ev.status === 'Completed' ? 'Scheduled' : ev.status });
      }
    }
    this._expandedCache = { ref: this.events, result };
    return result;
  }

  eventsForDay(iso: string): MeetingEvent[] {
    return this.expandedEvents.filter(e => e.date === iso).sort((a, b) => a.time.localeCompare(b.time));
  }

  get visibleEvents(): MeetingEvent[] {
    let base = this.expandedEvents;
    if (this.eventSearch.trim()) {
      const q = this.eventSearch.toLowerCase();
      base = base.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.attendees.some(a => a.toLowerCase().includes(q))
      );
    }
    if (this.filterKind)   base = base.filter(e => e.kind === this.filterKind);
    if (this.filterStatus) base = base.filter(e => e.status === this.filterStatus);

    const iso = this.calendarDate.toISOString().slice(0, 10);
    if (this.calendarView === 'Agenda') return [...base].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
    if (this.calendarView === 'Day')    return base.filter(e => e.date === iso).sort((a, b) => a.time.localeCompare(b.time));
    if (this.calendarView === 'Week')   return base.filter(e => this.weekDays.some(d => d.iso === e.date));
    const monthStr = this.calendarDate.toISOString().slice(0, 7);
    return base.filter(e => e.date.startsWith(monthStr));
  }

  get weekDays(): { date: Date; label: string; shortLabel: string; iso: string; isToday: boolean }[] {
    const d = new Date(this.calendarDate);
    d.setDate(d.getDate() - d.getDay());
    const todayIso = this.todayStr();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(d);
      date.setDate(d.getDate() + i);
      const iso = date.toISOString().slice(0, 10);
      return {
        date,
        label: date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }),
        shortLabel: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }),
        iso,
        isToday: iso === todayIso,
      };
    });
  }

  get monthGrid(): { iso: string; day: number; inMonth: boolean; isToday: boolean }[] {
    const year  = this.calendarDate.getFullYear();
    const month = this.calendarDate.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayIso = this.todayStr();
    const cells: any[] = [];
    for (let i = firstDow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i); cells.push({ iso: d.toISOString().slice(0,10), day: d.getDate(), inMonth: false, isToday: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const iso  = date.toISOString().slice(0, 10);
      cells.push({ iso, day: d, inMonth: true, isToday: iso === todayIso });
    }
    while (cells.length % 7 !== 0) {
      const d = new Date(year, month + 1, cells.length - firstDow - daysInMonth + 1);
      cells.push({ iso: d.toISOString().slice(0,10), day: d.getDate(), inMonth: false, isToday: false });
    }
    return cells;
  }

  get calendarTitle(): string {
    const d = this.calendarDate;
    switch (this.calendarView) {
      case 'Day':   return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      case 'Week': {
        const s = this.weekDays[0].date, e = this.weekDays[6].date;
        return `${s.toLocaleDateString('en-GB', {day:'numeric', month:'short'})} – ${e.toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'})}`;
      }
      case 'Month':  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      default:       return 'All events';
    }
  }

  navigateCalendar(dir: -1 | 1): void {
    const d = new Date(this.calendarDate);
    switch (this.calendarView) {
      case 'Day':   d.setDate(d.getDate() + dir); break;
      case 'Week':  d.setDate(d.getDate() + dir * 7); break;
      case 'Month': d.setMonth(d.getMonth() + dir); break;
    }
    this.calendarDate = d;
  }

  goToToday(): void { this.calendarDate = new Date(); }

  selectDay(iso: string): void {
    this.calendarDate = new Date(iso + 'T12:00:00');
    this.calendarView = 'Day';
  }

  getEventTop(ev: MeetingEvent): number {
    const [h, m] = ev.time.split(':').map(Number);
    return Math.max(0, (h - 7) * 60 + m);
  }

  getEventHeight(ev: MeetingEvent): number { return Math.max(28, ev.duration); }

  // ── Metrics ───────────────────────────────────────────────

  get metrics() {
    const today = this.todayStr();
    return [
      { label: "Today's meetings",      value: this.events.filter(e => e.kind === 'Meeting' && e.date === today).length,                           detail: 'Confirmed, in-progress & scheduled',                     tone: 'blue'  },
      { label: 'Upcoming appointments', value: this.events.filter(e => e.kind === 'Appointment' && e.status !== 'Completed').length,               detail: 'Personal, external & recurring',                         tone: 'green' },
      { label: 'Pending approvals',     value: this.resources.filter(r => r.status === 'Approval required').length,                                detail: 'Rooms, resources & executive workflows',                 tone: 'amber' },
      { label: 'Overdue actions',       value: this.events.flatMap(e => e.actions).filter(a => a.status === 'Overdue' || a.status === 'Escalated').length, detail: 'Open follow-ups needing escalation', tone: 'red'   },
    ];
  }

  // ── Event CRUD ────────────────────────────────────────────

  openForm(kind: EventKind): void {
    this.activeForm = kind;
    this.form = this.emptyEventForm(kind);
    this.conflictWarning = '';
    setTimeout(() => this.formDrawerEl?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }

  slotClick(dateStr: string, hour: number): void {
    const kind: EventKind = hour >= 8 && hour < 18 ? 'Meeting' : 'Appointment';
    this.openForm(kind);
    this.form.date = dateStr;
    this.form.time = `${String(hour).padStart(2, '0')}:00`;
    this.form.status = kind === 'Meeting' ? 'Draft' : 'Scheduled';
  }

  dayBodyClick(dateStr: string, event: MouseEvent): void {
    const t = event.target as HTMLElement;
    // Chips use stopPropagation so they never reach here; guard defensively anyway
    if (t.closest('.cal-event-chip') || t.closest('button') || t.closest('a')) return;
    const hour = Math.min(21, Math.max(7, Math.floor(event.offsetY / 60) + 7));
    const minute = Math.round((event.offsetY % 60) / 60 * 2) * 30;
    const kind: EventKind = hour >= 8 && hour < 18 ? 'Meeting' : 'Appointment';
    this.openForm(kind);
    this.form.date = dateStr;
    this.form.time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    this.form.status = kind === 'Meeting' ? 'Draft' : 'Scheduled';
  }

  editEvent(event: MeetingEvent): void {
    this.activeForm = event.kind;
    this.selectedEventId = event.id;
    this.form = { ...event, attendeesText: event.attendees.join(', '), remindersText: event.reminders.join(', ') } as any;
    this.conflictWarning = '';
    setTimeout(() => this.formDrawerEl?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }

  saveEvent(): void {
    if (this.saveLoading) return;
    const payload = this.normalizeForm();
    this.conflictWarning = this.checkConflict(payload);
    this.saveLoading = true;
    const isUpdate = this.events.some(e => e.id === payload.id);
    const idx = this.events.findIndex(e => e.id === payload.id);
    const nextEvs = [...this.events];
    if (idx >= 0) { nextEvs[idx] = payload; this.events = nextEvs; this.saveToLocalStorage(); this.syncEvent(payload, true); }
    else          { this.events = [payload, ...nextEvs]; this.saveToLocalStorage(); this.syncEvent(payload, false); }
    this.selectedEventId  = payload.id;
    this.activeForm       = null;
    this.activeDetailTab  = 'overview';
    this.saveLoading = false;
    this.addToast(`${payload.kind} "${payload.title}" ${isUpdate ? 'updated' : 'created'}`, 'ok');
    if (!payload.id.includes('-r')) {
      this.collaborationService.sendMeetingInvites(payload.id, payload.attendees).subscribe({ error: () => undefined });
    }
  }

  deleteEvent(event: MeetingEvent): void {
    if (!confirm(`Delete "${event.title}"? This cannot be undone.`)) return;
    const title = event.title;
    this.events = this.events.filter(e => e.id !== event.id);
    if (this.selectedEventId === event.id) this.selectedEventId = this.events[0]?.id || '';
    this.saveToLocalStorage();
    this.addToast(`"${title}" deleted`, 'warn');
    this.collaborationService.deleteMeetingsAppointmentRecord(event.id).subscribe({ error: () => undefined });
    this.collaborationService.saveMeetingsAppointmentsWorkspace({ events: this.events, resources: this.resources }).subscribe({ error: () => undefined });
  }

  selectEvent(event: MeetingEvent): void {
    const base = this.events.find(e => e.id === event.id || event.id.startsWith(e.id + '-r'));
    this.selectedEventId = base?.id || event.id;
    this.selectedAgendaId = this.selectedEvent?.agenda[0]?.id || '';
    this.activeDetailTab = 'overview';
  }

  updateStatus(event: MeetingEvent, status: EventStatus): void { event.status = status; this.persistAndSync(event); }

  // ── Attendees ────────────────────────────────────────────

  addParticipant(): void {
    const event = this.selectedEvent;
    const p = this.participantInput.trim();
    if (!event || !p || event.attendees.includes(p)) return;
    event.attendees = [...event.attendees, p];
    event.attendeeResponses[p] = 'Tentative';
    event.attendance[p] = 'Absent';
    this.participantInput = '';
    this.addToast(`${p} added as attendee — invite pending`, 'ok');
    this.persistAndSync(event);
  }

  removeParticipant(event: MeetingEvent, p: string): void {
    event.attendees = event.attendees.filter(a => a !== p);
    delete event.attendeeResponses[p];
    delete event.attendance[p];
    this.persistAndSync(event);
  }

  setParticipantResponse(event: MeetingEvent, p: string, r: 'Accepted' | 'Declined' | 'Tentative' | 'Reschedule'): void {
    event.attendeeResponses[p] = r; this.persistAndSync(event);
  }
  setAttendance(event: MeetingEvent, p: string, a: 'Present' | 'Absent' | 'Excused' | 'Late'): void {
    event.attendance[p] = a; this.persistAndSync(event);
  }

  // ── Employee lookup ───────────────────────────────────────

  loadEmployees(): void {
    // Always load both sources in parallel so at least one works
    this.collaborationService.getAllUserPrimaryInformation().subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) this.registeredUsers = res;
        else if (res?.content && Array.isArray(res.content)) this.registeredUsers = res.content;
        else if (res?.data && Array.isArray(res.data)) this.registeredUsers = res.data;
        else this.registeredUsers = [];
      },
      error: () => { this.registeredUsers = []; },
    });
    this.collaborationService.getHrEmployees().subscribe({
      next: (hr: any) => { this.employees = hr?.content || (Array.isArray(hr) ? hr : []); },
      error: () => { this.employees = []; },
    });
  }

  get filteredEmployees(): any[] {
    const q = this.employeeSearch.trim().toLowerCase();
    if (!q) return [];
    const combined: any[] = [
      ...this.registeredUsers.map(u => ({
        _src: 'reg',
        id: u.id, fullname: u.fullname, email: u.email, username: u.username,
        _search: `${u.fullname || ''} ${u.email || ''} ${u.username || ''}`.toLowerCase(),
      })),
      ...this.employees.map((e: any) => ({
        _src: 'hr',
        id: e.id, fullname: e.fullName || e.name, email: e.email, username: e.employeeId,
        _search: `${e.fullName || e.name || ''} ${e.email || ''}`.toLowerCase(),
      })),
    ];
    return combined.filter(u => u._search.includes(q)).slice(0, 8);
  }

  addAttendeeFromEmployee(emp: any): void {
    const name = emp.fullname || emp.fullName || emp.name || emp.username || emp.email || `User ${emp.id}`;
    if (!name) return;
    this.participantInput = name;
    this.employeeSearch = '';
    this.showEmpSuggestions = false;
    this.addParticipant();
  }

  // ── Multi-day calendar selection ──────────────────────────

  onMonthCellMousedown(iso: string, event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('.month-chip')) return; // chips handle their own clicks
    if ((event.target as HTMLElement).closest('.cell-day')) return;   // day-number navigates
    if (event.ctrlKey || event.metaKey) {
      if (this.pinnedDays.has(iso)) { this.pinnedDays.delete(iso); } else { this.pinnedDays.add(iso); }
      this.pinnedDays = new Set(this.pinnedDays);
      if (this.pinnedDays.size > 1) this.openQuickCreateForPinned();
      event.preventDefault();
      return;
    }
    if (event.shiftKey) {
      const ref = this.dragSelectEnd || this.dragSelectStart || [...this.pinnedDays].at(-1);
      if (ref) {
        this.getDateRange(ref, iso).forEach(d => this.pinnedDays.add(d));
        this.pinnedDays = new Set(this.pinnedDays);
        if (this.pinnedDays.size > 1) this.openQuickCreateForPinned();
      }
      event.preventDefault();
      return;
    }
    this.pinnedDays = new Set();
    this.dragSelectStart = iso;
    this.dragSelectEnd = iso;
    this.dragSelectActive = true;
  }

  onMonthCellMouseenter(iso: string): void {
    if (this.dragSelectActive) this.dragSelectEnd = iso;
  }

  endDragSelect(iso?: string): void {
    if (!this.dragSelectActive) return;
    this.dragSelectActive = false;
    if (iso) this.dragSelectEnd = iso;
    const start = this.dragSelectStart;
    const end = this.dragSelectEnd;
    if (!start) return;
    if (start === end || !end) {
      this.dragSelectStart = null;
      this.dragSelectEnd = null;
      this.slotClick(start, 9);
    } else {
      const sorted = this.getDateRange(start, end).sort();
      this.quickCreate = { ...this.quickCreate, visible: true, startDate: sorted[0], endDate: sorted[sorted.length - 1], title: '', kind: 'Meeting', startTime: '09:00', endTime: '10:00', description: '' };
    }
  }

  onWeekHeaderClick(iso: string, event: MouseEvent): void {
    if (event.ctrlKey || event.metaKey) {
      if (this.pinnedDays.has(iso)) { this.pinnedDays.delete(iso); } else { this.pinnedDays.add(iso); }
      this.pinnedDays = new Set(this.pinnedDays);
      if (this.pinnedDays.size > 1) this.openQuickCreateForPinned();
      event.preventDefault();
      return;
    }
    this.selectDay(iso);
  }

  isDayInSelection(iso: string): boolean {
    if (this.pinnedDays.has(iso)) return true;
    if (!this.dragSelectStart || !this.dragSelectEnd) return false;
    const [a, b] = [this.dragSelectStart, this.dragSelectEnd].sort();
    return iso >= a && iso <= b;
  }

  getDateRange(start: string, end: string): string[] {
    const [a, b] = [start, end].sort();
    const dates: string[] = [];
    const cur = new Date(a + 'T12:00:00');
    const endD = new Date(b + 'T12:00:00');
    while (cur <= endD) { dates.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); }
    return dates;
  }

  private openQuickCreateForPinned(): void {
    const sorted = [...this.pinnedDays].sort();
    this.quickCreate = { ...this.quickCreate, visible: true, startDate: sorted[0], endDate: sorted[sorted.length - 1], title: '', kind: 'Meeting', startTime: '09:00', endTime: '10:00', description: '' };
  }

  confirmQuickCreate(): void {
    const t = this.quickCreate.title.trim();
    if (!t) { this.addToast('Please enter an event title', 'warn'); return; }
    const sMin = this.timeToMin(this.quickCreate.startTime);
    const eMin = this.timeToMin(this.quickCreate.endTime);
    const duration = this.quickCreate.startDate === this.quickCreate.endDate
      ? Math.max(30, eMin - sMin)
      : 60;
    const ev: MeetingEvent = {
      id: this.makeId('event'), kind: this.quickCreate.kind, title: t,
      description: this.quickCreate.description, date: this.quickCreate.startDate,
      time: this.quickCreate.startTime, duration,
      location: '', onlineLink: '',
      priority: this.quickCreate.priority,
      status: this.quickCreate.kind === 'Meeting' ? 'Draft' : 'Scheduled',
      category: this.quickCreate.kind === 'Meeting' ? 'Internal' : 'Personal',
      color: this.quickCreate.kind === 'Meeting' ? '#2E6276' : '#2EB270',
      confidential: false, recurring: 'None', meetingMode: 'Hybrid',
      organizer: sessionStorage.getItem('fullname') || 'Current user',
      attendees: [], attendeeResponses: {}, attendance: {},
      resources: [], agenda: [], minutes: this.emptyMinutes(), actions: [],
      reminders: ['15 minutes before'], attachments: [],
    };
    this.events = [ev, ...this.events];
    this.selectedEventId = ev.id;
    this.activeDetailTab = 'overview';
    this.saveToLocalStorage();
    this.syncEvent(ev, false);
    this.addToast(`${ev.kind} "${ev.title}" created`, 'ok');
    this.closeQuickCreate();
  }

  closeQuickCreate(): void {
    this.quickCreate = { ...this.quickCreate, visible: false };
    this.dragSelectStart = null;
    this.dragSelectEnd = null;
    this.pinnedDays = new Set();
  }

  private timeToMin(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  // ── Resources ────────────────────────────────────────────

  bookResource(resource: ResourceBooking): void {
    const event = this.selectedEvent;
    if (!event) return;
    if (resource.status === 'Booked' && resource.bookedFor !== event.id) {
      resource.status = 'Conflict detected';
      this.addToast(`${resource.name} has a booking conflict — request escalated`, 'err');
      return;
    }
    const prevStatus = resource.status;
    resource.status = resource.status === 'Approval required' ? 'Approval required' : 'Booked';
    resource.bookedFor = event.id;
    event.resources = Array.from(new Set([...event.resources, resource.name]));
    const msg = prevStatus === 'Approval required'
      ? `${resource.name} approval request submitted`
      : `${resource.name} booked for "${event.title}"`;
    this.addToast(msg, 'ok');
    this.persistAndSync(event);
  }

  // ── Agenda ───────────────────────────────────────────────

  addAgendaItem(): void {
    const event = this.selectedEvent;
    if (!event || !this.agendaForm.topic.trim()) return;
    const topic = this.agendaForm.topic.trim();
    event.agenda = [...event.agenda, { id: this.makeId('agenda'), topic, presenter: this.agendaForm.presenter.trim() || event.organizer, duration: Number(this.agendaForm.duration) || 15, notes: this.agendaForm.notes.trim(), state: 'Draft' }];
    this.agendaForm = { topic: '', presenter: '', duration: 15, notes: '' };
    this.addToast(`Agenda item "${topic}" added`, 'ok');
    this.persistAndSync(event);
  }

  updateAgendaState(item: AgendaItem, state: AgendaItem['state']): void {
    item.state = state; const event = this.selectedEvent; if (event) this.persistAndSync(event);
  }

  removeAgendaItem(event: MeetingEvent, item: AgendaItem): void {
    event.agenda = event.agenda.filter(a => a.id !== item.id); this.persistAndSync(event);
  }

  // ── Actions ───────────────────────────────────────────────

  addActionItem(): void {
    const event = this.selectedEvent;
    if (!event || !this.actionForm.item.trim()) return;
    const item = this.actionForm.item.trim();
    const owner = this.actionForm.owner.trim() || 'Unassigned';
    event.actions = [...event.actions, { id: this.makeId('action'), owner, item, due: this.actionForm.due || this.todayStr(), priority: this.actionForm.priority, status: 'Open' }];
    this.actionForm = { owner: '', item: '', due: '', priority: 'Medium' };
    this.addToast(`Action item assigned to ${owner}`, 'ok');
    this.persistAndSync(event);
  }

  updateAction(action: MeetingAction, status: MeetingAction['status']): void {
    action.status = status; const event = this.selectedEvent; if (event) this.persistAndSync(event);
  }

  removeAction(event: MeetingEvent, action: MeetingAction): void {
    event.actions = event.actions.filter(a => a.id !== action.id); this.persistAndSync(event);
  }

  // ── Attachments ───────────────────────────────────────────

  addAttachment(): void {
    const event = this.selectedEvent;
    const a = this.attachmentInput.trim();
    if (!event || !a) return;
    event.attachments = [...event.attachments, a];
    this.attachmentInput = '';
    this.addToast('Attachment linked to event', 'ok');
    this.persistAndSync(event);
  }

  onAttachFileSelected(fileEvent: Event): void {
    const input = fileEvent.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.selectedEvent) return;
    this.addToast(`Uploading ${file.name}…`, 'ok');
    this.collaborationService.uploadMeetingAttachment(file, this.selectedEvent.id).subscribe({
      next: (res: any) => {
        if (this.selectedEvent) {
          this.selectedEvent.attachments = [...this.selectedEvent.attachments, res?.url || file.name];
          this.persistAndSync(this.selectedEvent);
          this.addToast(`${file.name} uploaded successfully`, 'ok');
        }
      },
      error: () => {
        if (this.selectedEvent) {
          this.selectedEvent.attachments = [...this.selectedEvent.attachments, file.name];
          this.persistAndSync(this.selectedEvent);
          this.addToast(`${file.name} saved locally — backend sync pending`, 'warn');
        }
      },
    });
    input.value = '';
  }

  // ── Virtual meeting ───────────────────────────────────────

  generateVirtualRoom(platform: string): void {
    const event = this.selectedEvent; if (!event) return;
    event.onlineLink = `https://test-meet.optimaxsuites.com/${platform.toLowerCase().replace(/\s+/g, '-')}/${event.id}`;
    this.addToast(`${platform} room generated — link ready to share`, 'ok');
    this.persistAndSync(event);
  }

  startCall():  void { this.openMeetingRoom('CALL'); }
  startVideo(): void { this.openMeetingRoom('VIDEO'); }

  openMeetingRoom(mode: 'CALL' | 'VIDEO'): void {
    const event = this.selectedEvent; if (!event) return;
    this.activeMeetingMode = mode;
    this.meetingRoomName = this.buildMeetingRoomName(event);
    const base = this.normalizeMeetingBaseUrl(this.jitsiBaseUrl);
    this.jitsiBaseUrl = base;
    const guestUrl  = `${base}/${this.meetingRoomName}`;
    const fragment  = `#config.prejoinPageEnabled=false&config.startWithVideoMuted=${mode === 'CALL'}`;
    this.jitsiJoining = true;

    this.collaborationService.getJitsiToken(this.meetingRoomName).subscribe({
      next: ({ token }) => {
        this.jitsiJoining = false;
        this.applyMeetingRoom(event, `${guestUrl}?jwt=${token}${fragment}`, guestUrl);
      },
      error: () => {
        // JWT endpoint not yet wired on backend — join without moderator token
        this.jitsiJoining = false;
        this.applyMeetingRoom(event, `${guestUrl}${fragment}`, guestUrl);
      },
    });
  }

  private applyMeetingRoom(event: MeetingEvent, authedUrl: string, guestUrl: string): void {
    this.meetingRoomUrl   = authedUrl;
    this.meetingGuestUrl  = guestUrl;
    this.trustedMeetingRoomUrl = this.sanitizer.bypassSecurityTrustResourceUrl(authedUrl);
    this.meetingRoomOpen  = true;
    this.activeDetailTab  = 'virtual';
    event.meetingMode = this.activeMeetingMode === 'CALL' ? 'Virtual' : event.meetingMode === 'Physical' ? 'Hybrid' : event.meetingMode;
    event.onlineLink  = guestUrl;
    this.transcriptionTitle = this.transcriptionTitle || `${event.title} recording`;
    this.persistAndSync(event);
  }

  closeMeetingRoom(): void { this.meetingRoomOpen = false; this.trustedMeetingRoomUrl = null; }

  openMeetingInTab(): void {
    if (!this.meetingGuestUrl && !this.meetingRoomUrl) this.openMeetingRoom('VIDEO');
    window.open(this.meetingRoomUrl || this.meetingGuestUrl, '_blank', 'noopener');
  }

  copyGuestLink(): void {
    const url = this.meetingGuestUrl;
    if (!url) { this.addToast('Start a meeting first to get a shareable link', 'warn'); return; }
    navigator.clipboard.writeText(url).then(
      () => this.addToast('Guest link copied — share with external attendees', 'ok'),
      () => this.addToast('Copy failed — select and copy the link manually', 'warn'),
    );
  }

  // ── Transcription ─────────────────────────────────────────

  onTranscriptionFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) { this.uploadTranscription(file); input.value = ''; }
  }

  uploadTranscription(file: File): void {
    const meeting = this.selectedEvent;
    this.transcriptionStatus = 'Uploading recording for transcription…';
    this.addToast(`Uploading "${file.name}" to AI transcription service…`, 'ok');
    this.collaborationService.uploadMeetingTranscription({ title: this.transcriptionTitle || `${meeting?.title || 'Meeting'} recording`, meetingType: this.transcriptionMeetingType || meeting?.kind || 'Collaboration Meeting', language: this.transcriptionLanguage || 'en', speakerHints: this.transcriptionSpeakerHints, formatAsMinutes: this.transcriptionFormatAsMinutes, file }).subscribe({
      next: job => {
        this.renderTranscriptionJob(job);
        if (job.id) this.startTranscriptionPolling(job.id);
        this.addToast('Transcription job started — results will appear below when ready', 'ok');
      },
      error: () => {
        this.transcriptionStatus = 'Transcription upload failed. Check AI audio transcription service.';
        this.addToast('Transcription upload failed — AI audio service may be offline', 'err');
      },
    });
  }

  loadTranscriptionJobs(): void {
    this.transcriptionStatus = 'Loading transcription jobs…';
    this.collaborationService.getMyMeetingTranscriptionJobs().subscribe({
      next: jobs => {
        const first = jobs?.items?.[0] || jobs?.results?.[0] || jobs?.content?.[0] || jobs?.[0] || null;
        this.renderTranscriptionJob(first, jobs);
        if (first?.id && !['COMPLETED','FAILED'].includes(String(first.status || '').toUpperCase())) this.startTranscriptionPolling(first.id);
      },
      error: () => { this.transcriptionStatus = 'Could not load transcription jobs.'; },
    });
  }

  // ── AI assistant ──────────────────────────────────────────

  runAi(operation: 'AGENDA' | 'MINUTES' | 'ACTIONS' | 'FOLLOW_UP' | 'SENTIMENT'): void {
    const event = this.selectedEvent; if (!event) return;
    this.aiLoading = true; this.aiOutput = null;
    this.collaborationService.runMeetingsAssistant({ operation, title: event.title, description: event.description, agendaItems: event.agenda.map(a => a.topic), attendees: event.attendees, notes: this.notesInput, context: JSON.stringify(event) }).subscribe({
      next: res => {
        this.aiLoading = false;
        this.applyAiOutput(operation, res);
        this.addToast(`AI ${operation.replace('_', ' ').toLowerCase()} analysis applied`, 'ok');
      },
      error: () => {
        this.aiLoading = false;
        this.applyAiOutput(operation, this.localAiFallback(operation, event));
        this.addToast('AI service offline — local draft applied', 'warn');
      },
    });
  }

  // ── Calendar sync / export ────────────────────────────────

  syncCalendar(integration: string): void {
    this.syncMessage = `${integration} sync queued. Two-way update and conflict checks are enabled for this workspace.`;
  }

  exportIcal(): void {
    const event = this.selectedEvent; if (!event) return;
    const safeTitle = event.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const startsAt  = `${event.date.replace(/-/g,'')}T${event.time.replace(':','')}00`;
    const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//OptimaXSuites//EN','BEGIN:VEVENT',`UID:${event.id}@optimaxsuites`,`DTSTART:${startsAt}`,`SUMMARY:${event.title}`,`DESCRIPTION:${event.description}`,`LOCATION:${event.location || event.onlineLink}`,'END:VEVENT','END:VCALENDAR'].join('\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = `${safeTitle || 'event'}.ics`; link.click(); URL.revokeObjectURL(link.href);
  }

  publishMinutes(): void {
    const event = this.selectedEvent; if (!event) return;
    event.minutes.approvalState = 'Published';
    this.addToast(`Minutes published — distribution sent to ${event.attendees.length} attendee${event.attendees.length !== 1 ? 's' : ''}`, 'ok');
    this.persistAndSync(event);
    this.collaborationService.sendMeetingInvites(event.id, event.attendees).subscribe({ error: () => undefined });
  }

  // ── Analytics ─────────────────────────────────────────────

  get analyticsData() {
    const todayIso  = this.todayStr();
    const monthStr  = new Date().toISOString().slice(0, 7);
    const monthEvs  = this.events.filter(e => e.date.startsWith(monthStr));
    const allActions = this.events.flatMap(e => e.actions);
    const completed  = allActions.filter(a => a.status === 'Completed');
    const overdue    = allActions.filter(a => a.status === 'Overdue' || (a.status !== 'Completed' && a.due < todayIso));
    const allAtt     = this.events.flatMap(e => Object.values(e.attendance || {}));
    const present    = allAtt.filter(v => v === 'Present').length;

    const byCategory: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byStatus:   Record<string, number> = {};
    const pCount:     Record<string, number> = {};
    this.events.forEach(e => {
      byCategory[e.category || 'Other'] = (byCategory[e.category || 'Other'] || 0) + 1;
      byPriority[e.priority]            = (byPriority[e.priority] || 0) + 1;
      byStatus[e.status]                = (byStatus[e.status] || 0) + 1;
      e.attendees.forEach(a => { pCount[a] = (pCount[a] || 0) + 1; });
    });
    const maxCat = Math.max(1, ...Object.values(byCategory));
    const maxPri = Math.max(1, ...Object.values(byPriority));

    const weekAhead = new Date(); weekAhead.setDate(weekAhead.getDate() + 7);
    const waIso = weekAhead.toISOString().slice(0, 10);

    return {
      monthMeetings:     monthEvs.filter(e => e.kind === 'Meeting').length,
      monthAppointments: monthEvs.filter(e => e.kind === 'Appointment').length,
      totalHours:        Math.round(this.events.reduce((s, e) => s + (e.duration || 0), 0) / 60 * 10) / 10,
      attendanceRate:    allAtt.length ? Math.round(present / allAtt.length * 100) : 0,
      completionRate:    allActions.length ? Math.round(completed.length / allActions.length * 100) : 0,
      totalActions:      allActions.length,
      completedActions:  completed.length,
      overdueActions:    overdue.length,
      byCategory:        Object.entries(byCategory).sort(([,a],[,b]) => b-a).map(([k,v]) => ({ label: k, value: v, pct: Math.round(v/maxCat*100) })),
      byPriority:        Object.entries(byPriority).sort(([,a],[,b]) => b-a).map(([k,v]) => ({ label: k, value: v, pct: Math.round(v/maxPri*100) })),
      byStatus:          Object.entries(byStatus).sort(([,a],[,b]) => b-a),
      topParticipants:   Object.entries(pCount).sort(([,a],[,b]) => b-a).slice(0,6).map(([name,count]) => ({ name, count, pct: Math.round(count/Math.max(1,this.events.length)*100) })),
      upcoming:          this.events.filter(e => e.date >= todayIso && e.date <= waIso && e.status !== 'Cancelled').sort((a,b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0,6),
      overdueActionList: this.events.flatMap(e => e.actions.filter(a => a.status === 'Overdue' || (a.status !== 'Completed' && a.due < todayIso)).map(a => ({ ...a, eventTitle: e.title }))).slice(0, 6),
    };
  }

  // ── Helpers ───────────────────────────────────────────────

  priorityClass(p: string): string {
    return ({ Low: 'p-low', Medium: 'p-medium', High: 'p-high', Executive: 'p-exec' } as any)[p] || '';
  }

  statusClass(s: string): string {
    return ({
      'Draft': 's-draft', 'Scheduled': 's-scheduled', 'Confirmed': 's-confirmed',
      'In Progress': 's-inprogress', 'Completed': 's-completed', 'Cancelled': 's-cancelled',
      'Rescheduled': 's-rescheduled', 'No-show': 's-noshow', 'Archived': 's-archived',
    } as any)[s] || '';
  }

  rsvpClass(r: string): string {
    return ({ Accepted: 'rsvp-yes', Declined: 'rsvp-no', Tentative: 'rsvp-maybe', Reschedule: 'rsvp-reschedule' } as any)[r] || '';
  }

  attendanceClass(a: string): string {
    return ({ Present: 'att-present', Absent: 'att-absent', Excused: 'att-excused', Late: 'att-late' } as any)[a] || '';
  }

  actionStatusClass(s: string): string {
    return ({ Open: 'as-open', 'In progress': 'as-inprogress', Completed: 'as-done', Overdue: 'as-overdue', Escalated: 'as-escalated' } as any)[s] || '';
  }

  initials(name: string): string {
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  resourceStatusClass(s: string): string {
    return ({ Available: 'res-ok', Booked: 'res-booked', 'Approval required': 'res-pending', 'Conflict detected': 'res-conflict' } as any)[s] || '';
  }

  // ── Private ───────────────────────────────────────────────

  private checkConflict(ev: MeetingEvent): string {
    const startA = this.toEpochMin(ev.date, ev.time);
    const endA   = startA + ev.duration;
    for (const e of this.events) {
      if (e.id === ev.id) continue;
      const startB = this.toEpochMin(e.date, e.time);
      const endB   = startB + e.duration;
      if (startA < endB && endA > startB) {
        const shared = ev.attendees.filter(a => e.attendees.includes(a));
        if (shared.length)
          return `⚠ Time conflict with "${e.title}" at ${e.time} — ${shared.join(', ')} ${shared.length === 1 ? 'is' : 'are'} already invited.`;
        if (!ev.attendees.length)
          return `⚠ Time slot overlaps with "${e.title}" at ${e.time}.`;
      }
    }
    return '';
  }

  private toEpochMin(date: string, time: string): number {
    return new Date(`${date}T${time}:00`).getTime() / 60000;
  }

  private saveToLocalStorage(): void {
    try { localStorage.setItem(this.LS_EVENTS_KEY, JSON.stringify(this.events)); } catch { /* quota exceeded */ }
  }

  private loadWorkspace(): void {
    const stored = localStorage.getItem(this.LS_EVENTS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length) {
          this.events = parsed;
          this.selectedEventId = this.events[0]?.id || '';
          console.log('[M&A] events restored from localStorage:', this.events.length);
        }
      } catch { /* corrupt — fall through to seeds */ }
    }
    if (!this.events.length) {
      this.events = this.seedEvents();
      this.selectedEventId = this.events[0]?.id || '';
      console.log('[M&A] seed events loaded:', this.events.length);
    }

    this.collaborationService.getMeetingsAppointmentsWorkspace().subscribe({
      next: ws => {
        if (ws?.events?.length) {
          this.events = ws.events;
          this.resources = ws.resources || this.resources;
          this.selectedEventId = this.events[0]?.id || '';
          this.navigateToNearestEvent();
          this.saveToLocalStorage();
          console.log('[M&A] workspace loaded from backend:', this.events.length, 'events');
        } else {
          console.log('[M&A] backend workspace empty — using localStorage/seed events');
        }
        this.backendStatus = 'Synced ✓';
        this.backendOnline = true;
      },
      error: (err) => {
        console.warn('[M&A] workspace load error:', err?.status, err?.message);
        this.backendStatus = 'Working offline';
        this.backendOnline = false;
      },
    });
  }

  private navigateToNearestEvent(): void {
    if (!this.events.length) return;
    const todayIso = this.todayStr();
    const weekStart = this.weekDays[0]?.iso || todayIso;
    const weekEnd   = this.weekDays[6]?.iso || todayIso;
    if (this.events.some(e => e.date >= weekStart && e.date <= weekEnd)) return;
    const upcoming = [...this.events].filter(e => e.date >= todayIso).sort((a, b) => a.date.localeCompare(b.date));
    if (upcoming.length) { this.calendarDate = new Date(upcoming[0].date + 'T12:00:00'); return; }
    const past = [...this.events].sort((a, b) => b.date.localeCompare(a.date));
    if (past.length) this.calendarDate = new Date(past[0].date + 'T12:00:00');
  }

  private persistAndSync(event: MeetingEvent): void {
    this.syncEvent(event, true);
  }

  private syncEvent(event: MeetingEvent, update: boolean): void {
    const req = update
      ? this.collaborationService.updateMeetingsAppointmentRecord(event.id, event)
      : this.collaborationService.createMeetingsAppointmentRecord(event);
    req.subscribe({
      next: () => { this.backendStatus = 'Synced ✓'; this.backendOnline = true; },
      error: (err: any) => {
        // PUT returned 404 → record doesn't exist yet; create it instead
        if (update && err?.status === 404) {
          this.collaborationService.createMeetingsAppointmentRecord(event).subscribe({
            next: () => { this.backendStatus = 'Synced ✓'; this.backendOnline = true; },
            error: () => { this.backendStatus = 'Working offline'; this.backendOnline = false; },
          });
        } else {
          this.backendStatus = 'Working offline';
          this.backendOnline = false;
        }
      },
    });
    this.collaborationService.saveMeetingsAppointmentsWorkspace({ events: this.events, resources: this.resources }).subscribe({ error: () => undefined });
  }

  private applyAiOutput(op: string, res: MeetingsAssistantResponse): void {
    const event = this.selectedEvent; if (!event) return;
    this.aiOutput = res;
    if (op === 'AGENDA' && res.agenda?.length) {
      event.agenda = res.agenda.map((topic, i) => ({ id: this.makeId('agenda'), topic, presenter: event.attendees[i % Math.max(1, event.attendees.length)] || event.organizer, duration: 15, state: 'Draft' as const, notes: '' }));
    }
    if (op === 'MINUTES') {
      event.minutes.summary = res.summary || event.minutes.summary;
      event.minutes.keyDiscussions = res.summary ? [res.summary] : event.minutes.keyDiscussions;
      event.minutes.decisions = res.decisions || event.minutes.decisions;
      event.minutes.risks = res.risks || event.minutes.risks;
      event.minutes.approvalState = 'Review';
    }
    if (op === 'ACTIONS' && res.actionItems?.length) {
      event.actions = [...event.actions, ...res.actionItems.map(item => ({ id: this.makeId('action'), owner: event.attendees[0] || event.organizer, item, due: this.todayStr(), priority: 'Medium' as const, status: 'Open' as const }))];
    }
    this.persistAndSync(event);
  }

  private renderTranscriptionJob(job: AudioTranscriptionJob | null, raw: any = job): void {
    if (!job) { this.transcriptionStatus = 'No transcription job found.'; this.transcriptionOutput = 'Formatted minutes or transcript will appear here.'; return; }
    this.transcriptionStatus = `Job #${job.id || 'n/a'} · Status: ${job.status || 'UNKNOWN'} · Language: ${job.language || this.transcriptionLanguage}`;
    this.transcriptionOutput = job.formattedMinutes || job.rawTranscript || job.errorMessage || 'Waiting for processing output…';
    if (job.formattedMinutes || job.rawTranscript) this.notesInput = job.formattedMinutes || job.rawTranscript || this.notesInput;
  }

  private startTranscriptionPolling(jobId: number): void {
    this.stopTranscriptionPolling();
    this.transcriptionPollTimer = setInterval(() => {
      this.collaborationService.getMeetingTranscriptionJob(jobId).subscribe({
        next: job => { this.renderTranscriptionJob(job); if (['COMPLETED','FAILED'].includes(String(job.status || '').toUpperCase())) this.stopTranscriptionPolling(); },
        error: () => this.stopTranscriptionPolling(),
      });
    }, 4000);
  }

  private stopTranscriptionPolling(): void {
    if (this.transcriptionPollTimer) { clearInterval(this.transcriptionPollTimer); this.transcriptionPollTimer = null; }
  }

  private buildMeetingRoomName(ev: MeetingEvent): string {
    const tenant = sessionStorage.getItem('tenantId') || 'optimax';
    return `${tenant}-${ev.id}-${ev.title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
  }

  private normalizeMeetingBaseUrl(input: string): string {
    let v = String(input || '').trim() || 'https://meet.jit.si';
    if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
    return v.replace(/\/+$/, '');
  }

  private localAiFallback(op: string, ev: MeetingEvent): MeetingsAssistantResponse {
    if (op === 'AGENDA')  return { agenda: [`Confirm objective for ${ev.title}`, 'Review attendee availability', 'Discuss decisions and resource constraints', 'Assign owners and due dates'] };
    if (op === 'ACTIONS') return { actionItems: [`Publish meeting notes for ${ev.title}`, 'Confirm resource booking', 'Send follow-up reminders'] };
    if (op === 'FOLLOW_UP') return { followUpRecommendations: ['Send action summary to all attendees', 'Escalate overdue owners after 24 hours', 'Schedule 15-minute review for blocked actions'] };
    if (op === 'SENTIMENT') return { sentiment: 'Neutral to positive. Main risk is follow-up closure speed.' };
    return { summary: `${ev.title} covered agenda progress, attendance, resource status, decisions, and follow-up ownership.`, decisions: ['Proceed with agreed next steps', 'Track actions on the executive dashboard'], risks: ['Resource conflict', 'Delayed action item closure'] };
  }

  private normalizeForm(): MeetingEvent {
    const raw: any = this.form;
    const attendees = String(raw.attendeesText || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    const reminders = String(raw.remindersText || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    const id = raw.id || this.makeId('event');
    const attendeeResponses: Record<string, any> = {};
    const attendance: Record<string, any> = {};
    attendees.forEach((a: string) => { attendeeResponses[a] = raw.attendeeResponses?.[a] || 'Tentative'; attendance[a] = raw.attendance?.[a] || 'Absent'; });
    return { ...raw, id, attendees, attendeeResponses, attendance, reminders, duration: Number(raw.duration) || 30, resources: raw.resources || [], agenda: raw.agenda || [], actions: raw.actions || [], attachments: raw.attachments || [], minutes: raw.minutes || this.emptyMinutes() };
  }

  private emptyEventForm(kind: EventKind): MeetingEvent & { attendeesText?: string; remindersText?: string } {
    return { id: '', kind, title: '', description: '', date: this.todayStr(), time: '09:00', duration: 30, location: '', onlineLink: '', priority: 'Medium', status: kind === 'Meeting' ? 'Draft' : 'Scheduled', category: kind === 'Meeting' ? 'Internal' : 'Personal', color: kind === 'Meeting' ? '#2E6276' : '#2EB270', confidential: false, recurring: 'None', meetingMode: 'Hybrid', organizer: sessionStorage.getItem('fullname') || 'Current user', attendees: [], attendeesText: '', attendeeResponses: {}, attendance: {}, resources: [], agenda: [], minutes: this.emptyMinutes(), actions: [], reminders: ['15 minutes before'], remindersText: '15 minutes before', attachments: [] };
  }

  private emptyMinutes(): MeetingMinutes {
    return { summary: '', keyDiscussions: [], decisions: [], risks: [], approvalState: 'Draft' };
  }

  private seedEvents(): MeetingEvent[] {
    const today = this.todayStr();
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 5);
    const nextWeekStr = nextWeek.toISOString().slice(0, 10);
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    // 1 — Executive revenue review
    const rev = this.emptyEventForm('Meeting');
    rev.id = this.makeId('event'); rev.title = 'Executive Revenue Review'; rev.date = today; rev.time = '09:00'; rev.duration = 60;
    rev.description = 'Weekly hybrid session for leadership revenue, blockers, and decisions.';
    rev.location = 'Board Room A'; rev.priority = 'Executive'; rev.status = 'Confirmed'; rev.category = 'Executive';
    rev.color = '#6d28d9'; rev.meetingMode = 'Hybrid';
    rev.attendees = ['Finance Lead', 'COO Office', 'Sales Director', 'CEO'];
    rev.attendeesText = rev.attendees.join(', ');
    rev.attendeeResponses = { 'Finance Lead': 'Accepted', 'COO Office': 'Tentative', 'Sales Director': 'Accepted', 'CEO': 'Accepted' };
    rev.attendance = { 'Finance Lead': 'Present', 'COO Office': 'Absent', 'Sales Director': 'Late', 'CEO': 'Present' };
    rev.resources = ['Board Room A', 'Cisco Room Kit'];
    rev.agenda = [
      { id: this.makeId('agenda'), topic: 'Q3 revenue variance analysis', presenter: 'Finance Lead', duration: 20, state: 'Shared', notes: 'Compare actuals vs forecast by region.' },
      { id: this.makeId('agenda'), topic: 'Sales pipeline blockers', presenter: 'Sales Director', duration: 15, state: 'Ready', notes: '' },
      { id: this.makeId('agenda'), topic: 'Operational escalations', presenter: 'COO Office', duration: 15, state: 'Draft', notes: '' },
      { id: this.makeId('agenda'), topic: 'Decision round & approvals', presenter: 'CEO', duration: 10, state: 'Draft', notes: '' },
    ];
    rev.actions = [
      { id: this.makeId('action'), owner: 'Finance Lead', item: 'Publish approved revenue minutes by EOD', due: today, priority: 'High', status: 'Open' },
      { id: this.makeId('action'), owner: 'COO Office', item: 'Resolve board room conflict escalation', due: today, priority: 'Medium', status: 'Escalated' },
      { id: this.makeId('action'), owner: 'Sales Director', item: 'Submit updated pipeline report', due: tomorrowStr, priority: 'High', status: 'Open' },
    ];
    rev.minutes = { summary: 'Revenue on track to 94% of target. Three operational blockers identified. CEO approved budget reallocation.', keyDiscussions: ['Revenue variance of 6%', 'Procurement bottleneck on IT hardware'], decisions: ['Reallocate $120K from contingency to sales ops', 'Accelerate onboarding for 2 new enterprise accounts'], risks: ['FX headwinds on international accounts', 'Key hire vacancy in finance team'], approvalState: 'Review' };

    // 2 — Weekly team standup
    const standup = this.emptyEventForm('Meeting');
    standup.id = this.makeId('event'); standup.title = 'Weekly Engineering Standup'; standup.date = today; standup.time = '08:30'; standup.duration = 30;
    standup.description = 'Cross-functional sync on sprint progress, blockers, and deployments.';
    standup.location = 'Training Hall'; standup.priority = 'Medium'; standup.status = 'Scheduled'; standup.category = 'Internal';
    standup.color = '#0369a1'; standup.recurring = 'Weekly'; standup.meetingMode = 'Virtual';
    standup.attendees = ['Tech Lead', 'Product Manager', 'QA Lead', 'DevOps'];
    standup.attendeesText = standup.attendees.join(', ');
    standup.attendeeResponses = { 'Tech Lead': 'Accepted', 'Product Manager': 'Accepted', 'QA Lead': 'Accepted', 'DevOps': 'Accepted' };
    standup.attendance = { 'Tech Lead': 'Absent', 'Product Manager': 'Absent', 'QA Lead': 'Absent', 'DevOps': 'Absent' };
    standup.agenda = [
      { id: this.makeId('agenda'), topic: 'Sprint velocity & blockers', presenter: 'Tech Lead', duration: 10, state: 'Ready', notes: '' },
      { id: this.makeId('agenda'), topic: 'Deployment pipeline status', presenter: 'DevOps', duration: 10, state: 'Draft', notes: '' },
      { id: this.makeId('agenda'), topic: 'Release readiness for v2.4', presenter: 'QA Lead', duration: 10, state: 'Draft', notes: '' },
    ];
    standup.actions = [
      { id: this.makeId('action'), owner: 'DevOps', item: 'Fix CI pipeline flaky test on auth module', due: today, priority: 'High', status: 'In progress' },
      { id: this.makeId('action'), owner: 'QA Lead', item: 'Complete regression for checkout flow', due: tomorrowStr, priority: 'High', status: 'Open' },
    ];

    // 3 — Investor briefing (Executive)
    const investor = this.emptyEventForm('Meeting');
    investor.id = this.makeId('event'); investor.title = 'Series B Investor Briefing'; investor.date = tomorrowStr; investor.time = '14:00'; investor.duration = 90;
    investor.description = 'Quarterly progress presentation to Series B investors covering KPIs, runway, and 12-month roadmap.';
    investor.location = 'Executive Suite, Floor 9'; investor.priority = 'Executive'; investor.status = 'Confirmed'; investor.category = 'Executive';
    investor.color = '#b45309'; investor.meetingMode = 'Hybrid'; investor.confidential = true;
    investor.attendees = ['CEO', 'CFO', 'Lead Investor', 'VC Partner'];
    investor.attendeesText = investor.attendees.join(', ');
    investor.attendeeResponses = { 'CEO': 'Accepted', 'CFO': 'Accepted', 'Lead Investor': 'Accepted', 'VC Partner': 'Tentative' };
    investor.attendance = { 'CEO': 'Absent', 'CFO': 'Absent', 'Lead Investor': 'Absent', 'VC Partner': 'Absent' };
    investor.resources = ['Cisco Room Kit'];
    investor.agenda = [
      { id: this.makeId('agenda'), topic: 'Business performance highlights', presenter: 'CEO', duration: 20, state: 'Shared', notes: '' },
      { id: this.makeId('agenda'), topic: 'Financial health & burn rate', presenter: 'CFO', duration: 25, state: 'Ready', notes: '' },
      { id: this.makeId('agenda'), topic: 'Product roadmap — next 12 months', presenter: 'CEO', duration: 20, state: 'Draft', notes: '' },
      { id: this.makeId('agenda'), topic: 'Q&A and next round discussion', presenter: 'Lead Investor', duration: 25, state: 'Draft', notes: '' },
    ];
    investor.actions = [
      { id: this.makeId('action'), owner: 'CFO', item: 'Finalise financial deck and send to investor relations', due: today, priority: 'High', status: 'Open' },
      { id: this.makeId('action'), owner: 'CEO', item: 'Confirm room AV setup 30 minutes before start', due: tomorrowStr, priority: 'Medium', status: 'Open' },
    ];

    // 4 — HR performance appraisal appointment
    const appraisal = this.emptyEventForm('Appointment');
    appraisal.id = this.makeId('event'); appraisal.title = 'Q3 Performance Appraisal — Engineering'; appraisal.date = tomorrowStr; appraisal.time = '11:00'; appraisal.duration = 45;
    appraisal.description = 'Quarterly 1-on-1 performance review and goal-setting for engineering team leads.';
    appraisal.location = 'HR Suite 2'; appraisal.priority = 'High'; appraisal.status = 'Scheduled'; appraisal.category = 'HR';
    appraisal.color = '#0f766e'; appraisal.meetingMode = 'Physical';
    appraisal.attendees = ['HR Manager', 'Engineering Lead'];
    appraisal.attendeesText = appraisal.attendees.join(', ');
    appraisal.attendeeResponses = { 'HR Manager': 'Accepted', 'Engineering Lead': 'Accepted' };
    appraisal.attendance = { 'HR Manager': 'Absent', 'Engineering Lead': 'Absent' };
    appraisal.actions = [
      { id: this.makeId('action'), owner: 'Engineering Lead', item: 'Submit self-appraisal form before meeting', due: today, priority: 'High', status: 'Overdue' },
      { id: this.makeId('action'), owner: 'HR Manager', item: 'Prepare competency ratings sheet', due: today, priority: 'Medium', status: 'In progress' },
    ];

    // 5 — Client onboarding appointment
    const client = this.emptyEventForm('Appointment');
    client.id = this.makeId('event'); client.title = 'New Client Onboarding — Acme Corp'; client.date = nextWeekStr; client.time = '10:00'; client.duration = 60;
    client.description = 'Structured onboarding walkthrough covering platform setup, roles, integrations, and success KPIs.';
    client.location = 'Virtual / Zoom'; client.priority = 'High'; client.status = 'Confirmed'; client.category = 'External';
    client.color = '#2EB270'; client.meetingMode = 'Virtual';
    client.attendees = ['Account Manager', 'Solutions Engineer', 'Acme IT Lead', 'Acme Project Sponsor'];
    client.attendeesText = client.attendees.join(', ');
    client.attendeeResponses = { 'Account Manager': 'Accepted', 'Solutions Engineer': 'Accepted', 'Acme IT Lead': 'Tentative', 'Acme Project Sponsor': 'Accepted' };
    client.attendance = { 'Account Manager': 'Absent', 'Solutions Engineer': 'Absent', 'Acme IT Lead': 'Absent', 'Acme Project Sponsor': 'Absent' };
    client.agenda = [
      { id: this.makeId('agenda'), topic: 'Platform overview and access provisioning', presenter: 'Solutions Engineer', duration: 20, state: 'Shared', notes: '' },
      { id: this.makeId('agenda'), topic: 'Integration with Acme ERP', presenter: 'Solutions Engineer', duration: 20, state: 'Draft', notes: '' },
      { id: this.makeId('agenda'), topic: 'Success KPIs and go-live checklist', presenter: 'Account Manager', duration: 20, state: 'Draft', notes: '' },
    ];
    client.actions = [
      { id: this.makeId('action'), owner: 'Solutions Engineer', item: 'Send Zoom link and pre-read to Acme', due: yesterdayStr, priority: 'High', status: 'Overdue' },
      { id: this.makeId('action'), owner: 'Account Manager', item: 'Confirm Acme IT Lead attendance', due: today, priority: 'Medium', status: 'Open' },
    ];

    // 6 — Vendor onboarding appointment
    const vendor = this.emptyEventForm('Appointment');
    vendor.id = this.makeId('event'); vendor.title = 'Vendor Onboarding — CloudSoft Ltd'; vendor.date = today; vendor.time = '10:30'; vendor.duration = 45;
    vendor.description = 'Initial vendor screening, credential verification, and contract briefing.';
    vendor.location = 'Reception Suite'; vendor.category = 'External'; vendor.status = 'Scheduled'; vendor.priority = 'Medium';
    vendor.color = '#7c3aed';
    vendor.attendees = ['Procurement Officer', 'Vendor Representative'];
    vendor.attendeesText = vendor.attendees.join(', ');
    vendor.attendeeResponses = { 'Procurement Officer': 'Accepted', 'Vendor Representative': 'Tentative' };
    vendor.attendance = { 'Procurement Officer': 'Absent', 'Vendor Representative': 'Absent' };
    vendor.actions = [
      { id: this.makeId('action'), owner: 'Procurement Officer', item: 'Collect vendor compliance documents', due: today, priority: 'Medium', status: 'Open' },
    ];

    return [rev, standup, investor, appraisal, client, vendor];
  }

  private todayStr(): string { return new Date().toISOString().slice(0, 10); }
  private makeId(prefix: string): string { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
}
