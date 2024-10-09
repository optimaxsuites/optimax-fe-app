export interface ApplicantDTO{
    id?: string;
    candidate?: string;
    contactNo?: string;
    email?: string;
    position?: string;
    dateApplied?: string;
    resume?: string | null;
    coverLetter?: string;
    stage?: string;
    interviewStage?: number;
    interviewInvite?: string;
    interviewType?: string;
}