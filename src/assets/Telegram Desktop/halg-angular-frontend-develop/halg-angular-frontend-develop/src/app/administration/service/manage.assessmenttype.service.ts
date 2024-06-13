import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { AssessmentTypeData, AssessmentQuestionsData } from '../domain/assessmenttype.data';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ManageAssessmentTypeService {

  constructor(private http: HttpClient) { }

  createAssessmentType(data): Observable<any>{
    console.log(data);
    return this.http.post<AssessmentTypeData>(this.getBaseApiUrl()+'postassessmenttype',data);
  }

  getAssessmentType():Observable<any>{
    return this.http.get<AssessmentTypeData>(this.getBaseApiUrl()+'listassessmenttype');
  }

  deleteAssessmentType(assessment_type_id: number): Observable<any> {
    return this.http.delete<AssessmentTypeData>(this.getBaseApiUrl()+'removegender?genderId='+assessment_type_id);
   }


// Assessment Questions Methods
  createAssessmentQuestions(data): Observable<any>{
    console.log(data);
    return this.http.post<AssessmentQuestionsData>(this.getBaseApiUrl()+'postassessmentquestions',data);
  }

  getAssessmentQuestionss():Observable<any>{
    return this.http.get<AssessmentQuestionsData>(this.getBaseApiUrl()+'listassessmentquestions');
  }

  deleteAssessmentQuestions(assessment_question_id: number): Observable<any> {
    return this.http.delete<AssessmentQuestionsData>(this.getBaseApiUrl()+'removegender?genderId='+assessment_question_id);
   }

protected getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}
