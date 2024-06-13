import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { AssessmentQuestionsData } from '../domain/assessmentquestions.data';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class ManageAssessmentquestionsService {

  constructor(private http: HttpClient) { }

  createAssessmentQuestions(data): Observable<any>{
    console.log(data);
    return this.http.post<AssessmentQuestionsData>(this.getBaseApiUrl()+'postassessmentquestions',data);
  }

  getAssessmentQuestionss():Observable<any>{
    return this.http.get<AssessmentQuestionsData>(this.getBaseApiUrl()+'listassessmentquestions');
  }


  deleteAssessmentQuestions(assessment_type_id: number): Observable<any> {
    return this.http.delete<AssessmentQuestionsData>(this.getBaseApiUrl()+'removegender?genderId='+assessment_type_id);
   }

protected getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}


