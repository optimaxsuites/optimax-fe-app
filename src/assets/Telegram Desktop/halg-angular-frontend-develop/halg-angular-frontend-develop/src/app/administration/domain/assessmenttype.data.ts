import { Time } from '@angular/common';

export interface AssessmentTypeData{
    assessment_type_id: number;
    name: string;
    code: string ;
    description: string;
    flag: string;
    created_by: number;
    created_date: number;

}

export interface AssessmentQuestionsData{
  assessment_type_id: number;
  name: string;
  code: string;
  assessment_question_id
  description: string;
  created_by: number;
  created_date: Date;
}
