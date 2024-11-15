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

    offerSubject?: string;
    offerLetter?: string;
    offerAttachments?: AttachmentDTO[];

    appointmentSubject?: string;
    appointmentLetter?: string;
    appointmentAttachments?: AttachmentDTO[];

    [key: string]: any; 
}

export interface AttachmentDTO {
    name?: string;
    url?: string;
    size?: number; 
    type?: string; 
}

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