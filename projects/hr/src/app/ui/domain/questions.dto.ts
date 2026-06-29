export interface QuestionItemDTO {
    text: string;
    score: number | undefined;
  }
  
  export interface QuestionDTO {
    id?: string;
    title?: string;
    questions?: QuestionItemDTO[];
  }
  
  export interface ScoreSheetDTO {
    applicantid: string;
    requestDate: string; 
    criteria?: QuestionDTO;
    totalScore?: number | null;
    interviewStage?: number;
    sessionId?: string;
    interviewerId?: string;
    interviewerName?: string;
    interviewerEmail?: string;
    interviewerRole?: string;
  }
  
  export interface ScoreSheetByIdDTO {
    [key: string]: ScoreSheetDTO[]; 
  }
  
