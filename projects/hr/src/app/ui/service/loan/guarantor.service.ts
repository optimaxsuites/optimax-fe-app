import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private apiUrl = 'https://be.optimaxsuites.com/x/api/v2/hr/guarantors/getGuarantorByEmployeeId';

  constructor(private http: HttpClient) {}

  getGuarantorByEmployeeId(id: string): Observable<GuarantorDto[]> {
    return this.http.get<GuarantorDto[]>(`${this.apiUrl}/${id}`);
  }
}
