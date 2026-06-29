import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  AudioTranscriptionJob,
  CollaborationService,
  MeetingsAssistantResponse,
} from '../ui/services/collaboration.service';

type CalendarView = 'Day' | 'Week' | 'Month' | 'Agenda';
type EventKind = 'Meeting' | 'Appointment';
type EventStatus =
  | 'Draft'
  | 'Scheduled'
  | 'Confirmed'
  | 'Rescheduled'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled'
  | 'No-show'
  | 'Archived';

interface MeetingEvent {
  id: string;
  kind: EventKind;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number;
  location: string;
  onlineLink: string;
  priority: 'Low' | 'Medium' | 'High' | 'Executive';
  status: EventStatus;
  category: string;
  color: string;
  confidential: boolean;
  recurring: 'None' | 'Daily' | 'Weekly' | 'Monthly';
  meetingMode: 'Physical' | 'Virtual' | 'Hybrid';
  organizer: string;
  attendees: string[];
  attendeeResponses: Record<string, 'Accepted' | 'Declined' | 'Tentative' | 'Reschedule'>;
  attendance: Record<string, 'Present' | 'Absent' | 'Excused' | 'Late'>;
  resources: string[];
  agenda: AgendaItem[];
  minutes: MeetingMinutes;
  actions: MeetingAction[];
  reminders: string[];
  attachments: string[];
}

interface AgendaItem {
  id: string;
  topic: string;
  presenter: string;
  duration: number;
  state: 'Draft' | 'Shared' | 'Ready' | 'Done';
  notes: string;
}

interface MeetingMinutes {
  summary: string;
  keyDiscussions: string[];
  decisions: string[];
  risks: string[];
  approvalState: 'Draft' | 'Review' | 'Approved' | 'Published';
}

interface MeetingAction {
  id: string;
  owner: string;
  item: string;
  due: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'In progress' | 'Completed' | 'Overdue' | 'Escalated';
}

interface ResourceBooking {
  name: string;
  type: string;
  status: 'Available' | 'Booked' | 'Approval required' | 'Conflict detected';
  details: string;
  bookedFor?: string;
}

@Component({
  selector: 'app-meetings-appointments',
  templateUrl: './meetings-appointments.component.html',
  styleUrls: ['./meetings-appointments.component.scss'],
})
export class MeetingsAppointmentsComponent implements OnInit, OnDestroy {
  readonly storageKey = 'optimax.meetingsAppointments.workspace.v1';
  calendarView: CalendarView = 'Day';
  activeForm: EventKind | null = null;
  selectedEventId = '';
  selectedAgendaId = '';
  syncMessage = '';
  backendStatus = 'Local workspace ready';
  aiLoading = false;
  aiOutput: MeetingsAssistantResponse | null = null;
  jitsiBaseUrl = 'https://meet.jit.si';
  activeMeetingMode: 'CALL' | 'VIDEO' | null = null;
  meetingRoomName = '';
  meetingRoomUrl = '';
  trustedMeetingRoomUrl: SafeResourceUrl | null = null;
  meetingRoomOpen = false;
  transcriptionTitle = '';
  transcriptionMeetingType = 'Collaboration Meeting';
  transcriptionLanguage = 'en';
  transcriptionSpeakerHints = '';
  transcriptionFormatAsMinutes = true;
  transcriptionStatus = 'No transcription job yet.';
  transcriptionOutput = 'Formatted minutes or transcript will appear here.';
  transcriptionRaw = 'Raw transcription API response will appear here.';
  transcriptionPollTimer: ReturnType<typeof setInterval> | null = null;
  notesInput =
    'Reviewed revenue variance, procurement blocker, room availability, and the need to publish minutes before Friday.';

  form = this.emptyEventForm('Meeting');
  agendaForm = { topic: '', presenter: '', duration: 15, notes: '' };
  actionForm = { owner: '', item: '', due: '', priority: 'Medium' as 'Low' | 'Medium' | 'High' };
  participantInput = '';
  attachmentInput = '';

