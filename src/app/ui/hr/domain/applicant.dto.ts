export interface ApplicantDTO{
    id?: string;
    candidate?: string;
    firstName?: string;
    lastName?: string;
    contactNo?: string;
    email?: string;
    position?: string;
    dateApplied?: string;
    resume?: string | null;
    coverLetter?: string;
    stage?: ApplicationStage;
    interviewStage?: number;
    interviewInvite?: string;
    interviewType?: string;
    offerSubject?: string;
    offerLetter?: string;
    inviteAttachments?: AttachmentDTO[];
    offerAttachments?: AttachmentDTO[];
    appointmentAttachments?: AttachmentDTO[];
}

export interface AttachmentDTO {
    name?: string;
    url?: string;
    size?: number; // Add size property
    type?: string; // Add type property
  }

export enum ApplicationStage {
    ApplicationReceived = 'Application Received',
    Scheduled = "Scheduled",
    InProgress = 'In-Progress',
    Completed = "Completed",
    OfferSent = "Offer-Sent",
    OfferAccepted = "Offer-Accepted",
    OfferRejected = "Offer-Rejected",
    EmployementLetterSent = 'Employement-Letter-Sent',
    EmployementAccepted = 'Employement-Accepted',
    EmployementRejected = 'Employement-Rejected'
}