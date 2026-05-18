import { employeeDTO } from './employee.dto';
import { JobPostingCustomFieldDTO, JobPostingDTO } from './job.dto';

export type DateTimeString = string;

export type RecruitmentStage =
  | 'APPLICATION'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'OFFER'
  | 'APPOINTMENT'
  | 'ONBOARDING'
  | 'CLOSED';

export type RecruitmentApplicationStatus =
  | 'NEW'
  | 'UNDER_REVIEW'
  | 'SHORTLISTED'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_ACCEPTED'
  | 'INTERVIEW_DECLINED'
  | 'INTERVIEW_COMPLETED'
  | 'OFFER_SENT'
  | 'OFFER_ACCEPTED'
  | 'OFFER_REJECTED'
  | 'APPOINTMENT_SENT'
  | 'APPOINTMENT_ACCEPTED'
  | 'APPOINTMENT_REJECTED'
  | 'HIRED'
  | 'REJECTED'
  | 'WITHDRAWN';

export type RecruitmentDocumentType =
  | 'RESUME'
  | 'COVER_LETTER'
  | 'PORTFOLIO'
  | 'CERTIFICATE'
  | 'IDENTIFICATION'
  | 'ASSESSMENT'
  | 'OFFER_ATTACHMENT'
  | 'APPOINTMENT_ATTACHMENT'
  | 'OTHER';

export type RecruitmentSourceType =
  | 'CAREER_PORTAL'
  | 'REFERRAL'
  | 'JOB_BOARD'
  | 'SOCIAL_MEDIA'
  | 'AGENCY'
  | 'INTERNAL'
  | 'WALK_IN'
  | 'OTHER';

export type RecruitmentDecisionType =
  | 'APPLIED'
  | 'MOVED_TO_REVIEW'
  | 'SHORTLISTED'
  | 'REJECTED'
  | 'INTERVIEW_INVITED'
  | 'INTERVIEW_ACCEPTED'
  | 'INTERVIEW_DECLINED'
  | 'INTERVIEW_COMPLETED'
  | 'OFFER_SENT'
  | 'OFFER_ACCEPTED'
  | 'OFFER_REJECTED'
  | 'APPOINTMENT_SENT'
  | 'APPOINTMENT_ACCEPTED'
  | 'APPOINTMENT_REJECTED'
  | 'HIRED'
  | 'WITHDRAWN'
  | 'INFO_REQUESTED';

export type RecruitmentInterviewType =
  | 'VIRTUAL'
  | 'PHYSICAL'
  | 'PHONE'
  | 'ASSESSMENT_CENTER'
  | 'HYBRID';

export type RecruitmentCandidateResponseStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'RESCHEDULE_REQUESTED'
  | 'NO_RESPONSE';

export type RecruitmentInterviewStatus =
  | 'SCHEDULED'
  | 'AWAITING_RESPONSE'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type RecruitmentInterviewOutcome =
  | 'PENDING'
  | 'PASS'
  | 'BORDERLINE'
  | 'FAIL'
  | 'HOLD';

export type RecruitmentScoreStatus =
  | 'NOT_STARTED'
  | 'READY'
  | 'IN_PROGRESS'
  | 'COMPLETED';

export type RecruitmentScoreRecommendation =
  | 'STRONG_HIRE'
  | 'HIRE'
  | 'MAYBE'
  | 'NO_HIRE';

export type RecruitmentScreeningStatus =
  | 'PENDING'
  | 'IN_REVIEW'
  | 'SHORTLISTED'
  | 'REJECTED'
  | 'INFO_REQUESTED';

export type RecruitmentOfferStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'WITHDRAWN';

export type RecruitmentAppointmentStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'WITHDRAWN';

export type RecruitmentOnboardingStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface RecruitmentAuditUserDTO {
  id?: number;
  userId?: number | string;
  username?: string;
  fullname?: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
  department?: string;
}

export interface RecruitmentAttachmentDTO {
  id?: number;
  name?: string;
  type?: string;
  documentType?: RecruitmentDocumentType;
  url?: string;
  size?: number;
  extension?: string;
  fileReference?: string;
  uploadedAt?: DateTimeString;
  uploadedBy?: RecruitmentAuditUserDTO | number;
  notes?: string;
}

export interface RecruitmentFormResponseDTO {
  id?: number;
  label?: string;
  value?: string;
  fieldType?: string;
  required?: boolean;
}

export interface RecruitmentCustomFieldResponseDTO {
  id?: number;
  jobVacancyCustomField?: JobPostingCustomFieldDTO | number;
  fieldLabel?: string;
  value?: string;
  valueType?: string;
  attachment?: RecruitmentAttachmentDTO;
}

export interface RecruitmentDecisionHistoryDTO {
  id?: number;
  action?: RecruitmentDecisionType;
  status?: RecruitmentApplicationStatus;
  stage?: RecruitmentStage;
  date?: DateTimeString;
  notes?: string;
  emailCopy?: string;
  actedBy?: RecruitmentAuditUserDTO | number;
}

