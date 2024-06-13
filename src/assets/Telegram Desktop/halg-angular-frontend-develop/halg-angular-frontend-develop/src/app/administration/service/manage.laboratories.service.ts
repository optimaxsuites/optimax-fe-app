import { Injectable,isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { LaboratoriesData } from '../domain/laboratories.data';
import { environment } from '../../../environments/environment';



@Injectable({
  providedIn: 'root'
})
export class ManageLaboratoriesService {


  constructor(private http: HttpClient) { }

  createLaboratories(data): Observable<any>{
    console.log(data);
    return this.http.post<LaboratoriesData>(this.getBaseApiUrl()+'postlaboratories',data);
  }

  getLaboratoriess():Observable<any>{
    return this.http.get<LaboratoriesData>(this.getBaseApiUrl()+'listlaboratories');
  }

  

protected getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}
