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
    submittedAt: string; 
    criteria?: QuestionDTO;
    totalScore?: number | null;
  }
  
  export interface ScoreSheetByIdDTO {
    [key: string]: ScoreSheetDTO[]; 
  }
  