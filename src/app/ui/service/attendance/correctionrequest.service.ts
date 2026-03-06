import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { CorrectionRequest } from '../../domain/attendance/correctionrequest.dto';

@Injectable({
  providedIn: 'root'
})
export class CorrectionrequestService {

    private requestsSubject = new BehaviorSubject<CorrectionRequest[]>([]);
  requests$ = this.requestsSubject.asObservable();

  private get requests(): CorrectionRequest[] {
    return this.requestsSubject.value;
  }

  // Employee sends request
  addRequest(request: CorrectionRequest) {
    //const updated = [request, ...this.requests];
    //this.requestsSubject.next(updated);
    this.requestsSubject.next([request, ...this.requests]);
  }

  // Admin updates status
  updateRequest(id: string, changes: Partial<CorrectionRequest>) {
    const updated = this.requests.map(req =>
      req.id === id ? { ...req, ...changes } : req
    );
    this.requestsSubject.next(updated);
  }

  correctAttendance(payload: {
  employeeId: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'ON_LEAVE';
}) {
  console.log('Correcting attendance:', payload);

  // ✅ MOCK LOGIC (since backend isn't ready)
  // Later you will replace this with HTTP call
  return of({
    success: true,
    message: 'Attendance corrected successfully'
  });
}


  getRequests(): Observable<CorrectionRequest[]> {
    return this.requests$;
  }

  //constructor() { }
}
