// base-loan.service.ts
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../shared-component/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BaseLoanService {
  protected baseUrl = environment.apiBaseUrl;

  constructor(protected http: HttpClient) {}

  protected getHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('token');
    const tenantId = 'optimax';
    
    console.log('Token present:', !!token);
    console.log('Token value:', token ? token.substring(0, 50) + '...' : 'null');
    
    let headers = new HttpHeaders();
    headers = headers.set('Authorization', `Bearer ${token}`);
    headers = headers.set('X-Tenant-ID', tenantId);
    headers = headers.set('Accept', 'application/json');
    // Do NOT set Content-Type for GET requests
    
    return headers;
  }

  protected getHeadersWithContentType(): HttpHeaders {
    return this.getHeaders().set('Content-Type', 'application/json');
  }
}