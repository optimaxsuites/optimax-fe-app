import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { ProgramsData, ProgramStageData } from '../domain/programs.data';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class ManageProgramsService {

  constructor(private http: HttpClient) { }

  createPrograms(data): Observable<any>{
    console.log(data);
    return this.http.post<ProgramsData>(this.getBaseApiUrl()+'postprograms',data);
  }

  getProgramss():Observable<any>{
    return this.http.get<ProgramsData>(this.getBaseApiUrl()+'listprograms');
  }


// Program Stage

createProgramStage(data): Observable<any>{
  return this.http.post<ProgramStageData>(this.getBaseApiUrl()+'postprogramstages',data);
}

getProgramStages():Observable<any>{
  return this.http.get<ProgramStageData>(this.getBaseApiUrl()+'listprogramstages');
}

protected getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}


