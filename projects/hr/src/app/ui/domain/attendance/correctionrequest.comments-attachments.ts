export interface CorrectionComment {
  id: string;
  authorName?: string;
  authorRole?: 'EMPLOYEE' | 'SUPERVISOR' | 'HR';
  message: string;
  at: string; // ISO datetime
}

export interface CorrectionAttachment {
  id: string;
  fileName: string;
  fileType?: string;
  // In-memory only for now
  url?: string;
  at: string; // ISO datetime
}

