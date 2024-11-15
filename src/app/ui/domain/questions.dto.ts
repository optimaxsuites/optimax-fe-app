// export interface QuestionDTO {
//     id?: string;
//     title?: string;
//     questions?: QuestionItemDTO[];
//     totalScore?: number | null;
// }

// export interface QuestionItemDTO {
//     text: string;
//     score: number | undefined; 
// }



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
    submittedAt: string; 
    criteria?: QuestionDTO;
    totalScore?: number | null;
  }
  
  export interface ScoreSheetByIdDTO {
    [key: string]: ScoreSheetDTO[]; 
  }
  