import { Injectable,isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { UserRoleData } from '../domain/user.role.data';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ManageUserRoleService {

  constructor(private http: HttpClient) { }

  createUserRole(data): Observable<any>{
    console.log(data);
    return this.http.post<UserRoleData>(this.getBaseApiUrl()+'postuserroles',data);
  }

  getUserRole():Observable<any>{
    return this.http.get<UserRoleData>(this.getBaseApiUrl()+'listuserroles');
  }



protected getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}


