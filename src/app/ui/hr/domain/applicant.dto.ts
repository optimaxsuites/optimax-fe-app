export interface ApplicantDTO{
    id?: number;
    candidate?: string;
    contactNo?: string;
    email?: string;
    position?: string;
    dateApplied?: string;
    resume?: string | null;
    coverLetter?: string;
    stage?: string;
    interviewInvite?: string;
    interviewType?: string;
}