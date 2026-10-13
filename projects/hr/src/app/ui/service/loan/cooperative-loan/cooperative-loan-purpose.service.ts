import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../shared-component/service/environments/environment.prod';
import { getTokenFromStorage } from './token-util';
import { CreatePurposePayload, LoanPurposeData } from '../loan-purpose.service';

@Injectable({
  providedIn: 'root'
})
export class CooperativeLoanPurposeService {
  private readonly cooperativePurposeUrl = `${environment.apiBaseUrl}/x/api/v2/hr/cooperativeLoanPurposes`;

  constructor(private http: HttpClient) {}

  private getTenantId(): string {
    const tenant = sessionStorage.getItem('tenantId')
      || sessionStorage.getItem('tenant')
      || localStorage.getItem('tenantId')
      || localStorage.getItem('tenant')
      || 'optimax';
    return tenant && tenant !== 'undefined' && tenant !== 'null' ? tenant : 'optimax';
  }

  private safeParseResponse(response: unknown): any {
    if (!response) {
      return response;
    }
    if (typeof response === 'object') {
      return response;
    }
    if (typeof response === 'string') {
      let cleanResponse = response.trim();
      if (cleanResponse.charCodeAt(0) === 0xfeff) {
        cleanResponse = cleanResponse.substring(1);
      }
      try {
        return JSON.parse(cleanResponse);
      } catch (error) {
        const parseError = error as Error;
        throw new Error(`Invalid JSON response from server: ${parseError.message}`);
      }
    }
    return response;
  }

 getAllPurposes(onlyActive: boolean = true): Observable<LoanPurposeData[]> {
  const token = getTokenFromStorage();
  
  // Build URL with query parameter to get inactive purposes as well
  let url = this.cooperativePurposeUrl;
  if (!onlyActive) {
    // Try different query parameter formats that your API might expect
    url = `${this.cooperativePurposeUrl}?includeInactive=true`;
    // Alternative: url = `${this.cooperativePurposeUrl}?isActive=all`;
    // Alternative: url = `${this.cooperativePurposeUrl}?status=all`;
  }


  return this.http.get<any>(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Tenant-ID': this.getTenantId()
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
      } else if (data?.data && Array.isArray(data.data)) {
        purposes = data.data;
      }
      
      
      // Only filter client-side if the API returns everything
      return onlyActive ? purposes.filter(purpose => purpose.isActive === true) : purposes;
    }),
    catchError((error: HttpErrorResponse) => {
      console.error('Failed to load cooperative loan purposes:', error.status, error.statusText);
      return of([]);
    })
  );
}

  createPurpose(payload: CreatePurposePayload): Observable<LoanPurposeData> {
    const token = getTokenFromStorage();
    const cleanPayload = this.normalizePayload(payload);

    return this.http.post<LoanPurposeData>(this.cooperativePurposeUrl, cleanPayload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': this.getTenantId(),
        'Content-Type': 'application/json'
      }
    }).pipe(
      map(response => this.safeParseResponse(response)),
      catchError(this.handleError)
    );
  }

  updatePurpose(id: number, payload: Partial<CreatePurposePayload>): Observable<LoanPurposeData> {
    const token = getTokenFromStorage();


    return this.http.put<LoanPurposeData>(`${this.cooperativePurposeUrl}/${id}`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': this.getTenantId(),
        'Content-Type': 'application/json'
      }
    }).pipe(
      map(response => {
        // If the response is just a number (ID) or missing required fields
        if (typeof response === 'number') {
          console.warn('Server returned only ID, returning local payload with ID');
          return {
            id: response,
            ...payload,
            name: payload.name || '',
            code: payload.code || '',
            description: payload.description || '',
            documentationTypes: payload.documentationTypes || []
          } as LoanPurposeData;
        }
        return this.safeParseResponse(response);
      }),
      catchError(this.handleError)
    );
  }

  getPurposeById(id: number): Observable<LoanPurposeData> {
    const token = getTokenFromStorage();

    return this.http.get<LoanPurposeData>(`${this.cooperativePurposeUrl}/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': this.getTenantId()
      }
    }).pipe(
      map(response => this.safeParseResponse(response)),
      catchError(this.handleError)
    );
  }

  getPurposeByCode(code: string): Observable<LoanPurposeData | null> {
    return this.getAllPurposes(false).pipe(
      map(purposes => purposes.find(purpose => purpose.code === code) || null)
    );
  }

  togglePurposeStatus(id: number, isActive: boolean): Observable<LoanPurposeData> {
    return this.updatePurpose(id, { isActive });
  }

  private normalizePayload(payload: CreatePurposePayload): Record<string, unknown> {
    const cleanPayload: Record<string, unknown> = {
      name: payload.name,
      code: payload.code,
      description: payload.description || '',
      isActive: payload.isActive,
      requiresDocumentation: payload.requiresDocumentation,
      documentationTypes: payload.documentationTypes || []
    };

    if (payload.minLoanAmount != null && payload.minLoanAmount > 0) {
      cleanPayload['minLoanAmount'] = payload.minLoanAmount;
    }
    if (payload.maxLoanAmount != null && payload.maxLoanAmount > 0) {
      cleanPayload['maxLoanAmount'] = payload.maxLoanAmount;
    }
    if (payload.defaultInterestRate != null && payload.defaultInterestRate > 0) {
      cleanPayload['defaultInterestRate'] = payload.defaultInterestRate;
    }

    return cleanPayload;
  }

  deletePurpose(id: number): Observable<void> {
    const token = getTokenFromStorage();

    return this.http.delete<void>(`${this.cooperativePurposeUrl}/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': this.getTenantId()
      }
    }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    if (isDevMode()) {
      console.error('Cooperative loan purpose API error', {
        status: error.status,
        statusText: error.statusText,
        url: error.url,
        error: error.error
      });
    }
    return throwError(() => error);
  }
}