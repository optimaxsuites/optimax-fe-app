import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScheduledInterviewComponent } from './scheduled-interview.component';
import { ApplicationStage } from '../../../domain/applicant.dto';

describe('ScheduledInterviewComponent', () => {
  let component: ScheduledInterviewComponent;
  let fixture: ComponentFixture<ScheduledInterviewComponent>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      declarations: [ScheduledInterviewComponent],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScheduledInterviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should advance the candidate to the next interview stage from the invite modal payload', () => {
    localStorage.setItem('upcomingInvite', JSON.stringify([{
      id: 'candidate-1',
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      interviewStage: 1,
      stage: ApplicationStage.Completed,
      interviewHistory: [],
      interviewStageSummaries: [{
        stageNumber: 1,
        sessionId: 'session-1',
        averageScore: 84,
        totalSubmissions: 2,
        panelSize: 2,
        submittedBy: ['Panel A', 'Panel B'],
        outcome: 'Pass'
      }]
    }]));
    localStorage.setItem('candidateData', JSON.stringify([{
      id: 'candidate-1',
      status: 'Interview Accepted',
      interviewStatus: 'Completed',
      decisionHistory: []
    }]));

    component.activeItem = { id: 'candidate-1', interviewStage: 1, fullName: 'Jane Doe' };
    component.showInterviewList = false;
    component.showInterviewInvite = true;

    component.sendInvite({
      interviewInvite: '<p>Interview 2 invite</p>',
      interviewType: 'Virtual',
      scheduledDate: '2026-05-12',
      scheduledTime: '10:00',
      location: 'Zoom',
      notes: 'Bring portfolio',
      panelMembers: [{ id: 'panel-1', panelId: 'panel-row-1', name: 'Panel A', role: 'Lead', email: 'panel@example.com' }]
    });

    const [updatedInterview] = JSON.parse(localStorage.getItem('upcomingInvite') || '[]');
    expect(updatedInterview.interviewStage).toBe(2);
    expect(updatedInterview.stage).toBe(ApplicationStage.Scheduled);
    expect(updatedInterview.candidateResponse).toBeUndefined();
    expect(updatedInterview.meetingDetails).toEqual(jasmine.objectContaining({
      date: '2026-05-12',
      time: '10:00',
      location: 'Zoom',
      interviewType: 'Virtual',
      notes: 'Bring portfolio'
    }));
    expect(updatedInterview.interviewHistory.length).toBe(1);
    expect(component.showInterviewList).toBeTrue();
    expect(component.showInterviewInvite).toBeFalse();
  });

  it('should update stage summaries when a score sheet submission is emitted', () => {
    const submission = {
      applicantid: 'candidate-1',
      requestDate: '2026-05-11T10:00:00.000Z',
      criteria: { id: 'criteria-1', title: 'Technical Skills', questions: [] },
      totalScore: 82,
      interviewStage: 1,
      sessionId: 'session-1',
      interviewerId: 'user-1',
      interviewerName: 'Panel A',
      interviewerEmail: 'panel@example.com',
      interviewerRole: 'Lead',
      outcome: 'Pass' as const
    };

    localStorage.setItem('submittedCriteria', JSON.stringify({
      'candidate-1': [submission]
    }));
    localStorage.setItem('upcomingInvite', JSON.stringify([{
      id: 'candidate-1',
      fullName: 'Jane Doe',
      interviewStage: 1,
      stage: ApplicationStage.InProgress,
      interviewCurrentSessionId: 'session-1',
      interviewHistory: [],
      interviewStageSummaries: [],
      interviewScoreAssignments: [{
        id: 'assignment-1',
        sessionId: 'session-1',
        stageNumber: 1,
        participantName: 'Panel A',
        participantRole: 'Lead',
        participantEmail: 'panel@example.com',
        status: 'Pending'
      }]
    }]));
    localStorage.setItem('candidateData', JSON.stringify([{
      id: 'candidate-1',
      interviewStatus: 'Invited',
      decisionHistory: []
    }]));

    component.activeItem = { id: 'candidate-1' };
    component.SaveScoreSheet(submission);

    const [updatedInterview] = JSON.parse(localStorage.getItem('upcomingInvite') || '[]');
    expect(updatedInterview.interviewScoreAssignments[0].status).toBe('Submitted');
    expect(updatedInterview.latestInterviewOutcome).toBe('Pass');
    expect(updatedInterview.scoreSheetStatus).toBe('In Progress');
    expect(updatedInterview.interviewStageSummaries[0]).toEqual(jasmine.objectContaining({
      stageNumber: 1,
      sessionId: 'session-1',
      averageScore: 82,
      totalSubmissions: 1,
      panelSize: 1,
      outcome: 'Pass'
    }));
  });

  it('should expose submitted score sheets for viewing and downloading after interview completion', () => {
    localStorage.setItem('submittedCriteria', JSON.stringify({
      'candidate-1': [{
        applicantid: 'candidate-1',
        requestDate: '2026-05-11T10:00:00.000Z',
        criteria: { id: 'criteria-1', title: 'Technical Skills', questions: [{ text: 'Problem solving', score: 4 }] },
        totalScore: 80,
        interviewStage: 1,
        sessionId: 'session-1',
        interviewerName: 'Panel A',
        interviewerEmail: 'panel@example.com',
        interviewerRole: 'Lead'
      }]
    }));

    const interview: any = {
      id: 'candidate-1',
      fullName: 'Jane Doe',
      stage: ApplicationStage.Completed
    };

    expect(component.canDownloadScoreSheet(interview)).toBeTrue();
    expect(component.canViewScoreSheet(interview)).toBeTrue();
    expect(component.getSubmittedScoreSheets('candidate-1').length).toBe(1);

    component.openScoreSheetPreview(interview);

    expect(component.showScoreSheetPreview).toBeTrue();
    expect(component.selectedScoreSheet?.criteria?.title).toBe('Technical Skills');
  });

  it('should allow only logged in panel members to manage an interview', () => {
    const interview: any = {
      id: 'candidate-1',
      stage: ApplicationStage.Scheduled,
      interviewPanel: [
        { id: 'user-2', userId: 'user-2', username: 'paneluser', name: 'Panel User', role: 'Lead', email: 'panel@example.com', panelId: 'panel-1' }
      ]
    };

    sessionStorage.setItem('userid', 'user-1');
    sessionStorage.setItem('email', 'other@example.com');
    sessionStorage.setItem('username', 'otheruser');
    (component as any).loadCurrentUserContext();

    expect(component.canManageInterview(interview)).toBeFalse();
    expect(component.canStartInterview(interview)).toBeFalse();

    sessionStorage.setItem('userid', 'user-2');
    sessionStorage.setItem('email', 'panel@example.com');
    sessionStorage.setItem('username', 'paneluser');
    (component as any).loadCurrentUserContext();

    expect(component.canManageInterview(interview)).toBeTrue();
    expect(component.canStartInterview(interview)).toBeTrue();
  });
});
