import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../shared-component/environments/environment';

export interface LoanPurposeData {
  id?: number;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  maxLoanAmount?: number | null;
  minLoanAmount?: number | null;
  defaultInterestRate?: number | null;
  requiresDocumentation: boolean;
  documentationTypes: string[];
}

export interface CreatePurposePayload {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  maxLoanAmount?: number | null;
  minLoanAmount?: number | null;
  defaultInterestRate?: number | null;
  requiresDocumentation: boolean;
  documentationTypes: string[];
}

@Injectable({
  providedIn: 'root'
})
export class LoanPurposeService {
  private readonly standardPurposeUrl = `${environment.apiBaseUrl}/x/api/v2/hr/advanceLoanPurposes`;

  constructor(private http: HttpClient) {}

  private safeParseResponse(response: any): any {
    if (!response) {
      return response;
    }
    if (typeof response === 'object') {
      return response;
    }
    if (typeof response === 'string') {
      let cleanResponse = response.trim();
      if (cleanResponse.charCodeAt(0) === 0xFEFF) {
        cleanResponse = cleanResponse.substring(1);
      }
      try {
        const parsed = JSON.parse(cleanResponse);
        if (parsed === null || parsed === undefined) {
          console.warn('Parsed response is null or undefined');
        }
        return parsed;
      } catch (e) {
        const error = e as Error;
        console.error('JSON Parse Error:', error);
        throw new Error(`Invalid JSON response from server: ${error.message}`);
      }
    }
    return response;
  }

  getAllPurposes(onlyActive: boolean = true): Observable<LoanPurposeData[]> {
    const tenantId = 'optimax';
    const token = sessionStorage.getItem('token');
    
    console.log('Fetching all loan purposes');
    
    return this.http.get<any>(this.standardPurposeUrl, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId
      },
      responseType: 'json'
    }).pipe(
      map(response => this.safeParseResponse(response)),
      map(data => {
        let purposes: LoanPurposeData[] = [];
        if (Array.isArray(data)) {
          purposes = data;
        } else if (data?.content && Array.isArray(data.content)) {
          purposes = data.content;
        }
        console.log(`Loaded ${purposes.length} loan purposes`);
        return onlyActive ? purposes.filter(p => p.isActive === true) : purposes;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Failed to load purposes:', error.status, error.statusText);
        return of([]);
      })
    );
  }

  createPurpose(payload: CreatePurposePayload): Observable<LoanPurposeData> {
    const tenantId = 'optimax';
    const token = sessionStorage.getItem('token');
    
    const cleanPayload: any = {
      name: payload.name,
      code: payload.code,
      description: payload.description || '',
      isActive: payload.isActive,
      requiresDocumentation: payload.requiresDocumentation,
      documentationTypes: payload.documentationTypes || []
    };
    
    if (payload.minLoanAmount != null) cleanPayload.minLoanAmount = payload.minLoanAmount;
    if (payload.maxLoanAmount != null) cleanPayload.maxLoanAmount = payload.maxLoanAmount;
    if (payload.defaultInterestRate != null) cleanPayload.defaultInterestRate = payload.defaultInterestRate;
    
    return this.http.post<LoanPurposeData>(this.standardPurposeUrl, cleanPayload, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
        'Content-Type': 'application/json'
      }
    }).pipe(
      map(response => this.safeParseResponse(response)),
      catchError(this.handleError)
    );
  }

  updatePurpose(id: number, payload: Partial<CreatePurposePayload>): Observable<LoanPurposeData> {
    const tenantId = 'optimax';
    const token = sessionStorage.getItem('token');
    
    return this.http.put<LoanPurposeData>(`${this.standardPurposeUrl}/${id}`, payload, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
        'Content-Type': 'application/json'
      }
    }).pipe(
      map(response => this.safeParseResponse(response)),
      catchError(this.handleError)
    );
  }

  // ADD THIS DELETE METHOD
  deletePurpose(id: number): Observable<void> {
    const tenantId = 'optimax';
    const token = sessionStorage.getItem('token');
    
    return this.http.delete<void>(`${this.standardPurposeUrl}/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId
      }
    }).pipe(
      catchError(this.handleError)
    );
  }

  getPurposeById(id: number): Observable<LoanPurposeData> {
    const tenantId = 'optimax';
    const token = sessionStorage.getItem('token');
    
    return this.http.get<LoanPurposeData>(`${this.standardPurposeUrl}/${id}`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId
      }
    }).pipe(
      map(response => this.safeParseResponse(response)),
      catchError(this.handleError)
    );
  }

  getPurposeByCode(code: string): Observable<LoanPurposeData | null> {
    return this.getAllPurposes(false).pipe(
      map(purposes => purposes.find(p => p.code === code) || null)
    );
  }

  togglePurposeStatus(id: number, isActive: boolean): Observable<LoanPurposeData> {
    return this.updatePurpose(id, { isActive });
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    if (isDevMode()) {
      console.error('Loan purpose API error', {
        status: error.status,
        statusText: error.statusText,
        url: error.url,
        error: error.error
      });
    }
    return throwError(() => error);
  }
}