export interface RecruitmentStageHistoryDTO {
  id?: number;
  fromStage?: RecruitmentStage;
  toStage?: RecruitmentStage;
  changedAt?: DateTimeString;
  changedBy?: RecruitmentAuditUserDTO | number;
  reason?: string;
}

export interface RecruitmentAiVettingDTO {
  id?: number;
  overallScore?: number;
  skillsMatch?: number;
  experienceFit?: number;
  recommendation?: RecruitmentScoreRecommendation;
  strengths?: string[];
  concerns?: string[];
  summary?: string;
  generatedAt?: DateTimeString;
  generatedBy?: RecruitmentAuditUserDTO | number;
}

export interface RecruitmentDocumentRequestDTO {
  id?: number;
  title?: string;
  description?: string;
  requiredDocumentType?: RecruitmentDocumentType;
  dueDate?: DateTimeString;
  status?: 'PENDING' | 'SUBMITTED' | 'OVERDUE' | 'WAIVED';
  requestedAt?: DateTimeString;
  requestedBy?: RecruitmentAuditUserDTO | number;
  submittedAt?: DateTimeString;
}

export interface RecruitmentScreeningDTO {
  id?: number;
  status?: RecruitmentScreeningStatus;
  screenedAt?: DateTimeString;
  screenedBy?: RecruitmentAuditUserDTO | number;
  shortlistScore?: number;
  notes?: string;
  rejectionReason?: string;
  requestedDocuments?: RecruitmentDocumentRequestDTO[];
  nextActionDate?: DateTimeString;
}

export interface RecruitmentInterviewPanelMemberDTO {
  id?: number | string;
  userId?: number | string;
  username?: string;
  name?: string;
  role?: string;
  email?: string;
  isLead?: boolean;
  notifiedAt?: DateTimeString;
}

export interface RecruitmentInterviewMeetingDetailsDTO {
  scheduledDate?: string;
  scheduledTime?: string;
  startsAt?: DateTimeString;
  endsAt?: DateTimeString;
  durationMinutes?: number;
  location?: string;
  meetingLink?: string;
  interviewType?: RecruitmentInterviewType;
  timeZone?: string;
  notes?: string;
}

export interface RecruitmentInterviewHistoryDTO {
  id?: number;
  stageNumber?: number;
  action?: string;
  details?: string;
  date?: DateTimeString;
  createdBy?: RecruitmentAuditUserDTO | number;
}

export interface RecruitmentInterviewScoreItemDTO {
  id?: number;
  question?: string;
  score?: number;
  maxScore?: number;
  comment?: string;
}

export interface RecruitmentInterviewScoreSheetDTO {
  id?: number;
  interviewId?: number;
  applicationId?: number;
  stageNumber?: number;
  sessionId?: string;
  interviewer?: RecruitmentAuditUserDTO | number;
  interviewerRole?: string;
  submittedAt?: DateTimeString;
  criteriaTitle?: string;
  scoreItems?: RecruitmentInterviewScoreItemDTO[];
  totalScore?: number;
  maxScore?: number;
  averageScore?: number;
  recommendation?: RecruitmentScoreRecommendation;
  notes?: string;
  status?: 'PENDING' | 'SUBMITTED';
}

export interface RecruitmentInterviewStageSummaryDTO {
  id?: number;
  stageNumber?: number;
  sessionId?: string;
  status?: RecruitmentInterviewStatus;
  startedAt?: DateTimeString;
  completedAt?: DateTimeString;
  averageScore?: number;
  totalSubmissions?: number;
  panelSize?: number;
  submittedBy?: string[];
  outcome?: RecruitmentInterviewOutcome;
}

export interface RecruitmentInterviewDTO {
  id?: number;
  applicationId?: number;
  sessionId?: string;
  stageNumber?: number;
  subject?: string;
  inviteMessage?: string;
  inviteAttachments?: RecruitmentAttachmentDTO[];
  status?: RecruitmentInterviewStatus;
  candidateResponse?: RecruitmentCandidateResponseStatus;
  responseDate?: DateTimeString;
  responseComment?: string;
  meetingDetails?: RecruitmentInterviewMeetingDetailsDTO;
  panelMembers?: RecruitmentInterviewPanelMemberDTO[];
  scoreStatus?: RecruitmentScoreStatus;
  scoreSheets?: RecruitmentInterviewScoreSheetDTO[];
  history?: RecruitmentInterviewHistoryDTO[];
  summaries?: RecruitmentInterviewStageSummaryDTO[];
  outcome?: RecruitmentInterviewOutcome;
  feedback?: string;
  startedAt?: DateTimeString;
  completedAt?: DateTimeString;
  createdAt?: DateTimeString;
  createdBy?: RecruitmentAuditUserDTO | number;
}

