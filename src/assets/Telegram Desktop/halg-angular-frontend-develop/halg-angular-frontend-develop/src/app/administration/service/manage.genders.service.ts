import { Injectable,isDevMode} from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';
import { GenderData, MaritalStatusData, RelationshipData, LanguageData, ReligionData } from '../domain/gender.data';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})

export class ManageGendersService {
  /* httpOptions = {
    headers: new HttpHeaders({
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + `eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkYW1pbG9sYSIsImV4cCI6MTYxNTMyOTYzMCwiaWF0IjoxNjE1MjkzNjMwfQ.T0z_jx5umCkOM8yeIMrY5I8HXkJjYXJXAqn5j5kRHHc`
    })
  };*/
  constructor(private http: HttpClient) { }

  createGender(data): Observable<any>{
    console.log(data);
    return this.http.post<GenderData>(this.getBaseApiUrl()+'postgenders',data);
  }

  getGenders():Observable<any>{
    return this.http.get<GenderData>(this.getBaseApiUrl()+'listgenders');
  }

  deleteGender(genders): Observable<any> {
   return this.http.delete<GenderData[]>(this.getBaseApiUrl()+'removegender',genders);
  }

  /*deleteGenders(): Observable<any> {
    return this.http.delete<GenderData>(this.getBaseApiUrl()+'removegender');
  } */

  // Marital Status Methods

  createMaritalStatus(data): Observable<any>{
    console.log(data);
    return this.http.post<MaritalStatusData>(this.getBaseApiUrl()+'postmaritalstatus',data);
  }

  getMaritalStatuss():Observable<any>{
    return this.http.get<MaritalStatusData>(this.getBaseApiUrl()+'listmaritalstatus');
  }

  deleteMaritalStatus(marital_status_id: number): Observable<any> {
    return this.http.delete<MaritalStatusData>(this.getBaseApiUrl()+'removegender?genderId='+marital_status_id);
   }


  //Relationship Methods

  createRelationship(data): Observable<any>{
    console.log(data);
    return this.http.post<RelationshipData>(this.getBaseApiUrl()+'postrelationship',data);
  }

  getRelationship():Observable<any>{
    return this.http.get<RelationshipData>(this.getBaseApiUrl()+'listrelationships');
  }

  deleteRelationship(relationship_id: number): Observable<any> {
    return this.http.delete<RelationshipData>(this.getBaseApiUrl()+'removegender?genderId='+relationship_id);
   }

  //Language Methods
  createLanguage(data): Observable<any>{
    console.log(data);
    return this.http.post<LanguageData>(this.getBaseApiUrl()+'postlanguages',data);
  }

  getLanguages():Observable<any>{
    return this.http.get<LanguageData>(this.getBaseApiUrl()+'listlanguages');
  }

  deleteLanguage(language_id: number): Observable<any> {
    return this.http.delete<LanguageData>(this.getBaseApiUrl()+'removegender?genderId='+language_id);
   }


   //Religion Methods

   createReligion(data): Observable<any>{
    console.log(data);
    return this.http.post<ReligionData>(this.getBaseApiUrl()+'postreligions',data);
  }


getReligion():Observable<any>{
  return this.http.get<ReligionData>(this.getBaseApiUrl()+'listreligions');
}

  protected getBaseApiUrl(): string {
    return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
    }
}
