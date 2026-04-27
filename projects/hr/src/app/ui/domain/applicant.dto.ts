export interface ApplicantDTO{
    id?: string;
    candidateName?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    firstname?: string;
    lastname?: string;
    fullname?: string;
    contactNo?: string;
    email?: string;
    position?: string;
    dateApplied?: string;
    resume?: any;
    coverLetter?: any;
    stage?: ApplicationStage;
    interviewStage?: number;

    interviewSubject?: string
    interviewInvite?: string;
    interviewType?: string;
    inviteAttachments?: AttachmentDTO[];
    interviewPanel?: InterviewPanelMemberDTO[];
    interviewHistory?: InterviewHistoryItemDTO[];
    interviewStageSummaries?: InterviewStageSummaryDTO[];
    interviewScoreAssignments?: InterviewScoreAssignmentDTO[];
    interviewCurrentSessionId?: string;
    latestInterviewOutcome?: InterviewOutcomeDTO;
    meetingDetails?: InterviewMeetingDetailsDTO;
    scoreSheetStatus?: InterviewScoreStatusDTO;

    offerSubject?: string;
    offerLetter?: string;
    offerAttachments?: AttachmentDTO[];

    appointmentSubject?: string;
    appointmentLetter?: string;
    appointmentAttachments?: AttachmentDTO[];

    [key: string]: any; 
}

export interface AttachmentDTO {
    id?: number;
    name?: string;
    url?: string;
    size?: number; 
    type?: string; 
}

export interface InterviewPanelMemberDTO {
    id: string;
    userId?: string;
    username?: string;
    name: string;
    role: string;
    email: string;
}

export interface InterviewMeetingDetailsDTO {
    date?: string;
    time?: string;
    location?: string;
    interviewType?: string;
    notes?: string;
}

export interface InterviewHistoryItemDTO {
    id: string;
    date: string;
    action: string;
    details: string;
    stageNumber?: number;
    documents?: AttachmentDTO[];
    outcome?: InterviewOutcomeDTO;
    averageScore?: number;
}

export interface InterviewStageSummaryDTO {
    stageNumber: number;
    sessionId: string;
    startedAt?: string;
    completedAt?: string;
    averageScore?: number;
    totalSubmissions: number;
    panelSize: number;
    submittedBy: string[];
    outcome: InterviewOutcomeDTO;
}

export interface InterviewScoreAssignmentDTO {
    id: string;
    sessionId: string;
    stageNumber: number;
    participantName: string;
    participantRole: string;
    participantEmail: string;
    status: 'Pending' | 'Submitted';
    submittedAt?: string;
    totalScore?: number | null;
}

export type InterviewOutcomeDTO = 'Pending' | 'Pass' | 'Borderline' | 'Fail';
export type InterviewScoreStatusDTO = 'Not Started' | 'Ready' | 'In Progress' | 'Completed';

export enum ApplicationStage {
    ApplicationReceived = 'Application Received',
    Scheduled = "Scheduled",
    InProgress = 'In-Progress',
    Completed = "Completed",
    OfferSent = "Offer-Sent",
    OfferAccepted = "Offer-Accepted",
    OfferRejected = "Offer-Rejected",
    AppointmentLetterSent = 'Appointment-Letter-Sent',
    AppointmentAccepted = 'Appointment-Accepted',
    AppointmentRejected = 'Appointment-Rejected'
}
