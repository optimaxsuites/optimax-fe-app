import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { OfficeHours } from '../../shared-component/models/office-hours.model';

const DEFAULT_OFFICE_HOURS: OfficeHours = {
  openingTime: '09:00',
  closingTime: '17:00'
};

@Injectable({ providedIn: 'root' })
export class OfficeHoursService {
  private officeHoursSubject = new BehaviorSubject<OfficeHours>(
    this.loadOfficeHours()
  );

  officeHours$ = this.officeHoursSubject.asObservable();

  getOfficeHours(): OfficeHours {
    return this.officeHoursSubject.value;
  }

  updateOfficeHours(hours: OfficeHours) {
    localStorage.setItem('officeHours', JSON.stringify(hours));
    this.officeHoursSubject.next(hours);
  }

  private loadOfficeHours(): OfficeHours {
    const saved = localStorage.getItem('officeHours');
    return saved ? JSON.parse(saved) : DEFAULT_OFFICE_HOURS;
  }
}
