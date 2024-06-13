import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { DiagnosisConditionData } from '../domain/diagonosiscondition.data';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class ManageDiagnosisConditionService {

  constructor(private http: HttpClient) { }

  createDiagnosisCondition(data): Observable<any>{
    console.log(data);
    return this.http.post<DiagnosisConditionData>(this.getBaseApiUrl()+'postdiagnosisconditions',data);
  }

  getDiagnosisConditions():Observable<any>{
    return this.http.get<DiagnosisConditionData>(this.getBaseApiUrl()+'listdiagnosisconditions');
  }



protected getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}


