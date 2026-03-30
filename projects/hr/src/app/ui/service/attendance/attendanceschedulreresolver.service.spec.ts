import { TestBed } from '@angular/core/testing';

import { AttendanceScheduleResolverService } from './attendanceschedulreresolver.service';

describe('AttendanceschedulreresolverService', () => {
  let service: AttendanceScheduleResolverService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AttendanceScheduleResolverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
