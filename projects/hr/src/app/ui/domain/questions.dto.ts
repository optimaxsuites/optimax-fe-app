export interface QuestionDTO {
    id?: string;
    title?: string;
    questions?: QuestionItemDTO[];
    totalScore?: number | null;
}

export interface QuestionItemDTO {
    text: string;
    score: number | undefined; 
    previousScore?: number;
}