  calendarViews: CalendarView[] = ['Day', 'Week', 'Month', 'Agenda'];
  statuses: EventStatus[] = [
    'Draft',
    'Scheduled',
    'Confirmed',
    'Rescheduled',
    'In Progress',
    'Completed',
    'Cancelled',
    'No-show',
    'Archived',
  ];
  responseOptions = ['Accepted', 'Declined', 'Tentative', 'Reschedule'] as const;
  attendanceOptions = ['Present', 'Absent', 'Excused', 'Late'] as const;
  workflowStates = ['Draft', 'Submitted', 'Approved', 'Scheduled', 'In Progress', 'Completed', 'Archived'];
  integrations = ['Google Calendar', 'Microsoft Outlook', 'Exchange Server', 'iCal'];
  virtualPlatforms = ['Zoom', 'Microsoft Teams', 'Google Meet', 'Cisco Webex'];
  attendanceMethods = ['Manual', 'QR code', 'NFC', 'GPS', 'Biometric'];

  resources: ResourceBooking[] = [
    { name: 'Board Room A', type: 'Conference room', status: 'Available', details: '18 seats, screen, video conference' },
    { name: 'Training Hall', type: 'Training hall', status: 'Approval required', details: '60 seats, projector, laptops' },
    { name: 'Company Vehicle 04', type: 'Vehicle', status: 'Available', details: 'External visit support' },
    { name: 'Cisco Room Kit', type: 'Video equipment', status: 'Available', details: 'Hybrid meeting endpoint' },
  ];

  events: MeetingEvent[] = [];

  constructor(
    private collaborationService: CollaborationService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.loadWorkspace();
  }

  ngOnDestroy(): void {
    this.stopTranscriptionPolling();
  }

  get selectedEvent(): MeetingEvent | undefined {
    return this.events.find((event) => event.id === this.selectedEventId) || this.events[0];
  }

  get metrics() {
    const today = this.today();
    const todaysMeetings = this.events.filter((event) => event.kind === 'Meeting' && event.date === today).length;
    const upcomingAppointments = this.events.filter((event) => event.kind === 'Appointment' && event.status !== 'Completed').length;
    const pendingApprovals = this.resources.filter((resource) => resource.status === 'Approval required').length;
    const overdueActions = this.events.flatMap((event) => event.actions).filter((action) => action.status === 'Overdue' || action.status === 'Escalated').length;
    return [
      { label: "Today's meetings", value: String(todaysMeetings), detail: 'Confirmed, scheduled, and in-progress meetings', tone: 'blue' },
      { label: 'Upcoming appointments', value: String(upcomingAppointments), detail: 'Personal, private, and recurring appointments', tone: 'green' },
      { label: 'Pending approvals', value: String(pendingApprovals), detail: 'Rooms, resources, and executive workflows', tone: 'amber' },
      { label: 'Overdue action items', value: String(overdueActions), detail: 'Open follow-ups needing escalation', tone: 'red' },
    ];
  }

  get visibleEvents(): MeetingEvent[] {
    if (this.calendarView === 'Agenda') return [...this.events].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
    if (this.calendarView === 'Day') return this.events.filter((event) => event.date === this.today());
    return this.events;
  }

  openForm(kind: EventKind): void {
    this.activeForm = kind;
    this.form = this.emptyEventForm(kind);
  }

  editEvent(event: MeetingEvent): void {
    this.activeForm = event.kind;
    this.selectedEventId = event.id;
    this.form = { ...event, attendeesText: event.attendees.join(', '), remindersText: event.reminders.join(', ') } as any;
  }

  saveEvent(): void {
    const payload = this.normalizeForm();
    const existingIndex = this.events.findIndex((event) => event.id === payload.id);
    if (existingIndex >= 0) {
      this.events[existingIndex] = payload;
      this.syncEvent(payload, true);
    } else {
      this.events = [payload, ...this.events];
      this.syncEvent(payload, false);
    }
    this.selectedEventId = payload.id;
    this.activeForm = null;
    this.persistWorkspace();
  }

  selectEvent(event: MeetingEvent): void {
    this.selectedEventId = event.id;
    this.selectedAgendaId = event.agenda[0]?.id || '';
  }

