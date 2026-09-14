import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { AttendancetableService } from './attendancetable.service';
import { OfficeHoursService } from './office-hours.service';
import { AttendanceScheduleResolverService } from './attendanceschedulreresolver.service';

describe('AttendancetableService', () => {
  let service: AttendancetableService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: OfficeHoursService, useValue: { officeHours$: { subscribe: () => undefined }, getOfficeHours: () => ({ companyLatitude: 6.5244, companyLongitude: 3.3792, latenessGracePeriod: '00:15', absentTime: '00:30' }) } },
        { provide: AttendanceScheduleResolverService, useValue: { resolve: () => ({ scheduleType: 'office-hours', openingTime: '09:00', latenessGracePeriod: '09:15', absentTime: '09:30', closingTime: '17:00', sourceId: 'office', shiftName: 'Office' }) } }
      ]
    });
    service = TestBed.inject(AttendancetableService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should map checkIn/checkOut payload values correctly', () => {
    const mapped = (service as any).mapApiRecord({
      id: 7,
      attendanceDate: '2026-09-08',
      employeeId: { id: 12, lastName: 'Doe', firstName: 'Jane', department: { name: 'HR' } },
      recordStatus: 'APPROVED',
      checkIn: '2026-09-08T09:15:00',
      checkOut: '2026-09-08T17:30:00'
    });

    expect(mapped.checkIn).toBe('09:15:00');
    expect(mapped.checkOut).toBe('17:30:00');
  });

  it('should separate attendance presence status from workflow approval status', () => {
    const mapped = (service as any).mapApiRecord({
      id: 8,
      attendanceDate: '2026-09-08',
      employeeId: { id: 13, lastName: 'Smith', firstName: 'John', department: { name: 'IT' } },
      recordStatus: 'IN_APPROVAL',
      checkIn: '2026-09-08T09:00:00',
      checkOut: '2026-09-08T17:00:00'
    });

    // Attendance presence status (not workflow status)
    expect(mapped.status).toBe('PRESENT');
    // Workflow approval status (separate field)
    expect(mapped.recordStatus).toBe('IN_APPROVAL');
  });

  it('should read backend attendanceStatus when present', () => {
    const mapped = (service as any).mapApiRecord({
      id: 9,
      attendanceDate: '2026-09-08',
      employeeId: { id: 14, lastName: 'Jones', firstName: 'Alice', department: { name: 'Finance' } },
      recordStatus: 'APPROVED',
      attendanceStatus: 'LATE',
      checkIn: '2026-09-08T09:30:00',
      checkOut: '2026-09-08T17:00:00'
    });

    // Should use backend's attendanceStatus, not calculate from checkIn/checkOut
    expect(mapped.status).toBe('LATE');
    expect(mapped.recordStatus).toBe('APPROVED');
  });
});
