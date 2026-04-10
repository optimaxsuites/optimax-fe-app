import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../sharedComponents/service/environments/environment';


export interface SmtpConfig {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  protocol: string;
  authEnabled: boolean;
  startTlsEnabled: boolean;
  sslEnabled: boolean;
  fromAddress: string;
  connectionTimeoutMs: number;
  timeoutMs: number;
  writeTimeoutMs: number;
  active: boolean;
}


@Injectable({
  providedIn: 'root'
})
export class SmtpConfigService {

    private baseUrl = environment.apiBaseUrl;
  
  constructor(private http: HttpClient) {}

  createConfig(payload: SmtpConfig): Observable<any> {
    return this.http.post(`${this.baseUrl}/x/api/v2/us/smtp-config`, payload);
  }

  getConfig(): Observable<any> {
    return this.http.get(`${this.baseUrl}/x/api/v2/us/smtp-config`);
  }
}
