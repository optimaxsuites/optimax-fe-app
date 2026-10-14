import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../shared-component/environments/environment';
import { resolveTenantId } from './loan-tenant.util';

export interface GuarantorMedia {
  id: number;
  name: string;
  mediaNo: string;
}

export interface GuarantorDto {
  id: number;
  memberId?: number; // Add this property for template compatibility
  fullName: string;
  email: string;
  phone: string;
  address: string;
  relationshipId: number;
  dob: string;
  idNumber: string;
  yearsKnown: number;
  signature: string;
  passportPhoto: string;
  idCard: string;
  guarantorMedia: GuarantorMedia;
  guarantorPhoto: GuarantorMedia;
  guarantorSignature: GuarantorMedia;
}

@Injectable({ providedIn: 'root' })
export class GuarantorService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('token');
    const tenantId = resolveTenantId();

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'X-Tenant-ID': tenantId,
      Accept: 'application/json'
    });
  }

  getGuarantorByEmployeeId(id: number | string): Observable<GuarantorDto[]> {
    return this.http.get<GuarantorDto[]>(
      `${this.baseUrl}/x/api/v2/hr/guarantors/getGuarantorByEmployeeId/${id}`,
      { headers: this.getHeaders() }
    );
  }
}