export interface RecruitmentCompensationDTO {
  id?: number;
  currency?: string;
  baseSalary?: number;
  allowances?: number;
  bonus?: number;
  otherBenefitsValue?: number;
  grossAnnualPackage?: number;
  payFrequency?: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
}

export interface RecruitmentOfferDTO {
  id?: number;
  applicationId?: number;
  offerCode?: string;
  subject?: string;
  letterBody?: string;
  attachments?: RecruitmentAttachmentDTO[];
  status?: RecruitmentOfferStatus;
  compensation?: RecruitmentCompensationDTO;
  proposedStartDate?: DateTimeString;
  responseDueDate?: DateTimeString;
  sentAt?: DateTimeString;
  sentBy?: RecruitmentAuditUserDTO | number;
  acceptedAt?: DateTimeString;
  rejectedAt?: DateTimeString;
  rejectionReason?: string;
  notes?: string;
}

export interface RecruitmentAppointmentDTO {
  id?: number;
  applicationId?: number;
  appointmentCode?: string;
  subject?: string;
  letterBody?: string;
  attachments?: RecruitmentAttachmentDTO[];
  status?: RecruitmentAppointmentStatus;
  department?: string;
  jobTitle?: string;
  grade?: string;
  location?: string;
  resumptionDate?: DateTimeString;
  reportingManager?: RecruitmentAuditUserDTO | number;
  sentAt?: DateTimeString;
  sentBy?: RecruitmentAuditUserDTO | number;
  acceptedAt?: DateTimeString;
  rejectedAt?: DateTimeString;
  rejectionReason?: string;
  notes?: string;
}

export interface RecruitmentOnboardingChecklistItemDTO {
  id?: number;
  title?: string;
  description?: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'WAIVED';
  dueDate?: DateTimeString;
  completedAt?: DateTimeString;
  completedBy?: RecruitmentAuditUserDTO | number;
}

export interface RecruitmentOnboardingDTO {
  id?: number;
  applicationId?: number;
  employee?: employeeDTO | number;
  status?: RecruitmentOnboardingStatus;
  startDate?: DateTimeString;
  checklist?: RecruitmentOnboardingChecklistItemDTO[];
  notes?: string;
}

export interface RecruitmentApplicationDTO {
  id?: number;
  applicationCode?: string;
  jobPosting?: JobPostingDTO | number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  alternativePhone?: string;
  source?: RecruitmentSourceType;
  sourceDetails?: string;
  dateApplied?: DateTimeString;
  currentStage?: RecruitmentStage;
  status?: RecruitmentApplicationStatus;
  recruiterOwner?: RecruitmentAuditUserDTO | number;
  currentLocation?: string;
  salaryExpectation?: number;
  noticePeriodDays?: number;
  availableFrom?: DateTimeString;
  totalExperienceYears?: number;
  coverLetterText?: string;
  resume?: RecruitmentAttachmentDTO;
  documents?: RecruitmentAttachmentDTO[];
  formResponses?: RecruitmentFormResponseDTO[];
  customFieldResponses?: RecruitmentCustomFieldResponseDTO[];
  screening?: RecruitmentScreeningDTO;
  interviews?: RecruitmentInterviewDTO[];
  latestInterview?: RecruitmentInterviewDTO;
  offer?: RecruitmentOfferDTO;
  appointment?: RecruitmentAppointmentDTO;
  onboarding?: RecruitmentOnboardingDTO;
  aiVetting?: RecruitmentAiVettingDTO;
  decisionHistory?: RecruitmentDecisionHistoryDTO[];
  stageHistory?: RecruitmentStageHistoryDTO[];
  hiredEmployee?: employeeDTO | number;
  rejectionReason?: string;
  withdrawnReason?: string;
  createdAt?: DateTimeString;
  updatedAt?: DateTimeString;
}

export interface PostRecruitmentApplicationStatDTO {
  from?: DateTimeString;
  to?: DateTimeString;
  jobPostings?: (JobPostingDTO | number)[];
  recruiters?: (RecruitmentAuditUserDTO | number)[];
  stages?: RecruitmentStage[];
  statuses?: RecruitmentApplicationStatus[];
  sources?: RecruitmentSourceType[];
}

export interface GetRecruitmentApplicationStatDTO {
  totalRecords?: number;
  totalNew?: number;
  totalUnderReview?: number;
  totalShortlisted?: number;
  totalInterviewScheduled?: number;
  totalInterviewAccepted?: number;
  totalInterviewDeclined?: number;
  totalInterviewCompleted?: number;
  totalOfferSent?: number;
  totalOfferAccepted?: number;
  totalOfferRejected?: number;
  totalAppointmentSent?: number;
  totalAppointmentAccepted?: number;
  totalAppointmentRejected?: number;
  totalRejected?: number;
  totalWithdrawn?: number;
  totalHired?: number;
  averageInterviewScore?: number;
  averageTimeToHireDays?: number;
  applications?: RecruitmentApplicationDTO[];
}