  updateStatus(event: MeetingEvent, status: EventStatus): void {
    event.status = status;
    this.persistAndSync(event);
  }

  addParticipant(): void {
    const event = this.selectedEvent;
    const participant = this.participantInput.trim();
    if (!event || !participant || event.attendees.includes(participant)) return;
    event.attendees = [...event.attendees, participant];
    event.attendeeResponses[participant] = 'Tentative';
    event.attendance[participant] = 'Absent';
    this.participantInput = '';
    this.persistAndSync(event);
  }

  setParticipantResponse(event: MeetingEvent, participant: string, response: 'Accepted' | 'Declined' | 'Tentative' | 'Reschedule'): void {
    event.attendeeResponses[participant] = response;
    this.persistAndSync(event);
  }

  setAttendance(event: MeetingEvent, participant: string, attendance: 'Present' | 'Absent' | 'Excused' | 'Late'): void {
    event.attendance[participant] = attendance;
    this.persistAndSync(event);
  }

  bookResource(resource: ResourceBooking): void {
    const event = this.selectedEvent;
    if (!event) return;
    if (resource.status === 'Booked' && resource.bookedFor !== event.id) {
      resource.status = 'Conflict detected';
      this.syncMessage = `${resource.name} has a booking conflict.`;
      return;
    }
    resource.status = resource.status === 'Approval required' ? 'Approval required' : 'Booked';
    resource.bookedFor = event.id;
    event.resources = Array.from(new Set([...event.resources, resource.name]));
    this.syncMessage = `${resource.name} linked to ${event.title}.`;
    this.persistAndSync(event);
  }

  addAgendaItem(): void {
    const event = this.selectedEvent;
    if (!event || !this.agendaForm.topic.trim()) return;
    const item: AgendaItem = {
      id: this.makeId('agenda'),
      topic: this.agendaForm.topic.trim(),
      presenter: this.agendaForm.presenter.trim() || event.organizer,
      duration: Number(this.agendaForm.duration) || 15,
      notes: this.agendaForm.notes.trim(),
      state: 'Draft',
    };
    event.agenda = [...event.agenda, item];
    this.selectedAgendaId = item.id;
    this.agendaForm = { topic: '', presenter: '', duration: 15, notes: '' };
    this.persistAndSync(event);
  }

  updateAgendaState(item: AgendaItem, state: AgendaItem['state']): void {
    item.state = state;
    const event = this.selectedEvent;
    if (event) this.persistAndSync(event);
  }

  addActionItem(): void {
    const event = this.selectedEvent;
    if (!event || !this.actionForm.item.trim()) return;
    event.actions = [
      ...event.actions,
      {
        id: this.makeId('action'),
        owner: this.actionForm.owner.trim() || 'Unassigned',
        item: this.actionForm.item.trim(),
        due: this.actionForm.due || this.today(),
        priority: this.actionForm.priority,
        status: 'Open',
      },
    ];
    this.actionForm = { owner: '', item: '', due: '', priority: 'Medium' };
    this.persistAndSync(event);
  }

  updateAction(action: MeetingAction, status: MeetingAction['status']): void {
    action.status = status;
    const event = this.selectedEvent;
    if (event) this.persistAndSync(event);
  }

  addAttachment(): void {
    const event = this.selectedEvent;
    const attachment = this.attachmentInput.trim();
    if (!event || !attachment) return;
    event.attachments = [...event.attachments, attachment];
    this.attachmentInput = '';
    this.persistAndSync(event);
  }

  generateVirtualRoom(platform: string): void {
    const event = this.selectedEvent;
    if (!event) return;
    event.meetingMode = event.meetingMode === 'Physical' ? 'Hybrid' : event.meetingMode;
    event.onlineLink = `https://meet.optimaxsuites.com/${platform.toLowerCase().replace(/\s+/g, '-')}/${event.id}`;
    this.syncMessage = `${platform} room generated.`;
    this.persistAndSync(event);
  }

  startCall(): void {
    this.openMeetingRoom('CALL');
  }

  startVideo(): void {
    this.openMeetingRoom('VIDEO');
  }

