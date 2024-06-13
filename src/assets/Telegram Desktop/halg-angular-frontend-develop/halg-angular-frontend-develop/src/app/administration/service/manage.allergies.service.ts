import { Injectable,isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { AllergiesData, AllergensData, SeverityData, PriorityData } from '../domain/allergies.data';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ManageAllergiesService {


  constructor(private http: HttpClient) { }

  createAllergies(data): Observable<any>{
    console.log(data);
    return this.http.post<AllergiesData>(this.getBaseApiUrl()+'postallergies',data);
  }

  getAllergiess():Observable<any>{
    return this.http.get<AllergiesData[]>(this.getBaseApiUrl()+'listallergies');
  }

  deleteAllergies(allergies_id: number): Observable<any> {
    return this.http.delete<AllergiesData>(this.getBaseApiUrl()+'removegender?genderId='+allergies_id);
   }

  // Allergens Methods

  createAllergens(data): Observable<any>{
    console.log(data);
    return this.http.post<AllergensData>(this.getBaseApiUrl()+'postallergens',data);
  }

  getAllergenss():Observable<any>{
    return this.http.get<AllergensData[]>(this.getBaseApiUrl()+'listallergens');
  }

  deleteAllergens(allergens_id: number): Observable<any> {
    return this.http.delete<AllergensData>(this.getBaseApiUrl()+'removegender?genderId='+allergens_id);
   }

  //Severity Methods

  createSeverity(data): Observable<any>{
    console.log(data);
    return this.http.post<SeverityData>(this.getBaseApiUrl()+'postseverity',data);
  }

  getSeveritys():Observable<any>{
    return this.http.get<SeverityData>(this.getBaseApiUrl()+'listseverity');
  }

  deleteSeverity(severity_id: number): Observable<any> {
    return this.http.delete<SeverityData>(this.getBaseApiUrl()+'removegender?genderId='+severity_id);
   }

   //Priority Methods
   createPriority(data): Observable<any>{
    console.log(data);
    return this.http.post<PriorityData>(this.getBaseApiUrl()+'postpriority',data);
  }

  getPrioritys():Observable<any>{
    return this.http.get<PriorityData>(this.getBaseApiUrl()+'listpriority');
  }

protected getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}
