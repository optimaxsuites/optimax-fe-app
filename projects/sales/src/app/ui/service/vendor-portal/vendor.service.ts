import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VendorService {

  constructor() { }

  getApprovedVendors(): Observable<any[]> {
    return of([]);
  }
}