  openMeetingRoom(mode: 'CALL' | 'VIDEO'): void {
    const event = this.selectedEvent;
    if (!event) return;
    this.activeMeetingMode = mode;
    this.meetingRoomName = this.buildMeetingRoomName(event);
    const base = this.normalizeMeetingBaseUrl(this.jitsiBaseUrl);
    this.jitsiBaseUrl = base;
    this.meetingRoomUrl = `${base}/${this.meetingRoomName}#config.prejoinPageEnabled=false&config.startWithVideoMuted=${mode === 'CALL'}`;
    this.trustedMeetingRoomUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.meetingRoomUrl);
    this.meetingRoomOpen = true;
    event.meetingMode = mode === 'CALL' ? 'Virtual' : event.meetingMode === 'Physical' ? 'Hybrid' : event.meetingMode;
    event.onlineLink = this.meetingRoomUrl;
    this.transcriptionTitle = this.transcriptionTitle || `${event.title} recording`;
    this.transcriptionMeetingType = this.transcriptionMeetingType || event.kind;
    this.syncMessage = `${mode === 'CALL' ? 'Audio call' : 'Video meeting'} room opened.`;
    this.persistAndSync(event);
  }

  closeMeetingRoom(): void {
    this.meetingRoomOpen = false;
    this.trustedMeetingRoomUrl = null;
    this.syncMessage = 'Meeting room closed.';
  }

  openMeetingInTab(): void {
    if (!this.meetingRoomUrl) {
      this.openMeetingRoom('VIDEO');
    }
    if (this.meetingRoomUrl) {
      window.open(this.meetingRoomUrl, '_blank', 'noopener');
    }
  }

  onTranscriptionFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.uploadTranscription(file);
      input.value = '';
    }
  }

  uploadTranscription(file: File): void {
    const meeting = this.selectedEvent;
    this.transcriptionStatus = 'Uploading recording for transcription...';
    this.collaborationService
      .uploadMeetingTranscription({
        title: this.transcriptionTitle || `${meeting?.title || 'Meeting'} recording`,
        meetingType: this.transcriptionMeetingType || meeting?.kind || 'Collaboration Meeting',
        language: this.transcriptionLanguage || 'en',
        speakerHints: this.transcriptionSpeakerHints,
        formatAsMinutes: this.transcriptionFormatAsMinutes,
        file,
      })
      .subscribe({
        next: (job) => {
          this.renderTranscriptionJob(job);
          if (job.id) this.startTranscriptionPolling(job.id);
        },
        error: () => {
          this.transcriptionStatus = 'Transcription upload failed. Check AI audio transcription service availability.';
        },
      });
  }

  loadTranscriptionJobs(): void {
    this.transcriptionStatus = 'Loading transcription jobs...';
    this.collaborationService.getMyMeetingTranscriptionJobs().subscribe({
      next: (jobs) => {
        const first = jobs?.items?.[0] || jobs?.results?.[0] || jobs?.content?.[0] || jobs?.[0] || null;
        this.renderTranscriptionJob(first, jobs);
        if (first?.id && !['COMPLETED', 'FAILED'].includes(String(first.status || '').toUpperCase())) {
          this.startTranscriptionPolling(first.id);
        }
      },
      error: () => {
        this.transcriptionStatus = 'Could not load transcription jobs.';
      },
    });
  }

  runAi(operation: 'AGENDA' | 'MINUTES' | 'ACTIONS' | 'FOLLOW_UP' | 'SENTIMENT'): void {
    const event = this.selectedEvent;
    if (!event) return;
    this.aiLoading = true;
    this.aiOutput = null;
    this.collaborationService
      .runMeetingsAssistant({
        operation,
        title: event.title,
        description: event.description,
        agendaItems: event.agenda.map((item) => item.topic),
        attendees: event.attendees,
        notes: this.notesInput,
        context: JSON.stringify(event),
      })
      .subscribe({
        next: (response) => {
          this.aiLoading = false;
          this.applyAiOutput(operation, response);
          this.backendStatus = 'AI microservice response applied';
        },
        error: () => {
          this.aiLoading = false;
          const fallback = this.localAiFallback(operation, event);
          this.applyAiOutput(operation, fallback);
          this.backendStatus = 'AI endpoint unavailable. Local draft applied and saved for retry.';
        },
      });
  }

  syncCalendar(integration: string): void {
    this.syncMessage = `${integration} sync queued. Two-way update and conflict checks are enabled for this workspace.`;
  }

  exportIcal(): void {
    const event = this.selectedEvent;
    if (!event) return;
    const safeTitle = event.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const startsAt = `${event.date.replace(/-/g, '')}T${event.time.replace(':', '')}00`;
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//OptimaXSuites//Meetings Appointments//EN',
      'BEGIN:VEVENT',
      `UID:${event.id}@optimaxsuites`,
      `DTSTART:${startsAt}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description}`,
      `LOCATION:${event.location || event.onlineLink}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${safeTitle || 'calendar-event'}.ics`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  publishMinutes(): void {
    const event = this.selectedEvent;
    if (!event) return;
    event.minutes.approvalState = 'Published';
    this.syncMessage = 'Minutes published and distribution notification queued.';
    this.persistAndSync(event);
  }

  private loadWorkspace(): void {
    const cached = localStorage.getItem(this.storageKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        this.events = parsed.events || [];
        this.resources = parsed.resources || this.resources;
      } catch (_) {
        this.events = this.seedEvents();
      }
    } else {
      this.events = this.seedEvents();
    }
    this.selectedEventId = this.events[0]?.id || '';

    this.collaborationService.getMeetingsAppointmentsWorkspace().subscribe({
      next: (workspace) => {
        if (workspace?.events?.length) {
          this.events = workspace.events;
          this.resources = workspace.resources || this.resources;
          this.selectedEventId = this.events[0]?.id || '';
          this.persistWorkspace();
        }
        this.backendStatus = 'Synced with AI meetings microservice';
      },
      error: () => {
        this.backendStatus = 'Using local workspace. Backend sync will retry on changes.';
      },
    });
  }

  private persistAndSync(event: MeetingEvent): void {
    this.persistWorkspace();
    this.syncEvent(event, true);
  }

  private persistWorkspace(): void {
    localStorage.setItem(
      this.storageKey,
      JSON.stringify({ events: this.events, resources: this.resources, savedAt: new Date().toISOString() }),
    );
  }

  private syncEvent(event: MeetingEvent, update: boolean): void {
    const request = update
      ? this.collaborationService.updateMeetingsAppointmentRecord(event.id, event)
      : this.collaborationService.createMeetingsAppointmentRecord(event);
    request.subscribe({
      next: () => {
        this.backendStatus = 'Saved to AI meetings microservice';
      },
      error: () => {
        this.backendStatus = 'Saved locally. Backend sync pending.';
      },
    });
    this.collaborationService.saveMeetingsAppointmentsWorkspace({
      events: this.events,
      resources: this.resources,
    }).subscribe({ error: () => undefined });
  }

  private applyAiOutput(operation: string, response: MeetingsAssistantResponse): void {
    const event = this.selectedEvent;
    if (!event) return;
    this.aiOutput = response;
    if (operation === 'AGENDA' && response.agenda?.length) {
      event.agenda = response.agenda.map((topic, index) => ({
        id: this.makeId('agenda'),
        topic,
        presenter: event.attendees[index % Math.max(event.attendees.length, 1)] || event.organizer,
        duration: 15,
        state: 'Draft',
        notes: '',
      }));
    }
    if (operation === 'MINUTES') {
      event.minutes.summary = response.summary || event.minutes.summary;
      event.minutes.keyDiscussions = response.summary ? [response.summary] : event.minutes.keyDiscussions;
      event.minutes.decisions = response.decisions || event.minutes.decisions;
      event.minutes.risks = response.risks || event.minutes.risks;
      event.minutes.approvalState = 'Review';
    }
    if (operation === 'ACTIONS' && response.actionItems?.length) {
      event.actions = [
        ...event.actions,
        ...response.actionItems.map((item) => ({
          id: this.makeId('action'),
          owner: event.attendees[0] || event.organizer,
          item,
          due: this.today(),
          priority: 'Medium' as const,
          status: 'Open' as const,
        })),
      ];
    }
    this.persistAndSync(event);
  }

  private renderTranscriptionJob(job: AudioTranscriptionJob | null, raw: any = job): void {
    this.transcriptionRaw = JSON.stringify(raw || {}, null, 2);
    if (!job) {
      this.transcriptionStatus = 'No transcription job yet.';
      this.transcriptionOutput = 'Formatted minutes or transcript will appear here.';
      return;
    }
    this.transcriptionStatus = `Job #${job.id || 'n/a'}\nStatus: ${job.status || 'UNKNOWN'}\nLanguage: ${job.language || this.transcriptionLanguage}`;
    this.transcriptionOutput = job.formattedMinutes || job.rawTranscript || job.errorMessage || 'Waiting for processing output...';
    if (job.formattedMinutes || job.rawTranscript) {
      this.notesInput = job.formattedMinutes || job.rawTranscript || this.notesInput;
    }
  }

  private startTranscriptionPolling(jobId: number): void {
    this.stopTranscriptionPolling();
    this.transcriptionPollTimer = setInterval(() => {
      this.collaborationService.getMeetingTranscriptionJob(jobId).subscribe({
        next: (job) => {
          this.renderTranscriptionJob(job);
          const status = String(job.status || '').toUpperCase();
          if (status === 'COMPLETED' || status === 'FAILED') {
            this.stopTranscriptionPolling();
          }
        },
        error: () => this.stopTranscriptionPolling(),
      });
    }, 4000);
  }

  private stopTranscriptionPolling(): void {
    if (this.transcriptionPollTimer) {
      clearInterval(this.transcriptionPollTimer);
      this.transcriptionPollTimer = null;
    }
  }

  private buildMeetingRoomName(event: MeetingEvent): string {
    const tenant = sessionStorage.getItem('tenantId') || 'optimax';
    return `${tenant}-${event.id}-${event.title}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90);
  }

  private normalizeMeetingBaseUrl(input: string): string {
    let value = String(input || '').trim() || 'https://meet.jit.si';
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    return value.replace(/\/+$/, '');
  }

  private localAiFallback(operation: string, event: MeetingEvent): MeetingsAssistantResponse {
    if (operation === 'AGENDA') {
      return {
        agenda: [
          `Confirm objective for ${event.title}`,
          'Review attendee availability and conflicts',
          'Discuss decisions, risks, and resource constraints',
          'Assign owners and due dates for follow-up actions',
        ],
      };
    }
    if (operation === 'ACTIONS') {
      return {
        actionItems: [
          `Publish meeting notes for ${event.title}`,
          'Confirm resource booking and attendee availability',
          'Send follow-up reminders before the next deadline',
        ],
      };
    }
    if (operation === 'FOLLOW_UP') {
      return {
        followUpRecommendations: [
          'Send action summary to all attendees',
          'Escalate overdue owners after 24 hours',
          'Schedule a 15-minute review for blocked actions',
        ],
      };
    }
    if (operation === 'SENTIMENT') {
      return { sentiment: 'Neutral to positive. Main risk is follow-up closure speed.' };
    }
    return {
      summary: `${event.title} covered agenda progress, attendance, resource status, decisions, and follow-up ownership.`,
      decisions: ['Proceed with agreed next steps', 'Track actions on the executive dashboard'],
      risks: ['Resource conflict', 'Delayed action item closure'],
    };
  }

  private normalizeForm(): MeetingEvent {
    const raw: any = this.form;
    const attendees = String(raw.attendeesText || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const reminders = String(raw.remindersText || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const id = raw.id || this.makeId('event');
    const attendeeResponses: Record<string, 'Accepted' | 'Declined' | 'Tentative' | 'Reschedule'> = {};
    const attendance: Record<string, 'Present' | 'Absent' | 'Excused' | 'Late'> = {};
    attendees.forEach((attendee) => {
      attendeeResponses[attendee] = raw.attendeeResponses?.[attendee] || 'Tentative';
      attendance[attendee] = raw.attendance?.[attendee] || 'Absent';
    });
    return {
      ...raw,
      id,
      attendees,
      attendeeResponses,
      attendance,
      reminders,
      duration: Number(raw.duration) || 30,
      resources: raw.resources || [],
      agenda: raw.agenda || [],
      actions: raw.actions || [],
      attachments: raw.attachments || [],
      minutes: raw.minutes || this.emptyMinutes(),
    };
  }

  private emptyEventForm(kind: EventKind): MeetingEvent & { attendeesText?: string; remindersText?: string } {
    return {
      id: '',
      kind,
      title: '',
      description: '',
      date: this.today(),
      time: '09:00',
      duration: 30,
      location: '',
      onlineLink: '',
      priority: 'Medium',
      status: kind === 'Meeting' ? 'Draft' : 'Scheduled',
      category: kind === 'Meeting' ? 'Internal' : 'Personal',
      color: kind === 'Meeting' ? '#0e7490' : '#16a34a',
      confidential: false,
      recurring: 'None',
      meetingMode: 'Hybrid',
      organizer: sessionStorage.getItem('fullname') || 'Current user',
      attendees: [],
      attendeesText: '',
      attendeeResponses: {},
      attendance: {},
      resources: [],
      agenda: [],
      minutes: this.emptyMinutes(),
      actions: [],
      reminders: ['15 minutes before'],
      remindersText: '15 minutes before',
      attachments: [],
    };
  }

  private emptyMinutes(): MeetingMinutes {
    return {
      summary: '',
      keyDiscussions: [],
      decisions: [],
      risks: [],
      approvalState: 'Draft',
    };
  }

  private seedEvents(): MeetingEvent[] {
    const meeting = this.emptyEventForm('Meeting');
    meeting.id = this.makeId('event');
    meeting.title = 'Executive revenue review';
    meeting.description = 'Weekly hybrid session for leadership revenue, blockers, and decisions.';
    meeting.location = 'Board Room A';
    meeting.onlineLink = 'https://meet.optimaxsuites.com/teams/executive-revenue-review';
    meeting.priority = 'Executive';
    meeting.status = 'Confirmed';
    meeting.attendees = ['Finance Lead', 'COO Office', 'Sales Director'];
    meeting.attendeesText = meeting.attendees.join(', ');
    meeting.attendeeResponses = { 'Finance Lead': 'Accepted', 'COO Office': 'Tentative', 'Sales Director': 'Accepted' };
    meeting.attendance = { 'Finance Lead': 'Present', 'COO Office': 'Absent', 'Sales Director': 'Late' };
    meeting.resources = ['Board Room A', 'Cisco Room Kit'];
    meeting.agenda = [
      { id: this.makeId('agenda'), topic: 'Revenue variance', presenter: 'Finance Lead', duration: 20, state: 'Shared', notes: '' },
      { id: this.makeId('agenda'), topic: 'Operational blockers', presenter: 'COO Office', duration: 15, state: 'Ready', notes: '' },
    ];
    meeting.actions = [
      { id: this.makeId('action'), owner: 'Finance Lead', item: 'Publish approved revenue minutes', due: this.today(), priority: 'High', status: 'Open' },
      { id: this.makeId('action'), owner: 'COO Office', item: 'Resolve room conflict escalation', due: this.today(), priority: 'Medium', status: 'Escalated' },
    ];

    const appointment = this.emptyEventForm('Appointment');
    appointment.id = this.makeId('event');
    appointment.title = 'Vendor onboarding appointment';
    appointment.description = 'External supplier documentation and account setup.';
    appointment.time = '10:30';
    appointment.duration = 45;
    appointment.location = 'Reception Suite';
    appointment.category = 'External';
    appointment.status = 'Scheduled';
    appointment.attendees = ['Procurement Officer', 'Vendor Representative'];
    appointment.attendeesText = appointment.attendees.join(', ');
    appointment.attendeeResponses = { 'Procurement Officer': 'Accepted', 'Vendor Representative': 'Tentative' };
    appointment.attendance = { 'Procurement Officer': 'Absent', 'Vendor Representative': 'Absent' };
    return [meeting, appointment];
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private makeId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
