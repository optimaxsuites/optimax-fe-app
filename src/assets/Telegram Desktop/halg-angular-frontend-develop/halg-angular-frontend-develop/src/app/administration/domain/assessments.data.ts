export interface AssessmentType{
    name: string;
    description: string;
    code: string;
    flag: string;
    assessment_type_id:number;
    created_by: number;
    created_date: number;
}

export interface AssessmentQuestions{
    assessment_type_id: number;
    assessment_question_id: number;
    name:string;
    description:string;
    created_by: number;
    created_date: number;
    default_response: boolean;
    assessmentResponseCallBackId: number;
    assessmentType: AssessmentType;

}

export interface AssessmentResponses{
    assessment_response_id: number;
    client_unique_identifier: string;
    assessment_question_id: number;
    value:number;
    created_by: number;
    created_date: number;
    assessmentQuestions: AssessmentQuestions;

}